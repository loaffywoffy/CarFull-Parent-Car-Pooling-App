import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, Car, Share2 } from "lucide-react";
import confetti from "canvas-confetti";

interface CarpoolSuccessProps {
  carpoolData: any;
  onContinue: () => void;
}

export default function CarpoolSuccess({ carpoolData, onContinue }: CarpoolSuccessProps) {
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
      return "pickup and dropoff";
    } else if (carpoolData.canPickup) {
      return "pickup to the party";
    } else if (carpoolData.canDropoff) {
      return "dropoff from the party";
    }
    return "transportation";
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
          
          <p className="text-gray-600 leading-relaxed">
            Your offer to provide <strong>{getOfferTypeText()}</strong> for <strong>{carpoolData.spacesAvailable} {carpoolData.spacesAvailable === 1 ? 'child' : 'children'}</strong> has been successfully posted.
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-center mb-3">
            <Car className="w-5 h-5 text-gray-600 mr-2" />
            <span className="font-medium text-gray-900">Your Offer Details</span>
          </div>
          
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Driver:</strong> {carpoolData.parentName}</p>
            <p><strong>For:</strong> {carpoolData.childName}</p>
            <p><strong>From:</strong> {carpoolData.address}, {carpoolData.city}</p>
            {carpoolData.outboundDepartureTime && (
              <p><strong>Departure:</strong> {carpoolData.outboundDepartureTime}</p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <Button 
            onClick={onContinue}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            Continue to Event Page
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => {
              // Share functionality can be added here
              if (navigator.share) {
                navigator.share({
                  title: 'Carpool Offer',
                  text: `${carpoolData.parentName} is offering carpool ${getOfferTypeText()} for ${carpoolData.spacesAvailable} children`,
                  url: window.location.href
                });
              }
            }}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share with Other Parents
          </Button>
        </div>

        <p className="text-xs text-gray-500 mt-4">
          Other parents can now see your offer and request spaces for their children.
        </p>
      </div>
    </div>
  );
}