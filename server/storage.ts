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
  
  // Persistent storage keys
  private readonly STORAGE_KEY_PREFIX = 'carpool_app_';
  private readonly USERS_KEY = this.STORAGE_KEY_PREFIX + 'users';
  private readonly PARTY_GROUPS_KEY = this.STORAGE_KEY_PREFIX + 'party_groups';
  private readonly CARPOOLS_KEY = this.STORAGE_KEY_PREFIX + 'carpools';
  private readonly REQUESTS_KEY = this.STORAGE_KEY_PREFIX + 'requests';
  private readonly EVENTS_KEY = this.STORAGE_KEY_PREFIX + 'events';
  private readonly COUNTERS_KEY = this.STORAGE_KEY_PREFIX + 'counters';
  
  constructor() {
    // Initialize maps
    this.users = new Map();
    this.partyGroups = new Map();
    this.carpools = new Map();
    this.carpoolRequests = new Map();
    this.calendarEvents = new Map();
    
    // Initialize IDs
    this.currentUserId = 1;
    this.currentPartyGroupId = 1;
    this.currentCarpoolId = 1;
    this.currentRequestId = 1;
    this.currentEventId = 1;
    
    // Load data from persistent storage
    this.loadFromPersistentStorage();
    
    console.log("[MemStorage] Initialized with:", {
      users: this.users.size,
      partyGroups: this.partyGroups.size,
      carpools: this.carpools.size,
      requests: this.carpoolRequests.size,
      events: this.calendarEvents.size
    });
  }
  
  // Load data from session/local storage
  private loadFromPersistentStorage() {
    try {
      // For server-side storage, we'll use a simpler approach with localStorage simulation
      let storedData: any = {};
      
      // Check if there's a global object that we can use for persistent storage
      if (typeof global !== 'undefined' && (global as any).__persistentStorage) {
        storedData = (global as any).__persistentStorage;
      }
      
      // Load users
      if (storedData.users) {
        this.users = new Map(storedData.users.map((user: User) => [user.id, user]));
      }
      
      // Load party groups
      if (storedData.partyGroups) {
        this.partyGroups = new Map(storedData.partyGroups.map((group: PartyGroup) => [group.id, group]));
      }
      
      // Load carpools
      if (storedData.carpools) {
        this.carpools = new Map(storedData.carpools.map((carpool: Carpool) => [carpool.id, carpool]));
      }
      
      // Load carpool requests
      if (storedData.carpoolRequests) {
        this.carpoolRequests = new Map(storedData.carpoolRequests.map((request: CarpoolRequest) => [request.id, request]));
      }
      
      // Load calendar events
      if (storedData.calendarEvents) {
        this.calendarEvents = new Map(storedData.calendarEvents.map((event: CalendarEvent) => [event.id, event]));
      }
      
      // Load counters
      if (storedData.counters) {
        this.currentUserId = storedData.counters.userId || 1;
        this.currentPartyGroupId = storedData.counters.partyGroupId || 1;
        this.currentCarpoolId = storedData.counters.carpoolId || 1;
        this.currentRequestId = storedData.counters.requestId || 1;
        this.currentEventId = storedData.counters.eventId || 1;
      }
      
      console.log("[MemStorage] Loaded data from persistent storage");
    } catch (error) {
      console.error("[MemStorage] Error loading from persistent storage:", error);
      // Initialize with empty data if loading fails
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
  }
  
  // Save data to session/local storage
  private saveToPersistentStorage() {
    try {
      // For server-side storage, we'll use a simpler approach with localStorage simulation
      const storedData = {
        users: Array.from(this.users.values()),
        partyGroups: Array.from(this.partyGroups.values()),
        carpools: Array.from(this.carpools.values()),
        carpoolRequests: Array.from(this.carpoolRequests.values()),
        calendarEvents: Array.from(this.calendarEvents.values()),
        counters: {
          userId: this.currentUserId,
          partyGroupId: this.currentPartyGroupId,
          carpoolId: this.currentCarpoolId,
          requestId: this.currentRequestId,
          eventId: this.currentEventId
        }
      };
      
      // Save to global object if available
      if (typeof global !== 'undefined') {
        // Cast to any to avoid TypeScript errors
        (global as any).__persistentStorage = storedData;
      }
      
      console.log("[MemStorage] Saved data to persistent storage");
    } catch (error) {
      console.error("[MemStorage] Error saving to persistent storage:", error);
    }
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
    this.saveToPersistentStorage();
    return user;
  }
  
  // Party Group methods
  async createPartyGroup(insertPartyGroup: InsertPartyGroup): Promise<PartyGroup> {
    const id = this.currentPartyGroupId++;
    // Create a proper PartyGroup object with explicit type casting
    const partyGroup: PartyGroup = { 
      id,
      name: insertPartyGroup.name,
      description: insertPartyGroup.description ?? null,
      partyAddress: insertPartyGroup.partyAddress,
      partyCity: insertPartyGroup.partyCity,
      partyPostcode: insertPartyGroup.partyPostcode,
      partyDate: insertPartyGroup.partyDate,
      partyEndDate: insertPartyGroup.partyEndDate ?? null,
      targetArrivalTime: insertPartyGroup.targetArrivalTime,
      endTime: insertPartyGroup.endTime ?? null,
      createdBy: insertPartyGroup.createdBy,
      accessCode: insertPartyGroup.accessCode,
      additionalInformation: insertPartyGroup.additionalInformation ?? null
    };
    this.partyGroups.set(id, partyGroup);
    this.saveToPersistentStorage();
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
      estimatedDepartureTime: insertCarpool.estimatedDepartureTime ?? null,
      emergencyContactName: insertCarpool.emergencyContactName ?? null,
      emergencyContactPhone: insertCarpool.emergencyContactPhone ?? null,
      emergencyContactRelationship: insertCarpool.emergencyContactRelationship ?? null,
      // Ensure all dynamically added properties are properly typed
      outboundDropoffPreference: insertCarpool.outboundDropoffPreference ?? null,
      returnPickupPreference: insertCarpool.returnPickupPreference ?? null,
      pickupTime: insertCarpool.pickupTime ?? null,
      dropoffPreference: insertCarpool.dropoffPreference ?? null
    } as Carpool; // Type assertion to handle dynamically added properties
    
    this.carpools.set(id, carpool);
    this.saveToPersistentStorage();
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
      specialRequirements: insertRequest.specialRequirements ?? null,
      emergencyContactName: insertRequest.emergencyContactName ?? null,
      emergencyContactPhone: insertRequest.emergencyContactPhone ?? null,
      emergencyContactRelationship: insertRequest.emergencyContactRelationship ?? null,
      // Handle dynamic properties that might be added by the client
      pickupCarpoolId: insertRequest.pickupCarpoolId ?? null,
      dropoffCarpoolId: insertRequest.dropoffCarpoolId ?? null
    } as CarpoolRequest; // Type assertion to handle dynamically added properties
    
    this.carpoolRequests.set(id, request);
    this.saveToPersistentStorage();
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
    this.saveToPersistentStorage();
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
    this.saveToPersistentStorage();
    return updatedEvent;
  }
  
  async deleteCalendarEvent(id: number): Promise<boolean> {
    const deleted = this.calendarEvents.delete(id);
    if (deleted) {
      this.saveToPersistentStorage();
    }
    return deleted;
  }
}

export const storage = new MemStorage();
