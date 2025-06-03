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
   * Optimize route for a carpool with direction-based routing
   */
  async optimizeRouteWithDirection(
    carpoolId: number,
    startLocation: { lat: number; lng: number; address: string },
    destinationLocation: { lat: number; lng: number; address: string },
    direction: 'outbound' | 'return'
  ): Promise<OptimizedRoute> {
    if (!this.apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    // Get carpool and approved requests
    const carpool = await storage.getCarpoolById(carpoolId);
    if (!carpool) {
      throw new Error('Carpool not found');
    }

    const requests = await storage.getCarpoolRequestsByCarpoolId(carpoolId);
    const approvedRequests = requests.filter(req => req.approvalStatus === 'approved');

    // Filter requests based on direction
    const relevantRequests = approvedRequests.filter(req => {
      if (direction === 'outbound') {
        return req.needsPickup || req.needsBoth;
      } else {
        return req.needsDropoff || req.needsBoth;
      }
    });

    if (relevantRequests.length === 0) {
      // No passengers for this direction, just return direct route
      return this.getDirectRoute(startLocation, destinationLocation);
    }

    // Build waypoints based on direction
    const waypoints: Waypoint[] = [
      {
        address: startLocation.address,
        location: startLocation,
        type: 'origin'
      }
    ];

    // Add pickup/dropoff points
    for (const request of relevantRequests) {
      waypoints.push({
        address: `${request.address}, ${request.city} ${request.postcode}`,
        location: {
          lat: 0, // Will be geocoded
          lng: 0
        },
        type: direction === 'outbound' ? 'pickup' : 'dropoff',
        requestId: request.id,
        parentName: request.parentName,
        childName: request.childName
      });
    }

    // Add destination
    waypoints.push({
      address: destinationLocation.address,
      location: destinationLocation,
      type: 'destination'
    });

    // Geocode waypoints that need coordinates
    await this.geocodeWaypoints(waypoints);

    // Call Google Routes API
    return this.callGoogleRoutesAPI(waypoints);
  }

  /**
   * Optimize route for a carpool using Google Routes API (legacy method)
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
   * Call Google Directions API as fallback for route optimization
   */
  private async callGoogleDirectionsAPI(waypoints: Waypoint[]): Promise<OptimizedRoute> {
    const origin = waypoints[0];
    const destination = waypoints[waypoints.length - 1];
    const intermediateWaypoints = waypoints.slice(1, -1);

    // Build waypoints string for Directions API
    let waypointsParam = '';
    if (intermediateWaypoints.length > 0) {
      const waypointCoords = intermediateWaypoints.map(wp => 
        `${wp.location.lat},${wp.location.lng}`
      ).join('|');
      waypointsParam = `&waypoints=optimize:true|${waypointCoords}`;
    }

    const url = `https://maps.googleapis.com/maps/api/directions/json?` +
      `origin=${origin.location.lat},${origin.location.lng}` +
      `&destination=${destination.location.lat},${destination.location.lng}` +
      waypointsParam +
      `&key=${this.apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Directions API error: ${response.status} - ${errorText}`);
      throw new Error(`Directions API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== 'OK' || !data.routes || data.routes.length === 0) {
      throw new Error(`Directions API failed: ${data.status || 'No routes found'}`);
    }

    return this.parseDirectionsResponse(data, waypoints);
  }

  /**
   * Parse Google Directions API response
   */
  private parseDirectionsResponse(data: any, originalWaypoints: Waypoint[]): OptimizedRoute {
    const route = data.routes[0];
    const legs = route.legs;

    // Create optimized waypoint order
    let optimizedWaypoints = [originalWaypoints[0]]; // Start with origin
    
    // Add intermediate waypoints in optimized order
    if (data.routes[0].waypoint_order) {
      const intermediateWaypoints = originalWaypoints.slice(1, -1);
      data.routes[0].waypoint_order.forEach((index: number) => {
        optimizedWaypoints.push(intermediateWaypoints[index]);
      });
    } else {
      // If no optimization, keep original order
      optimizedWaypoints.push(...originalWaypoints.slice(1, -1));
    }
    
    optimizedWaypoints.push(originalWaypoints[originalWaypoints.length - 1]); // End with destination

    // Calculate total distance and duration
    let totalDistance = 0;
    let totalDuration = 0;
    
    const routeLegs: RouteLeg[] = legs.map((leg: any) => {
      totalDistance += leg.distance.value;
      totalDuration += leg.duration.value;
      
      return {
        startAddress: leg.start_address,
        endAddress: leg.end_address,
        distance: leg.distance.text,
        duration: leg.duration.text,
        steps: leg.steps?.map((step: any) => ({
          instruction: step.html_instructions?.replace(/<[^>]*>/g, '') || '',
          distance: step.distance.text,
          duration: step.duration.text
        }))
      };
    });

    return {
      totalDistance: this.formatDistance(totalDistance),
      totalDuration: this.formatDuration(`${totalDuration}s`),
      waypoints: optimizedWaypoints,
      legs: routeLegs,
      polyline: route.overview_polyline?.points
    };
  }

  /**
   * Call Google Routes API with waypoint optimization (fallback to Directions API)
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
        const errorText = await response.text();
        console.error(`Routes API error: ${response.status} - ${errorText}`);
        throw new Error(`Routes API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.routes || data.routes.length === 0) {
        throw new Error('No routes found');
      }

      return this.parseRouteResponse(data.routes[0], waypoints);
    } catch (error) {
      console.log('Routes API failed, falling back to Directions API:', error);
      // Fallback to Directions API which is more widely available
      try {
        return await this.callGoogleDirectionsAPI(waypoints);
      } catch (directionsError) {
        console.error('Both Routes API and Directions API failed:', directionsError);
        throw new Error('Route optimization failed: Unable to calculate route with available APIs');
      }
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