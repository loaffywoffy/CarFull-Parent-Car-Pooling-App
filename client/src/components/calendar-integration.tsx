import { useState } from "react";
import { Calendar, Download, ExternalLink, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  generateGoogleCalendarURL,
  generateOutlookCalendarURL,
  downloadICSFile,
  formatEventForCalendar,
  type CalendarEvent as CalendarEventType
} from "@/lib/calendar-integration";
import { format } from "date-fns";

interface CalendarIntegrationProps {
  eventData: any;
  carpoolData?: any;
  buttonVariant?: "default" | "outline" | "ghost";
  size?: "sm" | "default" | "lg";
}

export default function CalendarIntegration({ 
  eventData, 
  carpoolData, 
  buttonVariant = "outline",
  size = "default" 
}: CalendarIntegrationProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const calendarEvent = formatEventForCalendar(eventData, carpoolData);
  
  const handleGoogleCalendar = () => {
    const url = generateGoogleCalendarURL(calendarEvent);
    window.open(url, '_blank');
  };
  
  const handleOutlookCalendar = () => {
    const url = generateOutlookCalendarURL(calendarEvent);
    window.open(url, '_blank');
  };
  
  const handleDownloadICS = () => {
    downloadICSFile(calendarEvent);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} size={size} className="gap-2">
          <Calendar className="h-4 w-4" />
          Add to Calendar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Add Event to Calendar
          </DialogTitle>
          <DialogDescription>
            Choose how you'd like to add this event to your calendar
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Event Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{calendarEvent.title}</CardTitle>
              <CardDescription className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4" />
                  {format(calendarEvent.startDate, "PPP 'at' p")}
                  {calendarEvent.startDate.getTime() !== calendarEvent.endDate.getTime() && 
                    ` - ${format(calendarEvent.endDate, "PPP 'at' p")}`
                  }
                </div>
                {calendarEvent.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4" />
                    {calendarEvent.location}
                  </div>
                )}
              </CardDescription>
            </CardHeader>
            {calendarEvent.description && (
              <CardContent className="pt-0">
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {calendarEvent.description}
                </div>
              </CardContent>
            )}
          </Card>

          {/* Calendar Options */}
          <div className="space-y-3">
            <h4 className="font-medium">Choose your calendar app:</h4>
            
            <div className="grid gap-2">
              <Button 
                onClick={handleGoogleCalendar}
                variant="outline" 
                className="justify-start gap-3 h-auto p-4"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-8 h-8 rounded bg-blue-500 flex items-center justify-center">
                    <ExternalLink className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">Google Calendar</div>
                    <div className="text-sm text-muted-foreground">Add to your Google Calendar</div>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </Button>

              <Button 
                onClick={handleOutlookCalendar}
                variant="outline" 
                className="justify-start gap-3 h-auto p-4"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center">
                    <ExternalLink className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">Outlook Calendar</div>
                    <div className="text-sm text-muted-foreground">Add to your Outlook Calendar</div>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </Button>

              <Button 
                onClick={handleDownloadICS}
                variant="outline" 
                className="justify-start gap-3 h-auto p-4"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-8 h-8 rounded bg-green-600 flex items-center justify-center">
                    <Download className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">Download Calendar File</div>
                    <div className="text-sm text-muted-foreground">
                      Download .ics file for any calendar app
                    </div>
                  </div>
                </div>
                <Download className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
            
            <div className="flex gap-2 mt-4">
              <Badge variant="secondary" className="text-xs">
                Works with Apple Calendar
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Works with other calendar apps
              </Badge>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}