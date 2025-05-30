import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

interface SuccessDialogProps {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

export default function SuccessDialog({ open, title, message, onClose }: SuccessDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4 text-green-500">
            <CheckCircle className="h-12 w-12" />
          </div>
          <DialogTitle className="text-center text-xl">{title}</DialogTitle>
        </DialogHeader>
        <div className="text-center text-neutral-600 my-2">
          {message}
        </div>
        <DialogFooter className="sm:justify-center">
          <Button 
            className="bg-primary text-white hover:bg-primary-dark"
            onClick={onClose}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
