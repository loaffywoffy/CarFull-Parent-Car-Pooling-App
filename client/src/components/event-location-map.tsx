import { MapPin } from 'lucide-react';

interface EventLocationMapProps {
  address: string;
  city?: string;
  postcode: string;
  className?: string;
}

export default function EventLocationMap({ address, city, postcode, className = "w-full h-64" }: EventLocationMapProps) {
  const fullAddress = `${address}, ${city ? city + ' ' : ''}${postcode}`;
  
  // Create static map URL with custom styling
  const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?` +
    `center=${encodeURIComponent(fullAddress)}&` +
    `zoom=16&` +
    `size=600x400&` +
    `maptype=roadmap&` +
    `markers=color:red%7C${encodeURIComponent(fullAddress)}&` +
    `key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`;
  
  return (
    <div className={`${className} bg-gray-50 border border-gray-200 rounded-lg overflow-hidden`}>
      <img
        src={staticMapUrl}
        alt={`Map showing ${fullAddress}`}
        className="w-full h-full object-cover"
        style={{ minHeight: '400px' }}
        loading="lazy"
      />
    </div>
  );
}