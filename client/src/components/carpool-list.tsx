import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCarpoolsByPartyGroupId, getPartyGroupById } from "@/api/partyGroups";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Users, Clock, Car, ArrowRight, ArrowLeft, User, Calendar, Home } from "lucide-react";
import { geocodeAddress, calculateDistance } from "@/lib/geocoding";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import LocationMap from "@/components/location-map";

interface CarpoolListProps {
  partyGroupId: number;
  onRequestSpot: (carpoolId: number) => void;
  onManageCalendar?: (carpoolId: number) => void;
}

// Map functionality has been removed
type SortOption = "distance" | "spaces" | "name";

export default function CarpoolList({ partyGroupId, onRequestSpot, onManageCalendar }: CarpoolListProps) {
  // Map view has been removed
  const [sortBy, setSortBy] = useState<SortOption>("distance");
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
            onClick={() => setShowDetails(!showDetails)}
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
                </div>
              </div>
            </div>
            
            <Button 
              onClick={(e) => {
                e.stopPropagation();
                setShowRequestForm(!showRequestForm);
                if (!showDetails) setShowDetails(true);
              }}
              className="ml-2"
              variant="default"
              size="sm"
            >
              Request Spot
            </Button>
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
                      <LocationMap 
                        locations={[
                          {
                            label: partyGroup?.name || "Event",
                            position: partyCoordinates,
                            type: 'party'
                          },
                          {
                            label: `${carpool.parentName}`,
                            position: carpoolCoordinates,
                            type: 'pickup'
                          }
                        ]}
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
                      <Input placeholder="Parent's name" className="mb-3" />
                      
                      <label className="block text-sm font-medium text-gray-700 mb-1">Child's Name</label>
                      <Input placeholder="Child's name" className="mb-3" />
                      
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                      <Input placeholder="Phone number" className="mb-3" />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Trip Type</label>
                      <select className="w-full rounded-md border border-gray-300 p-2 mb-3">
                        <option value="to">To event only</option>
                        <option value="from">From event only</option>
                        <option value="both">Both ways</option>
                      </select>
                      
                      <label className="block text-sm font-medium text-gray-700 mb-1">Special Requirements</label>
                      <textarea 
                        placeholder="Any special requirements or notes"
                        className="w-full rounded-md border border-gray-300 p-2 mb-3"
                        rows={3}
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
                        onRequestSpot(carpool.id);
                        setShowRequestForm(false);
                      }}
                      size="sm"
                    >
                      Submit Request
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

        <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
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