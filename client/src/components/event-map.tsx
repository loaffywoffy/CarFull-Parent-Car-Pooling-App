import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";

interface EventMapProps {
  address: string;
  city: string;
  postcode: string;
  eventName: string;
}

export default function EventMap({ address, city, postcode, eventName }: EventMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapError, setMapError] = useState(false);

  const fullAddress = `${address}, ${city} ${postcode}`;

  useEffect(() => {
    if (!mapRef.current) return;

    // Check if Mapbox token is available
    const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    
    if (!mapboxToken) {
      setMapError(true);
      return;
    }

    let map: any = null;

    // Initialize Mapbox map
    const initializeMap = async () => {
      try {
        // Clear any existing content
        if (mapRef.current) {
          mapRef.current.innerHTML = '';
        }

        const mapboxgl = await import('mapbox-gl');
        mapboxgl.default.accessToken = mapboxToken;

        // Geocode the address
        const geocodeResponse = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullAddress)}.json?access_token=${mapboxToken}&country=GB&limit=1`
        );
        
        if (!geocodeResponse.ok) {
          throw new Error(`Geocoding failed with status: ${geocodeResponse.status}`);
        }

        const geocodeData = await geocodeResponse.json();
        
        if (!geocodeData.features || geocodeData.features.length === 0) {
          throw new Error('Address not found');
        }

        const [lng, lat] = geocodeData.features[0].center;

        if (!mapRef.current) return;

        map = new mapboxgl.default.Map({
          container: mapRef.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [lng, lat],
          zoom: 15,
        });

        // Add marker for event location
        new mapboxgl.default.Marker({
          color: '#3B82F6'
        })
          .setLngLat([lng, lat])
          .setPopup(
            new mapboxgl.default.Popup({ offset: 25 })
              .setHTML(`
                <div class="p-2">
                  <h3 class="font-semibold text-sm">${eventName}</h3>
                  <p class="text-xs text-gray-600">${fullAddress}</p>
                </div>
              `)
          )
          .addTo(map);

      } catch (error) {
        console.error('Map initialization error:', error);
        setMapError(true);
      }
    };

    initializeMap().catch((error) => {
      console.error('Failed to initialize map:', error);
      setMapError(true);
    });

    // Cleanup function
    return () => {
      if (map) {
        try {
          map.remove();
        } catch (error) {
          console.error('Error removing map:', error);
        }
      }
    };
  }, [fullAddress, eventName]);

  if (mapError) {
    return (
      <div className="bg-gray-50 p-6 rounded-lg text-center">
        <MapPin className="h-8 w-8 mx-auto text-gray-400 mb-2" />
        <p className="text-gray-600 font-medium">{fullAddress}</p>
        <p className="text-sm text-gray-500 mt-2">
          Interactive map temporarily unavailable
        </p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <MapPin className="h-5 w-5 mr-2" />
          Event Location
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          ref={mapRef}
          className="w-full h-64 rounded-lg border"
          style={{ minHeight: '256px' }}
        />
        <p className="text-sm text-gray-600 mt-2 text-center">
          {fullAddress}
        </p>
      </CardContent>
    </Card>
  );
}