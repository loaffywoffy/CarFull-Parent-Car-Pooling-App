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
  type InsertCalendarEvent,
  eventInvitations,
  type EventInvitation,
  type InsertEventInvitation
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByPhoneNumber(phoneNumber: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Party group operations - now user-based
  createPartyGroup(partyGroup: InsertPartyGroup): Promise<PartyGroup>;
  getPartyGroupsForUser(userId: number): Promise<PartyGroup[]>; // Only events user owns or is invited to
  getPartyGroupById(id: number, userId: number): Promise<PartyGroup | undefined>; // Check user access
  getPartyGroupByAccessCode(accessCode: string): Promise<PartyGroup | undefined>;
  updatePartyGroup(id: number, partyGroup: Partial<InsertPartyGroup>, userId: number): Promise<PartyGroup | undefined>;
  deletePartyGroup(id: number, userId: number): Promise<boolean>; // Only owner can delete
  
  // Event invitation operations
  createEventInvitation(invitation: InsertEventInvitation): Promise<EventInvitation>;
  getEventInvitationsByUserId(userId: number): Promise<EventInvitation[]>;
  getEventInvitationsByPartyGroupId(partyGroupId: number): Promise<EventInvitation[]>;
  updateEventInvitationStatus(id: number, status: string): Promise<EventInvitation | undefined>;
  deleteEventInvitation(id: number): Promise<boolean>;
  
  // Carpool operations - user-based access control
  createCarpool(carpool: InsertCarpool): Promise<Carpool>;
  getCarpoolsByPartyGroupId(partyGroupId: number, userId: number): Promise<Carpool[]>; // Check user access to party group
  getCarpoolById(id: number, userId: number): Promise<Carpool | undefined>;
  updateCarpool(id: number, carpool: Partial<InsertCarpool>): Promise<Carpool | undefined>;
  deleteCarpool(id: number): Promise<boolean>;
  
  // Carpool request operations
  createCarpoolRequest(request: InsertCarpoolRequest): Promise<CarpoolRequest>;
  getCarpoolRequestsByCarpoolId(carpoolId: number): Promise<CarpoolRequest[]>;
  deleteCarpoolRequest(id: number): Promise<boolean>;
  
  // Approval operations
  getCarpoolRequestByToken(token: string): Promise<CarpoolRequest | undefined>;
  approveCarpoolRequest(token: string): Promise<CarpoolRequest | undefined>;
  rejectCarpoolRequest(token: string, reason?: string): Promise<CarpoolRequest | undefined>;
  
  // Calendar event operations
  createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent>;
  getCalendarEventById(id: number): Promise<CalendarEvent | undefined>;
  getCalendarEventsByCarpoolId(carpoolId: number): Promise<CalendarEvent[]>;
  updateCalendarEvent(id: number, event: Partial<InsertCalendarEvent>): Promise<CalendarEvent | undefined>;
  deleteCalendarEvent(id: number): Promise<boolean>;
  
  // Verification operations
  storeVerificationCode(phoneNumber: string, code: string, action: string): Promise<void>;
  verifyCode(phoneNumber: string, code: string, action?: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  // getUserByUsername method removed as username field no longer exists
  
  async getUserByPhoneNumber(phoneNumber: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phoneNumber, phoneNumber));
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
      eventEndDate: insertPartyGroup.eventEndDate ?? null,
      endTime: insertPartyGroup.endTime ?? null,
      additionalInformation: insertPartyGroup.additionalInformation ?? null
    };

    const [partyGroup] = await db
      .insert(partyGroups)
      .values(partyGroupData)
      .returning();
    
    return partyGroup;
  }
  
  // New method: only return party groups the user owns or is invited to
  async getPartyGroupsForUser(userId: number): Promise<PartyGroup[]> {
    // Get party groups the user created
    const ownedGroups = await db.select().from(partyGroups).where(eq(partyGroups.createdBy, userId));
    
    // Get party groups the user is invited to (accepted invitations only)
    const invitedGroups = await db
      .select({ partyGroup: partyGroups })
      .from(eventInvitations)
      .innerJoin(partyGroups, eq(eventInvitations.partyGroupId, partyGroups.id))
      .where(and(
        eq(eventInvitations.userId, userId),
        eq(eventInvitations.status, 'accepted')
      ));
    
    // Combine and deduplicate
    const allGroups = [...ownedGroups, ...invitedGroups.map(g => g.partyGroup)];
    const uniqueGroups = allGroups.filter((group, index, self) => 
      index === self.findIndex(g => g.id === group.id)
    );
    
    return uniqueGroups;
  }
  
  async getPartyGroupById(id: number, userId: number): Promise<PartyGroup | undefined> {
    const [partyGroup] = await db.select().from(partyGroups).where(eq(partyGroups.id, id));
    
    if (!partyGroup) return undefined;
    
    // Check if user owns this party group
    if (partyGroup.createdBy === userId) {
      return partyGroup;
    }
    
    // Check if user is invited to this party group
    const [invitation] = await db
      .select()
      .from(eventInvitations)
      .where(and(
        eq(eventInvitations.partyGroupId, id),
        eq(eventInvitations.userId, userId),
        eq(eventInvitations.status, 'accepted')
      ));
    
    return invitation ? partyGroup : undefined;
  }
  
  async getPartyGroupByAccessCode(accessCode: string): Promise<PartyGroup | undefined> {
    const [partyGroup] = await db.select().from(partyGroups).where(eq(partyGroups.accessCode, accessCode));
    return partyGroup || undefined;
  }
  
  async updatePartyGroup(id: number, partyGroupUpdate: Partial<InsertPartyGroup>, userId: number): Promise<PartyGroup | undefined> {
    // First check if user owns this party group
    const existingGroup = await db.select().from(partyGroups).where(eq(partyGroups.id, id));
    if (!existingGroup.length || existingGroup[0].createdBy !== userId) {
      return undefined; // User doesn't own this party group
    }
    // Process updates with proper null handling
    const processedUpdate: Partial<PartyGroup> = { id };
    
    // Non-nullable fields
    if ('name' in partyGroupUpdate) processedUpdate.name = partyGroupUpdate.name;
    if ('eventAddress' in partyGroupUpdate) processedUpdate.eventAddress = partyGroupUpdate.eventAddress;
    if ('eventCity' in partyGroupUpdate) processedUpdate.eventCity = partyGroupUpdate.eventCity;
    if ('eventPostcode' in partyGroupUpdate) processedUpdate.eventPostcode = partyGroupUpdate.eventPostcode;
    if ('eventDate' in partyGroupUpdate) processedUpdate.eventDate = partyGroupUpdate.eventDate;
    if ('targetArrivalTime' in partyGroupUpdate) processedUpdate.targetArrivalTime = partyGroupUpdate.targetArrivalTime;
    if ('createdBy' in partyGroupUpdate) processedUpdate.createdBy = partyGroupUpdate.createdBy;
    
    // Nullable fields
    if ('description' in partyGroupUpdate) processedUpdate.description = partyGroupUpdate.description ?? null;
    if ('eventEndDate' in partyGroupUpdate) processedUpdate.eventEndDate = partyGroupUpdate.eventEndDate ?? null;
    if ('endTime' in partyGroupUpdate) processedUpdate.endTime = partyGroupUpdate.endTime ?? null;
    if ('accessCode' in partyGroupUpdate) processedUpdate.accessCode = partyGroupUpdate.accessCode ?? null;
    if ('additionalInformation' in partyGroupUpdate) processedUpdate.additionalInformation = partyGroupUpdate.additionalInformation ?? null;
    
    const [updatedPartyGroup] = await db
      .update(partyGroups)
      .set(processedUpdate)
      .where(eq(partyGroups.id, id))
      .returning();
    
    return updatedPartyGroup || undefined;
  }
  
  async deletePartyGroup(id: number, userId: number): Promise<boolean> {
    // First check if user owns this party group
    const existingGroup = await db.select().from(partyGroups).where(eq(partyGroups.id, id));
    if (!existingGroup.length || existingGroup[0].createdBy !== userId) {
      return false; // User doesn't own this party group
    }
    
    // First, delete all related carpools
    const relatedCarpools = await this.getCarpoolsByPartyGroupId(id, userId);
    
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
  
  async getCarpoolsByPartyGroupId(partyGroupId: number, userId: number): Promise<Carpool[]> {
    // First verify user has access to this party group
    const hasAccess = await this.getPartyGroupById(partyGroupId, userId);
    if (!hasAccess) {
      return []; // User doesn't have access to this party group
    }
    
    return db.select().from(carpools).where(eq(carpools.partyGroupId, partyGroupId));
  }
  
  async getCarpoolById(id: number, userId: number): Promise<Carpool | undefined> {
    const [carpool] = await db.select().from(carpools).where(eq(carpools.id, id));
    if (!carpool) return undefined;
    
    // Verify user has access to the party group this carpool belongs to
    const hasAccess = await this.getPartyGroupById(carpool.partyGroupId, userId);
    return hasAccess ? carpool : undefined;
  }

  async updateCarpool(id: number, carpoolUpdate: Partial<InsertCarpool>): Promise<Carpool | undefined> {
    // Process updates with proper null handling
    const processedUpdate: Partial<Carpool> = { id };
    
    // Copy non-nullable fields directly
    if ('partyGroupId' in carpoolUpdate) processedUpdate.partyGroupId = carpoolUpdate.partyGroupId;
    if ('parentName' in carpoolUpdate) processedUpdate.parentName = carpoolUpdate.parentName;
    if ('childName' in carpoolUpdate) processedUpdate.childName = carpoolUpdate.childName;
    if ('address' in carpoolUpdate) processedUpdate.address = carpoolUpdate.address;
    if ('city' in carpoolUpdate) processedUpdate.city = carpoolUpdate.city;
    if ('postcode' in carpoolUpdate) processedUpdate.postcode = carpoolUpdate.postcode;
    if ('phoneNumber' in carpoolUpdate) processedUpdate.phoneNumber = carpoolUpdate.phoneNumber;
    if ('spacesAvailable' in carpoolUpdate) processedUpdate.spacesAvailable = carpoolUpdate.spacesAvailable;
    
    // Handle nullable fields with null checks
    if ('canPickup' in carpoolUpdate) processedUpdate.canPickup = carpoolUpdate.canPickup ?? null;
    if ('canDropoff' in carpoolUpdate) processedUpdate.canDropoff = carpoolUpdate.canDropoff ?? null;
    if ('canBoth' in carpoolUpdate) processedUpdate.canBoth = carpoolUpdate.canBoth ?? null;
    if ('returnSpacesAvailable' in carpoolUpdate) processedUpdate.returnSpacesAvailable = carpoolUpdate.returnSpacesAvailable ?? null;
    
    // Handle outbound fields (TO party)
    if ('outboundDropoffPreference' in carpoolUpdate) processedUpdate.outboundDropoffPreference = carpoolUpdate.outboundDropoffPreference ?? null;
    if ('outboundMaxDistance' in carpoolUpdate) processedUpdate.outboundMaxDistance = carpoolUpdate.outboundMaxDistance ?? null;
    if ('outboundPickupLocation' in carpoolUpdate) processedUpdate.outboundPickupLocation = carpoolUpdate.outboundPickupLocation ?? null;
    if ('outboundPickupLocationCity' in carpoolUpdate) processedUpdate.outboundPickupLocationCity = carpoolUpdate.outboundPickupLocationCity ?? null;
    if ('outboundPickupLocationPostcode' in carpoolUpdate) processedUpdate.outboundPickupLocationPostcode = carpoolUpdate.outboundPickupLocationPostcode ?? null;
    if ('outboundDepartureTime' in carpoolUpdate) processedUpdate.outboundDepartureTime = carpoolUpdate.outboundDepartureTime ?? null;
    
    // Handle return fields (FROM party)
    if ('returnDropoffPreference' in carpoolUpdate) processedUpdate.returnDropoffPreference = carpoolUpdate.returnDropoffPreference ?? null;
    if ('returnMaxDistance' in carpoolUpdate) processedUpdate.returnMaxDistance = carpoolUpdate.returnMaxDistance ?? null;
    if ('returnPickupLocation' in carpoolUpdate) processedUpdate.returnPickupLocation = carpoolUpdate.returnPickupLocation ?? null;
    if ('returnPickupLocationCity' in carpoolUpdate) processedUpdate.returnPickupLocationCity = carpoolUpdate.returnPickupLocationCity ?? null;
    if ('returnPickupLocationPostcode' in carpoolUpdate) processedUpdate.returnPickupLocationPostcode = carpoolUpdate.returnPickupLocationPostcode ?? null;
    if ('returnCollectionTime' in carpoolUpdate) processedUpdate.returnCollectionTime = carpoolUpdate.returnCollectionTime ?? null;
    if ('returnPickupPreference' in carpoolUpdate) processedUpdate.returnPickupPreference = carpoolUpdate.returnPickupPreference ?? null;
    if ('pickupTime' in carpoolUpdate) processedUpdate.pickupTime = carpoolUpdate.pickupTime ?? null;
    
    // Legacy fields
    if ('dropoffPreference' in carpoolUpdate) processedUpdate.dropoffPreference = carpoolUpdate.dropoffPreference ?? null;
    if ('maxDistance' in carpoolUpdate) processedUpdate.maxDistance = carpoolUpdate.maxDistance ?? null;
    if ('pickupLocation' in carpoolUpdate) processedUpdate.pickupLocation = carpoolUpdate.pickupLocation ?? null;
    if ('pickupLocationCity' in carpoolUpdate) processedUpdate.pickupLocationCity = carpoolUpdate.pickupLocationCity ?? null;
    if ('pickupLocationPostcode' in carpoolUpdate) processedUpdate.pickupLocationPostcode = carpoolUpdate.pickupLocationPostcode ?? null;
    if ('additionalNotes' in carpoolUpdate) processedUpdate.additionalNotes = carpoolUpdate.additionalNotes ?? null;
    if ('estimatedDepartureTime' in carpoolUpdate) processedUpdate.estimatedDepartureTime = carpoolUpdate.estimatedDepartureTime ?? null;
    
    // Emergency contact information
    if ('emergencyContactName' in carpoolUpdate) processedUpdate.emergencyContactName = carpoolUpdate.emergencyContactName ?? null;
    if ('emergencyContactPhone' in carpoolUpdate) processedUpdate.emergencyContactPhone = carpoolUpdate.emergencyContactPhone ?? null;
    if ('emergencyContactRelationship' in carpoolUpdate) processedUpdate.emergencyContactRelationship = carpoolUpdate.emergencyContactRelationship ?? null;
    
    const [updatedCarpool] = await db
      .update(carpools)
      .set(processedUpdate)
      .where(eq(carpools.id, id))
      .returning();
    
    return updatedCarpool || undefined;
  }
  
  async deleteCarpool(id: number): Promise<boolean> {
    // First, delete all related requests
    await db.delete(carpoolRequests).where(eq(carpoolRequests.carpoolId, id));
    
    // Next, delete all calendar events
    await db.delete(calendarEvents).where(eq(calendarEvents.carpoolId, id));
    
    // Finally, delete the carpool
    const [deletedCarpool] = await db
      .delete(carpools)
      .where(eq(carpools.id, id))
      .returning();
    
    return !!deletedCarpool;
  }
  
  // Approval token generation
  private generateApprovalToken(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  // Carpool request methods
  async createCarpoolRequest(insertRequest: InsertCarpoolRequest): Promise<CarpoolRequest> {
    // Generate unique approval token
    const approvalToken = this.generateApprovalToken();
    
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
      dropoffCarpoolId: insertRequest.dropoffCarpoolId ?? null,
      approvalToken,
      approvalStatus: "pending" as const
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
  
  async deleteCarpoolRequest(id: number): Promise<boolean> {
    try {
      const [deleted] = await db.delete(carpoolRequests)
        .where(eq(carpoolRequests.id, id))
        .returning();
      
      return !!deleted;
    } catch (error) {
      console.error("Error deleting carpool request:", error);
      return false;
    }
  }

  // Approval methods
  async getCarpoolRequestByToken(token: string): Promise<CarpoolRequest | undefined> {
    const [request] = await db.select().from(carpoolRequests).where(eq(carpoolRequests.approvalToken, token));
    return request || undefined;
  }

  async approveCarpoolRequest(token: string): Promise<CarpoolRequest | undefined> {
    const [request] = await db
      .update(carpoolRequests)
      .set({
        approvalStatus: "approved",
        approvedAt: new Date().toISOString()
      })
      .where(eq(carpoolRequests.approvalToken, token))
      .returning();
    
    return request || undefined;
  }

  async rejectCarpoolRequest(token: string, reason?: string): Promise<CarpoolRequest | undefined> {
    const [request] = await db
      .update(carpoolRequests)
      .set({
        approvalStatus: "rejected",
        rejectedAt: new Date().toISOString(),
        rejectionReason: reason || null
      })
      .where(eq(carpoolRequests.approvalToken, token))
      .returning();
    
    return request || undefined;
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

  // Event invitation methods for multi-tenant access control
  async createEventInvitation(insertInvitation: InsertEventInvitation): Promise<EventInvitation> {
    const [invitation] = await db
      .insert(eventInvitations)
      .values(insertInvitation)
      .returning();
    
    return invitation;
  }

  async getEventInvitationsByUserId(userId: number): Promise<EventInvitation[]> {
    return db.select().from(eventInvitations).where(eq(eventInvitations.userId, userId));
  }

  async getEventInvitationsByPartyGroupId(partyGroupId: number): Promise<EventInvitation[]> {
    return db.select().from(eventInvitations).where(eq(eventInvitations.partyGroupId, partyGroupId));
  }

  async updateEventInvitationStatus(id: number, status: string): Promise<EventInvitation | undefined> {
    const [updatedInvitation] = await db
      .update(eventInvitations)
      .set({ status, respondedAt: new Date() })
      .where(eq(eventInvitations.id, id))
      .returning();
    
    return updatedInvitation || undefined;
  }

  async deleteEventInvitation(id: number): Promise<boolean> {
    const [deletedInvitation] = await db
      .delete(eventInvitations)
      .where(eq(eventInvitations.id, id))
      .returning();
    
    return !!deletedInvitation;
  }

  // Verification methods (using in-memory storage for simplicity)
  private verificationCodes = new Map<string, { code: string; action: string; timestamp: number }>();

  async storeVerificationCode(phoneNumber: string, code: string, action: string): Promise<void> {
    const key = `${phoneNumber}:${action}`;
    console.log(`[DEBUG] Storing verification code for key: ${key}`);
    console.log(`[DEBUG] Code being stored: "${code}"`);
    this.verificationCodes.set(key, {
      code,
      action,
      timestamp: Date.now()
    });
    
    // Clean up expired codes (older than 10 minutes)
    const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
    for (const [storedKey, data] of this.verificationCodes.entries()) {
      if (data.timestamp < tenMinutesAgo) {
        this.verificationCodes.delete(storedKey);
      }
    }
  }

  async verifyCode(phoneNumber: string, code: string, action: string = 'general'): Promise<boolean> {
    const key = `${phoneNumber}:${action}`;
    const stored = this.verificationCodes.get(key);
    
    console.log(`[DEBUG] Verifying code for key: ${key}`);
    console.log(`[DEBUG] Provided code: "${code}"`);
    console.log(`[DEBUG] Stored data:`, stored);
    
    if (!stored) {
      console.log(`[DEBUG] No stored code found for key: ${key}`);
      return false;
    }
    
    // Check if code is expired (10 minutes)
    const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
    if (stored.timestamp < tenMinutesAgo) {
      console.log(`[DEBUG] Code expired for key: ${key}`);
      this.verificationCodes.delete(key);
      return false;
    }
    
    // Verify code matches
    console.log(`[DEBUG] Comparing codes: "${stored.code}" === "${code}"`);
    if (stored.code === code) {
      console.log(`[DEBUG] Code verification successful for key: ${key}`);
      this.verificationCodes.delete(key); // Remove used code
      return true;
    }
    
    console.log(`[DEBUG] Code verification failed for key: ${key}`);
    return false;
  }
}

export const storage = new DatabaseStorage();
