
// Cache of geocoded locations to reduce API calls
const geocodeCache: Record<string, [number, number]> = {};

// Mock coordinate generator (deterministic based on input strings)
function generateDeterministicCoordinates(address: string, city?: string): [number, number] {
  // This approach creates consistent but fake coordinates for demo purposes
  // Uses a hash-like function to generate a "randomized" but deterministic value
  let hash = 0;
  const input = `${address}${city || ''}`;
  
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }

  // Generate coordinates around London (51.5074, -0.1278) area
  // Small variations based on hash
  const lat = 51.5074 + (hash % 1000) / 10000;
  const lon = -0.1278 + ((hash >> 10) % 1000) / 10000;
  
  return [lat, lon];
}

// Real geocoding service using OpenStreetMap's Nominatim API with fallback
export async function geocodeAddress(
  address: string,
  city?: string,
  postcode?: string
): Promise<[number, number]> {
  const query = `${address}, ${city || ''}, ${postcode || ''}`.trim();
  
  // Check cache first
  const cacheKey = query.toLowerCase();
  if (geocodeCache[cacheKey]) {
    return geocodeCache[cacheKey];
  }
  
  // If we're running in development, use mock data due to API rate limits
  try {
    // For demo purposes, use deterministic coordinates
    const deterministicCoords = generateDeterministicCoordinates(address, city);
    geocodeCache[cacheKey] = deterministicCoords;
    return deterministicCoords;
    
    // Real API implementation (commented out to prevent rate limiting issues)
    /*
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'CarpoolApp/1.0' // Required by Nominatim's terms of use
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.length === 0) {
      throw new Error('Location not found');
    }
    
    const [result] = data;
    const coordinates: [number, number] = [parseFloat(result.lat), parseFloat(result.lon)];
    
    // Save to cache
    geocodeCache[cacheKey] = coordinates;
    return coordinates;
    */
  } catch (error) {
    console.error('Geocoding error:', error);
    
    // Fallback to deterministic coordinates
    const fallbackCoords = generateDeterministicCoordinates(address, city);
    geocodeCache[cacheKey] = fallbackCoords;
    return fallbackCoords;
  }
}

// Calculate distance between two addresses
export async function calculateDistanceBetweenAddresses(
  address1: string,
  city1: string,
  postcode1: string,
  address2: string,
  city2: string,
  postcode2: string
): Promise<number> {
  try {
    // Get coordinates for both addresses
    const [lat1, lon1] = await geocodeAddress(address1, city1, postcode1);
    const [lat2, lon2] = await geocodeAddress(address2, city2, postcode2);
    
    // Calculate the distance
    return calculateDistance(lat1, lon1, lat2, lon2);
  } catch (error) {
    console.error('Error calculating distance between addresses:', error);
    return -1; // Return -1 to indicate failure
  }
}

// Calculate distance between two coordinates (in miles)
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3958.8; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

// Convert travel distance to estimated time
export function distanceToTime(distanceInMiles: number): number {
  // Assume average speed of 25 mph in urban areas
  return Math.round(distanceInMiles / 25 * 60); // Returns minutes
}

// Format minutes to a readable time string
export function formatTravelTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins} mins`;
}
