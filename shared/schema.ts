import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema represents a parent
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Party Group schema for events created by an admin
export const partyGroups = pgTable("party_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  partyAddress: text("party_address").notNull(),
  partyCity: text("party_city").notNull(),
  partyPostcode: text("party_postcode").notNull(),
  partyDate: text("party_date").notNull(), // Date string
  partyEndDate: text("party_end_date"), // Optional end date for multi-day events
  targetArrivalTime: text("target_arrival_time").notNull(), // Start time
  endTime: text("end_time"), // Optional end time
  createdBy: text("created_by").notNull(), // Admin name or email
  accessCode: text("access_code").notNull(), // Code for parents to join
  additionalInformation: text("additional_information"),
});

// Carpool schema for carpool offers
export const carpools = pgTable("carpools", {
  id: serial("id").primaryKey(),
  partyGroupId: integer("party_group_id").notNull(), // Reference to party group
  parentName: text("parent_name").notNull(),
  childName: text("child_name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  postcode: text("postcode").notNull(),
  phoneNumber: text("phone_number").notNull(),
  canPickup: boolean("can_pickup").default(false),
  canDropoff: boolean("can_dropoff").default(false),
  canBoth: boolean("can_both").default(false),
  spacesAvailable: integer("spaces_available").notNull(),
  returnSpacesAvailable: integer("return_spaces_available"),
  // Outbound dropoff preferences (when taking TO the party)
  outboundDropoffPreference: text("outbound_dropoff_preference"),
  outboundMaxDistance: integer("outbound_max_distance"),
  outboundPickupLocation: text("outbound_pickup_location"),
  outboundPickupLocationCity: text("outbound_pickup_location_city"),
  outboundPickupLocationPostcode: text("outbound_pickup_location_postcode"),
  outboundDepartureTime: text("outbound_departure_time"), // Time the carpool is leaving
  
  // Return dropoff preferences (when picking up FROM the party)
  returnDropoffPreference: text("return_dropoff_preference"),
  returnMaxDistance: integer("return_max_distance"),
  returnPickupLocation: text("return_pickup_location"),
  returnPickupLocationCity: text("return_pickup_location_city"),
  returnPickupLocationPostcode: text("return_pickup_location_postcode"),
  returnCollectionTime: text("return_collection_time"), // Time the carpool is collecting
  
  // Legacy fields (for backward compatibility)
  dropoffPreference: text("dropoff_preference"),
  maxDistance: integer("max_distance"),
  pickupLocation: text("pickup_location"),
  pickupLocationCity: text("pickup_location_city"),
  pickupLocationPostcode: text("pickup_location_postcode"),
  additionalNotes: text("additional_notes"),
  estimatedDepartureTime: text("estimated_departure_time"),
  // Emergency contact information
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  emergencyContactRelationship: text("emergency_contact_relationship"),
});

// CarpoolRequest schema for requests to join carpool
export const carpoolRequests = pgTable("carpool_requests", {
  id: serial("id").primaryKey(),
  carpoolId: integer("carpool_id").notNull(), // Main carpool ID (used when ride preference is "both")
  pickupCarpoolId: integer("pickup_carpool_id"), // Optional separate carpool ID for pickup (to party)
  dropoffCarpoolId: integer("dropoff_carpool_id"), // Optional separate carpool ID for dropoff (from party) 
  parentName: text("parent_name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  postcode: text("postcode").notNull(),
  phoneNumber: text("phone_number").notNull(),
  childName: text("child_name").notNull(),
  childPhone: text("child_phone"),
  needsPickup: boolean("needs_pickup").default(false),
  needsDropoff: boolean("needs_dropoff").default(false),
  needsBoth: boolean("needs_both").default(false),
  specialRequirements: text("special_requirements"),
  // Emergency contact information
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  emergencyContactRelationship: text("emergency_contact_relationship"),
});

// Calendar Events schema for carpool scheduling
export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  carpoolId: integer("carpool_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  startDate: text("start_date").notNull(), // ISO date string
  endDate: text("end_date").notNull(),     // ISO date string
  location: text("location"),
  isRecurring: boolean("is_recurring").default(false),
  recurrencePattern: text("recurrence_pattern"), // e.g., "weekly", "monthly"
  reminderTime: integer("reminder_time"), // minutes before event
});

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertPartyGroupSchema = createInsertSchema(partyGroups).omit({
  id: true,
});

export const insertCarpoolSchema = createInsertSchema(carpools).omit({
  id: true,
}).transform((data) => {
  const transformedData = { ...data };
  
  // Ensure spacesAvailable is a number
  if (typeof data.spacesAvailable === 'string') {
    transformedData.spacesAvailable = parseInt(data.spacesAvailable, 10);
  }
  
  // Ensure returnSpacesAvailable is a number if present
  if (typeof data.returnSpacesAvailable === 'string') {
    transformedData.returnSpacesAvailable = parseInt(data.returnSpacesAvailable, 10);
  } else if (data.returnSpacesAvailable === undefined && (data.canDropoff || data.canBoth)) {
    // If not specified but offering return journey, default to same as outbound spaces
    transformedData.returnSpacesAvailable = typeof transformedData.spacesAvailable === 'number' 
      ? transformedData.spacesAvailable 
      : parseInt(String(data.spacesAvailable), 10);
  }
  
  // Ensure outboundMaxDistance is a number if present
  if (typeof data.outboundMaxDistance === 'string') {
    transformedData.outboundMaxDistance = parseInt(data.outboundMaxDistance, 10);
  }
  
  // Ensure returnMaxDistance is a number if present
  if (typeof data.returnMaxDistance === 'string') {
    transformedData.returnMaxDistance = parseInt(data.returnMaxDistance, 10);
  }
  
  // Ensure maxDistance is a number if present (legacy field)
  if (typeof data.maxDistance === 'string') {
    transformedData.maxDistance = parseInt(data.maxDistance, 10);
  }
  
  return transformedData;
});

export const insertCarpoolRequestSchema = createInsertSchema(carpoolRequests).omit({
  id: true,
});

export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({
  id: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertPartyGroup = z.infer<typeof insertPartyGroupSchema>;
export type PartyGroup = typeof partyGroups.$inferSelect;

export type InsertCarpool = z.infer<typeof insertCarpoolSchema>;
export type Carpool = typeof carpools.$inferSelect;

export type InsertCarpoolRequest = z.infer<typeof insertCarpoolRequestSchema>;
export type CarpoolRequest = typeof carpoolRequests.$inferSelect;

export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type CalendarEvent = typeof calendarEvents.$inferSelect;
