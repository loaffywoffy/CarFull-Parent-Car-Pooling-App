// Event type color schemes for adaptive UI
export const eventColorSchemes = {
  birthday: {
    primary: "bg-pink-500",
    secondary: "bg-pink-100",
    text: "text-pink-800",
    border: "border-pink-200",
    accent: "text-pink-600",
    badge: "bg-pink-100 text-pink-800",
    gradient: "from-pink-400 to-pink-600",
    icon: "text-pink-500"
  },
  wedding: {
    primary: "bg-rose-500",
    secondary: "bg-rose-100",
    text: "text-rose-800",
    border: "border-rose-200",
    accent: "text-rose-600",
    badge: "bg-rose-100 text-rose-800",
    gradient: "from-rose-400 to-rose-600",
    icon: "text-rose-500"
  },
  graduation: {
    primary: "bg-blue-500",
    secondary: "bg-blue-100",
    text: "text-blue-800",
    border: "border-blue-200",
    accent: "text-blue-600",
    badge: "bg-blue-100 text-blue-800",
    gradient: "from-blue-400 to-blue-600",
    icon: "text-blue-500"
  },
  barmitzvah: {
    primary: "bg-purple-500",
    secondary: "bg-purple-100",
    text: "text-purple-800",
    border: "border-purple-200",
    accent: "text-purple-600",
    badge: "bg-purple-100 text-purple-800",
    gradient: "from-purple-400 to-purple-600",
    icon: "text-purple-500"
  },
  batmitzvah: {
    primary: "bg-purple-500",
    secondary: "bg-purple-100",
    text: "text-purple-800",
    border: "border-purple-200",
    accent: "text-purple-600",
    badge: "bg-purple-100 text-purple-800",
    gradient: "from-purple-400 to-purple-600",
    icon: "text-purple-500"
  },
  sports: {
    primary: "bg-green-500",
    secondary: "bg-green-100",
    text: "text-green-800",
    border: "border-green-200",
    accent: "text-green-600",
    badge: "bg-green-100 text-green-800",
    gradient: "from-green-400 to-green-600",
    icon: "text-green-500"
  },
  school: {
    primary: "bg-yellow-500",
    secondary: "bg-yellow-100",
    text: "text-yellow-800",
    border: "border-yellow-200",
    accent: "text-yellow-600",
    badge: "bg-yellow-100 text-yellow-800",
    gradient: "from-yellow-400 to-yellow-600",
    icon: "text-yellow-500"
  },
  other: {
    primary: "bg-gray-500",
    secondary: "bg-gray-100",
    text: "text-gray-800",
    border: "border-gray-200",
    accent: "text-gray-600",
    badge: "bg-gray-100 text-gray-800",
    gradient: "from-gray-400 to-gray-600",
    icon: "text-gray-500"
  }
} as const;

export type EventType = keyof typeof eventColorSchemes;

// Get color scheme for an event type
export function getEventColorScheme(eventType: string = "birthday") {
  const normalizedType = eventType.toLowerCase() as EventType;
  return eventColorSchemes[normalizedType] || eventColorSchemes.other;
}

// Get event type display name
export function getEventTypeDisplayName(eventType: string = "birthday") {
  const displayNames: Record<string, string> = {
    birthday: "Birthday Party",
    wedding: "Wedding",
    graduation: "Graduation",
    barmitzvah: "Bar Mitzvah",
    batmitzvah: "Bat Mitzvah",
    sports: "Sports Event",
    school: "School Event",
    other: "Other Event"
  };
  
  return displayNames[eventType.toLowerCase()] || "Event";
}

// Get icon for event type
export function getEventTypeIcon(eventType: string = "birthday") {
  const icons: Record<string, string> = {
    birthday: "🎂",
    wedding: "💍",
    graduation: "🎓",
    barmitzvah: "📜",
    batmitzvah: "📜",
    sports: "⚽",
    school: "🏫",
    other: "🎉"
  };
  
  return icons[eventType.toLowerCase()] || "🎉";
}

// Available event types for forms
export const eventTypeOptions = [
  { value: "birthday", label: "Birthday Party", icon: "🎂" },
  { value: "wedding", label: "Wedding", icon: "💍" },
  { value: "graduation", label: "Graduation", icon: "🎓" },
  { value: "barmitzvah", label: "Bar Mitzvah", icon: "📜" },
  { value: "batmitzvah", label: "Bat Mitzvah", icon: "📜" },
  { value: "sports", label: "Sports Event", icon: "⚽" },
  { value: "school", label: "School Event", icon: "🏫" },
  { value: "other", label: "Other Event", icon: "🎉" }
] as const;