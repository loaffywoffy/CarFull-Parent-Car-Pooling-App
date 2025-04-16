import { useState, useEffect } from "react";
import CarpoolOfferForm from "@/components/carpool-offer-form";
import CarpoolRequestForm from "@/components/carpool-request-form";
import CarpoolList from "@/components/carpool-list";
import CalendarEventForm from "@/components/calendar-event-form";
import CalendarEventsList from "@/components/calendar-events-list";
import SuccessDialog from "@/components/success-dialog";
import PartyGroupForm from "@/components/party-group-form";
import PartyGroupEditForm from "@/components/party-group-edit-form";
import PartyGroupsList from "@/components/party-groups-list";
import PartyGroupDetails from "@/components/party-group-details";
import JoinPartyGroup from "@/components/join-party-group";
import CarpoolSummary from "@/components/carpool-summary";

import { type PartyGroup } from "@shared/schema";
import { getPartyGroupById } from "@/api/partyGroups";

type Tab = "partyGroups" | "offer" | "request" | "view";
type PartyGroupTab = "list" | "create" | "join" | "details" | "edit";

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
  const [joinPartyId, setJoinPartyId] = useState<string>("");
  const [createdGroupIds, setCreatedGroupIds] = useState<number[]>([]);

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
    // Return to the "view" tab to see the updated carpool information
    setActiveTab("view");
    setSelectedCarpoolId(null);
  };

  const handleRequestSpot = (carpoolId: number) => {
    setSelectedCarpoolId(carpoolId);
    setActiveTab("request"); // Keep this line to maintain the CarpoolRequestForm rendering
  };

  const handlePartyGroupSuccess = (partyGroupId: number) => {
    // Add the newly created group to the createdGroupIds array
    setCreatedGroupIds(prev => [...prev, partyGroupId]);

    // Get the newly created party group and navigate to its details
    const fetchPartyGroup = async () => {
      try {
        const partyGroup = await getPartyGroupById(partyGroupId);
        setSelectedPartyGroup(partyGroup);
        setPartyGroupTab("details");

        setSuccessInfo({
          show: true,
          title: "Event Created!",
          message: "Your event has been created successfully. Share the link with other parents.",
        });
      } catch (error) {
        console.error("Error fetching party group:", error);
        setPartyGroupTab("list");
      }
    };

    fetchPartyGroup();
  };

  const handlePartyGroupJoinSuccess = (partyGroup: PartyGroup) => {
    setSelectedPartyGroup(partyGroup);
    setPartyGroupTab("details");
    setSuccessInfo({
      show: true,
      title: "Joined Event!",
      message: `You have successfully joined the "${partyGroup.name}" event group.`,
    });

    // Set active tab to "view" so users can immediately see carpools after joining
    setActiveTab("view");
  };

  const handleSelectPartyGroup = (partyGroup: PartyGroup) => {
    setSelectedPartyGroup(partyGroup);
    setPartyGroupTab("details");
    // Stay on the current tab and show the party group details
    // Don't automatically navigate to the view tab
  };

  // Check URL for party ID when the component mounts
  useEffect(() => {
    const checkUrlForPartyId = async () => {
      const params = new URLSearchParams(window.location.search);
      const partyId = params.get('partyId');

      if (partyId && !isNaN(Number(partyId))) {
        try {
          // Try to find a party group with this ID
          const partyGroup = await getPartyGroupById(parseInt(partyId));
          if (partyGroup) {
            setJoinPartyId(partyId);
            setSelectedPartyGroup(partyGroup);
            setPartyGroupTab("details");
            setActiveTab("view"); // Auto-navigate to the View Carpools tab

            setSuccessInfo({
              show: true,
              title: "Event Found!",
              message: `You've opened "${partyGroup.name}". You can now view available carpools.`,
            });

            // Remove the party ID from the URL to avoid reloading on refresh
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
          }
        } catch (error) {
          console.error("Error fetching party group by ID:", error);
        }
      }
    };

    checkUrlForPartyId();
  }, []);

  const handleOfferCarpool = (partyGroupId: number) => {
    if (partyGroupId) {
      // If we don't have the party group selected yet, fetch it first
      if (!selectedPartyGroup || selectedPartyGroup.id !== partyGroupId) {
        const fetchPartyGroup = async () => {
          try {
            const partyGroup = await getPartyGroupById(partyGroupId);
            setSelectedPartyGroup(partyGroup);
            setActiveTab("offer");
          } catch (error) {
            console.error("Error fetching party group:", error);
          }
        };
        fetchPartyGroup();
      } else {
        setActiveTab("offer");
      }
    }
  };

  const handleEditPartyGroup = (partyGroupId: number) => {
    if (partyGroupId) {
      // If we don't have the party group selected yet, fetch it first
      if (!selectedPartyGroup || selectedPartyGroup.id !== partyGroupId) {
        const fetchPartyGroup = async () => {
          try {
            const partyGroup = await getPartyGroupById(partyGroupId);
            setSelectedPartyGroup(partyGroup);
            setPartyGroupTab("edit");
          } catch (error) {
            console.error("Error fetching party group:", error);
          }
        };
        fetchPartyGroup();
      } else {
        setPartyGroupTab("edit");
      }
    }
  };

  const handlePartyGroupEditSuccess = (partyGroupId: number) => {
    // Get the updated party group and navigate back to its details
    const fetchPartyGroup = async () => {
      try {
        const partyGroup = await getPartyGroupById(partyGroupId);
        setSelectedPartyGroup(partyGroup);
        setPartyGroupTab("details");

        setSuccessInfo({
          show: true,
          title: "Event Updated!",
          message: "Your event has been updated successfully.",
        });
      } catch (error) {
        console.error("Error fetching party group:", error);
        setPartyGroupTab("list");
      }
    };

    fetchPartyGroup();
  };

  const closeSuccessDialog = () => {
    setSuccessInfo({ ...successInfo, show: false });
  };

  return (
    <div className="bg-neutral-100 min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-neutral-800 mb-2">KidPool</h1>
          <p className="text-neutral-600">Organize carpools for your child's events easily</p>
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
              Events
            </button>
            <button
              onClick={() => selectedPartyGroup ? handleTabChange("offer") : handleTabChange("partyGroups")}
              className={`py-2 px-3 font-medium flex-1 sm:flex-none text-sm sm:text-base ${
                activeTab === "offer"
                  ? "border-b-2 border-primary text-primary"
                  : "text-neutral-600"
              }`}
            >
              Offer Ride
            </button>
            <button
              onClick={() => selectedPartyGroup ? handleTabChange("view") : handleTabChange("partyGroups")}
              className={`py-2 px-3 font-medium flex-1 sm:flex-none text-sm sm:text-base ${
                activeTab === "view"
                  ? "border-b-2 border-primary text-primary"
                  : "text-neutral-600"
              }`}
            >
              Need Ride
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
                onJoinPartyGroup={(partyId) => {
                  setJoinPartyId(partyId || "");
                  setPartyGroupTab("join");
                }}
              />
            )}

            {partyGroupTab === "create" && (
              <PartyGroupForm 
                onSuccess={handlePartyGroupSuccess} 
                onCancel={() => setPartyGroupTab("list")}
              />
            )}

            {partyGroupTab === "join" && (
              <JoinPartyGroup 
                onJoinSuccess={handlePartyGroupJoinSuccess}
                onCancel={() => setPartyGroupTab("list")}
                initialPartyId={joinPartyId}
              />
            )}

            {partyGroupTab === "details" && selectedPartyGroup && (
              <PartyGroupDetails 
                partyGroup={selectedPartyGroup} 
                onOfferCarpool={() => handleOfferCarpool(selectedPartyGroup.id)}
                onRequestSpot={() => handleTabChange("view")} 
                isCreator={true} /* Set to true for testing purposes - normally: createdGroupIds.includes(selectedPartyGroup.id) */
                onEdit={() => handleEditPartyGroup(selectedPartyGroup.id)}
                onDeleted={() => setPartyGroupTab("list")}
              />
            )}

            {partyGroupTab === "edit" && selectedPartyGroup && (
              <PartyGroupEditForm 
                partyGroup={selectedPartyGroup}
                onSuccess={handlePartyGroupEditSuccess}
                onCancel={() => setPartyGroupTab("details")}
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
              Please select or join an event first before offering a carpool.
            </p>
            <button
              onClick={() => handleTabChange("partyGroups")}
              className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90"
            >
              Select Event
            </button>
          </div>
        )}

        {activeTab === "request" && selectedCarpoolId && (
          <CarpoolRequestForm 
            selectedCarpoolId={selectedCarpoolId}
            onSuccess={handleRequestSubmitSuccess} 
          />
        )}

        {activeTab === "view" && selectedPartyGroup && (
          <CarpoolSummary 
            partyGroupId={selectedPartyGroup.id}
            onRequestSpot={handleRequestSpot}
          />
        )}

        {activeTab === "view" && !selectedPartyGroup && (
          <div className="bg-white rounded-lg p-6 shadow-md">
            <h2 className="text-xl font-semibold mb-4">Manage Carpools</h2>
            <p className="text-neutral-600 mb-6">
              Please select or join an event first to view and manage carpools.
            </p>
            <button
              onClick={() => handleTabChange("partyGroups")}
              className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90"
            >
              Select Event
            </button>
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