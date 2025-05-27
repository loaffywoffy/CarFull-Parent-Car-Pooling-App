
import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Set the access token
if (import.meta.env.VITE_MAPBOX_ACCESS_TOKEN) {
  mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
}

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

export default function LocationMap({ locations, height = '400px', initialZoom = 12 }: LocationMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<boolean>(false);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    if (!import.meta.env.VITE_MAPBOX_ACCESS_TOKEN) {
      console.error('MapBox access token not found');
      setMapError(true);
      return;
    }

    try {
      // Validate locations
      if (!locations.length) {
        setMapError(true);
        return;
      }

      // Validate that all locations have valid positions
      const invalidLocations = locations.filter(
        loc => !loc.position || loc.position[0] === 0 && loc.position[1] === 0
      );
      
      if (invalidLocations.length > 0) {
        console.error('Invalid map locations detected:', invalidLocations);
        setMapError(true);
        return;
      }

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [locations[0].position[1], locations[0].position[0]], // MapBox uses [lng, lat]
        zoom: initialZoom,
        attributionControl: false
      });

      map.current.addControl(new mapboxgl.AttributionControl({
        compact: true
      }));

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      map.current.on('load', () => {
        setMapLoaded(true);
        
        // Add markers for each location
        locations.forEach(location => {
          try {
            // Determine marker color based on location type
            let color = '#ef4444'; // Red for event/party
            if (location.type === 'pickup') {
              color = '#10b981'; // Green for pickup
            } else if (location.type === 'dropoff') {
              color = '#f59e0b'; // Orange for dropoff
            } else if (location.type === 'both') {
              color = '#8b5cf6'; // Purple for both
            }

            const marker = new mapboxgl.Marker({
              color,
              scale: location.type === 'event' || location.type === 'party' ? 1.2 : 0.8
            })
              .setLngLat([location.position[1], location.position[0]]) // MapBox uses [lng, lat]
              .setPopup(
                new mapboxgl.Popup({ offset: 25 })
                  .setHTML(`
                    <div class="p-2">
                      <h3 class="font-semibold text-sm">${location.label}</h3>
                      <p class="text-xs text-gray-600 capitalize">${location.type} Location</p>
                    </div>
                  `)
              )
              .addTo(map.current!);
          } catch (err) {
            console.error('Error adding marker:', err);
          }
        });

        // Fit bounds to show all markers
        if (locations.length > 1) {
          try {
            const bounds = new mapboxgl.LngLatBounds();
            locations.forEach(loc => bounds.extend([loc.position[1], loc.position[0]]));
            
            map.current!.fitBounds(bounds, {
              padding: 50,
              maxZoom: 15
            });
          } catch (err) {
            console.error('Error fitting bounds:', err);
          }
        }
      });

      setMapError(false);
    } catch (err) {
      console.error('Error initializing map:', err);
      setMapError(true);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [locations, initialZoom]);

  if (mapError || !import.meta.env.VITE_MAPBOX_ACCESS_TOKEN) {
    return (
      <div 
        style={{ height, width: '100%' }} 
        className="rounded-md border border-gray-200 flex items-center justify-center bg-gray-50"
      >
        <div className="text-center p-4">
          <p className="text-gray-500 text-sm">Unable to display map.</p>
          <p className="text-xs text-gray-400">
            {!import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ? 'MapBox token required' : 'Invalid location data'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={mapContainer} 
      style={{ height, width: '100%' }} 
      className="rounded-md border border-gray-200 overflow-hidden"
    />
  );
}
