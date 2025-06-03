import { useState, useEffect } from "react";
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
  targetArrivalTime?: string;
}

// Helper function to parse duration string and return minutes
function parseDurationToMinutes(duration: string): number {
  const match = duration.match(/(\d+)\s*(?:hours?|hrs?|h)?\s*(\d+)?\s*(?:minutes?|mins?|m)?/i);
  if (match) {
    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    return hours * 60 + minutes;
  }
  
  // Try to parse just minutes
  const minutesMatch = duration.match(/(\d+)/);
  if (minutesMatch) {
    return parseInt(minutesMatch[1]);
  }
  
  return 0;
}

// Helper function to add minutes to a time string
function addMinutesToTime(timeStr: string, minutes: number): string {
  const [hours, mins] = timeStr.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMins = totalMinutes % 60;
  return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
}

// Helper function to subtract minutes from a time string
function subtractMinutesFromTime(timeStr: string, minutes: number): string {
  const [hours, mins] = timeStr.split(':').map(Number);
  const totalMinutes = hours * 60 + mins - minutes;
  const newHours = Math.floor(totalMinutes / 60);
  const newMins = totalMinutes % 60;
  
  // Handle negative times (previous day)
  if (newHours < 0) {
    return `${(24 + newHours).toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  }
  
  return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
}

export function CarpoolRouteSummary({ carpoolId, eventAddress, eventCity, eventPostcode, targetArrivalTime }: CarpoolRouteSummaryProps) {
  const [driverAddress, setDriverAddress] = useState("");
  const [activeTab, setActiveTab] = useState<"outbound" | "return">("outbound");
  const [showRoute, setShowRoute] = useState(true); // Auto-show route

  // Get carpool data to determine available directions
  const { data: carpool } = useQuery({
    queryKey: ['/api/carpools', carpoolId],
    queryFn: async () => {
      const response = await fetch(`/api/carpools/${carpoolId}`);
      if (!response.ok) throw new Error('Failed to fetch carpool');
      return response.json();
    }
  });

  // Set default tab based on carpool capabilities and auto-populate driver address
  useEffect(() => {
    if (carpool) {
      // Auto-populate driver address from carpool data
      const carpoolFullAddress = `${carpool.address}, ${carpool.city} ${carpool.postcode}`;
      console.log('Setting driver address:', carpoolFullAddress);
      setDriverAddress(carpoolFullAddress);
      
      if (!carpool.canPickup && carpool.canDropoff) {
        // If only dropoff, default to return trip
        setActiveTab("return");
      } else {
        // Default to outbound for pickup-only or both directions
        setActiveTab("outbound");
      }
    }
  }, [carpool]);

  const { data: optimizedRoute, isLoading, error, refetch } = useQuery<OptimizedRoute>({
    queryKey: ['/api/carpools', carpoolId, 'optimize-route', driverAddress, activeTab],
    enabled: !!driverAddress.trim() && showRoute, // Auto-fetch when driver address is available
    refetchInterval: 30000, // Refetch every 30 seconds to prevent rate limiting
    refetchOnWindowFocus: true, // Refetch when window gains focus
    queryFn: async () => {
      if (!driverAddress.trim()) {
        throw new Error("Driver address is required");
      }

      const eventFullAddress = `${eventAddress}, ${eventCity} ${eventPostcode}`;

      // Determine start and destination based on trip direction
      let startLocation, destinationLocation;
      
      if (activeTab === "outbound") {
        // For trips TO the event: start from driver's home, end at event
        startLocation = { address: driverAddress };
        destinationLocation = { address: eventFullAddress };
      } else {
        // For trips FROM the event (return): start from event, end at driver's home
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

  // Route is automatically calculated when driver address is available

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


        {/* Direction Toggle - show if carpool offers both directions OR set default for single direction */}
        {carpool && (
          <div className="space-y-2">
            {(carpool.canPickup && carpool.canDropoff) || carpool.canBoth ? (
              // Show toggle for carpools offering both directions
              <>
                <Label>Trip Direction</Label>
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "outbound" | "return")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="outbound" className="flex items-center gap-2">
                      <ArrowRight className="h-4 w-4" />
                      To Event (Outbound)
                    </TabsTrigger>
                    <TabsTrigger value="return" className="flex items-center gap-2">
                      <ArrowLeft className="h-4 w-4" />
                      From Event (Inbound)
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </>
            ) : (
              // Show info for single-direction carpools
              <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                <div className="flex items-center gap-2 text-sm text-blue-800">
                  {carpool.canPickup ? (
                    <>
                      <ArrowRight className="h-4 w-4" />
                      <span>Route planning for trips TO the event (pickup service)</span>
                    </>
                  ) : (
                    <>
                      <ArrowLeft className="h-4 w-4" />
                      <span>Route planning for trips FROM the event (dropoff service)</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {error && !isLoading && !optimizedRoute && (
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
              <h4 className="font-medium mb-3">Optimized Route with Timing</h4>
              {/* Show timing summary */}
              {(() => {
                if (activeTab === "outbound" && targetArrivalTime) {
                  // Calculate recommended departure time for outbound
                  const totalTravelMinutes = parseDurationToMinutes(optimizedRoute.totalDuration);
                  const recommendedDeparture = subtractMinutesFromTime(targetArrivalTime, totalTravelMinutes);
                  
                  return (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">Outbound Journey</span>
                      </div>
                      <div className="text-xs text-blue-700">
                        <div>Event starts: {targetArrivalTime}</div>
                        <div>Recommended departure: {recommendedDeparture}</div>
                        <div>Total travel time: {optimizedRoute.totalDuration}</div>
                      </div>
                    </div>
                  );
                } else if (activeTab === "return" && carpool?.returnCollectionTime) {
                  // Show departure time for return journey
                  return (
                    <div className="mb-4 p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">Return Journey</span>
                      </div>
                      <div className="text-xs text-green-700">
                        <div>Departure from event: {carpool.returnCollectionTime}</div>
                        <div>Total travel time: {optimizedRoute.totalDuration}</div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
              
              <div className="space-y-3">
                {optimizedRoute.waypoints.map((waypoint, index) => {
                  // Calculate timing for each waypoint based on actual leg durations
                  let waypointTime = "";
                  
                  if (activeTab === "outbound" && targetArrivalTime) {
                    // For outbound: work backwards from event time using actual leg durations
                    if (waypoint.type === 'destination') {
                      // Event destination - use target arrival time
                      waypointTime = targetArrivalTime;
                    } else if (waypoint.type === 'origin') {
                      // Starting point - calculate by subtracting total time from target arrival
                      const totalTravelMinutes = parseDurationToMinutes(optimizedRoute.totalDuration);
                      waypointTime = subtractMinutesFromTime(targetArrivalTime, totalTravelMinutes);
                    } else {
                      // Intermediate waypoints - calculate cumulative time from start
                      const totalTravelMinutes = parseDurationToMinutes(optimizedRoute.totalDuration);
                      const startTime = subtractMinutesFromTime(targetArrivalTime, totalTravelMinutes);
                      
                      let cumulativeMinutes = 0;
                      for (let i = 0; i < index; i++) {
                        if (optimizedRoute.legs[i]) {
                          cumulativeMinutes += parseDurationToMinutes(optimizedRoute.legs[i].duration);
                        }
                      }
                      waypointTime = addMinutesToTime(startTime, cumulativeMinutes);
                    }
                  } else if (activeTab === "return" && carpool?.returnCollectionTime) {
                    // For return: work forwards from departure time using actual leg durations
                    if (waypoint.type === 'origin') {
                      // Starting point (event) - use departure time
                      waypointTime = carpool.returnCollectionTime;
                    } else {
                      // All other waypoints - calculate cumulative time from start
                      let cumulativeMinutes = 0;
                      for (let i = 0; i < index; i++) {
                        if (optimizedRoute.legs[i]) {
                          cumulativeMinutes += parseDurationToMinutes(optimizedRoute.legs[i].duration);
                        }
                      }
                      waypointTime = addMinutesToTime(carpool.returnCollectionTime, cumulativeMinutes);
                    }
                  }
                  
                  return (
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
                          {waypoint.childName && (
                            <span className="text-xs text-muted-foreground">
                              {waypoint.childName}
                            </span>
                          )}
                          {waypointTime && (
                            <Badge variant="secondary" className="text-xs">
                              {activeTab === "outbound" 
                                ? (waypoint.type === 'destination' ? `Arrive ${waypointTime}` : `${waypointTime}`) 
                                : (waypoint.type === 'origin' ? `Depart ${waypointTime}` : `Arrive ${waypointTime}`)
                              }
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium">{waypoint.address}</p>
                      </div>
                      {index < optimizedRoute.waypoints.length - 1 && optimizedRoute.legs[index] && (
                        <div className="text-xs text-muted-foreground text-right">
                          <div>{optimizedRoute.legs[index].distance}</div>
                          <div>{optimizedRoute.legs[index].duration}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>


          </div>
        )}
      </CardContent>
    </Card>
  );
}