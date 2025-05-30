import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createCarpoolRequest } from "@/api/carpools";
import { getCarpoolById } from "@/api/carpools";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery } from "@tanstack/react-query";
import { SMSVerificationDialog } from "@/components/sms-verification-dialog";

// Define the form schema with direction preferences
const carpoolRequestFormSchema = z.object({
  carpoolId: z.number(),
  parentName: z.string().min(2, { message: "Please enter your name" }),
  childName: z.string().min(1, { message: "Please enter child's name" }),
  phoneNumber: z.string().min(5, { message: "Please enter a valid phone number" }),
  address: z.string().min(3, { message: "Please enter your address" }),
  city: z.string().min(2, { message: "Please enter your city" }),
  postcode: z.string().min(3, { message: "Please enter your postcode" }),
  specialRequirements: z.string().optional(),
  needsPickup: z.boolean().optional().default(false),
  needsDropoff: z.boolean().optional().default(false),
}).refine(data => data.needsPickup || data.needsDropoff, {
  message: "Please select at least one direction (to party or from party)",
  path: ["needsPickup"]
});

type CarpoolRequestFormValues = z.infer<typeof carpoolRequestFormSchema>;

interface CarpoolRequestFormProps {
  onSuccess: () => void;
  selectedCarpoolId: number | null;
}

export default function CarpoolRequestForm({ onSuccess, selectedCarpoolId }: CarpoolRequestFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [pendingRequestData, setPendingRequestData] = useState<CarpoolRequestFormValues | null>(null);

  // Fetch the carpool details to determine available directions
  const { data: carpoolDetails } = useQuery({
    queryKey: ["/api/carpools", selectedCarpoolId],
    queryFn: () => selectedCarpoolId ? getCarpoolById(selectedCarpoolId) : null,
    enabled: !!selectedCarpoolId
  });

  const form = useForm<CarpoolRequestFormValues>({
    resolver: zodResolver(carpoolRequestFormSchema),
    defaultValues: {
      carpoolId: selectedCarpoolId || 0,
      parentName: "",
      childName: "",
      phoneNumber: "",
      address: "",
      city: "",
      postcode: "",
      specialRequirements: "",
      needsPickup: false,
      needsDropoff: false
    }
  });

  // Set both checkboxes when carpool details load if it's a round-trip carpool
  useEffect(() => {
    if (carpoolDetails && carpoolDetails.canBoth) {
      form.setValue('needsPickup', true);
      form.setValue('needsDropoff', true);
    }
  }, [carpoolDetails, form]);

  const onSubmit = async (values: CarpoolRequestFormValues) => {
    if (!selectedCarpoolId) {
      toast({
        title: "Error",
        description: "Please select a carpool first",
        variant: "destructive"
      });
      return;
    }

    if (!values.phoneNumber) {
      toast({
        title: "Error",
        description: "Please enter your phone number for verification",
        variant: "destructive"
      });
      return;
    }

    // Store request data and show verification dialog
    setPendingRequestData(values);
    setShowVerification(true);
  };

  const handleVerificationSuccess = async () => {
    setShowVerification(false);
    setIsSubmitting(true);

    try {
      // Update with the selected carpool ID
      if (!selectedCarpoolId || !pendingRequestData) {
        toast({
          title: "Error",
          description: "Missing carpool ID or request data",
          variant: "destructive"
        });
        return;
      }

      const values = pendingRequestData;
      values.carpoolId = selectedCarpoolId;

      // Calculate needsBoth based on both directions being selected
      const needsBoth = values.needsPickup && values.needsDropoff;

      // Create the carpool request with the correct direction flags
      await createCarpoolRequest({
        ...values,
        needsBoth: needsBoth,
        // If both are selected, set individual flags to false to avoid double-counting
        needsPickup: needsBoth ? false : values.needsPickup,
        needsDropoff: needsBoth ? false : values.needsDropoff
      });

      toast({
        title: "Request Sent!",
        description: `Your ${needsBoth ? "to & from event" : (values.needsPickup ? "to event" : "from event")} ride request for ${values.childName} has been sent to ${carpoolDetails?.parentName}. You'll get a confirmation message once they respond.`,
        duration: 6000 // Show for 6 seconds so parents can read the full message
      });

      // Reset the form
      form.reset();

      // Call onSuccess callback
      onSuccess();
    } catch (error) {
      console.error("Error submitting carpool request:", error);
      toast({
        title: "Error",
        description: "There was a problem submitting your request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
      setPendingRequestData(null);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> {/* Responsive layout */}
          <FormField
            control={form.control}
            name="parentName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Your Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your name" {...field} className="w-full" /> {/* Added w-full */}
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
                <FormLabel>Child's Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter child's name" {...field} className="w-full" /> {/* Added w-full */}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your Phone Number</FormLabel>
              <FormControl>
                <Input placeholder="Enter your phone number" {...field} className="w-full" /> {/* Added w-full */}
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
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input placeholder="Enter your address" {...field} className="w-full" /> {/* Added w-full */}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-6"> {/* Improved gap */}
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your city" {...field} className="w-full" /> {/* Added w-full */}
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
                  <Input placeholder="Enter your postcode" {...field} className="w-full" /> {/* Added w-full */}
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
              <FormLabel>Special Requirements (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="Any special requirements or notes" {...field} className="w-full" /> {/* Added w-full */}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="border p-4 rounded-md bg-gray-50">
          <h3 className="font-medium mb-2">Direction(s) Needed</h3>
          <p className="text-sm text-gray-600 mb-4">
            Please select which directions you need for this carpool
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> {/* Responsive layout for checkboxes */}
            {(!carpoolDetails || carpoolDetails.canPickup || carpoolDetails.canBoth) && (
              <FormField
                control={form.control}
                name="needsPickup"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={carpoolDetails && !carpoolDetails.canPickup && !carpoolDetails.canBoth}
                      />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer flex items-center gap-1">
                      <span className="inline-block h-2 w-2 rounded-full bg-green-500"></span>
                      To party (pickup)
                    </FormLabel>
                  </FormItem>
                )}
              />
            )}

            {(!carpoolDetails || carpoolDetails.canDropoff || carpoolDetails.canBoth) && (
              <FormField
                control={form.control}
                name="needsDropoff"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={carpoolDetails && !carpoolDetails.canDropoff && !carpoolDetails.canBoth}
                      />
                    </FormControl>
                    <FormLabel className="font-normal cursor-pointer flex items-center gap-1">
                      <span className="inline-block h-2 w-2 rounded-full bg-blue-500"></span>
                      From party (dropoff)
                    </FormLabel>
                  </FormItem>
                )}
              />
            )}
          </div>
          <FormMessage className="mt-2" />
        </div>

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Requesting...
              </>
            ) : (
              'Request a Spot'
            )}
          </Button>
        </div>
      </form>
       <SMSVerificationDialog
        isOpen={showVerification}
        onClose={() => setShowVerification(false)}
        onVerified={handleVerificationSuccess}
        phoneNumber={form.watch("phoneNumber")}
        action="book_carpool"
        title="Verify Phone Number"
        description="Please verify your phone number to book this carpool spot."
      />
    </Form>
  );
}