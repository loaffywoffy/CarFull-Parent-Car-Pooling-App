import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { insertPartyGroupSchema, type InsertPartyGroup } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Calendar, MapPin } from "lucide-react";
import { SMSVerificationDialog } from "./sms-verification-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createPartyGroup } from "@/api/partyGroups";
import { queryClient } from "@/lib/queryClient";
import { eventTypeOptions } from "@/lib/event-colors";
import { z } from "zod";

interface PartyGroupFormProps {
  onSuccess: (partyGroupId: number) => void;
  onCancel?: () => void; // Add optional cancel callback
}

// Phone number validation function
const validatePhoneNumber = (phoneNumber: string): boolean => {
  // Remove all non-digit characters except +
  const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
  
  // Check basic format: must be 7-15 digits, optionally starting with +
  if (!/^\+?[\d]{7,15}$/.test(cleanNumber)) {
    return false;
  }
  
  // Check for invalid patterns
  const invalidPatterns = [
    /^\+?0+$/, // All zeros
    /^\+?1+$/, // All ones
    /^(\+?\d)\1{9,}$/, // Too many repeated digits
    /^\+?1234567890$/, // Sequential numbers
    /^\+?0123456789$/, // Sequential starting with 0
  ];
  
  for (const pattern of invalidPatterns) {
    if (pattern.test(cleanNumber)) {
      return false;
    }
  }
  
  // Additional validation for UK numbers (most common format)
  if (cleanNumber.startsWith('+44') || cleanNumber.startsWith('44') || cleanNumber.startsWith('0')) {
    let ukNumber = cleanNumber.replace(/^\+44/, '').replace(/^44/, '').replace(/^0/, '');
    
    // UK mobile numbers start with 7 and are 10 digits total
    if (/^7\d{9}$/.test(ukNumber)) {
      return true;
    }
    
    // UK landline validation (basic patterns)
    if (/^[1-6]\d{8,9}$/.test(ukNumber)) {
      return true;
    }
    
    return false;
  }
  
  // For international numbers, ensure reasonable length
  return cleanNumber.length >= 8 && cleanNumber.length <= 15;
};

// Create the form schema with custom validations
const partyGroupFormSchema = insertPartyGroupSchema.extend({
  name: z.string().min(3, "Event name must be at least 3 characters"),
  eventAddress: z.string().min(5, "Event address is required"),
  eventCity: z.string().min(2, "City is required"),
  eventPostcode: z.string().min(3, "Postcode is required"),
  targetArrivalTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  eventEndDate: z.string().min(1, "End date is required"),
  phoneNumber: z.string()
    .min(7, "Phone number must be at least 7 digits")
    .max(20, "Phone number is too long")
    .refine((phone) => {
      // Remove spaces, dashes, brackets for validation
      const cleaned = phone.replace(/[\s\-\(\)]/g, '');
      return /^[\+\d]+$/.test(cleaned);
    }, "Phone number can only contain digits, +, spaces, dashes, and brackets")
    .refine((phone) => {
      const cleaned = phone.replace(/[\s\-\(\)]/g, '');
      return validatePhoneNumber(cleaned);
    }, "Please enter a valid phone number")
}).refine(
  (data) => {
    // If end date is provided, it must be >= start date
    if (data.eventEndDate && data.eventDate) {
      // Compare dates
      return new Date(data.eventEndDate) >= new Date(data.eventDate);
    }
    return true; // No end date provided, so validation passes
  },
  {
    message: "End date cannot be earlier than start date",
    path: ["eventEndDate"]
  }
).refine(
  (data) => {
    // If both dates are the same and both times are provided, end time must be after start time
    if (data.eventEndDate && data.eventDate && data.endTime && data.targetArrivalTime) {
      if (data.eventEndDate === data.eventDate) {
        return data.endTime > data.targetArrivalTime;
      }
    }
    return true; // Different dates or missing times, validation passes
  },
  {
    message: "End time must be after start time on the same day",
    path: ["endTime"]
  }
);

type PartyGroupFormValues = z.infer<typeof partyGroupFormSchema>;

export default function PartyGroupForm({ onSuccess, onCancel }: PartyGroupFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<PartyGroupFormValues | null>(null);
  const { toast } = useToast();

  const form = useForm<PartyGroupFormValues>({
    resolver: zodResolver(partyGroupFormSchema),
    defaultValues: {
      name: "",
      description: "",
      eventType: "birthday",
      eventAddress: "",
      eventCity: "",
      eventPostcode: "",
      eventDate: "",
      eventEndDate: "",
      targetArrivalTime: "",
      endTime: "",
      createdBy: "",
      phoneNumber: ""
    },
  });

  const partyGroupMutation = useMutation({
    mutationFn: (values: PartyGroupFormValues) => 
      createPartyGroup(values),
    onSuccess: (data) => {
      // Invalidate party groups query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/event-groups'] });

      toast({
        title: "Success!",
        description: "Event created successfully.",
      });
      form.reset();
      onSuccess(data.id);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create event. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: PartyGroupFormValues) => {
    setPendingFormData(values);
    setShowVerification(true);
  };

  const handleVerificationSuccess = () => {
    if (pendingFormData) {
      setIsLoading(true);
      partyGroupMutation.mutate(pendingFormData);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <h2 className="text-xl font-semibold mb-2 text-neutral-800">Create a New Event</h2>
      <p className="text-sm text-neutral-600 mb-6">Enter the event details to share with parents</p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {/* Event Information */}
            <div className="space-y-4">
              <h3 className="font-medium text-neutral-700 border-b border-neutral-200 pb-2">Event Information</h3>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Sarah's 10th Birthday Party" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="eventType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "birthday"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select event type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {eventTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <span>{option.icon}</span>
                              <span>{option.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="eventAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Street Address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="eventCity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="City" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="eventPostcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postcode</FormLabel>
                      <FormControl>
                        <Input placeholder="Postcode" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="eventDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          onChange={(e) => {
                            field.onChange(e);

                            // If end date is before the new start date, update end date
                            const endDate = form.getValues("eventEndDate");
                            if (endDate && new Date(endDate) < new Date(e.target.value)) {
                              form.setValue("eventEndDate", e.target.value);
                            }
                          }}
                          min={new Date().toISOString().split('T')[0]} // Set min to today
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="eventEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          value={field.value || ''} 
                          min={form.getValues("eventDate") || new Date().toISOString().split('T')[0]} // Min is party date or today
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="targetArrivalTime"
                  render={({ field }) => {
                    // Parse the time value
                    let hour = '';
                    let minute = '';

                    if (field.value) {
                      const parts = field.value.split(':');
                      if (parts.length === 2) {
                        hour = parts[0];
                        minute = parts[1];
                      }
                    }

                    // Set hour for start time
                    const setHour = (newHour: string) => {
                      if (newHour && minute) {
                        field.onChange(`${newHour}:${minute}`);
                      } else if (newHour) {
                        field.onChange(`${newHour}:00`);
                      } else {
                        field.onChange('');
                      }

                      // If on same day, check if end time should be adjusted
                      const eventDate = form.getValues("eventDate");
                      const eventEndDate = form.getValues("eventEndDate");
                      if (eventDate && eventEndDate && eventDate === eventEndDate) {
                        const endTime = form.getValues("endTime");
                        if (endTime) {
                          const startTimeParts = `${newHour}:${minute || '00'}`.split(':');
                          const endTimeParts = endTime.split(':');

                          const startHour = parseInt(startTimeParts[0], 10);
                          const endHour = parseInt(endTimeParts[0], 10);

                          if (endHour < startHour || (endHour === startHour && parseInt(endTimeParts[1], 10) <= parseInt(startTimeParts[1], 10))) {
                            // End time is before or equal to start time, adjust it
                            form.setValue("endTime", `${(startHour + 1).toString().padStart(2, '0')}:${startTimeParts[1]}`);
                          }
                        }
                      }
                    };

                    // Set minute for start time
                    const setMinute = (newMinute: string) => {
                      if (hour && newMinute) {
                        field.onChange(`${hour}:${newMinute}`);
                      } else if (hour) {
                        field.onChange(`${hour}:00`);
                      } else {
                        field.onChange('');
                      }

                      // Check end time for same day events
                      const eventDate = form.getValues("eventDate");
                      const eventEndDate = form.getValues("eventEndDate");
                      if (eventDate && eventEndDate && eventDate === eventEndDate) {
                        const endTime = form.getValues("endTime");
                        if (endTime) {
                          const startTimeParts = `${hour}:${newMinute}`.split(':');
                          const endTimeParts = endTime.split(':');

                          const startHour = parseInt(startTimeParts[0], 10);
                          const startMinute = parseInt(startTimeParts[1], 10);
                          const endHour = parseInt(endTimeParts[0], 10);
                          const endMinute = parseInt(endTimeParts[1], 10);

                          if (endHour < startHour || (endHour === startHour && endMinute <= startMinute)) {
                            // End time is before or equal to start time, adjust it
                            form.setValue("endTime", `${(startHour + 1).toString().padStart(2, '0')}:${newMinute}`);
                          }
                        }
                      }
                    };

                    return (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <div className="flex space-x-2">
                          {/* Hour Select */}
                          <div className="w-1/2">
                            <Select
                              value={hour || undefined}
                              onValueChange={setHour}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Hour" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 24 }).map((_, i) => {
                                  const hourValue = i.toString().padStart(2, '0');
                                  return (
                                    <SelectItem key={hourValue} value={hourValue}>
                                      {hourValue}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Minute Select */}
                          <div className="w-1/2">
                            <Select
                              value={minute || undefined}
                              onValueChange={setMinute}
                              disabled={!hour}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Minute" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="00">00</SelectItem>
                                <SelectItem value="15">15</SelectItem>
                                <SelectItem value="30">30</SelectItem>
                                <SelectItem value="45">45</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => {
                    // Parse the time value
                    let hour = '';
                    let minute = '';

                    if (field.value) {
                      const parts = field.value.split(':');
                      if (parts.length === 2) {
                        hour = parts[0];
                        minute = parts[1];
                      }
                    }

                    // Set hour
                    const setHour = (newHour: string) => {
                      if (newHour && minute) {
                        field.onChange(`${newHour}:${minute}`);
                      } else if (newHour) {
                        field.onChange(`${newHour}:00`);
                      } else {
                        field.onChange('');
                      }
                    };

                    // Set minute
                    const setMinute = (newMinute: string) => {
                      if (hour && newMinute) {
                        field.onChange(`${hour}:${newMinute}`);
                      } else if (hour) {
                        field.onChange(`${hour}:00`);
                      } else {
                        field.onChange('');
                      }
                    };

                    return (
                      <FormItem>
                        <FormLabel>End Time</FormLabel>
                        <div className="flex space-x-2">
                          {/* Hour Select */}
                          <div className="w-1/2">
                            <Select
                              value={hour || undefined}
                              onValueChange={setHour}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Hour" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 24 }).map((_, i) => {
                                  const hourValue = i.toString().padStart(2, '0');
                                  return (
                                    <SelectItem key={hourValue} value={hourValue}>
                                      {hourValue}
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Minute Select */}
                          <div className="w-1/2">
                            <Select
                              value={minute || undefined}
                              onValueChange={setMinute}
                              disabled={!hour}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Minute" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="00">00</SelectItem>
                                <SelectItem value="15">15</SelectItem>
                                <SelectItem value="30">30</SelectItem>
                                <SelectItem value="45">45</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>
            </div>

            {/* Admin Information */}
            <div className="space-y-4">
              <h3 className="font-medium text-neutral-700 border-b border-neutral-200 pb-2">Admin Information</h3>

              <FormField
                control={form.control}
                name="createdBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your name (as the event organizer)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., +44 7123 456789" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </div>
          </div>

          <div className="mt-8 flex justify-end space-x-3">
            {onCancel && (
              <Button 
                type="button" 
                variant="outline"
                onClick={() => onCancel()}
                className="px-6 py-2 font-medium rounded-md"
              >
                Cancel
              </Button>
            )}
            <Button 
              type="submit" 
              className="px-6 py-2 bg-primary text-white font-medium rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
              disabled={partyGroupMutation.isPending}
            >
              {partyGroupMutation.isPending ? "Creating..." : "Create Event"}
            </Button>
          </div>
        </form>
      </Form>
       <SMSVerificationDialog
        isOpen={showVerification}
        onClose={() => setShowVerification(false)}
        onVerified={handleVerificationSuccess}
        phoneNumber={form.watch("phoneNumber") || ""}
        action="create_event"
        title="Verify Phone Number"
        description="Please verify your phone number to create this event."
      />
    </div>
  );
}