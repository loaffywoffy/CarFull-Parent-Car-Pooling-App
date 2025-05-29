import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, MapPin, Users, Car, ArrowLeft, Share2, Copy, CalendarPlus, Map, Edit, Trash2 } from "lucide-react";
import { Link } from "wouter";
import CarpoolList from "@/components/carpool-list";
import CalendarIntegration from "@/components/calendar-integration";
import EventMap from "@/components/event-map";
import { useState } from "react";
import { getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { PartyGroup } from "@shared/schema";

export default function EventPage() {
  const params = useParams();
  const shareableUrl = params.shareableUrl;
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: event, isLoading, error } = useQuery<PartyGroup>({
    queryKey: [`/api/party-groups/by-url/${shareableUrl}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!shareableUrl,
  });

  const copyEventUrl = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast({
      title: "Event URL copied!",
      description: "Share this link with parents so they can join carpools.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const shareEvent = () => {
    if (navigator.share && event) {
      navigator.share({
        title: event.name,
        text: `Join carpools for ${event.name}`,
        url: window.location.href,
      });
    } else {
      copyEventUrl();
    }
  };

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
      <div className="max-w-4xl mx-auto px-3 py-4 sm:px-4 sm:py-8">
        {/* Event Information */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2 pr-2">
                  {event.name}
                </CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Join carpools for this event - no account required
                </CardDescription>
              </div>
              <div className="flex items-center space-x-1 flex-shrink-0">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="details">Event Details</TabsTrigger>
                <TabsTrigger value="location">Location & Map</TabsTrigger>
              </TabsList>

              <TabsContent value="details">
                <div className="space-y-4 sm:space-y-6">
                  {/* Date & Time */}
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Date & Time</h3>
                      <p className="text-gray-600 text-sm sm:text-base">{formatDate(event.eventDate)}</p>
                      <p className="text-xs sm:text-sm text-gray-500">
                        Starts at {formatTime(event.targetArrivalTime)}
                        {event.endTime && ` • Ends at ${formatTime(event.endTime)}`}
                      </p>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Location</h3>
                      <p className="text-gray-600 text-sm sm:text-base">{event.eventAddress}</p>
                      <p className="text-xs sm:text-sm text-gray-500">
                        {event.eventCity} {event.eventPostcode}
                      </p>
                    </div>
                  </div>

                  {/* Organizer */}
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Users className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Organized by</h3>
                      <p className="text-gray-600 text-sm sm:text-base">{event.createdBy}</p>
                      {event.phoneNumber && (
                        <p className="text-xs sm:text-sm text-gray-500">{event.phoneNumber}</p>
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

                <Separator className="my-4 sm:my-6" />
                
                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <CalendarIntegration 
                    eventData={{
                      title: event.name,
                      startDate: event.eventDate,
                      startTime: event.targetArrivalTime,
                      endTime: event.endTime,
                      location: `${event.eventAddress}, ${event.eventCity} ${event.eventPostcode}`,
                      description: event.description || event.additionalInformation || `Join carpools for ${event.name}`
                    }}
                    buttonVariant="outline"
                    size="sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={shareEvent}
                    className="w-full sm:w-auto"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Event
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyEventUrl}
                    className="w-full sm:w-auto"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    {copied ? "Copied!" : "Copy Link"}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="location">
                <div className="bg-gray-50 p-4 sm:p-6 rounded-lg text-center">
                  <MapPin className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-600 font-medium text-sm sm:text-base">{event.eventAddress}, {event.eventCity} {event.eventPostcode}</p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-2">
                    View location in your preferred maps app
                  </p>
                  <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:gap-2 sm:justify-center">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={() => window.open(`https://maps.google.com/maps?q=${encodeURIComponent(`${event.eventAddress}, ${event.eventCity} ${event.eventPostcode}`)}`, '_blank')}
                    >
                      Google Maps
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={() => window.open(`https://maps.apple.com/?q=${encodeURIComponent(`${event.eventAddress}, ${event.eventCity} ${event.eventPostcode}`)}`, '_blank')}
                    >
                      Apple Maps
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Travel Options */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center text-lg sm:text-xl">
              <Car className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-600" />
              Travel Options
            </CardTitle>
            <CardDescription className="text-sm">
              Find a ride or offer to drive other children to this event
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 sm:space-y-6">
              {/* Find a Ride */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  <h3 className="font-semibold text-base sm:text-lg">Find a Ride</h3>
                </div>
                <p className="text-gray-600 text-xs sm:text-sm">
                  Browse rides offered by other parents and request spots for your child
                </p>
                <Link href={`/join-carpool?partyId=${event.id}`}>
                  <Button 
                    size="default" 
                    className="w-full bg-blue-600 hover:bg-blue-700 h-11 sm:h-12"
                  >
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    Browse Available Rides
                  </Button>
                </Link>
              </div>

              {/* Offer a Ride */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Car className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  <h3 className="font-semibold text-base sm:text-lg">Offer a Ride</h3>
                </div>
                <p className="text-gray-600 text-xs sm:text-sm">
                  Help other parents by offering a ride to this event. You can specify pickup/dropoff preferences and how many children you can take.
                </p>
                <Link href={`/?partyId=${event.id}`}>
                  <Button 
                    size="default" 
                    className="w-full bg-green-600 hover:bg-green-700 h-11 sm:h-12"
                  >
                    <Car className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    Create Ride Offer
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>




      </div>
    </div>
  );
}