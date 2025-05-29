import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CarpoolOfferForm from "@/components/carpool-offer-form";
import { useLocation } from "wouter";

export default function CreateCarpoolPage() {
  const [, params] = useRoute("/events/:shareableUrl/create-carpool");
  const [, setLocation] = useLocation();
  const shareableUrl = params?.shareableUrl;

  const { data: partyGroup, isLoading } = useQuery({
    queryKey: ["/api/party-groups/by-url", shareableUrl],
    enabled: !!shareableUrl,
  });

  if (isLoading) {
    return (
      <div className="container max-w-4xl py-12 flex flex-col items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-gray-600 mt-4">Loading event...</p>
      </div>
    );
  }

  if (!partyGroup) {
    return (
      <div className="container max-w-4xl py-12">
        <Card className="text-center">
          <CardHeader>
            <CardTitle>Event Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">The event you're looking for doesn't exist.</p>
            <Button onClick={() => setLocation("/")}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <Button 
        variant="ghost" 
        size="sm" 
        className="mb-6"
        onClick={() => setLocation(`/events/${shareableUrl}`)}
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to event
      </Button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Offer a Ride</h1>
        <p className="text-gray-600">Share your car space for {partyGroup.name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Carpool Offer Details</CardTitle>
        </CardHeader>
        <CardContent>
          <CarpoolOfferForm
            partyGroupId={partyGroup.id}
            onSuccess={() => setLocation(`/events/${shareableUrl}`)}
            onCancel={() => setLocation(`/events/${shareableUrl}`)}
          />
        </CardContent>
      </Card>
    </div>
  );
}