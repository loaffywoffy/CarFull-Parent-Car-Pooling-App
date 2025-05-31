import { useEffect, useRef, useState } from 'react';

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

        // Check if Google Maps is available
        if (!window.google?.maps) {
          throw new Error('Google Maps not available');
        }

        if (!mapRef.current) return;

        const fullAddress = `${address}, ${city ? city + ' ' : ''}${postcode}`;
        
        // Create geocoder
        const geocoder = new google.maps.Geocoder();
        
        // Geocode the address
        const geocodeResult = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
          geocoder.geocode({ address: fullAddress }, (results, status) => {
            if (status === 'OK' && results && results.length > 0) {
              resolve(results);
            } else {
              reject(new Error(`Geocoding failed: ${status}`));
            }
          });
        });

        const location = geocodeResult[0].geometry.location;

        // Create map
        const map = new google.maps.Map(mapRef.current, {
          center: location,
          zoom: 15,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          disableDefaultUI: true,
          zoomControl: true,
          streetViewControl: false,
          fullscreenControl: true,
        });

        // Add marker
        new google.maps.Marker({
          position: location,
          map: map,
          title: `Event Location: ${fullAddress}`,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="12" fill="#ef4444" stroke="white" stroke-width="2"/>
                <circle cx="16" cy="16" r="4" fill="white"/>
              </svg>
            `),
            scaledSize: new google.maps.Size(32, 32),
            anchor: new google.maps.Point(16, 16),
          }
        });

        setIsLoading(false);
      } catch (err) {
        console.error('Error initializing event location map:', err);
        setError('Unable to load map. Please check your internet connection.');
        setIsLoading(false);
      }
    };

    // Delay initialization to avoid conflicts
    const timer = setTimeout(initializeMap, 100);
    return () => clearTimeout(timer);
  }, [address, city, postcode]);

  if (error) {
    return (
      <div className={`${className} bg-gray-100 flex items-center justify-center rounded-lg border border-gray-200`}>
        <div className="text-center p-4">
          <p className="text-gray-600 text-sm">{error}</p>
          <p className="text-gray-500 text-xs mt-1">
            {address}, {city ? city + ' ' : ''}{postcode}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} rounded-lg overflow-hidden border border-gray-200 relative`}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600 text-sm">Loading event location...</p>
          </div>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full min-h-[250px]" />
    </div>
  );
}