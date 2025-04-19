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
import { MapPin, Users, Clock, Car, ArrowRight, ArrowLeft, User, Home } from "lucide-react";
import { geocodeAddress, calculateDistance } from "@/lib/geocoding";
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
          type: 'party'
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
  const [selectedTab, setSelectedTab] = useState("to-party");
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
              if (partyGroup?.partyAddress && partyGroup?.partyPostcode) {
                const partyCoordinates = await geocodeAddress(
                  partyGroup.partyAddress,
                  partyGroup.partyCity || '',
                  partyGroup.partyPostcode
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
        if (selectedTab === "to-party") return carpool.canPickup || carpool.canBoth;
        if (selectedTab === "from-party") return carpool.canDropoff || carpool.canBoth;
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
      enabled: showDetails // Only fetch when details are shown
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
                              (formData.needsPickup ? "to party" : "from party");
        
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
      if (partyGroup.partyAddress && partyGroup.partyPostcode) {
        geocodeAddress(
          partyGroup.partyAddress,
          partyGroup.partyCity,
          partyGroup.partyPostcode
        ).then(coords => {
          setPartyCoordinates(coords);
        }).catch(err => {
          console.error("Error getting party coordinates:", err);
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
                  {(carpool.canPickup || carpool.canBoth) && (
                    <Badge className="bg-green-100 text-green-800">
                      <ArrowRight className="h-3 w-3 mr-1" />
                      To Event
                    </Badge>
                  )}
                  {(carpool.canDropoff || carpool.canBoth) && (
                    <Badge className="bg-blue-100 text-blue-800">
                      <ArrowLeft className="h-3 w-3 mr-1" />
                      From Event
                    </Badge>
                  )}
                  <Badge className="bg-purple-100 text-purple-800">
                    <Users className="h-3 w-3 mr-1" />
                    {carpool.canPickup || carpool.canBoth 
                      ? (carpoolRequests?.length 
                          ? `${Math.max(0, carpool.spacesAvailable - carpoolRequests.filter((r: CarpoolRequest) => r.needsPickup || r.needsBoth).length)} of ${carpool.spacesAvailable} spaces left`
                          : `${carpool.spacesAvailable} of ${carpool.spacesAvailable} spaces left`) 
                      : (carpoolRequests?.length
                          ? `${Math.max(0, (carpool.returnSpacesAvailable || carpool.spacesAvailable) - carpoolRequests.filter((r: CarpoolRequest) => r.needsDropoff || r.needsBoth).length)} of ${carpool.returnSpacesAvailable || carpool.spacesAvailable} spaces left`
                          : `${carpool.returnSpacesAvailable || carpool.spacesAvailable} of ${carpool.returnSpacesAvailable || carpool.spacesAvailable} spaces left`)}
                  </Badge>
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
                    (carpool.canPickup || carpool.canBoth) &&
                    carpool.spacesAvailable <= carpoolRequests.filter((r: CarpoolRequest) => r.needsPickup || r.needsBoth).length ||
                    (carpool.canDropoff || carpool.canBoth) &&
                    (carpool.returnSpacesAvailable || 0) <= carpoolRequests.filter((r: CarpoolRequest) => r.needsDropoff || r.needsBoth).length
                  )
                }
              >
                {carpoolRequests?.length && 
                 ((carpool.canPickup || carpool.canBoth) && 
                 carpool.spacesAvailable <= carpoolRequests.filter((r: CarpoolRequest) => r.needsPickup || r.needsBoth).length ||
                 (carpool.canDropoff || carpool.canBoth) && 
                 (carpool.returnSpacesAvailable || 0) <= carpoolRequests.filter((r: CarpoolRequest) => r.needsDropoff || r.needsBoth).length)
                 ? "No Spots Available" : "Request Spot"}
              </Button>
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

                  <div className="space-y-2">
                    {carpool.pickupTime && (carpool.canPickup || carpool.canBoth) && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock size={16} className="text-gray-400" />
                        <span>Pickup time: {carpool.pickupTime}</span>
                      </div>
                    )}

                    {(carpool.canPickup || carpool.canBoth) && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <ArrowRight size={16} className="text-gray-400" />
                        <span>To event: {carpool.outboundDropoffPreference === 'direct-home' || carpool.outboundDropoffPreference === 'venue' ? 'Drops directly at venue' : 
                          (carpool.outboundDropoffPreference === 'my-home' || carpool.outboundDropoffPreference === 'my-address') ? `Drop off at driver's address` : 
                          carpool.outboundDropoffPreference === 'pickup-point' || carpool.outboundDropoffPreference === 'other-location' ? 'Designated pickup point' :
                          'Direct to venue'}</span>
                      </div>
                    )}

                    {(carpool.canDropoff || carpool.canBoth) && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <ArrowLeft size={16} className="text-gray-400" />
                        <span>From event: {carpool.returnDropoffPreference === 'direct-home' ? 'Drops at child\'s home' : 
                          (carpool.returnDropoffPreference === 'my-home' || carpool.returnDropoffPreference === 'my-address') ? `Drop off at driver's address` : 
                          carpool.returnDropoffPreference === 'pickup-point' || carpool.returnDropoffPreference === 'other-location' ? 'Designated pickup point' :
                          'Drops at child\'s home'}</span>
                      </div>
                    )}

                    <div className="flex flex-col gap-1 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Car size={16} className="text-gray-400" />
                        {carpool.canPickup || carpool.canBoth ? (
                          <span>
                            {carpoolRequests?.length 
                              ? `To event: ${Math.max(0, carpool.spacesAvailable - carpoolRequests.filter((r: CarpoolRequest) => r.needsPickup || r.needsBoth).length)} of ${carpool.spacesAvailable} spaces left`
                              : `To event: ${carpool.spacesAvailable} of ${carpool.spacesAvailable} spaces left`}
                          </span>
                        ) : null}
                      </div>
                      
                      {(carpool.canDropoff || carpool.canBoth) && (
                        <div className="flex items-center gap-2 ml-6">
                          {carpoolRequests?.length 
                            ? `From event: ${Math.max(0, (carpool.returnSpacesAvailable || carpool.spacesAvailable) - carpoolRequests.filter((r: CarpoolRequest) => r.needsDropoff || r.needsBoth).length)} of ${carpool.returnSpacesAvailable || carpool.spacesAvailable} spaces left`
                            : `From event: ${carpool.returnSpacesAvailable || carpool.spacesAvailable} of ${carpool.returnSpacesAvailable || carpool.spacesAvailable} spaces left`}
                        </div>
                      )}
                    </div>

                    {/* Display booked kids information */}
                    {carpoolRequests && carpoolRequests.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <h5 className="text-xs font-medium text-gray-600 mb-1">Booked Children:</h5>
                        <ul className="space-y-1">
                          {carpoolRequests.map((request: any) => (
                            <li key={request.id} className="text-xs text-gray-600 flex items-center">
                              <Users size={12} className="text-gray-400 mr-1" />
                              <span className="font-medium">{request.childName}</span>
                              <span className="text-gray-400 mx-1">•</span>
                              <span>
                                {request.needsPickup && request.needsDropoff ? "Both ways" :
                                 request.needsPickup ? "To event" : 
                                 request.needsDropoff ? "From event" : ""}
                              </span>
                              {request.specialRequirements && (
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
                              )}
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

                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                      <Input 
                        placeholder="Phone number" 
                        className="mb-4"
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                      />

                      <h5 className="font-medium text-sm mb-2">Your Address</h5>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                      <Input 
                        placeholder="Your address" 
                        className="mb-3"
                        value={formData.address}
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                      />
                    </div>

                    <div>
                      <div className="grid grid-cols-2 gap-3 mt-4">
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

                      <h5 className="font-medium text-sm mb-2 mt-4">Additional Information</h5>
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
                          Direction(s) Needed
                        </h5>
                        <p className="text-xs text-gray-500 mb-3">Select which direction(s) you need:</p>
                        
                        <div className="space-y-2">
                          {(carpool.canPickup || carpool.canBoth) && (
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
                                To party (pickup)
                              </label>
                            </div>
                          )}
                          
                          {(carpool.canDropoff || carpool.canBoth) && (
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
                                <ArrowLeft size={14} className="text-red-500" />
                                From party (dropoff)
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
                            description: "Please select at least one direction (To party or From party)",
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
        <TabsList>
          <TabsTrigger value="to-party">
            To Party ({carpools?.filter((c: any) => c.canPickup || c.canBoth).length || 0})
          </TabsTrigger>
          <TabsTrigger value="from-party">
            From Party ({carpools?.filter((c: any) => c.canDropoff || c.canBoth).length || 0})
          </TabsTrigger>
          <TabsTrigger value="round-trip">
            To & From Party ({carpools?.filter((c: any) => c.canBoth).length || 0})
          </TabsTrigger>
          <TabsTrigger value="both">
            All Carpools ({carpools?.length || 0})
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