import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { 
  Car, ArrowRight, ArrowLeft, MapPin, User, Calendar, Clock, 
  Users, HomeIcon, Building, Share2, Phone, MailIcon, Printer,
  Download, ChevronRight, Baby, Map as MapIcon
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import LocationMap from "./location-map";
import { geocodeAddress } from "@/lib/geocoding";
import { type PartyGroup, type Carpool, type CarpoolRequest } from "@shared/schema";
import { getCarpoolRequests } from "@/api/carpools";
import { getCarpoolsByPartyGroupId, getPartyGroupById } from "@/api/partyGroups";
import { toast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface CarpoolSummaryProps {
  partyGroupId: number;
}

export default function CarpoolSummary({ partyGroupId }: CarpoolSummaryProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'detailed' | 'map'>('summary');
  const printRef = useRef<HTMLDivElement>(null);
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
    queryKey: [`/api/party-groups/${partyGroupId}/carpools`],
    queryFn: () => getCarpoolsByPartyGroupId(partyGroupId),
  });

  // Fetch party group data
  const { data: partyGroup } = useQuery<PartyGroup>({
    queryKey: [`/api/party-groups/${partyGroupId}`],
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

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    
    const originalContents = document.body.innerHTML;
    const printContents = content.innerHTML;
    
    document.body.innerHTML = `
      <div style="padding: 20px;">
        <h1 style="text-align: center; margin-bottom: 20px;">${partyGroup?.name || 'Party'} - Carpool Arrangements</h1>
        ${printContents}
      </div>
    `;
    
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };
  
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
  
  const handleSendEmail = () => {
    // Create email body with carpool information
    const subject = encodeURIComponent(`${partyGroup?.name || 'Party'} - Carpool Arrangements`);
    
    let body = `Carpool Arrangements for ${partyGroup?.name || 'Party'}\n\n`;
    body += `Date: ${partyGroup?.partyDate ? new Date(partyGroup.partyDate).toLocaleDateString() : 'TBD'}\n`;
    body += `Time: ${partyGroup?.targetArrivalTime || 'TBD'}${partyGroup?.endTime ? ` - ${partyGroup.endTime}` : ''}\n`;
    body += `Location: ${partyGroup ? `${partyGroup.partyAddress}, ${partyGroup.partyCity}` : 'TBD'}\n\n`;
    
    // TO party carpools
    body += `TO PARTY ARRANGEMENTS:\n`;
    const toPartyCarpools = carpoolsArray.filter((c: Carpool) => c.canPickup || c.canBoth);
    if (toPartyCarpools.length === 0) {
      body += `No carpools available for transportation to the party.\n\n`;
    } else {
      toPartyCarpools.forEach((carpool: Carpool) => {
        body += `Driver: ${carpool.parentName} - ${carpool.phoneNumber}\n`;
        const requests = carpoolRequestsMap[carpool.id] || [];
        if (requests.length > 0) {
          body += `Passengers:\n`;
          requests
            .filter(req => req.needsPickup || req.needsBoth)
            .forEach(req => {
              body += `- ${req.childName} (${req.parentName}) - ${req.phoneNumber}\n`;
            });
        } else {
          body += `No passengers assigned yet.\n`;
        }
        body += `\n`;
      });
    }
    
    // FROM party carpools
    body += `FROM PARTY ARRANGEMENTS:\n`;
    const fromPartyCarpools = carpoolsArray.filter((c: Carpool) => c.canDropoff || c.canBoth);
    if (fromPartyCarpools.length === 0) {
      body += `No carpools available for transportation from the party.\n`;
    } else {
      fromPartyCarpools.forEach((carpool: Carpool) => {
        body += `Driver: ${carpool.parentName} - ${carpool.phoneNumber}\n`;
        const requests = carpoolRequestsMap[carpool.id] || [];
        if (requests.length > 0) {
          body += `Passengers:\n`;
          requests
            .filter(req => req.needsDropoff || req.needsBoth)
            .forEach(req => {
              body += `- ${req.childName} (${req.parentName}) - ${req.phoneNumber}\n`;
            });
        } else {
          body += `No passengers assigned yet.\n`;
        }
        body += `\n`;
      });
    }
    
    const encodedBody = encodeURIComponent(body);
    window.location.href = `mailto:?subject=${subject}&body=${encodedBody}`;
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
          <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            <span>Print</span>
          </Button>
          <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={handleSendEmail}>
            <MailIcon className="h-4 w-4" />
            <span>Email</span>
          </Button>
        </div>
      </div>

      {/* View toggles */}
      <div className="flex border-b mb-6">
        <button
          className={`py-2 px-4 font-medium text-sm ${activeTab === 'summary' ? 'border-b-2 border-primary text-primary' : 'text-neutral-500'}`}
          onClick={() => setActiveTab('summary')}
        >
          Summary View
        </button>
        <button
          className={`py-2 px-4 font-medium text-sm ${activeTab === 'detailed' ? 'border-b-2 border-primary text-primary' : 'text-neutral-500'}`}
          onClick={() => setActiveTab('detailed')}
        >
          Detailed View
        </button>
        <button
          className={`py-2 px-4 font-medium text-sm flex items-center gap-1 ${activeTab === 'map' ? 'border-b-2 border-primary text-primary' : 'text-neutral-500'}`}
          onClick={() => setActiveTab('map')}
        >
          <MapIcon className="h-4 w-4" />
          <span>Map View</span>
        </button>
      </div>

      <div ref={printRef}>
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

        {activeTab === 'summary' && (
          <>
            {/* TO Party Carpools - Summary View */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200 px-3 py-1">
                  <ArrowRight className="h-4 w-4 mr-1" />
                  <span>TO Party</span>
                </Badge>
                <h3 className="text-lg font-medium text-neutral-700">Pickup Arrangements</h3>
              </div>

              {toPartyCarpools.length === 0 ? (
                <Card className="mb-4">
                  <CardContent className="p-4 text-center text-neutral-600">
                    No carpools available for transportation to the party.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {toPartyCarpools.map((carpool: Carpool) => {
                    const requests = carpoolRequestsMap[carpool.id] || [];
                    const pickupRequests = requests.filter(req => req.needsPickup || req.needsBoth);
                    
                    return (
                      <Card key={`to-${carpool.id}`} className="overflow-hidden">
                        <CardHeader className="bg-green-50 p-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 bg-green-100 text-green-800">
                              <AvatarFallback>{getInitials(carpool.parentName)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <CardTitle className="text-base">{carpool.parentName}</CardTitle>
                              <CardDescription className="text-xs">
                                Driver - {carpool.phoneNumber}
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-3 text-sm">
                          <div className="mb-2">
                            <p className="font-medium mb-1">Passengers</p>
                            <ul className="space-y-1 text-neutral-600">
                              <li className="flex items-center gap-1">
                                <Baby className="h-3.5 w-3.5 text-neutral-500" />
                                <span>{carpool.childName} (driver's child)</span>
                              </li>
                              {pickupRequests.length > 0 ? (
                                pickupRequests.map((request, idx) => (
                                  <li key={idx} className="flex items-center gap-1">
                                    <Baby className="h-3.5 w-3.5 text-neutral-500" />
                                    <span>{request.childName} ({request.parentName}: {request.phoneNumber})</span>
                                  </li>
                                ))
                              ) : (
                                <li className="text-neutral-400 italic">No additional passengers</li>
                              )}
                            </ul>
                          </div>
                          
                          <Separator className="my-2" />
                          
                          <div className="flex items-start gap-2">
                            <Car className="h-4 w-4 mt-1 text-neutral-500" />
                            <div>
                              <p className="font-medium mb-1">Vehicle</p>
                              <p className="text-neutral-600">Not specified</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* FROM Party Carpools - Summary View */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 px-3 py-1">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  <span>FROM Party</span>
                </Badge>
                <h3 className="text-lg font-medium text-neutral-700">Dropoff Arrangements</h3>
              </div>

              {fromPartyCarpools.length === 0 ? (
                <Card className="mb-4">
                  <CardContent className="p-4 text-center text-neutral-600">
                    No carpools available for transportation from the party.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {fromPartyCarpools.map((carpool: Carpool) => {
                    const requests = carpoolRequestsMap[carpool.id] || [];
                    const dropoffRequests = requests.filter(req => req.needsDropoff || req.needsBoth);
                    
                    return (
                      <Card key={`from-${carpool.id}`} className="overflow-hidden">
                        <CardHeader className="bg-blue-50 p-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 bg-blue-100 text-blue-800">
                              <AvatarFallback>{getInitials(carpool.parentName)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <CardTitle className="text-base">{carpool.parentName}</CardTitle>
                              <CardDescription className="text-xs">
                                Driver - {carpool.phoneNumber}
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-3 text-sm">
                          <div className="mb-2">
                            <p className="font-medium mb-1">Passengers</p>
                            <ul className="space-y-1 text-neutral-600">
                              <li className="flex items-center gap-1">
                                <Baby className="h-3.5 w-3.5 text-neutral-500" />
                                <span>{carpool.childName} (driver's child)</span>
                              </li>
                              {dropoffRequests.length > 0 ? (
                                dropoffRequests.map((request, idx) => (
                                  <li key={idx} className="flex items-center gap-1">
                                    <Baby className="h-3.5 w-3.5 text-neutral-500" />
                                    <span>{request.childName} ({request.parentName}: {request.phoneNumber})</span>
                                  </li>
                                ))
                              ) : (
                                <li className="text-neutral-400 italic">No additional passengers</li>
                              )}
                            </ul>
                          </div>
                          
                          <Separator className="my-2" />
                          
                          <div className="flex items-start gap-3">
                            <Car className="h-4 w-4 mt-1 text-neutral-500" />
                            <div>
                              <p className="font-medium mb-1">Dropoff Information</p>
                              <div className="flex items-center gap-1 mb-1">
                                {carpool.dropoffPreference === 'direct-home' ? (
                                  <HomeIcon className="h-3.5 w-3.5 text-neutral-500" />
                                ) : carpool.dropoffPreference === 'my-home' ? (
                                  <HomeIcon className="h-3.5 w-3.5 text-neutral-500" />
                                ) : (
                                  <Building className="h-3.5 w-3.5 text-neutral-500" />
                                )}
                                <p className="text-neutral-600">
                                  {getDropoffPreferenceDescription(carpool.dropoffPreference || 'not-specified')}
                                </p>
                              </div>
                              {carpool.dropoffPreference === 'direct-home' && carpool.maxDistance && (
                                <p className="text-neutral-600 text-xs ml-4">
                                  (Maximum {carpool.maxDistance} miles from driver's location)
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'map' && (
          <>
            <div className="mb-8">
              <h3 className="text-lg font-medium text-neutral-700 mb-4">Carpool Map View</h3>
              
              {isMapLoading && (
                <div className="rounded-md border border-gray-200 overflow-hidden">
                  <div className="h-[400px] flex items-center justify-center bg-gray-50">
                    <div className="text-center">
                      <Skeleton className="h-[400px] w-full" />
                    </div>
                  </div>
                </div>
              )}
              
              {!isMapLoading && partyLocation && (carpoolLocations.length > 0 || true) && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 mb-2">
                    This map shows the party location and all carpool pickup/dropoff points.
                  </p>
                
                  <div className="border rounded-md overflow-hidden">
                    <LocationMap
                      locations={[
                        {
                          label: partyGroup?.name || 'Party Location',
                          position: partyLocation,
                          type: 'party'
                        },
                        ...carpoolLocations.map(loc => ({
                          label: loc.label,
                          position: loc.position,
                          type: loc.type === 'pickup' ? 'pickup' : 
                                loc.type === 'dropoff' ? 'dropoff' : 'both' as any
                        }))
                      ]}
                      height="450px"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-primary-500"></div>
                      <span className="text-sm">Party Location</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-green-500"></div>
                      <span className="text-sm">Pickup Points</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                      <span className="text-sm">Dropoff Points</span>
                    </div>
                  </div>
                </div>
              )}
              
              {!isMapLoading && (!partyLocation || carpoolLocations.length === 0) && (
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="text-gray-500 mb-2">
                      Map data could not be loaded. Please make sure addresses are provided for the party location and carpools.
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}

        {activeTab === 'detailed' && (
          <>
            {/* Detailed view with tables */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-neutral-700 mb-3">Complete Carpool Details</h3>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Driver</TableHead>
                    <TableHead>Passengers</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead className="w-[150px]">Contact</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {carpoolsArray.map((carpool: Carpool) => {
                    const requests = carpoolRequestsMap[carpool.id] || [];
                    const direction = 
                      carpool.canBoth ? "To & From" :
                      carpool.canPickup ? "To Party" :
                      carpool.canDropoff ? "From Party" : "Unknown";
                    
                    let passengers = [
                      { 
                        name: carpool.childName, 
                        parentName: carpool.parentName, 
                        phone: carpool.phoneNumber,
                        isDriversChild: true
                      }
                    ];
                    
                    // Add passengers from requests
                    requests.forEach(req => {
                      passengers.push({
                        name: req.childName,
                        parentName: req.parentName,
                        phone: req.phoneNumber,
                        isDriversChild: false
                      });
                    });
                    
                    return (
                      <TableRow key={carpool.id}>
                        <TableCell className="font-medium">{carpool.parentName}</TableCell>
                        <TableCell>
                          <ul className="space-y-1">
                            {passengers.map((passenger, idx) => (
                              <li key={idx} className="flex items-start gap-1">
                                <Baby className="h-3.5 w-3.5 mt-1 text-neutral-500" />
                                <div>
                                  <span>{passenger.name} </span>
                                  {passenger.isDriversChild && (
                                    <Badge variant="outline" className="text-xs ml-1">Driver's child</Badge>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={
                              direction === "To & From" ? "bg-purple-50 text-purple-800 border-purple-200" :
                              direction === "To Party" ? "bg-green-50 text-green-800 border-green-200" :
                              "bg-blue-50 text-blue-800 border-blue-200"
                            }
                          >
                            {direction}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 mb-1">
                            <Phone className="h-3.5 w-3.5 text-neutral-500" />
                            <span className="text-sm">{carpool.phoneNumber}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {carpool.canDropoff && carpool.dropoffPreference && (
                            <div className="text-sm text-neutral-600">
                              <span className="font-medium">Dropoff:</span> {getDropoffPreferenceDescription(carpool.dropoffPreference)}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              
              {/* Emergency Contact Information */}
              <Card className="mt-6 border border-amber-200">
                <CardHeader className="bg-amber-50 pb-2">
                  <CardTitle className="text-sm font-medium text-amber-800">Emergency Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="p-4 text-sm">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Child</TableHead>
                        <TableHead>Parent</TableHead>
                        <TableHead>Phone</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {carpoolsArray.map((carpool: Carpool) => (
                        <TableRow key={`driver-${carpool.id}`}>
                          <TableCell>{carpool.childName}</TableCell>
                          <TableCell>{carpool.parentName}</TableCell>
                          <TableCell>{carpool.phoneNumber}</TableCell>
                        </TableRow>
                      ))}
                      
                      {Object.values(carpoolRequestsMap)
                        .flat()
                        .map((request, idx) => (
                          <TableRow key={`passenger-${idx}`}>
                            <TableCell>{request.childName}</TableCell>
                            <TableCell>{request.parentName}</TableCell>
                            <TableCell>{request.phoneNumber}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}