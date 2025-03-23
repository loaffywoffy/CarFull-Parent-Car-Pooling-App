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
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type CheckedState } from "@radix-ui/react-checkbox";

interface CarpoolOfferFormProps {
  onSuccess: () => void;
}

// Create the form schema
const carpoolFormSchema = z.object({
  parentName: z.string().min(1, "Name is required"),
  childName: z.string().min(1, "Child's name is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  postcode: z.string().min(1, "Postcode is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  canPickup: z.boolean().default(false),
  canDropoff: z.boolean().default(false),
  canBoth: z.boolean().default(false),
  spacesAvailable: z.coerce.number().min(1), // Coerce ensures type conversion
  dropoffPreference: z.string(),
  maxDistance: z.coerce.number().optional(),
  pickupLocation: z.string().optional(),
  pickupLocationCity: z.string().optional(),
  pickupLocationPostcode: z.string().optional(),
  additionalNotes: z.string().optional(),
  partyAddress: z.string().optional(),
  partyCity: z.string().optional(),
  partyPostcode: z.string().optional(),
  targetArrivalTime: z.string().optional(),
  estimatedDepartureTime: z.string().optional(),
});

type CarpoolFormValues = z.infer<typeof carpoolFormSchema>;

export default function CarpoolOfferForm({ onSuccess }: CarpoolOfferFormProps) {
  const { toast } = useToast();
  const [showPickupLocation, setShowPickupLocation] = useState(false);
  const [showPartyDetails, setShowPartyDetails] = useState(false);
  const [showReturnPreferences, setShowReturnPreferences] = useState(false);
  const [estimatedDepartureTime, setEstimatedDepartureTime] = useState("");

  const form = useForm<CarpoolFormValues>({
    resolver: zodResolver(carpoolFormSchema),
    defaultValues: {
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
      dropoffPreference: "direct-home",
      maxDistance: 5, // Default max distance of 5 miles
      pickupLocation: "",
      additionalNotes: "",
      partyAddress: "",
      partyCity: "",
      partyPostcode: "",
      targetArrivalTime: "",
      estimatedDepartureTime: "",
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
    }
    
    carpoolMutation.mutate(values);
  };

  const handleDropoffPreferenceChange = (value: string) => {
    setShowPickupLocation(value === "pickup-point");
    form.setValue("dropoffPreference", value);
  };
  
  // Toggle showing party details and departure time calculator
  const togglePartyDetails = () => {
    setShowPartyDetails(!showPartyDetails);
  };
  
  // Calculate estimated departure time based on travel time (simplified version)
  const calculateDepartureTime = () => {
    // Get values from the form
    const targetTime = form.getValues("targetArrivalTime");
    
    if (!targetTime) {
      toast({
        title: "Missing Information",
        description: "Please enter a target arrival time.",
        variant: "destructive",
      });
      return;
    }
    
    // In a real application, we would use a mapping API to calculate travel time
    // For this demo, we'll use a simple estimate of 30 minutes travel time
    const arrivalDateTime = new Date(`2025-01-01T${targetTime}`);
    const departureDateTime = new Date(arrivalDateTime.getTime() - 30 * 60000); // Subtract 30 minutes
    
    const departureTime = departureDateTime.toTimeString().slice(0, 5); // Format as HH:MM
    
    // Set the departure time in the form and state
    form.setValue("estimatedDepartureTime", departureTime);
    setEstimatedDepartureTime(departureTime);
  };
  
  // Whenever party address changes, we should recalculate the departure time
  useEffect(() => {
    if (form.getValues("targetArrivalTime") && form.getValues("partyAddress")) {
      calculateDepartureTime();
    }
  }, [form.watch("partyAddress"), form.watch("targetArrivalTime")]);
  
  // Update showReturnPreferences whenever canDropoff or canBoth changes
  useEffect(() => {
    const canDropoff = form.getValues("canDropoff");
    const canBoth = form.getValues("canBoth");
    setShowReturnPreferences(canDropoff || canBoth);
  }, [form.watch("canDropoff"), form.watch("canBoth")]);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <h2 className="text-xl font-semibold mb-6 text-neutral-800">Offer a Carpool</h2>
      
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
              
              {/* Party Details Button */}
              <div className="mb-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={togglePartyDetails}
                  className="w-full justify-center py-2"
                >
                  {showPartyDetails ? "Hide Party Details" : "Add Party Details & Calculate Travel Time"}
                </Button>
              </div>
              
              {/* Party Details Section */}
              {showPartyDetails && (
                <div className="bg-gray-50 p-4 rounded-md mb-4 border border-gray-200">
                  <h4 className="font-medium text-neutral-700 mb-3">Party Details</h4>
                  
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="partyAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Party Address</FormLabel>
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
                    
                    <FormField
                      control={form.control}
                      name="targetArrivalTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Arrival Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
                      <h5 className="font-medium text-blue-800 mb-2">Estimated Departure Time</h5>
                      {estimatedDepartureTime ? (
                        <p className="text-lg font-semibold text-blue-700">{estimatedDepartureTime}</p>
                      ) : (
                        <p className="text-sm text-blue-600">Fill in party address and arrival time to calculate</p>
                      )}
                      <p className="text-xs text-blue-500 mt-1">Based on estimated travel time (30 minutes for demo)</p>
                      
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={calculateDepartureTime}
                        className="mt-2 w-full justify-center py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-800"
                      >
                        Recalculate
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
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
              
              <FormField
                control={form.control}
                name="spacesAvailable"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Spaces Available in Car</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(Number(value))} 
                      defaultValue={String(field.value)}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select number of spaces" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="4">4</SelectItem>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="6">6+</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {showReturnPreferences && (
                <div className="space-y-3">
                  <FormLabel>For pickup from party - Return preferences:</FormLabel>
                  <RadioGroup 
                    defaultValue="direct-home"
                    onValueChange={handleDropoffPreferenceChange}
                  >
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="direct-home" id="direct-home" />
                        <label htmlFor="direct-home" className="cursor-pointer">Direct to child's home</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="my-home" id="my-home" />
                        <label htmlFor="my-home" className="cursor-pointer">To my home (parent collects from there)</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="pickup-point" id="pickup-point" />
                        <label htmlFor="pickup-point" className="cursor-pointer">To another meeting point</label>
                      </div>
                    </div>
                  </RadioGroup>
                  
                  {/* Maximum Distance Setting for direct-to-home dropoffs */}
                  {form.watch("dropoffPreference") === "direct-home" && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-md border border-gray-200">
                      <FormField
                        control={form.control}
                        name="maxDistance"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm">Maximum distance you'll travel to drop off a child:</FormLabel>
                            <div className="flex items-center gap-2">
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="1" 
                                  max="50" 
                                  step="1"
                                  className="w-20"
                                  {...field}
                                  value={field.value || 5}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 5)}
                                />
                              </FormControl>
                              <span className="text-gray-600">miles</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">This helps parents know if their address is within your range</p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>
              )}
              
              {showPickupLocation && (
                <FormField
                  control={form.control}
                  name="pickupLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meeting Location</FormLabel>
                      <FormControl>
                        <Input placeholder="Address or description of meeting point" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <FormField
                control={form.control}
                name="additionalNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any special instructions or information" 
                        rows={3}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <Button 
              type="submit" 
              className="px-6 py-2 bg-primary text-white font-medium rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
              disabled={carpoolMutation.isPending}
            >
              {carpoolMutation.isPending ? "Submitting..." : "Submit Carpool Offer"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
