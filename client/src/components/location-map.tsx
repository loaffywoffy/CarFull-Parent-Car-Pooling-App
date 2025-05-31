
import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface Location {
  label: string;
  position: [number, number];
  type: 'party' | 'event' | 'pickup' | 'dropoff' | 'both';
}

interface LocationMapProps {
  locations: Location[];
  height?: string;
  initialZoom?: number;
  showRoute?: boolean;
}

export default function LocationMap({ locations, height = '400px', initialZoom = 14, showRoute = false }: LocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);

  // Initialize Google Maps
  useEffect(() => {
    if (map) return; // Prevent multiple initializations

    const initMap = async () => {
      try {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          setError('Google Maps API key not found');
          setIsLoading(false);
          return;
        }

        // Validate locations
        if (!locations.length) {
          setError('No locations provided');
          setIsLoading(false);
          return;
        }

        // Validate that all locations have valid positions
        const invalidLocations = locations.filter(
          loc => !loc.position || loc.position[0] === 0 && loc.position[1] === 0
        );
        
        if (invalidLocations.length > 0) {
          console.error('Invalid map locations detected:', invalidLocations);
          setError('Invalid location data');
          setIsLoading(false);
          return;
        }

        const loader = new Loader({
          apiKey,
          version: 'weekly',
          libraries: ['maps', 'routes']
        });

        await loader.load();

        if (!mapRef.current) return;

        // Use first location as center
        const center = { lat: locations[0].position[0], lng: locations[0].position[1] };

        const mapInstance = new google.maps.Map(mapRef.current, {
          center,
          zoom: initialZoom,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          zoomControl: true,
        });

        // Initialize directions service and renderer
        directionsServiceRef.current = new google.maps.DirectionsService();
        directionsRendererRef.current = new google.maps.DirectionsRenderer({
          suppressMarkers: false, // We'll show our custom markers
          polylineOptions: {
            strokeColor: '#2563eb',
            strokeWeight: 4,
            strokeOpacity: 0.8
          }
        });
        directionsRendererRef.current.setMap(mapInstance);

        setMap(mapInstance);
        setIsLoading(false);

        // Force a resize to ensure proper rendering
        setTimeout(() => {
          google.maps.event.trigger(mapInstance, 'resize');
        }, 100);

      } catch (err) {
        console.error('Failed to load Google Maps:', err);
        setError('Failed to load map');
        setIsLoading(false);
      }
    };

    initMap();
  }, []);

  // Add markers and route when map and locations are available
  useEffect(() => {
    if (!map || !locations.length) return;

    // Clear existing markers and route
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setDirections({ routes: [] } as any);
    }

    // Function to get marker icon based on location type
    const getMarkerIcon = (type: string) => {
      switch (type) {
        case 'pickup':
          return {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                <circle cx="20" cy="20" r="18" fill="#10b981" stroke="white" stroke-width="3"/>
                <text x="20" y="26" text-anchor="middle" fill="white" font-size="14" font-weight="bold">P</text>
              </svg>
            `),
            scaledSize: new google.maps.Size(30, 30),
            anchor: new google.maps.Point(15, 15)
          };
        case 'dropoff':
          return {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                <circle cx="20" cy="20" r="18" fill="#3b82f6" stroke="white" stroke-width="3"/>
                <text x="20" y="26" text-anchor="middle" fill="white" font-size="14" font-weight="bold">D</text>
              </svg>
            `),
            scaledSize: new google.maps.Size(30, 30),
            anchor: new google.maps.Point(15, 15)
          };
        case 'event':
          return {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                <circle cx="20" cy="20" r="18" fill="#dc2626" stroke="white" stroke-width="3"/>
                <text x="20" y="26" text-anchor="middle" fill="white" font-size="14" font-weight="bold">E</text>
              </svg>
            `),
            scaledSize: new google.maps.Size(30, 30),
            anchor: new google.maps.Point(15, 15)
          };
        default:
          return undefined;
      }
    };

    // Add markers for each location
    locations.forEach(location => {
      try {
        const marker = new google.maps.Marker({
          position: { lat: location.position[0], lng: location.position[1] },
          map: map,
          title: location.label,
          icon: getMarkerIcon(location.type)
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `<div><strong>${location.label}</strong></div>`
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });

        markersRef.current.push(marker);
      } catch (err) {
        console.error('Error adding marker:', err);
      }
    });

    // Show route if requested and we have exactly 2 locations
    if (showRoute && locations.length === 2 && directionsServiceRef.current && directionsRendererRef.current) {
      const origin = locations[0];
      const destination = locations[1];
      
      try {
        directionsServiceRef.current.route({
          origin: { lat: origin.position[0], lng: origin.position[1] },
          destination: { lat: destination.position[0], lng: destination.position[1] },
          travelMode: google.maps.TravelMode.DRIVING,
        }, (result, status) => {
          if (status === 'OK' && result && directionsRendererRef.current) {
            directionsRendererRef.current.setDirections(result);
          } else {
            console.error('Directions request failed:', status);
          }
        });
      } catch (err) {
        console.error('Error calculating route:', err);
      }
    }

    // Fit bounds to show all markers if multiple locations
    if (locations.length > 1) {
      try {
        const bounds = new google.maps.LatLngBounds();
        locations.forEach(location => {
          bounds.extend({ lat: location.position[0], lng: location.position[1] });
        });
        map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
      } catch (err) {
        console.error('Error fitting bounds:', err);
      }
    }

  }, [map, locations, showRoute]);

  if (error) {
    return (
      <div 
        style={{ height, width: '100%' }} 
        className="rounded-md border border-gray-200 flex items-center justify-center bg-gray-50"
      >
        <div className="text-center p-4">
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height, width: '100%' }} className="rounded-md overflow-hidden border border-gray-200 relative">
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600 text-sm">Loading map...</p>
          </div>
        </div>
      )}
      <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
    </div>
  );
}
