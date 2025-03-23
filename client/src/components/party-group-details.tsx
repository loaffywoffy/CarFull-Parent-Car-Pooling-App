import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, MapPinIcon, ClockIcon, UserIcon, CopyIcon, CheckIcon } from "lucide-react";
import { type PartyGroup } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface PartyGroupDetailsProps {
  partyGroup: PartyGroup;
  onOfferCarpool: (partyGroupId: number) => void;
}

export default function PartyGroupDetails({ partyGroup, onOfferCarpool }: PartyGroupDetailsProps) {
  const { toast } = useToast();
  const [copySuccess, setCopySuccess] = useState(false);

  // Format date to readable string
  const formattedDate = new Date(partyGroup.partyDate).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const copyAccessCode = () => {
    navigator.clipboard.writeText(partyGroup.accessCode)
      .then(() => {
        setCopySuccess(true);
        toast({
          title: "Copied!",
          description: "Access code copied to clipboard",
        });
        setTimeout(() => setCopySuccess(false), 2000);
      })
      .catch(() => {
        toast({
          title: "Error",
          description: "Failed to copy access code",
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
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <UserIcon className="h-5 w-5 text-primary-600" />
                <p className="font-medium text-gray-900">Access Code</p>
              </div>
              <div className="flex items-center space-x-2">
                <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                  {partyGroup.accessCode}
                </code>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={copyAccessCode}
                  className="h-8 w-8"
                >
                  {copySuccess ? (
                    <CheckIcon className="h-4 w-4 text-green-600" />
                  ) : (
                    <CopyIcon className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">Share this code with other parents to join this party group</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="bg-gray-50 py-4 flex justify-end">
        <Button onClick={() => onOfferCarpool(partyGroup.id)}>
          Offer a Carpool
        </Button>
      </CardFooter>
    </Card>
  );
}