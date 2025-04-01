import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Need to fix the marker icon issue in react-leaflet
// See: https://github.com/Leaflet/Leaflet/issues/4968
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface LocationPoint {
  label: string;
  position: [number, number]; // [lat, lng]
  type: 'party' | 'pickup' | 'dropoff';
}

interface LocationMapProps {
  locations: LocationPoint[];
  height?: string;
  width?: string;
  className?: string;
  initialZoom?: number;
  initialCenter?: [number, number]; // [lat, lng]
}

// Function to convert UK postcodes to coordinates using a free geocoding service
// In a production app, you would want to use a more reliable geocoding service
const postcodeToCoordinates = async (postcode: string): Promise<[number, number] | null> => {
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
    
    console.log(`Geocoded ${postcode} to [${lat}, ${lng}]`);
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

// Component for displaying a map with location markers
function LocationMap({
  locations,
  height = '400px',
  width = '100%',
  className = '',
  initialZoom = 12,
  initialCenter,
}: LocationMapProps) {
  // Generate a unique map instance ID
  const [mapInstanceId] = useState(() => `map-${Math.random().toString(36).substring(2, 9)}`);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);

  // Initialize the map
  useEffect(() => {
    // Safety check - don't proceed if DOM element isn't available
    if (!mapRef.current) return;
    
    // Clean up any existing map to prevent the container reuse error
    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }

    // Create a new map instance with a slight delay to ensure clean DOM
    const initMap = setTimeout(() => {
      if (!mapRef.current) return;
      
      try {
        // Create a new map instance
        const map = L.map(mapRef.current);
        leafletMapRef.current = map;
        
        // Add the OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        
        // If there are no locations, center on a default location (London)
        if (locations.length === 0 && initialCenter) {
          map.setView(initialCenter, initialZoom);
        } else if (locations.length === 0) {
          map.setView([51.505, -0.09], initialZoom); // Default to London if no locations
        } else {
          // Add markers for all locations
          const markers: L.Marker[] = [];
          const bounds = L.latLngBounds([]);
          
          locations.forEach((location) => {
            const marker = L.marker(location.position)
              .addTo(map)
              .bindPopup(location.label);
            
            // Customize marker appearance based on type
            if (location.type === 'party') {
              marker.setIcon(L.divIcon({
                className: 'party-location-marker',
                html: `<div class="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold">P</div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16],
              }));
            } else if (location.type === 'pickup') {
              marker.setIcon(L.divIcon({
                className: 'pickup-location-marker',
                html: `<div class="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">P</div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16],
              }));
            } else if (location.type === 'dropoff') {
              marker.setIcon(L.divIcon({
                className: 'dropoff-location-marker',
                html: `<div class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">D</div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16],
              }));
            }
            
            markers.push(marker);
            bounds.extend(location.position);
          });
          
          // Fit the map to show all markers with padding
          if (locations.length > 0) {
            map.fitBounds(bounds, { padding: [30, 30] });
          }
        }
      } catch (error) {
        console.error("Error initializing map:", error);
      }
    }, 10);

    // Clean up when the component unmounts or when dependencies change
    return () => {
      clearTimeout(initMap);
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [locations, height, width, initialZoom, initialCenter, mapInstanceId]);

  return (
    <div
      id={mapInstanceId}
      ref={mapRef}
      style={{ height, width }}
      className={`rounded-md overflow-hidden border border-gray-200 ${className}`}
      key={mapInstanceId}
    />
  );
}

export default LocationMap;
