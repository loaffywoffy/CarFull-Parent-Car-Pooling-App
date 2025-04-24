import { useState } from "react";
import { Check, Copy, Share2, XIcon } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ShareCarpoolDialogProps {
  open: boolean;
  onClose: () => void;
  carpoolId: number;
  partyGroupId: number;
  driverName: string;
}

export default function ShareCarpoolDialog({ 
  open, 
  onClose, 
  carpoolId, 
  partyGroupId,
  driverName
}: ShareCarpoolDialogProps) {
  const [copied, setCopied] = useState(false);
  
  // Generate shareable link
  const baseUrl = window.location.origin;
  const shareableLink = `${baseUrl}/join-carpool?partyGroupId=${partyGroupId}&carpoolId=${carpoolId}`;
  
  // WhatsApp share URL
  const whatsappText = encodeURIComponent(`Join my carpool for an event! Click here to request a spot: ${shareableLink}`);
  const whatsappUrl = `https://wa.me/?text=${whatsappText}`;
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareableLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Share {driverName}'s Carpool
          </DialogTitle>
          <DialogDescription>
            Share this link with other parents who need a ride to the event.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <div className="grid flex-1 gap-2">
            <Label htmlFor="link" className="sr-only">
              Shareable Link
            </Label>
            <Input
              id="link"
              readOnly
              value={shareableLink}
              className="h-9"
            />
          </div>
          <Button 
            size="sm" 
            className="px-3" 
            onClick={handleCopy} 
            variant="outline"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
        <DialogFooter className="sm:justify-between mt-4 flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onClose}
            className="flex items-center gap-1.5"
          >
            <XIcon className="h-4 w-4" />
            Close
          </Button>
          <Button 
            size="sm" 
            onClick={() => window.open(whatsappUrl, '_blank')}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Share via WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}