import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Set the access token
if (import.meta.env.VITE_MAPBOX_ACCESS_TOKEN) {
  mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
}

interface MapboxMapProps {
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
  onMapReady?: (map: mapboxgl.Map) => void;
}

export default function MapboxMap({ 
  className = "w-full h-96", 
  eventLocation, 
  userLocation, 
  carpoolLocations = [],
  onMapReady 
}: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    if (!import.meta.env.VITE_MAPBOX_ACCESS_TOKEN) {
      console.error('MapBox access token not found');
      return;
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: eventLocation ? [eventLocation.lng, eventLocation.lat] : [-0.1276, 51.5074], // Default to London
      zoom: 12,
      attributionControl: false
    });

    map.current.addControl(new mapboxgl.AttributionControl({
      compact: true
    }));

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      setMapLoaded(true);
      if (onMapReady && map.current) {
        onMapReady(map.current);
      }
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Add event location marker
  useEffect(() => {
    if (!map.current || !mapLoaded || !eventLocation) return;

    const eventMarker = new mapboxgl.Marker({
      color: '#ef4444', // Red color for event
      scale: 1.2
    })
      .setLngLat([eventLocation.lng, eventLocation.lat])
      .setPopup(
        new mapboxgl.Popup({ offset: 25 })
          .setHTML(`
            <div class="p-2">
              <h3 class="font-semibold text-sm">${eventLocation.name}</h3>
              <p class="text-xs text-gray-600">Event Location</p>
            </div>
          `)
      )
      .addTo(map.current);

    return () => {
      eventMarker.remove();
    };
  }, [eventLocation, mapLoaded]);

  // Add user location marker
  useEffect(() => {
    if (!map.current || !mapLoaded || !userLocation) return;

    const userMarker = new mapboxgl.Marker({
      color: '#3b82f6', // Blue color for user
      scale: 1.0
    })
      .setLngLat([userLocation.lng, userLocation.lat])
      .setPopup(
        new mapboxgl.Popup({ offset: 25 })
          .setHTML(`
            <div class="p-2">
              <h3 class="font-semibold text-sm">Your Location</h3>
              <p class="text-xs text-gray-600">Current Position</p>
            </div>
          `)
      )
      .addTo(map.current);

    return () => {
      userMarker.remove();
    };
  }, [userLocation, mapLoaded]);

  // Add carpool location markers
  useEffect(() => {
    if (!map.current || !mapLoaded || carpoolLocations.length === 0) return;

    const markers: mapboxgl.Marker[] = [];

    carpoolLocations.forEach((carpool) => {
      // Determine marker color based on carpool type
      let color = '#10b981'; // Green for pickup
      if (carpool.canPickup && carpool.canDropoff) {
        color = '#8b5cf6'; // Purple for both ways
      } else if (carpool.canDropoff) {
        color = '#f59e0b'; // Orange for dropoff only
      }

      const marker = new mapboxgl.Marker({
        color,
        scale: 0.8
      })
        .setLngLat([carpool.lng, carpool.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 })
            .setHTML(`
              <div class="p-2">
                <h3 class="font-semibold text-sm">${carpool.parentName}</h3>
                <p class="text-xs text-gray-600 mb-1">${carpool.address}</p>
                <div class="flex items-center gap-2 text-xs">
                  ${carpool.canPickup && carpool.canDropoff 
                    ? '<span class="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">Both Ways</span>'
                    : carpool.canPickup 
                    ? '<span class="px-1.5 py-0.5 bg-green-100 text-green-700 rounded">To Event</span>'
                    : '<span class="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded">From Event</span>'
                  }
                  <span class="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded">${carpool.spacesAvailable} spaces</span>
                </div>
              </div>
            `)
        )
        .addTo(map.current!);

      markers.push(marker);
    });

    return () => {
      markers.forEach(marker => marker.remove());
    };
  }, [carpoolLocations, mapLoaded]);

  // Fit map to show all markers
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const allPoints: [number, number][] = [];

    if (eventLocation) {
      allPoints.push([eventLocation.lng, eventLocation.lat]);
    }

    if (userLocation) {
      allPoints.push([userLocation.lng, userLocation.lat]);
    }

    carpoolLocations.forEach(carpool => {
      allPoints.push([carpool.lng, carpool.lat]);
    });

    if (allPoints.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      allPoints.forEach(point => bounds.extend(point));
      
      map.current?.fitBounds(bounds, {
        padding: 50,
        maxZoom: 15
      });
    } else if (allPoints.length === 1) {
      map.current?.setCenter(allPoints[0]);
      map.current?.setZoom(14);
    }
  }, [eventLocation, userLocation, carpoolLocations, mapLoaded]);

  if (!import.meta.env.VITE_MAPBOX_ACCESS_TOKEN) {
    return (
      <div className={`${className} bg-gray-100 flex items-center justify-center rounded-lg border border-gray-200`}>
        <div className="text-center p-4">
          <p className="text-gray-600 text-sm">Map unavailable - MapBox token required</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} rounded-lg overflow-hidden border border-gray-200`}>
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
}