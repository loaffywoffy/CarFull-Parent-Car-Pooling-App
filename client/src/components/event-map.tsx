import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, ExternalLink, Navigation } from 'lucide-react';

interface EventMapProps {
  address: string;
  city: string;
  postcode: string;
  eventName: string;
}

export default function EventMap({ address, city, postcode, eventName }: EventMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapError, setMapError] = useState(false);
  const fullAddress = `${address}, ${city} ${postcode}`;
  
  const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

  useEffect(() => {
    if (!mapboxToken) {
      setMapError(true);
      return;
    }

    let map: any = null;

    const initializeMap = async () => {
      try {
        if (mapRef.current) {
          mapRef.current.innerHTML = '';
        }

        const mapboxgl = await import('mapbox-gl');
        mapboxgl.default.accessToken = mapboxToken;

        const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullAddress)}.json?access_token=${mapboxToken}&country=GB&limit=1`;
        
        const geocodeResponse = await fetch(geocodeUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!geocodeResponse.ok) {
          console.error('Geocoding failed:', geocodeResponse.status, geocodeResponse.statusText);
          throw new Error(`Geocoding failed: ${geocodeResponse.status}`);
        }

        const geocodeData = await geocodeResponse.json();
        
        if (!geocodeData.features || geocodeData.features.length === 0) {
          throw new Error('Address not found');
        }

        const [lng, lat] = geocodeData.features[0].center;

        if (!mapRef.current) return;

        map = new mapboxgl.default.Map({
          container: mapRef.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [lng, lat],
          zoom: 14,
        });

        new mapboxgl.default.Marker({
          color: '#3B82F6'
        })
          .setLngLat([lng, lat])
          .setPopup(
            new mapboxgl.default.Popup({ offset: 25 })
              .setHTML(`<div class="font-medium">${eventName}</div><div class="text-sm text-gray-600">${fullAddress}</div>`)
          )
          .addTo(map);

        map.addControl(new mapboxgl.default.NavigationControl(), 'top-right');

      } catch (error) {
        console.error('Map initialization error:', error);
        setMapError(true);
      }
    };

    initializeMap();

    return () => {
      if (map) {
        map.remove();
      }
    };
  }, [fullAddress, eventName, mapboxToken]);

  if (mapError) {
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <div className="flex items-start gap-3">
            <div className="bg-blue-500 p-2 rounded-full flex-shrink-0">
              <MapPin className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-1">{eventName}</h3>
              <p className="text-blue-800 font-medium">{address}</p>
              <p className="text-blue-700">{city} {postcode}</p>
              <p className="text-xs text-blue-600 mt-2">Map temporarily unavailable</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <Navigation className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Get Directions</span>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm" className="flex items-center gap-1" asChild>
              <a href={`https://maps.google.com/maps?q=${encodeURIComponent(fullAddress)}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3" />
                Google Maps
              </a>
            </Button>
            <Button variant="outline" size="sm" className="flex items-center gap-1" asChild>
              <a href={`https://maps.apple.com/?q=${encodeURIComponent(fullAddress)}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3" />
                Apple Maps
              </a>
            </Button>
            <Button variant="outline" size="sm" className="flex items-center gap-1" asChild>
              <a href={`https://waze.com/ul?q=${encodeURIComponent(fullAddress)}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3" />
                Waze
              </a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Map Container */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div ref={mapRef} style={{ width: '100%', height: '300px' }} className="bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-600 font-medium">Loading map...</p>
          </div>
        </div>
      </div>

      {/* Location Info */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500 p-2 rounded-full flex-shrink-0">
            <MapPin className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-blue-900">{eventName}</h3>
            <p className="text-blue-800 text-sm">{address}, {city} {postcode}</p>
          </div>
        </div>
      </div>

      {/* Navigation Options */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <Navigation className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Get Directions</span>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" size="sm" className="flex items-center gap-1" asChild>
            <a href={`https://maps.google.com/maps?q=${encodeURIComponent(fullAddress)}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3" />
              Google Maps
            </a>
          </Button>
          <Button variant="outline" size="sm" className="flex items-center gap-1" asChild>
            <a href={`https://maps.apple.com/?q=${encodeURIComponent(fullAddress)}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3" />
              Apple Maps
            </a>
          </Button>
          <Button variant="outline" size="sm" className="flex items-center gap-1" asChild>
            <a href={`https://maps.apple.com/?q=${encodeURIComponent(fullAddress)}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3" />
              Waze
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}