import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPartyGroups } from "@/api/partyGroups";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, MapPinIcon, ClockIcon, PlusIcon, Share2Icon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { type PartyGroup } from "@shared/schema";

interface PartyGroupsListProps {
  onSelectPartyGroup: (partyGroup: PartyGroup) => void;
  onCreateNew: () => void;
  onJoinPartyGroup: (partyId?: string) => void;
}

export default function PartyGroupsList({ 
  onSelectPartyGroup, 
  onCreateNew,
  onJoinPartyGroup 
}: PartyGroupsListProps) {
  const { data: partyGroups = [], isLoading, error } = useQuery({
    queryKey: ['/api/party-groups'],
    queryFn: getPartyGroups
  });

  // Format date to readable string
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Event Details</h2>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
        
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="cursor-pointer">
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-3/4 mb-1" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mt-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-24" />
              </div>
              <Skeleton className="h-5 w-full mt-3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-4">Error loading party groups</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  const hasNoPartyGroups = !partyGroups || partyGroups.length === 0;

  return (
    <div className="space-y-4">
      {/* Header with inline button */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Event Details</h2>
        <Button 
          onClick={() => onCreateNew()} 
          className="flex items-center gap-1"
          variant="default"
        >
          <PlusIcon className="h-4 w-4" />
          <span>Create New Event</span>
        </Button>
      </div>
      
      {hasNoPartyGroups ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <h3 className="font-medium text-lg text-gray-800 mb-2">No Events Yet</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Create a new event to get started organizing carpools
          </p>
          <div className="flex justify-center">
            <Button onClick={() => onCreateNew()} variant="default">
              Create New Event
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {partyGroups.map((partyGroup) => (
            <Card key={partyGroup.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{partyGroup.name}</CardTitle>
                <CardDescription>Organized by {partyGroup.createdBy}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <CalendarIcon className="h-4 w-4 text-primary-600" />
                    <span>{formatDate(partyGroup.partyDate)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ClockIcon className="h-4 w-4 text-primary-600" />
                    <span>{partyGroup.targetArrivalTime}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-2 text-sm">
                  <MapPinIcon className="h-4 w-4 text-primary-600" />
                  <span className="text-gray-600 truncate">
                    {partyGroup.partyAddress}, {partyGroup.partyCity}
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-2 justify-end mt-4 pt-3 border-t border-gray-100">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectPartyGroup(partyGroup);
                    }}
                  >
                    View Details
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm"
                    className="bg-green-600 hover:bg-green-700" 
                    onClick={(e) => {
                      e.stopPropagation();
                      // Select this party group and trigger the "Give a Ride" action
                      onSelectPartyGroup(partyGroup);
                      // We'll use a custom attribute to signal the parent component
                      const customEvent = new CustomEvent('action', { 
                        detail: { type: 'give-ride', partyGroupId: partyGroup.id } 
                      });
                      window.dispatchEvent(customEvent);
                    }}
                  >
                    Give a Ride
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700" 
                    onClick={(e) => {
                      e.stopPropagation();
                      // Select this party group and trigger the "Find a Ride" action
                      onSelectPartyGroup(partyGroup);
                      // We'll use a custom attribute to signal the parent component
                      const customEvent = new CustomEvent('action', { 
                        detail: { type: 'find-ride', partyGroupId: partyGroup.id } 
                      });
                      window.dispatchEvent(customEvent);
                    }}
                  >
                    Find a Ride
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}