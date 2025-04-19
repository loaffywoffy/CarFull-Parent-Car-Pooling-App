import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { insertPartyGroupSchema, type PartyGroup } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { updatePartyGroup } from "@/api/partyGroups";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";

interface PartyGroupEditFormProps {
  partyGroup: PartyGroup;
  onSuccess: (partyGroupId: number) => void;
  onCancel: () => void;
}

// Create the form schema with custom validations
const partyGroupFormSchema = insertPartyGroupSchema.extend({
  name: z.string().min(3, "Event name must be at least 3 characters"),
  partyAddress: z.string().min(5, "Event address is required"),
  partyCity: z.string().min(2, "City is required"),
  partyPostcode: z.string().min(3, "Postcode is required"),
  targetArrivalTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  partyEndDate: z.string().min(1, "End date is required")
}).refine(
  (data) => {
    // If end date is provided, it must be >= start date
    if (data.partyEndDate && data.partyDate) {
      // Compare dates
      return new Date(data.partyEndDate) >= new Date(data.partyDate);
    }
    return true; // No end date provided, so validation passes
  },
  {
    message: "End date cannot be earlier than start date",
    path: ["partyEndDate"]
  }
).refine(
  (data) => {
    // If both dates are the same and both times are provided, end time must be after start time
    if (data.partyEndDate && data.partyDate && data.endTime && data.targetArrivalTime) {
      if (data.partyEndDate === data.partyDate) {
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

export default function PartyGroupEditForm({ partyGroup, onSuccess, onCancel }: PartyGroupEditFormProps) {
  const { toast } = useToast();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingValues, setPendingValues] = useState<PartyGroupFormValues | null>(null);

  const form = useForm<PartyGroupFormValues>({
    resolver: zodResolver(partyGroupFormSchema),
    defaultValues: {
      name: partyGroup.name,
      description: partyGroup.description || "",
      partyAddress: partyGroup.partyAddress,
      partyCity: partyGroup.partyCity,
      partyPostcode: partyGroup.partyPostcode,
      partyDate: partyGroup.partyDate,
      partyEndDate: partyGroup.partyEndDate || "",
      targetArrivalTime: partyGroup.targetArrivalTime,
      endTime: partyGroup.endTime || "",
      createdBy: partyGroup.createdBy,
      accessCode: partyGroup.accessCode || null,
      additionalInformation: partyGroup.additionalInformation || "",
    },
  });

  const partyGroupMutation = useMutation({
    mutationFn: (values: PartyGroupFormValues) => 
      updatePartyGroup(partyGroup.id, values),
    onSuccess: (data) => {
      // Comprehensive invalidation of all related caches to ensure consistency
      
      // Invalidate the specific party group detail query
      queryClient.invalidateQueries({ queryKey: [`/api/party-groups/${partyGroup.id}`] });
      
      // Invalidate carpools for this party group
      queryClient.invalidateQueries({ queryKey: [`/api/party-groups/${partyGroup.id}/carpools`] });
      
      // Invalidate all party groups list
      queryClient.invalidateQueries({ queryKey: ['/api/party-groups'] });
      
      // Also invalidate any nested queries that might contain this party group's data
      queryClient.invalidateQueries({ queryKey: ['/api/carpools'] });
      
      toast({
        title: "Success!",
        description: "Event updated successfully.",
      });
      onSuccess(data.id);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update event. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: PartyGroupFormValues) => {
    // Store values and show confirmation dialog instead of immediately submitting
    setPendingValues(values);
    setShowConfirmDialog(true);
  };
  
  const handleConfirmEdit = () => {
    if (pendingValues) {
      partyGroupMutation.mutate(pendingValues);
    }
    setShowConfirmDialog(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <div className="flex items-center mb-4">
        <Button
          variant="ghost"
          size="sm"
          className="mr-2"
          onClick={onCancel}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div>
          <h2 className="text-xl font-semibold text-neutral-800">Edit Event</h2>
          <p className="text-sm text-neutral-600">Update the event details</p>
        </div>
      </div>
      
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
                name="partyAddress"
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
                  name="partyCity"
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
                  name="partyPostcode"
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
                  name="partyDate"
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
                            const endDate = form.getValues("partyEndDate");
                            if (endDate && new Date(endDate) < new Date(e.target.value)) {
                              form.setValue("partyEndDate", e.target.value);
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="partyEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          value={field.value || ''} 
                          min={form.getValues("partyDate") || ''} 
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
                      const partyDate = form.getValues("partyDate");
                      const partyEndDate = form.getValues("partyEndDate");
                      if (partyDate && partyEndDate && partyDate === partyEndDate) {
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
                      const partyDate = form.getValues("partyDate");
                      const partyEndDate = form.getValues("partyEndDate");
                      if (partyDate && partyEndDate && partyDate === partyEndDate) {
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
            
            {/* Organizer Information */}
            <div className="space-y-4">
              <h3 className="font-medium text-neutral-700 border-b border-neutral-200 pb-2">Organizer Information</h3>
              
              <FormField
                control={form.control}
                name="createdBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organizer Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="font-medium text-neutral-700 border-b border-neutral-200 pb-2">Additional Information</h3>
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Provide details about the event..." 
                        className="min-h-[100px]" 
                        {...field} 
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="additionalInformation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes for Parents</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any additional information parents should know..." 
                        className="min-h-[100px]" 
                        {...field} 
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={partyGroupMutation.isPending}
            >
              {partyGroupMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Form>
      
      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Confirm Event Updates
            </AlertDialogTitle>
            <AlertDialogDescription>
              You're about to update event details. These changes may affect existing carpool arrangements.
              <br /><br />
              Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmEdit}
              className="bg-primary hover:bg-primary/90"
            >
              Yes, Update Event
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}