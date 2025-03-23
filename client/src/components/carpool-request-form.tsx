import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { insertCarpoolRequestSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getCarpools } from "@/api/carpools";
import { Card, CardContent } from "@/components/ui/card";

interface CarpoolRequestFormProps {
  onSuccess: () => void;
  selectedCarpoolId: number | null;
}

// Extend the insertCarpoolRequestSchema with validation
const carpoolRequestFormSchema = insertCarpoolRequestSchema
  .extend({
    carpoolId: z.number().or(z.string().transform(val => parseInt(val, 10))),
    ridePreference: z.enum(["pickup", "dropoff", "both"]),
    specialRequirements: z.string().optional().default(""),
    emergencyContactName: z.string().min(1, "Emergency contact name is required"),
    emergencyContactPhone: z.string().min(1, "Emergency contact phone is required"),
    emergencyContactRelationship: z.string().min(1, "Relationship to child is required")
  });

type CarpoolRequestFormValues = z.infer<typeof carpoolRequestFormSchema>;

export default function CarpoolRequestForm({ onSuccess, selectedCarpoolId }: CarpoolRequestFormProps) {
  const { toast } = useToast();
  const [distances, setDistances] = useState<{[key: number]: string}>({});
  const [showNearbyOptions, setShowNearbyOptions] = useState(false);
  
  // Calculate distance between two postcodes (simplified demo version)
  const calculateDistance = (postcode1: string, postcode2: string) => {
    // In a real application, you would use a mapping API to calculate actual distance
    // For this demo, we'll use a simple algorithm based on the postcode strings
    
    if (!postcode1 || !postcode2) return "Unknown";
    
    // Extract numeric parts for a simple calculation
    const code1 = postcode1.replace(/[^0-9]/g, '');
    const code2 = postcode2.replace(/[^0-9]/g, '');
    
    if (code1 === code2) return "0.1 miles";
    
    // Generate a pseudo-random but consistent distance based on the codes
    const dist = Math.abs(parseInt(code1 || "0") - parseInt(code2 || "0")) / 100;
    return dist.toFixed(1) + " miles";
  };
  
  // Get the numeric distance value from the distance string
  const getNumericDistance = (distanceStr: string): number => {
    if (distanceStr === "Unknown") return 999; // Large number for unknown distances
    return parseFloat(distanceStr.split(" ")[0]);
  };
  
  // Find nearby carpools when user enters their postcode
  const findNearbyCarpools = () => {
    const userPostcode = form.getValues("postcode");
    
    if (!userPostcode || !carpools) {
      toast({
        title: "Missing Information",
        description: "Please enter your postcode first to find nearby carpools.",
        variant: "destructive",
      });
      return;
    }
    
    // Calculate distances for all carpools
    const newDistances: {[key: number]: string} = {};
    if (Array.isArray(carpools)) {
      carpools.forEach((carpool: any) => {
        newDistances[carpool.id] = calculateDistance(userPostcode, carpool.postcode);
      });
    }
    
    setDistances(newDistances);
    setShowNearbyOptions(true);
  };
  
  // State to track ride preference for filtering carpools
  const [ridePreference, setRidePreference] = useState<string | null>(null);
  
  const form = useForm<CarpoolRequestFormValues>({
    resolver: zodResolver(carpoolRequestFormSchema),
    defaultValues: {
      parentName: "",
      address: "",
      city: "",
      postcode: "",
      phoneNumber: "",
      childName: "",
      childPhone: "",
      carpoolId: selectedCarpoolId || 0,
      needsPickup: false,
      needsDropoff: false,
      needsBoth: false,
      specialRequirements: "",
      ridePreference: "pickup", // Default to "pickup" (to party)
      emergencyContactName: "",
      emergencyContactPhone: "",
      emergencyContactRelationship: ""
    },
  });

  // Set selected carpool ID when it changes
  useEffect(() => {
    if (selectedCarpoolId) {
      form.setValue("carpoolId", selectedCarpoolId);
    }
  }, [selectedCarpoolId, form]);

  // Fetch available carpools
  const { data: carpools, isLoading: carpoolsLoading } = useQuery({
    queryKey: ["/api/carpools"],
  });

  const requestMutation = useMutation({
    mutationFn: (values: CarpoolRequestFormValues) => 
      apiRequest("POST", "/api/carpool-requests", values),
    onSuccess: () => {
      form.reset();
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: CarpoolRequestFormValues) => {
    requestMutation.mutate(values);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <h2 className="text-xl font-semibold mb-6 text-neutral-800">Request a Carpool Spot</h2>
      
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
                      <div className="flex space-x-2">
                        <FormControl>
                          <Input placeholder="Postcode" {...field} />
                        </FormControl>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={findNearbyCarpools}
                          className="shrink-0"
                        >
                          Find Nearby
                        </Button>
                      </div>
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
                        <Input placeholder="Phone Number" type="tel" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            {/* Child Information */}
            <div className="space-y-4 md:col-span-2">
              <h3 className="font-medium text-neutral-700 border-b border-neutral-200 pb-2">Child's Information</h3>
              
              <FormField
                control={form.control}
                name="childName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Child's Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Child's Full Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="childPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Child's Phone Number (if applicable)</FormLabel>
                    <FormControl>
                      <Input placeholder="Phone Number" type="tel" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Nearby Carpools Section */}
              {showNearbyOptions && Object.keys(distances).length > 0 && (
                <div className="bg-gray-50 p-4 rounded-md mb-4 border border-gray-200">
                  <h4 className="font-medium text-neutral-700 mb-3">Carpools Near You</h4>
                  <div className="space-y-3">
                    {Array.isArray(carpools) && carpools
                      .filter((carpool: any) => {
                        // Filter carpools based on ride preference
                        let matches = true;
                        
                        if (ridePreference === "pickup") {
                          matches = carpool.canPickup || carpool.canBoth;
                        } else if (ridePreference === "dropoff") {
                          matches = carpool.canDropoff || carpool.canBoth;
                        } else if (ridePreference === "both") {
                          matches = carpool.canBoth;
                        }
                        
                        // Check the max distance constraint for direct-to-home dropoffs
                        if (matches && (ridePreference === "dropoff" || ridePreference === "both") && 
                            carpool.dropoffPreference === "direct-home" && carpool.maxDistance) {
                          const numericDistance = getNumericDistance(distances[carpool.id]);
                          // Only include this carpool if user is within max distance range
                          return numericDistance <= carpool.maxDistance;
                        }
                        
                        return matches; // Return true if matches ride preference and other conditions
                      })
                      .map((carpool: any) => (
                        <Card key={carpool.id} className="overflow-hidden border-l-4 border-l-primary">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h5 className="font-medium text-neutral-800">{carpool.parentName}'s Carpool</h5>
                                <p className="text-sm text-neutral-600 mb-1">
                                  <span className="font-medium">Distance:</span> {distances[carpool.id]}
                                </p>
                                {ridePreference === "pickup" && (
                                  <p className="text-sm text-neutral-600">
                                    <span className="font-medium">Spaces for going to party:</span> {carpool.spacesAvailable} available
                                  </p>
                                )}
                                {ridePreference === "dropoff" && (
                                  <p className="text-sm text-neutral-600">
                                    <span className="font-medium">Spaces for return journey:</span> {carpool.returnSpacesAvailable || carpool.spacesAvailable} available
                                  </p>
                                )}
                                {ridePreference === "both" && (
                                  <>
                                    <p className="text-sm text-neutral-600">
                                      <span className="font-medium">Spaces to party:</span> {carpool.spacesAvailable} available
                                    </p>
                                    <p className="text-sm text-neutral-600">
                                      <span className="font-medium">Spaces from party:</span> {carpool.returnSpacesAvailable || carpool.spacesAvailable} available
                                    </p>
                                  </>
                                )}
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {carpool.canPickup && <Badge className="bg-green-100 text-green-800">To party</Badge>}
                                  {carpool.canDropoff && <Badge className="bg-blue-100 text-blue-800">From party</Badge>}
                                  {carpool.canBoth && <Badge className="bg-purple-100 text-purple-800">Both</Badge>}
                                </div>
                                
                                {/* Show drop-off preferences for carpools offering return from party */}
                                {(ridePreference === "dropoff" || ridePreference === "both") && 
                                 (carpool.canDropoff || carpool.canBoth) && carpool.dropoffPreference && (
                                  <p className="text-xs text-gray-600 mt-2 bg-gray-100 p-1.5 rounded">
                                    <span className="font-medium">Drop-off preference:</span> {carpool.dropoffPreference}
                                    {carpool.dropoffPreference === "direct-home" && carpool.maxDistance && (
                                      <span className="ml-1 text-xs text-blue-600"> (max {carpool.maxDistance} miles from their address)</span>
                                    )}
                                  </p>
                                )}
                              </div>
                              <Button 
                                type="button" 
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  form.setValue("carpoolId", carpool.id);
                                  toast({
                                    title: "Carpool Selected",
                                    description: `Selected ${carpool.parentName}'s carpool (${distances[carpool.id]} away)`,
                                  });
                                }}
                                className="text-xs"
                              >
                                Select
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </div>
              )}
              
              <FormField
                control={form.control}
                name="carpoolId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Carpool</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value, 10))} 
                      value={field.value?.toString() || ""}
                      disabled={carpoolsLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an available carpool" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Array.isArray(carpools) && carpools
                          .filter((carpool: any) => {
                            // Filter carpools based on ride preference
                            let matches = true;
                            
                            if (ridePreference === "pickup") {
                              matches = carpool.canPickup || carpool.canBoth;
                            } else if (ridePreference === "dropoff") {
                              matches = carpool.canDropoff || carpool.canBoth;
                            } else if (ridePreference === "both") {
                              matches = carpool.canBoth;
                            }
                            
                            // Check the max distance constraint for direct-to-home dropoffs
                            if (matches && (ridePreference === "dropoff" || ridePreference === "both") && 
                                carpool.dropoffPreference === "direct-home" && carpool.maxDistance) {
                              const numericDistance = getNumericDistance(distances[carpool.id]);
                              // Only include this carpool if user is within max distance range
                              return numericDistance <= carpool.maxDistance;
                            }
                            
                            return matches; // Return true if matches ride preference and other conditions
                          })
                          .map((carpool: any) => (
                            <SelectItem key={carpool.id} value={carpool.id.toString()}>
                              {carpool.parentName} - {
                                ridePreference === "pickup" 
                                  ? `${carpool.spacesAvailable} spaces left` 
                                  : ridePreference === "dropoff"
                                    ? `${carpool.returnSpacesAvailable || carpool.spacesAvailable} spaces left`
                                    : `${carpool.spacesAvailable}/${carpool.returnSpacesAvailable || carpool.spacesAvailable} spaces left`
                              }
                              {distances[carpool.id] ? ` (${distances[carpool.id]})` : ''}
                              {(ridePreference === "dropoff" || ridePreference === "both") && 
                               (carpool.canDropoff || carpool.canBoth) && carpool.dropoffPreference ? 
                               ` - ${carpool.dropoffPreference === "direct-home" ? "Direct to home" : 
                                    carpool.dropoffPreference === "my-home" ? "Collect from their home" : 
                                    "Meeting point"}` : ''}
                              {(ridePreference === "dropoff" || ridePreference === "both") && 
                               carpool.dropoffPreference === "direct-home" && carpool.maxDistance ?
                               ` (max ${carpool.maxDistance} miles)` : ''}
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="ridePreference"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="font-medium">Ride Preference (required)</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Update ride preference state for filtering carpools
                            setRidePreference(value);
                            
                            // Also update the individual need fields to maintain compatibility
                            if (value === "pickup") {
                              form.setValue("needsPickup", true);
                              form.setValue("needsDropoff", false);
                              form.setValue("needsBoth", false);
                            } else if (value === "dropoff") {
                              form.setValue("needsPickup", false);
                              form.setValue("needsDropoff", true);
                              form.setValue("needsBoth", false);
                            } else if (value === "both") {
                              form.setValue("needsPickup", false);
                              form.setValue("needsDropoff", false);
                              form.setValue("needsBoth", true);
                            }
                          }}
                          defaultValue={field.value}
                          className="flex flex-col space-y-2 bg-gray-50 p-3 rounded-md"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="pickup" />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">
                              Ride TO the party (pickup from home)
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="dropoff" />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">
                              Ride FROM the party (return home)
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="both" />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">
                              Both TO and FROM the party
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="specialRequirements"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Special Requirements</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any special requirements or information" 
                        rows={3}
                        value={field.value || ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
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
                          <Input placeholder="Phone number" type="tel" {...field} />
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
                        <FormLabel>Relationship to Child</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Parent, Guardian, Relative" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <Button 
              type="submit" 
              className="px-6 py-2 bg-primary text-white font-medium rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
              disabled={requestMutation.isPending}
            >
              {requestMutation.isPending ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
