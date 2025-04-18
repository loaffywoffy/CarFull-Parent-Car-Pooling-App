// Use OpenStreetMap's Nominatim API for real geocoding
// This is a free service with usage limits (1 request per second)
export const postcodeToCoordinates = async (postcode: string): Promise<[number, number] | null> => {
  try {
    if (!postcode) return null;
    
    // Clean up the postcode
    const cleanPostcode = postcode.trim().replace(/\s+/g, '+');
    
    // Create a cache key
    const cacheKey = `geocode_${cleanPostcode}`;
    
    // Check if we have cached coordinates for this postcode
    const cachedResult = localStorage.getItem(cacheKey);
    if (cachedResult) {
      const [lat, lng] = JSON.parse(cachedResult);
      console.log(`Using cached coordinates for ${postcode}: [${lat}, ${lng}]`);
      return [lat, lng];
    }
    
    // Use the OpenStreetMap Nominatim API (free, but has rate limits)
    // We're adding the country to improve accuracy for UK postcodes
    const url = `https://nominatim.openstreetmap.org/search?q=${cleanPostcode},UK&format=json&addressdetails=1&limit=1`;
    
    // Add a delay to respect rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const response = await fetch(url, {
      headers: {
        // Add a user agent as required by the Nominatim Usage Policy
        'User-Agent': 'CarpoolApp/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Geocoding API returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      
      // Cache the result
      localStorage.setItem(cacheKey, JSON.stringify([lat, lon]));
      
      console.log(`Geocoded ${postcode} to [${lat}, ${lon}]`);
      return [lat, lon];
    } else {
      console.warn(`No geocoding results found for ${postcode}`);
      
      // If the API fails, fall back to our deterministic algorithm
      const fallbackCoords = generateDeterministicCoordinates(postcode);
      console.log(`Using fallback coordinates for ${postcode}: [${fallbackCoords[0]}, ${fallbackCoords[1]}]`);
      return fallbackCoords;
    }
  } catch (error) {
    console.error('Error geocoding postcode:', error);
    
    // Fallback to deterministic coordinates
    const fallbackCoords = generateDeterministicCoordinates(postcode);
    console.log(`Using fallback coordinates after error for ${postcode}: [${fallbackCoords[0]}, ${fallbackCoords[1]}]`);
    return fallbackCoords;
  }
};

// Helper function to generate deterministic coordinates based on postcode
// Used as a fallback when the API fails
function generateDeterministicCoordinates(postcode: string): [number, number] {
  if (!postcode) return [51.5074, -0.1278]; // Default to central London
  
  // Hash function to generate consistent coordinates for the same input
  const hashCode = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  };
  
  // Different UK city coordinates to make locations more realistic
  const ukCities = [
    { name: 'London', lat: 51.5074, lng: -0.1278 },
    { name: 'Manchester', lat: 53.4808, lng: -2.2426 },
    { name: 'Birmingham', lat: 52.4862, lng: -1.8904 },
    { name: 'Leeds', lat: 53.8008, lng: -1.5491 },
    { name: 'Glasgow', lat: 55.8642, lng: -4.2518 },
    { name: 'Liverpool', lat: 53.4084, lng: -2.9916 },
    { name: 'Bristol', lat: 51.4545, lng: -2.5879 },
    { name: 'Edinburgh', lat: 55.9533, lng: -3.1883 },
    { name: 'Cardiff', lat: 51.4816, lng: -3.1791 },
    { name: 'Belfast', lat: 54.5973, lng: -5.9301 }
  ];
  
  // Choose a city based on the first character of the postcode
  const firstChar = postcode.charAt(0).toUpperCase();
  const cityIndex = firstChar.charCodeAt(0) % ukCities.length;
  const baseCity = ukCities[cityIndex];
  
  // Generate a small variation based on postcode hash (±0.03 degrees ~ 3km max)
  const hash = hashCode(postcode.toUpperCase());
  const latVariation = (hash % 60) / 1000 - 0.03; // ±0.03 degree variation
  const lngVariation = ((hash >> 8) % 60) / 1000 - 0.03; // Different variation for longitude
  
  const lat = baseCity.lat + latVariation;
  const lng = baseCity.lng + lngVariation;
  
  return [lat, lng];
}

// External helper function for geocoding addresses
export async function getCoordinatesFromAddress(
  address: string,
  city: string,
  postcode: string
): Promise<[number, number] | null> {
  try {
    // Use the full address when available for better accuracy
    const fullAddress = [address, city, postcode].filter(Boolean).join(', ');
    
    // Create a cache key
    const cacheKey = `geocode_addr_${fullAddress.replace(/\s+/g, '_')}`;
    
    // Check if we have cached coordinates for this address
    const cachedResult = localStorage.getItem(cacheKey);
    if (cachedResult) {
      const [lat, lng] = JSON.parse(cachedResult);
      console.log(`Using cached coordinates for address: [${lat}, ${lng}]`);
      return [lat, lng];
    }
    
    // The OpenStreetMap Nominatim API (free, but has rate limits)
    const encodedAddress = encodeURIComponent(fullAddress);
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&addressdetails=1&limit=1`;
    
    // Add a delay to respect rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const response = await fetch(url, {
      headers: {
        // Add a user agent as required by the Nominatim Usage Policy
        'User-Agent': 'CarpoolApp/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Geocoding API returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      
      // Cache the result
      localStorage.setItem(cacheKey, JSON.stringify([lat, lon]));
      
      console.log(`Geocoded address to [${lat}, ${lon}]`);
      return [lat, lon];
    } else {
      console.warn(`No geocoding results found for address`);
      
      // If the full address lookup fails, fall back to just the postcode
      return postcodeToCoordinates(postcode);
    }
  } catch (error) {
    console.error('Error geocoding address:', error);
    // Fall back to just the postcode lookup
    return postcodeToCoordinates(postcode);
  }
}

// This is needed for backwards compatibility
export async function geocodeAddress(
  address: string,
  city: string,
  postcode: string
): Promise<[number, number]> {
  // Use the other function but provide a fallback if it fails
  const result = await getCoordinatesFromAddress(address, city, postcode);
  if (result) return result;
  
  // Default fallback coordinates for London
  return [51.5074, -0.1278];
}

// Calculate approximate distance in miles between two coordinates
export function calculateDistance(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  // Haversine formula to calculate distance between two points on Earth
  const R = 3958.8; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return parseFloat(distance.toFixed(1));
}