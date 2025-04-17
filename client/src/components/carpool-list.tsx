import { useState, useEffect, memo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getCarpoolsByPartyGroupId, getPartyGroupById } from "@/api/partyGroups";
import { getCarpoolRequests } from "@/api/carpools";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Users, Clock, Car, ArrowRight, ArrowLeft, User, Home, Loader2 } from "lucide-react";
import { geocodeAddress, calculateDistance } from "@/lib/geocoding";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import LocationMap from "@/components/location-map";
import { useToast } from "@/hooks/use-toast";
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
}

// Map functionality has been removed
type SortOption = "distance" | "spaces" | "name";

export default function CarpoolList({ partyGroupId, onRequestSpot }: CarpoolListProps) {
  // States for filtering and sorting
  const [sortBy, setSortBy] = useState<SortOption>("spaces");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("to-party");

  const { data: carpools, isLoading } = useQuery({
    queryKey: ["/api/party-groups", partyGroupId, "carpools"],
    queryFn: () => getCarpoolsByPartyGroupId(partyGroupId),
  });
  
  // Fetch the party details to get the event location
  const { data: partyGroup } = useQuery({
    queryKey: ["/api/party-groups", partyGroupId],
    queryFn: () => getPartyGroupById(partyGroupId),
    enabled: !!partyGroupId,
  });
  
  // State to store carpools with distances calculated
  const [carpoolsWithDistance, setCarpoolsWithDistance] = useState<any[]>([]);
  
  // Calculate distances between event location and each carpool
  useEffect(() => {
    async function calculateDistances() {
      if (!carpools || !Array.isArray(carpools) || !partyGroup) return;
      
      // Get party location
      if (!partyGroup.partyAddress || !partyGroup.partyPostcode) {
        setCarpoolsWithDistance([...carpools]);
        return;
      }
      
      try {
        // Get party coordinates
        const partyCoordinates = await geocodeAddress(
          partyGroup.partyAddress,
          partyGroup.partyCity,
          partyGroup.partyPostcode
        );
        
        // Calculate distance for each carpool
        const updatedCarpools = await Promise.all(
          carpools.map(async (carpool) => {
            if (!carpool.address || !carpool.postcode) {
              return { ...carpool, distance: null };
            }
            
            try {
              const carpoolCoordinates = await geocodeAddress(
                carpool.address,
                carpool.city,
                carpool.postcode
              );
              
              const distance = calculateDistance(
                partyCoordinates[0],
                partyCoordinates[1],
                carpoolCoordinates[0],
                carpoolCoordinates[1]
              );
              
              return { ...carpool, distance };
            } catch (error) {
              console.error(`Error calculating distance for carpool ${carpool.id}:`, error);
              return { ...carpool, distance: null };
            }
          })
        );
        
        setCarpoolsWithDistance(updatedCarpools);
      } catch (error) {
        console.error('Error getting party location:', error);
        setCarpoolsWithDistance([...carpools]);
      }
    }
    
    calculateDistances();
  }, [carpools, partyGroup]);



  const filterCarpools = (carpools: any[]) => {
    if (!Array.isArray(carpools)) return [];

    return carpools
      .filter((carpool: any) => {
        // Filter by tab selection
        if (selectedTab === "to-party") return carpool.canPickup || carpool.canBoth;
        if (selectedTab === "from-party") return carpool.canDropoff || carpool.canBoth;
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
    const [showDetails, setShowDetails] = useState(false);
    const [showRequestForm, setShowRequestForm] = useState(false);
    const [mapVisible, setMapVisible] = useState(false);
    const [formData, setFormData] = useState({
      parentName: "",
      childName: "",
      phoneNumber: "",
      specialRequirements: ""
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
          specialRequirements: ""
        });
        
        // Hide the form
        setShowRequestForm(false);
        
        // Show success message
        toast({
          title: "Request Submitted",
          description: "Your carpool request has been submitted successfully.",
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
                    {carpool.spacesAvailable} spaces
                  </Badge>
                  {sortBy === "distance" && carpool.distance !== null && (
                    <Badge className="bg-gray-100 text-gray-800">
                      <MapPin className="h-3 w-3 mr-1" />
                      {carpool.distance.toFixed(1)} miles
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
              >
                Request Spot
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
                        <span>To event: {carpool.outboundDropoffPreference === 'direct-home' ? 'Drops at destination' : 
                          (carpool.outboundDropoffPreference === 'my-home' || carpool.outboundDropoffPreference === 'my-address') ? 'Pickup from driver' : 
                          'Meeting point'}</span>
                      </div>
                    )}
                    
                    {(carpool.canDropoff || carpool.canBoth) && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <ArrowLeft size={16} className="text-gray-400" />
                        <span>From event: {carpool.dropoffPreference === 'direct-home' ? 'Drops at your home' : 
                          (carpool.dropoffPreference === 'my-home' || carpool.dropoffPreference === 'my-address') ? 'Pickup from driver' : 
                          'Meeting point'}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Car size={16} className="text-gray-400" />
                      <span>{carpool.spacesAvailable} spaces available</span>
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
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-sm text-gray-700">Location</h4>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setMapVisible(!mapVisible)}
                      className="h-8 px-2 text-xs"
                    >
                      {mapVisible ? "Hide Map" : "Show Map"}
                    </Button>
                  </div>
                  
                  {mapVisible && carpoolCoordinates && partyCoordinates && (
                    <div className="rounded-md border border-gray-200 overflow-hidden mt-2">
                      {/* Use React.memo-ed component to prevent re-renders */}
                      <StableLocationMap
                        partyName={partyGroup?.name || "Event"}
                        partyCoordinates={partyCoordinates}
                        carpoolName={carpool.parentName}
                        carpoolCoordinates={carpoolCoordinates}
                        height="200px"
                        initialZoom={11}
                      />
                    </div>
                  )}
                </div>
              </div>
              
              {showRequestForm && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-medium text-primary mb-3">Request a Spot</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                      <Input 
                        placeholder="Parent's name" 
                        className="mb-3"
                        value={formData.parentName}
                        onChange={(e) => setFormData({...formData, parentName: e.target.value})}
                      />
                      
                      <label className="block text-sm font-medium text-gray-700 mb-1">Child's Name</label>
                      <Input 
                        placeholder="Child's name" 
                        className="mb-3"
                        value={formData.childName}
                        onChange={(e) => setFormData({...formData, childName: e.target.value})}
                      />
                      
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                      <Input 
                        placeholder="Phone number" 
                        className="mb-3"
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                      />
                    </div>
                    
                    <div>
                      {/* Trip Type selector removed - determined by the selected carpool */}
                      
                      <label className="block text-sm font-medium text-gray-700 mb-1">Special Requirements</label>
                      <textarea 
                        placeholder="Any special requirements or notes"
                        className="w-full rounded-md border border-gray-300 p-2 mb-3"
                        rows={3}
                        value={formData.specialRequirements}
                        onChange={(e) => setFormData({...formData, specialRequirements: e.target.value})}
                      ></textarea>
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
                        // Determine trip type based on carpool capabilities
                        const needsBoth = carpool.canBoth;
                        const needsPickup = !needsBoth && carpool.canPickup;
                        const needsDropoff = !needsBoth && carpool.canDropoff;
                        
                        // Submit request
                        requestMutation.mutate({
                          carpoolId: carpool.id,
                          parentName: formData.parentName,
                          childName: formData.childName,
                          phoneNumber: formData.phoneNumber,
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
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
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
    return <div>Loading carpools...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-semibold">Available Carpools</h2>
        

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

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="to-party">
            To Party ({carpools?.filter((c: any) => c.canPickup || c.canBoth).length || 0})
          </TabsTrigger>
          <TabsTrigger value="from-party">
            From Party ({carpools?.filter((c: any) => c.canDropoff || c.canBoth).length || 0})
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