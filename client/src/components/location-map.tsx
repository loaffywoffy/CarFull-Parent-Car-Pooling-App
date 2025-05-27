
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
  const mapRef = useRef<L.Map | null>(null);
  const [mapError, setMapError] = useState<boolean>(false);
  const mapElementId = `map-${Math.random().toString(36).substring(2, 9)}`; // Generate a unique ID for the map element

  useEffect(() => {
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

      // Initialize map if not already initialized
      if (!mapRef.current) {
        mapRef.current = L.map(mapElementId).setView(locations[0].position, initialZoom);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(mapRef.current);
      }

      // Clear existing markers
      mapRef.current.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          layer.remove();
        }
      });

      // Add markers for each location
      locations.forEach(location => {
        try {
          const marker = L.marker(location.position)
            .addTo(mapRef.current!)
            .bindPopup(location.label);
        } catch (err) {
          console.error('Error adding marker:', err);
        }
      });

      // Fit bounds to show all markers
      if (locations.length > 1) {
        try {
          const bounds = L.latLngBounds(locations.map(loc => loc.position));
          mapRef.current.fitBounds(bounds, { padding: [50, 50] });
        } catch (err) {
          console.error('Error fitting bounds:', err);
        }
      }

      setMapError(false);
    } catch (err) {
      console.error('Error initializing map:', err);
      setMapError(true);
    }

    return () => {
      try {
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      } catch (err) {
        console.error('Error cleaning up map:', err);
      }
    };
  }, [locations, initialZoom, mapElementId]);

  if (mapError) {
    return (
      <div 
        style={{ height, width: '100%' }} 
        className="rounded-md border border-gray-200 flex items-center justify-center bg-gray-50"
      >
        <div className="text-center p-4">
          <p className="text-gray-500 text-sm">Unable to display map.</p>
          <p className="text-xs text-gray-400">Invalid location data</p>
        </div>
      </div>
    );
  }

  return <div id={mapElementId} style={{ height, width: '100%' }} />;
}
