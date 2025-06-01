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
  getUserByPhoneNumber(phoneNumber: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Party group operations
  createPartyGroup(partyGroup: InsertPartyGroup): Promise<PartyGroup>;
  getPartyGroups(): Promise<PartyGroup[]>;
  getPartyGroupById(id: number): Promise<PartyGroup | undefined>;
  getPartyGroupByAccessCode(accessCode: string): Promise<PartyGroup | undefined>;
  getPartyGroupByShareableUrl(shareableUrl: string): Promise<PartyGroup | undefined>;
  getPartyGroupByShortCode(shortCode: string): Promise<PartyGroup | undefined>;
  updatePartyGroup(id: number, partyGroup: Partial<InsertPartyGroup>): Promise<PartyGroup | undefined>;
  deletePartyGroup(id: number): Promise<boolean>;

  // Carpool operations
  createCarpool(carpool: InsertCarpool): Promise<Carpool>;
  getCarpools(): Promise<Carpool[]>;
  getCarpoolsByPartyGroupId(partyGroupId: number): Promise<Carpool[]>;
  getCarpoolById(id: number): Promise<Carpool | undefined>;
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

  // Distance cache operations
  getCachedDistance(requestId: number): Promise<number | null>;
  setCachedDistance(requestId: number, miles: number): Promise<void>;
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
  private generateShareableUrl(name: string): string {
    const baseUrl = name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 30);
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    return `${baseUrl}-${randomSuffix}`;
  }

  private generateShortCode(): string {
    // Generate a 6-character alphanumeric code for SMS-friendly URLs
    const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789'; // Exclude O, 0 for clarity
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async createPartyGroup(insertPartyGroup: InsertPartyGroup): Promise<PartyGroup> {
    const shareableUrl = this.generateShareableUrl(insertPartyGroup.name);

    // Ensure null values for nullable fields
    const partyGroupData = {
      ...insertPartyGroup,
      shareableUrl,
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

  async getPartyGroupByShareableUrl(shareableUrl: string): Promise<PartyGroup | undefined> {
    // Input validation to prevent SQL injection
    if (!shareableUrl || typeof shareableUrl !== 'string') {
      throw new Error('Invalid shareable URL parameter');
    }

    // Sanitize input - only allow alphanumeric, hyphens, and underscores
    const sanitizedUrl = shareableUrl.replace(/[^a-zA-Z0-9\-_]/g, '');
    if (sanitizedUrl !== shareableUrl) {
      throw new Error('Invalid characters in shareable URL');
    }

    const [partyGroup] = await db.select().from(partyGroups).where(eq(partyGroups.shareableUrl, sanitizedUrl));
    return partyGroup || undefined;
  }

  async getPartyGroupByShortCode(shortCode: string): Promise<PartyGroup | undefined> {
    const [partyGroup] = await db.select().from(partyGroups).where(eq(partyGroups.shortCode, shortCode));
    return partyGroup || undefined;
  }

  async updatePartyGroup(id: number, partyGroupUpdate: Partial<InsertPartyGroup>): Promise<PartyGroup | undefined> {
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

  // Verification methods (using in-memory storage for simplicity)
  private verificationCodes = new Map<string, { code: string; action: string; timestamp: number }>();
  private distanceCache = new Map<number, number>(); // requestId -> miles

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

  async getCachedDistance(requestId: number): Promise<number | null> {
    return this.distanceCache.get(requestId) || null;
  }

  async setCachedDistance(requestId: number, miles: number): Promise<void> {
    this.distanceCache.set(requestId, miles);
  }
}

export const storage = new DatabaseStorage();