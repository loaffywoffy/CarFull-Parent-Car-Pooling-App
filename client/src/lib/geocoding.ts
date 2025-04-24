
import axios from 'axios';

// Cache for geocoding results
const geocodeCache: Record<string, [number, number]> = {};

/**
 * Attempts to geocode an address and returns coordinates
 * If geocoding fails, it returns null rather than [0,0]
 */
export async function geocodeAddress(
  address: string,
  city: string = '',
  postcode: string = ''
): Promise<[number, number]> {
  // Skip geocoding if both address and postcode are empty
  if (!address.trim() && !postcode.trim()) {
    console.error('Cannot geocode: Missing address and postcode');
    return [0, 0];
  }
  
  const fullAddress = `${address} ${city} ${postcode}`.trim();
  
  // Check cache first
  if (geocodeCache[fullAddress]) {
    console.log(`Using cached coordinates for ${fullAddress}`);
    return geocodeCache[fullAddress];
  }

  try {
    // Add a delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}`,
      {
        headers: {
          'User-Agent': 'ParentPoolingApp/1.0',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      }
    );

    if (response.data?.[0]) {
      const coordinates: [number, number] = [
        parseFloat(response.data[0].lat),
        parseFloat(response.data[0].lon)
      ];
      
      // Validate coordinates
      if (isNaN(coordinates[0]) || isNaN(coordinates[1])) {
        console.error('Invalid coordinates returned from geocoding service');
        return [0, 0];
      }
      
      // Cache the result
      geocodeCache[fullAddress] = coordinates;
      
      console.log(`Geocoded ${fullAddress} to [${coordinates}]`);
      return coordinates;
    }
    
    // Try again with just the postcode if we have it
    if (postcode.trim()) {
      console.log('Trying to geocode with just postcode:', postcode);
      const postcodeResponse = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(postcode)}`,
        {
          headers: {
            'User-Agent': 'ParentPoolingApp/1.0',
            'Accept-Language': 'en-US,en;q=0.9'
          }
        }
      );

      if (postcodeResponse.data?.[0]) {
        const coordinates: [number, number] = [
          parseFloat(postcodeResponse.data[0].lat),
          parseFloat(postcodeResponse.data[0].lon)
        ];
        
        // Validate coordinates
        if (isNaN(coordinates[0]) || isNaN(coordinates[1])) {
          console.error('Invalid coordinates returned from postcode geocoding');
          return [0, 0];
        }
        
        // Cache the result
        geocodeCache[fullAddress] = coordinates;
        
        console.log(`Geocoded ${postcode} to [${coordinates}]`);
        return coordinates;
      }
    }
    
    console.error('No geocoding results found for address:', fullAddress);
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
