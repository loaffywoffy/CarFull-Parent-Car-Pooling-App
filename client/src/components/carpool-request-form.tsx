import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { insertCarpoolRequestSchema, Carpool } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
    specialRequirements: z.string().optional().default("")
  });

type CarpoolRequestFormValues = z.infer<typeof carpoolRequestFormSchema>;

export default function CarpoolRequestForm({ onSuccess, selectedCarpoolId }: CarpoolRequestFormProps) {
  const { toast } = useToast();
  const [distances, setDistances] = useState<{[key: number]: string}>({});
  const [showNearbyOptions, setShowNearbyOptions] = useState(false);

  // State to track ride preference for filtering carpools
  const [ridePreference, setRidePreference] = useState<string | null>("pickup");

  // State for separate carpool IDs for TO and FROM journeys
  const [pickupCarpoolId, setPickupCarpoolId] = useState<number | null>(null);
  const [dropoffCarpoolId, setDropoffCarpoolId] = useState<number | null>(null);

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
      pickupCarpoolId: 0, // New field for TO party carpool
      dropoffCarpoolId: 0, // New field for FROM party carpool
      needsPickup: false,
      needsDropoff: false,
      needsBoth: false,
      specialRequirements: "",
      ridePreference: "pickup" // Default to "pickup" (to party)
    },
  });

  // Extract party group ID from the carpool ID if available
  const [partyGroupId, setPartyGroupId] = useState<number | null>(null);

  // Fetch selected carpool details to get party group ID
  const { data: carpoolDetails } = useQuery({
    queryKey: [`/api/carpools/${selectedCarpoolId || 0}`],
    enabled: !!selectedCarpoolId
  });

  // Set party group ID when carpool details are loaded
  useEffect(() => {
    if (carpoolDetails && typeof carpoolDetails === 'object' && 'partyGroupId' in carpoolDetails) {
      setPartyGroupId(Number(carpoolDetails.partyGroupId));
    }
  }, [carpoolDetails]);

  // Fetch available carpools for the party group
  const { data: carpools, isLoading: carpoolsLoading } = useQuery({
    queryKey: partyGroupId ? [`/api/party-groups/${partyGroupId}/carpools`] : ["/api/carpools"],
  });

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
  const getNumericDistance = (distanceStr?: string): number => {
    if (!distanceStr || distanceStr === "Unknown") return 999; // Large number for unknown/undefined distances
    try {
      return parseFloat(distanceStr.split(" ")[0]);
    } catch (e) {
      console.error("Error parsing distance:", e);
      return 999; // Default to large number on error
    }
  };

  // Set selected carpool ID when it changes
  useEffect(() => {
    if (selectedCarpoolId) {
      form.setValue("carpoolId", selectedCarpoolId);
    }
  }, [selectedCarpoolId, form]);

  // Calculate distances automatically when user enters a postcode
  useEffect(() => {
    const watchPostcode = form.watch("postcode");

    // Only calculate if postcode has at least 3 characters
    if (watchPostcode && watchPostcode.length >= 3 && carpools) {
      // Calculate distances for all carpools
      const newDistances: {[key: number]: string} = {};
      if (Array.isArray(carpools)) {
        carpools.forEach((carpool: any) => {
          newDistances[carpool.id] = calculateDistance(watchPostcode, carpool.postcode);
        });
      }

      setDistances(newDistances);
      setShowNearbyOptions(true);
    }
  }, [form.watch("postcode"), carpools]);

  const requestMutation = useMutation({
    mutationFn: (values: CarpoolRequestFormValues) => 
      apiRequest("POST", "/api/carpool-requests", values),
    onSuccess: () => {
      // Invalidate carpool requests query to ensure fresh data
      if (partyGroupId) {
        // Invalidate the carpool requests for the selected carpool
        queryClient.invalidateQueries({ queryKey: ['/api/carpools', form.getValues('carpoolId'), 'requests'] });

        // Invalidate all carpools for this event group to refresh counts
        queryClient.invalidateQueries({ queryKey: ['/api/party-groups', partyGroupId, 'carpools'] });

        // Invalidate the parent query in case counts need to be updated
        queryClient.invalidateQueries({ queryKey: ['/api/party-groups'] });
      }

      toast({
        title: "Success!",
        description: "Your carpool request has been submitted successfully.",
      });

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
    // Set the appropriate carpool IDs based on ride preference
    if (values.ridePreference === "pickup") {
      values.pickupCarpoolId = values.carpoolId;
      values.dropoffCarpoolId = 0;
    } else if (values.ridePreference === "dropoff") {
      values.pickupCarpoolId = 0;
      values.dropoffCarpoolId = values.carpoolId;
    } else if (values.ridePreference === "both") {
      // If "both" is selected, we can use separate carpools if they've been selected
      values.pickupCarpoolId = pickupCarpoolId || values.carpoolId;
      values.dropoffCarpoolId = dropoffCarpoolId || values.carpoolId;
    }

    // Submit the request with updated fields
    requestMutation.mutate(values);
  };

  // Count available carpools for different ride preferences
  const getAvailableCarpoolCounts = () => {
    if (!carpools || !Array.isArray(carpools)) return { pickup: 0, dropoff: 0, both: 0 };

    // Get user's postcode to filter by distance constraints
    const userPostcode = form.getValues("postcode");

    // Filter carpools based on distance constraints for direct-to-home dropoffs
    const filteredCarpools = userPostcode ? carpools.filter(c => {
      // If carpool has direct-to-home dropoff preference with distance limit
      if (c.dropoffPreference === "direct-home" && c.maxDistance) {
        const distance = calculateDistance(userPostcode, c.postcode);
        const numericDistance = getNumericDistance(distance);
        // Only include this carpool if user is within max distance range
        return numericDistance <= c.maxDistance;
      }
      return true; // Include all others
    }) : carpools;

    const counts = {
      pickup: filteredCarpools.filter(c => c.canPickup || c.canBoth).length,
      dropoff: filteredCarpools.filter(c => c.canDropoff || c.canBoth).length,
      both: filteredCarpools.filter(c => c.canBoth).length
    };

    return counts;
  };

  const carpoolCounts = getAvailableCarpoolCounts();

  // Filter carpools based on ride preference
  const getFilteredCarpools = () => {
    if (!carpools || !Array.isArray(carpools)) return [];

    return carpools.filter((carpool: any) => {
      // Match by ride preference
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
    });
  };

  const filteredCarpools = getFilteredCarpools();

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <h2 className="text-xl font-semibold mb-6 text-neutral-800">Request a Carpool Spot</h2>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Ride Preference Selection - Moved to top for better UX */}
          <div className="space-y-3 mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="font-medium text-lg text-neutral-700 mb-2">What ride do you need?</h3>
            <FormField
              control={form.control}
              name="ridePreference"
              render={({ field }) => (
                <FormItem className="space-y-2">
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
                      className="flex flex-col space-y-3"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0 p-3 bg-white rounded-md border border-gray-200 hover:border-primary/50 transition-colors">
                        <FormControl>
                          <RadioGroupItem value="pickup" />
                        </FormControl>
                        <FormLabel className="font-medium cursor-pointer w-full">
                          Ride TO the party (pickup from home)
                          <span className="ml-2 text-xs text-green-700 bg-green-50 rounded px-1">
                            {carpoolCounts.pickup} carpools available
                          </span>
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0 p-3 bg-white rounded-md border border-gray-200 hover:border-primary/50 transition-colors">
                        <FormControl>
                          <RadioGroupItem value="dropoff" />
                        </FormControl>
                        <FormLabel className="font-medium cursor-pointer w-full">
                          Ride FROM the party (dropoff to home)
                          <span className="ml-2 text-xs text-green-700 bg-green-50 rounded px-1">
                            {carpoolCounts.dropoff} carpools available
                          </span>
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0 p-3 bg-white rounded-md border border-gray-200 hover:border-primary/50 transition-colors">
                        <FormControl>
                          <RadioGroupItem value="both" />
                        </FormControl>
                        <FormLabel className="font-medium cursor-pointer w-full">
                          Ride BOTH ways (to and from party)
                          <span className="ml-2 text-xs text-green-700 bg-green-50 rounded px-1">
                            {carpoolCounts.both} carpools available
                          </span>
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

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
                  <h4 className="font-medium text-neutral-700 mb-3">
                    Carpools Near You
                    {ridePreference && (
                      <span className="ml-2 text-xs text-gray-500">
                        Showing {ridePreference === "pickup" ? "TO party" : 
                                ridePreference === "dropoff" ? "FROM party" : "BOTH ways"} options
                      </span>
                    )}
                  </h4>
                  <div className="space-y-3">
                    {filteredCarpools.length === 0 ? (
                      <div className="text-center p-6 bg-gray-100 rounded-md">
                        <p className="text-gray-600">No carpools available matching your preferences.</p>
                        {ridePreference === "both" && carpoolCounts.pickup > 0 && (
                          <p className="text-sm text-blue-600 mt-2">
                            Try selecting "Ride TO the party" or "Ride FROM the party" separately for more options.
                          </p>
                        )}
                      </div>
                    ) : (
                      filteredCarpools.map((carpool: any) => (
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
                                    <span className="text-xs text-gray-500 ml-1">(plus driver's child: {carpool.childName})</span>
                                  </p>
                                )}
                                {ridePreference === "dropoff" && (
                                  <p className="text-sm text-neutral-600">
                                    <span className="font-medium">Spaces for return journey:</span> {carpool.returnSpacesAvailable || carpool.spacesAvailable} available
                                    <span className="text-xs text-gray-500 ml-1">(plus driver's child: {carpool.childName})</span>
                                  </p>
                                )}
                                {ridePreference === "both" && (
                                  <>
                                    <p className="text-sm text-neutral-600">
                                      <span className="font-medium">Spaces to party:</span> {carpool.spacesAvailable} available
                                      <span className="text-xs text-gray-500 ml-1">(plus driver's child: {carpool.childName})</span>
                                    </p>
                                    <p className="text-sm text-neutral-600">
                                      <span className="font-medium">Spaces from party:</span> {carpool.returnSpacesAvailable || carpool.spacesAvailable} available
                                      <span className="text-xs text-gray-500 ml-1">(plus driver's child: {carpool.childName})</span>
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
                                    <span className="font-medium">Drop-off preference:</span> {
                                      carpool.dropoffPreference === "direct-home" 
                                        ? "Driver will collect from your home" 
                                        : carpool.dropoffPreference === "my-home" 
                                          ? "Meet at driver's home for departure" 
                                          : "Meet at agreed central location"
                                    }
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
                      ))
                    )}
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
                        {filteredCarpools.map((carpool: any) => (
                          <SelectItem key={carpool.id} value={carpool.id.toString()}>
                            {carpool.parentName} - {
                              ridePreference === "pickup" 
                                ? `${carpool.spacesAvailable} spaces left (plus ${carpool.childName})` 
                                : ridePreference === "dropoff"
                                  ? `${carpool.returnSpacesAvailable || carpool.spacesAvailable} spaces left (plus ${carpool.childName})`
                                  : `${carpool.spacesAvailable}/${carpool.returnSpacesAvailable || carpool.spacesAvailable} spaces left (plus ${carpool.childName})`
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
                        ))}
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
                              <span className="ml-2 text-xs text-green-700 bg-green-50 rounded px-1">
                                {carpoolCounts.pickup} carpools available
                              </span>
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="dropoff" />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">
                              Ride FROM the party (return home)
                              <span className="ml-2 text-xs text-blue-700 bg-blue-50 rounded px-1">
                                {carpoolCounts.dropoff} carpools available
                              </span>
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="both" />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">
                              Both TO and FROM the party
                              <span className="ml-2 text-xs text-purple-700 bg-purple-50 rounded px-1">
                                {carpoolCounts.both} carpools available
                              </span>
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
                    <FormLabel>Special Requirements or Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any allergies, medical conditions, or additional information the driver should know" 
                        className="h-24 resize-none"
                        {...field}
                        value={field.value || ""}
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
              className="px-6 py-2 bg-primary text-white font-medium rounded-md"
              disabled={requestMutation.isPending}
            >
              {requestMutation.isPending ? "Submitting..." : "Request This Ride"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}