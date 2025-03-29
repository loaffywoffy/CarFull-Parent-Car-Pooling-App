import { useState, useEffect } from "react";
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
import { getPartyGroupById, getPartyGroupByAccessCode } from "@/api/partyGroups";

type Tab = "partyGroups" | "offer" | "request" | "view";
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
  };

  const handleRequestSpot = (carpoolId: number) => {
    setSelectedCarpoolId(carpoolId);
    setActiveTab("request");
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
          title: "Party Group Created!",
          message: "Your party group has been created successfully. Share the access code with other parents.",
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
      title: "Joined Party Group!",
      message: `You have successfully joined the "${partyGroup.name}" party group.`,
    });
    
    // Set active tab to "view" so users can immediately see carpools after joining
    setActiveTab("view");
  };

  const handleSelectPartyGroup = (partyGroup: PartyGroup) => {
    setSelectedPartyGroup(partyGroup);
    setPartyGroupTab("details");
    // Navigate to view tab automatically for better user experience
    setActiveTab("view");
  };

  // Check URL for access code when the component mounts
  useEffect(() => {
    const checkUrlForAccessCode = async () => {
      const params = new URLSearchParams(window.location.search);
      const accessCode = params.get('access');
      
      if (accessCode) {
        try {
          // Try to find a party group with this access code
          const partyGroup = await getPartyGroupByAccessCode(accessCode);
          if (partyGroup) {
            setJoinAccessCode(accessCode);
            setSelectedPartyGroup(partyGroup);
            setPartyGroupTab("details");
            setActiveTab("view"); // Auto-navigate to the View Carpools tab
            
            setSuccessInfo({
              show: true,
              title: "Party Group Found!",
              message: `You've opened "${partyGroup.name}". You can now view available carpools.`,
            });
            
            // Remove the access code from the URL to avoid reloading on refresh
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
          }
        } catch (error) {
          console.error("Error fetching party group by access code:", error);
        }
      }
    };
    
    checkUrlForAccessCode();
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
                onRequestSpot={() => handleTabChange("view")} 
                isCreator={createdGroupIds.includes(selectedPartyGroup.id)}
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
        
        {activeTab === "request" && selectedCarpoolId && (
          <CarpoolRequestForm 
            selectedCarpoolId={selectedCarpoolId}
            onSuccess={handleRequestSubmitSuccess} 
          />
        )}
        
        {activeTab === "request" && !selectedCarpoolId && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-md">
              <h2 className="text-xl font-semibold mb-4">Request a Carpool Spot</h2>
              
              {!selectedPartyGroup ? (
                <>
                  <p className="text-neutral-600 mb-6">
                    Please select or join a party group first before requesting a carpool spot.
                  </p>
                  <button
                    onClick={() => handleTabChange("partyGroups")}
                    className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90"
                  >
                    Go to Party Groups
                  </button>
                </>
              ) : (
                <>
                  <p className="text-neutral-600 mb-6">
                    Select an available carpool offer from the list below to request a spot.
                  </p>
                  
                  {/* Show available carpools directly in this tab */}
                  <div className="mt-6">
                    <CarpoolList 
                      partyGroupId={selectedPartyGroup.id}
                      onRequestSpot={handleRequestSpot}
                      onManageCalendar={undefined}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        
        {activeTab === "view" && selectedPartyGroup && (
          <CarpoolList 
            partyGroupId={selectedPartyGroup.id}
            onRequestSpot={handleRequestSpot} 
            onManageCalendar={undefined}
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
