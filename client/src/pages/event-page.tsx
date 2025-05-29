import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, MapPin, Users, Car, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import CarpoolList from "@/components/carpool-list";
import { useState } from "react";
import { getQueryFn } from "@/lib/queryClient";
import type { PartyGroup } from "@shared/schema";

export default function EventPage() {
  const params = useParams();
  const shareableUrl = params.shareableUrl;

  const { data: event, isLoading, error } = useQuery<PartyGroup>({
    queryKey: [`/api/party-groups/by-url/${shareableUrl}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!shareableUrl,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading event...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Event Not Found</h1>
          <p className="text-gray-600 mb-6">
            This event link may have expired or been removed.
          </p>
          <Link href="/">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const time = new Date();
    time.setHours(parseInt(hours), parseInt(minutes));
    return time.toLocaleTimeString('en-GB', { 
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Create Your Own Event
              </Button>
            </Link>
            <Badge variant="secondary">Shareable Event</Badge>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Event Information */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
                  {event.name}
                </CardTitle>
                <CardDescription className="text-lg">
                  Join carpools for this event - no account required
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Car className="h-6 w-6 text-blue-600" />
                <span className="text-sm font-medium text-blue-600">Carpool Event</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Date & Time */}
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Date & Time</h3>
                  <p className="text-gray-600">{formatDate(event.eventDate)}</p>
                  <p className="text-sm text-gray-500">
                    Starts at {formatTime(event.targetArrivalTime)}
                    {event.endTime && ` • Ends at ${formatTime(event.endTime)}`}
                  </p>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Location</h3>
                  <p className="text-gray-600">{event.eventAddress}</p>
                  <p className="text-sm text-gray-500">
                    {event.eventCity} {event.eventPostcode}
                  </p>
                </div>
              </div>

              {/* Organizer */}
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Organized by</h3>
                  <p className="text-gray-600">{event.createdBy}</p>
                  {event.phoneNumber && (
                    <p className="text-sm text-gray-500">{event.phoneNumber}</p>
                  )}
                </div>
              </div>
            </div>

            {event.additionalInformation && (
              <>
                <Separator className="my-6" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Additional Information</h3>
                  <p className="text-gray-600 whitespace-pre-wrap">{event.additionalInformation}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <Link href={`/?partyId=${event.id}`}>
            <Button 
              size="lg" 
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Car className="h-5 w-5 mr-2" />
              Offer a Ride
            </Button>
          </Link>
          <Button 
            variant="outline" 
            size="lg" 
            className="flex-1"
            onClick={() => {
              const carpoolSection = document.getElementById('available-carpools');
              carpoolSection?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <Users className="h-5 w-5 mr-2" />
            Browse Available Rides
          </Button>
        </div>

        {/* Available Carpools */}
        <div id="available-carpools">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Car className="h-5 w-5 mr-2" />
                Available Rides
              </CardTitle>
              <CardDescription>
                Browse rides offered by other parents and request spots
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CarpoolList 
                partyGroupId={event.id} 
                onRequestSpot={(id) => {
                  const carpoolSection = document.getElementById(`carpool-${id}`);
                  carpoolSection?.scrollIntoView({ behavior: 'smooth' });
                }}
              />
            </CardContent>
          </Card>
        </div>

        {/* Help Section */}
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="font-semibold text-blue-900 mb-2">Need Help?</h3>
              <p className="text-blue-700 text-sm">
                If you have questions about this event or need assistance with carpools, 
                contact the organizer: <span className="font-medium">{event.createdBy}</span>
                {event.phoneNumber && (
                  <span> at <span className="font-medium">{event.phoneNumber}</span></span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}