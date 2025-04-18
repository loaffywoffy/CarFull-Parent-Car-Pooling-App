// Function to convert UK postcodes to coordinates using a free geocoding service
// In a production app, you would want to use a more reliable geocoding service
export const postcodeToCoordinates = async (postcode: string): Promise<[number, number] | null> => {
  try {
    // For demo purposes only - in a real app you would use a geocoding API service
    // This is a mock that returns random coordinates near London
    // We'll pretend this is a geocoding API for now
    
    // Random coordinate near London (51.5074° N, 0.1278° W)
    const baseLat = 51.5074;
    const baseLng = -0.1278;
    
    // Add some random variation (±0.1 degrees)
    const lat = baseLat + (Math.random() * 0.2 - 0.1);
    const lng = baseLng + (Math.random() * 0.2 - 0.1);
    
    return [lat, lng];
  } catch (error) {
    console.error('Error geocoding postcode:', error);
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