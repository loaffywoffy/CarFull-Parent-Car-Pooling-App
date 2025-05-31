import axios from 'axios';

interface DirectionsResult {
  distance: number; // in kilometers
  duration: number; // in minutes
}

/**
 * Calculate driving distance and duration using Google Maps Directions API
 * Server-side implementation to avoid CORS issues
 */
export async function calculateDrivingDistance(
  startCoords: [number, number],
  endCoords: [number, number]
): Promise<DirectionsResult | null> {
  // Skip calculation if coordinates are invalid (0,0)
  if ((startCoords[0] === 0 && startCoords[1] === 0) || 
      (endCoords[0] === 0 && endCoords[1] === 0)) {
    return null;
  }

  try {
    const googleApiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!googleApiKey) {
      console.error('Google Maps API key not found');
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