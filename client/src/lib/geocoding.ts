
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
    const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!googleApiKey) {
      console.error('Google Maps API key not found');
      return [0, 0];
    }

    // Try Google Geocoding API first - more reliable for UK addresses
    console.log(`Geocoding with Google: ${fullAddress}`);
    const googleResponse = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${googleApiKey}`,
      { timeout: 5000 }
    );

    if (googleResponse.data?.results?.[0]) {
      const location = googleResponse.data.results[0].geometry.location;
      const coordinates: [number, number] = [location.lat, location.lng];
      
      // Cache the result
      geocodeCache[fullAddress] = coordinates;
      
      console.log(`Google geocoded ${fullAddress} to [${coordinates}]`);
      return coordinates;
    }

    // Fallback to postcode only if full address fails
    if (postcode.trim()) {
      console.log(`Trying Google geocoding with postcode only: ${postcode}`);
      const postcodeResponse = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(postcode)}&key=${googleApiKey}`,
        { timeout: 5000 }
      );

      if (postcodeResponse.data?.results?.[0]) {
        const location = postcodeResponse.data.results[0].geometry.location;
        const coordinates: [number, number] = [location.lat, location.lng];
        
        // Cache the result
        geocodeCache[fullAddress] = coordinates;
        
        console.log(`Google geocoded postcode ${postcode} to [${coordinates}]`);
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
  const R = 6371; // Earth's radius in kilometers
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

// Cache for driving distance results
const drivingDistanceCache: Record<string, { distance: number; duration: number }> = {};

/**
 * Calculate driving distance and duration using server-side Google Maps Directions API
 */
export async function calculateDrivingDistance(
  startCoords: [number, number],
  endCoords: [number, number]
): Promise<{ distance: number; duration: number } | null> {
  // Skip calculation if coordinates are invalid (0,0)
  if ((startCoords[0] === 0 && startCoords[1] === 0) || 
      (endCoords[0] === 0 && endCoords[1] === 0)) {
    return null;
  }

  const cacheKey = `${startCoords[0]},${startCoords[1]}-${endCoords[0]},${endCoords[1]}`;
  
  // Check cache first
  if (drivingDistanceCache[cacheKey]) {
    console.log(`Using cached driving distance for ${cacheKey}`);
    return drivingDistanceCache[cacheKey];
  }

  try {
    // Add delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 100));

    const response = await axios.post('/api/calculate-driving-distance', {
      startCoords,
      endCoords
    });
    
    if (response.data?.distance && response.data?.duration) {
      const result = {
        distance: response.data.distance,
        duration: response.data.duration
      };
      
      // Cache the result
      drivingDistanceCache[cacheKey] = result;
      
      console.log(`Calculated server driving distance: ${result.distance.toFixed(1)} km, ${result.duration.toFixed(0)} minutes`);
      return result;
    }
    
    console.error('Invalid response from driving distance API');
    return null;
  } catch (error) {
    console.error('Server driving distance API error:', error);
    return null;
  }
}
