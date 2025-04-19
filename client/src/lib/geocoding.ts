
import axios from 'axios';

// Cache for geocoding results
const geocodeCache: Record<string, [number, number]> = {};

export async function geocodeAddress(
  address: string,
  city: string = '',
  postcode: string = ''
): Promise<[number, number]> {
  const fullAddress = `${address} ${city} ${postcode}`.trim();
  
  // Check cache first
  if (geocodeCache[fullAddress]) {
    console.log(`Using cached coordinates for ${fullAddress}`);
    return geocodeCache[fullAddress];
  }

  try {
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}`
    );

    if (response.data?.[0]) {
      const coordinates: [number, number] = [
        parseFloat(response.data[0].lat),
        parseFloat(response.data[0].lon)
      ];
      
      // Cache the result
      geocodeCache[fullAddress] = coordinates;
      
      console.log(`Geocoded ${fullAddress} to [${coordinates}]`);
      return coordinates;
    }
    
    console.error('No geocoding results found for address');
    return [0, 0];
  } catch (error) {
    console.error('Geocoding error:', error);
    return [0, 0];
  }
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
