import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, MapPinIcon, ClockIcon, UserIcon, CopyIcon, CheckIcon, LinkIcon, Share2Icon } from "lucide-react";
import { type PartyGroup } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PartyGroupDetailsProps {
  partyGroup: PartyGroup;
  onOfferCarpool: (partyGroupId: number) => void;
  onRequestSpot?: () => void; // New prop for requesting a spot
  isCreator?: boolean; // Flag to determine if the current user created this group
}

export default function PartyGroupDetails({ 
  partyGroup, 
  onOfferCarpool, 
  onRequestSpot,
  isCreator = false 
}: PartyGroupDetailsProps) {
  const { toast } = useToast();
  const [copySuccess, setCopySuccess] = useState<{code: boolean, link: boolean}>({code: false, link: false});
  
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
          <Badge variant="outline" className="bg-white">Active</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
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
      <CardFooter className="bg-gray-50 py-4 flex justify-end space-x-3">
        <Button 
          variant="outline" 
          onClick={onRequestSpot}
          disabled={!onRequestSpot}
        >
          Request a Spot
        </Button>
        <Button onClick={() => onOfferCarpool(partyGroup.id)}>
          Offer a Carpool
        </Button>
      </CardFooter>
    </Card>
  );
}