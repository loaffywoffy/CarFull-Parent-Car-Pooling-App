// Function to convert UK postcodes to coordinates using deterministic mapping
// In a production app, you would want to use a real geocoding API service
export const postcodeToCoordinates = async (postcode: string): Promise<[number, number] | null> => {
  try {
    // For demo purposes, use deterministic coordinates based on postcode string
    // This gives consistent results for the same postcode and spreads different postcodes apart
    if (!postcode) return null;
    
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
    
    // Central London coordinates as the base
    const londonLat = 51.5074;
    const londonLng = -0.1278;
    
    // Generate variation based on postcode (±0.05 degrees ~ 5.5km max)
    const hash = hashCode(postcode.toUpperCase());
    const latVariation = (hash % 100) / 1000; // ±0.05 degree variation
    const lngVariation = ((hash >> 8) % 100) / 1000; // Different variation for longitude
    
    const lat = londonLat + latVariation;
    const lng = londonLng + lngVariation;
    
    // Debug log
    console.log(`Generated coordinates for ${postcode}: [${lat.toFixed(6)}, ${lng.toFixed(6)}]`);
    
    return [lat, lng];
  } catch (error) {
    console.error('Error processing postcode:', error);
    return null;
  }
};

// External helper function for geocoding addresses
export async function getCoordinatesFromAddress(
  address: string,
  city: string,
  postcode: string
): Promise<[number, number] | null> {
  // In a real app, we would use the full address
  // For this demo, we'll just use the postcode
  return postcodeToCoordinates(postcode);
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