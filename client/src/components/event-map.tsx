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
    // Temporarily disable MapBox integration to prevent fetch errors
    setMapError(true);
  }, [fullAddress, eventName, mapboxToken]);

  if (mapError) {
    return (
      <div className="space-y-4">
        <div className="bg-gray-100 rounded-lg border border-gray-200 h-64 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-600 font-medium">Interactive map unavailable</p>
            <p className="text-sm text-gray-500 mt-1">Use navigation buttons below</p>
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