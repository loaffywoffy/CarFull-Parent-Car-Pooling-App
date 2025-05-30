import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, MapPin, Users, Car, ArrowLeft, Share2, Copy, CalendarPlus, Map, Edit, Trash2, Mail, MessageCircle, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Link } from "wouter";
import CarpoolList from "@/components/carpool-list";
import CalendarIntegration from "@/components/calendar-integration";
import EventMap from "@/components/event-map";
import { useState } from "react";
import { getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DeleteEventDialog } from "@/components/delete-event-dialog";
import { EditEventDialog } from "@/components/edit-event-dialog";
import type { PartyGroup } from "@shared/schema";

export default function EventPage() {
  const params = useParams();
  const shareableUrl = params.shareableUrl;
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const { data: event, isLoading, error } = useQuery<PartyGroup>({
    queryKey: [`/api/party-groups/by-url/${shareableUrl}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!shareableUrl,
  });

  console.log("Event page - shareableUrl:", shareableUrl);
  console.log("Event page - isLoading:", isLoading);
  console.log("Event page - error:", error);
  console.log("Event page - event data:", event);

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Short URL copied!",
      description: "This SMS-friendly link is perfect for text messages.",
    });
  };

  const shareViaEmail = () => {
    if (!event) return;
    const subject = encodeURIComponent(`Join carpools for ${event.name}`);
    const body = encodeURIComponent(`Hi! I'd like to invite you to join carpools for ${event.name}.\n\n📅 ${formatDate(event.eventDate)}\n⏰ ${formatTime(event.targetArrivalTime)}\n📍 ${event.eventAddress}, ${event.eventCity}\n\nView the event and find rides here: ${window.location.href}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const shareViaWhatsApp = () => {
    if (!event) return;
    const text = encodeURIComponent(`Join carpools for ${event.name}\n\n📅 ${formatDate(event.eventDate)}\n⏰ ${formatTime(event.targetArrivalTime)}\n📍 ${event.eventAddress}, ${event.eventCity}\n\n${window.location.href}`);
    window.open(`https://wa.me/?text=${text}`);
  };

  const shareViaSMS = () => {
    if (!event) return;
    const text = encodeURIComponent(`Join carpools for ${event.name}\n\n📅 ${formatDate(event.eventDate)}\n⏰ ${formatTime(event.targetArrivalTime)}\n📍 ${event.eventAddress}, ${event.eventCity}\n\n${window.location.href}`);
    window.open(`sms:?body=${text}`);
  };

  const shareNative = async () => {
    if (!event || !navigator.share) return;
    try {
      await navigator.share({
        title: event.name,
        text: `Join carpools for ${event.name}`,
        url: window.location.href,
      });
    } catch (error) {
      // User cancelled the share
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
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={() => setShowEditDialog(true)}
                  title="Edit Event"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setShowDeleteDialog(true)}
                  title="Delete Event"
                >
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
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
                
                {/* Event URL Display */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-3">
                  <div>
                    <p className="text-xs text-gray-600 mb-2">Event URL:</p>
                    <div className="flex gap-2">
                      <input 
                        readOnly 
                        value={window.location.href} 
                        className="flex-1 text-xs bg-white border border-gray-200 rounded px-2 py-1 font-mono" 
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={copyEventUrl}
                        className="shrink-0"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        {copied ? "Copied!" : "Copy"}
                      </Button>
                    </div>
                  </div>
                  
                  {event.shortCode && (
                    <div>
                      <p className="text-xs text-gray-600 mb-2">Short URL (SMS-friendly):</p>
                      <div className="flex gap-2">
                        <input 
                          readOnly 
                          value={`${window.location.origin}/s/${event.shortCode}`} 
                          className="flex-1 text-xs bg-white border border-gray-200 rounded px-2 py-1 font-mono" 
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => copyToClipboard(`${window.location.origin}/s/${event.shortCode}`)}
                          className="shrink-0"
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto"
                      >
                        <Share2 className="h-4 w-4 mr-2" />
                        Share Event
                        <ChevronDown className="h-4 w-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56">
                      <DropdownMenuItem onClick={shareViaEmail}>
                        <Mail className="h-4 w-4 mr-2 text-blue-600" />
                        Share via Email
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={shareViaWhatsApp}>
                        <MessageCircle className="h-4 w-4 mr-2 text-green-600" />
                        Share via WhatsApp
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={shareViaSMS}>
                        <MessageCircle className="h-4 w-4 mr-2 text-gray-600" />
                        Share via SMS
                      </DropdownMenuItem>
                      {navigator.share && (
                        <DropdownMenuItem onClick={shareNative}>
                          <Share2 className="h-4 w-4 mr-2 text-purple-600" />
                          Share (Native)
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TabsContent>

              <TabsContent value="location">
                <EventMap 
                  address={event.eventAddress}
                  city={event.eventCity}
                  postcode={event.eventPostcode}
                  eventName={event.name}
                />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {/* Find a Ride */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-2 mb-3">
                  <Users className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-lg">Find a Ride</h3>
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  Browse rides offered by other parents and request spots for your child
                </p>
                <Link href={`/join-carpool?partyGroupId=${event.id}`}>
                  <Button 
                    size="default" 
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Browse Available Rides
                  </Button>
                </Link>
              </div>

              {/* Offer a Ride */}
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center space-x-2 mb-3">
                  <Car className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-lg">Offer a Ride</h3>
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  Help other parents by offering rides and sharing transportation costs
                </p>
                <Link href={`/create-carpool?shareableUrl=${params?.shareableUrl}`}>
                  <Button 
                    size="default" 
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <Car className="h-4 w-4 mr-2" />
                    Create Ride Offer
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>




      </div>

      {/* Event Management Dialogs */}
      <DeleteEventDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        event={event}
        onSuccess={() => {
          // Redirect to home after successful deletion
          window.location.href = '/';
        }}
      />

      <EditEventDialog
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        event={event}
        onSuccess={() => {
          // Refresh the page data after successful edit
          window.location.reload();
        }}
      />
    </div>
  );
}