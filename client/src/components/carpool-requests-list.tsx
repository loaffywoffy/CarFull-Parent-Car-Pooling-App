import { useQuery } from "@tanstack/react-query";
import { getCarpoolRequests } from "@/api/carpools";
import { Skeleton } from "@/components/ui/skeleton";
import { CarpoolRequest } from "@shared/schema";

interface CarpoolRequestsListProps {
  carpoolId: number;
}

export default function CarpoolRequestsList({ carpoolId }: CarpoolRequestsListProps) {
  const { data: requests, isLoading } = useQuery({
    queryKey: ["/api/carpools", carpoolId, "requests"],
    queryFn: () => getCarpoolRequests(carpoolId),
    enabled: !!carpoolId,
  });

  if (isLoading) {
    return (
      <div className="mt-3 px-3 py-2 bg-gray-50 rounded border border-gray-200">
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-3 w-44 mb-1" />
        <Skeleton className="h-3 w-36" />
      </div>
    );
  }

  if (!requests || requests.length === 0) {
    return (
      <div className="mt-3 px-3 py-2 bg-gray-50 rounded border border-gray-200">
        <p className="text-sm text-gray-500">No requests yet</p>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <h4 className="text-sm font-medium text-gray-700 mb-2">Confirmed Passengers:</h4>
      <div className="space-y-2">
        {requests.map((request: CarpoolRequest) => (
          <div key={request.id} className="px-3 py-2 bg-gray-50 rounded border border-gray-200">
            <p className="text-sm font-medium">{request.childName} <span className="font-normal text-gray-500">(Child)</span></p>
            <p className="text-xs text-gray-600">Parent: {request.parentName}</p>
            <p className="text-xs text-gray-600">
              Address: {request.address}{request.city ? `, ${request.city}` : ''}{request.postcode ? ` ${request.postcode}` : ''}
            </p>
            <p className="text-xs text-gray-600">Contact: {request.phoneNumber}</p>
            {request.specialRequirements && (
              <p className="text-xs text-gray-600 mt-1">
                <span className="font-medium">Special Requirements:</span> {request.specialRequirements}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}