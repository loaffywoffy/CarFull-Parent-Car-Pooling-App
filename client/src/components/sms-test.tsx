
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export function SMSTest() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const sendTestSMS = async () => {
    if (!phoneNumber || !message) {
      toast({
        title: "Error",
        description: "Please enter both phone number and message",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, message })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "SMS sent successfully"
        });
        setMessage("");
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "Failed to send SMS",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send SMS",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>SMS Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Phone number (e.g., +447123456789)"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
        />
        <Input
          placeholder="Test message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <Button 
          onClick={sendTestSMS} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? "Sending..." : "Send Test SMS"}
        </Button>
      </CardContent>
    </Card>
  );
}
