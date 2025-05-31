import { MapPin } from 'lucide-react';

interface EventLocationMapProps {
  address: string;
  city?: string;
  postcode: string;
  className?: string;
}

export default function EventLocationMap({ address, city, postcode, className = "w-full h-64" }: EventLocationMapProps) {
  const fullAddress = `${address}, ${city ? city + ' ' : ''}${postcode}`;
  
  return (
    <div className={`${className} bg-gray-50 border border-gray-200 rounded-lg overflow-hidden`}>
      <iframe
        src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(fullAddress)}`}
        width="100%"
        height="100%"
        style={{ border: 0, minHeight: '400px' }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title={`Map showing ${fullAddress}`}
      />
    </div>
  );
}