import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar, Share2, Users, MapPin, Cake, GraduationCap, Heart, Trophy, School, PartyPopper, ChevronLeft } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { InsertPartyGroup, insertPartyGroupSchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import confetti from "canvas-confetti";
import { SMSVerificationDialog } from "@/components/sms-verification-dialog";
import { PhoneInputWithValidation } from "@/components/phone-input-with-validation";
import { useQuery } from "@tanstack/react-query";
import { getCarfullStatistics } from "@/api/statistics";

// Form validation schema matching the existing party group form
const partyGroupFormSchema = insertPartyGroupSchema.extend({
  name: z.string().min(3, "Event name must be at least 3 characters"),
  eventAddress: z.string().min(5, "Event address is required"),
  eventCity: z.string().min(2, "City is required"),
  eventPostcode: z.string().min(3, "Postcode is required"),
  targetArrivalTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  eventEndDate: z.string().min(1, "End date is required"),
  phoneNumber: z.string().min(10, "Phone number is required")
}).refine(
  (data) => {
    if (data.eventEndDate && data.eventDate) {
      return new Date(data.eventEndDate) >= new Date(data.eventDate);
    }
    return true;
  },
  {
    message: "End date cannot be earlier than start date",
    path: ["eventEndDate"]
  }
).refine(
  (data) => {
    if (data.eventEndDate && data.eventDate && data.endTime && data.targetArrivalTime) {
      if (data.eventEndDate === data.eventDate) {
        return data.endTime > data.targetArrivalTime;
      }
    }
    return true;
  },
  {
    message: "End time must be after start time on the same day",
    path: ["endTime"]
  }
);

type PartyGroupFormValues = z.infer<typeof partyGroupFormSchema>;

// Generate time options in 15-minute intervals
const generateTimeOptions = () => {
  const times = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const displayTime = new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      times.push({ value: timeString, label: displayTime });
    }
  }
  return times;
};

const timeOptions = generateTimeOptions();

export default function OrganizerHomePage() {
  const [showForm, setShowForm] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<PartyGroupFormValues | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Fetch real statistics from the database
  const { data: statistics, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/statistics"],
    queryFn: getCarfullStatistics,
  });

  const form = useForm<PartyGroupFormValues>({
    resolver: zodResolver(partyGroupFormSchema),
    defaultValues: {
      name: "",
      eventType: "",
      description: "",
      eventAddress: "",
      eventCity: "",
      eventPostcode: "",
      eventDate: "",
      eventEndDate: "",
      targetArrivalTime: "",
      endTime: "",
      createdBy: "",
      phoneNumber: "",
      additionalInformation: "",
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async (eventData: PartyGroupFormValues) => {
      console.log("Making API request with data:", eventData);
      const res = await apiRequest("POST", "/api/party-groups", eventData);
      console.log("API response status:", res.status);
      return await res.json();
    },
    onSuccess: (event) => {
      console.log("Success callback triggered with event:", event);
      
      // Trigger confetti animation
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      
      toast({
        title: "Event Created Successfully!",
        description: "Your event has been created and is ready for carpools. Share the link with parents.",
      });
      
      // Redirect to the shareable event URL after a short delay to show confetti
      console.log("Setting redirect to:", `/events/${event.shareableUrl}`);
      setTimeout(() => {
        console.log("Executing redirect to:", `/events/${event.shareableUrl}`);
        setLocation(`/events/${event.shareableUrl}`);
      }, 1500);
    },
    onError: (error) => {
      toast({
        title: "Failed to create event",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: PartyGroupFormValues) => {
    console.log("Form submitted with values:", values);
    console.log("Form errors:", form.formState.errors);
    setPendingFormData(values);
    setShowVerification(true);
  };

  const handleVerificationSuccess = () => {
    if (pendingFormData) {
      setShowVerification(false);
      createEventMutation.mutate(pendingFormData);
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to Carfull</h1>
          <p className="text-xl text-gray-600 mb-8">Set up carpools for your event and share a simple link with parents.</p>
          
          {!showForm && (
            <Button onClick={() => setShowForm(true)} size="lg" className="bg-blue-600 hover:bg-blue-700">
              <Calendar className="h-5 w-5 mr-2" />
              Create New Event
            </Button>
          )}
        </div>

        {/* How it works */}
        {!showForm && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-lg">1. Create Event</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Set up your event details including date, time, and location.</p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2">
                  <Share2 className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle className="text-lg">2. Share Link</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Get a unique URL to share with parents via email, text, or social media.</p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-2">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle className="text-lg">3. Parents Join</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Parents can offer rides or request spots without creating accounts</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Kidpool Data Section */}
        {!showForm && (
          <div className="mb-12">
            <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-gray-900 mb-2">Carfull Impact</CardTitle>
                <CardDescription className="text-gray-600">
                  Real data showing the positive impact of our carpool community
                </CardDescription>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="text-center p-4 bg-white rounded-lg">
                        <div className="h-8 bg-gray-200 rounded mb-2 animate-pulse"></div>
                        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                ) : statistics ? (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                      <div className="text-2xl font-bold text-blue-600 mb-1">
                        {statistics.totalEvents}
                      </div>
                      <div className="text-sm text-gray-600">Events Created</div>
                    </div>
                    
                    <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                      <div className="text-2xl font-bold text-green-600 mb-1">
                        {statistics.carpoolOffers}
                      </div>
                      <div className="text-sm text-gray-600">Carpool Offers</div>
                    </div>
                    
                    <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                      <div className="text-2xl font-bold text-purple-600 mb-1">
                        {statistics.ridesAccepted}
                      </div>
                      <div className="text-sm text-gray-600">Rides Taken</div>
                    </div>
                    
                    <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                      <div className="text-2xl font-bold text-orange-600 mb-1">
                        {statistics.milesSaved}
                      </div>
                      <div className="text-sm text-gray-600">Miles Saved</div>
                    </div>
                    
                    <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                      <div className="text-2xl font-bold text-red-600 mb-1">
                        {statistics.co2ReductionKg}kg
                      </div>
                      <div className="text-sm text-gray-600">CO₂ Reduced</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    Unable to load statistics at the moment
                  </div>
                )}
                
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600">
                    CO₂ calculation based on{" "}
                    <a 
                      href="https://www.epa.gov/greenvehicles/greenhouse-gas-emissions-typical-passenger-vehicle#:~:text=including%20the%20calculations.-,How%20much%20tailpipe%20carbon%20dioxide%20(CO2)%20is%20emitted%20from,of%20CO2%20per%20mile."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      EPA data
                    </a>
                    : 400g per mile for average passenger vehicle
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Event Creation Form */}
        {showForm && (
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              {/* Mobile-first layout with back button in top right */}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 pr-3">
                  <CardTitle className="text-xl sm:text-2xl font-bold leading-tight">
                    Create New Event
                  </CardTitle>
                  <CardDescription className="mt-1 text-sm sm:text-base text-gray-600">
                    Fill in your event details to create a shareable carpool page
                  </CardDescription>
                </div>
                <div className="flex-shrink-0">
                  <Button 
                    type="button" 
                    onClick={() => setShowForm(false)} 
                    variant="ghost" 
                    size="sm"
                    className="flex items-center gap-1 sm:gap-2 text-gray-600 hover:text-gray-900"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="sm:hidden">Back</span>
                    <span className="hidden sm:inline">Back to Home</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    {/* Event Information */}
                    <div className="space-y-4">
                      <h3 className="font-medium text-gray-700 border-b border-gray-200 pb-2">Event Information</h3>

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
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select event type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="birthday">
                                  <div className="flex items-center gap-2">
                                    <Cake className="h-4 w-4" />
                                    Birthday Party
                                  </div>
                                </SelectItem>
                                <SelectItem value="bar-mitzvah">
                                  <div className="flex items-center gap-2">
                                    <School className="h-4 w-4" />
                                    Bar/Bat Mitzvah
                                  </div>
                                </SelectItem>
                                <SelectItem value="graduation">
                                  <div className="flex items-center gap-2">
                                    <GraduationCap className="h-4 w-4" />
                                    Graduation
                                  </div>
                                </SelectItem>
                                <SelectItem value="wedding">
                                  <div className="flex items-center gap-2">
                                    <Heart className="h-4 w-4" />
                                    Wedding
                                  </div>
                                </SelectItem>
                                <SelectItem value="celebration">
                                  <div className="flex items-center gap-2">
                                    <PartyPopper className="h-4 w-4" />
                                    Celebration
                                  </div>
                                </SelectItem>
                                <SelectItem value="sports">
                                  <div className="flex items-center gap-2">
                                    <Trophy className="h-4 w-4" />
                                    Sports Event
                                  </div>
                                </SelectItem>
                                <SelectItem value="school">
                                  <div className="flex items-center gap-2">
                                    <School className="h-4 w-4" />
                                    School Event
                                  </div>
                                </SelectItem>
                                <SelectItem value="other">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    Other
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />


                    </div>

                    {/* Date and Time */}
                    <div className="space-y-4">
                      <h3 className="font-medium text-gray-700 border-b border-gray-200 pb-2">Date & Time</h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="eventDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Start Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
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
                                <Input type="date" {...field} />
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
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Start Time</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select start time" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="max-h-60">
                                  {timeOptions.map((time) => (
                                    <SelectItem key={time.value} value={time.value}>
                                      {time.label}
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
                          name="endTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>End Time</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select end time" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="max-h-60">
                                  {timeOptions.map((time) => (
                                    <SelectItem key={time.value} value={time.value}>
                                      {time.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Location */}
                    <div className="space-y-4">
                      <h3 className="font-medium text-gray-700 border-b border-gray-200 pb-2">Location</h3>

                      <FormField
                        control={form.control}
                        name="eventAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                              <Input placeholder="123 Main Street" {...field} />
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
                                <Input placeholder="London" {...field} />
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
                                <Input placeholder="SW1A 1AA" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Organizer Information */}
                    <div className="space-y-4">
                      <h3 className="font-medium text-gray-700 border-b border-gray-200 pb-2">Organizer Information</h3>

                      <FormField
                        control={form.control}
                        name="createdBy"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Your Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Jane Smith or jane@example.com" {...field} />
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
                            <FormControl>
                              <PhoneInputWithValidation
                                value={field.value || ""}
                                onChange={field.onChange}
                                label="Your Phone Number"
                                placeholder="Your Phone Number (used to verify event creation)"
                                required={true}
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

                  <div className="flex space-x-3 pt-4">
                    <Button 
                      type="button" 
                      onClick={() => setShowForm(false)} 
                      variant="outline" 
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createEventMutation.isPending}
                      className="flex-1"
                      onClick={() => {
                        console.log("Submit button clicked");
                        console.log("Form is valid:", form.formState.isValid);
                        console.log("Form errors:", form.formState.errors);
                        console.log("Form values:", form.getValues());
                      }}
                    >
                      {createEventMutation.isPending ? "Creating..." : "Create Event"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* SMS Verification Dialog */}
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
    </div>
  );
}