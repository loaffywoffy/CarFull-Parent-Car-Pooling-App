import { 
  users, 
  type User, 
  type InsertUser,
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
  
  // Carpool operations
  createCarpool(carpool: InsertCarpool): Promise<Carpool>;
  getCarpools(): Promise<Carpool[]>;
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
  private carpools: Map<number, Carpool>;
  private carpoolRequests: Map<number, CarpoolRequest>;
  private calendarEvents: Map<number, CalendarEvent>;
  
  private currentUserId: number;
  private currentCarpoolId: number;
  private currentRequestId: number;
  private currentEventId: number;

  constructor() {
    this.users = new Map();
    this.carpools = new Map();
    this.carpoolRequests = new Map();
    this.calendarEvents = new Map();
    
    this.currentUserId = 1;
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
  
  // Carpool methods
  async createCarpool(insertCarpool: InsertCarpool): Promise<Carpool> {
    const id = this.currentCarpoolId++;
    const carpool: Carpool = { ...insertCarpool, id };
    this.carpools.set(id, carpool);
    return carpool;
  }
  
  async getCarpools(): Promise<Carpool[]> {
    return Array.from(this.carpools.values());
  }
  
  async getCarpoolById(id: number): Promise<Carpool | undefined> {
    return this.carpools.get(id);
  }
  
  // Carpool request methods
  async createCarpoolRequest(insertRequest: InsertCarpoolRequest): Promise<CarpoolRequest> {
    const id = this.currentRequestId++;
    const request: CarpoolRequest = { ...insertRequest, id };
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
    const event: CalendarEvent = { ...insertEvent, id };
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
    
    const updatedEvent = { ...event, ...eventUpdate };
    this.calendarEvents.set(id, updatedEvent);
    return updatedEvent;
  }
  
  async deleteCalendarEvent(id: number): Promise<boolean> {
    return this.calendarEvents.delete(id);
  }
}

export const storage = new MemStorage();
