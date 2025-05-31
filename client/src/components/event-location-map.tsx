import { MapPin, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EventLocationMapProps {
  address: string;
  city?: string;
  postcode: string;
  className?: string;
}

export default function EventLocationMap({ address, city, postcode, className = "w-full h-64" }: EventLocationMapProps) {
  const fullAddress = `${address}, ${city ? city + ' ' : ''}${postcode}`;
  
  return (
    <div className={`${className} bg-gradient-to-br from-blue-50 to-indigo-100 border border-gray-200 rounded-lg overflow-hidden`}>
      <div className="h-full flex flex-col">
        {/* Header with location info */}
        <div className="bg-white/90 backdrop-blur-sm p-4 border-b border-gray-200">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <MapPin className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Event Location</h3>
              <p className="text-sm text-gray-600 mt-1">{fullAddress}</p>
            </div>
          </div>
        </div>

        {/* Interactive map area */}
        <div className="flex-1 relative bg-gradient-to-br from-blue-100 to-indigo-200">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <MapPin className="h-8 w-8 text-blue-600" />
              </div>
              <p className="text-gray-700 font-medium mb-6">Click below to view in your preferred map app</p>
              
              {/* Navigation buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-md mx-auto">
                <Button variant="default" size="sm" className="flex items-center gap-2" asChild>
                  <a href={`https://maps.google.com/maps?q=${encodeURIComponent(fullAddress)}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Google Maps
                  </a>
                </Button>
                <Button variant="outline" size="sm" className="flex items-center gap-2" asChild>
                  <a href={`https://maps.apple.com/?q=${encodeURIComponent(fullAddress)}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Apple Maps
                  </a>
                </Button>
                <Button variant="outline" size="sm" className="flex items-center gap-2" asChild>
                  <a href={`https://waze.com/ul?q=${encodeURIComponent(fullAddress)}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Waze
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}