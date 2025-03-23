import { 
  users, 
  type User, 
  type InsertUser,
  carpools,
  type Carpool,
  type InsertCarpool,
  carpoolRequests,
  type CarpoolRequest,
  type InsertCarpoolRequest
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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private carpools: Map<number, Carpool>;
  private carpoolRequests: Map<number, CarpoolRequest>;
  
  private currentUserId: number;
  private currentCarpoolId: number;
  private currentRequestId: number;

  constructor() {
    this.users = new Map();
    this.carpools = new Map();
    this.carpoolRequests = new Map();
    
    this.currentUserId = 1;
    this.currentCarpoolId = 1;
    this.currentRequestId = 1;
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
}

export const storage = new MemStorage();
