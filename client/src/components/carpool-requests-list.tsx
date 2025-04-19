import { useQuery } from "@tanstack/react-query";
import { getCarpoolRequests, getCarpoolById } from "@/api/carpools";
import { Skeleton } from "@/components/ui/skeleton";
import { CarpoolRequest, Carpool } from "@shared/schema";
import EmergencyContactNotification from "./emergency-contact-notification";
import DeleteCarpoolRequestButton from "./delete-carpool-request-button";
import { User, MapPin, Phone, Clock, AlertCircle, Info } from "lucide-react";

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

  // Helper function to render ride time info
  const renderRideTimeInfo = (isOutbound: boolean) => {
    if (isOutbound) {
      return (
        <div className="flex items-start gap-2 bg-green-50 p-2.5 rounded border border-green-100 mb-3">
          <Clock className="h-4 w-4 text-green-600 mt-0.5" />
          <div>
            <span className="font-semibold text-sm block text-green-700">Target departure time:</span>
            <span className="text-sm font-medium">{carpool.outboundDepartureTime || "Not specified"}</span>
          </div>
        </div>
      );
    } else {
      return (
        <div className="flex items-start gap-2 bg-blue-50 p-2.5 rounded border border-blue-100 mb-3">
          <Clock className="h-4 w-4 text-blue-600 mt-0.5" />
          <div>
            <span className="font-semibold text-sm block text-blue-700">Collection time:</span>
            <span className="text-sm font-medium">{carpool.returnCollectionTime || "Not specified"}</span>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="mt-3">
      {/* Emergency Contact Notification */}
      <div className="mb-4">
        <EmergencyContactNotification carpoolId={carpoolId} />
      </div>
      
      <h4 className="text-sm font-medium text-gray-700 mb-2">Confirmed Passengers:</h4>
      
      {/* Pickup Passengers */}
      {pickupPassengers.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-semibold text-green-700">Going to Party</h3>
          </div>
          
          {/* Show outbound departure time prominently */}
          {renderRideTimeInfo(true)}
          
          <div className="space-y-3">
            {pickupPassengers.map((request: CarpoolRequest) => (
              <div key={`pickup-${request.id}`} className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-green-600" />
                    <p className="text-sm font-medium">{request.childName}</p>
                  </div>
                  <DeleteCarpoolRequestButton request={request} variant="text" />
                </div>
                
                <div className="mt-3 bg-blue-50 p-3 rounded-md border border-blue-100">
                  <h4 className="text-sm font-semibold text-blue-700 mb-2 flex items-center gap-1.5">
                    <Info className="h-4 w-4" />
                    Parent Details
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-gray-500" />
                      <span className="font-medium">{request.parentName}</span>
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-gray-500" />
                      <span>{request.phoneNumber}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-1.5 mt-2">
                    <MapPin className="h-3.5 w-3.5 text-gray-500 mt-0.5" />
                    <span>
                      {request.address}
                      {request.city ? `, ${request.city}` : ''}
                      {request.postcode ? ` ${request.postcode}` : ''}
                    </span>
                  </div>
                </div>
                
                {request.specialRequirements && (
                  <div className="mt-2 flex items-start gap-1.5 px-2 py-1.5 bg-yellow-50 rounded border border-yellow-100">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-600 mt-0.5" />
                    <span className="text-sm">
                      <span className="font-medium">Special Requirements:</span> {request.specialRequirements}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Dropoff Passengers */}
      {dropoffPassengers.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-semibold text-blue-700">Return from Party</h3>
          </div>
          
          {/* Show return collection time prominently */}
          {renderRideTimeInfo(false)}
          
          <div className="space-y-3">
            {dropoffPassengers.map((request: CarpoolRequest) => (
              <div key={`dropoff-${request.id}`} className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-600" />
                    <p className="text-sm font-medium">{request.childName}</p>
                  </div>
                  <DeleteCarpoolRequestButton request={request} variant="text" />
                </div>
                
                <div className="mt-3 bg-blue-50 p-3 rounded-md border border-blue-100">
                  <h4 className="text-sm font-semibold text-blue-700 mb-2 flex items-center gap-1.5">
                    <Info className="h-4 w-4" />
                    Parent Details
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-gray-500" />
                      <span className="font-medium">{request.parentName}</span>
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-gray-500" />
                      <span>{request.phoneNumber}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-1.5 mt-2">
                    <MapPin className="h-3.5 w-3.5 text-gray-500 mt-0.5" />
                    <span>
                      {request.address}
                      {request.city ? `, ${request.city}` : ''}
                      {request.postcode ? ` ${request.postcode}` : ''}
                    </span>
                  </div>
                </div>
                
                {request.specialRequirements && (
                  <div className="mt-2 flex items-start gap-1.5 px-2 py-1.5 bg-yellow-50 rounded border border-yellow-100">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-600 mt-0.5" />
                    <span className="text-sm">
                      <span className="font-medium">Special Requirements:</span> {request.specialRequirements}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}