// This is a mock geocoding service for demonstration purposes
// In a real application, you would use a proper geocoding service like Google Maps, Mapbox, or OpenStreetMap

// Function to convert UK postcodes or addresses to coordinates using a mock geocoding service
// Returns [latitude, longitude]
export async function geocodeAddress(
  address: string,
  city?: string,
  postcode?: string
): Promise<[number, number]> {
  // For demo purposes, we'll use random coordinates near London
  console.log(`Geocoding: ${address}, ${city || ''}, ${postcode || ''}`);
  
  // Set a seed based on the postcode or address to ensure consistent coordinates for the same input
  const seed = postcode || address;
  const seedNum = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Random coordinate near London (51.5074° N, 0.1278° W) but deterministic based on seed
  const baseLat = 51.5074;
  const baseLng = -0.1278;
  
  // Add some variation based on the seed (±0.1 degrees)
  const rng1 = Math.sin(seedNum) * 0.1;
  const rng2 = Math.cos(seedNum) * 0.1;
  
  const lat = baseLat + rng1;
  const lng = baseLng + rng2;
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  console.log(`Geocoded to [${lat}, ${lng}]`);
  return [lat, lng];
}

// Calculate distance between two coordinates (in miles)
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  // Haversine formula for calculating distance between two points on Earth
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