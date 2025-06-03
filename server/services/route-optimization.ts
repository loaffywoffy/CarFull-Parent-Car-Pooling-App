import { storage } from '../storage';

export interface Waypoint {
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  type: 'pickup' | 'dropoff' | 'origin' | 'destination';
  requestId?: number;
  parentName?: string;
  childName?: string;
}

export interface OptimizedRoute {
  totalDistance: string;
  totalDuration: string;
  waypoints: Waypoint[];
  legs: RouteLeg[];
  polyline?: string;
}

export interface RouteLeg {
  startAddress: string;
  endAddress: string;
  distance: string;
  duration: string;
  steps?: RouteStep[];
}

export interface RouteStep {
  instruction: string;
  distance: string;
  duration: string;
}

class RouteOptimizationService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || '';
    if (!this.apiKey) {
      console.warn('Google Maps API key not found. Route optimization will not work.');
    }
  }

  /**
   * Optimize route for a carpool using Google Routes API
   */
  async optimizeRoute(
    carpoolId: number,
    startLocation: { lat: number; lng: number; address: string },
    eventLocation: { lat: number; lng: number; address: string }
  ): Promise<OptimizedRoute> {
    if (!this.apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    // Get approved carpool requests
    const requests = await storage.getCarpoolRequestsByCarpoolId(carpoolId);
    const approvedRequests = requests.filter(req => req.approvalStatus === 'approved');

    if (approvedRequests.length === 0) {
      // No passengers, just return direct route
      return this.getDirectRoute(startLocation, eventLocation);
    }

    // Build waypoints from approved requests
    const waypoints: Waypoint[] = [
      {
        address: startLocation.address,
        location: startLocation,
        type: 'origin'
      }
    ];

    // Add pickup points
    for (const request of approvedRequests) {
      waypoints.push({
        address: `${request.address}, ${request.city} ${request.postcode}`,
        location: {
          lat: 0, // Will be geocoded
          lng: 0
        },
        type: 'pickup',
        requestId: request.id,
        parentName: request.parentName,
        childName: request.childName
      });
    }

    // Add event location
    waypoints.push({
      address: eventLocation.address,
      location: eventLocation,
      type: 'destination'
    });

    // Geocode waypoints that need coordinates
    await this.geocodeWaypoints(waypoints);

    // Call Google Routes API with waypoint optimization
    return this.callGoogleRoutesAPI(waypoints);
  }

  /**
   * Get direct route between start and end
   */
  private async getDirectRoute(
    start: { lat: number; lng: number; address: string },
    end: { lat: number; lng: number; address: string }
  ): Promise<OptimizedRoute> {
    const waypoints: Waypoint[] = [
      { address: start.address, location: start, type: 'origin' },
      { address: end.address, location: end, type: 'destination' }
    ];

    return this.callGoogleRoutesAPI(waypoints);
  }

  /**
   * Geocode waypoints that don't have coordinates
   */
  private async geocodeWaypoints(waypoints: Waypoint[]): Promise<void> {
    for (const waypoint of waypoints) {
      if (waypoint.location.lat === 0 && waypoint.location.lng === 0) {
        try {
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(waypoint.address)}&key=${this.apiKey}`
          );
          const data = await response.json();
          
          if (data.results && data.results.length > 0) {
            const location = data.results[0].geometry.location;
            waypoint.location = {
              lat: location.lat,
              lng: location.lng
            };
          }
        } catch (error) {
          console.error(`Failed to geocode ${waypoint.address}:`, error);
        }
      }
    }
  }

  /**
   * Call Google Routes API with waypoint optimization
   */
  private async callGoogleRoutesAPI(waypoints: Waypoint[]): Promise<OptimizedRoute> {
    const origin = waypoints[0];
    const destination = waypoints[waypoints.length - 1];
    const intermediateWaypoints = waypoints.slice(1, -1);

    const requestBody = {
      origin: {
        location: {
          latLng: {
            latitude: origin.location.lat,
            longitude: origin.location.lng
          }
        }
      },
      destination: {
        location: {
          latLng: {
            latitude: destination.location.lat,
            longitude: destination.location.lng
          }
        }
      },
      intermediates: intermediateWaypoints.map(wp => ({
        location: {
          latLng: {
            latitude: wp.location.lat,
            longitude: wp.location.lng
          }
        }
      })),
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
      computeAlternativeRoutes: false,
      routeModifiers: {
        avoidTolls: false,
        avoidHighways: false,
        avoidFerries: false
      },
      languageCode: 'en-US',
      units: 'METRIC',
      optimizeWaypointOrder: true
    };

    try {
      const response = await fetch(
        'https://routes.googleapis.com/directions/v2:computeRoutes',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': this.apiKey,
            'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.legs,routes.polyline.encodedPolyline,routes.optimizedIntermediateWaypointIndex'
          },
          body: JSON.stringify(requestBody)
        }
      );

      if (!response.ok) {
        throw new Error(`Routes API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.routes || data.routes.length === 0) {
        throw new Error('No routes found');
      }

      return this.parseRouteResponse(data.routes[0], waypoints);
    } catch (error) {
      console.error('Google Routes API error:', error);
      throw error;
    }
  }

  /**
   * Parse Google Routes API response
   */
  private parseRouteResponse(route: any, originalWaypoints: Waypoint[]): OptimizedRoute {
    const legs: RouteLeg[] = [];
    let totalDistanceMeters = 0;
    let totalDurationSeconds = 0;

    // Reorder waypoints based on optimization
    let optimizedWaypoints = [...originalWaypoints];
    if (route.optimizedIntermediateWaypointIndex) {
      const origin = originalWaypoints[0];
      const destination = originalWaypoints[originalWaypoints.length - 1];
      const intermediates = originalWaypoints.slice(1, -1);
      
      const reorderedIntermediates = route.optimizedIntermediateWaypointIndex.map(
        (index: number) => intermediates[index]
      );
      
      optimizedWaypoints = [origin, ...reorderedIntermediates, destination];
    }

    // Process route legs
    if (route.legs) {
      route.legs.forEach((leg: any, index: number) => {
        const distance = this.formatDistance(leg.distanceMeters || 0);
        const duration = this.formatDuration(leg.duration || '0s');
        
        totalDistanceMeters += leg.distanceMeters || 0;
        totalDurationSeconds += this.parseDuration(leg.duration || '0s');

        legs.push({
          startAddress: optimizedWaypoints[index]?.address || 'Unknown',
          endAddress: optimizedWaypoints[index + 1]?.address || 'Unknown',
          distance,
          duration,
          steps: leg.steps?.map((step: any) => ({
            instruction: step.navigationInstruction?.instructions || '',
            distance: this.formatDistance(step.distanceMeters || 0),
            duration: this.formatDuration(step.duration || '0s')
          })) || []
        });
      });
    }

    return {
      totalDistance: this.formatDistance(totalDistanceMeters),
      totalDuration: this.formatDuration(`${totalDurationSeconds}s`),
      waypoints: optimizedWaypoints,
      legs,
      polyline: route.polyline?.encodedPolyline
    };
  }

  /**
   * Format distance from meters
   */
  private formatDistance(meters: number): string {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${meters} m`;
  }

  /**
   * Format duration from ISO 8601 duration string
   */
  private formatDuration(duration: string): string {
    const seconds = this.parseDuration(duration);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  /**
   * Parse ISO 8601 duration to seconds
   */
  private parseDuration(duration: string): number {
    // Handle simple format like "123s"
    if (duration.endsWith('s')) {
      return parseInt(duration.slice(0, -1), 10);
    }
    
    // Handle ISO 8601 format if needed
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (match) {
      const hours = parseInt(match[1] || '0', 10);
      const minutes = parseInt(match[2] || '0', 10);
      const seconds = parseInt(match[3] || '0', 10);
      return hours * 3600 + minutes * 60 + seconds;
    }
    
    return 0;
  }
}

export const routeOptimizationService = new RouteOptimizationService();