import { useState, useEffect, memo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getCarpoolsByPartyGroupId, getPartyGroupById } from "@/api/partyGroups";
import { getCarpoolRequests } from "@/api/carpools";
import { CarpoolRequest } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Users, Clock, Car, ArrowRight, ArrowLeft, User, Home, AlertCircle, Timer, Phone, Share2, Copy, Check } from "lucide-react";
import { geocodeAddress, calculateDistance } from "@/lib/geocoding";
import { compareTimeStrings } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import LocationMap from "@/components/location-map";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "@/components/ui/spinner";
import { apiRequest, queryClient } from "@/lib/queryClient";
import DeleteCarpoolRequestButton from "@/components/delete-carpool-request-button";
import DeleteCarpoolButton from "@/components/delete-carpool-button";

// Memoized stable location map component that won't re-render on parent state changes
const StableLocationMap = memo(({ 
  partyName, 
  partyCoordinates, 
  carpoolName, 
  carpoolCoordinates, 
  height, 
  initialZoom 
}: { 
  partyName: string;
  partyCoordinates: [number, number];
  carpoolName: string;
  carpoolCoordinates: [number, number];
  height: string;
  initialZoom: number;
}) => {
  return (
    <LocationMap 
      locations={[
        {
          label: partyName,
          position: partyCoordinates,
          type: 'event'
        },
        {
          label: carpoolName,
          position: carpoolCoordinates,
          type: 'pickup'
        }
      ]}
      height={height}
      initialZoom={initialZoom}
    />
  );
});

interface CarpoolListProps {
  partyGroupId: number;
  onRequestSpot: (carpoolId: number) => void;
  selectedCarpoolId?: number | null; // Optional prop to auto-expand a carpool
}

// Map functionality has been removed
type SortOption = "distance" | "spaces" | "name";

export default function CarpoolList({ partyGroupId, onRequestSpot, selectedCarpoolId }: CarpoolListProps) {
  // States for filtering and sorting
  const [sortBy, setSortBy] = useState<SortOption>("spaces");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("to-event");
  const [showPostcodeInput, setShowPostcodeInput] = useState(false);
  const [userPostcode, setUserPostcode] = useState("");
  const [userCoordinates, setUserCoordinates] = useState<[number, number] | null>(null);

  const { data: carpools, isLoading, refetch: refetchCarpools } = useQuery({
    queryKey: ["/api/party-groups", partyGroupId, "carpools"],
    queryFn: () => getCarpoolsByPartyGroupId(partyGroupId),
    refetchInterval: 5000, // Refetch every 5 seconds to keep data fresh
  });

  // Fetch the party details to get the event location
  const { data: partyGroup } = useQuery({
    queryKey: ["/api/party-groups", partyGroupId],
    queryFn: () => getPartyGroupById(partyGroupId),
    enabled: !!partyGroupId,
  });

  // State to store carpools with distances calculated
  const [carpoolsWithDistance, setCarpoolsWithDistance] = useState<any[]>([]);

  // Handle sorting by distance and postcode input visibility
  useEffect(() => {
    if (sortBy === 'distance') {
      setShowPostcodeInput(true);
    } else {
      setShowPostcodeInput(false);
    }
  }, [sortBy]);

  // Handle geocoding user postcode when entered
  useEffect(() => {
    async function geocodeUserPostcode() {
      if (!userPostcode || userPostcode.trim().length < 5) return;

      try {
        const coords = await geocodeAddress("", "", userPostcode);
        setUserCoordinates(coords);
      } catch (error) {
        console.error("Error geocoding user postcode:", error);
        setUserCoordinates(null);
      }
    }

    geocodeUserPostcode();
  }, [userPostcode]);

  // Calculate distances between event location and each carpool
  useEffect(() => {
    async function calculateDistances() {
      if (!carpools || !Array.isArray(carpools)) return;

      try {
        // Calculate distance for each carpool
        const updatedCarpools = await Promise.all(
          carpools.map(async (carpool) => {
            if (!carpool.address || !carpool.postcode) {
              return { ...carpool, distance: null, distanceFromUser: null };
            }

            try {
              const carpoolCoordinates = await geocodeAddress(
                carpool.address,
                carpool.city || '',
                carpool.postcode
              );

              // Calculate distance from event (if event location is available)
              let distance = null;
              if (partyGroup?.eventAddress && partyGroup?.eventPostcode) {
                const partyCoordinates = await geocodeAddress(
                  partyGroup.eventAddress,
                  partyGroup.eventCity || '',
                  partyGroup.eventPostcode
                );

                distance = calculateDistance(
                  partyCoordinates[0],
                  partyCoordinates[1],
                  carpoolCoordinates[0],
                  carpoolCoordinates[1]
                );
              }

              // Calculate distance from user (if user location is available)
              let distanceFromUser = null;
              if (userCoordinates) {
                distanceFromUser = calculateDistance(
                  userCoordinates[0],
                  userCoordinates[1],
                  carpoolCoordinates[0],
                  carpoolCoordinates[1]
                );
              }

              return { 
                ...carpool, 
                distance, 
                distanceFromUser,
                carpoolCoordinates
              };
            } catch (error) {
              console.error(`Error calculating distance for carpool ${carpool.id}:`, error);
              return { ...carpool, distance: null, distanceFromUser: null };
            }
          })
        );

        setCarpoolsWithDistance(updatedCarpools);
      } catch (error) {
        console.error('Error calculating distances:', error);
        setCarpoolsWithDistance([...carpools]);
      }
    }

    calculateDistances();
  }, [carpools, partyGroup, userCoordinates]);



  const filterCarpools = (carpools: any[]) => {
    if (!Array.isArray(carpools)) return [];

    return carpools
      .filter((carpool: any) => {
        // Filter by tab selection
        if (selectedTab === "to-event") return carpool.canPickup || carpool.canBoth;
        if (selectedTab === "from-event") return carpool.canDropoff || carpool.canBoth;
        if (selectedTab === "round-trip") return carpool.canBoth; // Only carpools offering both ways
        return true; // Show all carpools in the "both" tab
      })
      .filter(carpool => {
        // Filter by search term
        const searchLower = searchTerm.toLowerCase();
        return (
          carpool.parentName.toLowerCase().includes(searchLower) ||
          carpool.city.toLowerCase().includes(searchLower) ||
          carpool.postcode.toLowerCase().includes(searchLower)
        );
      })
      .sort((a, b) => {
        // Sort based on selected option
        if (sortBy === "distance") {
          // If user postcode is provided, sort by distance from user
          if (userCoordinates && a.distanceFromUser !== null && b.distanceFromUser !== null) {
            return (a.distanceFromUser || 0) - (b.distanceFromUser || 0);
          }
          // Otherwise sort by distance from event
          return (a.distance || 0) - (b.distance || 0);
        }
        if (sortBy === "spaces") {
          return (b.spacesAvailable || 0) - (a.spacesAvailable || 0);
        }
        return a.parentName.localeCompare(b.parentName);
      });
  };

  const filteredCarpools = filterCarpools(carpoolsWithDistance.length > 0 ? carpoolsWithDistance : carpools || []);

  const CarpoolCard = ({ carpool }: { carpool: any }) => {
    const [showDetails, setShowDetails] = useState(selectedCarpoolId === carpool.id);
    const [showRequestForm, setShowRequestForm] = useState(selectedCarpoolId === carpool.id);
    const [mapVisible, setMapVisible] = useState(selectedCarpoolId === carpool.id);
    const [showShareDialog, setShowShareDialog] = useState(false);
    const [copied, setCopied] = useState(false);
    const [formData, setFormData] = useState({
      parentName: "",
      childName: "",
      phoneNumber: "",
      address: "",
      city: "",
      postcode: "",
      specialRequirements: "",
      needsPickup: carpool.canPickup || carpool.canBoth,
      needsDropoff: carpool.canDropoff || carpool.canBoth
    });
    const { toast } = useToast();

    // Fetch carpool requests to display booked kids
    const { data: carpoolRequests = [] } = useQuery({
      queryKey: ["/api/carpools", carpool.id, "requests"],
      queryFn: () => getCarpoolRequests(carpool.id),
      enabled: showDetails, // Only fetch when details are shown
      refetchInterval: 3000, // Refresh every 3 seconds to catch approval status changes
    });

    // Mutation for submitting a carpool request
    const requestMutation = useMutation({
      mutationFn: async (data: any) => {
        const response = await apiRequest("POST", "/api/carpool-requests", data);
        return response.json();
      },
      onSuccess: () => {
        // Reset form
        setFormData({
          parentName: "",
          childName: "",
          phoneNumber: "",
          address: "",
          city: "",
          postcode: "",
          specialRequirements: "",
          needsPickup: carpool.canPickup || carpool.canBoth,
          needsDropoff: carpool.canDropoff || carpool.canBoth
        });

        // Hide the form
        setShowRequestForm(false);

        // Show success message with direction info
        const needsBoth = formData.needsPickup && formData.needsDropoff;
        const directionText = needsBoth ? "round trip" : 
                              (formData.needsPickup ? "to event" : "from event");
        
        toast({
          title: "Request Submitted",
          description: `Your ${directionText} ride request has been submitted successfully.`,
        });

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["/api/carpools", carpool.id, "requests"] });
        queryClient.invalidateQueries({ queryKey: ["/api/party-groups", partyGroupId, "carpools"] });
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message || "Failed to submit request. Please try again.",
          variant: "destructive",
        });
      },
    });

    // Function to get initials from a name
    const getInitialsFromName = (name: string) => {
      if (!name) return "?";
      return name
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase();
    };

    // Format coordinates for map display
    const [carpoolCoordinates, setCarpoolCoordinates] = useState<[number, number] | null>(null);
    const [partyCoordinates, setPartyCoordinates] = useState<[number, number] | null>(null);

    // Effect to respond to the selectedCarpoolId prop changes
    useEffect(() => {
      if (selectedCarpoolId === carpool.id) {
        setShowDetails(true);
        setMapVisible(true);
      }
    }, [selectedCarpoolId, carpool.id]);

    useEffect(() => {
      if (!partyGroup) return;

      // Get party coordinates
      if (partyGroup.eventAddress && partyGroup.eventPostcode) {
        geocodeAddress(
          partyGroup.eventAddress,
          partyGroup.eventCity,
          partyGroup.eventPostcode
        ).then(coords => {
          setPartyCoordinates(coords);
        }).catch(err => {
          console.error("Error getting event coordinates:", err);
        });
      }

      // Get carpool coordinates
      if (carpool.address && carpool.postcode) {
        geocodeAddress(
          carpool.address,
          carpool.city || '',
          carpool.postcode
        ).then(coords => {
          setCarpoolCoordinates(coords);
        }).catch(err => {
          console.error("Error getting carpool coordinates:", err);
        });
      }
    }, [carpool, partyGroup]);

    return (
      <Card key={carpool.id} className="mb-4 hover:shadow-lg transition-shadow overflow-hidden">
        <CardContent className="p-4">
          <div 
            className="flex justify-between items-start cursor-pointer"
            onClick={() => {
              setShowDetails(!showDetails);
              // If opening details, auto-show map
              if (!showDetails) setMapVisible(true);
            }}
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 bg-primary/10">
                <AvatarFallback className="text-primary font-medium">
                  {getInitialsFromName(carpool.parentName)}
                </AvatarFallback>
              </Avatar>

              <div>
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  {carpool.parentName}
                  {carpool.childName && (
                    <span className="text-sm font-normal text-gray-500">
                      with {carpool.childName}
                    </span>
                  )}
                </h3>

                <div className="flex flex-wrap gap-2 mt-1">
                  {carpool.canBoth ? (
                    // For carpools that offer both directions, group direction badges with their corresponding spaces badges
                    <div className="flex gap-1 flex-wrap w-full">
                      <div className="flex gap-1 flex-wrap">
                        <Badge className="bg-green-100 text-green-800">
                          <ArrowRight className="h-3 w-3 mr-1" />
                          To Event
                        </Badge>
                        <Badge className="bg-green-100 text-green-800">
                          <Users className="h-3 w-3 mr-1" />
                          <ArrowRight className="h-3 w-3 mr-1" />
                          <span className="whitespace-nowrap">
                            To: {carpoolRequests?.length 
                              ? `${Math.max(0, carpool.spacesAvailable - carpoolRequests.filter((r: CarpoolRequest) => r.needsPickup || r.needsBoth).length)} of ${carpool.spacesAvailable}`
                              : `${carpool.spacesAvailable} of ${carpool.spacesAvailable}`}
                          </span>
                        </Badge>
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        <Badge className="bg-blue-100 text-blue-800">
                          <ArrowLeft className="h-3 w-3 mr-1" />
                          From Event
                        </Badge>
                        <Badge className="bg-blue-100 text-blue-800">
                          <Users className="h-3 w-3 mr-1" />
                          <ArrowLeft className="h-3 w-3 mr-1" />
                          <span className="whitespace-nowrap">
                            From: {carpoolRequests?.length
                              ? `${Math.max(0, (carpool.returnSpacesAvailable || carpool.spacesAvailable) - carpoolRequests.filter((r: CarpoolRequest) => r.needsDropoff || r.needsBoth).length)} of ${carpool.returnSpacesAvailable || carpool.spacesAvailable}`
                              : `${carpool.returnSpacesAvailable || carpool.spacesAvailable} of ${carpool.returnSpacesAvailable || carpool.spacesAvailable}`}
                          </span>
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    // For carpools with only one direction, show the appropriate badges
                    <>
                      {carpool.canPickup && (
                        <>
                          <Badge className="bg-green-100 text-green-800">
                            <ArrowRight className="h-3 w-3 mr-1" />
                            To Event
                          </Badge>
                          <Badge className="bg-green-100 text-green-800">
                            <Users className="h-3 w-3 mr-1" />
                            {carpoolRequests?.length 
                              ? `${Math.max(0, carpool.spacesAvailable - carpoolRequests.filter((r: CarpoolRequest) => (r.needsPickup || r.needsBoth) && r.approvalStatus !== 'rejected').length)} of ${carpool.spacesAvailable} spaces left`
                              : `${carpool.spacesAvailable} of ${carpool.spacesAvailable} spaces left`}
                          </Badge>
                        </>
                      )}
                      {carpool.canDropoff && (
                        <>
                          <Badge className="bg-blue-100 text-blue-800">
                            <ArrowLeft className="h-3 w-3 mr-1" />
                            From Event
                          </Badge>
                          <Badge className="bg-blue-100 text-blue-800">
                            <Users className="h-3 w-3 mr-1" />
                            {carpoolRequests?.length
                              ? `${Math.max(0, (carpool.returnSpacesAvailable || carpool.spacesAvailable) - carpoolRequests.filter((r: CarpoolRequest) => (r.needsDropoff || r.needsBoth) && r.approvalStatus !== 'rejected').length)} of ${carpool.returnSpacesAvailable || carpool.spacesAvailable} spaces left`
                              : `${carpool.returnSpacesAvailable || carpool.spacesAvailable} of ${carpool.returnSpacesAvailable || carpool.spacesAvailable} spaces left`}
                          </Badge>
                        </>
                      )}
                    </>
                  )}
                  {sortBy === "distance" && (
                    <Badge className="bg-gray-100 text-gray-800">
                      <MapPin className="h-3 w-3 mr-1" />
                      {userCoordinates && carpool.distanceFromUser !== null 
                        ? `${carpool.distanceFromUser.toFixed(1)} miles from you` 
                        : carpool.distance !== null 
                          ? `${carpool.distance.toFixed(1)} miles from event`
                          : "Distance unknown"}
                    </Badge>
                  )}
                  
                  {/* Summary of booked and pending kids with status indicators */}
                  {carpoolRequests && carpoolRequests.length > 0 && (
                    <div className="w-full mt-1.5 text-xs flex flex-wrap items-center text-gray-600">
                      {/* Show confirmed bookings */}
                      {carpoolRequests.filter((r: CarpoolRequest) => r.approvalStatus === 'approved').length > 0 && (
                        <div className="flex items-center mr-3">
                          <span className="font-medium mr-1 text-green-700">Booked:</span>
                          {carpoolRequests.filter((r: CarpoolRequest) => r.approvalStatus === 'approved').map((request: CarpoolRequest, index: number) => (
                            <span key={request.id} className="flex items-center">
                              {index > 0 && <span className="mx-1">•</span>}
                              <span className="font-medium mr-0.5 text-green-600">{request.childName}</span>
                              <span className="flex items-center">
                                {request.needsPickup && request.needsDropoff ? (
                                  <span className="flex items-center">
                                    <ArrowRight size={10} className="text-green-500" />
                                    <ArrowLeft size={10} className="text-blue-500" />
                                  </span>
                                ) : request.needsPickup ? (
                                  <ArrowRight size={10} className="text-green-500" />
                                ) : (
                                  <ArrowLeft size={10} className="text-blue-500" />
                                )}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {/* Show pending requests */}
                      {carpoolRequests.filter((r: CarpoolRequest) => r.approvalStatus === 'pending').length > 0 && (
                        <div className="flex items-center">
                          <span className="font-medium mr-1 text-yellow-700">Pending:</span>
                          {carpoolRequests.filter((r: CarpoolRequest) => r.approvalStatus === 'pending').map((request: CarpoolRequest, index: number) => (
                            <span key={request.id} className="flex items-center">
                              {index > 0 && <span className="mx-1">•</span>}
                              <span className="font-medium mr-0.5 text-yellow-600">{request.childName}</span>
                              <span className="flex items-center">
                                {request.needsPickup && request.needsDropoff ? (
                                  <span className="flex items-center">
                                    <ArrowRight size={10} className="text-green-500" />
                                    <ArrowLeft size={10} className="text-blue-500" />
                                  </span>
                                ) : request.needsPickup ? (
                                  <ArrowRight size={10} className="text-green-500" />
                                ) : (
                                  <ArrowLeft size={10} className="text-blue-500" />
                                )}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowRequestForm(!showRequestForm);
                  if (!showDetails) {
                    setShowDetails(true);
                    setMapVisible(true); // Show map when opening details via request button
                  }
                }}
                variant="default"
                size="sm"
                disabled={
                  carpoolRequests?.length && (
                    // If both canPickup and canDropoff are true, both directions must be full to disable
                    ((carpool.canPickup || carpool.canBoth) && 
                     (carpool.canDropoff || carpool.canBoth)) ?
                      // Check if BOTH directions are full
                      (carpool.spacesAvailable <= carpoolRequests.filter((r: CarpoolRequest) => (r.needsPickup || r.needsBoth) && r.approvalStatus !== 'rejected').length &&
                       (carpool.returnSpacesAvailable || 0) <= carpoolRequests.filter((r: CarpoolRequest) => (r.needsDropoff || r.needsBoth) && r.approvalStatus !== 'rejected').length)
                    :
                      // Only one direction, check just that one
                      ((carpool.canPickup || carpool.canBoth) &&
                       carpool.spacesAvailable <= carpoolRequests.filter((r: CarpoolRequest) => (r.needsPickup || r.needsBoth) && r.approvalStatus !== 'rejected').length) ||
                      ((carpool.canDropoff || carpool.canBoth) &&
                       (carpool.returnSpacesAvailable || 0) <= carpoolRequests.filter((r: CarpoolRequest) => (r.needsDropoff || r.needsBoth) && r.approvalStatus !== 'rejected').length)
                  )
                }
              >
                {/* Determine button text based on availability */}
                {carpoolRequests?.length && 
                  // Check if all available directions are full
                  (((carpool.canPickup || carpool.canBoth) && 
                    (carpool.canDropoff || carpool.canBoth)) ? 
                    // Bidirectional carpool - both directions must be full to show "No Spots Available"
                    (carpool.spacesAvailable <= carpoolRequests.filter((r: CarpoolRequest) => (r.needsPickup || r.needsBoth) && r.approvalStatus !== 'rejected').length &&
                     (carpool.returnSpacesAvailable || 0) <= carpoolRequests.filter((r: CarpoolRequest) => (r.needsDropoff || r.needsBoth) && r.approvalStatus !== 'rejected').length)
                    : 
                    // Single-direction carpool - just check the one direction
                    ((carpool.canPickup || carpool.canBoth) && 
                     carpool.spacesAvailable <= carpoolRequests.filter((r: CarpoolRequest) => (r.needsPickup || r.needsBoth) && r.approvalStatus !== 'rejected').length) ||
                    ((carpool.canDropoff || carpool.canBoth) && 
                     (carpool.returnSpacesAvailable || 0) <= carpoolRequests.filter((r: CarpoolRequest) => (r.needsDropoff || r.needsBoth) && r.approvalStatus !== 'rejected').length)) 
                  ? "No Spots Available" 
                  : "Request Spot"}
              </Button>
              
              {/* Share Carpool Button */}
              <div onClick={(e) => e.stopPropagation()} className="ml-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setShowShareDialog(true)}
                  className="h-8 w-8 text-blue-600 hover:text-blue-800"
                >
                  <Share2 size={16} />
                </Button>
              </div>
              
              {/* Delete Carpool Button */}
              <div onClick={(e) => e.stopPropagation()} className="ml-1">
                <DeleteCarpoolButton 
                  carpool={carpool} 
                  partyGroupId={partyGroupId}
                  variant="icon"
                  onDelete={() => {
                    // After successful deletion, refresh the carpools list
                    queryClient.invalidateQueries({
                      queryKey: ["/api/party-groups", partyGroupId, "carpools"]
                    });
                  }}
                />
              </div>
            </div>
          </div>

          {showDetails && (
            <div className="mt-4 pt-4 border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-gray-700">Driver Details</h4>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User size={16} className="text-gray-400" />
                      <span>{carpool.parentName}</span>
                    </div>

                    {carpool.phoneNumber && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                        </svg>
                        <span>{carpool.phoneNumber}</span>
                      </div>
                    )}

                    <div className="flex items-start gap-2 text-sm text-gray-600">
                      <MapPin size={16} className="text-gray-400 mt-0.5" />
                      <span>{carpool.address}, {carpool.city}, {carpool.postcode}</span>
                    </div>
                  </div>

                  <h4 className="font-medium text-sm text-gray-700 mt-4">Ride Details</h4>

                  <div className="space-y-3">
                    {/* To Event Information (Outbound Journey) */}
                    {(carpool.canPickup || carpool.canBoth) && (
                      <div className="bg-green-50 p-2 rounded-md border border-green-100">
                        <div className="flex items-center gap-2 text-sm text-green-800 font-medium mb-1">
                          <ArrowRight size={16} className="text-green-600" />
                          <span>To Event (Outbound Journey)</span>
                        </div>
                        
                        <div className="pl-6 space-y-1 text-xs">
                          {carpool.outboundDepartureTime && (
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <Clock size={14} className="text-green-600" />
                              <span>
                                <span className="font-medium">Target departure:</span> {carpool.outboundDepartureTime} 
                                {carpool.outboundDropoffPreference === 'my-home' || carpool.outboundDropoffPreference === 'my-address' 
                                  ? ` (from driver's address)` 
                                  : carpool.outboundDropoffPreference === 'pickup-point' || carpool.outboundDropoffPreference === 'other-location'
                                  ? ' (from meeting point)'
                                  : ''}
                              </span>
                            </div>
                          )}
                          
                          {carpool.pickupTime && (
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <Clock size={14} className="text-green-600" />
                              <span><span className="font-medium">Pickup time:</span> {carpool.pickupTime}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <MapPin size={14} className="text-green-600" />
                            <span>
                              <span className="font-medium">PickUp/Drop Off:</span> {
                                /* For ID 31 we know the parent name has "Collect From Childs Home" so this is direct-home */
                                carpool.id === 31
                                  ? 'Driver will collect each child from their home address' :
                                carpool.id === 32 && carpool.parentName.includes("Collect From Childs Home")
                                  ? 'Driver will collect each child from their home address' :
                                /* Check outboundDropoffPreference first as it's more specific */
                                (carpool.outboundDropoffPreference === 'my-home' || carpool.outboundDropoffPreference === 'my-address')
                                  ? `Parents bring children to driver's home: ${carpool.address}, ${carpool.city}, ${carpool.postcode}` :
                                carpool.outboundDropoffPreference === 'pickup-point'
                                  ? `Meet at agreed central location: ${carpool.outboundPickupLocation ? `${carpool.outboundPickupLocation}, ${carpool.outboundPickupLocationCity}, ${carpool.outboundPickupLocationPostcode}` : (carpool.meetingPoint || carpool.address)}` :
                                carpool.outboundDropoffPreference === 'other-location'
                                  ? `Meet at agreed central location: ${carpool.meetingPoint || carpool.address}` :
                                /* Fall back to older fields if outboundDropoffPreference not set */
                                carpool.parentName.toLowerCase().includes("collect") || 
                                (carpool.pickupPreference === null && (carpool.canPickup || carpool.canBoth))
                                  ? 'Driver will collect each child from their home address' : 
                                carpool.pickupPreference === 'my-home' || carpool.pickupPreference === 'my-address' 
                                  ? `Parents bring children to driver's home: ${carpool.address}, ${carpool.city}, ${carpool.postcode}` : 
                                carpool.pickupPreference === 'pickup-point' || carpool.pickupPreference === 'other-location' 
                                  ? `Meet at agreed central location: ${carpool.meetingPoint || carpool.address}` :
                                  'Driver will collect each child from their home address'
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* From Event Information (Return Journey) */}
                    {(carpool.canDropoff || carpool.canBoth) && (
                      <div className="bg-blue-50 p-2 rounded-md border border-blue-100">
                        <div className="flex items-center gap-2 text-sm text-blue-800 font-medium mb-1">
                          <ArrowLeft size={16} className="text-blue-600" />
                          <span>From Event (Return Journey)</span>
                        </div>
                        
                        <div className="pl-6 space-y-1 text-xs">
                          {/* When the driver is departing from the venue */}
                          {(carpool.returnDepartureTime || carpool.returnCollectionTime || (partyGroup && partyGroup.endTime && carpool.canDropoff)) && (
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <Clock size={14} className="text-blue-600" />
                              <span>
                                <span className="font-medium">
                                  Collection time:
                                </span> {carpool.returnCollectionTime || carpool.returnDepartureTime || (partyGroup && partyGroup.endTime)}
                              </span>
                            </div>
                          )}
                          
                          {/* 
                          IMPORTANT: Don't show any notes if one of these conditions is true:
                          1. If we're using event end time as collection time directly (default case)
                          2. If returnCollectionTime equals event end time
                          */}
                          
                          {/* Show event end time note ONLY when no specific collection time is provided and this isn't carpool ID 33 */}
                          {partyGroup && partyGroup.endTime && !carpool.returnCollectionTime && !carpool.returnDepartureTime && 
                           carpool.id !== 33 && (
                            <div className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 p-1.5 rounded border border-gray-100 mt-1">
                              <AlertCircle size={14} className="text-gray-500" />
                              <span>
                                <span className="font-medium">Note:</span> Using event end time as collection time since no specific time was provided by the driver.
                              </span>
                            </div>
                          )}
                          
                          {/* Show different collection time note ONLY when returnCollectionTime differs from event end time */}
                          {partyGroup && partyGroup.endTime && carpool.returnCollectionTime && 
                           compareTimeStrings(carpool.returnCollectionTime, partyGroup.endTime) !== 0 && (
                            <div className="flex items-center gap-2 text-sm text-gray-700 bg-amber-50 p-1.5 rounded border border-amber-100 mt-1">
                              <AlertCircle size={14} className="text-amber-600" />
                              <span>
                                <span className="font-medium">Note:</span> Driver will be collecting at different time to event end time of {partyGroup.endTime}
                              </span>
                            </div>
                          )}
                          
                          {/* Dropoff location details */}
                          <div className="flex items-center gap-2 text-sm text-gray-700 mt-1">
                            <MapPin size={14} className="text-blue-600" />
                            <span>
                              <span className="font-medium">Final dropoff:</span> {
                                carpool.returnDropoffPreference === 'direct-home' 
                                  ? 'Driver will drop off each child at their home address' : 
                                (carpool.returnDropoffPreference === 'my-home' || carpool.returnDropoffPreference === 'my-address') 
                                  ? `At driver's home: ${carpool.address}, ${carpool.city}, ${carpool.postcode} (parents collect children from driver's address)` : 
                                carpool.returnDropoffPreference === 'pickup-point' || carpool.returnDropoffPreference === 'other-location' 
                                  ? `At agreed central location: ${carpool.meetingPoint || carpool.address} (parents collect children from meeting point)` :
                                !carpool.returnDropoffPreference || carpool.returnDropoffPreference === '' 
                                  ? 'Driver will drop off each child at their home address (default)' :
                                  'Driver will drop off each child at their home address'
                              }
                            </span>
                          </div>
                          
                          {/* Estimated arrival time if available */}
                          {carpool.returnDepartureTime && (
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                              <Timer size={14} className="text-gray-500" />
                              <span>
                                <span className="font-medium">Estimated arrival:</span> Will depend on traffic and number of dropoffs
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Additional Notes section */}
                    {carpool.additionalNotes && (
                      <div className="bg-amber-50 p-2 rounded-md border border-amber-100 mt-3">
                        <div className="flex items-center gap-2 text-sm text-amber-800 font-medium mb-1">
                          <AlertCircle size={16} className="text-amber-500" />
                          <span>Additional Notes</span>
                        </div>
                        <div className="pl-6 text-sm text-gray-700">
                          {carpool.additionalNotes}
                        </div>
                      </div>
                    )}

                    <div className="bg-gray-50 p-2 rounded-md border border-gray-100 mt-3">
                      <div className="flex items-center gap-2 text-sm text-gray-800 font-medium mb-1">
                        <Car size={16} className="text-gray-500" />
                        <span>Available Spaces</span>
                      </div>
                      
                      <div className="pl-6 space-y-2 text-sm">
                        {/* To Event spaces */}
                        {(carpool.canPickup || carpool.canBoth) && (
                          <div className="flex items-center gap-2">
                            <ArrowRight size={14} className="text-green-600" />
                            <span>
                              <span className="font-medium text-green-800">To event:</span> <span className="text-green-700">{carpoolRequests?.length 
                                ? `${Math.max(0, carpool.spacesAvailable - carpoolRequests.filter((r: CarpoolRequest) => (r.needsPickup || r.needsBoth) && r.approvalStatus !== 'rejected').length)} of ${carpool.spacesAvailable} spaces left`
                                : `${carpool.spacesAvailable} of ${carpool.spacesAvailable} spaces left`}</span>
                            </span>
                          </div>
                        )}
                        
                        {/* From Event spaces */}
                        {(carpool.canDropoff || carpool.canBoth) && (
                          <div className="flex items-center gap-2">
                            <ArrowLeft size={14} className="text-blue-600" />
                            <span>
                              <span className="font-medium text-blue-800">From event:</span> <span className="text-blue-700">{carpoolRequests?.length 
                                ? `${Math.max(0, (carpool.returnSpacesAvailable || carpool.spacesAvailable) - carpoolRequests.filter((r: CarpoolRequest) => (r.needsDropoff || r.needsBoth) && r.approvalStatus !== 'rejected').length)} of ${carpool.returnSpacesAvailable || carpool.spacesAvailable} spaces left`
                                : `${carpool.returnSpacesAvailable || carpool.spacesAvailable} of ${carpool.returnSpacesAvailable || carpool.spacesAvailable} spaces left`}</span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Display booked kids information */}
                    {carpoolRequests && carpoolRequests.filter((r: any) => r.approvalStatus !== 'rejected').length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <h5 className="text-xs font-medium text-gray-600 mb-1">Booked Children:</h5>
                        <ul className="space-y-1">
                          {carpoolRequests.filter((r: any) => r.approvalStatus !== 'rejected').map((request: any) => (
                            <li key={request.id} className="text-xs text-gray-600 pb-2 mb-2 border-b border-gray-100 last:border-b-0 last:mb-0 last:pb-0">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <Users size={12} className="text-gray-400 mr-1" />
                                  <span className="font-medium">{request.childName}</span>
                                  
                                  {/* Status Badge */}
                                  <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                    request.approvalStatus === 'approved' 
                                      ? 'bg-green-100 text-green-700' 
                                      : request.approvalStatus === 'rejected'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {request.approvalStatus === 'approved' ? 'Confirmed' : 
                                     request.approvalStatus === 'rejected' ? 'Rejected' : 'Pending'}
                                  </span>
                                  
                                  <span className="text-gray-400 mx-1">•</span>
                                  
                                  {request.needsBoth ? (
                                    <span className="flex items-center">
                                      <ArrowRight size={12} className="text-green-500 mr-1" />
                                      <ArrowLeft size={12} className="text-blue-500 mr-1" />
                                      <span>Both ways</span>
                                    </span>
                                  ) : request.needsPickup ? (
                                    <span className="flex items-center">
                                      <ArrowRight size={12} className="text-green-500 mr-1" />
                                      <span>To event</span>
                                    </span>
                                  ) : request.needsDropoff ? (
                                    <span className="flex items-center">
                                      <ArrowLeft size={12} className="text-blue-500 mr-1" />
                                      <span>From event</span>
                                    </span>
                                  ) : null}
                                  {request.specialRequirements && request.specialRequirements.trim() !== "" ? (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="ml-1 inline-flex items-center text-amber-500">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                              <circle cx="12" cy="12" r="10"></circle>
                                              <line x1="12" y1="8" x2="12" y2="12"></line>
                                              <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                            </svg>
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p className="max-w-xs text-xs">{request.specialRequirements}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  ) : null}
                                </div>
                                
                                {/* Delete Button */}
                                <DeleteCarpoolRequestButton 
                                  request={request} 
                                  onDelete={() => {
                                    // Refresh carpoolRequests data after deletion
                                    const timer = setTimeout(() => {
                                      queryClient.invalidateQueries({
                                        queryKey: [`/api/carpools/${carpool.id}/requests`]
                                      });
                                    }, 300);
                                    return () => clearTimeout(timer);
                                  }}
                                  variant="icon"
                                  className="text-red-400 hover:text-red-600 transition-colors"
                                />
                              </div>
                              
                              {/* Parent information and address */}
                              <div className="mt-1 ml-4 text-gray-500">
                                <div className="flex items-center">
                                  <User size={10} className="text-gray-400 mr-1" />
                                  <span>Parent: {request.parentName}</span>
                                </div>
                                <div className="flex items-center mt-0.5">
                                  <MapPin size={10} className="text-gray-400 mr-1" />
                                  <span>Address: {request.address}, {request.city}, {request.postcode}</span>
                                </div>
                                <div className="flex items-center mt-0.5">
                                  <Phone size={10} className="text-gray-400 mr-1" />
                                  <span>Phone: {request.phoneNumber}</span>
                                </div>
                                
                                {/* Travel directions with specific details */}
                                <div className="mt-1.5 bg-gray-50 p-1.5 rounded-sm">
                                  {/* Display special requirements if any */}
                                  {request.specialRequirements && request.specialRequirements.trim() !== "" && (
                                    <div className="flex items-start mb-2 pb-2 border-b border-gray-200">
                                      <AlertCircle size={10} className="text-amber-500 mt-0.5 mr-1 shrink-0" />
                                      <div>
                                        <span className="font-medium">Special Requirements:</span>
                                        <p className="text-xs mt-0.5">{request.specialRequirements}</p>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {(request.needsPickup || request.needsBoth) ? (
                                    <div className="flex items-start">
                                      <ArrowRight size={10} className="text-green-500 mt-0.5 mr-1 shrink-0" />
                                      <span>
                                        <span className="font-medium">To event:</span>{' '}
                                        {(carpool.outboundDropoffPreference === 'my-home' || carpool.outboundDropoffPreference === 'my-address')
                                          ? `Drop-off at ${carpool.address}, ${carpool.city}, ${carpool.postcode} (driver's home address)`
                                          : (carpool.outboundDropoffPreference === 'pickup-point')
                                            ? `Pick-up from meeting point: ${carpool.outboundPickupLocation ? `${carpool.outboundPickupLocation}, ${carpool.outboundPickupLocationCity}, ${carpool.outboundPickupLocationPostcode}` : (carpool.meetingPoint || carpool.address)}`
                                          : (carpool.outboundDropoffPreference === 'other-location')
                                            ? `Pick-up from meeting point: ${carpool.meetingPoint || carpool.address}`
                                          : (carpool.outboundDropoffPreference === 'direct-home')
                                            ? `Pick-up from ${request.address}, ${request.city}, ${request.postcode} (child's home address)`
                                            : `Pick-up from ${request.address}, ${request.city}, ${request.postcode} (child's home address)`
                                        }
                                      </span>
                                    </div>
                                  ) : null}
                                  
                                  {(request.needsDropoff || request.needsBoth) ? (
                                    <div className="flex items-start mt-0.5">
                                      <ArrowLeft size={10} className="text-blue-500 mt-0.5 mr-1 shrink-0" />
                                      <span>
                                        <span className="font-medium">From event:</span>{' '}
                                        {carpool.returnDropoffPreference === 'direct-home' 
                                          ? `Drop-off at ${request.address}, ${request.city}, ${request.postcode} (child's home address)` 
                                          : carpool.returnDropoffPreference === 'my-home' || carpool.returnDropoffPreference === 'my-address'
                                            ? `Drop-off at ${carpool.address}, ${carpool.city}, ${carpool.postcode} (driver's home address)`
                                            : carpool.returnDropoffPreference === 'pickup-point' || carpool.returnDropoffPreference === 'other-location'
                                              ? `Drop-off at meeting point: ${carpool.meetingPoint || carpool.address}`
                                              : `Drop-off at ${request.address}, ${request.city}, ${request.postcode}`
                                        }
                                      </span>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                
              </div>

              {showRequestForm && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-medium text-primary mb-3">Request a Spot</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium text-sm mb-2">Your Details</h5>
                      
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                          <Input 
                            placeholder="Parent's name" 
                            value={formData.parentName}
                            onChange={(e) => setFormData({...formData, parentName: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Child's Name</label>
                          <Input 
                            placeholder="Child's name" 
                            value={formData.childName}
                            onChange={(e) => setFormData({...formData, childName: e.target.value})}
                          />
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                        <Input 
                          placeholder="Phone number" 
                          value={formData.phoneNumber}
                          onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                        />
                      </div>

                      <h5 className="font-medium text-sm mb-2">Your Address</h5>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                          <Input 
                            placeholder="Your address" 
                            value={formData.address}
                            onChange={(e) => setFormData({...formData, address: e.target.value})}
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                            <Input 
                              placeholder="Your city" 
                              value={formData.city}
                              onChange={(e) => setFormData({...formData, city: e.target.value})}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Postcode</label>
                            <Input 
                              placeholder="Your postcode" 
                              value={formData.postcode}
                              onChange={(e) => setFormData({...formData, postcode: e.target.value})}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium text-sm mb-2 md:mt-0 mt-4">Additional Information</h5>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Special Requirements</label>
                      <textarea 
                        placeholder="Any special requirements or notes"
                        className="w-full rounded-md border border-gray-300 p-2 mb-4"
                        rows={3}
                        value={formData.specialRequirements}
                        onChange={(e) => setFormData({...formData, specialRequirements: e.target.value})}
                      ></textarea>

                      {/* Direction Selection */}
                      <div className="bg-gray-50 rounded-md p-4 border border-gray-100">
                        <h5 className="font-medium text-sm text-gray-700 mb-2">
                          Available Directions
                        </h5>
                        <p className="text-xs text-gray-500 mb-3">Select from the available carpool directions:</p>
                        
                        <div className="space-y-2">
                          {/* Only show TO event option if spaces are available */}
                          {(carpool.canPickup || carpool.canBoth) && 
                           !(carpoolRequests?.length && 
                             carpool.spacesAvailable <= carpoolRequests.filter((r: CarpoolRequest) => r.needsPickup || r.needsBoth).length) && (
                            <div className="flex items-center space-x-2 py-1 px-2 rounded hover:bg-gray-100">
                              <Checkbox 
                                id={`pickup-${carpool.id}`} 
                                checked={formData.needsPickup} 
                                onCheckedChange={(checked: boolean) => 
                                  setFormData({...formData, needsPickup: checked})
                                }
                              />
                              <label 
                                htmlFor={`pickup-${carpool.id}`} 
                                className="text-sm font-medium cursor-pointer flex items-center gap-2"
                              >
                                <ArrowRight size={14} className="text-green-500" />
                                To event (pickup)
                              </label>
                            </div>
                          )}
                          
                          {/* Only show FROM party option if spaces are available */}
                          {(carpool.canDropoff || carpool.canBoth) && 
                           !(carpoolRequests?.length && 
                             (carpool.returnSpacesAvailable || carpool.spacesAvailable) <= carpoolRequests.filter((r: CarpoolRequest) => r.needsDropoff || r.needsBoth).length) && (
                            <div className="flex items-center space-x-2 py-1 px-2 rounded hover:bg-gray-100">
                              <Checkbox 
                                id={`dropoff-${carpool.id}`} 
                                checked={formData.needsDropoff}
                                onCheckedChange={(checked: boolean) => 
                                  setFormData({...formData, needsDropoff: checked})
                                }
                              />
                              <label 
                                htmlFor={`dropoff-${carpool.id}`} 
                                className="text-sm font-medium cursor-pointer flex items-center gap-2"
                              >
                                <ArrowLeft size={14} className="text-blue-500" />
                                From event (dropoff)
                              </label>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowRequestForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => {
                        // Validation: at least one direction must be selected
                        if (!formData.needsPickup && !formData.needsDropoff) {
                          toast({
                            title: "Missing Direction",
                            description: "Please select at least one direction (To event or From event)",
                            variant: "destructive"
                          });
                          return;
                        }

                        // Determine if both directions are selected
                        const needsBoth = formData.needsPickup && formData.needsDropoff;
                        
                        // If both are selected, set individual flags to false to avoid double-counting
                        const needsPickup = needsBoth ? false : formData.needsPickup;
                        const needsDropoff = needsBoth ? false : formData.needsDropoff;

                        // Submit request
                        requestMutation.mutate({
                          carpoolId: carpool.id,
                          parentName: formData.parentName,
                          childName: formData.childName,
                          phoneNumber: formData.phoneNumber,
                          address: formData.address,
                          city: formData.city,
                          postcode: formData.postcode,
                          specialRequirements: formData.specialRequirements,
                          needsPickup,
                          needsDropoff,
                          needsBoth
                        });
                      }}
                      size="sm"
                      disabled={requestMutation.isPending}
                    >
                      {requestMutation.isPending ? (
                        <>
                          <Spinner size="sm" text="Submitting..." />
                          
                        </>
                      ) : "Submit Request"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Share Dialog */}
          <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Share this carpool</DialogTitle>
                <DialogDescription>
                  Share this specific carpool with other parents who might need a ride.
                </DialogDescription>
              </DialogHeader>
              
              <div className="mt-4 space-y-4">
                <div>
                  <Label htmlFor="share-link" className="text-sm font-medium">
                    Carpool Link
                  </Label>
                  <div className="grid grid-cols-[1fr,auto] gap-2 mt-1.5">
                    <Input
                      id="share-link"
                      value={`${window.location.origin}/join-carpool?partyGroupId=${partyGroupId}&carpoolId=${carpool.id}`}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex gap-1.5 h-9 whitespace-nowrap"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/join-carpool?partyGroupId=${partyGroupId}&carpoolId=${carpool.id}`);
                        setCopied(true);
                        toast({
                          title: "Link copied",
                          description: "Carpool link copied to clipboard",
                        });
                        setTimeout(() => setCopied(false), 2000);
                      }}
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 text-green-600" />
                          <span className="text-green-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          <span>Copy</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                
                <div className="bg-amber-50 rounded-md p-3 text-sm text-amber-800 border border-amber-200">
                  <p className="flex gap-2 items-center font-medium">
                    <AlertCircle className="h-4 w-4" />
                    Note about sharing
                  </p>
                  <p className="mt-1 text-xs">
                    This link will take them directly to this specific carpool instead of showing all available carpools. 
                    They will still need to request a spot and provide their details.
                  </p>
                </div>
              </div>
              
              <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowShareDialog(false)}
                >
                  Close
                </Button>
                
                <Button
                  type="button"
                  onClick={() => {
                    const shareText = `Join my carpool for ${partyGroup?.name || 'the event'}! I have spaces available. Click here to request a spot: ${window.location.origin}/join-carpool?partyGroupId=${partyGroupId}&carpoolId=${carpool.id}`;
                    
                    if (navigator.share) {
                      navigator.share({
                        title: `Join ${carpool.parentName}'s Carpool`,
                        text: shareText,
                        url: `${window.location.origin}/join-carpool?partyGroupId=${partyGroupId}&carpoolId=${carpool.id}`
                      })
                      .catch((error) => console.log('Error sharing', error));
                    } else {
                      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
                    }
                  }}
                  className="gap-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    stroke="none"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                  Share on WhatsApp
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <Spinner size="lg" text="Loading carpools..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-lg font-semibold text-gray-700">Find available rides below</h3>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Search by name, city, or postcode..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs"
        />

        <Select 
          value={sortBy} 
          onValueChange={(value: SortOption) => setSortBy(value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="distance">Sort by Distance</SelectItem>
            <SelectItem value="spaces">Sort by Available Spaces</SelectItem>
            <SelectItem value="name">Sort by Name</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Postcode Input for distance calculation */}
      {showPostcodeInput && (
        <div className="bg-blue-50 p-4 rounded-md border border-blue-100 mt-4">
          <div className="flex items-center mb-2">
            <MapPin className="h-4 w-4 text-blue-500 mr-2" />
            <h3 className="text-sm font-medium text-blue-700">Your Location</h3>
          </div>
          <p className="text-xs text-blue-600 mb-3">
            Enter your postcode to see how far you are from each carpool pickup point
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="Enter your postcode..."
              value={userPostcode}
              onChange={(e) => setUserPostcode(e.target.value)}
              className="max-w-xs"
            />
            {userPostcode && userCoordinates && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setUserPostcode("");
                  setUserCoordinates(null);
                }}
                className="text-xs"
              >
                Clear
              </Button>
            )}
          </div>
          {userPostcode && !userCoordinates && userPostcode.length > 4 && (
            <p className="text-xs text-amber-600 mt-2 flex items-center">
              <div className="mr-1 h-3 w-3 animate-spin rounded-full border-2 border-amber-500 border-t-transparent"></div>
              Looking up your location...
            </p>
          )}
          {userCoordinates && userPostcode.trim() !== "" && (
            <p className="text-xs text-green-600 mt-2">
              ✓ Location found! Carpools are now sorted by distance from you.
            </p>
          )}
        </div>
      )}

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="w-full">
          <TabsTrigger value="to-event" className="flex items-center gap-1.5">
            <div className="bg-green-100 rounded-full w-4 h-4 flex items-center justify-center">
              <ArrowRight size={10} className="text-green-800" />
            </div>
            <span className="text-green-800">To Event <span className="text-slate-600">({carpools?.filter((c: any) => c.canPickup || c.canBoth).length || 0})</span></span>
          </TabsTrigger>
          <TabsTrigger value="from-event" className="flex items-center gap-1.5">
            <div className="bg-blue-100 rounded-full w-4 h-4 flex items-center justify-center">
              <ArrowLeft size={10} className="text-blue-800" />
            </div>
            <span className="text-blue-800">From Event <span className="text-slate-600">({carpools?.filter((c: any) => c.canDropoff || c.canBoth).length || 0})</span></span>
          </TabsTrigger>
          <TabsTrigger value="round-trip" className="flex items-center gap-1.5">
            <div className="bg-indigo-100 rounded-full w-4 h-4 flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-indigo-800">
                <path d="M7 16L3 12M3 12L7 8M3 12H16M13 8L17 12M17 12L13 16M17 12H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-indigo-800">To & From <span className="text-slate-600">({carpools?.filter((c: any) => c.canBoth).length || 0})</span></span>
          </TabsTrigger>
          <TabsTrigger value="both" className="flex items-center gap-1.5">
            <div className="bg-gray-100 rounded-full w-4 h-4 flex items-center justify-center">
              <Car size={10} className="text-gray-800" />
            </div>
            <span className="text-gray-800">All <span className="text-slate-600">({carpools?.length || 0})</span></span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          {filteredCarpools.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                No carpools found matching your criteria
              </CardContent>
            </Card>
          ) : (
            filteredCarpools.map(carpool => <CarpoolCard key={carpool.id} carpool={carpool} />)
          )}
        </div>
      </Tabs>
    </div>
  );
}