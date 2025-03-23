import { useState } from "react";
import CarpoolOfferForm from "@/components/carpool-offer-form";
import CarpoolRequestForm from "@/components/carpool-request-form";
import CarpoolList from "@/components/carpool-list";
import CalendarEventForm from "@/components/calendar-event-form";
import CalendarEventsList from "@/components/calendar-events-list";
import SuccessDialog from "@/components/success-dialog";

type Tab = "offer" | "request" | "view" | "calendar";
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
          <div className="flex flex-wrap border-b border-neutral-300 sm:space-x-4">
            <button
              onClick={() => handleTabChange("offer")}
              className={`py-2 px-3 font-medium flex-1 sm:flex-none text-sm sm:text-base ${
                activeTab === "offer"
                  ? "border-b-2 border-primary text-primary"
                  : "text-neutral-600"
              }`}
            >
              Offer a Carpool
            </button>
            <button
              onClick={() => handleTabChange("request")}
              className={`py-2 px-3 font-medium flex-1 sm:flex-none text-sm sm:text-base ${
                activeTab === "request"
                  ? "border-b-2 border-primary text-primary"
                  : "text-neutral-600"
              }`}
            >
              Request a Spot
            </button>
            <button
              onClick={() => handleTabChange("view")}
              className={`py-2 px-3 font-medium flex-1 sm:flex-none text-sm sm:text-base ${
                activeTab === "view"
                  ? "border-b-2 border-primary text-primary"
                  : "text-neutral-600"
              }`}
            >
              View All Carpools
            </button>
            <button
              onClick={() => handleTabChange("calendar")}
              className={`py-2 px-3 font-medium flex-1 sm:flex-none text-sm sm:text-base ${
                activeTab === "calendar"
                  ? "border-b-2 border-primary text-primary"
                  : "text-neutral-600"
              }`}
            >
              Calendar
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
          <CarpoolList 
            onRequestSpot={handleRequestSpot} 
            onManageCalendar={(carpoolId) => {
              setSelectedCarpoolId(carpoolId);
              setActiveTab("calendar");
            }}
          />
        )}
        
        {activeTab === "calendar" && (
          <div className="space-y-8">
            {selectedCarpoolId ? (
              <>
                <CalendarEventForm 
                  carpoolId={selectedCarpoolId} 
                  onSuccess={() => {
                    setSuccessInfo({
                      show: true,
                      title: "Calendar Event Created!",
                      message: "Your event has been added to the calendar successfully.",
                    });
                  }} 
                />
                <CalendarEventsList 
                  carpoolId={selectedCarpoolId} 
                  onBackToList={() => handleTabChange("view")} 
                />
              </>
            ) : (
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-4">Calendar Events</h2>
                <p className="text-neutral-600 mb-4">
                  Please select a carpool from the "View All Carpools" tab first to manage its calendar events.
                </p>
                <button
                  onClick={() => handleTabChange("view")}
                  className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90"
                >
                  Go to Carpools
                </button>
              </div>
            )}
          </div>
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
