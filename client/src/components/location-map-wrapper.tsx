import { useEffect, useState } from "react";
import { geocodeAddress } from "@/lib/geocoding";
import LocationMap from "@/components/location-map";

interface LocationMapWrapperProps {
  address?: string;
  city?: string;
  postcode?: string;
  parentName: string;
  id: number;
  height?: string;
  type?: 'pickup' | 'dropoff' | 'party';
}

export default function LocationMapWrapper({
  address,
  city = '',
  postcode,
  parentName,
  id,
  height = "200px",
  type = 'pickup'
}: LocationMapWrapperProps) {
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const getCoordinates = async () => {
      if (!address || !postcode) {
        setIsLoading(false);
        return;
      }
      
      try {
        const coords = await geocodeAddress(address, city, postcode);
        if (isMounted) {
          setCoordinates(coords);
        }
      } catch (error) {
        console.error(`Error geocoding location for ${id}:`, error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    getCoordinates();
    
    return () => {
      isMounted = false;
    };
  }, [address, city, postcode, id]);
  
  // Fallback coordinates centered on London
  const fallbackCoordinates: [number, number] = [51.5074, -0.1278];
  
  // Use coordinates if available, otherwise use fallback
  const position = coordinates || fallbackCoordinates;
  
  return (
    <LocationMap
      key={`map-${id}-${position[0]}-${position[1]}`}
      locations={[
        {
          label: `${parentName}'s Location`,
          position: position,
          type: type
        }
      ]}
      height={height}
      initialZoom={15}
    />
  );
}