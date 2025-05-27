
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CalendarIcon, MapPinIcon, ClockIcon, UserIcon, CopyIcon, 
  CheckIcon, LinkIcon, Share2Icon, CarIcon, Map as MapIcon,
  Pencil, ChevronLeft, ChevronDown, Mail, MessageSquare, Share
} from "lucide-react";
import { type PartyGroup } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import CarpoolSummary from "./carpool-summary";
import { Skeleton } from "@/components/ui/skeleton";
import LocationMap from "./location-map";
import { geocodeAddress } from "@/lib/geocoding";
import { useQueryClient } from "@tanstack/react-query";
import CalendarIntegration from "./calendar-integration";

interface PartyGroupDetailsProps {
  partyGroup: PartyGroup;
  onOfferCarpool: (partyGroupId: number) => void;
  onRequestSpot?: () => void;
  onEdit?: (partyGroupId: number) => void;
  onDeleted?: () => void;
  onBack?: () => void;
  isCreator?: boolean;
}

export default function PartyGroupDetails({ 
  partyGroup, 
  onOfferCarpool, 
  onRequestSpot,
  onEdit,
  onDeleted,
  onBack,
  isCreator = false 
}: PartyGroupDetailsProps) {
  const { toast } = useToast();
  const [copySuccess, setCopySuccess] = useState<{code: boolean, link: boolean, social: boolean}>({code: false, link: false, social: false});
  const [partyLocation, setPartyLocation] = useState<[number, number] | null>(null);
  const [isMapLoading, setIsMapLoading] = useState(true);

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadPartyLocation = async () => {
      if (partyGroup.eventAddress && partyGroup.eventPostcode) {
        try {
          setIsMapLoading(true);
          const coordinates = await geocodeAddress(
            partyGroup.eventAddress,
            partyGroup.eventCity,
            partyGroup.eventPostcode
          );
          setPartyLocation(coordinates);
        } catch (error) {
          console.error('Error loading party location:', error);
        } finally {
          setIsMapLoading(false);
        }
      }
    };

    loadPartyLocation();
  }, [partyGroup]);

  const formattedDate = new Date(partyGroup.eventDate).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const formattedEndDate = partyGroup.eventEndDate 
    ? new Date(partyGroup.eventEndDate).toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : null;

  // Create a dynamic shareableUrl that works in both development and production
  const baseUrl = window.location.origin;
  const shareableUrl = `${baseUrl}/?partyId=${partyGroup.id}`;

  const copyShareableLink = () => {
    navigator.clipboard.writeText(shareableUrl)
      .then(() => {
        setCopySuccess({...copySuccess, link: true});
        toast({
          title: "Copied!",
          description: "Shareable link copied to clipboard",
        });
        setTimeout(() => setCopySuccess(prev => ({...prev, link: false})), 2000);
      })
      .catch(() => {
        toast({
          title: "Error",
          description: "Failed to copy shareable link",
          variant: "destructive",
        });
      });
  };

  const [activeTab, setActiveTab] = useState("details");

  return (
    <Card className="w-full mb-6 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary-100 to-primary-50 pb-4">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl font-bold text-primary-900">{partyGroup.name}</CardTitle>
            <CardDescription className="text-primary-700">
              Organized by {partyGroup.createdBy}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {onBack && (
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1 bg-white hover:bg-gray-50 border-gray-200"
                onClick={onBack}
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
            )}
            {isCreator && (
              <>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8 rounded-full bg-white hover:bg-gray-100"
                  onClick={() => onEdit && onEdit(partyGroup.id)}
                  title="Edit event"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </>
            )}
            <Badge variant="outline" className="bg-white ml-1">Active</Badge>
          </div>
        </div>
      </CardHeader>
      {onBack && (
        <div className="bg-white px-6 pt-4 border-b border-gray-100">
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-1 mb-1 text-gray-600 hover:text-gray-900"
            onClick={onBack}
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back to Events</span>
          </Button>
        </div>
      )}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start px-6 pt-4 bg-white border-b">
          <TabsTrigger value="details" className="data-[state=active]:bg-primary-50">
            Details
          </TabsTrigger>
          <TabsTrigger value="map" className="data-[state=active]:bg-primary-50">
            <div className="flex items-center gap-1">
              <MapIcon className="h-4 w-4" />
              <span>Map</span>
            </div>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="pt-2 pb-0 px-0 m-0">
          <CardContent className="pt-4">
            <div className="space-y-4">
              {partyGroup.description && (
                <p className="text-gray-600 text-sm">{partyGroup.description}</p>
              )}

              {/* Event Details Grid - Optimized Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column - Date & Time */}
                <div className="space-y-4">
                  <div className="flex items-start space-x-2">
                    <CalendarIcon className="h-5 w-5 text-primary-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Date</p>
                      <p className="text-gray-600 text-sm">{formattedDate}</p>
                      {partyGroup.eventEndDate && (
                        <p className="text-gray-500 text-xs mt-1">
                          Ends: {formattedEndDate}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <ClockIcon className="h-5 w-5 text-primary-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Time</p>
                      <p className="text-gray-600 text-sm">
                        {partyGroup.targetArrivalTime}
                        {partyGroup.endTime && ` - ${partyGroup.endTime}`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Column - Location & Actions */}
                <div className="space-y-4">
                  <div className="flex items-start space-x-2">
                    <MapPinIcon className="h-5 w-5 text-primary-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Location</p>
                      <p className="text-gray-600 text-sm">
                        {partyGroup.eventAddress}, {partyGroup.eventCity}, {partyGroup.eventPostcode}
                      </p>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex flex-col gap-2">
                    <CalendarIntegration 
                      eventData={partyGroup}
                      buttonVariant="outline"
                      size="sm"
                    />
                    
                    {isCreator && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="outline"
                            size="sm"
                            className="text-blue-700 border-blue-200 hover:bg-blue-50"
                          >
                            <Share className="h-4 w-4 mr-2" />
                            Share Event
                            <ChevronDown className="h-4 w-4 ml-2" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56">
                          <DropdownMenuItem
                            onClick={() => {
                              const message = `Join "${partyGroup.name}" on ParentPooling!\n\n` +
                                `📅 Event Date: ${formattedDate}\n` +
                                `⏰ Start Time: ${partyGroup.targetArrivalTime}\n` +
                                `📍 Event Location: ${partyGroup.eventAddress}, ${partyGroup.eventCity}\n\n` +
                                `Link: ${shareableUrl}`;
                              window.open(`https://wa.me/?text=${encodeURIComponent(message)}`);
                            }}
                          >
                            <MessageSquare className="h-4 w-4 mr-2 text-green-600" />
                            Share via WhatsApp
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem
                            onClick={() => {
                              const subject = `Join "${partyGroup.name}" Event`;
                              const body = `Join "${partyGroup.name}" on ParentPooling!\n\n` +
                                `📅 Event Date: ${formattedDate}\n` +
                                `⏰ Start Time: ${partyGroup.targetArrivalTime}\n` +
                                `📍 Event Location: ${partyGroup.eventAddress}, ${partyGroup.eventCity}\n\n` +
                                `Link: ${shareableUrl}`;
                              window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
                            }}
                          >
                            <Mail className="h-4 w-4 mr-2 text-blue-600" />
                            Share via Email
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem
                            onClick={() => {
                              const message = `Join "${partyGroup.name}" on ParentPooling!\n\n` +
                                `📅 Event Date: ${formattedDate}\n` +
                                `⏰ Start Time: ${partyGroup.targetArrivalTime}\n` +
                                `📍 Event Location: ${partyGroup.eventAddress}, ${partyGroup.eventCity}\n\n` +
                                `Link: ${shareableUrl}`;
                              window.open(`sms:?body=${encodeURIComponent(message)}`);
                            }}
                          >
                            <MessageSquare className="h-4 w-4 mr-2 text-gray-600" />
                            Share via SMS
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem
                            onClick={() => {
                              if (navigator.share) {
                                navigator.share({
                                  title: `Join "${partyGroup.name}"`,
                                  text: `Join "${partyGroup.name}" on ParentPooling!\n\n📅 ${formattedDate} ⏰ ${partyGroup.targetArrivalTime}\n📍 ${partyGroup.eventAddress}, ${partyGroup.eventCity}`,
                                  url: shareableUrl
                                }).catch(console.error);
                              } else {
                                const message = `Join "${partyGroup.name}" on ParentPooling!\n\n` +
                                  `📅 Event Date: ${formattedDate}\n` +
                                  `⏰ Start Time: ${partyGroup.targetArrivalTime}\n` +
                                  `📍 Event Location: ${partyGroup.eventAddress}, ${partyGroup.eventCity}\n\n` +
                                  `Link: ${shareableUrl}`;
                                navigator.clipboard.writeText(message);
                                setCopySuccess({ ...copySuccess, social: true });
                                setTimeout(() => setCopySuccess(prev => ({ ...prev, social: false })), 2000);
                              }
                            }}
                          >
                            <Share className="h-4 w-4 mr-2 text-purple-600" />
                            {copySuccess.social ? 'Copied to Clipboard!' : 'Share to Social Media'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              </div>

              {partyGroup.additionalInformation && (
                <div className="pt-2">
                  <p className="font-medium text-gray-900 mb-1">Additional Information</p>
                  <p className="text-gray-600 text-sm p-3 bg-gray-50 rounded-md">
                    {partyGroup.additionalInformation}
                  </p>
                </div>
              )}



              <div className="mt-6 space-y-4">
                <h3 className="font-medium text-lg text-neutral-800">Travel Options</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-5 bg-primary/5 rounded-lg border border-primary/20 shadow-sm">
                    <h4 className="font-medium text-primary-700 mb-2">Want to help other parents?</h4>
                    <p className="text-sm text-neutral-600 mb-4">Share your car space and help other families get to the event.</p>
                    <Button
                      onClick={() => onOfferCarpool(partyGroup.id)}
                      className="w-full"
                      size="lg"
                    >
                      Offer a Ride
                    </Button>
                  </div>

                  <div className="p-5 bg-primary/5 rounded-lg border border-primary/20 shadow-sm">
                    <h4 className="font-medium text-primary-700 mb-2">Need a lift?</h4>
                    <p className="text-sm text-neutral-600 mb-4">Find available carpools and request a spot for your child.</p>
                    <Button
                      onClick={onRequestSpot ? () => onRequestSpot() : undefined}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white border-blue-700 shadow-md"
                      size="lg"
                    >
                      <span className="flex items-center justify-center gap-2">
                        <span className="inline-block relative top-[1px]">🔍</span>
                        Find a Ride
                      </span>
                    </Button>
                  </div>
                </div>
              </div>


            </div>
          </CardContent>
        </TabsContent>

        <TabsContent value="map" className="pt-2 pb-0 px-6 m-0">
          <div className="space-y-4 py-4">
            {isMapLoading && (
              <div className="rounded-md border border-gray-200 overflow-hidden">
                <div className="h-[350px] bg-gray-50 flex items-center justify-center">
                  <Skeleton className="h-[350px] w-full" />
                </div>
              </div>
            )}

            {!isMapLoading && partyLocation && (
              <div className="rounded-md border border-gray-200 overflow-hidden">
                <LocationMap 
                  locations={[
                    {
                      label: partyGroup.name,
                      position: partyLocation,
                      type: 'event'
                    }
                  ]}
                  height="350px"
                  initialZoom={14}
                />
              </div>
            )}

            {!isMapLoading && !partyLocation && (
              <div className="h-[350px] flex items-center justify-center bg-gray-50 rounded-md border border-gray-200">
                <div className="text-center">
                  <p className="text-gray-500 mb-2">
                    Couldn't load the map. Please check the address.
                  </p>
                  <p className="text-sm text-gray-400">
                    {partyGroup.eventAddress}, {partyGroup.eventCity}, {partyGroup.eventPostcode}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-4 text-xs text-gray-500 bg-gray-50 p-3 rounded-md">
              <p className="font-medium mb-1">Address:</p>
              <p>{partyGroup.eventAddress}, {partyGroup.eventCity}, {partyGroup.eventPostcode}</p>
            </div>
          </div>
        </TabsContent>

        
      </Tabs>
      <CardFooter className="bg-gray-50 py-4 flex justify-between items-center">
        {onBack && (
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1 text-gray-600 hover:text-gray-900"
            onClick={onBack}
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back to Events</span>
          </Button>
        )}
        <div className="space-x-3">
          {/* Add any other buttons here in the future */}
        </div>
      </CardFooter>
    </Card>
  );
}
