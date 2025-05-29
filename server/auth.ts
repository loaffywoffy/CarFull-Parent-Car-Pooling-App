import { Request, Response, NextFunction, Express } from "express";
import session from "express-session";
import { storage } from "./storage";
import { randomUUID } from "crypto";
import createMemoryStore from "memorystore";
// Import the User type but rename it to avoid conflict with Express.User
import { User as SchemaUser } from "@shared/schema";

const MemoryStore = createMemoryStore(session);

declare module "express-session" {
  interface SessionData {
    user?: SchemaUser;
  }
}

declare global {
  namespace Express {
    // Use the User type from schema but avoid recursive extension
    interface User {
      id: number;
      name: string;
      phoneNumber: string;
      email?: string;
    }
  }
}

export const setupAuth = (app: Express) => {
  // Configure session middleware
  const sessionOptions: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || randomUUID(), // In production, use a proper secret
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    },
    store: new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
  };

  app.use(session(sessionOptions));

  // Login endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { phoneNumber, name } = req.body;

      if (!phoneNumber || !name) {
        return res.status(400).json({ message: "Phone number and name are required" });
      }

      // Look up the user by phone number
      let user = await storage.getUserByPhoneNumber(phoneNumber);

      // If user doesn't exist, create one
      if (!user) {
        user = await storage.createUser({
          name,
          phoneNumber,
          email: "", // Empty for now, will be optional
        });
      }

      // Store the user in the session
      req.session.user = user;

      res.status(200).json(user);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "An error occurred during login" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  // Current user endpoint
  app.get("/api/auth/user", (req, res) => {
    if (!req.session.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.status(200).json(req.session.user);
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.session.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.status(200).json(req.session.user);
  });
};

// Middleware to check if the user is authenticated
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
};

// Middleware to check if the current user is the creator of a party group
export const isPartyGroupCreator = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid party group ID" });
    }
    
    const partyGroup = await storage.getPartyGroupById(id);
    if (!partyGroup) {
      return res.status(404).json({ message: "Party group not found" });
    }
    
    // Check if the current user is the creator
    // We'll use the email field as the identifier
    if (req.session.user.email !== partyGroup.createdBy) {
      return res.status(403).json({ message: "Only the creator can modify this party group" });
    }
    
    next();
  } catch (error) {
    console.error("Error in isPartyGroupCreator middleware:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Middleware to check if the current user is the provider of a carpool
export const isCarpoolProvider = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid carpool ID" });
    }
    
    const carpool = await storage.getCarpoolById(id);
    if (!carpool) {
      return res.status(404).json({ message: "Carpool not found" });
    }
    
    // Check if the current user is the carpool provider
    // We match based on name and phone number for verification
    if (req.session.user.name !== carpool.parentName && 
        req.session.user.phoneNumber !== carpool.phoneNumber) {
      return res.status(403).json({ message: "Only the provider can modify this carpool" });
    }
    
    next();
  } catch (error) {
    console.error("Error in isCarpoolProvider middleware:", error);
    res.status(500).json({ message: "Server error" });
  }
};