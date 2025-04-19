import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCarpoolsByPartyGroupId } from "@/api/partyGroups";
import { getCarpoolRequests } from "@/api/carpools";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { MapPin, Clock, Phone, ArrowRight, ArrowLeft } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Carpool, CarpoolRequest } from "@shared/schema";
import LocationMapWrapper from "@/components/location-map-wrapper";
import CarpoolRequestItem from "@/components/carpool-request-item";
import DeleteCarpoolButton from "@/components/delete-carpool-button";

interface CarpoolSummaryProps {
  partyGroupId: number;
  onRequestSpot?: (carpoolId: number) => void;
  onBackToEvents?: () => void;
}

export default function CarpoolSummary({ partyGroupId, onRequestSpot, onBackToEvents }: CarpoolSummaryProps) {
  const [carpoolRequests, setCarpoolRequests] = useState<Record<number, CarpoolRequest[]>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Fetch carpools for this party group
  const { data: carpools, isLoading: isLoadingCarpools } = useQuery({
    queryKey: ["/api/carpools", partyGroupId],
    queryFn: () => getCarpoolsByPartyGroupId(partyGroupId),
  });
  
  // Function to fetch latest requests for all carpools
  const fetchAllRequests = async () => {
    if (!carpools) return;
    
    setIsRefreshing(true);
    
    try {
      const requestsMap: Record<number, CarpoolRequest[]> = {};
      
      for (const carpool of carpools) {
        try {
          const requests = await getCarpoolRequests(carpool.id);
          requestsMap[carpool.id] = requests;
        } catch (error) {
          console.error(`Error fetching requests for carpool ${carpool.id}:`, error);
          requestsMap[carpool.id] = [];
        }
      }
      
      setCarpoolRequests(requestsMap);
    } finally {
      setIsRefreshing(false);
    }
  };
  
  useEffect(() => {
    // Initial fetch of carpool requests
    fetchAllRequests();
    
    // Set up an interval to refresh the requests data every 5 seconds
    const intervalId = setInterval(() => {
      fetchAllRequests();
    }, 5000);
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, [carpools]);
  
  // No carpools to display yet
  if (isLoadingCarpools) {
    return (
      <div className="flex flex-col justify-center items-center p-8">
        <Spinner size="lg" color="primary" className="mb-2" text="Loading carpools..." />
      </div>
    );
  }
  
  if (!carpools || carpools.length === 0) {
    return (
      <div className="text-center p-8">
        <h3 className="text-lg font-medium mb-2">No carpools available yet</h3>
        <p className="text-muted-foreground">Be the first to offer a ride for this event!</p>
      </div>
    );
  }
  
  const carpoolsArray = carpools || [];
  const toPartyCarpools = carpoolsArray.filter((c: Carpool) => c.canPickup || c.canBoth);
  const fromPartyCarpools = carpoolsArray.filter((c: Carpool) => c.canDropoff || c.canBoth);
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        {onBackToEvents && (
          <Button variant="outline" onClick={onBackToEvents}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Events
          </Button>
        )}
        
        {/* Refresh button with loading spinner */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={fetchAllRequests} 
          disabled={isRefreshing}
          className="flex items-center gap-1"
        >
          {isRefreshing ? (
            <Spinner size="sm" text="Refreshing..." />
          ) : (
            <span>Refresh</span>
          )}
        </Button>
      </div>
      
      {/* Side-by-side layout for TO and FROM Party carpools */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* TO Party Section */}
        <div>
          {toPartyCarpools.length > 0 ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <ArrowRight className="h-5 w-5 mr-2 text-green-500" /> 
                  To Party Carpools
                </CardTitle>
              </CardHeader>
              <CardContent>
                {toPartyCarpools.map((carpool: Carpool) => (
                  <div key={carpool.id} className="mb-6 border rounded-md p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">{carpool.parentName}</h4>
                        <p className="text-sm text-gray-600">
                          {carpoolRequests[carpool.id] 
                            ? `${Math.max(0, carpool.spacesAvailable - carpoolRequests[carpool.id].length)} of ${carpool.spacesAvailable} spaces available`
                            : `${carpool.spacesAvailable} spaces available`
                          }
                        </p>
                        
                        {/* Summary of key details */}
                        <div className="mt-3 text-sm text-gray-600 space-y-1">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-gray-400" />
                            <span>Pickup time: {carpool.outboundDepartureTime || "Not specified"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3 text-gray-400" />
                            <span>Location: {carpool.city}, {carpool.postcode}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3 text-gray-400" />
                            <span>Contact: {carpool.phoneNumber}</span>
                          </div>
                        </div>
                        
                        {/* Kids already in this carpool */}
                        {carpoolRequests[carpool.id]?.length > 0 && (
                          <div className="mt-3 text-sm">
                            <p className="font-medium text-gray-700">Kids in this carpool:</p>
                            <ul className="mt-1 text-gray-600">
                              {carpoolRequests[carpool.id].map(request => (
                                <CarpoolRequestItem 
                                  key={request.id}
                                  request={request}
                                  compact={true}
                                  partyGroupId={partyGroupId}
                                />
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline">View Details</Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[600px]">
                            <DialogHeader>
                              <DialogTitle>Carpool Details - {carpool.parentName}'s Car</DialogTitle>
                              <DialogDescription>
                                View detailed information and book a ride
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="grid gap-6 py-4">
                              {/* Kids already in this carpool - Moved up */}
                              {carpoolRequests[carpool.id]?.length > 0 && (
                                <div>
                                  <h4 className="font-medium mb-2">Kids Already Booked</h4>
                                  <div className="bg-gray-50 rounded-md p-3 mb-3">
                                    <ul className="space-y-2">
                                      {carpoolRequests[carpool.id].map(request => (
                                        <CarpoolRequestItem 
                                          key={request.id}
                                          request={request}
                                          partyGroupId={partyGroupId}
                                        />
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              )}
                              
                              {/* Driver Info */}
                              <div>
                                <h4 className="font-medium mb-2">Driver Information</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium w-20">Name:</span>
                                    <span>{carpool.parentName}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium w-20">Phone:</span>
                                    <span>{carpool.phoneNumber}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium w-20">Address:</span>
                                    <span>{carpool.address}, {carpool.city}, {carpool.postcode}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <Separator />
                              
                              {/* Map Section */}
                              <div>
                                <h4 className="font-medium mb-2">Pick-up Location</h4>
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
                              
                              <Separator />
                              
                              {/* Delete Carpool Button */}
                              <div className="flex justify-end">
                                <DeleteCarpoolButton 
                                  carpool={carpool}
                                  variant="destructive"
                                  partyGroupId={partyGroupId}
                                />
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        {onRequestSpot && carpoolRequests[carpool.id] && 
                         (carpool.spacesAvailable - carpoolRequests[carpool.id].length > 0) && (
                          <Button 
                            size="sm" 
                            onClick={() => onRequestSpot(carpool.id)}
                            className="mt-1"
                          >
                            Request Spot
                          </Button>
                        )}
                        
                        {onRequestSpot && carpoolRequests[carpool.id] && 
                         (carpool.spacesAvailable - carpoolRequests[carpool.id].length <= 0) && (
                          <Button 
                            size="sm" 
                            disabled
                            variant="outline"
                            className="mt-1"
                          >
                            No Spots Available
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <ArrowRight className="h-5 w-5 mr-2 text-green-500" /> 
                  To Party Carpools
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center p-4 text-muted-foreground">No carpools available for the inbound journey.</p>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* FROM Party Section */}
        <div>
          {fromPartyCarpools.length > 0 ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <ArrowLeft className="h-5 w-5 mr-2 text-red-500" /> 
                  From Party Carpools
                </CardTitle>
              </CardHeader>
              <CardContent>
                {fromPartyCarpools.map((carpool: Carpool) => (
                  <div key={carpool.id} className="mb-6 border rounded-md p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">{carpool.parentName}</h4>
                        <p className="text-sm text-gray-600">
                          {carpoolRequests[carpool.id] 
                            ? `${Math.max(0, carpool.returnSpacesAvailable ? carpool.returnSpacesAvailable - carpoolRequests[carpool.id].length : 0)} of ${carpool.returnSpacesAvailable || 0} spaces available`
                            : `${carpool.returnSpacesAvailable || 0} spaces available`
                          }
                        </p>
                        
                        {/* Summary of key details */}
                        <div className="mt-3 text-sm text-gray-600 space-y-1">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-gray-400" />
                            <span>Return time: {carpool.returnCollectionTime || "Not specified"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3 text-gray-400" />
                            <span>Location: {carpool.city}, {carpool.postcode}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-3 w-3 text-gray-400" />
                            <span>Contact: {carpool.phoneNumber}</span>
                          </div>
                        </div>
                        
                        {/* Kids already in this carpool */}
                        {carpoolRequests[carpool.id]?.length > 0 && (
                          <div className="mt-3 text-sm">
                            <p className="font-medium text-gray-700">Kids in this carpool:</p>
                            <ul className="mt-1 text-gray-600">
                              {carpoolRequests[carpool.id].map(request => (
                                <CarpoolRequestItem 
                                  key={request.id}
                                  request={request}
                                  compact={true}
                                  partyGroupId={partyGroupId}
                                />
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline">View Details</Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[600px]">
                            <DialogHeader>
                              <DialogTitle>Carpool Details - {carpool.parentName}'s Car</DialogTitle>
                              <DialogDescription>
                                View detailed information and book a ride
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="grid gap-6 py-4">
                              {/* Kids already in this carpool - Moved up */}
                              {carpoolRequests[carpool.id]?.length > 0 && (
                                <div>
                                  <h4 className="font-medium mb-2">Kids Already Booked</h4>
                                  <div className="bg-gray-50 rounded-md p-3 mb-3">
                                    <ul className="space-y-2">
                                      {carpoolRequests[carpool.id].map(request => (
                                        <CarpoolRequestItem 
                                          key={request.id}
                                          request={request}
                                          partyGroupId={partyGroupId}
                                        />
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              )}
                              
                              {/* Driver Info */}
                              <div>
                                <h4 className="font-medium mb-2">Driver Information</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium w-20">Name:</span>
                                    <span>{carpool.parentName}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium w-20">Phone:</span>
                                    <span>{carpool.phoneNumber}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium w-20">Address:</span>
                                    <span>{carpool.address}, {carpool.city}, {carpool.postcode}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <Separator />
                              
                              {/* Map Section */}
                              <div>
                                <h4 className="font-medium mb-2">Drop-off Location</h4>
                                <LocationMapWrapper 
                                  id={carpool.id}
                                  parentName={carpool.parentName}
                                  address={carpool.address}
                                  city={carpool.city}
                                  postcode={carpool.postcode}
                                  height="250px"
                                  type="dropoff"
                                />
                              </div>
                              
                              <Separator />
                              
                              {/* Delete Carpool Button */}
                              <div className="flex justify-end">
                                <DeleteCarpoolButton 
                                  carpool={carpool}
                                  variant="destructive"
                                  partyGroupId={partyGroupId}
                                />
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        {onRequestSpot && carpoolRequests[carpool.id] && 
                         carpool.returnSpacesAvailable && 
                         (carpool.returnSpacesAvailable - carpoolRequests[carpool.id].length > 0) && (
                          <Button 
                            size="sm" 
                            onClick={() => onRequestSpot(carpool.id)}
                            className="mt-1"
                          >
                            Request Spot
                          </Button>
                        )}
                        
                        {onRequestSpot && carpoolRequests[carpool.id] && 
                         (!carpool.returnSpacesAvailable || carpool.returnSpacesAvailable - carpoolRequests[carpool.id].length <= 0) && (
                          <Button 
                            size="sm" 
                            disabled
                            variant="outline"
                            className="mt-1"
                          >
                            No Spots Available
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-lg">
                  <ArrowLeft className="h-5 w-5 mr-2 text-red-500" /> 
                  From Party Carpools
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center p-4 text-muted-foreground">No carpools available for the return journey.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}