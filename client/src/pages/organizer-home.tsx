import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Share2, Users, MapPin } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { InsertPartyGroup } from "@shared/schema";

export default function OrganizerHomePage() {
  const [showForm, setShowForm] = useState(false);
  const [createdEvent, setCreatedEvent] = useState<any>(null);
  const { toast } = useToast();

  const createEventMutation = useMutation({
    mutationFn: async (eventData: InsertPartyGroup) => {
      const res = await apiRequest("POST", "/api/party-groups", eventData);
      return await res.json();
    },
    onSuccess: (event) => {
      setCreatedEvent(event);
      setShowForm(false);
      toast({
        title: "Event created!",
        description: "Your shareable event URL is ready.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to create event",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const eventData: InsertPartyGroup = {
      name: formData.get("name") as string,
      eventAddress: formData.get("eventAddress") as string,
      eventCity: formData.get("eventCity") as string,
      eventPostcode: formData.get("eventPostcode") as string,
      eventDate: formData.get("eventDate") as string,
      targetArrivalTime: formData.get("targetArrivalTime") as string,
      endTime: formData.get("endTime") as string || undefined,
      createdBy: formData.get("createdBy") as string,
      phoneNumber: formData.get("phoneNumber") as string || undefined,
      additionalInformation: formData.get("additionalInformation") as string || undefined,
    };

    createEventMutation.mutate(eventData);
  };

  const copyShareableUrl = () => {
    if (createdEvent) {
      const url = `${window.location.origin}/event/${createdEvent.shareableUrl}`;
      navigator.clipboard.writeText(url);
      toast({
        title: "URL copied!",
        description: "Share this link with parents so they can join carpools.",
      });
    }
  };

  if (createdEvent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-2xl mx-auto pt-8">
          <Card className="border-2 border-green-200 bg-green-50">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Share2 className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-green-800">Event Created Successfully!</CardTitle>
              <CardDescription className="text-green-600">
                Your event "{createdEvent.name}" is ready to share
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-white p-4 rounded-lg border">
                <Label className="text-sm font-medium text-gray-700">Shareable Event URL</Label>
                <div className="flex items-center space-x-2 mt-2">
                  <Input 
                    value={`${window.location.origin}/event/${createdEvent.shareableUrl}`}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button onClick={copyShareableUrl} size="sm">
                    <Share2 className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="font-medium text-gray-700">Event Date</Label>
                  <p className="text-gray-600">{createdEvent.eventDate}</p>
                </div>
                <div>
                  <Label className="font-medium text-gray-700">Start Time</Label>
                  <p className="text-gray-600">{createdEvent.targetArrivalTime}</p>
                </div>
                <div className="md:col-span-2">
                  <Label className="font-medium text-gray-700">Location</Label>
                  <p className="text-gray-600">{createdEvent.eventAddress}, {createdEvent.eventCity} {createdEvent.eventPostcode}</p>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <Button onClick={() => setCreatedEvent(null)} variant="outline" className="flex-1">
                  Create Another Event
                </Button>
                <Button 
                  onClick={() => window.open(`/event/${createdEvent.shareableUrl}`, '_blank')}
                  className="flex-1"
                >
                  View Event Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Create Your Event Carpool
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Set up carpools for your event and share a simple link with parents
          </p>
          
          {!showForm && (
            <Button onClick={() => setShowForm(true)} size="lg" className="bg-blue-600 hover:bg-blue-700">
              <Calendar className="h-5 w-5 mr-2" />
              Create New Event
            </Button>
          )}
        </div>

        {/* How it works */}
        {!showForm && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-lg">1. Create Event</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Set up your event details including date, time, and location</p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2">
                  <Share2 className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle className="text-lg">2. Share Link</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Get a unique URL to share with parents via email, text, or social media</p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-2">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle className="text-lg">3. Parents Join</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Parents can offer rides or request spots without creating accounts</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Event Creation Form */}
        {showForm && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl">Create New Event</CardTitle>
              <CardDescription>
                Fill in your event details to create a shareable carpool page
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Event Name *</Label>
                  <Input 
                    id="name" 
                    name="name" 
                    placeholder="e.g., Sarah's Birthday Party"
                    required 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="eventDate">Event Date *</Label>
                    <Input 
                      id="eventDate" 
                      name="eventDate" 
                      type="date" 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="targetArrivalTime">Start Time *</Label>
                    <Input 
                      id="targetArrivalTime" 
                      name="targetArrivalTime" 
                      type="time" 
                      required 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time (Optional)</Label>
                  <Input 
                    id="endTime" 
                    name="endTime" 
                    type="time" 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="eventAddress">Event Address *</Label>
                  <Input 
                    id="eventAddress" 
                    name="eventAddress" 
                    placeholder="123 Main Street"
                    required 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="eventCity">City *</Label>
                    <Input 
                      id="eventCity" 
                      name="eventCity" 
                      placeholder="London"
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="eventPostcode">Postcode *</Label>
                    <Input 
                      id="eventPostcode" 
                      name="eventPostcode" 
                      placeholder="SW1A 1AA"
                      required 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="createdBy">Your Name/Email *</Label>
                  <Input 
                    id="createdBy" 
                    name="createdBy" 
                    placeholder="Jane Smith or jane@example.com"
                    required 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Your Phone Number (Optional)</Label>
                  <Input 
                    id="phoneNumber" 
                    name="phoneNumber" 
                    placeholder="+44 7123 456789"
                    type="tel"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="additionalInformation">Additional Information (Optional)</Label>
                  <Textarea 
                    id="additionalInformation" 
                    name="additionalInformation" 
                    placeholder="Any special instructions or details for parents..."
                    rows={3}
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <Button 
                    type="button" 
                    onClick={() => setShowForm(false)} 
                    variant="outline" 
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createEventMutation.isPending}
                    className="flex-1"
                  >
                    {createEventMutation.isPending ? "Creating..." : "Create Event"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}