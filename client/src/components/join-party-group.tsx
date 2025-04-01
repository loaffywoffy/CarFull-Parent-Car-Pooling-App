import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getPartyGroupByAccessCode } from "@/api/partyGroups";
import { useToast } from "@/hooks/use-toast";
import { type PartyGroup } from "@shared/schema";

interface JoinPartyGroupProps {
  onJoinSuccess: (partyGroup: PartyGroup) => void;
  onCancel: () => void; // Add callback for cancel action
  initialAccessCode?: string; // Optional prop to pre-populate the access code
}

// Create the form schema
const joinPartyGroupSchema = z.object({
  accessCode: z.string().min(4, "Access code must be at least 4 characters")
});

type JoinPartyGroupFormValues = z.infer<typeof joinPartyGroupSchema>;

export default function JoinPartyGroup({ onJoinSuccess, onCancel, initialAccessCode = "" }: JoinPartyGroupProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<JoinPartyGroupFormValues>({
    resolver: zodResolver(joinPartyGroupSchema),
    defaultValues: {
      accessCode: initialAccessCode
    },
  });

  const joinPartyGroupMutation = useMutation({
    mutationFn: async (values: JoinPartyGroupFormValues) => {
      setIsLoading(true);
      try {
        const partyGroup = await getPartyGroupByAccessCode(values.accessCode);
        return partyGroup;
      } finally {
        setIsLoading(false);
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Success!",
        description: `You've joined "${data.name}"`,
      });
      
      // Invalidate and refetch party groups query
      queryClient.invalidateQueries({ queryKey: ['/api/party-groups'] });
      
      form.reset();
      onJoinSuccess(data);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Invalid access code. Please check and try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: JoinPartyGroupFormValues) => {
    joinPartyGroupMutation.mutate(values);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <h2 className="text-xl font-semibold mb-2 text-neutral-800">Join an Event</h2>
      <p className="text-sm text-neutral-600 mb-6">Enter the access code provided by the party organizer</p>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="accessCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Access Code</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter the access code" 
                    {...field} 
                    autoComplete="off"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-between">
            <Button 
              type="button" 
              variant="outline"
              className="px-6 py-2"
              onClick={onCancel}
              disabled={isLoading || joinPartyGroupMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="px-6 py-2"
              disabled={isLoading || joinPartyGroupMutation.isPending}
            >
              {isLoading || joinPartyGroupMutation.isPending ? "Joining..." : "Join Event"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}