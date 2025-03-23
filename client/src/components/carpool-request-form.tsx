import { useEffect } from "react";
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
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getCarpools } from "@/api/carpools";

interface CarpoolRequestFormProps {
  onSuccess: () => void;
  selectedCarpoolId: number | null;
}

// Extend the insertCarpoolRequestSchema with validation
const carpoolRequestFormSchema = insertCarpoolRequestSchema
  .extend({
    carpoolId: z.number().or(z.string().transform(val => parseInt(val, 10))),
  });

type CarpoolRequestFormValues = z.infer<typeof carpoolRequestFormSchema>;

export default function CarpoolRequestForm({ onSuccess, selectedCarpoolId }: CarpoolRequestFormProps) {
  const { toast } = useToast();
  
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
                      <Input placeholder="Phone Number" type="tel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
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
                        {carpools?.map((carpool: any) => (
                          <SelectItem key={carpool.id} value={carpool.id.toString()}>
                            {carpool.parentName} - {carpool.spacesAvailable} spaces
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="space-y-3">
                <FormLabel>My child needs:</FormLabel>
                <div className="flex flex-wrap gap-4">
                  <FormField
                    control={form.control}
                    name="needsPickup"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="cursor-pointer">Pick up</FormLabel>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="needsDropoff"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="cursor-pointer">Drop off</FormLabel>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="needsBoth"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
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
                name="specialRequirements"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Special Requirements</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any special requirements or information" 
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
