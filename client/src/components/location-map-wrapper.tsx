
import { useEffect, useState } from 'react';
import LocationMap from './location-map';
import { geocodeAddress } from '@/lib/geocoding';

interface LocationMapWrapperProps {
  id: number;
  parentName: string;
  address: string;
  city: string;
  postcode: string;
  height?: string;
  type: 'pickup' | 'dropoff';
}

export default function LocationMapWrapper({
  id,
  parentName,
  address,
  city,
  postcode,
  height = '200px',
  type
}: LocationMapWrapperProps) {
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);

  useEffect(() => {
    async function getCoordinates() {
      const coords = await geocodeAddress(address, city, postcode);
      setCoordinates(coords);
    }
    getCoordinates();
  }, [address, city, postcode]);

  if (!coordinates) {
    return <div style={{ height, width: '100%', background: '#f0f0f0' }} className="animate-pulse rounded-md" />;
  }

  return (
    <LocationMap
      locations={[{
        label: `${parentName}'s ${type === 'pickup' ? 'Pickup' : 'Dropoff'} Location`,
        position: coordinates,
        type
      }]}
      height={height}
      initialZoom={14}
    />
  );
}
