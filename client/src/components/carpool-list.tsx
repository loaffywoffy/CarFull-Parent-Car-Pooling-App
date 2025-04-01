import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCarpoolsByPartyGroupId } from "@/api/partyGroups";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, List, MapIcon, Users } from "lucide-react";
import CarpoolMap from "./carpool-map";

interface CarpoolListProps {
  partyGroupId: number;
  onRequestSpot: (carpoolId: number) => void;
  onManageCalendar?: (carpoolId: number) => void;
}

type ViewMode = "list" | "map";
type SortOption = "distance" | "spaces" | "name";

export default function CarpoolList({ partyGroupId, onRequestSpot, onManageCalendar }: CarpoolListProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [sortBy, setSortBy] = useState<SortOption>("distance");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("to-party");

  const { data: carpools, isLoading } = useQuery({
    queryKey: ["/api/party-groups", partyGroupId, "carpools"],
    queryFn: () => getCarpoolsByPartyGroupId(partyGroupId),
  });

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

  const filteredCarpools = filterCarpools(carpools || []);

  const renderCarpoolCard = (carpool: any) => (
    <Card key={carpool.id} className="mb-4 hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">{carpool.parentName}</h3>

            <div className="flex items-center text-sm text-gray-600 space-x-2">
              <MapPin size={16} />
              <span>{carpool.city}, {carpool.postcode}</span>
              {carpool.distance && <span className="text-primary">({carpool.distance} miles)</span>}
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge className="bg-green-100 text-green-800">
                {carpool.spacesAvailable} spaces available
              </Badge>
              {carpool.dropoffPreference && (
                <Badge className="bg-blue-100 text-blue-800">
                  {carpool.dropoffPreference === "direct-home" ? "Direct home drop-off" : 
                   carpool.dropoffPreference === "my-home" ? "Pickup from driver's home" : 
                   "Meeting point"}
                </Badge>
              )}
            </div>

            {carpool.maxDistance && (
              <p className="text-sm text-gray-600">
                Maximum distance: {carpool.maxDistance} miles
              </p>
            )}
          </div>

          <Button 
            onClick={() => onRequestSpot(carpool.id)}
            className="ml-4"
          >
            Request Spot
          </Button>
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

        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4 mr-1" /> List
          </Button>
          <Button
            variant={viewMode === "map" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("map")}
          >
            <MapIcon className="h-4 w-4 mr-1" /> Map
          </Button>
        </div>
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

        {viewMode === "list" ? (
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
        ) : (
          <div className="mt-4 h-[500px] rounded-lg overflow-hidden">
            <CarpoolMap
              carpools={filteredCarpools}
              onCarpoolSelect={onRequestSpot}
            />
          </div>
        )}
      </Tabs>
    </div>
  );
}