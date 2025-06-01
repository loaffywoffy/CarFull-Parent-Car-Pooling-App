import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import CarpoolOfferForm from "@/components/carpool-offer-form";
import CarpoolRequestForm from "@/components/carpool-request-form";
import CarpoolList from "@/components/carpool-list";
// Calendar components removed
import SuccessDialog from "@/components/success-dialog";
import PartyGroupForm from "@/components/party-group-form";
import PartyGroupEditForm from "@/components/party-group-edit-form";
import PartyGroupsList from "@/components/party-groups-list";
import PartyGroupDetails from "@/components/party-group-details";
import JoinPartyGroup from "@/components/join-party-group";

import CarpoolSummary from "@/components/carpool-summary";
import CarCollageAnimation from "@/components/car-collage-animation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Car, Users, MapPin, Calendar } from "lucide-react";

import { type PartyGroup } from "@shared/schema";
import { getPartyGroupById, getPartyGroups } from "@/api/partyGroups";

type Tab = "partyGroups" | "offer" | "request" | "view";
type PartyGroupTab = "list" | "create" | "details" | "edit";

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
  const [innerTabValue, setInnerTabValue] = useState<string>("find");
  const [createdGroupIds, setCreatedGroupIds] = useState<number[]>([]);

  // Query to fetch all party groups
  const { data: partyGroups = [] } = useQuery<PartyGroup[]>({
    queryKey: ['/api/party-groups'],
    queryFn: getPartyGroups
  });

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
  };

  const handleCarpoolSubmitSuccess = () => {
    setSuccessInfo({
      show: true,
      title: "Carpool Offer Submitted!",
      message: "Your carpool offer has been submitted successfully. Parents can now request spots.",
    });
    // Navigate to the "view" tab to see the updated carpool summary
    setActiveTab("view");
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
    // Store the carpool ID for the request form
    setSelectedCarpoolId(carpoolId);

    // If we're in the "summary" tab, switch to "find" tab to see the carpool list
    // with the selected carpool expanded
    setInnerTabValue("find");
  };

  // Calendar feature removed

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

  // Join functionality removed for MVP but we still need to handle URL parameters
  const handlePartyGroupJoinSuccess = (partyGroup: PartyGroup) => {
    setSelectedPartyGroup(partyGroup);
    setPartyGroupTab("details");
    setSuccessInfo({
      show: true,
      title: "Event Opened!",
      message: `You've opened the "${partyGroup.name}" event.`,
    });

    // Set active tab to "view" so users can immediately see carpools after opening an event
    setActiveTab("view");
  };

  const handleSelectPartyGroup = (partyGroup: PartyGroup) => {
    setSelectedPartyGroup(partyGroup);

    // If we're on the Events tab, go to details
    if (activeTab === "partyGroups") {
      setPartyGroupTab("details");
    }
    // If we're on a different tab (Offer a Ride or Find a Ride), stay on that tab
    // but with the selected party group now set
  };

  // Check URL for party ID when the component mounts and setup event listeners
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

    // Define custom event interface for TypeScript safety
    interface ActionEvent extends CustomEvent {
      detail: {
        type: 'offer-ride' | 'find-ride';
        partyGroupId: number;
      }
    }

    // Set up event listener for custom actions from the PartyGroupsList
    const handleActionEvent = (event: Event) => {
      const actionEvent = event as ActionEvent;
      const { type, partyGroupId } = actionEvent.detail;

      if (type === 'offer-ride') {
        // Navigate to "Offer a Ride" tab
        handleOfferCarpool(partyGroupId);
      } else if (type === 'find-ride') {
        // Navigate to "Find a Ride" tab
        setActiveTab("view");
      }
    };

    window.addEventListener('action', handleActionEvent);
    checkUrlForPartyId();

    // Clean up event listener on component unmount
    return () => {
      window.removeEventListener('action', handleActionEvent);
    };
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

  // Debug: Log when component renders
  console.log('Home component rendering with background animation');

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background Animation - should be behind everything */}
      <CarCollageAnimation />

      {/* Main content - should be above animation */}
      <div className="relative z-20 container mx-auto px-4 py-8 max-w-4xl">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-neutral-800 mb-2 flex items-center justify-center gap-2">
            <Car className="h-8 w-8 text-primary animate-bounce" />
            KidPool
            <Users className="h-8 w-8 text-primary animate-bounce" />
          </h1>
          <p className="text-neutral-600 flex items-center justify-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            Making event travel fun and easy
            <Calendar className="h-4 w-4 text-primary" />
          </p>
        </header>

        {/* Empty section - removed */}

        {/* Content based on active tab */}
        {activeTab === "partyGroups" && (
          <div className="backdrop-blur-sm bg-white/70 rounded-lg shadow-lg p-6">
            {partyGroupTab === "list" && (
              <PartyGroupsList
                onSelectPartyGroup={handleSelectPartyGroup}
                onCreateNew={() => setPartyGroupTab("create")}
                onJoinPartyGroup={() => {}} // Removed for MVP but keeping prop for interface compatibility
              />
            )}

            {partyGroupTab === "create" && (
              <PartyGroupForm 
                onSuccess={handlePartyGroupSuccess} 
                onCancel={() => setPartyGroupTab("list")}
              />
            )}

            {/* Join party feature removed for MVP */}

            {partyGroupTab === "details" && selectedPartyGroup && (
              <PartyGroupDetails 
                partyGroup={selectedPartyGroup} 
                onOfferCarpool={() => handleOfferCarpool(selectedPartyGroup.id)}
                onRequestSpot={() => handleTabChange("view")} 
                isCreator={true} /* Set to true for testing purposes - normally: createdGroupIds.includes(selectedPartyGroup.id) */
                onEdit={() => handleEditPartyGroup(selectedPartyGroup.id)}
                onDeleted={() => setPartyGroupTab("list")}
                onBack={() => setPartyGroupTab("list")}
              />
            )}

            {partyGroupTab === "edit" && selectedPartyGroup && (
              <PartyGroupEditForm 
                partyGroup={selectedPartyGroup}
                onSuccess={handlePartyGroupEditSuccess}
                onCancel={() => setPartyGroupTab("details")}
              />
            )}
          </div>
        )}

        {activeTab === "offer" && selectedPartyGroup && (
          <div className="backdrop-blur-sm bg-white/70 rounded-lg shadow-lg p-6">
            <CarpoolOfferForm 
            onSuccess={handleCarpoolSubmitSuccess} 
            onCancel={() => {
              setActiveTab("partyGroups");
              setPartyGroupTab("details");
            }}
            partyGroupId={selectedPartyGroup.id} 
            />
          </div>
        )}

        {activeTab === "offer" && !selectedPartyGroup && (
          <div className="bg-white rounded-lg p-6 shadow-md">
            <h2 className="text-xl font-semibold mb-4">Offer a Carpool</h2>
            <p className="text-neutral-600 mb-6">
              Please select an event first before offering a carpool.
            </p>
            <button
              onClick={() => handleTabChange("partyGroups")}
              className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90"
            >
              Select Event
            </button>
          </div>
        )}

        {/* Carpool Request Form */}
        {activeTab === "request" && selectedCarpoolId && (
          <CarpoolRequestForm
            onSuccess={handleRequestSubmitSuccess}
            selectedCarpoolId={selectedCarpoolId}
          />
        )}

        {activeTab === "view" && selectedPartyGroup && (
          <div className="backdrop-blur-sm bg-white/70 rounded-lg shadow-lg p-6">
            <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-neutral-800">
                Ride Information for {selectedPartyGroup.name}
              </h2>
              <Button
                onClick={() => handleTabChange("partyGroups")}
                variant="outline"
                size="sm"
                className="flex gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Back to Event
              </Button>
            </div>

            <div className="mt-0">
              <CarpoolList 
                partyGroupId={selectedPartyGroup.id}
                onRequestSpot={handleRequestSpot}
                onOfferRide={() => handleOfferCarpool(selectedPartyGroup.id)}
                selectedCarpoolId={selectedCarpoolId}
              />
            </div>
          </div>
        )}

        {activeTab === "view" && !selectedPartyGroup && (
          <div className="bg-white rounded-lg p-6 shadow-md">
            <h2 className="text-xl font-semibold mb-4">Manage Carpools</h2>
            <p className="text-neutral-600 mb-6">
              Please select an event first to view and manage carpools.
            </p>
            <button
              onClick={() => handleTabChange("partyGroups")}
              className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90"
            >
              Select Event
            </button>
          </div>
        )}



        {/* Calendar Management UI removed */}

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