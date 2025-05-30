import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Trash2, AlertTriangle, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { SMSVerificationDialog } from "./sms-verification-dialog";
import type { PartyGroup } from "@shared/schema";

interface DeleteEventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  event: PartyGroup;
  onSuccess?: () => void;
}

export function DeleteEventDialog({ isOpen, onClose, event, onSuccess }: DeleteEventDialogProps) {
  const [showVerification, setShowVerification] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteEventMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/party-groups/${event.id}`);
      if (!response.ok) {
        throw new Error("Failed to delete event");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/party-groups"] });
      toast({
        title: "Event deleted successfully",
        description: "The event and all associated carpools have been removed.",
      });
      onClose();
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete event",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDeleteClick = () => {
    setShowVerification(true);
  };

  const handleVerificationSuccess = () => {
    setShowVerification(false);
    deleteEventMutation.mutate();
  };

  const handleVerificationClose = () => {
    setShowVerification(false);
  };

  const formatPhoneNumber = (phone: string) => {
    // Format phone number for display (e.g., +44 7961 318588)
    if (phone.startsWith('+44')) {
      const number = phone.slice(3);
      return `+44 ${number.slice(0, 4)} ${number.slice(4, 7)} ${number.slice(7)}`;
    }
    return phone;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Event
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the event and all associated carpool offers.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 border rounded-lg bg-red-50 border-red-200">
              <h4 className="font-medium text-red-800 mb-2">Event to be deleted:</h4>
              <p className="font-semibold text-red-900">{event.name}</p>
              {event.eventDate && (
                <Badge variant="outline" className="mt-2">
                  {new Date(event.eventDate).toLocaleDateString()}
                </Badge>
              )}
            </div>

            <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
              <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                SMS Verification Required
              </h4>
              <p className="text-sm text-blue-700">
                For security, we'll send a verification code to the event creator's phone number:
              </p>
              <p className="font-semibold text-blue-900 mt-1">
                {event.phoneNumber ? formatPhoneNumber(event.phoneNumber) : 'Phone number not available'}
              </p>
              <p className="text-xs text-blue-600 mt-2">
                Created by: {event.createdBy}
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteClick}
              disabled={!event.phoneNumber || deleteEventMutation.isPending}
              className="w-full sm:w-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {deleteEventMutation.isPending ? "Deleting..." : "Verify & Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SMSVerificationDialog
        isOpen={showVerification}
        onClose={handleVerificationClose}
        onVerified={handleVerificationSuccess}
        phoneNumber={event.phoneNumber || ""}
        action="delete_event"
        title="Verify Event Deletion"
        description={`Please verify your identity to delete the event "${event.name}". A verification code has been sent to ${event.phoneNumber ? formatPhoneNumber(event.phoneNumber) : 'your phone'}.`}
      />
    </>
  );
}