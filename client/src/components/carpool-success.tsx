import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, Car } from "lucide-react";
import confetti from "canvas-confetti";

interface CarpoolSuccessProps {
  carpoolData: any;
  onContinue: () => void;
  eventType?: string;
}

export default function CarpoolSuccess({ carpoolData, onContinue, eventType = "birthday" }: CarpoolSuccessProps) {
  // Helper function to get event-specific labels
  const getEventLabels = (eventType: string = "birthday") => {
    const eventMap: Record<string, { eventName: string; toEvent: string; fromEvent: string }> = {
      birthday: { eventName: "party", toEvent: "the party", fromEvent: "the party" },
      wedding: { eventName: "wedding", toEvent: "the wedding", fromEvent: "the wedding" },
      graduation: { eventName: "graduation", toEvent: "the graduation", fromEvent: "the graduation" },
      barmitzvah: { eventName: "Bar Mitzvah", toEvent: "the Bar Mitzvah", fromEvent: "the Bar Mitzvah" },
      batmitzvah: { eventName: "Bat Mitzvah", toEvent: "the Bat Mitzvah", fromEvent: "the Bat Mitzvah" },
      sports: { eventName: "sports event", toEvent: "the event", fromEvent: "the event" },
      school: { eventName: "school event", toEvent: "the school", fromEvent: "the school" },
      other: { eventName: "event", toEvent: "the event", fromEvent: "the event" }
    };
    return eventMap[eventType] || eventMap.birthday;
  };

  const eventLabels = getEventLabels(eventType);

  useEffect(() => {
    // Trigger confetti animation
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#22c55e', '#3b82f6', '#f59e0b']
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#22c55e', '#3b82f6', '#f59e0b']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, []);

  const getOfferTypeText = () => {
    if (carpoolData.canPickup && carpoolData.canDropoff) {
      return `pickup and dropoff for ${eventLabels.eventName}`;
    } else if (carpoolData.canPickup) {
      return `pickup to ${eventLabels.toEvent}`;
    } else if (carpoolData.canDropoff) {
      return `dropoff from ${eventLabels.fromEvent}`;
    }
    return `transportation for ${eventLabels.eventName}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="mb-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Ride Offer Created!
          </h1>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-center mb-3">
            <Car className="w-5 h-5 text-gray-600 mr-2" />
            <span className="font-medium text-gray-900">Your Offer Details</span>
          </div>
          
          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>Your Name:</strong> {carpoolData.parentName}</p>
            
            {/* Service Summary */}
            <div className="bg-white rounded-md p-3 border border-gray-200">
              <p className="font-medium text-gray-800 mb-2">What you're offering:</p>
              
              {/* TO Event (Pickup) */}
              {carpoolData.canPickup && (
                <div className="space-y-1 mb-3">
                  <p className="text-green-700">✓ Drive TO {eventLabels.toEvent}</p>
                  <p className="text-sm">• {carpoolData.spacesAvailable} space{carpoolData.spacesAvailable !== 1 ? 's' : ''} available</p>
                  {carpoolData.outboundDepartureTime && (
                    <p className="text-sm">• Departure time: {carpoolData.outboundDepartureTime}</p>
                  )}
                  <p className="text-sm">• From: {carpoolData.address}, {carpoolData.city}</p>
                </div>
              )}
              
              {/* FROM Event (Dropoff) */}
              {carpoolData.canDropoff && (
                <div className="space-y-1 mb-3">
                  <p className="text-orange-700">✓ Pick up FROM {eventLabels.fromEvent}</p>
                  <p className="text-sm">• {carpoolData.returnSpacesAvailable || carpoolData.spacesAvailable} space{(carpoolData.returnSpacesAvailable || carpoolData.spacesAvailable) !== 1 ? 's' : ''} available</p>
                  <p className="text-sm">• To: {carpoolData.address}, {carpoolData.city}</p>
                </div>
              )}
              
              {/* Both Ways */}
              {carpoolData.canBoth && (
                <div className="space-y-1">
                  <p className="text-purple-700">✓ Both ways (TO and FROM {eventLabels.eventName})</p>
                  <p className="text-sm">• TO event: {carpoolData.spacesAvailable} space{carpoolData.spacesAvailable !== 1 ? 's' : ''}</p>
                  <p className="text-sm">• FROM event: {carpoolData.returnSpacesAvailable || carpoolData.spacesAvailable} space{(carpoolData.returnSpacesAvailable || carpoolData.spacesAvailable) !== 1 ? 's' : ''}</p>
                  {carpoolData.outboundDepartureTime && (
                    <p className="text-sm">• Departure time: {carpoolData.outboundDepartureTime}</p>
                  )}
                  <p className="text-sm">• Location: {carpoolData.address}, {carpoolData.city}</p>
                </div>
              )}
              
              {/* Fallback if no service type is detected */}
              {!carpoolData.canPickup && !carpoolData.canDropoff && !carpoolData.canBoth && (
                <div className="space-y-1">
                  <p className="text-gray-700">Transportation service</p>
                  <p className="text-sm">• {carpoolData.spacesAvailable} space{carpoolData.spacesAvailable !== 1 ? 's' : ''} available</p>
                  <p className="text-sm">• Location: {carpoolData.address}, {carpoolData.city}</p>
                </div>
              )}
            </div>
            
            {carpoolData.additionalNotes && carpoolData.additionalNotes.trim() && (
              <div className="border-t pt-2 mt-3">
                <p><strong>Your notes:</strong> {carpoolData.additionalNotes}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-blue-900 mb-2">What happens next?</h3>
          <div className="text-sm text-blue-800 space-y-1">
            <p>• Other parents can now see your offer and request spaces</p>
            <p>• You'll receive requests via the event page</p>
          </div>
        </div>

        <Button 
          onClick={onContinue}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          Continue to Event Page
        </Button>
      </div>
    </div>
  );
}