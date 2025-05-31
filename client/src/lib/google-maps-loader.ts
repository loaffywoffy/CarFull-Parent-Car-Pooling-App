import { Loader } from '@googlemaps/js-api-loader';

let googleMapsPromise: Promise<typeof google> | null = null;
let isLoaded = false;

export async function loadGoogleMaps(): Promise<typeof google> {
  // If already loaded, return the global google object
  if (isLoaded && window.google?.maps) {
    return window.google;
  }

  // If loading is in progress, return the existing promise
  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  // Start loading Google Maps
  googleMapsPromise = new Promise(async (resolve, reject) => {
    try {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        throw new Error('Google Maps API key not found');
      }

      const loader = new Loader({
        apiKey,
        version: 'weekly',
        libraries: ['maps'],
      });

      await loader.load();
      isLoaded = true;
      resolve(window.google);
    } catch (error) {
      googleMapsPromise = null; // Reset on error so we can try again
      reject(error);
    }
  });

  return googleMapsPromise;
}

export function isGoogleMapsLoaded(): boolean {
  return isLoaded && !!window.google?.maps;
}