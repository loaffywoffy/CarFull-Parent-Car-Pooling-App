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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type CheckedState } from "@radix-ui/react-checkbox";
import { getPartyGroupById } from "@/api/partyGroups";
import { type PartyGroup } from "@shared/schema";
import { CalendarIcon, MapPinIcon, ClockIcon, CalculatorIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import LocationMap from "@/components/location-map";
import { geocodeAddress } from "@/lib/geocoding";

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
  
  // Outbound dropoff preferences (when taking TO the party)
  outboundDropoffPreference: z.string().optional(),
  outboundMaxDistance: z.coerce.number().optional(),
  outboundPickupLocation: z.string().optional(),
  outboundPickupLocationCity: z.string().optional(),
  outboundPickupLocationPostcode: z.string().optional(),
  outboundDepartureTime: z.string().optional(),
  
  // Return dropoff preferences (when picking up FROM the party)
  returnDropoffPreference: z.string().optional(),
  returnMaxDistance: z.coerce.number().optional(),
  returnPickupLocation: z.string().optional(),
  returnPickupLocationCity: z.string().optional(),
  returnPickupLocationPostcode: z.string().optional(),
  returnCollectionTime: z.string().optional(),
  
  // Legacy fields (for backward compatibility)
  dropoffPreference: z.string(),
  maxDistance: z.coerce.number().optional(),
  pickupLocation: z.string().optional(),
  pickupLocationCity: z.string().optional(),
  pickupLocationPostcode: z.string().optional(),
  
  additionalNotes: z.string().optional(),
  estimatedDepartureTime: z.string().optional(),
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
  
  // Fetch party group details
  const { data: partyGroup, isLoading: isLoadingPartyGroup } = useQuery({
    queryKey: ['/api/party-groups', partyGroupId],
    queryFn: () => getPartyGroupById(partyGroupId),
    enabled: !!partyGroupId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Show preferences based on selected options
  const [showOutboundPreferences, setShowOutboundPreferences] = useState(false);
  const [showReturnPreferences, setShowReturnPreferences] = useState(false);
  
  // Outbound (TO party) specific states
  const [outboundDropoffPreference, setOutboundDropoffPreference] = useState("direct-home");
  const [showOutboundPickupLocation, setShowOutboundPickupLocation] = useState(false);
  const [showOutboundMyAddressDisplay, setShowOutboundMyAddressDisplay] = useState(false);
  const [outboundDepartureTime, setOutboundDepartureTime] = useState("");
  
  // Return (FROM party) specific states
  const [returnDropoffPreference, setReturnDropoffPreference] = useState("direct-home");
  const [showReturnPickupLocation, setShowReturnPickupLocation] = useState(false);
  const [showReturnMyAddressDisplay, setShowReturnMyAddressDisplay] = useState(false);
  const [returnCollectionTime, setReturnCollectionTime] = useState("");
  const [showCustomReturnTime, setShowCustomReturnTime] = useState(false);
  
  // Legacy state for backward compatibility
  const [showPickupLocation, setShowPickupLocation] = useState(false);
  const [showHomeRadiusSelector, setShowHomeRadiusSelector] = useState(false);
  const [showMyAddressDisplay, setShowMyAddressDisplay] = useState(false);
  const [homeRadius, setHomeRadius] = useState(2); // Default 2-mile radius
  const [showMap, setShowMap] = useState(false); // State for showing/hiding map

  // Set up the default value for showCustomReturnTime based on partyGroup
  useEffect(() => {
    setShowCustomReturnTime(!partyGroup?.endTime);
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
      
      // Outbound dropoff preferences (when taking TO the party)
      outboundDropoffPreference: "direct-home",
      outboundMaxDistance: 2,
      outboundPickupLocation: "",
      outboundPickupLocationCity: "",
      outboundPickupLocationPostcode: "",
      
      // Return dropoff preferences (when picking up FROM the party)
      returnDropoffPreference: "direct-home",
      returnMaxDistance: 2,
      returnPickupLocation: "",
      returnPickupLocationCity: "",
      returnPickupLocationPostcode: "",
      
      // Legacy fields (for backward compatibility)
      dropoffPreference: "direct-home",
      maxDistance: 2,
      pickupLocation: "",
      pickupLocationCity: "",
      pickupLocationPostcode: "",
      additionalNotes: "",
      estimatedDepartureTime: "",
    },
  });

  const carpoolMutation = useMutation({
    mutationFn: (values: CarpoolFormValues) => 
      apiRequest("POST", "/api/carpools", values),
    onSuccess: () => {
      // Invalidate the carpools query to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['/api/party-groups', partyGroupId, 'carpools'] });
      
      // Also invalidate the parent query in case counts need to be updated
      queryClient.invalidateQueries({ queryKey: ['/api/party-groups'] });
      
      toast({
        title: "Success!",
        description: "Your carpool offer has been submitted successfully.",
      });
      
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
    // Set a fixed max distance for all locations - no radius picker
    const DEFAULT_MAX_DISTANCE = 5;
    
    // Handle outbound preferences (TO party)
    if (values.canPickup || values.canBoth) {
      // Set outbound dropoff preferences
      values.outboundMaxDistance = DEFAULT_MAX_DISTANCE;
      
      if (values.outboundDropoffPreference !== "pickup-point") {
        // Clear outbound pickup location if not needed
        values.outboundPickupLocation = "";
        values.outboundPickupLocationCity = "";
        values.outboundPickupLocationPostcode = "";
      }
    } else {
      // Not offering outbound ride, clear all outbound fields
      values.outboundDropoffPreference = "";
      values.outboundMaxDistance = 0;
      values.outboundPickupLocation = "";
      values.outboundPickupLocationCity = "";
      values.outboundPickupLocationPostcode = "";
    }
    
    // Handle return preferences (FROM party)
    if (values.canDropoff || values.canBoth) {
      // Set return dropoff preferences with fixed distance
      values.returnMaxDistance = DEFAULT_MAX_DISTANCE;
      
      if (values.returnDropoffPreference !== "pickup-point") {
        // Clear return pickup location if not needed
        values.returnPickupLocation = "";
        values.returnPickupLocationCity = "";
        values.returnPickupLocationPostcode = "";
      }
    } else {
      // Not offering return ride, clear all return fields
      values.returnDropoffPreference = "";
      values.returnMaxDistance = 0;
      values.returnPickupLocation = "";
      values.returnPickupLocationCity = "";
      values.returnPickupLocationPostcode = "";
      
      // If only offering pickup (TO party), set returnSpacesAvailable to 0
      values.returnSpacesAvailable = 0;
    }
    
    // If only offering dropoff (FROM party), set spacesAvailable to 0
    if (values.canDropoff && !values.canPickup && !values.canBoth) {
      values.spacesAvailable = 0;
    }
    
    // Legacy compatibility - copy outbound preference to legacy field
    values.dropoffPreference = values.outboundDropoffPreference || "direct-home";
    values.maxDistance = DEFAULT_MAX_DISTANCE;
    
    if (values.dropoffPreference === "pickup-point") {
      values.pickupLocation = values.outboundPickupLocation || "";
      values.pickupLocationCity = values.outboundPickupLocationCity || "";
      values.pickupLocationPostcode = values.outboundPickupLocationPostcode || "";
    } else {
      values.pickupLocation = "";
      values.pickupLocationCity = "";
      values.pickupLocationPostcode = "";
    }
    
    carpoolMutation.mutate(values);
  };

  // Handle outbound dropoff preference changes (TO party)
  const handleOutboundDropoffPreferenceChange = (value: string) => {
    setOutboundDropoffPreference(value);
    setShowOutboundPickupLocation(value === "pickup-point");
    setShowOutboundMyAddressDisplay(value === "my-address");
    // No longer using radius selector
    form.setValue("outboundDropoffPreference", value);
    
    // For legacy compatibility
    form.setValue("dropoffPreference", value);
  };
  
  // Handle return dropoff preference changes (FROM party)
  const handleReturnDropoffPreferenceChange = (value: string) => {
    setReturnDropoffPreference(value);
    setShowReturnPickupLocation(value === "pickup-point");
    setShowReturnMyAddressDisplay(value === "my-address");
    // No longer using radius selector
    form.setValue("returnDropoffPreference", value);
  };
  
  // Legacy handler for backward compatibility
  const handleDropoffPreferenceChange = (value: string) => {
    // Handle different dropoff preference options
    setShowPickupLocation(value === "pickup-point");
    setShowMyAddressDisplay(value === "my-address");
    setShowHomeRadiusSelector(value === "direct-home");
    form.setValue("dropoffPreference", value);
  };
  
  // Update showOutboundPreferences whenever canPickup or canBoth changes
  useEffect(() => {
    const canPickup = form.getValues("canPickup");
    const canBoth = form.getValues("canBoth");
    setShowOutboundPreferences(canPickup || canBoth);
  }, [form.watch("canPickup"), form.watch("canBoth")]);
  
  // Update showReturnPreferences whenever canDropoff or canBoth changes
  useEffect(() => {
    const canDropoff = form.getValues("canDropoff");
    const canBoth = form.getValues("canBoth");
    setShowReturnPreferences(canDropoff || canBoth);
  }, [form.watch("canDropoff"), form.watch("canBoth")]);
  
  // State for event location coordinates
  const [eventLocation, setEventLocation] = useState<[number, number]>([51.5074, -0.1278]);
  
  // Geocode the event address when partyGroup data is loaded
  useEffect(() => {
    if (partyGroup) {
      // Create a complete address from the partyGroup details
      const fullAddress = `${partyGroup.partyAddress}, ${partyGroup.partyCity}, ${partyGroup.partyPostcode}`;
      
      // Geocode the address
      geocodeAddress(partyGroup.partyAddress, partyGroup.partyCity, partyGroup.partyPostcode)
        .then(coordinates => {
          setEventLocation(coordinates);
        })
        .catch(error => {
          console.error("Error geocoding event location:", error);
          // Use default coordinates if geocoding fails
          setEventLocation([51.5074, -0.1278]);
        });
    }
  }, [partyGroup]);

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
                <span>Time: {partyGroup.targetArrivalTime} - {partyGroup.endTime || "Not specified"}</span>
              </div>
            </div>
            
            <div className="bg-white p-3 rounded-md border border-primary-200 mb-2">
              <div className="flex justify-between items-center">
                <p className="text-gray-700">
                  <strong>Location:</strong> {partyGroup.partyAddress}, {partyGroup.partyCity}, {partyGroup.partyPostcode}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={() => setShowMap(!showMap)}
                >
                  <MapPinIcon className="h-3.5 w-3.5" />
                  {showMap ? 'Hide Map' : 'Show Map'}
                </Button>
              </div>
              
              {/* Collapsible map section */}
              {showMap && (
                <div className="mt-3">
                  <LocationMap
                    locations={[{
                      label: partyGroup.name,
                      position: eventLocation,
                      type: 'party'
                    }]}
                    height="240px"
                    initialZoom={14}
                  />
                </div>
              )}
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
                            onCheckedChange={(checked: CheckedState) => {
                              field.onChange(checked);
                              if (checked) {
                                form.setValue("canBoth", false);
                                form.setValue("canDropoff", false);
                              }
                            }} 
                          />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">
                          Take children TO the party
                        </FormLabel>
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
                              if (checked) {
                                form.setValue("canBoth", false);
                                form.setValue("canPickup", false);
                              }
                            }} 
                          />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">
                          Pick up children FROM the party
                        </FormLabel>
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
                              if (checked) {
                                form.setValue("canPickup", false);
                                form.setValue("canDropoff", false);
                              }
                            }} 
                          />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">
                          BOTH ways (to and from)
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              {/* Outbound spaces (TO party) */}
              {showOutboundPreferences && (
                <div className="space-y-4 border-l-2 border-primary-200 pl-4">
                  <FormField
                    control={form.control}
                    name="spacesAvailable"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Spaces Available to take TO party</FormLabel>
                        <Select
                          value={field.value?.toString()}
                          onValueChange={(value) => field.onChange(parseInt(value))}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select spaces available" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1">1 seat</SelectItem>
                            <SelectItem value="2">2 seats</SelectItem>
                            <SelectItem value="3">3 seats</SelectItem>
                            <SelectItem value="4">4 seats</SelectItem>
                            <SelectItem value="5">5 seats</SelectItem>
                            <SelectItem value="6">6 seats</SelectItem>
                            <SelectItem value="7">7+ seats</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
              
              {/* Return spaces (FROM party) */}
              {showReturnPreferences && (
                <div className="space-y-4 border-l-2 border-primary-200 pl-4">
                  <FormField
                    control={form.control}
                    name="returnSpacesAvailable"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Spaces Available to pick up FROM party</FormLabel>
                        <Select
                          value={field.value?.toString()}
                          onValueChange={(value) => field.onChange(parseInt(value))}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select spaces available" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1">1 seat</SelectItem>
                            <SelectItem value="2">2 seats</SelectItem>
                            <SelectItem value="3">3 seats</SelectItem>
                            <SelectItem value="4">4 seats</SelectItem>
                            <SelectItem value="5">5 seats</SelectItem>
                            <SelectItem value="6">6 seats</SelectItem>
                            <SelectItem value="7">7+ seats</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
              
              {/* Outbound dropoff preferences (TO party) */}
              {showOutboundPreferences && (
                <div className="space-y-3 border-t border-gray-100 pt-4 mt-4">
                  <h4 className="font-medium text-primary-700">Trip Preferences (TO Party)</h4>
                  
                  <FormLabel>Dropoff Preference when taking TO the party:</FormLabel>
                  <FormField
                    control={form.control}
                    name="outboundDropoffPreference"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormControl>
                          <RadioGroup
                            onValueChange={(value) => handleOutboundDropoffPreferenceChange(value)}
                            defaultValue={field.value || "direct-home"}
                            className="flex flex-col space-y-1"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="direct-home" />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                I'll collect each child from their home
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="my-address" />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                Parents bring children to my home for group departure
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="pickup-point" />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                Meet at an agreed central location
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Outbound pickup location fields if pickup-point is selected */}
                  {showOutboundPickupLocation && (
                    <div className="space-y-4 p-3 bg-gray-50 rounded-md border border-gray-200 mt-2">
                      <h4 className="font-medium text-gray-800">TO Party: Central Pickup Point</h4>
                      
                      <FormField
                        control={form.control}
                        name="outboundPickupLocation"
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
                          name="outboundPickupLocationCity"
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
                          name="outboundPickupLocationPostcode"
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
                  
                  {/* Show parent's address when "my address" is selected */}
                  {showOutboundMyAddressDisplay && (
                    <div className="space-y-2 p-3 bg-gray-50 rounded-md border border-gray-200 mt-2">
                      <h4 className="font-medium text-gray-800">TO Party: Your Address as Pickup Point</h4>
                      <div className="text-sm text-gray-600">
                        <p><strong>Address:</strong> {form.getValues("address")}</p>
                        <p><strong>City:</strong> {form.getValues("city")}</p>
                        <p><strong>Postcode:</strong> {form.getValues("postcode")}</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Parents will bring their children to this address and you'll take them to the party</p>
                    </div>
                  )}
                  
                  {/* Departure time to party */}
                  <FormField
                    control={form.control}
                    name="outboundDepartureTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target departure time (when leaving to party)</FormLabel>
                        
                        <div className="flex space-x-2">
                          {/* Hour Select */}
                          <div className="w-1/2">
                            <Select
                              value={(field.value || '').split(':')[0] || undefined}
                              onValueChange={(hour) => {
                                const minute = (field.value || '').split(':')[1] || '00';
                                const newTime = `${hour}:${minute}`;
                                field.onChange(newTime);
                                setOutboundDepartureTime(newTime);
                              }}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Hour" />
                                </SelectTrigger>
                              </FormControl>
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
                              value={(field.value || '').split(':')[1] || undefined}
                              onValueChange={(minute) => {
                                const hour = (field.value || '').split(':')[0] || '00';
                                const newTime = `${hour}:${minute}`;
                                field.onChange(newTime);
                                setOutboundDepartureTime(newTime);
                              }}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Minute" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="00">00</SelectItem>
                                <SelectItem value="15">15</SelectItem>
                                <SelectItem value="30">30</SelectItem>
                                <SelectItem value="45">45</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <p className="text-xs text-muted-foreground">
                          When you'll be leaving for the party (not arrival time)
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
              
              {/* Return dropoff preferences (FROM party) */}
              {showReturnPreferences && (
                <div className="space-y-3 border-t border-gray-100 pt-4 mt-4">
                  <h4 className="font-medium text-primary-700">Return Trip Preferences (FROM Party)</h4>
                  
                  {/* Collection Time Field */}
                  <div className="mb-4">
                    <div className="mb-3">
                      <FormLabel>Collection Time (when picking up from the event)</FormLabel>
                      
                      {/* Radio selection for end time or custom time */}
                      <RadioGroup 
                        className="flex space-x-4 mt-2 mb-3"
                        defaultValue={partyGroup?.endTime ? "event-end" : "custom"}
                        onValueChange={(value) => {
                          if (value === "event-end" && partyGroup?.endTime) {
                            // Use the event end time
                            const newTime = partyGroup.endTime;
                            form.setValue("returnCollectionTime", newTime);
                            setReturnCollectionTime(newTime);
                          }
                          
                          // Set state to show/hide time selectors
                          setShowCustomReturnTime(value === "custom");
                        }}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="event-end" id="event-end" disabled={!partyGroup?.endTime} />
                          <Label htmlFor="event-end" className={!partyGroup?.endTime ? "text-gray-400" : ""}>
                            Event end time ({partyGroup?.endTime || "Not specified"})
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="custom" id="custom-time" />
                          <Label htmlFor="custom-time">Specify another time</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <FormField
                      control={form.control}
                      name="returnCollectionTime"
                      render={({ field }) => (
                        <FormItem>
                          {/* Display the currently selected time */}
                          <div className="mb-2">
                            <p className="text-sm font-medium">Selected time: {field.value || "Not set"}</p>
                          </div>
                          
                          {/* Only show time selectors when custom time is selected */}
                          {showCustomReturnTime && (
                            <div className="flex space-x-2">
                              {/* Hour Select */}
                              <div className="w-1/2">
                                <Select
                                  value={(field.value || '').split(':')[0] || undefined}
                                  onValueChange={(hour) => {
                                    const minute = (field.value || '').split(':')[1] || '00';
                                    const newTime = `${hour}:${minute}`;
                                    field.onChange(newTime);
                                    setReturnCollectionTime(newTime);
                                  }}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Hour" />
                                    </SelectTrigger>
                                  </FormControl>
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
                                  value={(field.value || '').split(':')[1] || undefined}
                                  onValueChange={(minute) => {
                                    const hour = (field.value || '').split(':')[0] || '00';
                                    const newTime = `${hour}:${minute}`;
                                    field.onChange(newTime);
                                    setReturnCollectionTime(newTime);
                                  }}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Minute" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="00">00</SelectItem>
                                    <SelectItem value="15">15</SelectItem>
                                    <SelectItem value="30">30</SelectItem>
                                    <SelectItem value="45">45</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">
                            When you'll be picking up children from the event
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormLabel>Dropoff Preference when picking up FROM the party:</FormLabel>
                  <FormField
                    control={form.control}
                    name="returnDropoffPreference"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormControl>
                          <RadioGroup
                            onValueChange={(value) => handleReturnDropoffPreferenceChange(value)}
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
                                To my address (parents pick up)
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
                  
                  {/* RETURN TRIP - FROM PARTY - Show address fields if needed */}
                  {/* Show parent's address when "my address" is selected for return */}
                  {showReturnMyAddressDisplay && (
                    <div className="space-y-2 p-3 bg-gray-50 rounded-md border border-gray-200 mt-2">
                      <h4 className="font-medium text-gray-800">FROM Party: Dropoff to Your Address</h4>
                      <div className="text-sm text-gray-600">
                        <p><strong>Address:</strong> {form.getValues("address")}</p>
                        <p><strong>City:</strong> {form.getValues("city")}</p>
                        <p><strong>Postcode:</strong> {form.getValues("postcode")}</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Parents will be asked to pick up their children from this address after the party</p>
                    </div>
                  )}
                  
                  {/* Hidden field for return max distance - default value */}
                  <input type="hidden" name="returnMaxDistance" value="5" />
                  
                  {/* Show pickup location fields if pickup-point is selected for return */}
                  {showReturnPickupLocation && (
                    <div className="space-y-4 p-3 bg-gray-50 rounded-md border border-gray-200 mt-2">
                      <h4 className="font-medium text-gray-800">FROM Party: Central Pickup Point</h4>
                      
                      <FormField
                        control={form.control}
                        name="returnPickupLocation"
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
                          name="returnPickupLocationCity"
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
                          name="returnPickupLocationPostcode"
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
                </div>
              )}
              
              {/* For backward compatibility - hidden field */}
              <input type="hidden" name="dropoffPreference" value={outboundDropoffPreference} />
              
              {/* Legacy fields - hidden for backward compatibility */}
              <div className="hidden">
                <input type="hidden" name="pickupLocation" value={form.getValues("outboundPickupLocation") || ""} />
                <input type="hidden" name="pickupLocationCity" value={form.getValues("outboundPickupLocationCity") || ""} />
                <input type="hidden" name="pickupLocationPostcode" value={form.getValues("outboundPickupLocationPostcode") || ""} />
                <input type="hidden" name="maxDistance" value="5" />
              </div>
              
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