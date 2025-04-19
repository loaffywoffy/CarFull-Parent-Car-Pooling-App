import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Clock, User, MapPin, ArrowRight, Car, ArrowLeft, Info, Calendar, X } from "lucide-react";
import { type Carpool, type CarpoolRequest } from "@shared/schema";
import LocationMapWrapper from "./location-map-wrapper";
import { getCarpoolRequests } from "@/api/carpools";
import DeleteCarpoolButton from "./delete-carpool-button";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import CarpoolRequestsList from "./carpool-requests-list";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDateToFriendlyDay } from "@/lib/utils";

interface CarpoolSummaryProps {
  partyGroupId: number;
  onRequestSpot?: (carpoolId: number) => void;
  onBackToEvents?: () => void;
}

export default function CarpoolSummary({ partyGroupId, onRequestSpot, onBackToEvents }: CarpoolSummaryProps) {
  const [carpools, setCarpools] = useState<Record<number, Carpool>>({});
  const [carpoolRequests, setCarpoolRequests] = useState<Record<number, CarpoolRequest[]>>({});
  const [selectedCarpoolId, setSelectedCarpoolId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState<Record<number, boolean>>({});
  const { toast } = useToast();

  const refreshInterval = 5000; // 5 seconds
  
  // Fetch carpools
  useEffect(() => {
    let isMounted = true;
    
    async function fetchCarpools() {
      try {
        const response = await fetch(`/api/party-groups/${partyGroupId}/carpools`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch carpools');
        }
        
        const carpoolsArray = await response.json();
        
        if (isMounted) {
          const carpoolsMap: Record<number, Carpool> = {};
          carpoolsArray.forEach((carpool: Carpool) => {
            carpoolsMap[carpool.id] = carpool;
          });
          
          setCarpools(carpoolsMap);
          setIsLoading(false);
          
          // Pre-load requests for each carpool
          carpoolsArray.forEach((carpool: Carpool) => {
            fetchCarpoolRequests(carpool.id);
          });
        }
      } catch (error) {
        console.error("Error fetching carpools:", error);
        if (isMounted) {
          setIsLoading(false);
          toast({
            title: "Error",
            description: "Failed to fetch carpools. Please try again.",
            variant: "destructive",
          });
        }
      }
    }
    
    async function fetchCarpoolRequests(carpoolId: number) {
      try {
        setRequestsLoading(prev => ({ ...prev, [carpoolId]: true }));
        const requests = await getCarpoolRequests(carpoolId);
        if (isMounted) {
          setCarpoolRequests(prev => ({
            ...prev,
            [carpoolId]: requests
          }));
        }
      } catch (error) {
        console.error(`Error fetching requests for carpool ${carpoolId}:`, error);
      } finally {
        if (isMounted) {
          setRequestsLoading(prev => ({ ...prev, [carpoolId]: false }));
        }
      }
    }
    
    fetchCarpools();

    // Set up auto-refresh
    const interval = setInterval(fetchCarpools, refreshInterval);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [partyGroupId, toast]);
  
  const carpoolsArray = Object.values(carpools);
  const toPartyCarpools = carpoolsArray.filter((c: Carpool) => c.canPickup || c.canBoth);
  const fromPartyCarpools = carpoolsArray.filter((c: Carpool) => c.canDropoff || c.canBoth);
  
  const calculateAvailableSpaces = (carpool: Carpool, isOutbound: boolean): number => {
    const requestsForCarpool = carpoolRequests[carpool.id] || [];
    
    if (isOutbound) {
      // For journey to the party (OUTBOUND)
      const outboundRequests = requestsForCarpool.filter(r => 
        r.needsPickup || r.needsBoth
      ).length;
      return Math.max(0, (carpool.spacesAvailable || 0) - outboundRequests);
    } else {
      // For journey from the party (RETURN)
      const returnRequests = requestsForCarpool.filter(r => 
        r.needsDropoff || r.needsBoth
      ).length;
      return Math.max(0, (carpool.returnSpacesAvailable || 0) - returnRequests);
    }
  };

  // Function to better display dropoff location
  const renderDropoffLocation = (carpool: Carpool, isOutbound: boolean = true) => {
    // For outbound journey (to party), the dropoff location is the party venue
    if (isOutbound) {
      return carpool.dropoffPreference || "Event venue";
    }
    
    // For return journey (from party), it's the original pickup point
    return carpool.address;
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (carpoolsArray.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-gray-500">No carpools have been offered yet for this event.</p>
        {onBackToEvents && (
          <Button onClick={onBackToEvents} variant="outline">Back to Events</Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {onBackToEvents && (
        <div className="flex justify-start mb-4">
          <Button onClick={onBackToEvents} variant="outline" className="pl-2 border-gray-200">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Events
          </Button>
        </div>
      )}
      
      <h2 className="text-xl font-semibold mb-4">Available Rides</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* TO PARTY CARPOOLS */}
        <div className="space-y-4">
          <h3 className="text-base font-semibold flex items-center text-gray-800">
            <ArrowRight className="h-5 w-5 mr-2 text-green-500" /> 
            <span>To Party ({toPartyCarpools.length})</span>
          </h3>
          
          {toPartyCarpools.length === 0 ? (
            <div className="bg-gray-50 rounded-md p-4 text-center">
              <p className="text-gray-500 text-sm">No rides to the party have been offered yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {toPartyCarpools.map((carpool: Carpool) => (
                <div key={`to-${carpool.id}`} className="bg-white rounded-md border border-gray-200 overflow-hidden shadow-sm">
                  <div className="p-3 border-b border-gray-100 bg-primary-50/50 flex justify-between items-center">
                    <div>
                      <h4 className="font-medium text-sm">{carpool.parentName}'s car</h4>
                      <p className="text-xs text-gray-500">
                        {calculateAvailableSpaces(carpool, true)} of {carpool.spacesAvailable} spaces available
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-xs h-7">View Details</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Carpool Details</DialogTitle>
                            <DialogDescription>
                              Information about this ride and passengers
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <div className="bg-primary-50 p-4 rounded-md border border-primary-100">
                                <h3 className="text-lg font-medium mb-1 text-primary-700">Driver Information</h3>
                                <div className="space-y-2">
                                  <p className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-primary-500" />
                                    <span>{carpool.parentName} ({carpool.childName})</span>
                                  </p>
                                  <p className="flex items-center gap-2">
                                    <Car className="h-4 w-4 text-primary-500" />
                                    <span>Vehicle not specified</span>
                                  </p>
                                  {carpool.emergencyContactName && carpool.emergencyContactPhone && (
                                    <div className="bg-amber-50 p-2 rounded border border-amber-100 mt-2">
                                      <p className="text-xs font-medium text-amber-800 mb-1">Emergency Contact</p>
                                      <p className="text-xs text-amber-700">{carpool.emergencyContactName}</p>
                                      <p className="text-xs text-amber-700">{carpool.emergencyContactPhone}</p>
                                      {carpool.emergencyContactRelationship && (
                                        <p className="text-xs text-amber-700">({carpool.emergencyContactRelationship})</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                                <h3 className="text-md font-medium mb-2 text-gray-700">Ride Details</h3>
                                <div className="space-y-3">
                                  {carpool.canPickup || carpool.canBoth ? (
                                    <div className="space-y-2 pt-1">
                                      <h5 className="text-sm font-medium flex items-center">
                                        <ArrowRight className="h-4 w-4 mr-2 text-green-500" /> 
                                        To Party
                                      </h5>
                                      <div className="ml-6 mt-1 space-y-1">
                                        <div className="flex items-start gap-1 bg-gray-50 p-1.5 rounded border border-gray-100">
                                          <Clock className="h-3 w-3 text-primary-500 mt-0.5" />
                                          <div>
                                            <span className="font-medium text-xs block">Target departure time:</span>
                                            <span className="text-xs">{carpool.outboundDepartureTime || "Not specified"}</span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <User className="h-3 w-3 text-gray-400" />
                                          <span>Spaces: {calculateAvailableSpaces(carpool, true)} of {carpool.spacesAvailable || 0} available</span>
                                        </div>
                                        
                                        <div className="flex items-center gap-1 mt-2">
                                          <MapPin className="h-3 w-3 text-gray-400" />
                                          <span className="font-medium">Pick-up from:</span>
                                        </div>
                                        <div className="bg-white p-2 rounded border border-gray-100 ml-6">
                                          <p className="text-xs">
                                            {carpool.address}{carpool.city ? `, ${carpool.city}` : ''}{carpool.postcode ? ` ${carpool.postcode}` : ''}
                                          </p>
                                        </div>
                                        
                                        <div className="flex items-center gap-1 mt-1">
                                          <MapPin className="h-3 w-3 text-gray-400" />
                                          <span className="font-medium">Drop-off at:</span>
                                        </div>
                                        <div className="bg-white p-2 rounded border border-gray-100 ml-6">
                                          <p className="text-xs">{renderDropoffLocation(carpool, true)}</p>
                                        </div>
                                      </div>
                                    </div>
                                  ) : null}
                                  
                                  {carpool.canDropoff || carpool.canBoth ? (
                                    <div className="space-y-2 pt-1 mt-4 border-t border-gray-200">
                                      <h5 className="text-sm font-medium flex items-center">
                                        <ArrowLeft className="h-4 w-4 mr-2 text-red-500" /> 
                                        From Party
                                      </h5>
                                      <div className="ml-6 mt-1 space-y-1">
                                        <div className="flex items-start gap-1 bg-gray-50 p-1.5 rounded border border-gray-100">
                                          <Clock className="h-3 w-3 text-primary-500 mt-0.5" />
                                          <div>
                                            <span className="font-medium text-xs block">Collection time:</span>
                                            <span className="text-xs">{carpool.returnCollectionTime || "Not specified"}</span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <User className="h-3 w-3 text-gray-400" />
                                          <span>Spaces: {calculateAvailableSpaces(carpool, false)} of {carpool.returnSpacesAvailable || 0} available</span>
                                        </div>
                                        
                                        <div className="flex items-center gap-1 mt-2">
                                          <MapPin className="h-3 w-3 text-gray-400" />
                                          <span className="font-medium">Pick-up from:</span>
                                        </div>
                                        <div className="bg-white p-2 rounded border border-gray-100 ml-6">
                                          <p className="text-xs">Event venue</p>
                                        </div>
                                        
                                        <div className="flex items-center gap-1 mt-1">
                                          <MapPin className="h-3 w-3 text-gray-400" />
                                          <span className="font-medium">Drop-off at:</span>
                                        </div>
                                        <div className="bg-white p-2 rounded border border-gray-100 ml-6">
                                          <p className="text-xs">{renderDropoffLocation(carpool, false)}</p>
                                        </div>
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                            
                            <div className="space-y-4">
                              <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                                <h3 className="text-md font-medium mb-2 text-gray-700">Kids Booked</h3>
                                <CarpoolRequestsList carpoolId={carpool.id} />
                              </div>
                              
                              <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                                <h3 className="text-md font-medium text-gray-700 mb-2">Location Map</h3>
                                <LocationMapWrapper
                                  id={carpool.id}
                                  parentName={carpool.parentName}
                                  address={carpool.address}
                                  city={carpool.city}
                                  postcode={carpool.postcode}
                                  height="250px"
                                  type="pickup"
                                />
                              </div>
                              
                              <div className="flex justify-end">
                                <DeleteCarpoolButton
                                  carpool={carpool}
                                  variant="destructive"
                                  partyGroupId={partyGroupId}
                                />
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      {onRequestSpot && calculateAvailableSpaces(carpool, true) > 0 ? (
                        <Button 
                          variant="default"
                          size="sm"
                          className="h-7 bg-primary text-white"
                          onClick={() => onRequestSpot(carpool.id)}
                        >
                          Request Spot
                        </Button>
                      ) : onRequestSpot ? (
                        <Button 
                          variant="outline"
                          size="sm"
                          className="h-7 opacity-70"
                          disabled
                        >
                          No Spots Available
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Route</p>
                      <p className="text-sm truncate"><span className="font-medium">From:</span> {carpool.address}</p>
                      <p className="text-sm truncate"><span className="font-medium">To:</span> {renderDropoffLocation(carpool, true)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Departure</p>
                      <p className="text-sm">
                        <span className="font-medium">Time:</span> {carpool.outboundDepartureTime || "Not specified"}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Spaces:</span> {calculateAvailableSpaces(carpool, true)} available
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* FROM PARTY CARPOOLS */}
        <div className="space-y-4">
          <h3 className="text-base font-semibold flex items-center text-gray-800">
            <ArrowLeft className="h-5 w-5 mr-2 text-red-500" /> 
            <span>From Party ({fromPartyCarpools.length})</span>
          </h3>
          
          {fromPartyCarpools.length === 0 ? (
            <div className="bg-gray-50 rounded-md p-4 text-center">
              <p className="text-gray-500 text-sm">No rides from the party have been offered yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {fromPartyCarpools.map((carpool: Carpool) => (
                <div key={`from-${carpool.id}`} className="bg-white rounded-md border border-gray-200 overflow-hidden shadow-sm">
                  <div className="p-3 border-b border-gray-100 bg-primary-50/50 flex justify-between items-center">
                    <div>
                      <h4 className="font-medium text-sm">{carpool.parentName}'s car</h4>
                      <p className="text-xs text-gray-500">
                        {calculateAvailableSpaces(carpool, false)} of {carpool.returnSpacesAvailable} spaces available
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-xs h-7">View Details</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Carpool Details</DialogTitle>
                            <DialogDescription>
                              Information about this ride and passengers
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <div className="bg-primary-50 p-4 rounded-md border border-primary-100">
                                <h3 className="text-lg font-medium mb-1 text-primary-700">Driver Information</h3>
                                <div className="space-y-2">
                                  <p className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-primary-500" />
                                    <span>{carpool.parentName} ({carpool.childName})</span>
                                  </p>
                                  <p className="flex items-center gap-2">
                                    <Car className="h-4 w-4 text-primary-500" />
                                    <span>Vehicle not specified</span>
                                  </p>
                                  {carpool.emergencyContactName && carpool.emergencyContactPhone && (
                                    <div className="bg-amber-50 p-2 rounded border border-amber-100 mt-2">
                                      <p className="text-xs font-medium text-amber-800 mb-1">Emergency Contact</p>
                                      <p className="text-xs text-amber-700">{carpool.emergencyContactName}</p>
                                      <p className="text-xs text-amber-700">{carpool.emergencyContactPhone}</p>
                                      {carpool.emergencyContactRelationship && (
                                        <p className="text-xs text-amber-700">({carpool.emergencyContactRelationship})</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                                <h3 className="text-md font-medium mb-2 text-gray-700">Ride Details</h3>
                                <div className="space-y-3">
                                  {carpool.canPickup || carpool.canBoth ? (
                                    <div className="space-y-2 pt-1">
                                      <h5 className="text-sm font-medium flex items-center">
                                        <ArrowRight className="h-4 w-4 mr-2 text-green-500" /> 
                                        To Party
                                      </h5>
                                      <div className="ml-6 mt-1 space-y-1">
                                        <div className="flex items-start gap-1 bg-gray-50 p-1.5 rounded border border-gray-100">
                                          <Clock className="h-3 w-3 text-primary-500 mt-0.5" />
                                          <div>
                                            <span className="font-medium text-xs block">Target departure time:</span>
                                            <span className="text-xs">{carpool.outboundDepartureTime || "Not specified"}</span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <User className="h-3 w-3 text-gray-400" />
                                          <span>Spaces: {calculateAvailableSpaces(carpool, true)} of {carpool.spacesAvailable || 0} available</span>
                                        </div>
                                        
                                        <div className="flex items-center gap-1 mt-2">
                                          <MapPin className="h-3 w-3 text-gray-400" />
                                          <span className="font-medium">Pick-up from:</span>
                                        </div>
                                        <div className="bg-white p-2 rounded border border-gray-100 ml-6">
                                          <p className="text-xs">
                                            {carpool.address}{carpool.city ? `, ${carpool.city}` : ''}{carpool.postcode ? ` ${carpool.postcode}` : ''}
                                          </p>
                                        </div>
                                        
                                        <div className="flex items-center gap-1 mt-1">
                                          <MapPin className="h-3 w-3 text-gray-400" />
                                          <span className="font-medium">Drop-off at:</span>
                                        </div>
                                        <div className="bg-white p-2 rounded border border-gray-100 ml-6">
                                          <p className="text-xs">{renderDropoffLocation(carpool, true)}</p>
                                        </div>
                                      </div>
                                    </div>
                                  ) : null}
                                  
                                  {carpool.canDropoff || carpool.canBoth ? (
                                    <div className="space-y-2 pt-1 mt-4 border-t border-gray-200">
                                      <h5 className="text-sm font-medium flex items-center">
                                        <ArrowLeft className="h-4 w-4 mr-2 text-red-500" /> 
                                        From Party
                                      </h5>
                                      <div className="ml-6 mt-1 space-y-1">
                                        <div className="flex items-start gap-1 bg-gray-50 p-1.5 rounded border border-gray-100">
                                          <Clock className="h-3 w-3 text-primary-500 mt-0.5" />
                                          <div>
                                            <span className="font-medium text-xs block">Collection time:</span>
                                            <span className="text-xs">{carpool.returnCollectionTime || "Not specified"}</span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <User className="h-3 w-3 text-gray-400" />
                                          <span>Spaces: {calculateAvailableSpaces(carpool, false)} of {carpool.returnSpacesAvailable || 0} available</span>
                                        </div>
                                        
                                        <div className="flex items-center gap-1 mt-2">
                                          <MapPin className="h-3 w-3 text-gray-400" />
                                          <span className="font-medium">Pick-up from:</span>
                                        </div>
                                        <div className="bg-white p-2 rounded border border-gray-100 ml-6">
                                          <p className="text-xs">Event venue</p>
                                        </div>
                                        
                                        <div className="flex items-center gap-1 mt-1">
                                          <MapPin className="h-3 w-3 text-gray-400" />
                                          <span className="font-medium">Drop-off at:</span>
                                        </div>
                                        <div className="bg-white p-2 rounded border border-gray-100 ml-6">
                                          <p className="text-xs">{renderDropoffLocation(carpool, false)}</p>
                                        </div>
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                            
                            <div className="space-y-4">
                              <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                                <h3 className="text-md font-medium mb-2 text-gray-700">Kids Booked</h3>
                                <CarpoolRequestsList carpoolId={carpool.id} />
                              </div>
                              
                              <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                                <h3 className="text-md font-medium text-gray-700 mb-2">Location Map</h3>
                                <LocationMapWrapper
                                  id={carpool.id}
                                  parentName={carpool.parentName}
                                  address={carpool.address}
                                  city={carpool.city}
                                  postcode={carpool.postcode}
                                  height="250px"
                                  type="pickup"
                                />
                              </div>
                              
                              <div className="flex justify-end">
                                <DeleteCarpoolButton
                                  carpool={carpool}
                                  variant="destructive"
                                  partyGroupId={partyGroupId}
                                />
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      {onRequestSpot && calculateAvailableSpaces(carpool, false) > 0 ? (
                        <Button 
                          variant="default"
                          size="sm"
                          className="h-7 bg-primary text-white"
                          onClick={() => onRequestSpot(carpool.id)}
                        >
                          Request Spot
                        </Button>
                      ) : onRequestSpot ? (
                        <Button 
                          variant="outline"
                          size="sm"
                          className="h-7 opacity-70"
                          disabled
                        >
                          No Spots Available
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Route</p>
                      <p className="text-sm truncate"><span className="font-medium">From:</span> Event venue</p>
                      <p className="text-sm truncate"><span className="font-medium">To:</span> {renderDropoffLocation(carpool, false)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Return</p>
                      <p className="text-sm">
                        <span className="font-medium">Time:</span> {carpool.returnCollectionTime || "Not specified"}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Spaces:</span> {calculateAvailableSpaces(carpool, false)} available
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}