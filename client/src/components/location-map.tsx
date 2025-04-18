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

// Component for displaying a map with location markers
function LocationMap({
  locations,
  height = '400px',
  width = '100%',
  className = '',
  initialZoom = 14, // Higher zoom level for better detail
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

    // Create a new map instance with a longer delay to ensure DOM is fully rendered
    const initMap = setTimeout(() => {
      if (!mapRef.current) return;
      
      try {
        // Create a new map instance with specific options to handle invalid bounds
        const map = L.map(mapRef.current, {
          // Prevent zooming too far
          minZoom: 2,
          // Handle invalid bounds more gracefully
          maxBoundsViscosity: 1.0,
          // Add some bounce back behavior when dragging outside bounds
          bounceAtZoomLimits: true,
          // Add error handling
          attributionControl: false
        });
        
        leafletMapRef.current = map;
        
        // Add the OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        
        // Default fallback location (London)
        const defaultLocation: [number, number] = [51.505, -0.09];
        
        // Safely set the view with a try-catch block
        try {
          // If there are no locations, center on a default location (London)
          if (locations.length === 0 && initialCenter) {
            map.setView(initialCenter, initialZoom);
          } else if (locations.length === 0) {
            map.setView(defaultLocation, initialZoom);
          } else {
            // Add markers for all locations
            const markers: L.Marker[] = [];
            const bounds = L.latLngBounds([]);
            
            locations.forEach((location) => {
              try {
                // Validate coordinates
                if (!location.position || 
                    !Array.isArray(location.position) || 
                    location.position.length !== 2 ||
                    isNaN(location.position[0]) || 
                    isNaN(location.position[1])) {
                  console.warn("Invalid coordinates for location:", location);
                  return;
                }
                
                const marker = L.marker(location.position)
                  .addTo(map)
                  .bindPopup(location.label);
                
                // Customize marker appearance based on type with improved visibility
                if (location.type === 'party') {
                  marker.setIcon(L.divIcon({
                    className: 'party-location-marker',
                    html: `<div class="w-10 h-10 rounded-full bg-primary-500 border-2 border-white shadow-lg flex items-center justify-center text-white font-bold">🎉</div>`,
                    iconSize: [40, 40],
                    iconAnchor: [20, 20],
                    popupAnchor: [0, -20],
                  }));
                } else if (location.type === 'pickup') {
                  marker.setIcon(L.divIcon({
                    className: 'pickup-location-marker',
                    html: `<div class="w-10 h-10 rounded-full bg-green-500 border-2 border-white shadow-lg flex items-center justify-center text-white font-bold">🚙</div>`,
                    iconSize: [40, 40],
                    iconAnchor: [20, 20],
                    popupAnchor: [0, -20],
                  }));
                } else if (location.type === 'dropoff') {
                  marker.setIcon(L.divIcon({
                    className: 'dropoff-location-marker',
                    html: `<div class="w-10 h-10 rounded-full bg-blue-500 border-2 border-white shadow-lg flex items-center justify-center text-white font-bold">🏠</div>`,
                    iconSize: [40, 40],
                    iconAnchor: [20, 20],
                    popupAnchor: [0, -20],
                  }));
                }
                
                markers.push(marker);
                bounds.extend(location.position);
              } catch (markerError) {
                console.error("Error adding marker:", markerError);
              }
            });
            
            // Fit the map to show all markers with padding, but only if we have valid bounds
            if (markers.length > 0) {
              try {
                // Use a timeout to ensure the fitBounds operation happens after the map is fully rendered
                setTimeout(() => {
                  // Check if map still exists and is not removed
                  if (map && mapRef.current && document.getElementById(mapInstanceId)) {
                    map.invalidateSize();
                    
                    // If there's only one marker, use setView with higher zoom instead of fitBounds
                    if (markers.length === 1) {
                      const marker = markers[0];
                      const position = marker.getLatLng();
                      map.setView([position.lat, position.lng], 15); // Higher zoom for single location
                    } else {
                      // For multiple markers, fit bounds with padding
                      map.fitBounds(bounds, { 
                        padding: [50, 50],  // More padding for better visibility
                        maxZoom: 15         // Limit maximum zoom when fitting bounds
                      });
                    }
                  }
                }, 50);
              } catch (boundsError) {
                console.error("Error fitting bounds:", boundsError);
                map.setView(defaultLocation, initialZoom);
              }
            } else {
              // Fallback to default location if no valid markers
              map.setView(defaultLocation, initialZoom);
            }
          }
        } catch (viewError) {
          console.error("Error setting map view:", viewError);
          // Fallback to a safe default
          try {
            map.setView(defaultLocation, initialZoom);
          } catch (e) {
            console.error("Critical map error:", e);
          }
        }
        
        // Force a map redraw after a short delay to fix rendering issues
        setTimeout(() => {
          // Check if map still exists and is not removed
          if (map && mapRef.current && document.getElementById(mapInstanceId)) {
            map.invalidateSize();
          }
        }, 100);
      } catch (error) {
        console.error("Error initializing map:", error);
      }
    }, 100); // Increased delay for better reliability

    // Clean up when the component unmounts or when dependencies change
    return () => {
      clearTimeout(initMap);
      if (leafletMapRef.current) {
        try {
          leafletMapRef.current.remove();
        } catch (e) {
          console.error("Error removing map:", e);
        }
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
