import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCarpoolsByPartyGroupId } from "@/api/partyGroups";
import { getCarpoolRequests } from "@/api/carpools";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { MapPin, Clock, Phone, Search, Map, ArrowRight, ArrowLeft } from "lucide-react";
import { Carpool, CarpoolRequest } from "@shared/schema";
import LocationMap from "@/components/location-map";

function CarpoolCard({ carpool, requests }: { carpool: Carpool, requests: CarpoolRequest[] }) {
  // Get the number of kids already in this carpool
  const kidsInCarpool = requests.filter(r => r.carpoolId === carpool.id).length;
  
  return (
    <div className="border rounded-lg p-4 mb-4">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h4 className="font-medium">{carpool.parentName}</h4>
          <p className="text-sm text-muted-foreground">
            {carpool.spacesAvailable - kidsInCarpool} of {carpool.spacesAvailable} spaces available
          </p>
        </div>
      </div>
      
      {/* Details */}
      <div className="mt-3 space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span>Pickup time: {carpool.pickupTime || "Not specified"}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          <span>Location: {carpool.address}, {carpool.city}</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4" />
          <span>Contact: {carpool.phoneNumber}</span>
        </div>
      </div>
      
      {/* Kids already in this carpool */}
      {kidsInCarpool > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium mb-2">Kids in this carpool:</p>
          <ul className="text-sm">
            {requests.filter(r => r.carpoolId === carpool.id).map(request => (
              <li key={request.id} className="text-muted-foreground">
                {request.childName} ({request.address}, {request.city})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

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
  
  useEffect(() => {
    // Fetch carpool requests for each carpool
    async function fetchRequests() {
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
    }
    
    fetchRequests();
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
      
      <div className="space-y-8">
        {/* TO Party Section */}
        {toPartyCarpools.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ArrowRight className="h-5 w-5 mr-2 text-green-500" /> 
                To Party Carpools
              </CardTitle>
            </CardHeader>
            <CardContent>
              {toPartyCarpools.map((carpool: Carpool) => (
                <div key={carpool.id} className="mb-6">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">{carpool.parentName}</h4>
                      <p className="text-sm text-gray-600">{carpool.spacesAvailable} spaces available</p>
                      
                      {/* Summary of key details */}
                      <div className="mt-3 text-sm text-gray-600 space-y-1">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-gray-400" />
                          <span>Pickup time: {carpool.pickupTime || "Not specified"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          <span>Pickup: {carpool.city}, {carpool.postcode}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 text-gray-400" />
                          <span>Contact: {carpool.phoneNumber}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button 
                        size="sm" 
                        variant="default"
                        onClick={() => onRequestSpot && onRequestSpot(carpool.id)}
                      >
                        <Search className="h-3 w-3 mr-1" /> Find a Ride
                      </Button>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">View Details</Button>
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
                                <div className="space-y-2 text-sm">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">Name:</span>
                                    <span>{carpool.parentName}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">Phone:</span>
                                    <span>{carpool.phoneNumber}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">Address:</span>
                                    <span>{carpool.address}, {carpool.city}, {carpool.postcode}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">Car Type:</span>
                                    <span>{carpool.carDetails || "Not specified"}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <Separator />
                              
                              {/* Pickup Details */}
                              <div>
                                <h4 className="font-medium mb-2">Pickup Details</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">Time:</span>
                                    <span>{carpool.pickupTime || "Not specified"}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">Spaces Available:</span>
                                    <span>{carpool.spacesAvailable}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">Notes:</span>
                                    <span>{carpool.notes || "No additional notes"}</span>
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
                                        carpool.latitude || 51.5074, 
                                        carpool.longitude || -0.1278
                                      ],
                                      type: 'pickup'
                                    }
                                  ]}
                                  height="200px"
                                  initialZoom={13}
                                />
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                  
                  {/* Kids already in this carpool */}
                  {carpoolRequests[carpool.id]?.length > 0 && (
                    <div className="mt-2 border-t pt-2">
                      <p className="text-sm font-medium mb-1">Kids in this carpool:</p>
                      <ul className="text-sm text-gray-600">
                        {carpoolRequests[carpool.id].map(request => (
                          <li key={request.id} className="mb-1">
                            {request.childName} ({request.childAge}y) - {request.address.substring(0, 15)}...
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* FROM Party Section */}
        {fromPartyCarpools.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ArrowLeft className="h-5 w-5 mr-2 text-blue-500" /> 
                From Party Carpools
              </CardTitle>
            </CardHeader>
            <CardContent>
              {fromPartyCarpools.map((carpool: Carpool) => (
                <div key={carpool.id} className="mb-6">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">{carpool.parentName}</h4>
                      <p className="text-sm text-gray-600">{carpool.spacesAvailable} spaces available</p>
                      
                      {/* Summary of key details */}
                      <div className="mt-3 text-sm text-gray-600 space-y-1">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-gray-400" />
                          <span>Pickup time: {carpool.pickupTime || "Not specified"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          <span>Pickup: {carpool.city}, {carpool.postcode}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 text-gray-400" />
                          <span>Contact: {carpool.phoneNumber}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button 
                        size="sm" 
                        variant="default"
                        onClick={() => onRequestSpot && onRequestSpot(carpool.id)}
                      >
                        <Search className="h-3 w-3 mr-1" /> Find a Ride
                      </Button>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">View Details</Button>
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
                                <div className="space-y-2 text-sm">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">Name:</span>
                                    <span>{carpool.parentName}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">Phone:</span>
                                    <span>{carpool.phoneNumber}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">Address:</span>
                                    <span>{carpool.address}, {carpool.city}, {carpool.postcode}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">Car Type:</span>
                                    <span>{carpool.carDetails || "Not specified"}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <Separator />
                              
                              {/* Pickup Details */}
                              <div>
                                <h4 className="font-medium mb-2">Pickup Details</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">Time:</span>
                                    <span>{carpool.pickupTime || "Not specified"}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">Spaces Available:</span>
                                    <span>{carpool.spacesAvailable}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">Notes:</span>
                                    <span>{carpool.notes || "No additional notes"}</span>
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
                                        carpool.latitude || 51.5074, 
                                        carpool.longitude || -0.1278
                                      ],
                                      type: 'pickup'
                                    }
                                  ]}
                                  height="200px"
                                  initialZoom={13}
                                />
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                  
                  {/* Kids already in this carpool */}
                  {carpoolRequests[carpool.id]?.length > 0 && (
                    <div className="mt-2 border-t pt-2">
                      <p className="text-sm font-medium mb-1">Kids in this carpool:</p>
                      <ul className="text-sm text-gray-600">
                        {carpoolRequests[carpool.id].map(request => (
                          <li key={request.id} className="mb-1">
                            {request.childName} ({request.childAge}y) - {request.address.substring(0, 15)}...
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}