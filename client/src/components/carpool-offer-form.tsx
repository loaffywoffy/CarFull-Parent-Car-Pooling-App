import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { insertCarpoolSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type CheckedState } from "@radix-ui/react-checkbox";
import { getPartyGroupById } from "@/api/partyGroups";
import { type PartyGroup } from "@shared/schema";
import { CalendarIcon, MapPinIcon, ClockIcon, CalculatorIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface CarpoolOfferFormProps {
  onSuccess: () => void;
  partyGroupId: number;
}

// Create the form schema
const carpoolFormSchema = z.object({
  partyGroupId: z.number().int().positive(),
  parentName: z.string().min(1, "Name is required"),
  childName: z.string().min(1, "Child's name is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  postcode: z.string().min(1, "Postcode is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  canPickup: z.boolean().default(false),
  canDropoff: z.boolean().default(false),
  canBoth: z.boolean().default(false),
  // Make spacesAvailable optional so it can be conditionally required based on selected options
  spacesAvailable: z.coerce.number().min(1).optional(),
  returnSpacesAvailable: z.coerce.number().optional(),
  dropoffPreference: z.string(),
  
  pickupLocation: z.string().optional(),
  pickupLocationCity: z.string().optional(),
  pickupLocationPostcode: z.string().optional(),
  additionalNotes: z.string().optional(),
  estimatedDepartureTime: z.string().optional(),
  
  // Emergency contact information
  emergencyContactName: z.string().min(1, "Emergency contact name is required"),
  emergencyContactPhone: z.string().min(1, "Emergency contact phone is required"),
  emergencyContactRelationship: z.string().min(1, "Relationship to child is required"),
}).refine((data) => {
  // If canPickup or canBoth is selected, spacesAvailable is required
  if ((data.canPickup || data.canBoth) && !data.spacesAvailable) {
    return false;
  }
  return true;
}, {
  message: "Spaces available to take to party is required",
  path: ["spacesAvailable"]
});

type CarpoolFormValues = z.infer<typeof carpoolFormSchema>;

export default function CarpoolOfferForm({ onSuccess, partyGroupId }: CarpoolOfferFormProps) {
  const { toast } = useToast();
  const [showPickupLocation, setShowPickupLocation] = useState(false);
  const [showHomeRadiusSelector, setShowHomeRadiusSelector] = useState(false);
  const [showMyAddressDisplay, setShowMyAddressDisplay] = useState(false);
  const [showReturnPreferences, setShowReturnPreferences] = useState(false);
  const [estimatedDepartureTime, setEstimatedDepartureTime] = useState("");
  const [homeRadius, setHomeRadius] = useState(1); // Default 1-mile radius

  // Fetch party group details
  const { data: partyGroup, isLoading: isLoadingPartyGroup } = useQuery({
    queryKey: ['/api/party-groups', partyGroupId],
    queryFn: () => getPartyGroupById(partyGroupId),
    enabled: !!partyGroupId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Calculate estimated departure time based on party time
  const calculateDepartureTimeFromArrival = (targetTime: string) => {
    // In a real application, we would use a mapping API to calculate travel time
    // For this demo, we'll use a simple estimate of 30 minutes travel time
    if (!targetTime) return "";
    
    const arrivalDateTime = new Date(`2025-01-01T${targetTime}`);
    const departureDateTime = new Date(arrivalDateTime.getTime() - 30 * 60000); // Subtract 30 minutes
    return departureDateTime.toTimeString().slice(0, 5); // Format as HH:MM
  };

  // Set departure time when party group is loaded
  useEffect(() => {
    if (partyGroup?.targetArrivalTime) {
      const time = calculateDepartureTimeFromArrival(partyGroup.targetArrivalTime);
      setEstimatedDepartureTime(time);
      
      if (form) {
        form.setValue("estimatedDepartureTime", time);
      }
    }
  }, [partyGroup]);
  
  const form = useForm<CarpoolFormValues>({
    resolver: zodResolver(carpoolFormSchema),
    defaultValues: {
      partyGroupId,
      parentName: "",
      childName: "",
      address: "",
      city: "",
      postcode: "",
      phoneNumber: "",
      canPickup: false,
      canDropoff: false,
      canBoth: false,
      spacesAvailable: 1,
      returnSpacesAvailable: 1, // Default same as spaces available for going to party
      dropoffPreference: "direct-home",
      
      pickupLocation: "",
      pickupLocationCity: "",
      pickupLocationPostcode: "",
      additionalNotes: "",
      estimatedDepartureTime: "",
      
      // Emergency contact information
      emergencyContactName: "",
      emergencyContactPhone: "",
      emergencyContactRelationship: "",
    },
  });

  const carpoolMutation = useMutation({
    mutationFn: (values: CarpoolFormValues) => 
      apiRequest("POST", "/api/carpools", values),
    onSuccess: () => {
      form.reset();
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit carpool offer. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: CarpoolFormValues) => {
    // If pickup-point is not selected, ensure pickupLocation is null/empty
    if (values.dropoffPreference !== "pickup-point") {
      values.pickupLocation = "";
      values.pickupLocationCity = "";
      values.pickupLocationPostcode = "";
    }
    
    // If only canDropoff is selected (not canPickup or canBoth), set spacesAvailable to 0
    if (values.canDropoff && !values.canPickup && !values.canBoth) {
      values.spacesAvailable = 0;
    }
    
    carpoolMutation.mutate(values);
  };

  const handleDropoffPreferenceChange = (value: string) => {
    // Handle different dropoff preference options
    setShowPickupLocation(value === "pickup-point");
    setShowMyAddressDisplay(value === "my-address");
    setShowHomeRadiusSelector(value === "direct-home");
    form.setValue("dropoffPreference", value);
  };
  
  // Update showReturnPreferences whenever canDropoff or canBoth changes
  useEffect(() => {
    const canDropoff = form.getValues("canDropoff");
    const canBoth = form.getValues("canBoth");
    setShowReturnPreferences(canDropoff || canBoth);
  }, [form.watch("canDropoff"), form.watch("canBoth")]);

  // Format date for display
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    
    return new Date(dateStr).toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <h2 className="text-xl font-semibold mb-6 text-neutral-800">Offer a Carpool</h2>
      
      {/* Party Details Section */}
      {isLoadingPartyGroup ? (
        <Card className="mb-6">
          <CardContent className="p-4">
            <Skeleton className="h-6 w-1/2 mb-3" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </CardContent>
        </Card>
      ) : partyGroup ? (
        <Card className="mb-6 bg-gradient-to-r from-primary-50 to-primary-100">
          <CardContent className="p-4">
            <h3 className="font-medium text-lg text-primary-800 mb-2 flex items-center">
              <MapPinIcon className="mr-2 h-5 w-5 text-primary-600" />
              {partyGroup.name}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600 mb-3">
              <div className="flex items-center">
                <CalendarIcon className="mr-2 h-4 w-4 text-primary-600" />
                {formatDate(partyGroup.partyDate)}
              </div>
              <div className="flex items-center">
                <ClockIcon className="mr-2 h-4 w-4 text-primary-600" />
                Start: {partyGroup.targetArrivalTime}
              </div>
            </div>
            
            <div className="bg-white p-3 rounded-md border border-primary-200 mb-2">
              <p className="text-gray-700 mb-1">
                <strong>Location:</strong> {partyGroup.partyAddress}, {partyGroup.partyCity}, {partyGroup.partyPostcode}
              </p>
              
              <div className="flex items-center text-sm mt-3 text-primary-700 font-medium">
                <CalculatorIcon className="mr-2 h-4 w-4" />
                <span>Estimated departure time: {estimatedDepartureTime || "Calculating..."}</span>
              </div>
            </div>
            
            {partyGroup.additionalInformation && (
              <div className="mt-3 text-xs text-gray-600">
                <strong>Additional Info:</strong> {partyGroup.additionalInformation}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Parent Information */}
            <div className="space-y-4 md:col-span-2">
              <h3 className="font-medium text-neutral-700 border-b border-neutral-200 pb-2">Your Information</h3>
              
              <FormField
                control={form.control}
                name="parentName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Full Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="childName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent of (Child's Name)</FormLabel>
                    <FormControl>
                      <Input placeholder="Child's Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Street Address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="city"
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
                  name="postcode"
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
                
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Phone Number" type="tel" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            {/* Carpool Options */}
            <div className="space-y-4 md:col-span-2">
              <h3 className="font-medium text-neutral-700 border-b border-neutral-200 pb-2">Carpool Options</h3>
              
              <div className="space-y-3">
                <FormLabel>I can offer:</FormLabel>
                <div className="flex flex-wrap gap-4">
                  <FormField
                    control={form.control}
                    name="canPickup"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="cursor-pointer">To take to the party</FormLabel>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="canDropoff"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked: CheckedState) => {
                              field.onChange(checked);
                              // Update showReturnPreferences directly based on current state
                              const canBoth = form.getValues("canBoth");
                              setShowReturnPreferences(checked === true || canBoth);
                              
                              // Set default dropoff preference when enabling this option
                              if (checked === true) {
                                form.setValue("dropoffPreference", "direct-home");
                              }
                            }}
                          />
                        </FormControl>
                        <FormLabel className="cursor-pointer">To pick up from the party</FormLabel>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="canBoth"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked: CheckedState) => {
                              field.onChange(checked);
                              // Update showReturnPreferences directly based on current state
                              const canDropoff = form.getValues("canDropoff");
                              setShowReturnPreferences(checked === true || canDropoff);
                            }}
                          />
                        </FormControl>
                        <FormLabel className="cursor-pointer">Both</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              {/* Show spaces available only if canPickup or canBoth is selected */}
              {(form.watch("canPickup") || form.watch("canBoth")) && (
                <FormField
                  control={form.control}
                  name="spacesAvailable"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Spaces Available to take to party</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(Number(value))} 
                        defaultValue={String(field.value)}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select number of spaces" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6].map((num) => (
                            <SelectItem key={num} value={String(num)}>
                              {num} {num === 1 ? 'space' : 'spaces'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              {/* Show return spaces available only if canDropoff or canBoth is selected */}
              {showReturnPreferences && (
                <FormField
                  control={form.control}
                  name="returnSpacesAvailable"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Spaces Available to pick up from party</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(Number(value))} 
                        defaultValue={String(field.value)}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select number of spaces" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6].map((num) => (
                            <SelectItem key={num} value={String(num)}>
                              {num} {num === 1 ? 'space' : 'spaces'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              

              
              {/* Show dropoff preference only if canDropoff or canBoth is selected */}
              {showReturnPreferences && (
                <div className="space-y-3">
                  <FormLabel>Dropoff Preference:</FormLabel>
                  <FormField
                    control={form.control}
                    name="dropoffPreference"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormControl>
                          <RadioGroup
                            onValueChange={(value) => handleDropoffPreferenceChange(value)}
                            defaultValue={field.value}
                            className="flex flex-col space-y-1"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="direct-home" />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                Directly to each child's home
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="my-address" />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                To my address
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="pickup-point" />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                To alternative central pickup point
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
              
              {/* Show parent's address when "my address" is selected */}
              {showMyAddressDisplay && (
                <div className="space-y-2 p-3 bg-gray-50 rounded-md border border-gray-200">
                  <h4 className="font-medium text-gray-800">Dropoff to Your Address</h4>
                  <div className="text-sm text-gray-600">
                    <p><strong>Address:</strong> {form.getValues("address")}</p>
                    <p><strong>City:</strong> {form.getValues("city")}</p>
                    <p><strong>Postcode:</strong> {form.getValues("postcode")}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Other parents will be asked to pick up their children from this address</p>
                </div>
              )}
              
              {/* Show home radius selector when "direct-home" is selected */}
              {showHomeRadiusSelector && (
                <div className="space-y-4 p-3 bg-gray-50 rounded-md border border-gray-200">
                  <h4 className="font-medium text-gray-800">Home Delivery Radius</h4>
                  <p className="text-sm text-gray-600 mb-2">Set the maximum distance you're willing to travel from your home (or alternative pickup point) to drop off children</p>
                  
                  <div className="flex items-center gap-2">
                    <Input 
                      type="range" 
                      min="0" 
                      max="5" 
                      step="0.5" 
                      value={homeRadius} 
                      onChange={(e) => setHomeRadius(parseFloat(e.target.value))}
                      className="w-2/3"
                    />
                    <span className="text-sm font-medium">{homeRadius} {homeRadius === 1 ? 'mile' : 'miles'}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">You will only be matched with passengers within this radius of your home</p>
                </div>
              )}
              
              {/* Show pickup location fields if pickup-point is selected */}
              {showPickupLocation && (
                <div className="space-y-4 p-3 bg-gray-50 rounded-md border border-gray-200">
                  <h4 className="font-medium text-gray-800">Central Pickup Point</h4>
                  
                  <FormField
                    control={form.control}
                    name="pickupLocation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Pickup Point Address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="pickupLocationCity"
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
                      name="pickupLocationPostcode"
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
                </div>
              )}
              
              <FormField
                control={form.control}
                name="additionalNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any special requirements or information you'd like to share with other parents..." 
                        className="resize-none" 
                        rows={3}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Emergency Contact Information */}
              <div className="mt-8 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Emergency Contact</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    This information will only be used in case of emergency through our one-tap emergency notification system.
                  </p>
                </div>
                
                <div className="p-4 border border-red-100 rounded-md bg-red-50 space-y-4">
                  <FormField
                    control={form.control}
                    name="emergencyContactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Emergency Contact Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="emergencyContactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Emergency Contact Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="Phone number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="emergencyContactRelationship"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Relationship to You</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Spouse, Parent, Friend" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button 
              type="submit" 
              className="w-full sm:w-auto"
              disabled={carpoolMutation.isPending || isLoadingPartyGroup}
            >
              {carpoolMutation.isPending ? "Submitting..." : "Submit Carpool Offer"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}