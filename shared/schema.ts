import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema represents a parent
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Carpool schema for carpool offers
export const carpools = pgTable("carpools", {
  id: serial("id").primaryKey(),
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
  dropoffPreference: text("dropoff_preference").notNull(),
  pickupLocation: text("pickup_location"),
  additionalNotes: text("additional_notes"),
  partyAddress: text("party_address"),
  partyCity: text("party_city"),
  partyPostcode: text("party_postcode"),
  targetArrivalTime: text("target_arrival_time"),
  estimatedDepartureTime: text("estimated_departure_time"),
});

// CarpoolRequest schema for requests to join carpool
export const carpoolRequests = pgTable("carpool_requests", {
  id: serial("id").primaryKey(),
  carpoolId: integer("carpool_id").notNull(),
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
});

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertCarpoolSchema = createInsertSchema(carpools).omit({
  id: true,
});

export const insertCarpoolRequestSchema = createInsertSchema(carpoolRequests).omit({
  id: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertCarpool = z.infer<typeof insertCarpoolSchema>;
export type Carpool = typeof carpools.$inferSelect;

export type InsertCarpoolRequest = z.infer<typeof insertCarpoolRequestSchema>;
export type CarpoolRequest = typeof carpoolRequests.$inferSelect;
