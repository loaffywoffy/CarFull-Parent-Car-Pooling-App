import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { queryClient } from "@/lib/queryClient";
import { CalendarEvent } from "@shared/schema";
import { getCalendarEventsByCarpoolId, deleteCalendarEvent } from "@/api/calendarEvents";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CalendarIcon, ClockIcon, MapPinIcon, Trash2, AlertCircle, ArrowLeft } from "lucide-react";

interface CalendarEventsListProps {
  carpoolId: number;
  onBackToList?: () => void;
}

export default function CalendarEventsList({ carpoolId, onBackToList }: CalendarEventsListProps) {
  const { toast } = useToast();
  const [eventToDelete, setEventToDelete] = useState<number | null>(null);
  
  const { data: events = [], isLoading, isError } = useQuery({
    queryKey: ['/api/carpools', carpoolId, 'calendar-events'],
    queryFn: () => getCalendarEventsByCarpoolId(carpoolId),
  }) as { data: CalendarEvent[], isLoading: boolean, isError: boolean };

  const deleteMutation = useMutation({
    mutationFn: (eventId: number) => deleteCalendarEvent(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/carpools', carpoolId, 'calendar-events'] });
      toast({
        title: "Event Deleted",
        description: "Calendar event has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete calendar event. Please try again.",
        variant: "destructive",
      });
      console.error("Error deleting calendar event:", error);
    },
  });

  const handleDeleteEvent = (eventId: number) => {
    deleteMutation.mutate(eventId);
    setEventToDelete(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Calendar Events</CardTitle>
          <CardDescription>Loading events...</CardDescription>
        </CardHeader>
        {onBackToList && (
          <CardFooter className="pt-2 pb-4">
            <Button 
              variant="outline"
              className="flex items-center text-primary"
              onClick={onBackToList}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Carpool List
            </Button>
          </CardFooter>
        )}
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Calendar Events</CardTitle>
          <CardDescription>Error loading events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center text-destructive">
            <AlertCircle className="h-5 w-5 mr-2" />
            <p>Failed to load calendar events. Please try again later.</p>
          </div>
        </CardContent>
        {onBackToList && (
          <CardFooter className="pt-2 pb-4">
            <Button 
              variant="outline"
              className="flex items-center text-primary"
              onClick={onBackToList}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Carpool List
            </Button>
          </CardFooter>
        )}
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Calendar Events</CardTitle>
          <CardDescription>No events scheduled for this carpool yet</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Create a new event to keep track of important dates.</p>
        </CardContent>
        {onBackToList && (
          <CardFooter className="pt-2 pb-4">
            <Button 
              variant="outline"
              className="flex items-center text-primary"
              onClick={onBackToList}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Carpool List
            </Button>
          </CardFooter>
        )}
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendar Events</CardTitle>
        <CardDescription>Upcoming events for this carpool</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {events.map((event: CalendarEvent) => (
              <div key={event.id} className="relative">
                <Card className="border-l-4 border-l-primary">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{event.title}</CardTitle>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive"
                            onClick={() => setEventToDelete(event.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Event</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this event? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteEvent(event.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    {event.description && <CardDescription>{event.description}</CardDescription>}
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="grid gap-2">
                      <div className="flex items-center text-sm">
                        <CalendarIcon className="h-4 w-4 mr-2 opacity-70" />
                        <span>
                          {format(new Date(event.startDate), "PPP")}
                          {event.endDate && event.endDate !== event.startDate && 
                            <> - {format(new Date(event.endDate), "PPP")}</>
                          }
                        </span>
                      </div>
                      {event.location && (
                        <div className="flex items-center text-sm">
                          <MapPinIcon className="h-4 w-4 mr-2 opacity-70" />
                          <span>{event.location}</span>
                        </div>
                      )}
                      {event.reminderTime && (
                        <div className="flex items-center text-sm">
                          <ClockIcon className="h-4 w-4 mr-2 opacity-70" />
                          <span>Reminder: {event.reminderTime} minutes before</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0">
                    {event.isRecurring && (
                      <Badge variant="outline">
                        Recurring {event.recurrencePattern && `(${event.recurrencePattern})`}
                      </Badge>
                    )}
                  </CardFooter>
                </Card>
                {events.length > 1 && <Separator className="my-4" />}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
      {onBackToList && (
        <CardFooter className="pt-2 pb-4">
          <Button 
            variant="outline"
            className="flex items-center text-primary"
            onClick={onBackToList}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Carpool List
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}