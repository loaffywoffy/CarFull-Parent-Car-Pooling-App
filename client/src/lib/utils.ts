import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a date to a friendly day format with day name
 * @param dateString - Date string to format
 * @returns formatted date string (e.g., "Monday, Jan 1, 2023")
 */
export function formatDateToFriendlyDay(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Compares two time strings in HH:MM format
 * @param time1 - First time string (e.g., "14:30")
 * @param time2 - Second time string (e.g., "15:00")
 * @returns -1 if time1 < time2, 0 if time1 === time2, 1 if time1 > time2
 */
export function compareTimeStrings(time1: string, time2: string): number {
  // Parse the time strings to get hours and minutes
  const [hours1, minutes1] = time1.split(':').map(Number);
  const [hours2, minutes2] = time2.split(':').map(Number);
  
  // Convert to minutes since midnight for easier comparison
  const totalMinutes1 = hours1 * 60 + minutes1;
  const totalMinutes2 = hours2 * 60 + minutes2;
  
  // Compare and return result
  if (totalMinutes1 < totalMinutes2) return -1;
  if (totalMinutes1 > totalMinutes2) return 1;
  return 0;
}

/**
 * Get initials from a name (e.g., "John Doe" => "JD")
 * @param name - The full name
 * @returns The initials
 */
export function getInitialsFromName(name: string): string {
  if (!name) return "?";
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase();
}
