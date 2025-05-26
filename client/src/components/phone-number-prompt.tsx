
import React, { useState } from "react";
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

interface PhoneNumberPromptProps {
  isOpen: boolean;
  onSubmit: (phoneNumber: string) => void;
  eventName?: string;
}

export function PhoneNumberPrompt({ 
  isOpen, 
  onSubmit, 
  eventName 
}: PhoneNumberPromptProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!phoneNumber.trim()) {
      toast({
        title: "Phone number required",
        description: "Please enter your phone number to continue",
        variant: "destructive"
      });
      return;
    }

    // Basic phone number validation
    const cleanPhone = phoneNumber.replace(/\s/g, '');
    if (cleanPhone.length < 10) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid phone number",
        variant: "destructive"
      });
      return;
    }

    onSubmit(cleanPhone);
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Welcome to {eventName || "this event"}!</DialogTitle>
          <DialogDescription>
            To give you a personalized experience and track your interactions with events, please enter your phone number.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Input
              placeholder="Your phone number (e.g., +447123456789)"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              type="tel"
              className="text-center"
            />
            <p className="text-xs text-muted-foreground mt-2">
              This will be used to identify you across events and for SMS notifications.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} className="w-full">
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
