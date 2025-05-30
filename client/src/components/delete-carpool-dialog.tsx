import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, AlertTriangle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DeleteCarpoolDialogProps {
  isOpen: boolean;
  onClose: () => void;
  carpoolId: number;
  carpoolPhone: string;
  onDeleted: () => void;
}

export default function DeleteCarpoolDialog({ 
  isOpen, 
  onClose, 
  carpoolId, 
  carpoolPhone, 
  onDeleted 
}: DeleteCarpoolDialogProps) {
  const [step, setStep] = useState<'confirm' | 'verify'>('confirm');
  const [verificationCode, setVerificationCode] = useState('');
  const { toast } = useToast();

  const sendVerificationMutation = useMutation({
    mutationFn: () => 
      apiRequest("POST", "/api/verification/send", {
        phoneNumber: carpoolPhone,
        action: 'delete_carpool'
      }),
    onSuccess: () => {
      setStep('verify');
      toast({
        title: "Verification code sent",
        description: "Please check your phone for the verification code.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send verification code",
        variant: "destructive",
      });
    },
  });

  const deleteCarpoolMutation = useMutation({
    mutationFn: () => 
      apiRequest("DELETE", `/api/carpools/${carpoolId}`, {
        phoneNumber: carpoolPhone,
        verificationCode
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/party-groups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/carpools'] });
      toast({
        title: "Carpool deleted",
        description: "Your carpool offer has been successfully deleted.",
      });
      onDeleted();
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete carpool",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setStep('confirm');
    setVerificationCode('');
    onClose();
  };

  const handleConfirm = () => {
    sendVerificationMutation.mutate();
  };

  const handleDelete = () => {
    if (!verificationCode) {
      toast({
        title: "Verification code required",
        description: "Please enter the verification code sent to your phone.",
        variant: "destructive",
      });
      return;
    }
    deleteCarpoolMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center text-red-600">
            <Trash2 className="h-5 w-5 mr-2" />
            Delete Carpool Offer
          </DialogTitle>
        </DialogHeader>

        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="flex items-start space-x-3 p-4 bg-red-50 rounded-lg border border-red-200">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-medium mb-1">This action cannot be undone</p>
                <p>Your carpool offer will be permanently deleted and any pending requests will be cancelled.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Verification will be sent to</Label>
              <div className="p-3 bg-gray-50 rounded-md border">
                <p className="text-sm font-medium">{carpoolPhone}</p>
              </div>
              <p className="text-xs text-gray-600">
                We'll send a verification code to this number to confirm deletion
              </p>
            </div>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                We've sent a verification code to <strong>{carpoolPhone}</strong>
              </p>
              
              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  maxLength={6}
                  className="text-center text-lg tracking-wider"
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          
          {step === 'confirm' && (
            <Button 
              variant="destructive" 
              onClick={handleConfirm}
              disabled={sendVerificationMutation.isPending}
            >
              {sendVerificationMutation.isPending ? "Sending..." : "Send Verification Code"}
            </Button>
          )}
          
          {step === 'verify' && (
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={deleteCarpoolMutation.isPending}
            >
              {deleteCarpoolMutation.isPending ? "Deleting..." : "Delete Carpool"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}