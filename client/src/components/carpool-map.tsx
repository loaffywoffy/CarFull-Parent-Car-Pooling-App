import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Button } from '@/components/ui/button';
import { MapPin, Car, ArrowRight, ArrowLeft, Info } from 'lucide-react';

// Import marker icons for Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

interface CarpoolMapProps {
  carpools: any[];
  onCarpoolSelect: (id: number) => void;
  eventLocation?: { latitude: number; longitude: number; name: string };
}

// Define type for a carpool with coordinates
interface CarpoolWithLocation {
  id: number;
  parentName: string;
  spacesAvailable: number;
  latitude: number;
  longitude: number;
  [key: string]: any;
}

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Create custom markers for different types of carpools
const createMarkerIcon = (color: string) => {
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

const blueIcon = createMarkerIcon('blue');     // Default/Event location
const redIcon = createMarkerIcon('red');       // To event only
const greenIcon = createMarkerIcon('green');   // From event only
const goldIcon = createMarkerIcon('gold');     // Both directions

export default function CarpoolMap({ carpools, onCarpoolSelect, eventLocation }: CarpoolMapProps) {
  const mapRef = useRef<L.Map>(null);
  const validCarpools = carpools.filter(c => c.latitude && c.longitude) as CarpoolWithLocation[];
  const hasValidLocations = validCarpools.length > 0 || (eventLocation && eventLocation.latitude && eventLocation.longitude);

  // Get marker icon based on carpool direction
  const getMarkerIcon = (carpool: CarpoolWithLocation) => {
    if (carpool.canPickup && carpool.canDropoff) return goldIcon;
    if (carpool.canPickup) return redIcon;
    if (carpool.canDropoff) return greenIcon;
    return blueIcon;
  };

  useEffect(() => {
    if (mapRef.current && hasValidLocations) {
      // Create an array of LatLng points
      const latLngPoints = validCarpools.map(c => 
        L.latLng(c.latitude, c.longitude)
      );
      
      // Add event location if available
      if (eventLocation && eventLocation.latitude && eventLocation.longitude) {
        latLngPoints.push(L.latLng(eventLocation.latitude, eventLocation.longitude));
      }
      
      // Create a bounds object from these points
      const bounds = L.latLngBounds(latLngPoints);
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      
      // Zoom out a bit more for better overview
      setTimeout(() => {
        if (mapRef.current) {
          const zoom = mapRef.current.getZoom();
          mapRef.current.setZoom(zoom - 1);
        }
      }, 100);
    }
  }, [carpools, hasValidLocations, validCarpools, eventLocation]);

  if (!hasValidLocations) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-100 rounded-lg p-8">
        <div className="text-center">
          <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="font-medium text-lg mb-2">No location data available</h3>
          <p className="text-gray-500">
            The carpools in this view don't have valid location coordinates.
            <br />
            Try switching to list view instead.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <MapContainer
        ref={mapRef}
        center={[51.505, -0.09]} // Default to London
        zoom={10}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <ZoomControl position="topright" />
        
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {/* Event location marker */}
        {eventLocation && eventLocation.latitude && eventLocation.longitude && (
          <Marker
            key="event-location"
            position={L.latLng(eventLocation.latitude, eventLocation.longitude)}
            icon={blueIcon}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold">Event Location</h3>
                <p className="text-sm text-gray-600">{eventLocation.name}</p>
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* Carpool markers */}
        {validCarpools.map((carpool) => (
          <Marker
            key={carpool.id}
            position={L.latLng(carpool.latitude, carpool.longitude)}
            icon={getMarkerIcon(carpool)}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold">{carpool.parentName}</h3>
                <p className="text-sm text-gray-600">{carpool.spacesAvailable} spaces available</p>
                {carpool.canPickup && <p className="text-xs text-green-600">Offers transport TO event</p>}
                {carpool.canDropoff && <p className="text-xs text-red-600">Offers transport FROM event</p>}
                <Button
                  size="sm"
                  className="mt-2"
                  onClick={() => onCarpoolSelect(carpool.id)}
                >
                  Request Spot
                </Button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      {/* Map Legend */}
      <div className="absolute bottom-4 right-4 bg-white bg-opacity-90 p-3 rounded-md shadow-md z-[1000] text-sm">
        <h4 className="font-semibold mb-2 flex items-center">
          <Info size={16} className="mr-1" /> Map Legend
        </h4>
        <div className="space-y-2">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
            <span>Event Location</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
            <span>Transport TO Event</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
            <span>Transport FROM Event</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
            <span>Transport BOTH Ways</span>
          </div>
        </div>
      </div>
    </div>
  );
}