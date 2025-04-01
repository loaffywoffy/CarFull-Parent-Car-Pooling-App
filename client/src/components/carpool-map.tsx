import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Button } from '@/components/ui/button';

// Import marker icons for Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

interface CarpoolMapProps {
  carpools: any[];
  onCarpoolSelect: (id: number) => void;
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

  useEffect(() => {
    if (mapRef.current && carpools.length > 0) {
      const bounds = L.latLngBounds(
        carpools
          .filter(c => c.latitude && c.longitude)
          .map(c => [c.latitude, c.longitude])
      );
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [carpools]);

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
      {carpools.map((carpool) => (
        <Marker
          key={carpool.id}
          position={[carpool.latitude, carpool.longitude]}
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