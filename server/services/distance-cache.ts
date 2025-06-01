import { storage } from '../storage.js';

interface GeocodeResult {
  lat: number;
  lng: number;
}

/**
 * Calculate and cache the distance for a carpool request
 */
export async function calculateAndCacheDistance(
  requestId: number,
  eventAddress: string,
  eventCity: string,
  eventPostcode: string,
  childAddress: string,
  childCity: string,
  childPostcode: string,
  needsBoth: boolean,
  needsPickup: boolean,
  needsDropoff: boolean
): Promise<number> {
  try {
    // Check if already cached
    const cached = await storage.getCachedDistance(requestId);
    if (cached !== null) {
      return cached;
    }

    const googleApiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!googleApiKey) {
      console.error('Google Maps API key not found');
      // Use fallback estimate
      const estimatedMiles = 5;
      const totalMiles = needsBoth ? estimatedMiles * 2 : estimatedMiles;
      await storage.setCachedDistance(requestId, totalMiles);
      return totalMiles;
    }

    // Geocode event address
    const eventFullAddress = `${eventAddress}, ${eventCity} ${eventPostcode}`;
    const eventCoords = await geocodeAddress(eventFullAddress, googleApiKey);
    
    // Geocode child address
    const childFullAddress = `${childAddress}, ${childCity} ${childPostcode}`;
    const childCoords = await geocodeAddress(childFullAddress, googleApiKey);

    if (!eventCoords || !childCoords) {
      console.error('Failed to geocode addresses');
      // Use fallback estimate
      const estimatedMiles = 5;
      const totalMiles = needsBoth ? estimatedMiles * 2 : estimatedMiles;
      await storage.setCachedDistance(requestId, totalMiles);
      return totalMiles;
    }

    // Calculate driving distance
    const distanceInMiles = await calculateDrivingDistanceInMiles(
      [childCoords.lat, childCoords.lng],
      [eventCoords.lat, eventCoords.lng],
      googleApiKey
    );

    if (distanceInMiles === null) {
      console.error('Failed to calculate driving distance');
      // Use fallback estimate
      const estimatedMiles = 5;
      const totalMiles = needsBoth ? estimatedMiles * 2 : estimatedMiles;
      await storage.setCachedDistance(requestId, totalMiles);
      return totalMiles;
    }

    // Calculate total miles based on ride type
    let totalMiles = 0;
    if (needsBoth) {
      // Round trip - count both directions
      totalMiles = distanceInMiles * 2;
    } else if (needsPickup || needsDropoff) {
      // One-way trip
      totalMiles = distanceInMiles;
    }

    // Cache the result
    await storage.setCachedDistance(requestId, totalMiles);
    
    console.log(`Calculated and cached distance for request ${requestId}: ${totalMiles} miles`);
    return totalMiles;

  } catch (error) {
    console.error('Error calculating distance:', error);
    // Use fallback estimate
    const estimatedMiles = 5;
    const totalMiles = needsBoth ? estimatedMiles * 2 : estimatedMiles;
    await storage.setCachedDistance(requestId, totalMiles);
    return totalMiles;
  }
}

async function geocodeAddress(address: string, apiKey: string): Promise<GeocodeResult | null> {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    );
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

async function calculateDrivingDistanceInMiles(
  startCoords: [number, number],
  endCoords: [number, number],
  apiKey: string
): Promise<number | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${startCoords[0]},${startCoords[1]}&destination=${endCoords[0]},${endCoords[1]}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data?.routes?.[0]?.legs?.[0]) {
      const distanceInMeters = data.routes[0].legs[0].distance.value;
      const distanceInMiles = (distanceInMeters / 1000) * 0.621371; // Convert km to miles
      return distanceInMiles;
    }
    return null;
  } catch (error) {
    console.error('Distance calculation error:', error);
    return null;
  }
}