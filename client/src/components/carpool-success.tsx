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



        <div className="space-y-4 mb-6">
          <h3 className="font-semibold text-gray-900 text-center mb-6">What happens next?</h3>
          
          {/* Step 1: Browse and Share */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-5">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-semibold text-sm">1</span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 mb-3">Parents can browse all available carpools or you can share yours directly</p>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const eventUrl = `${window.location.origin}/events/${carpoolData.shareableUrl || 'event'}`;
                      const message = `Hi! I'm offering car spaces for ${eventLabels.eventName}. Check out the details: ${eventUrl}`;
                      window.open(`sms:?body=${encodeURIComponent(message)}`, '_blank');
                    }}
                    className="text-green-600 border-green-200 hover:bg-green-50"
                  >
                    📱 SMS
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const eventUrl = `${window.location.origin}/events/${carpoolData.shareableUrl || 'event'}`;
                      const message = `Hi! I'm offering car spaces for ${eventLabels.eventName}. Check out the details: ${eventUrl}`;
                      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
                    }}
                    className="text-green-600 border-green-200 hover:bg-green-50"
                  >
                    💬 WhatsApp
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const eventUrl = `${window.location.origin}/events/${carpoolData.shareableUrl || 'event'}`;
                      const subject = `Car space available for ${eventLabels.eventName}`;
                      const body = `Hi!\n\nI'm offering car spaces for ${eventLabels.eventName}. You can view the details and request a space here:\n\n${eventUrl}`;
                      window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
                    }}
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    ✉️ Email
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: SMS Notifications */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-sm">2</span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 mb-2">You'll be notified via SMS</p>
                <p className="text-sm text-gray-600">We'll send you a text message when parents request spaces, and you can accept or decline each request.</p>
              </div>
            </div>
          </div>

          {/* Discrete note about editing */}
          <div className="bg-gray-50 rounded-lg p-3 mt-4">
            <p className="text-xs text-gray-500 text-center">
              To edit or delete your carpool offer, navigate to the event page, find your carpool and select the edit or delete icon.
            </p>
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