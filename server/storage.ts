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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private partyGroups: Map<number, PartyGroup>;
  private carpools: Map<number, Carpool>;
  private carpoolRequests: Map<number, CarpoolRequest>;
  private calendarEvents: Map<number, CalendarEvent>;
  
  private currentUserId: number;
  private currentPartyGroupId: number;
  private currentCarpoolId: number;
  private currentRequestId: number;
  private currentEventId: number;

  constructor() {
    this.users = new Map();
    this.partyGroups = new Map();
    this.carpools = new Map();
    this.carpoolRequests = new Map();
    this.calendarEvents = new Map();
    
    this.currentUserId = 1;
    this.currentPartyGroupId = 1;
    this.currentCarpoolId = 1;
    this.currentRequestId = 1;
    this.currentEventId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Party Group methods
  async createPartyGroup(insertPartyGroup: InsertPartyGroup): Promise<PartyGroup> {
    const id = this.currentPartyGroupId++;
    // Ensure all nullable fields have proper null values instead of undefined
    const partyGroup: PartyGroup = { 
      ...insertPartyGroup, 
      id,
      description: insertPartyGroup.description ?? null,
      additionalInformation: insertPartyGroup.additionalInformation ?? null
    };
    this.partyGroups.set(id, partyGroup);
    return partyGroup;
  }
  
  async getPartyGroups(): Promise<PartyGroup[]> {
    return Array.from(this.partyGroups.values());
  }
  
  async getPartyGroupById(id: number): Promise<PartyGroup | undefined> {
    return this.partyGroups.get(id);
  }
  
  async getPartyGroupByAccessCode(accessCode: string): Promise<PartyGroup | undefined> {
    return Array.from(this.partyGroups.values()).find(
      (group) => group.accessCode === accessCode
    );
  }
  
  // Carpool methods
  async createCarpool(insertCarpool: InsertCarpool): Promise<Carpool> {
    const id = this.currentCarpoolId++;
    // Ensure all nullable fields have proper null values instead of undefined
    const carpool: Carpool = { 
      ...insertCarpool, 
      id,
      canPickup: insertCarpool.canPickup ?? null,
      canDropoff: insertCarpool.canDropoff ?? null,
      canBoth: insertCarpool.canBoth ?? null,
      returnSpacesAvailable: insertCarpool.returnSpacesAvailable ?? null,
      maxDistance: insertCarpool.maxDistance ?? null,
      pickupLocation: insertCarpool.pickupLocation ?? null,
      pickupLocationCity: insertCarpool.pickupLocationCity ?? null,
      pickupLocationPostcode: insertCarpool.pickupLocationPostcode ?? null,
      additionalNotes: insertCarpool.additionalNotes ?? null,
      estimatedDepartureTime: insertCarpool.estimatedDepartureTime ?? null
    };
    this.carpools.set(id, carpool);
    return carpool;
  }
  
  async getCarpools(): Promise<Carpool[]> {
    return Array.from(this.carpools.values());
  }
  
  async getCarpoolsByPartyGroupId(partyGroupId: number): Promise<Carpool[]> {
    return Array.from(this.carpools.values()).filter(
      (carpool) => carpool.partyGroupId === partyGroupId
    );
  }
  
  async getCarpoolById(id: number): Promise<Carpool | undefined> {
    return this.carpools.get(id);
  }
  
  // Carpool request methods
  async createCarpoolRequest(insertRequest: InsertCarpoolRequest): Promise<CarpoolRequest> {
    const id = this.currentRequestId++;
    // Ensure all nullable fields have proper null values instead of undefined
    const request: CarpoolRequest = { 
      ...insertRequest, 
      id,
      childPhone: insertRequest.childPhone ?? null,
      needsPickup: insertRequest.needsPickup ?? null,
      needsDropoff: insertRequest.needsDropoff ?? null,
      needsBoth: insertRequest.needsBoth ?? null,
      specialRequirements: insertRequest.specialRequirements ?? null
    };
    this.carpoolRequests.set(id, request);
    return request;
  }
  
  async getCarpoolRequestsByCarpoolId(carpoolId: number): Promise<CarpoolRequest[]> {
    return Array.from(this.carpoolRequests.values()).filter(
      (request) => request.carpoolId === carpoolId
    );
  }
  
  // Calendar event methods
  async createCalendarEvent(insertEvent: InsertCalendarEvent): Promise<CalendarEvent> {
    const id = this.currentEventId++;
    // Ensure all nullable fields have proper null values instead of undefined
    const event: CalendarEvent = { 
      ...insertEvent, 
      id,
      description: insertEvent.description ?? null,
      location: insertEvent.location ?? null,
      isRecurring: insertEvent.isRecurring ?? null,
      recurrencePattern: insertEvent.recurrencePattern ?? null,
      reminderTime: insertEvent.reminderTime ?? null
    };
    this.calendarEvents.set(id, event);
    return event;
  }
  
  async getCalendarEventById(id: number): Promise<CalendarEvent | undefined> {
    return this.calendarEvents.get(id);
  }
  
  async getCalendarEventsByCarpoolId(carpoolId: number): Promise<CalendarEvent[]> {
    return Array.from(this.calendarEvents.values()).filter(
      (event) => event.carpoolId === carpoolId
    );
  }
  
  async updateCalendarEvent(id: number, eventUpdate: Partial<InsertCalendarEvent>): Promise<CalendarEvent | undefined> {
    const event = this.calendarEvents.get(id);
    if (!event) return undefined;
    
    // Process updates with proper null handling
    const processedUpdate: Partial<CalendarEvent> = {};
    
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
    
    const updatedEvent = { ...event, ...processedUpdate };
    this.calendarEvents.set(id, updatedEvent);
    return updatedEvent;
  }
  
  async deleteCalendarEvent(id: number): Promise<boolean> {
    return this.calendarEvents.delete(id);
  }
}

export const storage = new MemStorage();
