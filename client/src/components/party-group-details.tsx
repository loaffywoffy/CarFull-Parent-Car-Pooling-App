
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CalendarIcon, MapPinIcon, ClockIcon, UserIcon, CopyIcon, 
  CheckIcon, LinkIcon, Share2Icon, CarIcon, Map as MapIcon,
  Pencil, ChevronLeft, Mail, MessageCircle, MoreHorizontal
} from "lucide-react";
import { type PartyGroup } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CarpoolSummary from "./carpool-summary";
import { Skeleton } from "@/components/ui/skeleton";
import LocationMap from "./location-map";
import { geocodeAddress } from "@/lib/geocoding";
import { useQueryClient } from "@tanstack/react-query";
import CalendarIntegration from "./calendar-integration";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [copySuccess, setCopySuccess] = useState<{code: boolean, link: boolean}>({code: false, link: false});
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
              {isCreator && (
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Share2Icon className="h-4 w-4 text-primary-600" />
                      <p className="font-medium text-sm text-gray-700">Share with Parents</p>
                    </div>
                  </div>
                  
                  <div className="pt-1">
                    <div className="flex items-center gap-2 mb-3">
                      <Input 
                        readOnly 
                        value={shareableUrl} 
                        className="font-mono text-xs bg-gray-50" 
                      />
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          navigator.clipboard.writeText(shareableUrl);
                          setCopySuccess({ ...copySuccess, link: true });
                          setTimeout(() => setCopySuccess(prev => ({ ...prev, link: false })), 2000);
                        }}
                        className="flex gap-1 shrink-0" 
                        size="sm"
                      >
                        {copySuccess.link ? (
                          <>
                            <CheckIcon className="h-3 w-3 text-green-600" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <LinkIcon className="h-3 w-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </Button>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="outline"
                          size="sm"
                          className="w-full bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                        >
                          <Share2Icon className="h-4 w-4 mr-2" />
                          Share Event
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={async () => {
                            const text = `Join "${partyGroup.name}" on KidPool!\n\n` +
                              `📅 ${formattedDate} at ${partyGroup.targetArrivalTime}\n` +
                              `📍 ${partyGroup.eventAddress}, ${partyGroup.eventCity}\n\n` +
                              `${shareableUrl}`;
                            
                            if (navigator.share) {
                              try {
                                await navigator.share({
                                  title: partyGroup.name,
                                  text: text,
                                  url: shareableUrl
                                });
                              } catch (err) {
                                console.log('Share cancelled');
                              }
                            } else {
                              try {
                                await navigator.clipboard.writeText(text);
                                toast({
                                  title: "Copied to clipboard",
                                  description: "Event details copied successfully!"
                                });
                              } catch (err) {
                                console.log('Could not copy to clipboard');
                              }
                            }
                          }}
                        >
                          <MoreHorizontal className="h-4 w-4 mr-2" />
                          Share via...
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem
                          onClick={() => {
                            const message = `Join "${partyGroup.name}" on KidPool!\n\n` +
                              `📅 Event Date: ${formattedDate}\n` +
                              `⏰ Start Time: ${partyGroup.targetArrivalTime}\n` +
                              `📍 Event Location: ${partyGroup.eventAddress}, ${partyGroup.eventCity}\n\n` +
                              `Link: ${shareableUrl}`;
                            window.open(`https://wa.me/?text=${encodeURIComponent(message)}`);
                          }}
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
                          WhatsApp
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem
                          onClick={() => {
                            const subject = `Join "${partyGroup.name}" - ${formattedDate}`;
                            const body = `Hi!\n\nYou're invited to join "${partyGroup.name}" on KidPool!\n\n` +
                              `📅 Event Date: ${formattedDate}\n` +
                              `⏰ Start Time: ${partyGroup.targetArrivalTime}\n` +
                              `📍 Event Location: ${partyGroup.eventAddress}, ${partyGroup.eventCity}\n\n` +
                              `Join here: ${shareableUrl}\n\n` +
                              `KidPool makes it easy to coordinate carpools with other parents for your children's events.`;
                            window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
                          }}
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Email
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(shareableUrl);
                              toast({
                                title: "Link copied",
                                description: "Event link copied to clipboard!"
                              });
                            } catch (err) {
                              const textArea = document.createElement('textarea');
                              textArea.value = shareableUrl;
                              document.body.appendChild(textArea);
                              textArea.select();
                              document.execCommand('copy');
                              document.body.removeChild(textArea);
                              toast({
                                title: "Link copied",
                                description: "Event link copied to clipboard!"
                              });
                            }
                          }}
                        >
                          <CopyIcon className="h-4 w-4 mr-2" />
                          Copy Link
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )}
              
              {/* 1. DETAILS Section */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                  <CalendarIcon className="h-6 w-6 text-primary-600" />
                  <h3 className="text-xl font-semibold text-gray-900">Event Details</h3>
                </div>
                
                {partyGroup.description && (
                  <div className="p-4 bg-gray-50 rounded-lg border">
                    <p className="text-gray-700">{partyGroup.description}</p>
                  </div>
                )}

                {/* Primary details - Date and Time prominently displayed */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center space-x-4 p-4 bg-primary-50 rounded-lg">
                    <CalendarIcon className="h-8 w-8 text-primary-600" />
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Event Date</p>
                      <p className="font-bold text-xl text-gray-900">{formattedDate}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 p-4 bg-primary-50 rounded-lg">
                    <ClockIcon className="h-8 w-8 text-primary-600" />
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Start Time</p>
                      <p className="font-bold text-xl text-gray-900">{partyGroup.targetArrivalTime}</p>
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                  <MapPinIcon className="h-6 w-6 text-primary-600 mt-1" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-1">Location</p>
                    <p className="font-medium text-gray-900 text-lg">
                      {partyGroup.eventAddress}, {partyGroup.eventCity}, {partyGroup.eventPostcode}
                    </p>
                  </div>
                </div>

                {/* End time/date if available */}
                {(partyGroup.eventEndDate || partyGroup.endTime) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                    {partyGroup.eventEndDate && (
                      <div className="flex items-center space-x-3">
                        <CalendarIcon className="h-5 w-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">End Date</p>
                          <p className="font-medium text-gray-900">{formattedEndDate}</p>
                        </div>
                      </div>
                    )}
                    {partyGroup.endTime && (
                      <div className="flex items-center space-x-3">
                        <ClockIcon className="h-5 w-5 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-600">End Time</p>
                          <p className="font-medium text-gray-900">{partyGroup.endTime}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Additional Information */}
                {partyGroup.additionalInformation && (
                  <div className="pt-4 border-t border-gray-100">
                    <p className="font-medium text-gray-900 mb-2">Additional Information</p>
                    <p className="text-gray-600 p-3 bg-gray-50 rounded-md">
                      {partyGroup.additionalInformation}
                    </p>
                  </div>
                )}

                {/* Add to Calendar Button - Prominently placed */}
                <div className="pt-4 border-t border-gray-100">
                  <CalendarIntegration 
                    eventData={partyGroup}
                    buttonVariant="default"
                    size="lg"
                  />
                </div>
              </div>

              {/* 2. SHARING Section */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                  <Share2Icon className="h-6 w-6 text-primary-600" />
                  <h3 className="text-xl font-semibold text-gray-900">Share Event</h3>
                </div>
                
                <p className="text-gray-600">Invite other parents to join this event and coordinate carpools together.</p>
                
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="lg"
                    className="bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(shareableUrl);
                        setCopySuccess({ ...copySuccess, link: true });
                        setTimeout(() => setCopySuccess(prev => ({ ...prev, link: false })), 2000);
                        toast({
                          title: "Link copied",
                          description: "Event link copied to clipboard!"
                        });
                      } catch (err) {
                        const textArea = document.createElement('textarea');
                        textArea.value = shareableUrl;
                        document.body.appendChild(textArea);
                        textArea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textArea);
                        setCopySuccess({ ...copySuccess, link: true });
                        setTimeout(() => setCopySuccess(prev => ({ ...prev, link: false })), 2000);
                        toast({
                          title: "Link copied", 
                          description: "Event link copied to clipboard!"
                        });
                      }
                    }}
                  >
                    {copySuccess.link ? (
                      <>
                        <CheckIcon className="h-4 w-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <CopyIcon className="h-4 w-4 mr-2" />
                        Copy Link
                      </>
                    )}
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                        <Share2Icon className="h-4 w-4 mr-2" />
                        Share Event
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        onClick={async () => {
                          const text = `Join "${partyGroup.name}" on KidPool!\n\n` +
                            `📅 ${formattedDate} at ${partyGroup.targetArrivalTime}\n` +
                            `📍 ${partyGroup.eventAddress}, ${partyGroup.eventCity}\n\n` +
                            `${shareableUrl}`;
                          
                          if (navigator.share) {
                            try {
                              await navigator.share({
                                title: partyGroup.name,
                                text: text,
                                url: shareableUrl
                              });
                            } catch (err) {
                              console.log('Share cancelled');
                            }
                          } else {
                            try {
                              await navigator.clipboard.writeText(text);
                              toast({
                                title: "Copied to clipboard",
                                description: "Event details copied successfully!"
                              });
                            } catch (err) {
                              console.log('Could not copy to clipboard');
                            }
                          }
                        }}
                      >
                        <MoreHorizontal className="h-4 w-4 mr-2" />
                        Share via...
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem
                        onClick={() => {
                          const message = `Join "${partyGroup.name}" on KidPool!\n\n` +
                            `📅 Event Date: ${formattedDate}\n` +
                            `⏰ Start Time: ${partyGroup.targetArrivalTime}\n` +
                            `📍 Event Location: ${partyGroup.eventAddress}, ${partyGroup.eventCity}\n\n` +
                            `Link: ${shareableUrl}`;
                          window.open(`https://wa.me/?text=${encodeURIComponent(message)}`);
                        }}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        WhatsApp
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem
                        onClick={() => {
                          const subject = `Join "${partyGroup.name}" - ${formattedDate}`;
                          const body = `Hi!\n\nYou're invited to join "${partyGroup.name}" on KidPool!\n\n` +
                            `📅 Event Date: ${formattedDate}\n` +
                            `⏰ Start Time: ${partyGroup.targetArrivalTime}\n` +
                            `📍 Event Location: ${partyGroup.eventAddress}, ${partyGroup.eventCity}\n\n` +
                            `Join here: ${shareableUrl}\n\n` +
                            `KidPool makes it easy to coordinate carpools with other parents for your children's events.`;
                          window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
                        }}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Email
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* 3. TRAVEL OPTIONS Section */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                  <CarIcon className="h-6 w-6 text-primary-600" />
                  <h3 className="text-xl font-semibold text-gray-900">Travel Options</h3>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="p-6 bg-primary/5 rounded-lg border border-primary/20 shadow-sm">
                    <h4 className="font-semibold text-primary-700 mb-2 text-lg">Want to help other parents?</h4>
                    <p className="text-sm text-neutral-600 mb-4">Share your car space and help other families get to the event.</p>
                    <Button
                      onClick={() => onOfferCarpool(partyGroup.id)}
                      className="w-full"
                      size="lg"
                    >
                      Offer a Ride
                    </Button>
                  </div>

                  <div className="p-6 bg-blue-50 rounded-lg border border-blue-200 shadow-sm">
                    <h4 className="font-semibold text-blue-700 mb-2 text-lg">Need a lift?</h4>
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
