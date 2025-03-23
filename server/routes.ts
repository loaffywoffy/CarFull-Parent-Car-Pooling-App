import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCarpoolSchema, insertCarpoolRequestSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
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

  const httpServer = createServer(app);
  return httpServer;
}
