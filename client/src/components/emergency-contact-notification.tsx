import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, PhoneCall, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

import { getPartyGroups } from "../api/partyGroups";
import { getCarpoolRequests } from "../api/carpools";
import { getCarpoolById } from "../api/carpools";
import { Carpool, CarpoolRequest, PartyGroup } from "@shared/schema";

interface EmergencyContactNotificationProps {
  carpoolId: number;
}

export default function EmergencyContactNotification({ carpoolId }: EmergencyContactNotificationProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);
  const [notificationType, setNotificationType] = useState<"call" | "message" | null>(null);
  const { toast } = useToast();

  // Get carpool data
  const { data: carpool, isLoading: isLoadingCarpool } = useQuery<Carpool>({
    queryKey: ['/api/carpools', carpoolId],
    queryFn: () => getCarpoolById(carpoolId),
    enabled: !!carpoolId
  });

  // Get carpool requests for this carpool
  const { data: carpoolRequests = [], isLoading: isLoadingRequests } = useQuery<CarpoolRequest[]>({
    queryKey: ['/api/carpool-requests', carpoolId],
    queryFn: () => getCarpoolRequests(carpoolId),
    enabled: !!carpoolId
  });

  // Get the party group
  const { data: partyGroups = [] } = useQuery<PartyGroup[]>({
    queryKey: ['/api/party-groups'],
    queryFn: getPartyGroups
  });

  const partyGroup = carpool ? partyGroups.find(group => group.id === carpool.partyGroupId) : null;

  const openDialog = () => setIsDialogOpen(true);
  const closeDialog = () => setIsDialogOpen(false);

  const getEmergencyContacts = () => {
    // Collect emergency contacts from carpool driver and all passengers
    const contacts = [];
    
    // Add driver's emergency contact if available
    if (carpool?.emergencyContactName && carpool?.emergencyContactPhone) {
      contacts.push({
        name: carpool.emergencyContactName,
        phone: carpool.emergencyContactPhone,
        relationship: carpool.emergencyContactRelationship || 'Unknown',
        personName: carpool.parentName, // Driver's name
        role: 'Driver'
      });
    }
    
    // Add passenger emergency contacts
    carpoolRequests.forEach(request => {
      if (request.emergencyContactName && request.emergencyContactPhone) {
        contacts.push({
          name: request.emergencyContactName,
          phone: request.emergencyContactPhone,
          relationship: request.emergencyContactRelationship || 'Unknown',
          personName: request.childName, // Child's name
          role: 'Passenger'
        });
      }
    });
    
    return contacts;
  };

  const handleNotifyEmergencyContacts = (type: "call" | "message") => {
    setIsNotifying(true);
    setNotificationType(type);
    
    // Simulate notification process
    setTimeout(() => {
      setIsNotifying(false);
      closeDialog();
      
      // Show success message
      toast({
        title: "Emergency Contacts Notified",
        description: type === "call" 
          ? "Emergency calls have been initiated to all contacts." 
          : "Emergency messages have been sent to all contacts.",
        variant: "default",
      });
    }, 2000);
  };

  if (isLoadingCarpool || isLoadingRequests) {
    return (
      <Card className="border-2 border-yellow-200">
        <CardHeader className="bg-yellow-50">
          <CardTitle className="flex items-center text-yellow-800">
            <AlertTriangle className="mr-2 h-5 w-5" />
            Loading Emergency Button...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const emergencyContacts = getEmergencyContacts();

  return (
    <>
      <Card className="border-2 border-red-200">
        <CardHeader className="bg-red-50">
          <CardTitle className="flex items-center text-red-800">
            <AlertTriangle className="mr-2 h-5 w-5" />
            Emergency Button
          </CardTitle>
          <CardDescription className="text-red-700">
            One-tap notification for all emergency contacts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600 mb-4">
            In case of an emergency during carpooling for "<strong>{partyGroup?.name || 'this event'}</strong>", 
            press the button below to quickly notify all emergency contacts.
          </p>
        </CardContent>
        <CardFooter>
          <Button 
            variant="destructive" 
            className="w-full" 
            onClick={openDialog}
            disabled={emergencyContacts.length === 0}
          >
            {emergencyContacts.length === 0 
              ? "No Emergency Contacts Available" 
              : "Notify Emergency Contacts"}
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-700 flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Emergency Notification
            </DialogTitle>
            <DialogDescription>
              This will notify all emergency contacts for this carpool group.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                Only use this in case of a genuine emergency.
              </AlertDescription>
            </Alert>
            
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Emergency contacts to be notified:</h4>
              <ul className="space-y-1 text-sm">
                {emergencyContacts.map((contact, index) => (
                  <li key={index} className="flex flex-col p-2 rounded-md bg-gray-50">
                    <span className="font-medium">
                      {contact.name} ({contact.relationship} of {contact.personName} - {contact.role})
                    </span>
                    <span className="text-gray-600">{contact.phone}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <DialogFooter className="sm:justify-between">
            <Button variant="outline" onClick={closeDialog} disabled={isNotifying}>
              Cancel
            </Button>
            <div className="flex space-x-2">
              <Button 
                variant="destructive" 
                onClick={() => handleNotifyEmergencyContacts("call")}
                disabled={isNotifying}
                className="flex items-center"
              >
                <PhoneCall className="mr-2 h-4 w-4" />
                {isNotifying && notificationType === "call" ? "Calling..." : "Call All"}
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => handleNotifyEmergencyContacts("message")}
                disabled={isNotifying}
                className="flex items-center"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                {isNotifying && notificationType === "message" ? "Sending..." : "Message All"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}