import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertPartyGroupSchema,
  insertCarpoolSchema, 
  insertCarpoolRequestSchema, 
  insertCalendarEventSchema 
} from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { z } from "zod";
import { setupAuth, isAuthenticated, isPartyGroupCreator, isCarpoolProvider } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth system is disabled for MVP
  // setupAuth(app);
  
  // Middleware to check if the current user is the creator of a party group
  const isCreatorMiddleware = async (req: any, res: any, next: any) => {
    try {
      const id = parseInt(req.params.id);
      const partyGroup = await storage.getPartyGroupById(id);
      
      if (!partyGroup) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      // Check if the current user is the creator
      if (req.headers['x-user-email'] !== partyGroup.createdBy) {
        return res.status(403).json({ message: "Only the creator can modify this event" });
      }
      
      next();
    } catch (error) {
      res.status(500).json({ message: "Error checking permissions" });
    }
  };
  
  // Middleware to check if the current user is the provider of a carpool
  const isCarpoolProviderMiddleware = async (req: any, res: any, next: any) => {
    try {
      const id = parseInt(req.params.id);
      const carpool = await storage.getCarpoolById(id);
      
      if (!carpool) {
        return res.status(404).json({ message: "Carpool not found" });
      }
      
      // Check if the current user is the carpool provider
      // We match based on a combination of name, phone number and email for stronger verification
      const userIdentifiers = [
        req.headers['x-user-name'],
        req.headers['x-user-email'],
        req.headers['x-user-phone']
      ];
      
      if (!userIdentifiers.includes(carpool.parentName) && 
          !userIdentifiers.includes(carpool.phoneNumber)) {
        return res.status(403).json({ message: "Only the provider can modify this carpool" });
      }
      
      next();
    } catch (error) {
      res.status(500).json({ message: "Error checking permissions" });
    }
  };
  
  // API routes for party groups
  app.post("/api/party-groups", async (req, res) => {
    try {
      // Validate request body against schema
      const validationResult = insertPartyGroupSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errorMessage = fromZodError(validationResult.error).message;
        return res.status(400).json({ message: errorMessage });
      }
      
      const newPartyGroup = await storage.createPartyGroup(validationResult.data);
      res.status(201).json(newPartyGroup);
    } catch (error) {
      console.error("Error creating party group:", error);
      res.status(500).json({ message: "Failed to create party group" });
    }
  });

  app.get("/api/party-groups", async (req, res) => {
    try {
      const partyGroups = await storage.getPartyGroups();
      res.json(partyGroups);
    } catch (error) {
      console.error("Error fetching party groups:", error);
      res.status(500).json({ message: "Failed to fetch party groups" });
    }
  });

  app.get("/api/party-groups/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid party group ID" });
      }
      
      const partyGroup = await storage.getPartyGroupById(id);
      if (!partyGroup) {
        return res.status(404).json({ message: "Party group not found" });
      }
      
      res.json(partyGroup);
    } catch (error) {
      console.error("Error fetching party group:", error);
      res.status(500).json({ message: "Failed to fetch party group" });
    }
  });

  app.get("/api/party-groups/code/:accessCode", async (req, res) => {
    try {
      const accessCode = req.params.accessCode;
      if (!accessCode) {
        return res.status(400).json({ message: "Access code is required" });
      }
      
      const partyGroup = await storage.getPartyGroupByAccessCode(accessCode);
      if (!partyGroup) {
        return res.status(404).json({ message: "Party group not found" });
      }
      
      res.json(partyGroup);
    } catch (error) {
      console.error("Error fetching party group by access code:", error);
      res.status(500).json({ message: "Failed to fetch party group" });
    }
  });

  app.get("/api/party-groups/:id/carpools", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid party group ID" });
      }
      
      const partyGroup = await storage.getPartyGroupById(id);
      if (!partyGroup) {
        return res.status(404).json({ message: "Party group not found" });
      }
      
      const carpools = await storage.getCarpoolsByPartyGroupId(id);
      res.json(carpools);
    } catch (error) {
      console.error("Error fetching carpools for party group:", error);
      res.status(500).json({ message: "Failed to fetch carpools" });
    }
  });

  // API routes for carpool operations
  app.get("/api/carpools", async (req, res) => {
    try {
      const carpools = await storage.getCarpools();
      res.json(carpools);
    } catch (error) {
      console.error("Error fetching carpools:", error);
      res.status(500).json({ message: "Failed to fetch carpools" });
    }
  });

  app.get("/api/carpools/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid carpool ID" });
      }
      
      const carpool = await storage.getCarpoolById(id);
      if (!carpool) {
        return res.status(404).json({ message: "Carpool not found" });
      }
      
      res.json(carpool);
    } catch (error) {
      console.error("Error fetching carpool:", error);
      res.status(500).json({ message: "Failed to fetch carpool" });
    }
  });

  app.post("/api/carpools", async (req, res) => {
    try {
      // Validate request body against schema
      const validationResult = insertCarpoolSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errorMessage = fromZodError(validationResult.error).message;
        return res.status(400).json({ message: errorMessage });
      }
      
      const newCarpool = await storage.createCarpool(validationResult.data);
      res.status(201).json(newCarpool);
    } catch (error) {
      console.error("Error creating carpool:", error);
      res.status(500).json({ message: "Failed to create carpool" });
    }
  });
  
  // Update carpool - removed provider check for MVP
  app.put("/api/carpools/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid carpool ID" });
      }
      
      // Check if the carpool exists
      const carpool = await storage.getCarpoolById(id);
      if (!carpool) {
        return res.status(404).json({ message: "Carpool not found" });
      }
      
      // Validate the request body without using partial()
      // Since we can't directly use partial(), we'll just accept any updates to valid fields
      const validationResult = z.any().safeParse(req.body);
      if (!validationResult.success) {
        const errorMessage = fromZodError(validationResult.error).message;
        return res.status(400).json({ message: errorMessage });
      }
      
      const updatedCarpool = await storage.updateCarpool(id, validationResult.data);
      res.json(updatedCarpool);
    } catch (error) {
      console.error("Error updating carpool:", error);
      res.status(500).json({ message: "Failed to update carpool" });
    }
  });
  
  // Delete carpool - removed provider check for MVP
  app.delete("/api/carpools/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid carpool ID" });
      }
      
      // Check if the carpool exists
      const carpool = await storage.getCarpoolById(id);
      if (!carpool) {
        return res.status(404).json({ message: "Carpool not found" });
      }
      
      const success = await storage.deleteCarpool(id);
      if (success) {
        res.status(204).send();
      } else {
        res.status(500).json({ message: "Failed to delete carpool" });
      }
    } catch (error) {
      console.error("Error deleting carpool:", error);
      res.status(500).json({ message: "Failed to delete carpool" });
    }
  });

  app.get("/api/carpools/:id/requests", async (req, res) => {
    try {
      const carpoolId = parseInt(req.params.id);
      if (isNaN(carpoolId)) {
        return res.status(400).json({ message: "Invalid carpool ID" });
      }

      const requests = await storage.getCarpoolRequestsByCarpoolId(carpoolId);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching carpool requests:", error);
      res.status(500).json({ message: "Failed to fetch carpool requests" });
    }
  });

  app.post("/api/carpool-requests", async (req, res) => {
    try {
      // Validate request body against schema
      const validationResult = insertCarpoolRequestSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errorMessage = fromZodError(validationResult.error).message;
        return res.status(400).json({ message: errorMessage });
      }

      // Check if the carpool exists
      const carpoolId = validationResult.data.carpoolId;
      const carpool = await storage.getCarpoolById(carpoolId);
      
      if (!carpool) {
        return res.status(404).json({ message: "Carpool not found" });
      }
      
      // Get current requests for this carpool to check available spaces
      const existingRequests = await storage.getCarpoolRequestsByCarpoolId(carpoolId);
      
      const { needsPickup, needsDropoff, needsBoth } = validationResult.data;
      
      // Count the existing requests by direction
      const pickupRequests = existingRequests.filter(req => req.needsPickup || req.needsBoth).length;
      const dropoffRequests = existingRequests.filter(req => req.needsDropoff || req.needsBoth).length;
      
      // For outbound (to party), use spacesAvailable field
      const outboundSpaces = carpool.spacesAvailable;
      // For return (from party), use returnSpacesAvailable if present, otherwise spacesAvailable
      const returnSpaces = carpool.returnSpacesAvailable || carpool.spacesAvailable;
      
      // Check direction capabilities and availability separately
      let canBookPickup = true;
      let canBookDropoff = true;
      
      // Check if the carpool offers the requested directions
      if ((needsPickup || needsBoth) && (!carpool.canPickup && !carpool.canBoth)) {
        // Request is for pickup, but carpool doesn't offer pickup
        canBookPickup = false;
      }
      
      if ((needsDropoff || needsBoth) && (!carpool.canDropoff && !carpool.canBoth)) {
        // Request is for dropoff, but carpool doesn't offer dropoff
        canBookDropoff = false;
      }
      
      // Check space availability for each direction
      if ((needsPickup || needsBoth) && (pickupRequests >= outboundSpaces)) {
        canBookPickup = false;
      }
      
      if ((needsDropoff || needsBoth) && (dropoffRequests >= returnSpaces)) {
        canBookDropoff = false;
      }
      
      // If "both ways" was requested but only one direction is available,
      // we need to split the request and only book the available direction
      if (needsBoth) {
        if (!canBookPickup && !canBookDropoff) {
          return res.status(400).json({ message: "No spaces available in either direction" });
        } else if (!canBookPickup) {
          // Only dropoff is available
          validationResult.data.needsBoth = false;
          validationResult.data.needsPickup = false;
          validationResult.data.needsDropoff = true;
          console.log("[INFO] Modified request: Changed from 'Both ways' to 'From party only' due to availability");
        } else if (!canBookDropoff) {
          // Only pickup is available
          validationResult.data.needsBoth = false;
          validationResult.data.needsPickup = true;
          validationResult.data.needsDropoff = false;
          console.log("[INFO] Modified request: Changed from 'Both ways' to 'To party only' due to availability");
        }
        // If both directions are available, keep needsBoth=true
      } else {
        // Single direction request
        if ((needsPickup && !canBookPickup) || (needsDropoff && !canBookDropoff)) {
          const direction = needsPickup ? "To party" : "From party";
          return res.status(400).json({ message: `No spaces available for ${direction}` });
        }
      }
      
      const newRequest = await storage.createCarpoolRequest(validationResult.data);
      
      // Log for debugging
      console.log(`[INFO] New request created for carpool ${carpoolId}. Total requests: ${existingRequests.length + 1}`);
      console.log(`[INFO] Direction: ${needsBoth ? "Both ways" : (needsPickup ? "To party" : "From party")}`);
      console.log(`[INFO] Remaining spaces - Outbound: ${outboundSpaces - (pickupRequests + (needsPickup || needsBoth ? 1 : 0))}, Return: ${returnSpaces - (dropoffRequests + (needsDropoff || needsBoth ? 1 : 0))}`);
      
      res.status(201).json(newRequest);
    } catch (error) {
      console.error("Error creating carpool request:", error);
      res.status(500).json({ message: "Failed to create carpool request" });
    }
  });
  
  // Delete carpool request
  app.delete("/api/carpool-requests/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid carpool request ID" });
      }
      
      const success = await storage.deleteCarpoolRequest(id);
      if (success) {
        res.status(204).send();
      } else {
        res.status(500).json({ message: "Failed to delete carpool request" });
      }
    } catch (error) {
      console.error("Error deleting carpool request:", error);
      res.status(500).json({ message: "Failed to delete carpool request" });
    }
  });

  // API routes for calendar events
  app.get("/api/carpools/:id/calendar-events", async (req, res) => {
    try {
      const carpoolId = parseInt(req.params.id);
      if (isNaN(carpoolId)) {
        return res.status(400).json({ message: "Invalid carpool ID" });
      }

      const carpool = await storage.getCarpoolById(carpoolId);
      if (!carpool) {
        return res.status(404).json({ message: "Carpool not found" });
      }

      const events = await storage.getCalendarEventsByCarpoolId(carpoolId);
      res.json(events);
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      res.status(500).json({ message: "Failed to fetch calendar events" });
    }
  });

  app.get("/api/calendar-events/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }

      const event = await storage.getCalendarEventById(id);
      if (!event) {
        return res.status(404).json({ message: "Calendar event not found" });
      }

      res.json(event);
    } catch (error) {
      console.error("Error fetching calendar event:", error);
      res.status(500).json({ message: "Failed to fetch calendar event" });
    }
  });

  app.post("/api/calendar-events", async (req, res) => {
    try {
      // Validate request body against schema
      const validationResult = insertCalendarEventSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errorMessage = fromZodError(validationResult.error).message;
        return res.status(400).json({ message: errorMessage });
      }

      // Check if the carpool exists
      const carpoolId = validationResult.data.carpoolId;
      const carpool = await storage.getCarpoolById(carpoolId);
      
      if (!carpool) {
        return res.status(404).json({ message: "Carpool not found" });
      }
      
      const newEvent = await storage.createCalendarEvent(validationResult.data);
      res.status(201).json(newEvent);
    } catch (error) {
      console.error("Error creating calendar event:", error);
      res.status(500).json({ message: "Failed to create calendar event" });
    }
  });

  // Middleware to check if the current user is the provider of a carpool linked to a calendar event
  const isCalendarEventOwnerMiddleware = async (req: any, res: any, next: any) => {
    try {
      const id = parseInt(req.params.id);
      const event = await storage.getCalendarEventById(id);
      
      if (!event) {
        return res.status(404).json({ message: "Calendar event not found" });
      }
      
      // Get the carpool associated with this calendar event
      const carpool = await storage.getCarpoolById(event.carpoolId);
      if (!carpool) {
        return res.status(404).json({ message: "Associated carpool not found" });
      }
      
      // Check if the current user is the carpool provider
      const userIdentifiers = [
        req.headers['x-user-name'],
        req.headers['x-user-email'],
        req.headers['x-user-phone']
      ];
      
      if (!userIdentifiers.includes(carpool.parentName) && 
          !userIdentifiers.includes(carpool.phoneNumber)) {
        return res.status(403).json({ message: "Only the carpool provider can modify their calendar events" });
      }
      
      next();
    } catch (error) {
      res.status(500).json({ message: "Error checking permissions" });
    }
  };

  // Calendar event updates - removed owner check for MVP
  app.patch("/api/calendar-events/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }

      // Get the existing event to confirm it exists
      const existingEvent = await storage.getCalendarEventById(id);
      if (!existingEvent) {
        return res.status(404).json({ message: "Calendar event not found" });
      }

      // Validate the update data without using partial()
      // Since we can't directly use partial(), we'll just accept any updates to valid fields
      const validationResult = z.any().safeParse(req.body);
      if (!validationResult.success) {
        const errorMessage = fromZodError(validationResult.error).message;
        return res.status(400).json({ message: errorMessage });
      }

      // Update the event
      const updatedEvent = await storage.updateCalendarEvent(id, validationResult.data);
      res.json(updatedEvent);
    } catch (error) {
      console.error("Error updating calendar event:", error);
      res.status(500).json({ message: "Failed to update calendar event" });
    }
  });

  // Calendar event deletion - removed owner check for MVP
  app.delete("/api/calendar-events/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid event ID" });
      }

      // Check if the event exists
      const event = await storage.getCalendarEventById(id);
      if (!event) {
        return res.status(404).json({ message: "Calendar event not found" });
      }

      // Delete the event
      const success = await storage.deleteCalendarEvent(id);
      if (success) {
        res.status(204).send();
      } else {
        res.status(500).json({ message: "Failed to delete calendar event" });
      }
    } catch (error) {
      console.error("Error deleting calendar event:", error);
      res.status(500).json({ message: "Failed to delete calendar event" });
    }
  });
  
  // Delete a party group - removed creator check for MVP
  app.delete("/api/party-groups/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid party group ID" });
      }
      
      // Check if the party group exists
      const partyGroup = await storage.getPartyGroupById(id);
      if (!partyGroup) {
        return res.status(404).json({ message: "Party group not found" });
      }
      
      const success = await storage.deletePartyGroup(id);
      if (success) {
        res.status(204).send();
      } else {
        res.status(500).json({ message: "Failed to delete party group" });
      }
    } catch (error) {
      console.error("Error deleting party group:", error);
      res.status(500).json({ message: "Failed to delete party group" });
    }
  });
  
  // Update a party group - removed creator check for MVP
  app.put("/api/party-groups/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid party group ID" });
      }
      
      // Check if the party group exists
      const partyGroup = await storage.getPartyGroupById(id);
      if (!partyGroup) {
        return res.status(404).json({ message: "Party group not found" });
      }
      
      // Validate the request body without using partial()
      // Since we can't directly use partial(), we'll just accept any updates to valid fields
      const validationResult = z.any().safeParse(req.body);
      if (!validationResult.success) {
        const errorMessage = fromZodError(validationResult.error).message;
        return res.status(400).json({ message: errorMessage });
      }
      
      const updatedPartyGroup = await storage.updatePartyGroup(id, validationResult.data);
      res.json(updatedPartyGroup);
    } catch (error) {
      console.error("Error updating party group:", error);
      res.status(500).json({ message: "Failed to update party group" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
