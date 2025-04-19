
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CalendarIcon, MapPinIcon, ClockIcon, UserIcon, CopyIcon, 
  CheckIcon, LinkIcon, Share2Icon, CarIcon, Map as MapIcon,
  Pencil, Trash2, AlertCircle, ChevronLeft
} from "lucide-react";
import { type PartyGroup } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CarpoolSummary from "./carpool-summary";
import { Skeleton } from "@/components/ui/skeleton";
import LocationMap from "./location-map";
import { geocodeAddress } from "@/lib/geocoding";
import { deletePartyGroup } from "@/api/partyGroups";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => deletePartyGroup(partyGroup.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/party-groups/${partyGroup.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/party-groups/${partyGroup.id}/carpools`] });
      queryClient.invalidateQueries({ queryKey: ['/api/party-groups'] });
      queryClient.invalidateQueries({ queryKey: [`/api/carpools`] });

      toast({
        title: "Event deleted",
        description: `'${partyGroup.name}' has been successfully deleted.`,
      });

      if (onDeleted) onDeleted();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete the event. Please try again.",
        variant: "destructive",
      });
      console.error("Error deleting event:", error);
    }
  });

  useEffect(() => {
    const loadPartyLocation = async () => {
      if (partyGroup.partyAddress && partyGroup.partyPostcode) {
        try {
          setIsMapLoading(true);
          const coordinates = await geocodeAddress(
            partyGroup.partyAddress,
            partyGroup.partyCity,
            partyGroup.partyPostcode
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

  const formattedDate = new Date(partyGroup.partyDate).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const formattedEndDate = partyGroup.partyEndDate 
    ? new Date(partyGroup.partyEndDate).toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : null;

  const baseUrl = "https://carpool.replit.app";
  const shareableLink = `${baseUrl}?partyId=${partyGroup.id}`;

  const copyShareableLink = () => {
    navigator.clipboard.writeText(shareableLink)
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
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8 rounded-full bg-white hover:bg-red-100 text-red-500 hover:text-red-600"
                  onClick={() => setConfirmDeleteOpen(true)}
                  title="Delete event"
                >
                  <Trash2 className="h-4 w-4" />
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
                        value={`https://carpool.replit.app?partyId=${partyGroup.id}`} 
                        className="font-mono text-xs bg-gray-50" 
                      />
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          navigator.clipboard.writeText(`https://carpool.replit.app?partyId=${partyGroup.id}`);
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
                    
                    <Button 
                      variant="outline"
                      size="sm"
                      className="w-full bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                      onClick={() => {
                        const message = `Join "${partyGroup.name}" on ParentPooling!\n\n` +
                          `📅 Date: ${formattedDate}\n` +
                          `⏰ Time: ${partyGroup.targetArrivalTime}\n` +
                          `📍 Location: ${partyGroup.partyAddress}, ${partyGroup.partyCity}\n\n` +
                          `Link: ${shareableLink}`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`);
                      }}
                    >
                      Share via WhatsApp
                    </Button>
                  </div>
                </div>
              )}
              
              {partyGroup.description && (
                <p className="text-gray-600 text-sm">{partyGroup.description}</p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start space-x-2">
                  <CalendarIcon className="h-5 w-5 text-primary-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Date</p>
                    <p className="text-gray-600 text-sm">{formattedDate}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <ClockIcon className="h-5 w-5 text-primary-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Start Time</p>
                    <p className="text-gray-600 text-sm">{partyGroup.targetArrivalTime}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-2 md:col-span-2">
                  <MapPinIcon className="h-5 w-5 text-primary-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Location</p>
                    <p className="text-gray-600 text-sm">
                      {partyGroup.partyAddress}, {partyGroup.partyCity}, {partyGroup.partyPostcode}
                    </p>
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

              {(partyGroup.partyEndDate || partyGroup.endTime) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {partyGroup.partyEndDate && (
                    <div className="flex items-start space-x-2">
                      <CalendarIcon className="h-5 w-5 text-primary-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">End Date</p>
                        <p className="text-gray-600 text-sm">{formattedEndDate}</p>
                      </div>
                    </div>
                  )}

                  {partyGroup.endTime && (
                    <div className="flex items-start space-x-2">
                      <ClockIcon className="h-5 w-5 text-primary-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">End Time</p>
                        <p className="text-gray-600 text-sm">{partyGroup.endTime}</p>
                      </div>
                    </div>
                  )}
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
                      type: 'party'
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
                    {partyGroup.partyAddress}, {partyGroup.partyCity}, {partyGroup.partyPostcode}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-4 text-xs text-gray-500 bg-gray-50 p-3 rounded-md">
              <p className="font-medium mb-1">Address:</p>
              <p>{partyGroup.partyAddress}, {partyGroup.partyCity}, {partyGroup.partyPostcode}</p>
            </div>
          </div>
        </TabsContent>

        
      </Tabs>

      <CardFooter className="bg-gray-50 py-4 flex justify-end space-x-3">
      </CardFooter>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Delete this event?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the event "{partyGroup.name}" and all associated carpools and requests.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => {
                deleteMutation.mutate();
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Event"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
