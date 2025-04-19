import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteCarpoolRequest } from "@/api/carpools";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { type CarpoolRequest } from "@shared/schema";

interface DeleteCarpoolRequestButtonProps {
  request: CarpoolRequest;
  onDelete?: () => void;
  variant?: "icon" | "text" | "destructive";
  className?: string;
}

export default function DeleteCarpoolRequestButton({ 
  request, 
  onDelete,
  variant = "icon",
  className = ""
}: DeleteCarpoolRequestButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => deleteCarpoolRequest(request.id),
    onSuccess: () => {
      // Match the query key format in carpool-requests-list.tsx
      queryClient.invalidateQueries({ queryKey: ["/api/carpools", request.carpoolId, "requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/party-groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/carpools"] });
      
      toast({
        title: "Removed from carpool",
        description: `${request.childName} has been removed from this carpool.`,
      });
      
      if (onDelete) {
        onDelete();
      }
      
      setConfirmOpen(false);
    },
    onError: (error) => {
      console.error("Error deleting request:", error);
      toast({
        title: "Error",
        description: "Failed to remove from this carpool. Please try again.",
        variant: "destructive",
      });
    }
  });

  let buttonContent;
  if (variant === "icon") {
    buttonContent = (
      <Button 
        variant="ghost" 
        size="icon"
        className={`h-8 w-8 rounded-full hover:bg-red-100 text-red-500 hover:text-red-600 ${className}`}
        onClick={() => setConfirmOpen(true)}
        title="Remove from carpool"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    );
  } else if (variant === "text") {
    buttonContent = (
      <Button 
        variant="ghost" 
        className={`text-red-500 hover:text-red-600 hover:bg-red-50 p-2 h-auto text-xs ${className}`}
        onClick={() => setConfirmOpen(true)}
        size="sm"
      >
        <Trash2 className="h-3 w-3 mr-1" />
        Remove
      </Button>
    );
  } else if (variant === "destructive") {
    buttonContent = (
      <Button 
        variant="destructive" 
        className={`${className}`}
        onClick={() => setConfirmOpen(true)}
        size="sm"
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Remove from carpool
      </Button>
    );
  }

  return (
    <>
      {buttonContent}
      
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Remove from carpool?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <span className="font-medium">{request.childName}</span> from this carpool? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => {
                deleteMutation.mutate();
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}