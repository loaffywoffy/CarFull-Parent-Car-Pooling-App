import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { 
  Car, ArrowRight, ArrowLeft, MapPin, User, Calendar, Clock, 
  Users, HomeIcon, Building, Share2, Phone,
  Download, ChevronRight, Baby
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
// Map functionality removed
import { geocodeAddress } from "@/lib/geocoding";
import { type PartyGroup, type Carpool, type CarpoolRequest } from "@shared/schema";
import { getCarpoolRequests } from "@/api/carpools";
import { getCarpoolsByPartyGroupId, getPartyGroupById } from "@/api/partyGroups";
import { toast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface CarpoolSummaryProps {
  partyGroupId: number;
  onRequestSpot?: (carpoolId: number) => void;
}

export default function CarpoolSummary({ partyGroupId, onRequestSpot }: CarpoolSummaryProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'detailed' | 'request'>('summary');
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"distance" | "spaces" | "name">("spaces");
  const [carpoolFilterTab, setCarpoolFilterTab] = useState("all");

  const [partyLocation, setPartyLocation] = useState<[number, number] | null>(null);
  const [carpoolLocations, setCarpoolLocations] = useState<Array<{
    id: number, 
    label: string, 
    position: [number, number],
    type: 'pickup' | 'dropoff' | 'both'
  }>>([]);
  const [isMapLoading, setIsMapLoading] = useState(true);

  // Fetch carpool data
  const { data: carpools, isLoading: carpoolsLoading } = useQuery({
    queryKey: ['/api/party-groups', partyGroupId, 'carpools'],
    queryFn: () => getCarpoolsByPartyGroupId(partyGroupId),
  });

  // Fetch party group data
  const { data: partyGroup } = useQuery<PartyGroup>({
    queryKey: ['/api/party-groups', partyGroupId],
    queryFn: () => getPartyGroupById(partyGroupId),
    enabled: !!partyGroupId,
  });

  // Fetch carpool requests for each carpool
  const carpoolsArray = Array.isArray(carpools) ? carpools : [];

  // Create a map to store requests by carpool ID
  const [carpoolRequestsMap, setCarpoolRequestsMap] = useState<Record<number, CarpoolRequest[]>>({});

  // Fetch requests for each carpool
  useEffect(() => {
    async function fetchRequests() {
      const requests: Record<number, CarpoolRequest[]> = {};

      for (const carpool of carpoolsArray) {
        try {
          const carpoolRequests = await getCarpoolRequests(carpool.id);
          requests[carpool.id] = carpoolRequests;
        } catch (error) {
          console.error(`Failed to fetch requests for carpool ${carpool.id}:`, error);
          requests[carpool.id] = [];
        }
      }

      setCarpoolRequestsMap(requests);
    }

    if (carpoolsArray.length > 0) {
      fetchRequests();
    }
  }, [carpoolsArray]);

  // Load party location and carpool locations when carpools are loaded
  useEffect(() => {
    async function loadMapLocations() {
      if (!partyGroup) return;

      setIsMapLoading(true);

      try {
        // Load party location
        if (partyGroup.partyAddress && partyGroup.partyPostcode) {
          const coordinates = await geocodeAddress(
            partyGroup.partyAddress,
            partyGroup.partyCity,
            partyGroup.partyPostcode
          );
          setPartyLocation(coordinates);
        }

        // Load carpool locations
        const locations = [];

        for (const carpool of carpoolsArray) {
          try {
            if (carpool.address && carpool.postcode) {
              const coordinates = await geocodeAddress(
                carpool.address,
                carpool.city || '',
                carpool.postcode
              );

              let type: 'pickup' | 'dropoff' | 'both' = 'both';
              if (carpool.canPickup && !carpool.canDropoff) type = 'pickup';
              if (!carpool.canPickup && carpool.canDropoff) type = 'dropoff';

              locations.push({
                id: carpool.id,
                label: `${carpool.parentName} (${carpool.childName})`,
                position: coordinates,
                type
              });
            }
          } catch (error) {
            console.error(`Failed to geocode carpool location for ${carpool.id}:`, error);
          }
        }

        setCarpoolLocations(locations);
      } catch (error) {
        console.error('Error loading map locations:', error);
      } finally {
        setIsMapLoading(false);
      }
    }

    if (carpoolsArray.length > 0 && partyGroup) {
      loadMapLocations();
    }
  }, [carpoolsArray, partyGroup]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${partyGroup?.name || 'Party'} - Carpool Arrangements`,
          text: `Here are the carpool arrangements for ${partyGroup?.name || 'the party'} on ${partyGroup?.partyDate ? new Date(partyGroup.partyDate).toLocaleDateString() : 'the scheduled date'}.`,
        });
      } catch (error) {
        console.error('Error sharing:', error);
        toast({
          title: "Sharing failed",
          description: "Unable to share the carpool information.",
          variant: "destructive"
        });
      }
    } else {
      toast({
        title: "Sharing not supported",
        description: "Your browser doesn't support the Web Share API.",
      });
    }
  };

  if (carpoolsLoading) {
    return (
      <div className="flex items-center justify-center p-6 bg-white rounded-lg shadow">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading carpool information...</p>
        </div>
      </div>
    );
  }

  if (carpoolsArray.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-2 text-neutral-800">Carpool Summary</h2>
        <p className="text-neutral-600">No carpools have been arranged yet for this party.</p>
      </div>
    );
  }

  // Group carpools by direction
  const toPartyCarpools = carpoolsArray.filter((c: Carpool) => c.canPickup || c.canBoth);
  const fromPartyCarpools = carpoolsArray.filter((c: Carpool) => c.canDropoff || c.canBoth);

  // Function to get initials from a name
  const getInitials = (name: string) => {
    if (!name) return "?";
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  // Function to describe dropoff preference in a user-friendly way
  const getDropoffPreferenceDescription = (preference: string) => {
    switch (preference) {
      case 'direct-home':
        return 'Driver will drop off each child directly at their home';
      case 'my-home':
      case 'my-address':
        return 'Parents should collect children from driver\'s home';
      case 'central-point':
        return 'Driver will drop off at a central meeting point';
      default:
        return 'Not specified';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-semibold text-neutral-800">Carpool Summary</h2>
          <p className="text-neutral-600 text-sm mt-1">
            {partyGroup?.name || "Party"} - {partyGroup?.partyDate ? new Date(partyGroup.partyDate).toLocaleDateString() : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={handleShare}>
            <Share2 className="h-4 w-4" />
            <span>Share</span>
          </Button>
        </div>
      </div>

      <div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* TO Party Section */}
          <Card className="col-span-1">
            <CardHeader className="bg-green-50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ArrowRight className="h-4 w-4"/>
                  To Event
                </CardTitle>
                <Badge variant="outline" className="bg-green-100">
                  {toPartyCarpools.length} rides available
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {toPartyCarpools.map((carpool: Carpool) => (
                <div key={carpool.id} className="mb-4 p-3 border rounded-lg hover:border-primary transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">{carpool.parentName}</h4>
                      <p className="text-sm text-gray-600">{carpool.spacesAvailable} spaces available</p>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => onRequestSpot && onRequestSpot(carpool.id)}
                    >
                      Book Spot
                    </Button>
                  </div>
                  <div className="text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5"/>
                      {carpool.city}, {carpool.postcode}
                    </div>
                    {carpool.pickupTime && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5"/>
                        Pickup at {carpool.pickupTime}
                      </div>
                    )}
                    {carpool.outboundDropoffPreference && (
                      <div className="flex items-center gap-1">
                        <HomeIcon className="h-3.5 w-3.5"/>
                        {carpool.outboundDropoffPreference === 'direct-home' ? 'Drops at your home' :
                         (carpool.outboundDropoffPreference === 'my-home' || carpool.outboundDropoffPreference === 'my-address') ? 'Collect from driver' : 
                         'Central meeting point'}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* FROM Party Section */}
          <Card className="col-span-1">
            <CardHeader className="bg-blue-50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4"/>
                  From Event
                </CardTitle>
                <Badge variant="outline" className="bg-blue-100">
                  {fromPartyCarpools.length} rides available
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {fromPartyCarpools.map((carpool: Carpool) => (
                <div key={carpool.id} className="mb-4 p-3 border rounded-lg hover:border-primary transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">{carpool.parentName}</h4>
                      <p className="text-sm text-gray-600">{carpool.spacesAvailable} spaces available</p>
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => onRequestSpot && onRequestSpot(carpool.id)}
                    >
                      Book Spot
                    </Button>
                  </div>
                  <div className="text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5"/>
                      {carpool.city}, {carpool.postcode}
                    </div>
                    {carpool.dropoffPreference && (
                      <div className="flex items-center gap-1">
                        <HomeIcon className="h-3.5 w-3.5"/>
                        {carpool.dropoffPreference === 'direct-home' ? 'Drops at your home' :
                         (carpool.dropoffPreference === 'my-home' || carpool.dropoffPreference === 'my-address') ? 'Collect from driver' : 
                         'Central meeting point'}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* All Trips Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>All Carpools Overview</CardTitle>
            <CardDescription>Complete schedule of all rides for this event</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Child</TableHead>
                  <TableHead>To Event</TableHead>
                  <TableHead>From Event</TableHead>
                  <TableHead>Contact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {carpoolsArray.map((carpool: Carpool) => {
                  const requests = carpoolRequestsMap[carpool.id] || [];
                  return (
                    <TableRow key={carpool.id}>
                      <TableCell>{carpool.childName}</TableCell>
                      <TableCell>
                        {carpool.canPickup || carpool.canBoth ? (
                          <div className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5"/>
                            <span>{carpool.parentName}</span>
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {carpool.canDropoff || carpool.canBoth ? (
                          <div className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5"/>
                            <span>{carpool.parentName}</span>
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5"/>
                          {carpool.phoneNumber}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Event Details Button */}
        <div className="mb-6 flex justify-center">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Event Details</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Event Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-neutral-500 shrink-0" />
                    <span className="text-sm font-medium">
                      {partyGroup?.partyDate ? new Date(partyGroup.partyDate).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      }) : "Date not specified"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-neutral-500 shrink-0" />
                    <span className="text-sm">
                      {partyGroup?.targetArrivalTime || "Time not specified"}
                      {partyGroup?.endTime ? ` - ${partyGroup.endTime}` : ""}
                    </span>
                  </div>

                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-neutral-500 shrink-0 mt-0.5" />
                    <span className="text-sm">
                      {partyGroup ? `${partyGroup.partyAddress}, ${partyGroup.partyCity}, ${partyGroup.partyPostcode}` : "Location not specified"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-neutral-500 shrink-0" />
                    <span className="text-sm">
                      {carpoolsArray.length > 0 ? `${carpoolsArray.length} carpool${carpoolsArray.length !== 1 ? 's' : ''} arranged` : "No carpools arranged"}
                    </span>
                  </div>
                </div>

                {partyGroup?.description && (
                  <div className="pt-2 border-t">
                    <h4 className="text-sm font-medium mb-1">Event Description</h4>
                    <p className="text-sm text-gray-600">{partyGroup.description}</p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>


        {/* "Request a Spot" view */}
        <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-md border border-blue-100 mb-4">
              <h3 className="text-lg font-medium text-blue-800 mb-2">Request a Carpool Spot</h3>
              <p className="text-sm text-blue-700">
                Browse available carpools below and click "Request Spot" on any that meet your needs.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-4">
              <Input
                placeholder="Search by name, city, or postcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-xs"
              />

              <Select value={sortBy} onValueChange={(value: "distance" | "spaces" | "name") => setSortBy(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spaces">Sort by Available Spaces</SelectItem>
                  <SelectItem value="name">Sort by Name</SelectItem>
                  <SelectItem value="distance">Sort by Distance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Tabs value={carpoolFilterTab} onValueChange={setCarpoolFilterTab}>
              <TabsList>
                <TabsTrigger value="all">
                  All ({carpoolsArray.length || 0})
                </TabsTrigger>
                <TabsTrigger value="to-party">
                  To Event ({carpoolsArray.filter((c: any) => c.canPickup || c.canBoth).length || 0})
                </TabsTrigger>
                <TabsTrigger value="from-party">
                  From Event ({carpoolsArray.filter((c: any) => c.canDropoff || c.canBoth).length || 0})
                </TabsTrigger>
              </TabsList>

              <div className="mt-4">
                {carpoolsArray.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center text-gray-500">
                      No carpools available for this event yet
                    </CardContent>
                  </Card>
                ) : (
                  // Filter and sort carpools
                  carpoolsArray
                    .filter((carpool: any) => {
                      // Filter by tab selection
                      if (carpoolFilterTab === "to-party") return carpool.canPickup || carpool.canBoth;
                      if (carpoolFilterTab === "from-party") return carpool.canDropoff || carpool.canBoth;
                      return true; // Show all carpools in the "all" tab
                    })
                    .filter(carpool => {
                      // Filter by search term
                      if (!searchTerm) return true;
                      const searchLower = searchTerm.toLowerCase();
                      return (
                        carpool.parentName.toLowerCase().includes(searchLower) ||
                        (carpool.city && carpool.city.toLowerCase().includes(searchLower)) ||
                        (carpool.postcode && carpool.postcode.toLowerCase().includes(searchLower))
                      );
                    })
                    .sort((a, b) => {
                      // Sort based on selected option
                      if (sortBy === "spaces") {
                        return (b.spacesAvailable || 0) - (a.spacesAvailable || 0);
                      }
                      if (sortBy === "name") {
                        return a.parentName.localeCompare(b.parentName);
                      }
                      // Default to distance sorting
                      return 0;
                    })
                    .map((carpool: any) => (
                      <Card key={carpool.id} className="mb-4 hover:shadow-lg transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="space-y-2">
                              <h3 className="font-semibold text-lg">{carpool.parentName}</h3>

                              <div className="flex items-center text-sm text-gray-600 space-x-2">
                                <MapPin size={16} />
                                <span>{carpool.city || 'Location'}, {carpool.postcode || 'N/A'}</span>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {carpool.canPickup && (
                                  <Badge className="bg-green-100 text-green-800">
                                    To event ({carpool.spacesAvailable} spaces)
                                  </Badge>
                                )}
                                {carpool.canDropoff && (
                                  <Badge className="bg-blue-100 text-blue-800">
                                    From event ({carpool.returnSpacesAvailable || carpool.spacesAvailable} spaces)
                                  </Badge>
                                )}
                                {/* Show outbound preference for rides to the party */}
                                {carpool.canPickup && carpool.outboundDropoffPreference && (
                                  <Badge className="bg-purple-100 text-purple-800">
                                    {carpool.outboundDropoffPreference === "direct-home" ? "Direct home drop-off" : 
                                     (carpool.outboundDropoffPreference === "my-home" || carpool.outboundDropoffPreference === "my-address") ? "Pickup from driver's home" : 
                                     "Meeting point"}
                                  </Badge>
                                )}
                                {/* Show return preference for rides from the party */}
                                {carpool.canDropoff && carpool.dropoffPreference && (
                                  <Badge className="bg-purple-100 text-purple-800">
                                    {carpool.dropoffPreference === "direct-home" ? "Direct home drop-off" : 
                                     (carpool.dropoffPreference === "my-home" || carpool.dropoffPreference === "my-address") ? "Pickup from driver's home" : 
                                     "Meeting point"}
                                  </Badge>
                                )}
                              </div>

                              {carpool.maxDistance && (
                                <p className="text-sm text-gray-600">
                                  Maximum distance: {carpool.maxDistance} miles
                                </p>
                              )}
                            </div>

                            <div className="flex flex-col gap-2">
                              <Button 
                                onClick={() => onRequestSpot && onRequestSpot(carpool.id)}
                                className="ml-4"
                                variant="default"
                              >
                                <Users className="h-4 w-4 mr-2" />
                                Request Spot
                              </Button>
                              {carpool.spacesAvailable <= 2 && (
                                <span className="text-xs text-amber-600 whitespace-nowrap">
                                  Only {carpool.spacesAvailable} {carpool.spacesAvailable === 1 ? 'space' : 'spaces'} left
                                </span>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                )}
              </div>
            </Tabs>
          </div>
      </div>
    </div>
  );
}