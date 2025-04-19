import { useEffect, useState } from "react";
import { type CarpoolRequest } from "@shared/schema";
import { getCarpoolRequests } from "@/api/carpools";
import { useToast } from "@/hooks/use-toast";
import { User, AlertCircle, Clock } from "lucide-react";
import { Button } from "./ui/button";
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
import DeleteCarpoolRequestButton from "./delete-carpool-request-button";
import EmergencyContactNotification from "./emergency-contact-notification";

interface CarpoolRequestsListProps {
  carpoolId: number;
}

export default function CarpoolRequestsList({ carpoolId }: CarpoolRequestsListProps) {
  const [requests, setRequests] = useState<CarpoolRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchRequests() {
      try {
        const fetchedRequests = await getCarpoolRequests(carpoolId);
        setRequests(fetchedRequests);
      } catch (error) {
        console.error("Error fetching requests:", error);
        toast({
          title: "Error",
          description: "Failed to load passengers. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchRequests();
  }, [carpoolId, toast]);

  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading passengers...</div>;
  }

  if (requests.length === 0) {
    return <div className="text-sm text-gray-500">No passengers booked yet.</div>;
  }

  return (
    <div className="space-y-4">
      <EmergencyContactNotification carpoolId={carpoolId} />

      <div className="space-y-3">
        {requests.map((request) => (
          <div key={request.id} className="bg-white p-3 rounded-lg border border-gray-200">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary-600" />
                <span className="font-medium">{request.childName}</span>
              </div>
              <DeleteCarpoolRequestButton request={request} variant="ghost" />
            </div>

            <div className="mt-2 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="h-4 w-4" />
                <span>
                  {request.needsPickup || request.needsBoth ? "Needs pickup" : ""}{" "}
                  {request.needsPickup && request.needsDropoff ? "and" : ""}{" "}
                  {request.needsDropoff || request.needsBoth ? "Needs return" : ""}
                </span>
              </div>

              {request.emergencyContactName && (
                <div className="bg-amber-50 p-2 rounded border border-amber-100">
                  <p className="text-xs font-medium text-amber-800">Emergency Contact</p>
                  <p className="text-xs text-amber-700">{request.emergencyContactName}</p>
                  <p className="text-xs text-amber-700">{request.emergencyContactPhone}</p>
                </div>
              )}

              {request.specialRequirements && (
                <div className="bg-blue-50 p-2 rounded border border-blue-100">
                  <p className="text-xs font-medium text-blue-800">Special Requirements</p>
                  <p className="text-xs text-blue-700">{request.specialRequirements}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}