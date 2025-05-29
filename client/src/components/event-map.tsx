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

  return (
    <div className="space-y-4">
      {/* Location Display */}
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <div className="flex items-start gap-3">
          <div className="bg-blue-500 p-2 rounded-full flex-shrink-0">
            <MapPin className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 mb-1">{eventName}</h3>
            <p className="text-blue-800 font-medium">{address}</p>
            <p className="text-blue-700">{city} {postcode}</p>
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
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            asChild
          >
            <a
              href={`https://maps.google.com/maps?q=${encodeURIComponent(fullAddress)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-3 w-3" />
              Google Maps
            </a>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            asChild
          >
            <a
              href={`https://maps.apple.com/?q=${encodeURIComponent(fullAddress)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-3 w-3" />
              Apple Maps
            </a>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            asChild
          >
            <a
              href={`https://waze.com/ul?q=${encodeURIComponent(fullAddress)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-3 w-3" />
              Waze
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}