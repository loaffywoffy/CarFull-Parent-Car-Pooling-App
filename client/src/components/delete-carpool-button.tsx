import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteCarpool } from "@/api/carpools";
import { Carpool } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Trash2, AlertTriangle } from "lucide-react";
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

interface DeleteCarpoolButtonProps {
  carpool: Carpool;
  onDelete?: () => void;
  variant?: "icon" | "text" | "destructive";
  partyGroupId: number;
}

export default function DeleteCarpoolButton({ 
  carpool, 
  onDelete, 
  variant = "text", 
  partyGroupId 
}: DeleteCarpoolButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteCarpoolMutation = useMutation({
    mutationFn: (carpoolId: number) => deleteCarpool(carpoolId),
    onSuccess: () => {
      toast({
        title: "Carpool removed",
        description: "The carpool has been successfully removed.",
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
        title: "Failed to remove carpool",
        description: "There was a problem removing the carpool. Please try again.",
        variant: "destructive",
      });
      console.error("Error removing carpool:", error);
      setIsDeleting(false);
    }
  });

  const handleDelete = () => {
    setIsDeleting(true);
    deleteCarpoolMutation.mutate(carpool.id);
  };

  const renderButton = () => {
    if (variant === "icon") {
      return (
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 rounded-full text-gray-400 hover:text-blue-500"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      );
    } else if (variant === "destructive") {
      return (
        <Button variant="destructive" size="sm">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Carpool
        </Button>
      );
    } else {
      return (
        <Button variant="outline" size="sm" className="text-blue-500 hover:text-blue-600 hover:bg-blue-50">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Carpool
        </Button>
      );
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {renderButton()}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-blue-500">
            <AlertTriangle className="h-5 w-5" />
            Delete Carpool
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this carpool? This will remove all passengers
            currently booked for this ride. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete}
            className="bg-blue-500 hover:bg-blue-600"
          >
            {deleteCarpoolMutation.isPending ? (
              <Spinner size="sm" text="Deleting..." />
            ) : (
              "Delete Carpool"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}