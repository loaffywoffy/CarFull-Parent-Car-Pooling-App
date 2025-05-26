import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SimpleCaptcha } from "./simple-captcha";

interface SMSVerificationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
  phoneNumber: string;
  action: string;
  title: string;
  description: string;
}

export function SMSVerificationDialog({ 
  isOpen, 
  onClose, 
  onVerified, 
  phoneNumber, 
  action, 
  title, 
  description 
}: SMSVerificationDialogProps) {
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const { toast } = useToast();

  const sendCodeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/verification/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, action })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send code");
      }

      return response.json();
    },
    onSuccess: () => {
      setCodeSent(true);
      toast({
        title: "Code sent",
        description: "Please check your phone for the verification code."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const verifyCodeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/verification/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, code, action })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Verification failed");
      }

      return data;
    },
    onSuccess: (data) => {
      if (data.verified) {
        toast({
          title: "Verified",
          description: "Phone number verified successfully!"
        });
        onVerified();
        onClose();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleSendCode = () => {
    sendCodeMutation.mutate();
  };

  const handleVerifyCode = () => {
    if (!code.trim()) {
      toast({
        title: "Error",
        description: "Please enter the verification code",
        variant: "destructive"
      });
      return;
    }
    verifyCodeMutation.mutate();
  };

  const handleClose = () => {
    setCode("");
    setCodeSent(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Phone number: <span className="font-medium">{phoneNumber}</span>
            </p>

            {!codeSent ? (
              <Button 
                onClick={handleSendCode} 
                disabled={sendCodeMutation.isPending}
                className="w-full"
              >
                {sendCodeMutation.isPending ? "Sending..." : "Send Verification Code"}
              </Button>
            ) : (
              <div className="space-y-3">
                <Input
                  placeholder="Enter 6-digit code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={6}
                  className="text-center text-lg tracking-wider"
                />

                <div className="flex gap-2">
                  <Button 
                    onClick={handleVerifyCode} 
                    disabled={verifyCodeMutation.isPending || !code.trim()}
                    className="flex-1"
                  >
                    {verifyCodeMutation.isPending ? "Verifying..." : "Verify Code"}
                  </Button>

                  <Button 
                    variant="outline" 
                    onClick={handleSendCode}
                    disabled={sendCodeMutation.isPending}
                  >
                    Resend
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}