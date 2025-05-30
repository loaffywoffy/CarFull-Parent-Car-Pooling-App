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
import { Edit, Phone, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { SMSVerificationDialog } from "./sms-verification-dialog";
import PartyGroupForm from "./party-group-form";
import type { PartyGroup } from "@shared/schema";

interface EditEventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  event: PartyGroup;
  onSuccess?: () => void;
}

export function EditEventDialog({ isOpen, onClose, event, onSuccess }: EditEventDialogProps) {
  const [showVerification, setShowVerification] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleEditClick = () => {
    setShowVerification(true);
  };

  const handleVerificationSuccess = () => {
    setShowVerification(false);
    setShowEditForm(true);
  };

  const handleVerificationClose = () => {
    setShowVerification(false);
  };

  const handleEditSuccess = () => {
    setShowEditForm(false);
    onClose();
    onSuccess?.();
    queryClient.invalidateQueries({ queryKey: [`/api/party-groups/by-url/${event.shareableUrl}`] });
    queryClient.invalidateQueries({ queryKey: ["/api/party-groups"] });
    toast({
      title: "Event updated successfully",
      description: "Your event details have been saved.",
    });
  };

  const handleEditCancel = () => {
    setShowEditForm(false);
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
      {/* Verification Step */}
      <Dialog open={isOpen && !showEditForm} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600">
              <Edit className="h-5 w-5" />
              Edit Event
            </DialogTitle>
            <DialogDescription>
              To edit this event, we need to verify your identity as the event creator.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
              <h4 className="font-medium text-blue-800 mb-2">Event to edit:</h4>
              <p className="font-semibold text-blue-900">{event.name}</p>
              {event.eventDate && (
                <Badge variant="outline" className="mt-2">
                  {new Date(event.eventDate).toLocaleDateString()}
                </Badge>
              )}
            </div>

            <div className="p-4 border rounded-lg bg-amber-50 border-amber-200">
              <h4 className="font-medium text-amber-800 mb-2 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                SMS Verification Required
              </h4>
              <p className="text-sm text-amber-700">
                For security, we'll send a verification code to the event creator's phone number:
              </p>
              <p className="font-semibold text-amber-900 mt-1">
                {event.phoneNumber ? formatPhoneNumber(event.phoneNumber) : 'Phone number not available'}
              </p>
              <p className="text-xs text-amber-600 mt-2">
                Created by: {event.createdBy}
              </p>
            </div>

            <div className="p-3 border rounded-lg bg-gray-50 border-gray-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-600">
                  Only the original event creator can edit event details. Changes will affect all associated carpools.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              onClick={handleEditClick}
              disabled={!event.phoneNumber}
              className="w-full sm:w-auto"
            >
              <Edit className="h-4 w-4 mr-2" />
              Verify & Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Form Step */}
      <Dialog open={showEditForm} onOpenChange={handleEditCancel}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Event: {event.name}
            </DialogTitle>
            <DialogDescription>
              Make changes to your event details below.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <PartyGroupForm
              initialData={event}
              onSuccess={handleEditSuccess}
              onCancel={handleEditCancel}
              mode="edit"
            />
          </div>
        </DialogContent>
      </Dialog>

      <SMSVerificationDialog
        isOpen={showVerification}
        onClose={handleVerificationClose}
        onVerified={handleVerificationSuccess}
        phoneNumber={event.phoneNumber || ""}
        action="edit_event"
        title="Verify Event Edit"
        description={`Please verify your identity to edit the event "${event.name}". A verification code has been sent to ${event.phoneNumber ? formatPhoneNumber(event.phoneNumber) : 'your phone'}.`}
      />
    </>
  );
}