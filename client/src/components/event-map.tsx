import React from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, ExternalLink, Navigation } from 'lucide-react';

interface EventMapProps {
  address: string;
  city: string;
  postcode: string;
  eventName: string;
}

export default function EventMap({ address, city, postcode, eventName }: EventMapProps) {
  const fullAddress = `${address}, ${city} ${postcode}`;
  const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

  return (
    <div className="space-y-4">
      {/* Static Map Display */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="relative h-64 bg-gradient-to-br from-blue-50 to-blue-100">
          <img
            src={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+3B82F6(${encodeURIComponent(fullAddress)})/auto/600x300@2x?access_token=${mapboxToken}`}
            alt={`Map showing ${fullAddress}`}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to placeholder if map image fails to load
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling!.style.display = 'flex';
            }}
          />
          <div className="absolute inset-0 bg-gray-100 hidden items-center justify-center">
            <div className="text-center">
              <MapPin className="h-12 w-12 mx-auto text-blue-500 mb-2" />
              <p className="text-gray-600 font-medium">{eventName}</p>
              <p className="text-sm text-gray-500">{fullAddress}</p>
            </div>
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