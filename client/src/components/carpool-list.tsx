import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface CarpoolListProps {
  onRequestSpot: (carpoolId: number) => void;
}

type FilterOption = "all" | "pickup" | "dropoff" | "both";

export default function CarpoolList({ onRequestSpot }: CarpoolListProps) {
  const [filter, setFilter] = useState<FilterOption>("all");
  
  const { data: carpools, isLoading } = useQuery({
    queryKey: ["/api/carpools"],
  });

  const filteredCarpools = Array.isArray(carpools) 
    ? carpools.filter((carpool: any) => {
        if (filter === "all") return true;
        if (filter === "pickup" && carpool.canPickup && !carpool.canDropoff && !carpool.canBoth) return true;
        if (filter === "dropoff" && !carpool.canPickup && carpool.canDropoff && !carpool.canBoth) return true;
        if (filter === "both" && carpool.canBoth) return true;
        return false;
      }) 
    : [];

  const handleFilterChange = (value: string) => {
    setFilter(value as FilterOption);
  };

  if (isLoading) {
    return (
      <div>
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-neutral-800">Available Carpools</h2>
          <div className="flex space-x-2">
            <Skeleton className="h-10 w-36" />
          </div>
        </div>
        
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-md p-5 mb-4 border-l-4 border-primary">
            <div className="flex flex-col md:flex-row justify-between">
              <div className="w-full">
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-44 mb-2" />
                <Skeleton className="h-4 w-48 mb-2" />
                <Skeleton className="h-4 w-36 mb-2" />
              </div>
              <div className="mt-4 md:mt-0">
                <Skeleton className="h-10 w-28" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-neutral-800">Available Carpools</h2>
        <div className="flex space-x-2">
          <Select defaultValue="all" onValueChange={handleFilterChange}>
            <SelectTrigger className="px-3 py-1 border border-neutral-300 rounded-md text-sm w-[180px]">
              <SelectValue placeholder="Filter carpools" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Carpools</SelectItem>
              <SelectItem value="pickup">Take to party only</SelectItem>
              <SelectItem value="dropoff">Pick up from party only</SelectItem>
              <SelectItem value="both">Both to and from party</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {filteredCarpools?.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-5 mb-4">
          <p className="text-center text-neutral-600">No carpools available with the selected filter.</p>
        </div>
      ) : (
        filteredCarpools?.map((carpool: any) => (
          <div key={carpool.id} className="bg-white rounded-lg shadow-md p-5 mb-4 border-l-4 border-primary">
            <div className="flex flex-col md:flex-row justify-between">
              <div>
                <h3 className="font-semibold text-lg text-neutral-800">{carpool.parentName}</h3>
                <p className="text-neutral-600 text-sm">
                  <span className="font-medium">Parent of:</span> {carpool.childName}
                </p>
                <p className="text-neutral-600 text-sm mb-2">
                  Offers: {" "}
                  {carpool.canPickup && <Badge className="bg-primary-light mr-1">Take to party</Badge>}
                  {carpool.canDropoff && <Badge className="bg-primary-light mr-1">Pick up from party</Badge>}
                  {carpool.canBoth && <Badge className="bg-primary-light">Both</Badge>}
                </p>
                <p className="text-neutral-600 text-sm">
                  <span className="font-medium">Home Location:</span> {carpool.city}, {carpool.postcode}
                </p>
                <p className="text-neutral-600 text-sm mb-2">
                  <span className="font-medium">Spaces:</span> {carpool.spacesAvailable} available
                </p>
                <p className="text-neutral-600 text-sm">
                  <span className="font-medium">Return preference:</span> {
                    carpool.dropoffPreference === "direct-home" 
                      ? "Direct to child's home" 
                      : carpool.dropoffPreference === "my-home"
                        ? "Child to be collected from my home"
                        : "Meet at another location: " + (carpool.pickupLocation || "Contact for details")
                  }
                </p>
                {carpool.additionalNotes && (
                  <p className="text-neutral-600 text-sm mt-2">
                    <span className="font-medium">Notes:</span> {carpool.additionalNotes}
                  </p>
                )}
              </div>
              <div className="mt-4 md:mt-0">
                <Button 
                  className="px-4 py-2 bg-primary text-white font-medium rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors text-sm"
                  onClick={() => onRequestSpot(carpool.id)}
                >
                  Request Spot
                </Button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
