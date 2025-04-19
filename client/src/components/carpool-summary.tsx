import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCarpoolsByPartyGroupId } from "@/api/partyGroups";
import { getCarpoolRequests } from "@/api/carpools";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { MapPin, Clock, Phone, ArrowRight, ArrowLeft, User } from "lucide-react";
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
    
    // Set up interval to refresh data every 5 seconds
    const intervalId = setInterval(fetchAllRequests, 5000);
    
    // Clean up interval when component unmounts
    return () => clearInterval(intervalId);
  }, [carpools]);
  
  if (isLoadingCarpools) {
    return (
      <div className="flex justify-center my-8">
        <Spinner />
      </div>
    );
  }
  
  if (!carpools) {
    return (
      <div className="my-8">
        <p className="text-center text-gray-500">No carpools available.</p>
      </div>
    );
  }
  
  const carpoolsArray = Array.isArray(carpools) ? carpools : [];
  
  // Separate carpools that are both ways (we'll need to treat them specially)
  const toPartyCarpools = carpoolsArray.filter((c: Carpool) => c.canPickup || c.canBoth);
  const fromPartyCarpools = carpoolsArray.filter((c: Carpool) => c.canDropoff || c.canBoth);
  
  // Helper function to filter requests based on pickup/dropoff direction
  const getDirectionalRequests = (requestsArray: CarpoolRequest[], isPickup: boolean): CarpoolRequest[] => {
    if (!requestsArray) return [];
    return requestsArray.filter(req => 
      (isPickup && (req.needsPickup || req.needsBoth)) || 
      (!isPickup && (req.needsDropoff || req.needsBoth))
    );
  };
  
  // Helper function to calculate available spaces
  const calculateAvailableSpaces = (carpool: Carpool, isOutbound: boolean): number => {
    if (!carpoolRequests[carpool.id]) {
      return isOutbound ? (carpool.spacesAvailable || 0) : (carpool.returnSpacesAvailable || 0);
    }
    
    const directionalRequests = getDirectionalRequests(carpoolRequests[carpool.id], isOutbound);
    const totalSpaces = isOutbound ? (carpool.spacesAvailable || 0) : (carpool.returnSpacesAvailable || 0);
    return Math.max(0, totalSpaces - directionalRequests.length);
  };
  
  // Helper function to render dropoff location details based on preference
  const renderDropoffLocation = (carpool: Carpool, isOutbound: boolean = true) => {
    const preference = isOutbound ? carpool.outboundDropoffPreference : carpool.returnDropoffPreference;
    
    if (preference === 'venue' || preference === 'direct-home' || !preference) {
      return (
        <p>The event venue (drops off directly at venue)</p>
      );
    } else if (preference === 'my-address') {
      return (
        <p>Parent's home: {carpool.address}, {carpool.city}, {carpool.postcode}</p>
      );
    } else if (preference === 'pickup-point' || preference === 'other-location') {
      const location = isOutbound ? carpool.outboundPickupLocation : carpool.returnPickupLocation;
      const city = isOutbound ? carpool.outboundPickupLocationCity : carpool.returnPickupLocationCity;
      const postcode = isOutbound ? carpool.outboundPickupLocationPostcode : carpool.returnPickupLocationPostcode;
      
      return (
        <>
          <p>Pickup point: {location || "Specified location"}</p>
          {(city || postcode) && <p>{city || ''}{city && postcode ? ', ' : ''}{postcode || ''}</p>}
        </>
      );
    }
    
    // Default fallback
    return <p>The event venue</p>;
  };
  
  return (
    <div>
      {onBackToEvents && (
        <div className="mb-4">
          <Button variant="outline" onClick={onBackToEvents} className="mb-4">
            ← Back to Events
          </Button>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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
                          {`${calculateAvailableSpaces(carpool, true)} of ${carpool.spacesAvailable || 0} spaces available`}
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
                            <ul className="mt-1 text-gray-600 space-y-1">
                              {getDirectionalRequests(carpoolRequests[carpool.id], true).map(request => (
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
                                      {carpoolRequests[carpool.id]
                                        .filter(req => req.needsPickup || req.needsBoth)
                                        .map(request => (
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
                                    <span className="font-medium w-20">Child's Name:</span>
                                    <span>{carpool.childName}</span>
                                  </div>
                                  {carpool.emergencyContactName && (
                                    <>
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium w-20">Emergency:</span>
                                        <span>{carpool.emergencyContactName}</span>
                                      </div>
                                      {carpool.emergencyContactPhone && (
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium w-20">Emergency #:</span>
                                          <span>{carpool.emergencyContactPhone}</span>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                              
                              <Separator />
                              
                              {/* Ride Details */}
                              <div>
                                <h4 className="font-medium mb-2">Ride Details</h4>
                                <div className="space-y-3">
                                  {carpool.canPickup || carpool.canBoth ? (
                                    <div>
                                      <h5 className="text-sm font-medium flex items-center">
                                        <ArrowRight className="h-4 w-4 mr-2 text-green-500" /> 
                                        To Party
                                      </h5>
                                      <div className="ml-6 mt-1 space-y-1">
                                        <div className="flex items-center gap-1">
                                          <Clock className="h-3 w-3 text-gray-400" />
                                          <span>Target departure time: {carpool.outboundDepartureTime || "Not specified"}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <User className="h-3 w-3 text-gray-400" />
                                          <span>Spaces: {calculateAvailableSpaces(carpool, true)} of {carpool.spacesAvailable || 0} available</span>
                                        </div>
                                        
                                        <div className="flex items-center gap-1 mt-2">
                                          <MapPin className="h-3 w-3 text-gray-400" />
                                          <span className="font-medium">Pick-up from:</span>
                                        </div>
                                        <div className="ml-6 text-xs">
                                          <p>{carpool.parentName}'s home: {carpool.address}, {carpool.city}, {carpool.postcode}</p>
                                        </div>
                                        
                                        <div className="flex items-center gap-1 mt-2">
                                          <MapPin className="h-3 w-3 text-gray-400" />
                                          <span className="font-medium">Drop-off at:</span>
                                        </div>
                                        <div className="ml-6 text-xs">
                                          {renderDropoffLocation(carpool, true)}
                                        </div>
                                      </div>
                                    </div>
                                  ) : null}
                                  
                                  {carpool.canDropoff || carpool.canBoth ? (
                                    <div className="mt-2">
                                      <h5 className="text-sm font-medium flex items-center">
                                        <ArrowLeft className="h-4 w-4 mr-2 text-red-500" /> 
                                        From Party
                                      </h5>
                                      <div className="ml-6 mt-1 space-y-1">
                                        <div className="flex items-center gap-1">
                                          <Clock className="h-3 w-3 text-gray-400" />
                                          <span>Return time: {carpool.returnCollectionTime || "Not specified"}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <User className="h-3 w-3 text-gray-400" />
                                          <span>Spaces: {calculateAvailableSpaces(carpool, false)} of {carpool.returnSpacesAvailable || 0} available</span>
                                        </div>
                                        
                                        <div className="flex items-center gap-1 mt-2">
                                          <MapPin className="h-3 w-3 text-gray-400" />
                                          <span className="font-medium">Pick-up from:</span>
                                        </div>
                                        <div className="ml-6 text-xs">
                                          <p>The event venue</p>
                                          {carpool.returnPickupLocation && (
                                            <p>{carpool.returnPickupLocationCity || ''}, {carpool.returnPickupLocationPostcode || ''}</p>
                                          )}
                                        </div>
                                        
                                        <div className="flex items-center gap-1 mt-2">
                                          <MapPin className="h-3 w-3 text-gray-400" />
                                          <span className="font-medium">Drop-off at:</span>
                                        </div>
                                        <div className="ml-6 text-xs">
                                          {renderDropoffLocation(carpool, false)}
                                        </div>
                                      </div>
                                    </div>
                                  ) : null}
                                  
                                  {carpool.additionalNotes && (
                                    <div className="mt-2">
                                      <h5 className="text-sm font-medium">Additional Notes</h5>
                                      <p className="text-xs text-gray-600 mt-1">{carpool.additionalNotes}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <Separator />
                              
                              {/* Map Section */}
                              <div>
                                <h4 className="font-medium mb-2">Location Map</h4>
                                <LocationMapWrapper 
                                  id={carpool.id}
                                  parentName={carpool.parentName}
                                  address={carpool.address}
                                  city={carpool.city}
                                  postcode={carpool.postcode}
                                  height="250px"
                                  type={carpool.canPickup || carpool.canBoth ? "pickup" : "dropoff"}
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
                        
                        {onRequestSpot && calculateAvailableSpaces(carpool, true) > 0 && (
                          <Button 
                            size="sm" 
                            onClick={() => onRequestSpot(carpool.id)}
                            className="mt-1"
                          >
                            Request Spot
                          </Button>
                        )}
                        
                        {onRequestSpot && calculateAvailableSpaces(carpool, true) <= 0 && (
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
                          {`${calculateAvailableSpaces(carpool, false)} of ${carpool.returnSpacesAvailable || 0} spaces available`}
                        </p>
                        
                        {/* Summary of key details */}
                        <div className="mt-3 text-sm text-gray-600 space-y-1">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-gray-400" />
                            <span>Collection time: {carpool.returnCollectionTime || "Not specified"}</span>
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
                            <ul className="mt-1 text-gray-600 space-y-1">
                              {getDirectionalRequests(carpoolRequests[carpool.id], false).map(request => (
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
                                      {carpoolRequests[carpool.id]
                                        .filter(req => req.needsDropoff || req.needsBoth)
                                        .map(request => (
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
                                    <span className="font-medium w-20">Child's Name:</span>
                                    <span>{carpool.childName}</span>
                                  </div>
                                  {carpool.emergencyContactName && (
                                    <>
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium w-20">Emergency:</span>
                                        <span>{carpool.emergencyContactName}</span>
                                      </div>
                                      {carpool.emergencyContactPhone && (
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium w-20">Emergency #:</span>
                                          <span>{carpool.emergencyContactPhone}</span>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                              
                              <Separator />
                              
                              {/* Ride Details */}
                              <div>
                                <h4 className="font-medium mb-2">Ride Details</h4>
                                <div className="space-y-3">
                                  {carpool.canPickup || carpool.canBoth ? (
                                    <div>
                                      <h5 className="text-sm font-medium flex items-center">
                                        <ArrowRight className="h-4 w-4 mr-2 text-green-500" /> 
                                        To Party
                                      </h5>
                                      <div className="ml-6 mt-1 space-y-1">
                                        <div className="flex items-center gap-1">
                                          <Clock className="h-3 w-3 text-gray-400" />
                                          <span>Target departure time: {carpool.outboundDepartureTime || "Not specified"}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <User className="h-3 w-3 text-gray-400" />
                                          <span>Spaces: {calculateAvailableSpaces(carpool, true)} of {carpool.spacesAvailable || 0} available</span>
                                        </div>
                                        
                                        <div className="flex items-center gap-1 mt-2">
                                          <MapPin className="h-3 w-3 text-gray-400" />
                                          <span className="font-medium">Pick-up from:</span>
                                        </div>
                                        <div className="ml-6 text-xs">
                                          <p>{carpool.parentName}'s home: {carpool.address}, {carpool.city}, {carpool.postcode}</p>
                                        </div>
                                        
                                        <div className="flex items-center gap-1 mt-2">
                                          <MapPin className="h-3 w-3 text-gray-400" />
                                          <span className="font-medium">Drop-off at:</span>
                                        </div>
                                        <div className="ml-6 text-xs">
                                          {renderDropoffLocation(carpool, true)}
                                        </div>
                                      </div>
                                    </div>
                                  ) : null}
                                  
                                  {carpool.canDropoff || carpool.canBoth ? (
                                    <div className="mt-2">
                                      <h5 className="text-sm font-medium flex items-center">
                                        <ArrowLeft className="h-4 w-4 mr-2 text-red-500" /> 
                                        From Party
                                      </h5>
                                      <div className="ml-6 mt-1 space-y-1">
                                        <div className="flex items-center gap-1">
                                          <Clock className="h-3 w-3 text-gray-400" />
                                          <span>Return time: {carpool.returnCollectionTime || "Not specified"}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <User className="h-3 w-3 text-gray-400" />
                                          <span>Spaces: {calculateAvailableSpaces(carpool, false)} of {carpool.returnSpacesAvailable || 0} available</span>
                                        </div>
                                        
                                        <div className="flex items-center gap-1 mt-2">
                                          <MapPin className="h-3 w-3 text-gray-400" />
                                          <span className="font-medium">Pick-up from:</span>
                                        </div>
                                        <div className="ml-6 text-xs">
                                          <p>The event venue</p>
                                          {carpool.returnPickupLocation && (
                                            <p>{carpool.returnPickupLocationCity || ''}, {carpool.returnPickupLocationPostcode || ''}</p>
                                          )}
                                        </div>
                                        
                                        <div className="flex items-center gap-1 mt-2">
                                          <MapPin className="h-3 w-3 text-gray-400" />
                                          <span className="font-medium">Drop-off at:</span>
                                        </div>
                                        <div className="ml-6 text-xs">
                                          {renderDropoffLocation(carpool, false)}
                                        </div>
                                      </div>
                                    </div>
                                  ) : null}
                                  
                                  {carpool.additionalNotes && (
                                    <div className="mt-2">
                                      <h5 className="text-sm font-medium">Additional Notes</h5>
                                      <p className="text-xs text-gray-600 mt-1">{carpool.additionalNotes}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <Separator />
                              
                              {/* Map Section */}
                              <div>
                                <h4 className="font-medium mb-2">Location Map</h4>
                                <LocationMapWrapper 
                                  id={carpool.id}
                                  parentName={carpool.parentName}
                                  address={carpool.address}
                                  city={carpool.city}
                                  postcode={carpool.postcode}
                                  height="250px"
                                  type={carpool.canPickup || carpool.canBoth ? "pickup" : "dropoff"}
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
                        
                        {onRequestSpot && calculateAvailableSpaces(carpool, false) > 0 && (
                          <Button 
                            size="sm" 
                            onClick={() => onRequestSpot(carpool.id)}
                            className="mt-1"
                          >
                            Request Spot
                          </Button>
                        )}
                        
                        {onRequestSpot && calculateAvailableSpaces(carpool, false) <= 0 && (
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