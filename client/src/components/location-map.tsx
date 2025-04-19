
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Location {
  label: string;
  position: [number, number];
  type: 'party' | 'pickup' | 'dropoff' | 'both';
}

interface LocationMapProps {
  locations: Location[];
  height?: string;
  initialZoom?: number;
}

export default function LocationMap({ locations, height = '400px', initialZoom = 12 }: LocationMapProps) {
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!locations.length) return;

    // Initialize map if not already initialized
    if (!mapRef.current) {
      mapRef.current = L.map('map').setView(locations[0].position, initialZoom);
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
      const marker = L.marker(location.position)
        .addTo(mapRef.current!)
        .bindPopup(location.label);
    });

    // Fit bounds to show all markers
    if (locations.length > 1) {
      const bounds = L.latLngBounds(locations.map(loc => loc.position));
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [locations, initialZoom]);

  return <div id="map" style={{ height, width: '100%' }} />;
}
