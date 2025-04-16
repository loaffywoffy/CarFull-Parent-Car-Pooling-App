import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CalendarIcon, MapPinIcon, ClockIcon, UserIcon, CopyIcon, 
  CheckIcon, LinkIcon, Share2Icon, CarIcon, Map as MapIcon,
  Pencil, Trash2, AlertCircle
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
  onRequestSpot?: () => void; // New prop for requesting a spot
  onEdit?: (partyGroupId: number) => void; // New prop for editing the event
  onDeleted?: () => void; // New prop for after successful deletion
  isCreator?: boolean; // Flag to determine if the current user created this group
}

export default function PartyGroupDetails({ 
  partyGroup, 
  onOfferCarpool, 
  onRequestSpot,
  onEdit,
  onDeleted,
  isCreator = false 
}: PartyGroupDetailsProps) {
  const { toast } = useToast();
  const [copySuccess, setCopySuccess] = useState<{code: boolean, link: boolean}>({code: false, link: false});
  const [partyLocation, setPartyLocation] = useState<[number, number] | null>(null);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  
  const queryClient = useQueryClient();
  
  // Mutation for deleting the event
  const deleteMutation = useMutation({
    mutationFn: () => deletePartyGroup(partyGroup.id),
    onSuccess: () => {
      // Invalidate all related caches to ensure consistency across the application
      
      // Invalidate the specific party group
      queryClient.invalidateQueries({ queryKey: [`/api/party-groups/${partyGroup.id}`] });
      
      // Invalidate carpools for this party group
      queryClient.invalidateQueries({ queryKey: [`/api/party-groups/${partyGroup.id}/carpools`] });
      
      // Invalidate all party groups list
      queryClient.invalidateQueries({ queryKey: ['/api/party-groups'] });
      
      // Also invalidate any nested queries related to this party group
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
  
  // Get coordinates for the party location when the component mounts
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
  
  // Format date to readable string
  const formattedDate = new Date(partyGroup.partyDate).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Get end date if available
  const formattedEndDate = partyGroup.partyEndDate 
    ? new Date(partyGroup.partyEndDate).toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : null;

  // Generate shareable link
  const baseUrl = window.location.origin;
  const shareableLink = `${baseUrl}?access=${partyGroup.accessCode}`;
  
  const copyAccessCode = () => {
    if (partyGroup.accessCode) {
      navigator.clipboard.writeText(partyGroup.accessCode)
        .then(() => {
          setCopySuccess({...copySuccess, code: true});
          toast({
            title: "Copied!",
            description: "Access code copied to clipboard",
          });
          setTimeout(() => setCopySuccess(prev => ({...prev, code: false})), 2000);
        })
        .catch(() => {
          toast({
            title: "Error",
            description: "Failed to copy access code",
            variant: "destructive",
          });
        });
    }
  };
  
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
      
      {/* Main content tabs */}
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
          <TabsTrigger value="carpools" className="data-[state=active]:bg-primary-50">
            <div className="flex items-center gap-1">
              <CarIcon className="h-4 w-4" />
              <span>Carpool Summary</span>
            </div>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="pt-2 pb-0 px-0 m-0">
          <CardContent className="pt-4">
            <div className="space-y-4">
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
              
              {/* Display end date and time if available */}
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
              
              {/* Only show sharing options to the creator */}
              {isCreator && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Share2Icon className="h-5 w-5 text-primary-600" />
                      <p className="font-medium text-gray-900">Share with Parents</p>
                    </div>
                  </div>
                  
                  <Tabs defaultValue="code" className="w-full">
                    <TabsList className="mb-4">
                      <TabsTrigger value="code">Access Code</TabsTrigger>
                      <TabsTrigger value="link">Shareable Link</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="code">
                      <div className="flex items-center justify-between bg-gray-50 rounded-md p-2">
                        <code className="px-2 py-1 bg-white rounded text-sm font-mono border">
                          {partyGroup.accessCode}
                        </code>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={copyAccessCode}
                          className="ml-2 flex items-center gap-1"
                        >
                          {copySuccess.code ? (
                            <>
                              <CheckIcon className="h-4 w-4 text-green-600" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <CopyIcon className="h-4 w-4" />
                              <span>Copy Code</span>
                            </>
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Share this code with parents to join the party group</p>
                    </TabsContent>
                    
                    <TabsContent value="link">
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input readOnly value={shareableLink} className="font-mono text-sm bg-gray-50" />
                          <Button 
                            variant="outline" 
                            onClick={copyShareableLink}
                            className="flex gap-1 shrink-0"
                          >
                            {copySuccess.link ? (
                              <>
                                <CheckIcon className="h-4 w-4 text-green-600" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <LinkIcon className="h-4 w-4" />
                                <span>Copy Link</span>
                              </>
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500">
                          This link lets parents join directly. Share it via email or messaging.
                        </p>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </div>
          </CardContent>
        </TabsContent>
        
        <TabsContent value="map" className="pt-0 pb-0 px-0 m-0">
          <div className="px-6 py-4">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Party Location</h3>
              <p className="text-sm text-gray-600 mb-4">
                View the party location on the map to help plan your journey.
              </p>
              
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
          </div>
        </TabsContent>
        
        <TabsContent value="carpools" className="pt-0 pb-0 px-0 m-0">
          <div className="px-6 py-4">
            <CarpoolSummary partyGroupId={partyGroup.id} />
          </div>
        </TabsContent>
      </Tabs>
      
      <CardFooter className="bg-gray-50 py-4 flex justify-end space-x-3">
        <Button 
          variant="outline" 
          onClick={onRequestSpot}
        >
          Request a Spot
        </Button>
        <Button onClick={() => onOfferCarpool(partyGroup.id)}>
          Offer a Carpool
        </Button>
      </CardFooter>
      
      {/* Delete confirmation dialog */}
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