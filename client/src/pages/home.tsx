import { useState } from "react";
import CarpoolOfferForm from "@/components/carpool-offer-form";
import CarpoolRequestForm from "@/components/carpool-request-form";
import CarpoolList from "@/components/carpool-list";
import CalendarEventForm from "@/components/calendar-event-form";
import CalendarEventsList from "@/components/calendar-events-list";
import SuccessDialog from "@/components/success-dialog";
import PartyGroupForm from "@/components/party-group-form";
import PartyGroupsList from "@/components/party-groups-list";
import PartyGroupDetails from "@/components/party-group-details";
import JoinPartyGroup from "@/components/join-party-group";
import { type PartyGroup } from "@shared/schema";

type Tab = "partyGroups" | "offer" | "request" | "view" | "calendar";
type PartyGroupTab = "list" | "create" | "join" | "details";

type SuccessInfo = {
  show: boolean;
  title: string;
  message: string;
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("partyGroups");
  const [partyGroupTab, setPartyGroupTab] = useState<PartyGroupTab>("list");
  const [successInfo, setSuccessInfo] = useState<SuccessInfo>({
    show: false,
    title: "",
    message: "",
  });
  const [selectedCarpoolId, setSelectedCarpoolId] = useState<number | null>(null);
  const [selectedPartyGroup, setSelectedPartyGroup] = useState<PartyGroup | null>(null);
  const [joinAccessCode, setJoinAccessCode] = useState<string>("");

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

  const handlePartyGroupSuccess = (partyGroupId: number) => {
    setSuccessInfo({
      show: true,
      title: "Party Group Created!",
      message: "Your party group has been created successfully. Share the access code with other parents.",
    });
    setPartyGroupTab("list");
  };

  const handlePartyGroupJoinSuccess = (partyGroup: PartyGroup) => {
    setSelectedPartyGroup(partyGroup);
    setPartyGroupTab("details");
    setSuccessInfo({
      show: true,
      title: "Joined Party Group!",
      message: `You have successfully joined the "${partyGroup.name}" party group.`,
    });
  };

  const handleSelectPartyGroup = (partyGroup: PartyGroup) => {
    setSelectedPartyGroup(partyGroup);
    setPartyGroupTab("details");
  };

  const handleOfferCarpool = (partyGroupId: number) => {
    if (partyGroupId) {
      setActiveTab("offer");
    }
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
              onClick={() => handleTabChange("partyGroups")}
              className={`py-2 px-3 font-medium flex-1 sm:flex-none text-sm sm:text-base ${
                activeTab === "partyGroups"
                  ? "border-b-2 border-primary text-primary"
                  : "text-neutral-600"
              }`}
            >
              Party Groups
            </button>
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
        {activeTab === "partyGroups" && (
          <>
            {partyGroupTab === "list" && (
              <PartyGroupsList
                onSelectPartyGroup={handleSelectPartyGroup}
                onCreateNew={() => setPartyGroupTab("create")}
                onJoinPartyGroup={(accessCode) => {
                  setJoinAccessCode(accessCode || "");
                  setPartyGroupTab("join");
                }}
              />
            )}
            
            {partyGroupTab === "create" && (
              <PartyGroupForm onSuccess={handlePartyGroupSuccess} />
            )}
            
            {partyGroupTab === "join" && (
              <JoinPartyGroup 
                onJoinSuccess={handlePartyGroupJoinSuccess} 
                initialAccessCode={joinAccessCode}
              />
            )}
            
            {partyGroupTab === "details" && selectedPartyGroup && (
              <PartyGroupDetails 
                partyGroup={selectedPartyGroup} 
                onOfferCarpool={() => handleOfferCarpool(selectedPartyGroup.id)} 
              />
            )}
          </>
        )}
        
        {activeTab === "offer" && selectedPartyGroup && (
          <CarpoolOfferForm 
            onSuccess={handleCarpoolSubmitSuccess} 
            partyGroupId={selectedPartyGroup.id} 
          />
        )}
        
        {activeTab === "offer" && !selectedPartyGroup && (
          <div className="bg-white rounded-lg p-6 shadow-md">
            <h2 className="text-xl font-semibold mb-4">Offer a Carpool</h2>
            <p className="text-neutral-600 mb-6">
              Please select or join a party group first before offering a carpool.
            </p>
            <button
              onClick={() => handleTabChange("partyGroups")}
              className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90"
            >
              Go to Party Groups
            </button>
          </div>
        )}
        
        {activeTab === "request" && selectedPartyGroup && selectedCarpoolId && (
          <CarpoolRequestForm 
            selectedCarpoolId={selectedCarpoolId}
            onSuccess={handleRequestSubmitSuccess} 
          />
        )}
        
        {activeTab === "request" && (!selectedPartyGroup || !selectedCarpoolId) && (
          <div className="bg-white rounded-lg p-6 shadow-md">
            <h2 className="text-xl font-semibold mb-4">Request a Carpool Spot</h2>
            <p className="text-neutral-600 mb-6">
              {!selectedPartyGroup ? 
                "Please select or join a party group first before requesting a carpool spot." : 
                "Please select a carpool offer from the 'View All Carpools' tab before requesting a spot."}
            </p>
            <button
              onClick={() => handleTabChange(!selectedPartyGroup ? "partyGroups" : "view")}
              className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90"
            >
              {!selectedPartyGroup ? "Go to Party Groups" : "View Available Carpools"}
            </button>
          </div>
        )}
        
        {activeTab === "view" && selectedPartyGroup && (
          <CarpoolList 
            partyGroupId={selectedPartyGroup.id}
            onRequestSpot={handleRequestSpot} 
            onManageCalendar={(carpoolId) => {
              setSelectedCarpoolId(carpoolId);
              setActiveTab("calendar");
            }}
          />
        )}
        
        {activeTab === "view" && !selectedPartyGroup && (
          <div className="bg-white rounded-lg p-6 shadow-md">
            <h2 className="text-xl font-semibold mb-4">View Carpools</h2>
            <p className="text-neutral-600 mb-6">
              Please select or join a party group first to view available carpools.
            </p>
            <button
              onClick={() => handleTabChange("partyGroups")}
              className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90"
            >
              Go to Party Groups
            </button>
          </div>
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
