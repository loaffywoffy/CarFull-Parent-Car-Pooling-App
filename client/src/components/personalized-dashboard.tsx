
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarIcon, MapPinIcon, UserIcon } from "lucide-react";
import { type PartyGroup } from "@shared/schema";

interface PersonalizedDashboardProps {
  userPhoneNumber: string;
  onSelectEvent: (event: PartyGroup) => void;
  allEvents: PartyGroup[];
}

export function PersonalizedDashboard({ 
  userPhoneNumber, 
  onSelectEvent, 
  allEvents 
}: PersonalizedDashboardProps) {
  const [userEvents, setUserEvents] = useState<PartyGroup[]>([]);

  useEffect(() => {
    // Get user's event interactions from localStorage
    const interactions = JSON.parse(localStorage.getItem('eventInteractions') || '{}');
    const userEventIds = interactions[userPhoneNumber] || [];
    
    // Filter events the user has interacted with
    const filteredEvents = allEvents.filter(event => 
      userEventIds.includes(event.id)
    );
    
    setUserEvents(filteredEvents);
  }, [userPhoneNumber, allEvents]);

  if (userEvents.length === 0) {
    return (
      <Card className="w-full mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Your Events</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            You haven't interacted with any events yet. When you visit event links, they'll appear here!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full mb-6">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <UserIcon className="h-5 w-5" />
          Your Events
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Events you've visited or interacted with
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {userEvents.map((event) => (
            <div 
              key={event.id}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
              onClick={() => onSelectEvent(event)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-gray-900">{event.name}</h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="h-4 w-4" />
                      {new Date(event.eventDate).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPinIcon className="h-4 w-4" />
                      {event.eventCity}
                    </div>
                  </div>
                </div>
                <Badge variant="outline">Your Event</Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
