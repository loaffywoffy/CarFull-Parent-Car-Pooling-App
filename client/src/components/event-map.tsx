import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, ExternalLink, Navigation } from 'lucide-react';
import GoogleMap from './google-map';
import { geocodeAddress } from '@/lib/geocoding';

interface EventMapProps {
  address: string;
  city: string;
  postcode: string;
  eventName: string;
}

export default function EventMap({ address, city, postcode, eventName }: EventMapProps) {
  const fullAddress = `${address}, ${city} ${postcode}`;
  const [eventCoordinates, setEventCoordinates] = useState<[number, number] | null>(null);
  const [useMapboxFallback, setUseMapboxFallback] = useState(false);

  // Geocode the event address
  useEffect(() => {
    const geocodeEventAddress = async () => {
      try {
        console.log('EventMap geocoding address:', address, city, postcode);
        const coords = await geocodeAddress(address, city, postcode);
        console.log('EventMap received coordinates:', coords);
        
        if (coords && coords[0] !== 0 && coords[1] !== 0) {
          setEventCoordinates(coords);
        } else {
          // If no geocoding results, set default London coordinates
          console.log('EventMap: Setting default coordinates due to failed geocoding');
          setEventCoordinates([51.5074, -0.1276]);
        }
      } catch (error) {
        console.error('EventMap geocoding error:', error);
        // Set default London coordinates if geocoding fails
        setEventCoordinates([51.5074, -0.1276]);
      }
    };

    if (address || postcode) {
      geocodeEventAddress();
    }
  }, [address, city, postcode]);

  return (
    <div className="space-y-4">
      {/* Interactive Map Display */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <GoogleMap
          className="w-full h-64"
          eventLocation={eventCoordinates ? {
            lat: eventCoordinates[0],
            lng: eventCoordinates[1],
            name: `${eventName} - ${fullAddress}`
          } : undefined}
        />
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