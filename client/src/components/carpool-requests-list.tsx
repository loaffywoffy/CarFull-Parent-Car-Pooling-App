import { useQuery } from "@tanstack/react-query";
import { getCarpoolRequests, getCarpoolById } from "@/api/carpools";
import { Skeleton } from "@/components/ui/skeleton";
import { CarpoolRequest, Carpool } from "@shared/schema";

interface CarpoolRequestsListProps {
  carpoolId: number;
}

export default function CarpoolRequestsList({ carpoolId }: CarpoolRequestsListProps) {
  const { data: carpool, isLoading: isLoadingCarpool } = useQuery({
    queryKey: ["/api/carpools", carpoolId],
    queryFn: () => getCarpoolById(carpoolId),
    enabled: !!carpoolId,
  });

  const { data: requests, isLoading: isLoadingRequests } = useQuery({
    queryKey: ["/api/carpools", carpoolId, "requests"],
    queryFn: () => getCarpoolRequests(carpoolId),
    enabled: !!carpoolId,
  });

  if (isLoadingCarpool || isLoadingRequests) {
    return (
      <div className="mt-3 px-3 py-2 bg-gray-50 rounded border border-gray-200">
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-3 w-44 mb-1" />
        <Skeleton className="h-3 w-36" />
      </div>
    );
  }
  
  if (!carpool || !requests) {
    return (
      <div className="mt-3 px-3 py-2 bg-gray-50 rounded border border-gray-200">
        <p className="text-sm text-gray-500">Could not load passengers</p>
      </div>
    );
  }
  
  // Filter requests based on carpool pickup/dropoff preferences
  const filteredRequests = requests.filter((request: CarpoolRequest) => {
    if (carpool.canBoth) return true;
    if (carpool.canPickup && request.needsPickup) return true;
    if (carpool.canDropoff && request.needsDropoff) return true;
    return false;
  });

  if (filteredRequests.length === 0) {
    return (
      <div className="mt-3 px-3 py-2 bg-gray-50 rounded border border-gray-200">
        <p className="text-sm text-gray-500">No passengers yet</p>
      </div>
    );
  }
  
  // Group passengers by their needs for clear presentation
  const pickupPassengers = carpool.canPickup ? 
    filteredRequests.filter((r: CarpoolRequest) => r.needsPickup || r.needsBoth) : [];
  const dropoffPassengers = carpool.canDropoff ? 
    filteredRequests.filter((r: CarpoolRequest) => r.needsDropoff || r.needsBoth) : [];

  return (
    <div className="mt-3">
      <h4 className="text-sm font-medium text-gray-700 mb-2">Confirmed Passengers:</h4>
      
      {/* Pickup Passengers */}
      {pickupPassengers.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-gray-600 mb-1">Going to Party:</p>
          <div className="space-y-2">
            {pickupPassengers.map((request: CarpoolRequest) => (
              <div key={`pickup-${request.id}`} className="px-3 py-2 bg-gray-50 rounded border border-gray-200">
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
      )}
      
      {/* Dropoff Passengers */}
      {dropoffPassengers.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">Return from Party:</p>
          <div className="space-y-2">
            {dropoffPassengers.map((request: CarpoolRequest) => (
              <div key={`dropoff-${request.id}`} className="px-3 py-2 bg-gray-50 rounded border border-gray-200">
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
      )}
    </div>
  );
}