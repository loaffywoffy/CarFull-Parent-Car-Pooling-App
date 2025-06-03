import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User, MapPin, ArrowRight, Car, ArrowLeft, Info } from "lucide-react";
import { type Carpool, type CarpoolRequest } from "@shared/schema";
import LocationMapWrapper from "./location-map-wrapper";
import { getCarpoolRequests } from "@/api/carpools";
import DeleteCarpoolButton from "./delete-carpool-button";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import CarpoolRequestsList from "./carpool-requests-list";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CarpoolRouteSummary } from "./carpool-route-summary";

interface CarpoolSummaryProps {
  partyGroupId: number;
  onRequestSpot?: (carpoolId: number) => void;
  onBackToEvents?: () => void;
}

export default function CarpoolSummary({ partyGroupId, onRequestSpot, onBackToEvents }: CarpoolSummaryProps) {
  const [carpools, setCarpools] = useState<Record<number, Carpool>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;

    async function fetchCarpools() {
      try {
        const response = await fetch(`/api/party-groups/${partyGroupId}/carpools`);
        if (!response.ok) throw new Error('Failed to fetch carpools');
        const carpoolsArray = await response.json();

        if (isMounted) {
          const carpoolsMap: Record<number, Carpool> = {};
          carpoolsArray.forEach((carpool: Carpool) => {
            carpoolsMap[carpool.id] = carpool;
          });
          setCarpools(carpoolsMap);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error fetching carpools:", error);
        if (isMounted) {
          setIsLoading(false);
          toast({
            title: "Error",
            description: "Failed to fetch carpools. Please try again.",
            variant: "destructive",
          });
        }
      }
    }

    fetchCarpools();
    const interval = setInterval(fetchCarpools, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [partyGroupId, toast]);

  const carpoolsArray = Object.values(carpools);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {carpoolsArray.map((carpool: Carpool) => (
          <Card key={carpool.id} className="overflow-hidden">
            <div className="p-4 bg-primary-50 border-b flex justify-between items-start">
              <div>
                <h3 className="font-medium">{carpool.parentName}'s car</h3>
                <p className="text-sm text-gray-600">{carpool.childName}</p>
              </div>
              <DeleteCarpoolButton
                carpool={carpool}
                variant="destructive"
                partyGroupId={partyGroupId}
              />
            </div>

            {/* Prominent Time Display Section */}
            <div className="border-b">
              {carpool.canPickup || carpool.canBoth ? (
                <div className="p-3 bg-green-50">
                  <div className="flex items-center gap-2 text-green-800">
                    <ArrowRight className="h-4 w-4" />
                    <h4 className="font-medium">To Party</h4>
                  </div>
                  <div className="ml-6 mt-1">
                    <div className="flex items-center gap-2 text-green-700">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">
                        Target departure: {carpool.outboundDepartureTime || "Not specified"}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}

              {carpool.canDropoff || carpool.canBoth ? (
                <div className="p-3 bg-blue-50">
                  <div className="flex items-center gap-2 text-blue-800">
                    <ArrowLeft className="h-4 w-4" />
                    <h4 className="font-medium">From Party</h4>
                  </div>
                  <div className="ml-6 mt-1">
                    <div className="flex items-center gap-2 text-blue-700">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">
                        Collection time: {carpool.returnCollectionTime || "Not specified"}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <CardContent className="p-4">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Passengers</h4>
                  <CarpoolRequestsList carpoolId={carpool.id} />
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">Pickup Location</h4>
                  <LocationMapWrapper
                    id={carpool.id}
                    parentName={carpool.parentName}
                    address={carpool.address}
                    city={carpool.city}
                    postcode={carpool.postcode}
                    height="200px"
                    type="pickup"
                  />
                </div>

                <div>
                  <CarpoolRouteSummary 
                    carpoolId={carpool.id}
                    eventAddress={partyGroup?.eventAddress || ""}
                    eventCity={partyGroup?.eventCity || ""}
                    eventPostcode={partyGroup?.eventPostcode || ""}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}