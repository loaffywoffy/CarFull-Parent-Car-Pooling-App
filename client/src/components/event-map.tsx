import { useRef, useEffect, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface EventMapProps {
  className?: string;
  eventLocation: {
    lat: number;
    lng: number;
    name: string;
  };
}

export default function EventMap({ 
  className = "w-full h-64", 
  eventLocation
}: EventMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  // Initialize map only once
  useEffect(() => {
    if (map || !mapRef.current) return;
    
    const initMap = async () => {
      try {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          setError('Google Maps API key not found');
          setIsLoading(false);
          return;
        }

        const loader = new Loader({
          apiKey,
          version: 'weekly',
          libraries: ['maps'],
          id: `event-map-${Date.now()}-${Math.random()}` // Unique ID for event maps
        });

        await loader.load();

        if (!mapRef.current) return;

        const mapInstance = new google.maps.Map(mapRef.current, {
          center: { lat: eventLocation.lat, lng: eventLocation.lng },
          zoom: 16,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          zoomControl: true,
        });

        setMap(mapInstance);
        setIsLoading(false);

      } catch (err) {
        console.error('Failed to load Event Google Maps:', err);
        setError('Failed to load event map');
        setIsLoading(false);
      }
    };

    initMap();
  }, [eventLocation.lat, eventLocation.lng]);

  // Update marker when event location changes
  useEffect(() => {
    if (!map) return;

    // Clear existing marker
    if (markerRef.current) {
      markerRef.current.setMap(null);
    }

    // Add event location marker with distinctive red color
    const eventMarker = new google.maps.Marker({
      position: { lat: eventLocation.lat, lng: eventLocation.lng },
      map: map,
      title: eventLocation.name,
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="12" fill="#dc2626" stroke="#ffffff" stroke-width="2"/>
            <circle cx="16" cy="16" r="4" fill="#ffffff"/>
          </svg>
        `),
        scaledSize: new google.maps.Size(32, 32),
        anchor: new google.maps.Point(16, 16)
      }
    });

    const infoWindow = new google.maps.InfoWindow({
      content: `<div><strong>${eventLocation.name}</strong><br/>Event Location</div>`
    });

    eventMarker.addListener('click', () => {
      infoWindow.open(map, eventMarker);
    });

    markerRef.current = eventMarker;

    // Center map on event location
    map.setCenter({ lat: eventLocation.lat, lng: eventLocation.lng });

  }, [map, eventLocation]);

  if (error) {
    return (
      <div className={`${className} bg-gray-100 flex items-center justify-center rounded-lg border border-gray-200`}>
        <div className="text-center p-4">
          <p className="text-gray-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} rounded-lg overflow-hidden border border-gray-200 relative`}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600 text-sm">Loading event map...</p>
          </div>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full min-h-[200px]" style={{ height: '100%' }} />
    </div>
  );
}