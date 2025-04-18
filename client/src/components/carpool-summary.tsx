import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCarpoolsByPartyGroupId } from "@/api/partyGroups";
import { getCarpoolRequests } from "@/api/carpools";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { MapPin, Clock, Phone, Search, ArrowRight, ArrowLeft, Car } from "lucide-react";
import { Carpool, CarpoolRequest } from "@shared/schema";
import LocationMap from "@/components/location-map";

interface CarpoolSummaryProps {
  partyGroupId: number;
  onRequestSpot?: (carpoolId: number) => void;
  onBackToEvents?: () => void;
}

export default function CarpoolSummary({ partyGroupId, onRequestSpot, onBackToEvents }: CarpoolSummaryProps) {
  const [carpoolRequests, setCarpoolRequests] = useState<Record<number, CarpoolRequest[]>>({});
  
  // Fetch carpools for this party group
  const { data: carpools, isLoading: isLoadingCarpools } = useQuery({
    queryKey: ["/api/carpools", partyGroupId],
    queryFn: () => getCarpoolsByPartyGroupId(partyGroupId),
  });
  
  // Fetch party group details for geocoding
  const { data: partyGroup } = useQuery({
    queryKey: ["/api/party-groups", partyGroupId],
    queryFn: () => partyGroupId ? getCarpoolsByPartyGroupId(partyGroupId) : null,
    enabled: !!partyGroupId,
  });
  
  // Function to fetch latest requests for all carpools
  const fetchAllRequests = async () => {
    if (!carpools) return;
    
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
      <div className="flex justify-center items-center p-8">
        <p>Loading carpools...</p>
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
      {onBackToEvents && (
        <Button variant="outline" onClick={onBackToEvents} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Events
        </Button>
      )}
      
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
                            ? `${carpool.spacesAvailable - carpoolRequests[carpool.id].length} of ${carpool.spacesAvailable} spaces available`
                            : `${carpool.spacesAvailable} spaces available`
                          }
                        </p>
                        
                        {/* Summary of key details */}
                        <div className="mt-3 text-sm text-gray-600 space-y-1">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-gray-400" />
                            <span>Pickup time: {carpool.pickupTime || "Not specified"}</span>
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
                                <li key={request.id} className="flex items-center gap-1">
                                  • {request.childName}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      
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
                                <div className="flex items-center gap-2">
                                  <span className="font-medium w-20">Car:</span>
                                  <span>Family Car</span>
                                </div>
                              </div>
                            </div>
                            
                            <Separator />
                            
                            {/* Pickup Details */}
                            <div>
                              <h4 className="font-medium mb-2">Pickup Details</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium w-20">Time:</span>
                                  <span>{carpool.pickupTime || "Not specified"}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium w-20">Spaces:</span>
                                  <span>{carpoolRequests[carpool.id] 
                                    ? `${carpool.spacesAvailable - carpoolRequests[carpool.id].length} of ${carpool.spacesAvailable} available`
                                    : `${carpool.spacesAvailable} available`}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium w-20">Location:</span>
                                  <span>{carpool.address ? `Drop off at ${carpool.parentName}'s house (${carpool.address})` : 'Location not specified'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium w-20">Notes:</span>
                                  <span>{carpool.additionalNotes || "No additional notes"}</span>
                                </div>
                              </div>
                            </div>
                            
                            <Separator />
                            
                            {/* Map */}
                            <div>
                              <h4 className="font-medium mb-2">Location</h4>
                              <LocationMap
                                locations={[
                                  {
                                    label: `${carpool.parentName}'s Location`,
                                    position: [
                                      51.5074, // Default coordinates since the carpool doesn't have latitude/longitude
                                      -0.1278
                                    ],
                                    type: 'pickup'
                                  }
                                ]}
                                height="200px"
                                initialZoom={13}
                              />
                            </div>
                            
                            <Separator />
                            
                            {/* Book a spot button */}
                            <Button 
                              className="w-full"
                              onClick={() => onRequestSpot && onRequestSpot(carpool.id)}
                            >
                              <Search className="h-4 w-4 mr-2" /> Book This Ride
                            </Button>
                            
                            {/* Kids already in this carpool */}
                            {carpoolRequests[carpool.id]?.length > 0 && (
                              <div className="mt-2">
                                <h4 className="font-medium mb-2">Kids Already Booked</h4>
                                <ul className="space-y-1">
                                  {carpoolRequests[carpool.id].map(request => (
                                    <li key={request.id} className="text-sm flex gap-2">
                                      <span className="font-medium">{request.childName}</span>
                                      <span className="text-gray-500">
                                        - {request.address.substring(0, 20)}...
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ArrowRight className="h-5 w-5 mr-2 text-green-500" /> 
                  To Party Carpools
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center py-6 text-gray-500">No carpools available for this direction</p>
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
                  <ArrowLeft className="h-5 w-5 mr-2 text-blue-500" /> 
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
                            ? `${carpool.spacesAvailable - carpoolRequests[carpool.id].length} of ${carpool.spacesAvailable} spaces available`
                            : `${carpool.spacesAvailable} spaces available`
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
                                <li key={request.id} className="flex items-center gap-1">
                                  • {request.childName}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      
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
                                <div className="flex items-center gap-2">
                                  <span className="font-medium w-20">Car:</span>
                                  <span>Family Car</span>
                                </div>
                              </div>
                            </div>
                            
                            <Separator />
                            
                            {/* Pickup Details */}
                            <div>
                              <h4 className="font-medium mb-2">Return Details</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium w-20">Time:</span>
                                  <span>{carpool.returnCollectionTime || "Not specified"}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium w-20">Spaces:</span>
                                  <span>{carpoolRequests[carpool.id] 
                                    ? `${carpool.spacesAvailable - carpoolRequests[carpool.id].length} of ${carpool.spacesAvailable} available`
                                    : `${carpool.spacesAvailable} available`}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium w-20">Location:</span>
                                  <span>{carpool.address ? `Drop off at ${carpool.parentName}'s house (${carpool.address})` : 'Location not specified'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium w-20">Notes:</span>
                                  <span>{carpool.additionalNotes || "No additional notes"}</span>
                                </div>
                              </div>
                            </div>
                            
                            <Separator />
                            
                            {/* Map */}
                            <div>
                              <h4 className="font-medium mb-2">Location</h4>
                              <LocationMap
                                locations={[
                                  {
                                    label: `${carpool.parentName}'s Location`,
                                    position: [
                                      51.5074, // Default coordinates since the carpool doesn't have latitude/longitude
                                      -0.1278
                                    ],
                                    type: 'pickup'
                                  }
                                ]}
                                height="200px"
                                initialZoom={13}
                              />
                            </div>
                            
                            <Separator />
                            
                            {/* Book a spot button */}
                            <Button 
                              className="w-full"
                              onClick={() => onRequestSpot && onRequestSpot(carpool.id)}
                            >
                              <Search className="h-4 w-4 mr-2" /> Book This Ride
                            </Button>
                            
                            {/* Kids already in this carpool */}
                            {carpoolRequests[carpool.id]?.length > 0 && (
                              <div className="mt-2">
                                <h4 className="font-medium mb-2">Kids Already Booked</h4>
                                <ul className="space-y-1">
                                  {carpoolRequests[carpool.id].map(request => (
                                    <li key={request.id} className="text-sm flex gap-2">
                                      <span className="font-medium">{request.childName}</span>
                                      <span className="text-gray-500">
                                        - {request.address.substring(0, 20)}...
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ArrowLeft className="h-5 w-5 mr-2 text-blue-500" /> 
                  From Party Carpools
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center py-6 text-gray-500">No carpools available for this direction</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}