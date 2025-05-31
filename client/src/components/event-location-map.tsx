import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { MapPin } from 'lucide-react';

interface EventLocationMapProps {
  address: string;
  city?: string;
  postcode: string;
  className?: string;
}

export default function EventLocationMap({ address, city, postcode, className = "w-full h-64" }: EventLocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeMap = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Wait a moment for the DOM to be ready
        await new Promise(resolve => setTimeout(resolve, 100));

        if (!mapRef.current) {
          throw new Error('Map container not available');
        }

        const fullAddress = `${address}, ${city ? city + ' ' : ''}${postcode}`;

        // Load Google Maps API
        const loader = new Loader({
          apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
          version: "weekly",
          libraries: ["places"]
        });

        await loader.load();

        // Initialize geocoder
        const geocoder = new window.google.maps.Geocoder();
        
        // Geocode the address
        const geocodeResult = await new Promise<google.maps.GeocoderResponse>((resolve, reject) => {
          geocoder.geocode({ address: fullAddress }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
              resolve({ results });
            } else {
              reject(new Error(`Geocoding failed: ${status}`));
            }
          });
        });

        const location = geocodeResult.results[0].geometry.location;

        // Create map
        const map = new window.google.maps.Map(mapRef.current, {
          center: location,
          zoom: 15,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
        });

        // Add marker
        new window.google.maps.Marker({
          position: location,
          map: map,
          title: fullAddress,
        });

      } catch (error) {
        console.error('Error initializing event location map:', error);
        setError('Unable to load map. Please check your internet connection.');
      } finally {
        setIsLoading(false);
      }
    };

    initializeMap();
  }, [address, city, postcode]);

  if (error) {
    return (
      <div className={`${className} bg-gray-50 border border-gray-200 rounded-lg flex flex-col items-center justify-center text-gray-500`}>
        <MapPin className="h-8 w-8 mb-2" />
        <p className="text-sm text-center mb-2">{error}</p>
        <p className="text-xs text-center">{address}, {city ? city + ' ' : ''}{postcode}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`${className} bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-500 mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">Loading map...</p>
        </div>
      </div>
    );
  }

  return <div ref={mapRef} className={className} />;
}