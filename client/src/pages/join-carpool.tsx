import { useEffect, useState } from "react";
import { useLocation, useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getCarpoolById } from "@/api/carpools";
import { getPartyGroupById } from "@/api/partyGroups";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowLeft, Users, MapPin, CalendarClock, ChevronLeft } from "lucide-react";
import { format, isValid, parse } from "date-fns";
import CarpoolList from "@/components/carpool-list";

export default function JoinCarpoolPage() {
  const [, setLocation] = useLocation();
  const [_, params] = useRoute<{ partyGroupId?: string; carpoolId?: string }>("/join-carpool");
  
  // Parse query parameters from URL if not in route params
  const searchParams = new URLSearchParams(window.location.search);
  const partyGroupId = params?.partyGroupId || searchParams.get("partyGroupId") || "";
  const carpoolId = params?.carpoolId || searchParams.get("carpoolId") || "";
  
  const [selectedCarpoolId, setSelectedCarpoolId] = useState<number | null>(null);

  // Fetch the event details
  const { 
    data: partyGroup,
    isLoading: isLoadingPartyGroup,
    error: partyGroupError
  } = useQuery({
    queryKey: ["/api/party-groups", partyGroupId],
    queryFn: () => getPartyGroupById(Number(partyGroupId)),
    enabled: !!partyGroupId && partyGroupId !== "",
  });

  // Fetch the specific carpool if carpoolId is provided
  const {
    data: carpool,
    isLoading: isLoadingCarpool,
    error: carpoolError
  } = useQuery({
    queryKey: ["/api/carpools", carpoolId],
    queryFn: () => getCarpoolById(Number(carpoolId)),
    enabled: !!carpoolId && carpoolId !== "",
  });

  // Set selected carpool ID when data is loaded
  useEffect(() => {
    if (carpool && carpool.id) {
      setSelectedCarpoolId(carpool.id);
    }
  }, [carpool]);

  // Format date function
  const formatEventDate = (dateString: string) => {
    // Try different date formats
    const formats = ["yyyy-MM-dd", "dd/MM/yyyy", "MM/dd/yyyy"];
    
    for (const format of formats) {
      const parsedDate = parse(dateString, format, new Date());
      if (isValid(parsedDate)) {
        return parsedDate.toDateString();
      }
    }
    
    return dateString; // Return original if parsing fails
  };

  if (isLoadingPartyGroup || isLoadingCarpool) {
    return (
      <div className="container max-w-4xl py-12 flex flex-col items-center justify-center min-h-[50vh]">
        <Spinner size="lg" text="Loading..." />
      </div>
    );
  }

  if (partyGroupError || !partyGroup) {
    return (
      <div className="container max-w-4xl py-12">
        <Card className="text-center">
          <CardHeader>
            <CardTitle>Event Not Found</CardTitle>
            <CardDescription>
              The event you're looking for doesn't exist or has been removed.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button onClick={() => setLocation("/")}>
              Go Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Button 
        variant="ghost" 
        size="sm" 
        className="mb-6"
        onClick={() => setLocation(`/events/${partyGroup.shareableUrl}`)}
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to event
      </Button>

      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">{partyGroup.name}</h1>
        <div className="flex flex-wrap gap-2 mb-3">
          {partyGroup.eventDate && (
            <Badge variant="outline" className="flex items-center gap-1 px-2 py-1">
              <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{formatEventDate(partyGroup.eventDate)}</span>
              {partyGroup.targetArrivalTime && partyGroup.endTime && (
                <span className="text-muted-foreground ml-1">
                  {partyGroup.targetArrivalTime} - {partyGroup.endTime}
                </span>
              )}
            </Badge>
          )}
          {partyGroup.eventAddress && (
            <Badge variant="outline" className="flex items-center gap-1 px-2 py-1">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <span>
                {partyGroup.eventAddress}, {partyGroup.eventPostcode}
              </span>
            </Badge>
          )}
        </div>
      </div>

      {carpoolId && carpool ? (
        <div className="space-y-6">
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-blue-800">You've been invited to join a specific carpool</CardTitle>
              <CardDescription>
                You're viewing a carpool offered by {carpool.parentName}. You can request a spot in this carpool or browse other available carpools below.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2 mt-2">
                {carpool.canPickup && (
                  <Badge className="bg-green-100 text-green-800">
                    <ArrowRight className="h-3 w-3 mr-1" />
                    To Event
                  </Badge>
                )}
                {carpool.canDropoff && (
                  <Badge className="bg-blue-100 text-blue-800">
                    <ArrowLeft className="h-3 w-3 mr-1" />
                    From Event
                  </Badge>
                )}
                <Badge className="bg-gray-100 text-gray-800">
                  <Users className="h-3 w-3 mr-1" />
                  {carpool.spacesAvailable} spaces available
                </Badge>
              </div>
            </CardContent>
          </Card>
          
          <CarpoolList 
            partyGroupId={Number(partyGroupId)} 
            onRequestSpot={(id) => setSelectedCarpoolId(id)}
            onOfferRide={() => setLocation(`/?partyId=${partyGroupId}`)}
            selectedCarpoolId={selectedCarpoolId}
          />
        </div>
      ) : (
        <CarpoolList 
          partyGroupId={Number(partyGroupId)} 
          onRequestSpot={(id) => setSelectedCarpoolId(id)}
          onOfferRide={() => setLocation(`/?partyId=${partyGroupId}`)}
        />
      )}
    </div>
  );
}