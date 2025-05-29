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
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="flex items-center gap-2 h-auto p-4 justify-start"
            asChild
          >
            <a
              href={`https://maps.google.com/maps?q=${encodeURIComponent(fullAddress)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">Google Maps</div>
                  <div className="text-xs text-gray-600">Get directions & traffic</div>
                </div>
              </div>
            </a>
          </Button>
          
          <Button
            variant="outline"
            className="flex items-center gap-2 h-auto p-4 justify-start"
            asChild
          >
            <a
              href={`https://maps.apple.com/?q=${encodeURIComponent(fullAddress)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">Apple Maps</div>
                  <div className="text-xs text-gray-600">Navigate on iPhone/iPad</div>
                </div>
              </div>
            </a>
          </Button>
        </div>

        <Button
          variant="outline"
          className="w-full flex items-center gap-2 h-auto p-4 justify-start"
          asChild
        >
          <a
            href={`https://waze.com/ul?q=${encodeURIComponent(fullAddress)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">Waze</div>
                <div className="text-xs text-gray-600">Real-time traffic & routes</div>
              </div>
            </div>
          </a>
        </Button>
      </div>
    </div>
  );
}