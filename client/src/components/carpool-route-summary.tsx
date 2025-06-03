import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, MapPin, Navigation, Clock, Users, Route } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Waypoint {
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  type: 'pickup' | 'dropoff' | 'origin' | 'destination';
  requestId?: number;
  parentName?: string;
  childName?: string;
}

interface RouteLeg {
  startAddress: string;
  endAddress: string;
  distance: string;
  duration: string;
  steps?: RouteStep[];
}

interface RouteStep {
  instruction: string;
  distance: string;
  duration: string;
}

interface OptimizedRoute {
  totalDistance: string;
  totalDuration: string;
  waypoints: Waypoint[];
  legs: RouteLeg[];
  polyline?: string;
}

interface CarpoolRouteSummaryProps {
  carpoolId: number;
  eventAddress: string;
  eventCity: string;
  eventPostcode: string;
}

export function CarpoolRouteSummary({ carpoolId, eventAddress, eventCity, eventPostcode }: CarpoolRouteSummaryProps) {
  const [startAddress, setStartAddress] = useState("");
  const [showRoute, setShowRoute] = useState(false);

  const { data: optimizedRoute, isLoading, error, refetch } = useQuery<OptimizedRoute>({
    queryKey: ['/api/carpools', carpoolId, 'optimize-route', startAddress],
    enabled: false, // Only fetch when user clicks "Get Route"
    queryFn: async () => {
      if (!startAddress.trim()) {
        throw new Error("Start address is required");
      }

      // Geocode start address
      const geocodeResponse = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(startAddress)}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
      );
      const geocodeData = await geocodeResponse.json();
      
      if (!geocodeData.results || geocodeData.results.length === 0) {
        throw new Error("Could not find start location");
      }

      const startLocation = {
        lat: geocodeData.results[0].geometry.location.lat,
        lng: geocodeData.results[0].geometry.location.lng,
        address: startAddress
      };

      // Geocode event address
      const eventFullAddress = `${eventAddress}, ${eventCity} ${eventPostcode}`;
      const eventGeocodeResponse = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(eventFullAddress)}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
      );
      const eventGeocodeData = await eventGeocodeResponse.json();
      
      if (!eventGeocodeData.results || eventGeocodeData.results.length === 0) {
        throw new Error("Could not find event location");
      }

      const eventLocation = {
        lat: eventGeocodeData.results[0].geometry.location.lat,
        lng: eventGeocodeData.results[0].geometry.location.lng,
        address: eventFullAddress
      };

      // Get optimized route
      const response = await fetch(`/api/carpools/${carpoolId}/optimize-route`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startLocation,
          eventLocation
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to optimize route');
      }

      return response.json();
    },
  });

  const handleGetRoute = () => {
    if (startAddress.trim()) {
      setShowRoute(true);
      refetch();
    }
  };

  const getWaypointIcon = (type: string) => {
    switch (type) {
      case 'origin':
        return <Navigation className="h-4 w-4 text-blue-600" />;
      case 'pickup':
        return <Users className="h-4 w-4 text-green-600" />;
      case 'destination':
        return <MapPin className="h-4 w-4 text-red-600" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  const getWaypointColor = (type: string) => {
    switch (type) {
      case 'origin':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pickup':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'destination':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Route className="h-5 w-5" />
          Driver Route Summary
        </CardTitle>
        <CardDescription>
          Get an optimized route with pickup order for your carpool passengers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="startAddress">Your Starting Address</Label>
          <div className="flex gap-2">
            <Input
              id="startAddress"
              placeholder="Enter your starting address..."
              value={startAddress}
              onChange={(e) => setStartAddress(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleGetRoute();
                }
              }}
            />
            <Button 
              onClick={handleGetRoute}
              disabled={!startAddress.trim() || isLoading}
            >
              {isLoading ? "Getting Route..." : "Get Route"}
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error instanceof Error ? error.message : "Failed to get route"}
            </AlertDescription>
          </Alert>
        )}

        {showRoute && optimizedRoute && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Total Distance:</span>
                <Badge variant="outline">{optimizedRoute.totalDistance}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Total Time:</span>
                <Badge variant="outline">{optimizedRoute.totalDuration}</Badge>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-medium mb-3">Optimized Route</h4>
              <div className="space-y-3">
                {optimizedRoute.waypoints.map((waypoint, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 border text-sm font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        {getWaypointIcon(waypoint.type)}
                        <Badge variant="outline" className={getWaypointColor(waypoint.type)}>
                          {waypoint.type === 'origin' ? 'Start' : 
                           waypoint.type === 'pickup' ? 'Pickup' : 
                           waypoint.type === 'destination' ? 'Event' : waypoint.type}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium">{waypoint.address}</p>
                      {waypoint.parentName && waypoint.childName && (
                        <p className="text-xs text-muted-foreground">
                          Pickup: {waypoint.childName} ({waypoint.parentName})
                        </p>
                      )}
                    </div>
                    {index < optimizedRoute.waypoints.length - 1 && optimizedRoute.legs[index] && (
                      <div className="text-xs text-muted-foreground text-right">
                        <div>{optimizedRoute.legs[index].distance}</div>
                        <div>{optimizedRoute.legs[index].duration}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {optimizedRoute.legs.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-3">Route Segments</h4>
                  <div className="space-y-2">
                    {optimizedRoute.legs.map((leg, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">
                            Step {index + 1}: {leg.startAddress} → {leg.endAddress}
                          </span>
                          <div className="flex gap-2 text-xs text-muted-foreground">
                            <span>{leg.distance}</span>
                            <span>{leg.duration}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}