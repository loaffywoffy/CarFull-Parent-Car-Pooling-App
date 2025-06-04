import axios from 'axios';

interface DirectionsResult {
  distance: number; // in kilometers
  duration: number; // in minutes
}

/**
 * Calculate driving distance using address strings
 */
async function calculateDrivingDistanceFromAddresses(
  startAddress: string,
  endAddress: string
): Promise<DirectionsResult | null> {
  try {
    const googleApiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!googleApiKey) {
      console.error('Google Maps API key not found in server environment');
      return null;
    }

    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(startAddress)}&destination=${encodeURIComponent(endAddress)}&key=${googleApiKey}`;
    
    const response = await axios.get(url);
    
    if (response.data?.routes?.[0]?.legs?.[0]) {
      const leg = response.data.routes[0].legs[0];
      const distanceInKm = leg.distance.value / 1000; // Convert meters to kilometers
      const durationInMinutes = leg.duration.value / 60; // Convert seconds to minutes
      
      console.log(`Calculated server driving distance: ${distanceInKm.toFixed(1)} km, ${Math.round(durationInMinutes)} minutes`);
      
      return {
        distance: distanceInKm,
        duration: durationInMinutes
      };
    }
    
    console.error('No route found from Google Directions API for addresses');
    return null;
  } catch (error) {
    console.error('Google Directions API address routing error:', error);
    return null;
  }
}

/**
 * Calculate driving distance and duration using Google Maps Directions API
 * Server-side implementation to avoid CORS issues
 */
export async function calculateDrivingDistance(
  start: [number, number] | string,
  end: [number, number] | string
): Promise<DirectionsResult | null> {
  // Handle string addresses by using them directly in the API call
  if (typeof start === 'string' && typeof end === 'string') {
    return calculateDrivingDistanceFromAddresses(start, end);
  }
  
  // Handle coordinate arrays
  const startCoords = start as [number, number];
  const endCoords = end as [number, number];
  
  // Skip calculation if coordinates are invalid (0,0)
  if ((startCoords[0] === 0 && startCoords[1] === 0) || 
      (endCoords[0] === 0 && endCoords[1] === 0)) {
    return null;
  }

  try {
    const googleApiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
    console.log('Server-side Google API key available:', !!googleApiKey);
    if (!googleApiKey) {
      console.error('Google Maps API key not found in server environment');
      console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('GOOGLE')));
      return null;
    }

    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${startCoords[0]},${startCoords[1]}&destination=${endCoords[0]},${endCoords[1]}&key=${googleApiKey}`;
    
    const response = await axios.get(url);
    
    if (response.data?.routes?.[0]?.legs?.[0]) {
      const leg = response.data.routes[0].legs[0];
      const distanceInKm = leg.distance.value / 1000; // Convert meters to kilometers
      const durationInMinutes = leg.duration.value / 60; // Convert seconds to minutes
      
      return {
        distance: distanceInKm,
        duration: durationInMinutes
      };
    }
    
    console.error('No route found from Google Directions API');
    return null;
  } catch (error) {
    console.error('Google Directions API routing error:', error);
    return null;
  }
}