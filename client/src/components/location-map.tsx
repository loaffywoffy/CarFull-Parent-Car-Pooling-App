
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
}

export default function LocationMap({ locations, height = '400px', initialZoom = 14 }: LocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

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
          libraries: ['maps']
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

  // Add markers when map and locations are available
  useEffect(() => {
    if (!map || !locations.length) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add markers for each location
    locations.forEach(location => {
      try {
        const marker = new google.maps.Marker({
          position: { lat: location.position[0], lng: location.position[1] },
          map: map,
          title: location.label,
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

  }, [map, locations]);

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
