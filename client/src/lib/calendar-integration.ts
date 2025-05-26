// Calendar integration utilities for generating calendar files and links

export interface CalendarEvent {
  title: string;
  description?: string;
  location?: string;
  startDate: Date;
  endDate: Date;
  allDay?: boolean;
}

// Generate ICS (iCal) file content
export function generateICSContent(event: CalendarEvent): string {
  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const escapeText = (text: string) => {
    return text.replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n');
  };

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KidPool//Event//EN',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@kidpool.app`,
    `DTSTART:${formatDate(event.startDate)}`,
    `DTEND:${formatDate(event.endDate)}`,
    `SUMMARY:${escapeText(event.title)}`,
    event.description ? `DESCRIPTION:${escapeText(event.description)}` : '',
    event.location ? `LOCATION:${escapeText(event.location)}` : '',
    `DTSTAMP:${formatDate(new Date())}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(line => line !== '').join('\r\n');

  return icsContent;
}

// Generate Google Calendar URL
export function generateGoogleCalendarURL(event: CalendarEvent): string {
  const formatGoogleDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatGoogleDate(event.startDate)}/${formatGoogleDate(event.endDate)}`,
    details: event.description || '',
    location: event.location || ''
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Generate Outlook Calendar URL
export function generateOutlookCalendarURL(event: CalendarEvent): string {
  const params = new URLSearchParams({
    subject: event.title,
    startdt: event.startDate.toISOString(),
    enddt: event.endDate.toISOString(),
    body: event.description || '',
    location: event.location || ''
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

// Download ICS file
export function downloadICSFile(event: CalendarEvent, filename?: string) {
  const icsContent = generateICSContent(event);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

// Format event for calendar display
export function formatEventForCalendar(eventData: any, carpoolData?: any) {
  const eventTitle = carpoolData 
    ? `Carpool: ${eventData.name}` 
    : eventData.name;
    
  const description = [
    eventData.description,
    carpoolData ? `Carpool with ${carpoolData.driverName}` : '',
    carpoolData ? `Pickup: ${carpoolData.pickupLocation}` : '',
    eventData.additionalInformation
  ].filter(Boolean).join('\n');

  const location = eventData.eventAddress 
    ? `${eventData.eventAddress}, ${eventData.eventCity}, ${eventData.eventPostcode}`
    : '';

  return {
    title: eventTitle,
    description,
    location,
    startDate: new Date(`${eventData.eventDate}T${eventData.targetArrivalTime || '00:00'}`),
    endDate: new Date(`${eventData.eventEndDate || eventData.eventDate}T${eventData.endTime || '23:59'}`),
    allDay: !eventData.targetArrivalTime
  };
}