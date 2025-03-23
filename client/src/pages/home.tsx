import { useState } from "react";
import CarpoolOfferForm from "@/components/carpool-offer-form";
import CarpoolRequestForm from "@/components/carpool-request-form";
import CarpoolList from "@/components/carpool-list";
import SuccessDialog from "@/components/success-dialog";

type Tab = "offer" | "request" | "view";
type SuccessInfo = {
  show: boolean;
  title: string;
  message: string;
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("offer");
  const [successInfo, setSuccessInfo] = useState<SuccessInfo>({
    show: false,
    title: "",
    message: "",
  });
  const [selectedCarpoolId, setSelectedCarpoolId] = useState<number | null>(null);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
  };

  const handleCarpoolSubmitSuccess = () => {
    setSuccessInfo({
      show: true,
      title: "Carpool Offer Submitted!",
      message: "Your carpool offer has been submitted successfully. Parents can now request spots.",
    });
  };

  const handleRequestSubmitSuccess = () => {
    setSuccessInfo({
      show: true,
      title: "Spot Request Submitted!",
      message: "Your carpool spot request has been submitted. The driver will be notified.",
    });
  };

  const handleRequestSpot = (carpoolId: number) => {
    setSelectedCarpoolId(carpoolId);
    setActiveTab("request");
  };

  const closeSuccessDialog = () => {
    setSuccessInfo({ ...successInfo, show: false });
  };

  return (
    <div className="bg-neutral-100 min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-neutral-800 mb-2">KidPool</h1>
          <p className="text-neutral-600">Organize carpools for your child's party easily</p>
        </header>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="flex border-b border-neutral-300 sm:space-x-8">
            <button
              onClick={() => handleTabChange("offer")}
              className={`py-2 px-4 font-medium flex-1 sm:flex-none ${
                activeTab === "offer"
                  ? "border-b-2 border-primary text-primary"
                  : "text-neutral-600"
              }`}
            >
              Offer a Carpool
            </button>
            <button
              onClick={() => handleTabChange("request")}
              className={`py-2 px-4 font-medium flex-1 sm:flex-none ${
                activeTab === "request"
                  ? "border-b-2 border-primary text-primary"
                  : "text-neutral-600"
              }`}
            >
              Request a Spot
            </button>
            <button
              onClick={() => handleTabChange("view")}
              className={`py-2 px-4 font-medium flex-1 sm:flex-none ${
                activeTab === "view"
                  ? "border-b-2 border-primary text-primary"
                  : "text-neutral-600"
              }`}
            >
              View All Carpools
            </button>
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === "offer" && (
          <CarpoolOfferForm onSuccess={handleCarpoolSubmitSuccess} />
        )}
        
        {activeTab === "request" && (
          <CarpoolRequestForm 
            selectedCarpoolId={selectedCarpoolId}
            onSuccess={handleRequestSubmitSuccess} 
          />
        )}
        
        {activeTab === "view" && (
          <CarpoolList onRequestSpot={handleRequestSpot} />
        )}

        {/* Success Dialog */}
        <SuccessDialog
          open={successInfo.show}
          title={successInfo.title}
          message={successInfo.message}
          onClose={closeSuccessDialog}
        />
      </div>
    </div>
  );
}
