import { useEffect, useState } from 'react';
import { geocodeAddress } from '@/lib/geocoding';
import GoogleMap from './google-map';
import { MapPin } from 'lucide-react';

interface EventLocationMapProps {
  address: string;
  city?: string;
  postcode: string;
  className?: string;
}

export default function EventLocationMap({ address, city, postcode, className = "w-full h-64" }: EventLocationMapProps) {
  const [eventLocation, setEventLocation] = useState<{lat: number; lng: number; name: string} | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEventLocation = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const coordinates = await geocodeAddress(address, city || '', postcode);
        setEventLocation({
          lat: coordinates[0],
          lng: coordinates[1],
          name: `${address}, ${city ? city + ' ' : ''}${postcode}`
        });
      } catch (error) {
        console.error('Failed to geocode event location:', error);
        setError('Unable to load event location on map');
      } finally {
        setIsLoading(false);
      }
    };

    loadEventLocation();
  }, [address, city, postcode]);

  if (isLoading) {
    return (
      <div className={`${className} bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-500 mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">Loading event location...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className} bg-gray-50 border border-gray-200 rounded-lg flex flex-col items-center justify-center text-gray-500`}>
        <MapPin className="h-8 w-8 mb-2" />
        <p className="text-sm text-center mb-2">{error}</p>
        <p className="text-xs text-center">{address}, {city ? city + ' ' : ''}{postcode}</p>
      </div>
    );
  }

  return (
    <GoogleMap
      className={className}
      eventLocation={eventLocation}
    />
  );
}