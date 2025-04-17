import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { 
  Car, ArrowRight, ArrowLeft, MapPin, User, Calendar, Clock, 
  Users, HomeIcon, Building, Share2, Phone,
  Download, ChevronRight, Baby, Info as InfoIcon
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
import { ChevronLeft } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// A component to render each carpool card with its own state
function CarpoolCard({ carpool, requests }: { carpool: Carpool, requests: CarpoolRequest[] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Function to get initials from a name
  const getInitialsFromName = (name: string) => {
    if (!name) return "?";
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  return (
    <Card className="border overflow-hidden">
      <div 
        className="px-4 py-3 flex flex-col sm:flex-row sm:items-center w-full justify-between gap-2 cursor-pointer hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8 bg-primary/10">
            <AvatarFallback className="text-primary">
              {getInitialsFromName(carpool.parentName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{carpool.parentName}'s Car</p>
            <p className="text-sm text-muted-foreground">{carpool.childName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-2">
            {carpool.canPickup || carpool.canBoth ? (
              <Badge variant="outline" className="bg-green-50 whitespace-nowrap">
                <ArrowRight className="h-3 w-3 mr-1" />
                To Event
              </Badge>
            ) : null}
            {carpool.canDropoff || carpool.canBoth ? (
              <Badge variant="outline" className="bg-blue-50 whitespace-nowrap">
                <ArrowLeft className="h-3 w-3 mr-1" />
                From Event
              </Badge>
            ) : null}
          </div>
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}>
            <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 border-t">
          <div className="space-y-4 pt-3">
            {/* Action Buttons */}
            <div className="flex justify-end gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    Edit Offer
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Carpool Offer</DialogTitle>
                  </DialogHeader>
                  {/* Add CarpoolOfferForm component here with prefilled values */}
                </DialogContent>
              </Dialog>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    Delete
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Carpool Offer</DialogTitle>
                  </DialogHeader>
                  <p>Are you sure you want to delete this carpool offer? This action cannot be undone.</p>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={() => {}}>Cancel</Button>
                    <Button variant="destructive" onClick={() => {}}>Delete</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Driver Details */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Driver Details</h4>
              <div className="grid gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{carpool.parentName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{carpool.phoneNumber}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{carpool.address}, {carpool.city}, {carpool.postcode}</span>
                </div>
              </div>
            </div>

            {/* Map View */}
            <div className="h-[200px] rounded-lg overflow-hidden border">
              <CarpoolMap
                carpools={[{
                  id: carpool.id,
                  label: `${carpool.parentName}'s Car`,
                  position: [51.5074, -0.1278], // This should be calculated from the address
                  type: carpool.canBoth ? 'both' : (carpool.canPickup ? 'pickup' : 'dropoff')
                }]}
                onCarpoolSelect={() => {}}
              />
            </div>

            {/* Ride Details */}
            <div className="grid sm:grid-cols-2 gap-4">
              {carpool.canPickup || carpool.canBoth ? (
                <div className="border rounded-md p-3 bg-green-50/30">
                  <h4 className="font-medium flex items-center gap-1 mb-2">
                    <ArrowRight className="h-4 w-4" />
                    To Event Details
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>Pickup time: {carpool.pickupTime || "Not specified"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>Spaces available: {carpool.spacesAvailable || 0}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <HomeIcon className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span>Dropoff: {carpool.outboundDropoffPreference === 'direct-home' ? 'Drops at child\'s home' :
                        (carpool.outboundDropoffPreference === 'my-home' || carpool.outboundDropoffPreference === 'my-address') ? 'Collect from driver' : 
                        'Central meeting point'}</span>
                    </div>
                  </div>
                </div>
              ) : null}

              {carpool.canDropoff || carpool.canBoth ? (
                <div className="border rounded-md p-3 bg-blue-50/30">
                  <h4 className="font-medium flex items-center gap-1 mb-2">
                    <ArrowLeft className="h-4 w-4" />
                    From Event Details
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>Pickup time: After the event</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>Spaces available: {carpool.spacesAvailable || 0}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <HomeIcon className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span>Dropoff: {carpool.dropoffPreference === 'direct-home' ? 'Drops at child\'s home' :
                        (carpool.dropoffPreference === 'my-home' || carpool.dropoffPreference === 'my-address') ? 'Collect from driver' : 
                        'Central meeting point'}</span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Passengers */}
            <div>
              <h4 className="text-sm font-semibold mb-2">Passengers</h4>
              {requests.length > 0 ? (
                <div className="space-y-2">
                  {requests.map((request) => (
                    <div key={request.id} className="border rounded p-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Baby className="h-4 w-4 text-muted-foreground" />
                        <span>{request.childName}</span>
                        <div className="flex gap-1">
                          {request.needsPickup && <Badge variant="outline" className="text-xs py-0 bg-green-50">To</Badge>}
                          {request.needsDropoff && <Badge variant="outline" className="text-xs py-0 bg-blue-50">From</Badge>}
                        </div>
                      </div>
                      {request.specialRequirements && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <InfoIcon className="h-4 w-4 cursor-help" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle>Special Requirements</DialogTitle>
                            </DialogHeader>
                            <div className="p-4">
                              <p>{request.specialRequirements}</p>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No passengers booked yet</p>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";


interface CarpoolSummaryProps {
  partyGroupId: number;
  onRequestSpot?: (carpoolId: number) => void;
  onBackToEvents?: () => void;
}

export default function CarpoolSummary({ partyGroupId, onRequestSpot, onBackToEvents }: CarpoolSummaryProps) {
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
  const getInitialsFromName = (name: string) => {
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

  const filteredCarpools = carpoolsArray
    .filter((carpool: any) => {
      if (carpoolFilterTab === "to-party") return carpool.canPickup || carpool.canBoth;
      if (carpoolFilterTab === "from-party") return carpool.canDropoff || carpool.canBoth;
      return true;
    })
    .filter(carpool => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        carpool.parentName.toLowerCase().includes(searchLower) ||
        (carpool.city && carpool.city.toLowerCase().includes(searchLower)) ||
        (carpool.postcode && carpool.postcode.toLowerCase().includes(searchLower))
      );
    })
    .sort((a, b) => {
      if (sortBy === "spaces") {
        return (b.spacesAvailable || 0) - (a.spacesAvailable || 0);
      }
      if (sortBy === "name") {
        return a.parentName.localeCompare(b.parentName);
      }
      return 0;
    });


  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            {onBackToEvents && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onBackToEvents}
                className="flex items-center gap-1 border-primary text-primary hover:bg-primary/10"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Events</span>
              </Button>
            )}
            <h2 className="text-xl font-semibold text-neutral-800">Carpool Summary</h2>
          </div>
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
        {/* My Bookings Section - Removed for MVP
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>My Bookings</CardTitle>
            <CardDescription>Your confirmed lifts for this event</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center text-gray-500 py-4">
              No bookings available in this MVP version
            </div>
          </CardContent>
        </Card> */}

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
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm">View Details & Join</Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                          <DialogTitle>Carpool Details - {carpool.parentName}'s Car</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-6 py-4">
                          <div className="grid gap-4">
                            {/* Driver Info */}
                            <div>
                              <h4 className="font-medium mb-2">Driver Information</h4>
                              <div className="grid gap-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-gray-500" />
                                  <span>{carpool.parentName}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Phone className="h-4 w-4 text-gray-500" />
                                  <span>{carpool.phoneNumber}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-gray-500" />
                                  <span>{carpool.address}, {carpool.city}, {carpool.postcode}</span>
                                </div>
                              </div>
                            </div>

                            {/* Map View */}
                            <div className="h-[200px] rounded-lg overflow-hidden border">
                              <div className="bg-gray-100 h-full flex items-center justify-center text-gray-500">
                                Map View Coming Soon
                              </div>
                            </div>

                            {/* Current Passengers */}
                            <div>
                              <h4 className="font-medium mb-2">Current Passengers</h4>
                              {carpoolRequestsMap[carpool.id]?.length > 0 ? (
                                <div className="space-y-2">
                                  {carpoolRequestsMap[carpool.id].map((request) => (
                                    <div key={request.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                      <div className="flex items-center gap-2">
                                        <Baby className="h-4 w-4 text-primary" />
                                        <span>{request.childName}</span>
                                      </div>
                                      {request.specialRequirements && (
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger>
                                              <InfoIcon className="h-4 w-4 text-gray-400" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p>{request.specialRequirements}</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500">No passengers booked yet</p>
                              )}
                            </div>

                            {/* Join Form */}
                            <div>
                              <h4 className="font-medium mb-2">Request to Join</h4>
                              <form className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium">Your Details</label>
                                  <Input className="mt-1" placeholder="Your Name" />
                                  <Input className="mt-2" placeholder="Phone Number" type="tel" />
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Child's Details</label>
                                  <Input className="mt-1" placeholder="Child's Name" />
                                  <Textarea 
                                    className="mt-2" 
                                    placeholder="Any special requirements? (allergies, medical conditions, etc.)"
                                  />
                                </div>
                                <Button className="w-full" type="submit">
                                  Request to Join Carpool
                                </Button>
                              </form>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
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
                    {carpoolRequestsMap[carpool.id]?.length > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <p className="font-medium text-xs text-gray-700 mb-1">Current Passengers:</p>
                        <div className="flex flex-wrap gap-1">
                          {carpoolRequestsMap[carpool.id].map((request) => (
                            <Badge key={request.id} variant="outline" className="text-xs">
                              <span className="mr-1">{request.childName}</span>
                              {request.specialRequirements && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <InfoIcon className="h-3 w-3 text-gray-400" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="max-w-xs">{request.specialRequirements}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Show passengers inline */}
                    {carpoolRequestsMap[carpool.id]?.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="font-medium text-xs text-gray-700 mb-2">Current Passengers:</p>
                        <div className="space-y-1">
                          {carpoolRequestsMap[carpool.id].map((request) => (
                            <div key={request.id} className="flex items-center gap-2 text-xs bg-gray-50 p-1.5 rounded">
                              <Baby className="h-3 w-3 text-primary/70" />
                              <span>{request.childName}</span>
                              {request.specialRequirements && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <InfoIcon className="h-3 w-3 text-gray-400" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="max-w-xs">{request.specialRequirements}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          ))}
                        </div>
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
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm">View Details & Join</Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                          <DialogTitle>Carpool Details - {carpool.parentName}'s Car</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-6 py-4">
                          <div className="grid gap-4">
                            {/* Driver Info */}
                            <div>
                              <h4 className="font-medium mb-2">Driver Information</h4>
                              <div className="grid gap-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-gray-500" />
                                  <span>{carpool.parentName}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Phone className="h-4 w-4 text-gray-500" />
                                  <span>{carpool.phoneNumber}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-gray-500" />
                                  <span>{carpool.address}, {carpool.city}, {carpool.postcode}</span>
                                </div>
                              </div>
                            </div>

                            {/* Map View */}
                            <div className="h-[200px] rounded-lg overflow-hidden border">
                              <div className="bggray-100 h-full flex items-center justify-center text-gray-500">
                                Map View Coming Soon
                              </div>
                            </div>

                            {/* Current Passengers */}
                            <div>
                              <h4 className="font-medium mb-2">Current Passengers</h4>
                              {carpoolRequestsMap[carpool.id]?.length > 0 ? (
                                <div className="space-y-2">
                                  {carpoolRequestsMap[carpool.id].map((request) => (
                                    <div key={request.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                      <div className="flex items-center gap-2">
                                        <Baby className="h-4 w-4 text-primary" />
                                        <span>{request.childName}</span>
                                      </div>
                                      {request.specialRequirements && (
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger>
                                              <InfoIcon className="h-4 w-4 text-gray-400" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p>{request.specialRequirements}</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500">No passengers booked yet</p>
                              )}
                            </div>

                            {/* Join Form */}
                            <div>
                              <h4 className="font-medium mb-2">Request to Join</h4>
                              <form className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium">Your Details</label>
                                  <Input className="mt-1" placeholder="Your Name" />
                                  <Input className="mt-2" placeholder="Phone Number" type="tel" />
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Child's Details</label>
                                  <Input className="mt-1" placeholder="Child's Name" />
                                  <Textarea 
                                    className="mt-2" 
                                    placeholder="Any special requirements? (allergies, medical conditions, etc.)"
                                  />
                                </div>
                                <Button className="w-full" type="submit">
                                  Request to Join Carpool
                                </Button>
                              </form>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
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
                    {carpoolRequestsMap[carpool.id]?.length > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <p className="font-medium text-xs text-gray-700 mb-1">Current Passengers:</p>
                        <div className="flex flex-wrap gap-1">
                          {carpoolRequestsMap[carpool.id].map((request) => (
                            <Badge key={request.id} variant="outline" className="text-xs">
                              <span className="mr-1">{request.childName}</span>
                              {request.specialRequirements && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <InfoIcon className="h-3 w-3 text-gray-400" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="max-w-xs">{request.specialRequirements}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Show passengers inline */}
                    {carpoolRequestsMap[carpool.id]?.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="font-medium text-xs text-gray-700 mb-2">Current Passengers:</p>
                        <div className="space-y-1">
                          {carpoolRequestsMap[carpool.id].map((request) => (
                            <div key={request.id} className="flex items-center gap-2 text-xs bg-gray-50 p-1.5 rounded">
                              <Baby className="h-3 w-3 text-primary/70" />
                              <span>{request.childName}</span>
                              {request.specialRequirements && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <InfoIcon className="h-3 w-3 text-gray-400" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="max-w-xs">{request.specialRequirements}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

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


      </div>
    </div>
  );
}