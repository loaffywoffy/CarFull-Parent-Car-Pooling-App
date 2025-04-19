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
