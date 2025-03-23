import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { insertCalendarEventSchema } from "@shared/schema";
import { createCalendarEvent } from "@/api/calendarEvents";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

// Extend the schema with validation
const calendarEventFormSchema = insertCalendarEventSchema.extend({
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  title: z.string().min(3, "Title must be at least 3 characters"),
});

type CalendarEventFormValues = z.infer<typeof calendarEventFormSchema>;

interface CalendarEventFormProps {
  carpoolId: number;
  onSuccess: () => void;
}

export default function CalendarEventForm({ carpoolId, onSuccess }: CalendarEventFormProps) {
  const { toast } = useToast();
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  const form = useForm<CalendarEventFormValues>({
    resolver: zodResolver(calendarEventFormSchema),
    defaultValues: {
      carpoolId,
      title: "",
      description: "",
      startDate: "",
      endDate: "",
      location: "",
      isRecurring: false,
      recurrencePattern: "",
      reminderTime: 30, // Default 30 minutes reminder
    },
  });

  const createEventMutation = useMutation({
    mutationFn: (values: CalendarEventFormValues) => createCalendarEvent(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/carpools', carpoolId, 'calendar-events'] });
      form.reset();
      toast({
        title: "Event Created",
        description: "Calendar event has been successfully created.",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create calendar event. Please try again.",
        variant: "destructive",
      });
      console.error("Error creating calendar event:", error);
    },
  });

  const onSubmit = (values: CalendarEventFormValues) => {
    createEventMutation.mutate(values);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Calendar Event</CardTitle>
        <CardDescription>
          Schedule an event for your carpool
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter event title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter event description"
                      className="resize-none"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(new Date(field.value), "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              field.onChange(date.toISOString());
                              setStartDateOpen(false);
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date</FormLabel>
                    <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(new Date(field.value), "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              field.onChange(date.toISOString());
                              setEndDateOpen(false);
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter event location" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="isRecurring"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Recurring Event</FormLabel>
                      <FormDescription>
                        Set if this event repeats
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value || false}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reminderTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reminder (minutes before)</FormLabel>
                    <FormControl>
                      <div className="flex items-center">
                        <Input
                          type="number"
                          placeholder="30"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                        />
                        <Clock className="ml-2 h-4 w-4 opacity-50" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {form.watch("isRecurring") && (
              <FormField
                control={form.control}
                name="recurrencePattern"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recurrence Pattern</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Weekly, Monthly, etc." 
                        {...field} 
                        value={field.value || ""} 
                      />
                    </FormControl>
                    <FormDescription>
                      Specify how often this event repeats
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={createEventMutation.isPending}
              >
                {createEventMutation.isPending ? "Creating..." : "Create Event"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}