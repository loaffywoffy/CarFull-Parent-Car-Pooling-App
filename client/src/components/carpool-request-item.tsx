import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteCarpoolRequest } from "@/api/carpools";
import { CarpoolRequest } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface CarpoolRequestItemProps {
  request: CarpoolRequest;
  compact?: boolean; // Whether to show compact view (for the sidebar listing)
  onDelete?: () => void;
  partyGroupId: number;
}

export default function CarpoolRequestItem({ request, compact = false, onDelete, partyGroupId }: CarpoolRequestItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteRequestMutation = useMutation({
    mutationFn: (requestId: number) => deleteCarpoolRequest(requestId),
    onSuccess: () => {
      toast({
        title: "Child removed from carpool",
        description: "The child has been successfully removed from the carpool.",
        variant: "default",
      });
      
      // Refetch the data to update the UI
      queryClient.invalidateQueries({ queryKey: ["/api/carpools", partyGroupId] });
      
      // Call the optional callback
      if (onDelete) onDelete();
      
      // Reset the deleting state
      setIsDeleting(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to remove child",
        description: "There was a problem removing the child from the carpool. Please try again.",
        variant: "destructive",
      });
      console.error("Error removing child from carpool:", error);
      setIsDeleting(false);
    }
  });

  const handleDelete = () => {
    setIsDeleting(true);
    deleteRequestMutation.mutate(request.id);
  };

  if (compact) {
    // Compact version for the sidebar list
    return (
      <li className="mb-2">
        <div className="flex items-center justify-between gap-1 mb-1">
          <div className="flex items-center gap-1">
            <span className="font-medium">{request.childName}</span>
            {request.needsPickup && <span className="text-xs px-1 py-0.5 bg-green-100 text-green-800 rounded">To</span>}
            {request.needsDropoff && <span className="text-xs px-1 py-0.5 bg-red-100 text-red-800 rounded">From</span>}
            {request.needsBoth && <span className="text-xs px-1 py-0.5 bg-blue-100 text-blue-800 rounded">Both</span>}
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-5 w-5 rounded-full text-gray-400 hover:text-red-500"
            onClick={() => setIsDeleting(true)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
        
        <div className="text-xs text-gray-600 pl-1">
          <p>Parent: {request.parentName} ({request.phoneNumber})</p>
          <p className="truncate max-w-[200px]">{request.address}, {request.postcode}</p>
        </div>
        
        <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove {request.childName}</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove {request.childName} from this carpool?
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDelete}
                className="bg-red-500 hover:bg-red-600"
              >
                {deleteRequestMutation.isPending ? (
                  <Spinner size="sm" text="Removing..." />
                ) : (
                  "Remove"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </li>
    );
  }

  // Detailed version for the main view
  return (
    <li className="text-sm flex items-start justify-between gap-2 p-1">
      <div className="flex gap-2">
        <div className="bg-primary/10 text-primary rounded-full h-6 w-6 flex items-center justify-center text-xs font-medium shrink-0 mt-0.5">
          {request.childName.substring(0, 1).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-1">
            <span className="font-medium">{request.childName}</span>
            {request.needsPickup && <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-800 rounded">To party</span>}
            {request.needsDropoff && <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-800 rounded">From party</span>}
            {request.needsBoth && <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">Both ways</span>}
          </div>
          
          <div className="text-xs text-gray-600 mt-1">
            <p><span className="font-medium">Parent:</span> {request.parentName}</p>
            <p><span className="font-medium">Phone:</span> {request.phoneNumber}</p>
            <p><span className="font-medium">Address:</span> {request.address}, {request.city}, {request.postcode}</p>
            {request.emergencyContactName && (
              <p><span className="font-medium">Emergency:</span> {request.emergencyContactName} {request.emergencyContactPhone ? `(${request.emergencyContactPhone})` : ''}</p>
            )}
            {request.specialRequirements && (
              <p className="mt-1"><span className="font-medium">Notes:</span> {request.specialRequirements}</p>
            )}
          </div>
        </div>
      </div>
      
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 rounded-full text-gray-400 hover:text-red-500"
          >
            <X className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {request.childName}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {request.childName} from this carpool?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleteRequestMutation.isPending ? (
                <Spinner size="sm" text="Removing..." />
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}