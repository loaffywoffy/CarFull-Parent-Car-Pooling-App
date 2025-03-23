import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { insertPartyGroupSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { createPartyGroup } from "@/api/partyGroups";
import { useToast } from "@/hooks/use-toast";

interface PartyGroupFormProps {
  onSuccess: (partyGroupId: number) => void;
}

// Create the form schema with custom validations
const partyGroupFormSchema = insertPartyGroupSchema.extend({
  name: z.string().min(3, "Party name must be at least 3 characters"),
  partyAddress: z.string().min(5, "Party address is required"),
  partyCity: z.string().min(2, "City is required"),
  partyPostcode: z.string().min(3, "Postcode is required"),
  targetArrivalTime: z.string().min(1, "Arrival time is required"),
  accessCode: z.string().min(4, "Access code must be at least 4 characters")
});

type PartyGroupFormValues = z.infer<typeof partyGroupFormSchema>;

export default function PartyGroupForm({ onSuccess }: PartyGroupFormProps) {
  const { toast } = useToast();
  const [accessCode, setAccessCode] = useState("");

  // Generate a random access code of 6 alphanumeric characters
  const generateAccessCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setAccessCode(result);
    form.setValue("accessCode", result);
  };

  const form = useForm<PartyGroupFormValues>({
    resolver: zodResolver(partyGroupFormSchema),
    defaultValues: {
      name: "",
      description: "",
      partyAddress: "",
      partyCity: "",
      partyPostcode: "",
      partyDate: "",
      targetArrivalTime: "",
      createdBy: "",
      accessCode: "",
      additionalInformation: ""
    },
  });

  const partyGroupMutation = useMutation({
    mutationFn: (values: PartyGroupFormValues) => 
      createPartyGroup(values),
    onSuccess: (data) => {
      toast({
        title: "Success!",
        description: "Party group created successfully.",
      });
      form.reset();
      onSuccess(data.id);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create party group. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: PartyGroupFormValues) => {
    partyGroupMutation.mutate(values);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <h2 className="text-xl font-semibold mb-2 text-neutral-800">Create a New Party Group</h2>
      <p className="text-sm text-neutral-600 mb-6">Enter the party details and share the access code with parents</p>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {/* Party Information */}
            <div className="space-y-4">
              <h3 className="font-medium text-neutral-700 border-b border-neutral-200 pb-2">Party Information</h3>
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Party Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Sarah's 10th Birthday Party" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Brief description of the party" 
                        rows={2}
                        {...field} 
                      />
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="partyDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Party Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
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
              </div>
            </div>
            
            {/* Admin Information */}
            <div className="space-y-4">
              <h3 className="font-medium text-neutral-700 border-b border-neutral-200 pb-2">Admin Information</h3>
              
              <FormField
                control={form.control}
                name="createdBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your name (as the party organizer)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="accessCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Access Code</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input placeholder="Enter or generate an access code" {...field} value={field.value || accessCode} />
                      </FormControl>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={generateAccessCode}
                        className="whitespace-nowrap"
                      >
                        Generate Code
                      </Button>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">Parents will use this code to join the carpool group</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="additionalInformation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Information (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any other information parents should know about the party" 
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
              disabled={partyGroupMutation.isPending}
            >
              {partyGroupMutation.isPending ? "Creating..." : "Create Party Group"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}