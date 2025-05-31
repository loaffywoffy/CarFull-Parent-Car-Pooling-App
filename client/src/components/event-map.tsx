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
  const [mapKey, setMapKey] = useState(0); // Force remount when needed

  // Set coordinates using Google Maps geocoding service when available
  useEffect(() => {
    if (!window.google?.maps?.Geocoder) {
      // If Google Maps isn't loaded yet, wait and try again
      const checkGoogle = setInterval(() => {
        if (window.google?.maps?.Geocoder) {
          clearInterval(checkGoogle);
          geocodeWithGoogle();
        }
      }, 100);
      
      // Clear interval after 5 seconds to avoid infinite loop
      setTimeout(() => clearInterval(checkGoogle), 5000);
      return;
    }
    
    geocodeWithGoogle();

    function geocodeWithGoogle() {
      const geocoder = new window.google.maps.Geocoder();
      const fullAddress = `${address}, ${city} ${postcode}`;
      
      console.log('EventMap geocoding with Google Maps API:', fullAddress);
      
      geocoder.geocode({ address: fullAddress }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const location = results[0].geometry.location;
          const coords: [number, number] = [location.lat(), location.lng()];
          console.log('EventMap Google geocoding success:', coords);
          setEventCoordinates(coords);
          // Force map remount after coordinates are set
          setMapKey(prev => prev + 1);
        } else {
          // Try with just postcode if full address fails
          console.log('EventMap: Trying postcode only geocoding');
          geocoder.geocode({ address: postcode }, (postcodeResults, postcodeStatus) => {
            if (postcodeStatus === 'OK' && postcodeResults && postcodeResults[0]) {
              const location = postcodeResults[0].geometry.location;
              const coords: [number, number] = [location.lat(), location.lng()];
              console.log('EventMap Google postcode geocoding success:', coords);
              setEventCoordinates(coords);
              setMapKey(prev => prev + 1);
            } else {
              console.log('EventMap: Geocoding failed, using London center');
              setEventCoordinates([51.5154, -0.1426]);
              setMapKey(prev => prev + 1);
            }
          });
        }
      });
    }
  }, [address, city, postcode]);

  // Add visibility change handler to remount map when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && eventCoordinates) {
        // Force map remount when tab becomes visible again
        setTimeout(() => {
          setMapKey(prev => prev + 1);
        }, 100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [eventCoordinates]);

  return (
    <div className="space-y-4">
      {/* Interactive Map Display */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <GoogleMap
          key={`event-map-${mapKey}-${eventCoordinates ? eventCoordinates.join(',') : 'no-coords'}`}
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