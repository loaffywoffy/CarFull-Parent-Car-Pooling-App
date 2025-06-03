import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, MapPin, Navigation, Clock, Users, Route, ArrowRight, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [driverAddress, setDriverAddress] = useState("");
  const [activeTab, setActiveTab] = useState<"outbound" | "return">("outbound");
  const [showRoute, setShowRoute] = useState(false);

  // Get carpool data to determine available directions
  const { data: carpool } = useQuery({
    queryKey: ['/api/carpools', carpoolId],
    queryFn: async () => {
      const response = await fetch(`/api/carpools/${carpoolId}`);
      if (!response.ok) throw new Error('Failed to fetch carpool');
      return response.json();
    }
  });

  const { data: optimizedRoute, isLoading, error, refetch } = useQuery<OptimizedRoute>({
    queryKey: ['/api/carpools', carpoolId, 'optimize-route', driverAddress, activeTab],
    enabled: false, // Only fetch when user clicks "Get Route"
    queryFn: async () => {
      if (!driverAddress.trim()) {
        throw new Error("Driver address is required");
      }

      const eventFullAddress = `${eventAddress}, ${eventCity} ${eventPostcode}`;

      // Determine start and destination based on trip direction
      let startLocation, destinationLocation;
      
      if (activeTab === "outbound") {
        // For outbound trips: start from driver's home, end at event
        startLocation = { address: driverAddress };
        destinationLocation = { address: eventFullAddress };
      } else {
        // For return trips: start from event, end at driver's home
        startLocation = { address: eventFullAddress };
        destinationLocation = { address: driverAddress };
      }

      // Get optimized route
      const response = await fetch(`/api/carpools/${carpoolId}/optimize-route`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startLocation,
          destinationLocation,
          direction: activeTab
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
    if (driverAddress.trim()) {
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
          Enhanced Driver Route Summary
        </CardTitle>
        <CardDescription>
          Advanced route optimization with automatic start points and comprehensive trip statistics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="driverAddress">Driver's Home Address</Label>
          <div className="flex gap-2">
            <Input
              id="driverAddress"
              placeholder="Enter your home address..."
              value={driverAddress}
              onChange={(e) => setDriverAddress(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleGetRoute();
                }
              }}
            />
            <Button 
              onClick={handleGetRoute}
              disabled={!driverAddress.trim() || isLoading}
            >
              {isLoading ? "Getting Route..." : "Get Route"}
            </Button>
          </div>
        </div>

        {/* Direction Toggle - only show if carpool offers both directions */}
        {carpool && carpool.canPickup && carpool.canDropoff && (
          <div className="space-y-2">
            <Label>Trip Direction</Label>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "outbound" | "return")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="outbound" className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  To Event
                </TabsTrigger>
                <TabsTrigger value="return" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  From Event
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}

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
            {/* Enhanced Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4 text-blue-600" />
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Total Distance</span>
                  <Badge variant="outline" className="text-sm font-medium">{optimizedRoute.totalDistance}</Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-600" />
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Estimated Time</span>
                  <Badge variant="outline" className="text-sm font-medium">{optimizedRoute.totalDuration}</Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" />
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">
                    {activeTab === "outbound" ? "Pickups" : "Dropoffs"}
                  </span>
                  <Badge variant="outline" className="text-sm font-medium">
                    {optimizedRoute.waypoints.filter(w => w.type === 'pickup' || w.type === 'dropoff').length}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-orange-600" />
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Total Stops</span>
                  <Badge variant="outline" className="text-sm font-medium">
                    {optimizedRoute.waypoints.length}
                  </Badge>
                </div>
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