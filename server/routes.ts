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

export async function registerRoutes(app: Express): Promise<Server> {
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
      
      const newRequest = await storage.createCarpoolRequest(validationResult.data);
      res.status(201).json(newRequest);
    } catch (error) {
      console.error("Error creating carpool request:", error);
      res.status(500).json({ message: "Failed to create carpool request" });
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

      // Validate the update data
      const validationResult = insertCalendarEventSchema.partial().safeParse(req.body);
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

  const httpServer = createServer(app);
  return httpServer;
}
