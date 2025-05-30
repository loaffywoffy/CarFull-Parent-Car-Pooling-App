import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import DeleteCarpoolDialog from "./delete-carpool-dialog";
import { Carpool } from "@shared/schema";

interface DeleteCarpoolButtonProps {
  carpool: Carpool;
  partyGroupId?: number;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "icon";
  onDelete?: () => void;
}

export default function DeleteCarpoolButton({ 
  carpool, 
  partyGroupId, 
  variant = "outline", 
  onDelete 
}: DeleteCarpoolButtonProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDeleted = () => {
    if (onDelete) {
      onDelete();
    }
  };

  if (variant === "icon") {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDeleteDialog(true)}
          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        
        <DeleteCarpoolDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          carpoolId={carpool.id}
          carpoolPhone={carpool.phoneNumber}
          carpoolCreatorName={carpool.parentName}
          onDeleted={handleDeleted}
        />
      </>
    );
  }

  return (
    <>
      <Button
        variant={variant}
        size="sm"
        onClick={() => setShowDeleteDialog(true)}
        className="text-red-600 hover:text-red-700"
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Delete Offer
      </Button>
      
      <DeleteCarpoolDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        carpoolId={carpool.id}
        carpoolPhone={carpool.phoneNumber}
        carpoolCreatorName={carpool.parentName}
        onDeleted={handleDeleted}
      />
    </>
  );
}