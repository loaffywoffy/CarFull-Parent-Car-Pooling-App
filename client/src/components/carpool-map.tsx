import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';

// Import marker icons for Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

interface CarpoolMapProps {
  carpools: any[];
  onCarpoolSelect: (id: number) => void;
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

export default function CarpoolMap({ carpools, onCarpoolSelect }: CarpoolMapProps) {
  const mapRef = useRef<L.Map>(null);
  const validCarpools = carpools.filter(c => c.latitude && c.longitude) as CarpoolWithLocation[];
  const hasValidLocations = validCarpools.length > 0;

  useEffect(() => {
    if (mapRef.current && hasValidLocations) {
      // Create an array of LatLng points
      const latLngPoints = validCarpools.map(c => 
        L.latLng(c.latitude, c.longitude)
      );
      
      // Create a bounds object from these points
      const bounds = L.latLngBounds(latLngPoints);
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [carpools, hasValidLocations, validCarpools]);

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
    <MapContainer
      ref={mapRef}
      center={[51.505, -0.09]} // Default to London
      zoom={11}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {validCarpools.map((carpool) => (
          <Marker
            key={carpool.id}
            position={L.latLng(carpool.latitude, carpool.longitude)}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold">{carpool.parentName}</h3>
                <p className="text-sm text-gray-600">{carpool.spacesAvailable} spaces available</p>
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
  );
}