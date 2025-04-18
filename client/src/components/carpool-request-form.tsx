import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createCarpoolRequest } from "@/api/carpools";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// Define the form schema
const carpoolRequestFormSchema = z.object({
  carpoolId: z.number(),
  parentName: z.string().min(2, { message: "Please enter your name" }),
  childName: z.string().min(1, { message: "Please enter child's name" }),
  phoneNumber: z.string().min(5, { message: "Please enter a valid phone number" }),
  address: z.string().min(3, { message: "Please enter your address" }),
  city: z.string().min(2, { message: "Please enter your city" }),
  postcode: z.string().min(3, { message: "Please enter your postcode" }),
  specialRequirements: z.string().optional(),
});

type CarpoolRequestFormValues = z.infer<typeof carpoolRequestFormSchema>;

interface CarpoolRequestFormProps {
  onSuccess: () => void;
  selectedCarpoolId: number | null;
}

export default function CarpoolRequestForm({ onSuccess, selectedCarpoolId }: CarpoolRequestFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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
      specialRequirements: ""
    }
  });

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
      
      // Create the carpool request
      await createCarpoolRequest(values);
      
      toast({
        title: "Success!",
        description: "Your request has been submitted. The driver will be in touch soon."
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