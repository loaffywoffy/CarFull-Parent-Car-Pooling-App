
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
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    async function getCoordinates() {
      try {
        // Reset error state when starting a new geocode attempt
        setError(false);
        
        // Skip if address or postcode is missing
        if (!address.trim() || !postcode.trim()) {
          setError(true);
          return;
        }
        
        const coords = await geocodeAddress(address, city, postcode);
        
        // Check if coordinates are valid (not [0,0])
        if (coords[0] === 0 && coords[1] === 0) {
          setError(true);
          return;
        }
        
        setCoordinates(coords);
      } catch (err) {
        console.error("Error getting coordinates:", err);
        setError(true);
      }
    }
    getCoordinates();
  }, [address, city, postcode]);

  // Show loading state
  if (!coordinates && !error) {
    return <div style={{ height, width: '100%', background: '#f0f0f0' }} className="animate-pulse rounded-md" />;
  }

  // Show error state
  if (error || !coordinates) {
    return (
      <div style={{ height, width: '100%' }} className="rounded-md border border-gray-200 flex items-center justify-center bg-gray-50">
        <div className="text-center p-4">
          <p className="text-gray-500 text-sm mb-1">Unable to display map for this location.</p>
          <p className="text-xs text-gray-400">{address}, {city}, {postcode}</p>
        </div>
      </div>
    );
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
