import { useState } from "react";
import { Calendar, Plus, Clock, Users, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createCalendarEvent, getCalendarEventsByCarpoolId } from "@/api/calendarEvents";
import { useToast } from "@/hooks/use-toast";
import CalendarIntegration from "./calendar-integration";
import { format } from "date-fns";

interface CalendarSchedulerProps {
  carpoolId: number;
  eventData: any;
  carpoolData: any;
}

export default function CalendarScheduler({ carpoolId, eventData, carpoolData }: CalendarSchedulerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    location: '',
    startTime: '',
    endTime: '',
    isRecurring: false,
    reminderMinutes: 30
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing calendar events for this carpool
  const { data: calendarEvents = [], isLoading } = useQuery({
    queryKey: ['/api/calendar-events', carpoolId],
    queryFn: () => getCalendarEventsByCarpoolId(carpoolId)
  });

  // Create calendar event mutation
  const createEventMutation = useMutation({
    mutationFn: (eventData: any) => createCalendarEvent(eventData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar-events', carpoolId] });
      setIsOpen(false);
      setNewEvent({
        title: '',
        description: '',
        location: '',
        startTime: '',
        endTime: '',
        isRecurring: false,
        reminderMinutes: 30
      });
      toast({
        title: "Calendar event created",
        description: "Your calendar event has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create event",
        description: error.message || "There was an error creating the calendar event.",
        variant: "destructive",
      });
    }
  });

  const handleCreateEvent = () => {
    if (!newEvent.title || !newEvent.startTime) {
      toast({
        title: "Missing information",
        description: "Please provide at least a title and start time.",
        variant: "destructive",
      });
      return;
    }

    createEventMutation.mutate({
      carpoolId,
      title: newEvent.title,
      description: newEvent.description || null,
      location: newEvent.location || null,
      startTime: newEvent.startTime,
      endTime: newEvent.endTime || null,
      isRecurring: newEvent.isRecurring,
      reminderMinutes: newEvent.reminderMinutes
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Calendar Integration
        </CardTitle>
        <CardDescription>
          Add this carpool to your calendar and manage related events
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Event Calendar Integration */}
        <div className="flex flex-col sm:flex-row gap-3">
          <CalendarIntegration 
            eventData={eventData} 
            carpoolData={carpoolData}
            buttonVariant="default"
          />
          
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Custom Event
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create Calendar Event</DialogTitle>
                <DialogDescription>
                  Add a custom event related to this carpool
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Event Title *</Label>
                  <Input
                    id="title"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    placeholder="e.g., Pickup reminder, Pre-party meetup"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    placeholder="Additional details about this event"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                    placeholder="Where will this take place?"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startTime">Start Time *</Label>
                    <Input
                      id="startTime"
                      type="datetime-local"
                      value={newEvent.startTime}
                      onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="datetime-local"
                      value={newEvent.endTime}
                      onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="isRecurring">Recurring Event</Label>
                    <p className="text-sm text-muted-foreground">
                      Does this event repeat?
                    </p>
                  </div>
                  <Switch
                    id="isRecurring"
                    checked={newEvent.isRecurring}
                    onCheckedChange={(checked) => setNewEvent({ ...newEvent, isRecurring: checked })}
                  />
                </div>

                <div>
                  <Label htmlFor="reminder">Reminder (minutes before)</Label>
                  <Input
                    id="reminder"
                    type="number"
                    value={newEvent.reminderMinutes}
                    onChange={(e) => setNewEvent({ ...newEvent, reminderMinutes: parseInt(e.target.value) || 30 })}
                    min="0"
                    max="1440"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleCreateEvent} disabled={createEventMutation.isPending}>
                    {createEventMutation.isPending ? "Creating..." : "Create Event"}
                  </Button>
                  <Button variant="outline" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Existing Calendar Events */}
        {calendarEvents.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Scheduled Events
            </h4>
            <div className="space-y-2">
              {calendarEvents.map((event: any) => (
                <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h5 className="font-medium">{event.title}</h5>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(event.startTime), "PPp")}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </span>
                      )}
                      {event.isRecurring && (
                        <Badge variant="secondary" className="text-xs">
                          Recurring
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CalendarIntegration 
                    eventData={{
                      name: event.title,
                      description: event.description,
                      eventDate: event.startTime.split('T')[0],
                      targetArrivalTime: event.startTime.split('T')[1],
                      eventEndDate: event.endTime?.split('T')[0],
                      endTime: event.endTime?.split('T')[1],
                      eventAddress: event.location
                    }}
                    carpoolData={carpoolData}
                    buttonVariant="ghost"
                    size="sm"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Tips */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <h5 className="font-medium text-sm mb-2">💡 Calendar Tips</h5>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Add pickup reminders 30 minutes before departure</li>
            <li>• Create separate events for group coordination calls</li>
            <li>• Set calendar notifications for weather checks</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}