import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCarpoolsByPartyGroupId, getPartyGroupById } from "@/api/partyGroups";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Users, Clock, Home } from "lucide-react";
import { geocodeAddress, calculateDistance } from "@/lib/geocoding";

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

  const renderCarpoolCard = (carpool: any) => (
    <Card key={carpool.id} className="mb-4 hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">{carpool.parentName}'s Car</h3>
            
            <div className="flex flex-wrap gap-2 mb-2">
              {(carpool.canPickup || carpool.canBoth) && (
                <Badge className="bg-green-100 text-green-800">
                  To Event
                </Badge>
              )}
              {(carpool.canDropoff || carpool.canBoth) && (
                <Badge className="bg-blue-100 text-blue-800">
                  From Event
                </Badge>
              )}
              <Badge className="bg-purple-100 text-purple-800">
                {carpool.spacesAvailable} spaces available
              </Badge>
            </div>

            <div className="flex items-center text-sm text-gray-600 space-x-2">
              <MapPin size={16} />
              <span>{carpool.address}, {carpool.city}, {carpool.postcode}</span>
            </div>
            
            {carpool.distance && (
              <div className="text-sm text-primary font-medium">
                {carpool.distance} miles from event location
              </div>
            )}

            <div className="mt-2 space-y-1 text-sm">
              {carpool.childName && (
                <div className="text-gray-600">
                  Child: {carpool.childName}
                </div>
              )}
              {carpool.pickupTime && (carpool.canPickup || carpool.canBoth) && (
                <div className="text-gray-600">
                  Pickup time: {carpool.pickupTime}
                </div>
              )}
              {(carpool.canPickup || carpool.canBoth) && (
                <div className="text-gray-600">
                  To event: {carpool.outboundDropoffPreference === 'direct-home' ? 'Drops at destination' : 
                    (carpool.outboundDropoffPreference === 'my-home' || carpool.outboundDropoffPreference === 'my-address') ? 'Pickup from driver' : 
                    'Meeting point'}
                </div>
              )}
              {(carpool.canDropoff || carpool.canBoth) && (
                <div className="text-gray-600">
                  From event: {carpool.dropoffPreference === 'direct-home' ? 'Drops at your home' : 
                    (carpool.dropoffPreference === 'my-home' || carpool.dropoffPreference === 'my-address') ? 'Pickup from driver' : 
                    'Meeting point'}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button 
              onClick={() => onRequestSpot(carpool.id)}
              className="ml-4"
              variant="default"
            >
              <Users className="h-4 w-4 mr-2" />
              Request Spot
            </Button>
            {carpool.spacesAvailable <= 2 && (
              <span className="text-xs text-amber-600 whitespace-nowrap">
                Only {carpool.spacesAvailable} {carpool.spacesAvailable === 1 ? 'space' : 'spaces'} left
              </span>
            )}
            {carpool.phoneNumber && (
              <span className="text-xs text-gray-500 mt-2">
                Contact: {carpool.phoneNumber}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

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
            filteredCarpools.map(renderCarpoolCard)
          )}
        </div>
      </Tabs>
    </div>
  );
}