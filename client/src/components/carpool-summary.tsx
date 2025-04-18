import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCarpoolsByPartyGroupId } from "@/api/partyGroups";
import { getCarpoolRequests, deleteCarpoolRequest } from "@/api/carpools";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { MapPin, Clock, Phone, Search, ArrowRight, ArrowLeft, Car, Pencil, Trash2 } from "lucide-react";
import { Carpool, CarpoolRequest } from "@shared/schema";
import LocationMap from "@/components/location-map";
import { apiRequest } from "@/utils/api"; // Assumed import
import { toast } from "@/components/ui/toast"; // Assumed import
import CarpoolOfferForm from "@/components/carpool-offer-form"; // Assumed import
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction, AlertDialogTrigger } from "@/components/ui/alert-dialog"; // Assumed imports


interface CarpoolSummaryProps {
  partyGroupId: number;
  onRequestSpot?: (carpoolId: number) => void;
  onBackToEvents?: () => void;
  userPhoneNumber: string; // Added prop for user phone number
}

export default function CarpoolSummary({ partyGroupId, onRequestSpot, onBackToEvents, userPhoneNumber }: CarpoolSummaryProps) {
  const [carpoolRequests, setCarpoolRequests] = useState<Record<number, CarpoolRequest[]>>({});
  const queryClient = useQueryClient(); // Added useQueryClient hook

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
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button variant="destructive" size="xs" className="ml-2">
                                        Remove
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <p>Are you sure you want to remove {request.childName}?</p>
                                      <div className="flex justify-end">
                                        <Button variant="destructive" size="sm"
                                          onClick={async () => {
                                            try {
                                              await deleteCarpoolRequest(request.id);
                                              queryClient.invalidateQueries(['/api/carpools', carpool.id, 'requests']);
                                              toast({
                                                title: "Passenger removed",
                                                description: `${request.childName} has been removed from the carpool.`
                                              });
                                            } catch (error) {
                                              toast({
                                                title: "Error",
                                                description: "Failed to remove passenger. Please try again.",
                                                variant: "destructive"
                                              });
                                            }
                                          }}
                                        >
                                          Remove
                                        </Button>
                                        <Button variant="outline" size="sm">Cancel</Button>
                                      </div>
                                    </DialogContent>
                                  </Dialog>

                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Carpool Provider Actions */}
                      {carpool.phoneNumber === userPhoneNumber && (
                        <div className="mt-4 pt-4 border-t">
                          <h4 className="font-medium mb-2">Manage Your Carpool</h4>
                          <div className="flex gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit Carpool
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Edit Carpool</DialogTitle>
                                  <DialogDescription>
                                    Update your carpool details
                                  </DialogDescription>
                                </DialogHeader>
                                <CarpoolOfferForm 
                                  initialData={carpool}
                                  onSubmit={async (data) => {
                                    try {
                                      await apiRequest("PUT", `/api/carpools/${carpool.id}`, data);
                                      queryClient.invalidateQueries(['/api/party-groups', partyGroupId, 'carpools']);
                                      toast({
                                        title: "Carpool Updated",
                                        description: "Your carpool details have been updated successfully."
                                      });
                                    } catch (error) {
                                      toast({
                                        title: "Error",
                                        description: "Failed to update carpool. Please try again.",
                                        variant: "destructive"
                                      });
                                    }
                                  }}
                                />
                              </DialogContent>
                            </Dialog>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Carpool
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Carpool</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this carpool? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={async () => {
                                      try {
                                        await apiRequest("DELETE", `/api/carpools/${carpool.id}`);
                                        queryClient.invalidateQueries(['/api/party-groups', partyGroupId, 'carpools']);
                                        toast({
                                          title: "Carpool Deleted",
                                          description: "Your carpool has been deleted successfully."
                                        });
                                      } catch (error) {
                                        toast({
                                          title: "Error",
                                          description: "Failed to delete carpool. Please try again.",
                                          variant: "destructive"
                                        });
                                      }
                                    }}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      )}
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
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button variant="destructive" size="xs" className="ml-2">
                                        Remove
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <p>Are you sure you want to remove {request.childName}?</p>
                                      <div className="flex justify-end">
                                        <Button variant="destructive" size="sm"
                                          onClick={async () => {
                                            try {
                                              await deleteCarpoolRequest(request.id);
                                              queryClient.invalidateQueries(['/api/carpools', carpool.id, 'requests']);
                                              toast({
                                                title: "Passenger removed",
                                                description: `${request.childName} has been removed from the carpool.`
                                              });
                                            } catch (error) {
                                              toast({
                                                title: "Error",
                                                description: "Failed to remove passenger. Please try again.",
                                                variant: "destructive"
                                              });
                                            }
                                          }}
                                        >
                                          Remove
                                        </Button>
                                        <Button variant="outline" size="sm">Cancel</Button>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Carpool Provider Actions */}
                      {carpool.phoneNumber === userPhoneNumber && (
                        <div className="mt-4 pt-4 border-t">
                          <h4 className="font-medium mb-2">Manage Your Carpool</h4>
                          <div className="flex gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit Carpool
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Edit Carpool</DialogTitle>
                                  <DialogDescription>
                                    Update your carpool details
                                  </DialogDescription>
                                </DialogHeader>
                                <CarpoolOfferForm 
                                  initialData={carpool}
                                  onSubmit={async (data) => {
                                    try {
                                      await apiRequest("PUT", `/api/carpools/${carpool.id}`, data);
                                      queryClient.invalidateQueries(['/api/party-groups', partyGroupId, 'carpools']);
                                      toast({
                                        title: "Carpool Updated",
                                        description: "Your carpool details have been updated successfully."
                                      });
                                    } catch (error) {
                                      toast({
                                        title: "Error",
                                        description: "Failed to update carpool. Please try again.",
                                        variant: "destructive"
                                      });
                                    }
                                  }}
                                />
                              </DialogContent>
                            </Dialog>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Carpool
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Carpool</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this carpool? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={async () => {
                                      try {
                                        await apiRequest("DELETE", `/api/carpools/${carpool.id}`);
                                        queryClient.invalidateQueries(['/api/party-groups', partyGroupId, 'carpools']);
                                        toast({
                                          title: "Carpool Deleted",
                                          description: "Your carpool has been deleted successfully."
                                        });
                                      } catch (error) {
                                        toast({
                                          title: "Error",
                                          description: "Failed to delete carpool. Please try again.",
                                          variant: "destructive"
                                        });
                                      }
                                    }}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      )}
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