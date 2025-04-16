import { 
  users, 
  type User, 
  type InsertUser,
  partyGroups,
  type PartyGroup,
  type InsertPartyGroup,
  carpools,
  type Carpool,
  type InsertCarpool,
  carpoolRequests,
  type CarpoolRequest,
  type InsertCarpoolRequest,
  calendarEvents,
  type CalendarEvent,
  type InsertCalendarEvent
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Party group operations
  createPartyGroup(partyGroup: InsertPartyGroup): Promise<PartyGroup>;
  getPartyGroups(): Promise<PartyGroup[]>;
  getPartyGroupById(id: number): Promise<PartyGroup | undefined>;
  getPartyGroupByAccessCode(accessCode: string): Promise<PartyGroup | undefined>;
  updatePartyGroup(id: number, partyGroup: Partial<InsertPartyGroup>): Promise<PartyGroup | undefined>;
  deletePartyGroup(id: number): Promise<boolean>;
  
  // Carpool operations
  createCarpool(carpool: InsertCarpool): Promise<Carpool>;
  getCarpools(): Promise<Carpool[]>;
  getCarpoolsByPartyGroupId(partyGroupId: number): Promise<Carpool[]>;
  getCarpoolById(id: number): Promise<Carpool | undefined>;
  
  // Carpool request operations
  createCarpoolRequest(request: InsertCarpoolRequest): Promise<CarpoolRequest>;
  getCarpoolRequestsByCarpoolId(carpoolId: number): Promise<CarpoolRequest[]>;
  
  // Calendar event operations
  createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent>;
  getCalendarEventById(id: number): Promise<CalendarEvent | undefined>;
  getCalendarEventsByCarpoolId(carpoolId: number): Promise<CalendarEvent[]>;
  updateCalendarEvent(id: number, event: Partial<InsertCalendarEvent>): Promise<CalendarEvent | undefined>;
  deleteCalendarEvent(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }
  
  // Party Group methods
  async createPartyGroup(insertPartyGroup: InsertPartyGroup): Promise<PartyGroup> {
    // Ensure null values for nullable fields
    const partyGroupData = {
      ...insertPartyGroup,
      description: insertPartyGroup.description ?? null,
      partyEndDate: insertPartyGroup.partyEndDate ?? null,
      endTime: insertPartyGroup.endTime ?? null,
      additionalInformation: insertPartyGroup.additionalInformation ?? null
    };

    const [partyGroup] = await db
      .insert(partyGroups)
      .values(partyGroupData)
      .returning();
    
    return partyGroup;
  }
  
  async getPartyGroups(): Promise<PartyGroup[]> {
    return db.select().from(partyGroups);
  }
  
  async getPartyGroupById(id: number): Promise<PartyGroup | undefined> {
    const [partyGroup] = await db.select().from(partyGroups).where(eq(partyGroups.id, id));
    return partyGroup || undefined;
  }
  
  async getPartyGroupByAccessCode(accessCode: string): Promise<PartyGroup | undefined> {
    const [partyGroup] = await db.select().from(partyGroups).where(eq(partyGroups.accessCode, accessCode));
    return partyGroup || undefined;
  }
  
  async updatePartyGroup(id: number, partyGroupUpdate: Partial<InsertPartyGroup>): Promise<PartyGroup | undefined> {
    // Process updates with proper null handling
    const processedUpdate: Partial<PartyGroup> = { id };
    
    if ('name' in partyGroupUpdate) processedUpdate.name = partyGroupUpdate.name;
    if ('parentName' in partyGroupUpdate) processedUpdate.parentName = partyGroupUpdate.parentName;
    if ('location' in partyGroupUpdate) processedUpdate.location = partyGroupUpdate.location;
    if ('partyDate' in partyGroupUpdate) processedUpdate.partyDate = partyGroupUpdate.partyDate;
    if ('startTime' in partyGroupUpdate) processedUpdate.startTime = partyGroupUpdate.startTime;
    if ('accessCode' in partyGroupUpdate) processedUpdate.accessCode = partyGroupUpdate.accessCode ?? null;
    
    // Handle nullable fields
    if ('description' in partyGroupUpdate) processedUpdate.description = partyGroupUpdate.description ?? null;
    if ('partyEndDate' in partyGroupUpdate) processedUpdate.partyEndDate = partyGroupUpdate.partyEndDate ?? null;
    if ('endTime' in partyGroupUpdate) processedUpdate.endTime = partyGroupUpdate.endTime ?? null;
    if ('additionalInformation' in partyGroupUpdate) processedUpdate.additionalInformation = partyGroupUpdate.additionalInformation ?? null;
    
    const [updatedPartyGroup] = await db
      .update(partyGroups)
      .set(processedUpdate)
      .where(eq(partyGroups.id, id))
      .returning();
    
    return updatedPartyGroup || undefined;
  }
  
  async deletePartyGroup(id: number): Promise<boolean> {
    // First, delete all related carpools
    const relatedCarpools = await this.getCarpoolsByPartyGroupId(id);
    
    for (const carpool of relatedCarpools) {
      // Delete all carpool requests for this carpool
      await db
        .delete(carpoolRequests)
        .where(eq(carpoolRequests.carpoolId, carpool.id));
      
      // Delete all calendar events for this carpool
      await db
        .delete(calendarEvents)
        .where(eq(calendarEvents.carpoolId, carpool.id));
    }
    
    // Delete all carpools for this party group
    await db
      .delete(carpools)
      .where(eq(carpools.partyGroupId, id));
    
    // Finally, delete the party group itself
    const [deletedPartyGroup] = await db
      .delete(partyGroups)
      .where(eq(partyGroups.id, id))
      .returning();
    
    return !!deletedPartyGroup;
  }
  
  // Carpool methods
  async createCarpool(insertCarpool: InsertCarpool): Promise<Carpool> {
    console.log("[DB] Creating carpool with data:", JSON.stringify(insertCarpool, null, 2));
    
    // Ensure all nullable fields have proper null values instead of undefined
    const carpoolData = {
      ...insertCarpool,
      canPickup: insertCarpool.canPickup ?? null,
      canDropoff: insertCarpool.canDropoff ?? null,
      canBoth: insertCarpool.canBoth ?? null,
      returnSpacesAvailable: insertCarpool.returnSpacesAvailable ?? null,
      maxDistance: insertCarpool.maxDistance ?? null,
      pickupLocation: insertCarpool.pickupLocation ?? null,
      pickupLocationCity: insertCarpool.pickupLocationCity ?? null,
      pickupLocationPostcode: insertCarpool.pickupLocationPostcode ?? null,
      additionalNotes: insertCarpool.additionalNotes ?? null,
      estimatedDepartureTime: insertCarpool.estimatedDepartureTime ?? null,
      emergencyContactName: insertCarpool.emergencyContactName ?? null,
      emergencyContactPhone: insertCarpool.emergencyContactPhone ?? null,
      emergencyContactRelationship: insertCarpool.emergencyContactRelationship ?? null,
      // Additional fields
      outboundDropoffPreference: insertCarpool.outboundDropoffPreference ?? null,
      returnPickupPreference: insertCarpool.returnPickupPreference ?? null,
      pickupTime: insertCarpool.pickupTime ?? null,
      dropoffPreference: insertCarpool.dropoffPreference ?? null,
      // Other fields
      outboundMaxDistance: insertCarpool.outboundMaxDistance ?? null,
      outboundPickupLocation: insertCarpool.outboundPickupLocation ?? null,
      outboundPickupLocationCity: insertCarpool.outboundPickupLocationCity ?? null,
      outboundPickupLocationPostcode: insertCarpool.outboundPickupLocationPostcode ?? null,
      outboundDepartureTime: insertCarpool.outboundDepartureTime ?? null,
      returnDropoffPreference: insertCarpool.returnDropoffPreference ?? null,
      returnMaxDistance: insertCarpool.returnMaxDistance ?? null,
      returnPickupLocation: insertCarpool.returnPickupLocation ?? null,
      returnPickupLocationCity: insertCarpool.returnPickupLocationCity ?? null,
      returnPickupLocationPostcode: insertCarpool.returnPickupLocationPostcode ?? null,
      returnCollectionTime: insertCarpool.returnCollectionTime ?? null
    };
    
    const [carpool] = await db
      .insert(carpools)
      .values(carpoolData)
      .returning();
    
    console.log("[DB] Created carpool:", JSON.stringify(carpool, null, 2));
    return carpool;
  }
  
  async getCarpools(): Promise<Carpool[]> {
    return db.select().from(carpools);
  }
  
  async getCarpoolsByPartyGroupId(partyGroupId: number): Promise<Carpool[]> {
    return db.select().from(carpools).where(eq(carpools.partyGroupId, partyGroupId));
  }
  
  async getCarpoolById(id: number): Promise<Carpool | undefined> {
    const [carpool] = await db.select().from(carpools).where(eq(carpools.id, id));
    return carpool || undefined;
  }
  
  // Carpool request methods
  async createCarpoolRequest(insertRequest: InsertCarpoolRequest): Promise<CarpoolRequest> {
    // Ensure all nullable fields have proper null values instead of undefined
    const requestData = {
      ...insertRequest,
      childPhone: insertRequest.childPhone ?? null,
      needsPickup: insertRequest.needsPickup ?? null,
      needsDropoff: insertRequest.needsDropoff ?? null,
      needsBoth: insertRequest.needsBoth ?? null,
      specialRequirements: insertRequest.specialRequirements ?? null,
      emergencyContactName: insertRequest.emergencyContactName ?? null,
      emergencyContactPhone: insertRequest.emergencyContactPhone ?? null,
      emergencyContactRelationship: insertRequest.emergencyContactRelationship ?? null,
      pickupCarpoolId: insertRequest.pickupCarpoolId ?? null,
      dropoffCarpoolId: insertRequest.dropoffCarpoolId ?? null
    };

    const [request] = await db
      .insert(carpoolRequests)
      .values(requestData)
      .returning();
    
    return request;
  }
  
  async getCarpoolRequestsByCarpoolId(carpoolId: number): Promise<CarpoolRequest[]> {
    return db.select().from(carpoolRequests).where(eq(carpoolRequests.carpoolId, carpoolId));
  }
  
  // Calendar event methods
  async createCalendarEvent(insertEvent: InsertCalendarEvent): Promise<CalendarEvent> {
    // Ensure all nullable fields have proper null values instead of undefined
    const eventData = {
      ...insertEvent,
      description: insertEvent.description ?? null,
      location: insertEvent.location ?? null,
      isRecurring: insertEvent.isRecurring ?? null,
      recurrencePattern: insertEvent.recurrencePattern ?? null,
      reminderTime: insertEvent.reminderTime ?? null
    };

    const [event] = await db
      .insert(calendarEvents)
      .values(eventData)
      .returning();
    
    return event;
  }
  
  async getCalendarEventById(id: number): Promise<CalendarEvent | undefined> {
    const [event] = await db.select().from(calendarEvents).where(eq(calendarEvents.id, id));
    return event || undefined;
  }
  
  async getCalendarEventsByCarpoolId(carpoolId: number): Promise<CalendarEvent[]> {
    return db.select().from(calendarEvents).where(eq(calendarEvents.carpoolId, carpoolId));
  }
  
  async updateCalendarEvent(id: number, eventUpdate: Partial<InsertCalendarEvent>): Promise<CalendarEvent | undefined> {
    // Process updates with proper null handling
    const processedUpdate: Partial<CalendarEvent> = { id };
    
    if ('description' in eventUpdate) processedUpdate.description = eventUpdate.description ?? null;
    if ('location' in eventUpdate) processedUpdate.location = eventUpdate.location ?? null;
    if ('isRecurring' in eventUpdate) processedUpdate.isRecurring = eventUpdate.isRecurring ?? null;
    if ('recurrencePattern' in eventUpdate) processedUpdate.recurrencePattern = eventUpdate.recurrencePattern ?? null;
    if ('reminderTime' in eventUpdate) processedUpdate.reminderTime = eventUpdate.reminderTime ?? null;
    
    // Copy non-nullable fields directly
    if ('title' in eventUpdate) processedUpdate.title = eventUpdate.title;
    if ('startDate' in eventUpdate) processedUpdate.startDate = eventUpdate.startDate;
    if ('endDate' in eventUpdate) processedUpdate.endDate = eventUpdate.endDate;
    if ('carpoolId' in eventUpdate) processedUpdate.carpoolId = eventUpdate.carpoolId;
    
    const [updatedEvent] = await db
      .update(calendarEvents)
      .set(processedUpdate)
      .where(eq(calendarEvents.id, id))
      .returning();
    
    return updatedEvent || undefined;
  }
  
  async deleteCalendarEvent(id: number): Promise<boolean> {
    const [deletedEvent] = await db
      .delete(calendarEvents)
      .where(eq(calendarEvents.id, id))
      .returning();
    
    return !!deletedEvent;
  }
}

export const storage = new DatabaseStorage();
