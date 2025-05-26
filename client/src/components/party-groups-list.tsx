import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPartyGroups } from "@/api/partyGroups";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, MapPinIcon, ClockIcon, PlusIcon, Share2Icon, ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  const [isPastEventsOpen, setIsPastEventsOpen] = useState(false);
  
  const { data: partyGroups = [], isLoading, error } = useQuery({
    queryKey: ['/api/party-groups'],
    queryFn: getPartyGroups
  });

  // Format date to readable string
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Function to check if an event is in the past
  const isEventPast = (eventDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of today
    const eventDateTime = new Date(eventDate);
    eventDateTime.setHours(0, 0, 0, 0); // Set to start of event date
    return eventDateTime < today;
  };

  // Separate events into past and future
  const futureEvents = partyGroups.filter(event => !isEventPast(event.eventDate));
  const pastEvents = partyGroups.filter(event => isEventPast(event.eventDate));

  // Sort future events by date (earliest first)
  futureEvents.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
  
  // Sort past events by date (most recent first)
  pastEvents.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());

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

  // Component to render an event card
  const EventCard = ({ partyGroup, isPast = false }: { partyGroup: PartyGroup, isPast?: boolean }) => (
    <Card key={partyGroup.id} className={`hover:shadow-md transition-shadow ${isPast ? 'opacity-75' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{partyGroup.name}</CardTitle>
          {isPast && <Badge variant="secondary" className="text-xs">Past</Badge>}
        </div>
        <CardDescription>Organized by {partyGroup.createdBy}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-1">
            <CalendarIcon className="h-4 w-4 text-primary-600" />
            <span>{formatDate(partyGroup.eventDate)}</span>
          </div>
          <div className="flex items-center gap-1">
            <ClockIcon className="h-4 w-4 text-primary-600" />
            <span>{partyGroup.targetArrivalTime}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 mt-2 text-sm">
          <MapPinIcon className="h-4 w-4 text-primary-600" />
          <span className="text-gray-600 truncate">
            {partyGroup.eventAddress}, {partyGroup.eventCity}
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
          {!isPast && (
            <>
              <Button 
                variant="default" 
                size="sm"
                className="bg-green-600 hover:bg-green-700" 
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPartyGroup(partyGroup);
                  const customEvent = new CustomEvent('action', { 
                    detail: { type: 'offer-ride', partyGroupId: partyGroup.id } 
                  });
                  window.dispatchEvent(customEvent);
                }}
              >
                Offer a Ride
              </Button>
              <Button 
                variant="default" 
                size="sm"
                className="bg-blue-600 hover:bg-blue-700" 
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPartyGroup(partyGroup);
                  const customEvent = new CustomEvent('action', { 
                    detail: { type: 'find-ride', partyGroupId: partyGroup.id } 
                  });
                  window.dispatchEvent(customEvent);
                }}
              >
                Find a Ride
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const hasNoEvents = !partyGroups || partyGroups.length === 0;
  const hasNoFutureEvents = futureEvents.length === 0;

  return (
    <div className="space-y-6">
      {/* Header with inline button */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Events</h2>
        <Button 
          onClick={() => onCreateNew()} 
          className="flex items-center gap-1"
          variant="default"
        >
          <PlusIcon className="h-4 w-4" />
          <span>Create New Event</span>
        </Button>
      </div>
      
      {hasNoEvents ? (
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
        <>
          {/* Future Events Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-medium text-gray-800">
                Upcoming Events
              </h3>
              <Badge variant="outline" className="text-xs">
                {futureEvents.length}
              </Badge>
            </div>
            
            {hasNoFutureEvents ? (
              <div className="text-center py-8 bg-blue-50 rounded-lg border border-blue-100">
                <h4 className="font-medium text-blue-800 mb-2">No Upcoming Events</h4>
                <p className="text-blue-600 text-sm mb-4">
                  All your events have already happened. Create a new event to get started!
                </p>
                <Button onClick={() => onCreateNew()} variant="default" size="sm">
                  Create New Event
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {futureEvents.map((partyGroup) => (
                  <EventCard key={partyGroup.id} partyGroup={partyGroup} />
                ))}
              </div>
            )}
          </div>

          {/* Past Events Section */}
          {pastEvents.length > 0 && (
            <Collapsible open={isPastEventsOpen} onOpenChange={setIsPastEventsOpen}>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="flex items-center gap-2 w-full justify-start p-0 h-auto"
                >
                  {isPastEventsOpen ? (
                    <ChevronDownIcon className="h-4 w-4" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4" />
                  )}
                  <h3 className="text-lg font-medium text-gray-600">
                    Past Events
                  </h3>
                  <Badge variant="secondary" className="text-xs">
                    {pastEvents.length}
                  </Badge>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 mt-4">
                <div className="grid grid-cols-1 gap-4">
                  {pastEvents.map((partyGroup) => (
                    <EventCard key={partyGroup.id} partyGroup={partyGroup} isPast={true} />
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </>
      )}
    </div>
  );
}