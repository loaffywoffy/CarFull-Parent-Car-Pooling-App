import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in React Leaflet
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const defaultIcon = new Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface LeafletMapProps {
  className?: string;
  eventLocation?: {
    lat: number;
    lng: number;
    name: string;
  };
  userLocation?: {
    lat: number;
    lng: number;
  };
  carpoolLocations?: Array<{
    id: number;
    lat: number;
    lng: number;
    parentName: string;
    address: string;
    canPickup: boolean;
    canDropoff: boolean;
    spacesAvailable: number;
  }>;
}

export default function LeafletMap({ 
  className = "w-full h-96", 
  eventLocation, 
  userLocation, 
  carpoolLocations = []
}: LeafletMapProps) {
  // Default center to London if no event location
  const center = eventLocation 
    ? [eventLocation.lat, eventLocation.lng] as [number, number]
    : [51.5074, -0.1276] as [number, number];

  return (
    <div className={`${className} rounded-lg overflow-hidden border border-gray-200`}>
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Event Location Marker */}
        {eventLocation && (
          <Marker 
            position={[eventLocation.lat, eventLocation.lng]} 
            icon={defaultIcon}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold text-sm">{eventLocation.name}</h3>
                <p className="text-xs text-gray-600">Event Location</p>
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* User Location Marker */}
        {userLocation && (
          <Marker 
            position={[userLocation.lat, userLocation.lng]} 
            icon={new Icon({
              iconUrl: markerIcon,
              iconRetinaUrl: markerIcon2x,
              shadowUrl: markerShadow,
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowSize: [41, 41]
            })}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold text-sm">Your Location</h3>
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* Carpool Location Markers */}
        {carpoolLocations.map((carpool) => (
          <Marker 
            key={carpool.id}
            position={[carpool.lat, carpool.lng]} 
            icon={defaultIcon}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold text-sm">{carpool.parentName}</h3>
                <p className="text-xs text-gray-600">{carpool.address}</p>
                <p className="text-xs text-green-600">{carpool.spacesAvailable} spaces available</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}