import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface GoogleMapProps {
  className?: string;
  eventLocation?: {
    lat: number;
    lng: number;
    name: string;
  };
  userLocation?: {
    lat: number;
    lng: number;
  };
  carpoolLocations?: Array<{
    id: number;
    lat: number;
    lng: number;
    parentName: string;
    address: string;
    canPickup: boolean;
    canDropoff: boolean;
    spacesAvailable: number;
  }>;
}

export default function GoogleMap({ 
  className = "w-full h-96", 
  eventLocation, 
  userLocation, 
  carpoolLocations = []
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
          libraries: ['maps', 'marker']
        });

        await loader.load();

        if (!mapRef.current) return;

        // Default center to London if no event location
        const center = eventLocation 
          ? { lat: eventLocation.lat, lng: eventLocation.lng }
          : { lat: 51.5074, lng: -0.1276 };

        const mapInstance = new google.maps.Map(mapRef.current, {
          center,
          zoom: 13,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          zoomControl: true,
        });

        setMap(mapInstance);
        setIsLoading(false);

        // Add event location marker
        if (eventLocation) {
          new google.maps.Marker({
            position: { lat: eventLocation.lat, lng: eventLocation.lng },
            map: mapInstance,
            title: eventLocation.name,
            icon: {
              url: 'data:image/svg+xml;base64,' + btoa(`
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#ef4444"/>
                  <circle cx="12" cy="9" r="2.5" fill="white"/>
                </svg>
              `),
              scaledSize: new google.maps.Size(32, 32),
              anchor: new google.maps.Point(16, 32)
            },
            animation: google.maps.Animation.DROP
          });

          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div style="padding: 8px;">
                <h3 style="margin: 0 0 4px 0; font-weight: 600; font-size: 14px;">${eventLocation.name}</h3>
                <p style="margin: 0; font-size: 12px; color: #666;">Event Location</p>
              </div>
            `
          });

          const eventMarker = new google.maps.Marker({
            position: { lat: eventLocation.lat, lng: eventLocation.lng },
            map: mapInstance,
            title: eventLocation.name,
          });

          eventMarker.addListener('click', () => {
            infoWindow.open(mapInstance, eventMarker);
          });
        }

        // Add user location marker
        if (userLocation) {
          new google.maps.Marker({
            position: { lat: userLocation.lat, lng: userLocation.lng },
            map: mapInstance,
            title: 'Your Location',
            icon: {
              url: 'data:image/svg+xml;base64,' + btoa(`
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#3b82f6"/>
                  <circle cx="12" cy="9" r="2.5" fill="white"/>
                </svg>
              `),
              scaledSize: new google.maps.Size(32, 32),
              anchor: new google.maps.Point(16, 32)
            }
          });
        }

        // Add carpool location markers
        carpoolLocations.forEach((carpool) => {
          const marker = new google.maps.Marker({
            position: { lat: carpool.lat, lng: carpool.lng },
            map: mapInstance,
            title: carpool.parentName,
            icon: {
              url: 'data:image/svg+xml;base64,' + btoa(`
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${carpool.canPickup && carpool.canDropoff ? '#8b5cf6' : carpool.canPickup ? '#10b981' : '#f59e0b'}"/>
                  <circle cx="12" cy="9" r="2.5" fill="white"/>
                </svg>
              `),
              scaledSize: new google.maps.Size(28, 28),
              anchor: new google.maps.Point(14, 28)
            }
          });

          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div style="padding: 8px;">
                <h3 style="margin: 0 0 4px 0; font-weight: 600; font-size: 14px;">${carpool.parentName}</h3>
                <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">${carpool.address}</p>
                <p style="margin: 0; font-size: 12px; color: #10b981;">${carpool.spacesAvailable} spaces available</p>
              </div>
            `
          });

          marker.addListener('click', () => {
            infoWindow.open(mapInstance, marker);
          });
        });

        // Fit bounds to show all markers
        if (eventLocation || userLocation || carpoolLocations.length > 0) {
          const bounds = new google.maps.LatLngBounds();
          
          if (eventLocation) bounds.extend({ lat: eventLocation.lat, lng: eventLocation.lng });
          if (userLocation) bounds.extend({ lat: userLocation.lat, lng: userLocation.lng });
          carpoolLocations.forEach(carpool => bounds.extend({ lat: carpool.lat, lng: carpool.lng }));
          
          mapInstance.fitBounds(bounds);
          
          // Ensure minimum zoom level
          const listener = google.maps.event.addListener(mapInstance, 'idle', () => {
            if (mapInstance.getZoom()! > 15) mapInstance.setZoom(15);
            google.maps.event.removeListener(listener);
          });
        }

      } catch (err) {
        console.error('Failed to load Google Maps:', err);
        setError('Failed to load map');
        setIsLoading(false);
      }
    };

    initMap();
  }, [eventLocation, userLocation, carpoolLocations]);

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
            <p className="text-gray-600 text-sm">Loading map...</p>
          </div>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}