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

    setIsSubmitting(true);
    
    try {
      // Update with the selected carpool ID
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
        title: "Success!",
        description: `Your ${needsBoth ? "round trip" : (values.needsPickup ? "to party" : "from party")} ride request has been submitted.`
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
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="parentName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter your name" {...field} />
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
                <Input placeholder="Enter child's name" {...field} />
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
                <Input placeholder="Enter your phone number" {...field} />
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
                <Input placeholder="Enter your address" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your city" {...field} />
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
                  <Input placeholder="Enter your postcode" {...field} />
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
                <Input placeholder="Any special requirements or notes" {...field} />
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

          <div className="space-y-3">
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
                    <FormLabel className="font-normal cursor-pointer">
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
                    <FormLabel className="font-normal cursor-pointer">
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
    </Form>
  );
}