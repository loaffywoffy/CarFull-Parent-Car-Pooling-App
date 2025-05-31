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
    if (map) return; // Prevent multiple initializations
    
    console.log('GoogleMap received eventLocation prop:', eventLocation);
    
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
          libraries: ['maps']
        });

        console.log('Loading Google Maps with API key:', apiKey.substring(0, 10) + '...');
        await loader.load();
        console.log('Google Maps loaded successfully');

        if (!mapRef.current) return;

        // Use event location if available, otherwise default to London
        const center = eventLocation 
          ? { lat: eventLocation.lat, lng: eventLocation.lng }
          : { lat: 51.5074, lng: -0.1276 };
        
        // Set appropriate zoom level - always use 15 for street-level detail
        const zoom = eventLocation ? 16 : 11;

        console.log('Creating map with center:', center);
        console.log('Map container element:', mapRef.current);
        
        const mapInstance = new google.maps.Map(mapRef.current, {
          center,
          zoom,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          zoomControl: true,
        });

        console.log('Map instance created:', mapInstance);
        setMap(mapInstance);
        setIsLoading(false);
        
        // Collect all marker positions for auto-fitting bounds
        const bounds = new google.maps.LatLngBounds();
        const markers: google.maps.Marker[] = [];

        // Add event location marker with distinctive red color
        if (eventLocation) {
          const eventMarker = new google.maps.Marker({
            position: { lat: eventLocation.lat, lng: eventLocation.lng },
            map: mapInstance,
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
            infoWindow.open(mapInstance, eventMarker);
          });

          markers.push(eventMarker);
          bounds.extend(eventMarker.getPosition()!);
        }

        // Add user location marker with distinctive blue color
        if (userLocation) {
          const userMarker = new google.maps.Marker({
            position: { lat: userLocation.lat, lng: userLocation.lng },
            map: mapInstance,
            title: 'Your Location',
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="16" cy="16" r="12" fill="#2563eb" stroke="#ffffff" stroke-width="2"/>
                  <circle cx="16" cy="16" r="4" fill="#ffffff"/>
                </svg>
              `),
              scaledSize: new google.maps.Size(32, 32),
              anchor: new google.maps.Point(16, 16)
            }
          });

          const infoWindow = new google.maps.InfoWindow({
            content: `<div><strong>Your Location</strong></div>`
          });

          userMarker.addListener('click', () => {
            infoWindow.open(mapInstance, userMarker);
          });

          markers.push(userMarker);
          bounds.extend(userMarker.getPosition()!);
        }

        // Add carpool location markers with green color
        carpoolLocations.forEach((carpool) => {
          const marker = new google.maps.Marker({
            position: { lat: carpool.lat, lng: carpool.lng },
            map: mapInstance,
            title: carpool.parentName,
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" fill="#16a34a" stroke="#ffffff" stroke-width="2"/>
                  <circle cx="12" cy="12" r="3" fill="#ffffff"/>
                </svg>
              `),
              scaledSize: new google.maps.Size(24, 24),
              anchor: new google.maps.Point(12, 12)
            }
          });

          const infoWindow = new google.maps.InfoWindow({
            content: `<div><strong>${carpool.parentName}</strong><br/>${carpool.address}<br/>${carpool.spacesAvailable} spaces available</div>`
          });

          marker.addListener('click', () => {
            infoWindow.open(mapInstance, marker);
          });

          markers.push(marker);
          bounds.extend(marker.getPosition()!);
        });

        // Auto-fit the map to show all markers with appropriate zoom
        if (markers.length > 0) {
          mapInstance.fitBounds(bounds);
          
          // Add some padding and set a maximum zoom level
          setTimeout(() => {
            const currentZoom = mapInstance.getZoom();
            if (currentZoom && currentZoom > 15) {
              mapInstance.setZoom(15); // Don't zoom in too much
            }
          }, 100);
        }

        // Force a resize to ensure proper rendering
        setTimeout(() => {
          google.maps.event.trigger(mapInstance, 'resize');
          console.log('Map resize triggered with bounds fitting');
        }, 200);

      } catch (err) {
        console.error('Failed to load Google Maps:', err);
        setError('Failed to load map');
        setIsLoading(false);
      }
    };

    initMap();
  }, []);

  // Update map center and markers when eventLocation changes
  useEffect(() => {
    if (!map || !eventLocation) return;

    console.log('Updating map with new event location:', eventLocation);
    
    // Update map center and zoom with higher zoom level for better detail
    map.setCenter({ lat: eventLocation.lat, lng: eventLocation.lng });
    map.setZoom(17);

    // Add event location marker
    const eventMarker = new google.maps.Marker({
      position: { lat: eventLocation.lat, lng: eventLocation.lng },
      map: map,
      title: eventLocation.name,
    });

    const infoWindow = new google.maps.InfoWindow({
      content: `<div><strong>${eventLocation.name}</strong><br/>Event Location</div>`
    });

    eventMarker.addListener('click', () => {
      infoWindow.open(map, eventMarker);
    });

    // Cleanup function to remove marker when component unmounts or location changes
    return () => {
      eventMarker.setMap(null);
    };
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
            <p className="text-gray-600 text-sm">Loading map...</p>
          </div>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full min-h-[400px]" style={{ height: '100%' }} />
    </div>
  );
}