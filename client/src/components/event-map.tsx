import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, ExternalLink, Navigation } from 'lucide-react';
import MapboxMap from './mapbox-map';
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

  // Geocode the event address
  useEffect(() => {
    const geocodeEventAddress = async () => {
      try {
        const coords = await geocodeAddress(fullAddress);
        if (coords) {
          setEventCoordinates(coords);
        }
      } catch (error) {
        console.error('Failed to geocode event address:', error);
        // Set default London coordinates if geocoding fails
        setEventCoordinates([51.5074, -0.1276]);
      }
    };

    if (fullAddress) {
      geocodeEventAddress().catch(error => {
        console.error('Geocoding promise rejected:', error);
        setEventCoordinates([51.5074, -0.1276]);
      });
    }
  }, [fullAddress]);

  return (
    <div className="space-y-4">
      {/* Interactive Map Display */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <MapboxMap
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