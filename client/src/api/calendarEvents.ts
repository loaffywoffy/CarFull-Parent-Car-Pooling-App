import { apiRequest } from "@/lib/queryClient";
import type { CalendarEvent, InsertCalendarEvent } from "@shared/schema";

export async function getCalendarEventsByCarpoolId(carpoolId: number) {
  return apiRequest<CalendarEvent[]>(`/api/carpools/${carpoolId}/calendar-events`, "GET");
}

export async function getCalendarEventById(id: number) {
  return apiRequest<CalendarEvent>(`/api/calendar-events/${id}`, "GET");
}

export async function createCalendarEvent(eventData: InsertCalendarEvent) {
  return apiRequest<CalendarEvent>("/api/calendar-events", "POST", eventData);
}

export async function updateCalendarEvent(id: number, eventData: Partial<InsertCalendarEvent>) {
  return apiRequest<CalendarEvent>(`/api/calendar-events/${id}`, "PATCH", eventData);
}

export async function deleteCalendarEvent(id: number) {
  return apiRequest<void>(`/api/calendar-events/${id}`, "DELETE");
}