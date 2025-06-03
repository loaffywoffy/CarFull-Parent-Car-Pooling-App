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
import { messagingService } from "./services/sms";
import { verificationService } from "./services/verification";
import { rateLimitService } from "./services/rate-limiter";
import { phoneValidator } from "./services/phone-validator";
import { calculateDrivingDistance } from "./services/directions";
import { routeOptimizationService } from "./services/route-optimization";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth system is disabled for MVP
  // setupAuth(app);

  // Short URL redirect endpoint
  app.get("/s/:shortCode", async (req, res) => {
    try {
      const { shortCode } = req.params;
      const partyGroup = await storage.getPartyGroupByShortCode(shortCode.toUpperCase());

      if (!partyGroup) {
        return res.status(404).send("Event not found");
      }

      // Redirect to the full event URL
      res.redirect(`/events/${partyGroup.shareableUrl}`);
    } catch (error: any) {
      console.error("Short URL redirect error:", error);
      res.status(500).send("Server error");
    }
  });

  // SMS Verification endpoints
  app.post("/api/verification/send", async (req, res) => {
    try {
      const { phoneNumber, action } = req.body;
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

      if (!phoneNumber) {
        return res.status(400).json({ message: "Phone number is required" });
      }

      // Validate phone number format and check for suspicious patterns
      const validation = phoneValidator.validatePhoneNumber(phoneNumber);
      if (!validation.valid) {
        rateLimitService.logSuspiciousActivity(clientIP, 'invalid_phone_attempt', { 
          phoneNumber, 
          reason: validation.reason 
        });
        return res.status(400).json({ message: validation.reason || "Invalid phone number" });
      }

      // Normalize phone number
      const normalizedPhone = phoneValidator.normalizePhoneNumber(phoneNumber);
      console.log(`[DEBUG] Routes - Original phone: "${phoneNumber}"`);
      console.log(`[DEBUG] Routes - Normalized phone: "${normalizedPhone}"`);

      // Comprehensive bot protection check
      const botProtection = rateLimitService.performBotProtection(clientIP, normalizedPhone);
      if (!botProtection.allowed) {
        return res.status(429).json({ 
          message: botProtection.reason || "Request blocked due to security policies." 
        });
      }

      // Log high-risk attempts
      if (validation.risk === 'high') {
        rateLimitService.logSuspiciousActivity(clientIP, 'high_risk_phone_attempt', { 
          phoneNumber: normalizedPhone,
          action 
        });
      }

      const code = verificationService.generateCode();
      await verificationService.storeVerificationCode(normalizedPhone, code, action);
      await messagingService.sendVerificationCode(normalizedPhone, code, action);

      console.log(`[INFO] SMS sent to ${normalizedPhone} from IP ${clientIP} for action: ${action}`);

      res.json({ message: "Verification code sent successfully" });
    } catch (error) {
      console.error("Error sending verification code:", error);
      res.status(500).json({ message: "Failed to send verification code" });
    }
  });

  app.post("/api/verification/verify", async (req, res) => {
    try {
      const { phoneNumber, code, action } = req.body;

      if (!phoneNumber || !code) {
        return res.status(400).json({ message: "Phone number and code are required" });
      }

      // Normalize phone number to match the format used when storing the code
      const normalizedPhone = phoneValidator.normalizePhoneNumber(phoneNumber);
      console.log(`[DEBUG] Verify endpoint - Original phone: "${phoneNumber}"`);
      console.log(`[DEBUG] Verify endpoint - Normalized phone: "${normalizedPhone}"`);
      console.log(`[DEBUG] Verify endpoint - Code: "${code}"`);
      console.log(`[DEBUG] Verify endpoint - Action: "${action}"`);

      const isValid = await verificationService.verifyCode(normalizedPhone, code, action);

      if (isValid) {
        res.json({ verified: true, message: "Code verified successfully" });
      } else {
        res.status(400).json({ verified: false, message: "Invalid or expired code" });
      }
    } catch (error) {
      console.error("Error verifying code:", error);
      res.status(500).json({ message: "Failed to verify code" });
    }
  });

  // Rate limit reset endpoint for development
  app.post("/api/reset-rate-limit", async (req, res) => {
    try {
      const { phoneNumber } = req.body;
      if (phoneNumber) {
        const normalizedPhone = phoneValidator.normalizePhoneNumber(phoneNumber);
        rateLimitService.clearPhoneNumberLimit(normalizedPhone);
        res.json({ message: `Rate limit cleared for ${normalizedPhone}` });
      } else {
        res.status(400).json({ message: "Phone number required" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to reset rate limit" });
    }
  });

  // SMS Test endpoint for development (protected)
  app.post("/api/sms/send", async (req, res) => {
    try {
      const { phoneNumber, message } = req.body;
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

      if (!phoneNumber || !message) {
        return res.status(400).json({ message: "Phone number and message are required" });
      }

      // Only allow in development mode with additional protection
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ message: "Test endpoint disabled in production" });
      }

      // Apply same protections as verification endpoint
      const validation = phoneValidator.validatePhoneNumber(phoneNumber);
      if (!validation.valid) {
        return res.status(400).json({ message: validation.reason || "Invalid phone number" });
      }

      const normalizedPhone = phoneValidator.normalizePhoneNumber(phoneNumber);

      const ipLimit = rateLimitService.checkIPLimit(clientIP);
      if (!ipLimit.allowed) {
        return res.status(429).json({ message: "Rate limit exceeded" });
      }

      await messagingService.sendCarpoolUpdate(normalizedPhone, message);
      console.log(`[TEST] SMS sent to ${normalizedPhone} from IP ${clientIP}`);
      res.json({ message: "SMS sent successfully" });
    } catch (error) {
      console.error("Error sending test SMS:", error);
      res.status(500).json({ message: "Failed to send SMS" });
    }
  });

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
      // Validate phone number first before processing the request
      const { phoneNumber } = req.body;
      if (phoneNumber) {
        const phoneValidation = phoneValidator.validatePhoneNumber(phoneNumber);
        if (!phoneValidation.valid) {
          return res.status(400).json({ 
            message: phoneValidation.reason || "Invalid phone number format. Please enter a valid UK phone number.",
            field: "phoneNumber"
          });
        }
      }

      // Validate request body against schema
      const validationResult = insertPartyGroupSchema.safeParse(req.body);

      if (!validationResult.success) {
        const errorMessage = fromZodError(validationResult.error).message;
        return res.status(400).json({ message: errorMessage });
      }

      const newPartyGroup = await storage.createPartyGroup(validationResult.data);

      // Send SMS confirmation to event creator
      if (newPartyGroup.phoneNumber) {
        try {
          const eventUrl = `${req.protocol}://${req.get('host')}/events/${newPartyGroup.shareableUrl}`;
          const eventDate = new Date(newPartyGroup.eventDate).toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
          });

          const confirmationMessage = `🎉 Your ${newPartyGroup.eventType} event "${newPartyGroup.name}" is live!\n\n📅 ${eventDate} at ${newPartyGroup.targetArrivalTime}\n📍 ${newPartyGroup.eventAddress}, ${newPartyGroup.eventCity}\n\n🚗 Share with parents to get carpool offers: ${eventUrl}\n\n💡 Tip: Parents can create carpool offers or request rides directly from this link!`;

          await messagingService.sendCarpoolUpdate(
            newPartyGroup.phoneNumber,
            confirmationMessage
          );

          console.log(`Event creation confirmation SMS sent to ${newPartyGroup.phoneNumber}`);
        } catch (smsError) {
          console.error("Failed to send event creation confirmation SMS:", smsError);
          // Don't fail the request if SMS fails
        }
      }

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

  app.get("/api/party-groups/by-url/:shareableUrl", async (req, res) => {
    try {
      const { shareableUrl } = req.params;
      const partyGroup = await storage.getPartyGroupByShareableUrl(shareableUrl);
      if (!partyGroup) {
        return res.status(404).json({ message: "Event not found" });
      }

      res.json(partyGroup);
    } catch (error) {
      console.error("Error fetching party group by shareable URL:", error);
      res.status(500).json({ message: "Failed to fetch event" });
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

  // Delete carpool - requires phone verification
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

      // Phone verification is required for deletion
      const { phoneNumber, verificationCode } = req.body;

      if (!phoneNumber || !verificationCode) {
        return res.status(400).json({ 
          message: "Phone verification required to delete this carpool offer.",
          requiresVerification: true,
          action: 'delete_carpool',
          carpoolPhone: carpool.phoneNumber
        });
      }

      // Verify the phone number matches the carpool creator
      const normalizedSubmittedPhone = phoneValidator.normalizePhoneNumber(phoneNumber);
      const normalizedCarpoolPhone = phoneValidator.normalizePhoneNumber(carpool.phoneNumber);

      if (normalizedSubmittedPhone !== normalizedCarpoolPhone) {
        return res.status(403).json({ 
          message: "You can only delete your own carpool offers."
        });
      }

      // Verify the SMS code
      const isVerified = await verificationService.verifyCode(normalizedSubmittedPhone, verificationCode, 'delete_carpool');

      if (!isVerified) {
        return res.status(400).json({ 
          message: "Invalid verification code. Please try again."
        });
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

      // Add debugging for carpool 52 specifically
      if (carpoolId === 52) {
        console.error(`[FORCE DEBUG ${Date.now()}] Carpool 52 requests: ${JSON.stringify(requests.map(r => ({
          childName: r.childName,
          status: r.approvalStatus,
          needsPickup: r.needsPickup,
          needsBoth: r.needsBoth
        })))}`);

        const carpool = await storage.getCarpoolById(carpoolId);
        console.error(`[FORCE DEBUG ${Date.now()}] Carpool 52 spaces: ${carpool?.spacesAvailable}`);

        const pickupRequests = requests.filter(req => (req.needsPickup || req.needsBoth) && req.approvalStatus !== 'rejected').length;
        console.error(`[FORCE DEBUG ${Date.now()}] Non-rejected pickup requests: ${pickupRequests}`);

        // Force cache bypass
        res.setHeader('Cache-Control', 'no-cache');
      }

      res.json(requests);
    } catch (error) {
      console.error("Error fetching carpool requests:", error);
      res.status(500).json({ message: "Failed to fetch carpool requests" });
    }
  });

  app.post("/api/carpool-requests", async (req, res) => {
    console.error(`[FORCE DEBUG] Carpool request received for carpool ID: ${req.body.carpoolId}`);
    console.error(`[FORCE DEBUG] Request data:`, JSON.stringify(req.body));
    try {

      // Phone verification removed for carpool requests to simplify the booking process

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

      // Count the existing requests by direction (excluding rejected requests)
      const pickupRequests = existingRequests.filter(req => (req.needsPickup || req.needsBoth) && req.approvalStatus !== 'rejected').length;
      const dropoffRequests = existingRequests.filter(req => (req.needsDropoff || req.needsBoth) && req.approvalStatus !== 'rejected').length;

      console.log(`[DEBUG] Space validation for carpool ${carpoolId}:`);
      console.log(`[DEBUG] Total existing requests: ${existingRequests.length}`);
      console.log(`[DEBUG] Pickup requests (non-rejected): ${pickupRequests} out of ${carpool.spacesAvailable} spaces`);
      console.log(`[DEBUG] Dropoff requests (non-rejected): ${dropoffRequests} out of ${carpool.returnSpacesAvailable || carpool.spacesAvailable} spaces`);
      console.log(`[DEBUG] Request statuses:`, existingRequests.map(req => `${req.childName}: ${req.approvalStatus} (pickup: ${req.needsPickup}, dropoff: ${req.needsDropoff}, both: ${req.needsBoth})`));

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
        return res.status(400).json({ 
          message: `No spaces available for pickup. Current requests: ${pickupRequests}, Available spaces: ${outboundSpaces}. Existing requests: ${existingRequests.map(r => `${r.childName}(${r.approvalStatus})`).join(', ')}` 
        });
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

      console.log(`[DEBUG] Created request with approval token: ${newRequest.approvalToken}, status: ${newRequest.approvalStatus}`);

      // Send immediate confirmation SMS to the requesting parent
      try {
        const partyGroup = await storage.getPartyGroupById(carpool.partyGroupId);
        const eventName = partyGroup?.name || 'the event';

        console.log(`[DEBUG] Sending interim confirmation SMS to requesting parent: ${validationResult.data.phoneNumber}`);
        console.log(`[DEBUG] Event: ${eventName}, Driver: ${carpool.parentName}`);

        const confirmationMessage = `Hi! Your ride request for ${validationResult.data.childName} to ${eventName} has been sent to ${carpool.parentName}. ` +
          `You'll get a confirmation message shortly once they respond. Thanks! 😊`;

        console.log(`[DEBUG] Interim SMS message: ${confirmationMessage}`);
        await messagingService.sendCarpoolUpdate(validationResult.data.phoneNumber, confirmationMessage);
        console.log(`[INFO] Interim confirmation SMS sent successfully to: ${validationResult.data.phoneNumber}`);
      } catch (smsError) {
        console.error("Failed to send interim confirmation SMS:", smsError);
        // Don't fail the request creation if SMS fails
      }

      // Send SMS approval notification to the driver
      try {
        console.log(`[DEBUG] Starting SMS approval notification process for carpool ${carpoolId}`);
        const direction = needsBoth ? "both ways" : (needsPickup ? "to event" : "from event");
        const childName = validationResult.data.childName;
        const parentName = validationResult.data.parentName;
        const approvalToken = newRequest.approvalToken;

        console.log(`[DEBUG] Request details - Child: ${childName}, Parent: ${parentName}, Direction: ${direction}`);
        console.log(`[DEBUG] Approval token: ${approvalToken}`);

        // Get party group info for context
        const partyGroup = await storage.getPartyGroupById(carpool.partyGroupId);
        const eventName = partyGroup?.name || "the event";

        console.log(`[DEBUG] Event name: ${eventName}, Driver phone: ${carpool.phoneNumber}`);

        // Create approval links
        const baseUrl = process.env.REPLIT_DOMAINS ? 
          `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 
          `http://localhost:5000`;

        const approveUrl = `${baseUrl}/a/${approvalToken}`;
        const rejectUrl = `${baseUrl}/r/${approvalToken}`;

        console.log(`[DEBUG] Approval URLs - Approve: ${approveUrl}, Reject: ${rejectUrl}`);

        // Include parent's address if driver offers home pickup/dropoff
        let addressInfo = '';
        console.log(`[DEBUG] Checking address inclusion - needsPickup: ${needsPickup}, needsDropoff: ${needsDropoff}, needsBoth: ${needsBoth}`);
        console.log(`[DEBUG] Carpool preferences - outboundDropoffPreference: ${carpool.outboundDropoffPreference}, returnDropoffPreference: ${carpool.returnDropoffPreference}`);

        const includeAddress = (
          (needsPickup && (carpool.outboundDropoffPreference === 'direct-home')) ||
          (needsDropoff && (carpool.returnDropoffPreference === 'direct-home')) ||
          (needsBoth && (carpool.outboundDropoffPreference === 'direct-home' || carpool.returnDropoffPreference === 'direct-home'))
        );

        console.log(`[DEBUG] Include address decision: ${includeAddress}`);

        if (includeAddress) {
          addressInfo = `Address: ${validationResult.data.address}, ${validationResult.data.city}, ${validationResult.data.postcode}\n`;
        }

        // Include special requirements if provided
        let requirementsInfo = '';
        if (validationResult.data.specialRequirements && validationResult.data.specialRequirements.trim()) {
          requirementsInfo = `Special requirements: ${validationResult.data.specialRequirements.trim()}\n`;
        }

        const message = `New ride request for ${eventName}:\n\n` +
          `Child: ${childName}\n` +
          `Parent: ${parentName}\n` +
          `${addressInfo}` +
          `Direction: ${direction}\n` +
          `${requirementsInfo}\n` +
          `Approve: ${approveUrl}\n` +
          `Reject: ${rejectUrl}`;

        console.log(`[DEBUG] SMS message prepared, sending to ${carpool.phoneNumber}`);
        await messagingService.sendCarpoolUpdate(carpool.phoneNumber, message);

        console.log(`[INFO] SMS approval notification sent to ${carpool.phoneNumber}`);
      } catch (smsError) {
        console.error("Failed to send SMS approval notification:", smsError);
        // Don't fail the request creation if SMS fails
      }

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

  // Short approval routes for SMS links
  app.get("/a/:token", async (req, res) => {
    req.query.action = "approve";
    return handleApproval(req, res);
  });

  app.get("/r/:token", async (req, res) => {
    req.query.action = "reject";
    return handleApproval(req, res);
  });

  // Approval handler function
  async function handleApproval(req: any, res: any) {
    try {
      const { token } = req.params;
      const { action } = req.query;

      const request = await storage.getCarpoolRequestByToken(token);
      if (!request) {
        return res.status(404).send(`
          <html>
            <head><title>Request Not Found</title></head>
            <body style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
              <h2>Request Not Found</h2>
              <p>This approval link is no longer valid or has expired.</p>
            </body>
          </html>
        `);
      }

      if (request.approvalStatus !== "pending") {
        const status = request.approvalStatus === "approved" ? "already approved" : "already rejected";
        return res.status(400).send(`
          <html>
            <head><title>Request ${status}</title></head>
            <body style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
              <h2>Request ${status}</h2>
              <p>This ride request has been ${status}.</p>
            </body>
          </html>
        `);
      }

      // Get event details for personalized messages
      const carpool = await storage.getCarpoolById(request.carpoolId);
      const partyGroup = carpool ? await storage.getPartyGroupById(carpool.partyGroupId) : null;
      const eventName = partyGroup?.name || 'the event';

      if (action === "approve") {
        await storage.approveCarpoolRequest(token);

        // Calculate and cache distance for statistics when request is approved
        if (partyGroup) {
          try {
            const { calculateAndCacheDistance } = await import('./services/distance-cache.js');
            await calculateAndCacheDistance(
              request.id,
              partyGroup.eventAddress,
              partyGroup.eventCity,
              partyGroup.eventPostcode,
              request.address,
              request.city,
              request.postcode,
              request.needsBoth || false,
              request.needsPickup || false,
              request.needsDropoff || false
            );
          } catch (distanceError) {
            console.error('Failed to calculate distance for approved request:', distanceError);
          }
        }

        // Send confirmation SMS to the parent
        try {
          // Create detailed confirmation message with pickup/dropoff details
          let pickupDetails = '';
          let dropoffDetails = '';

          // Determine pickup details based on request direction
          if (request.needsPickup || request.needsBoth) {
            if (carpool.outboundDropoffPreference === 'my-home' || carpool.outboundDropoffPreference === 'my-address') {
              pickupDetails = `Pickup: Bring ${request.childName} to ${carpool.address}, ${carpool.city}, ${carpool.postcode}`;
            } else if (carpool.outboundDropoffPreference === 'pickup-point') {
              pickupDetails = `Pickup: Meet at ${carpool.outboundPickupLocation || carpool.meetingPoint || carpool.address}`;
            } else {
              pickupDetails = `Pickup: ${request.parentName} will collect from your address`;
            }

            if (carpool.pickupTime) {
              pickupDetails += ` at ${carpool.pickupTime}`;
            }
          }

          // Determine dropoff details based on request direction
          if (request.needsDropoff || request.needsBoth) {
            if (carpool.returnDropoffPreference === 'direct-home') {
              dropoffDetails = `Dropoff: ${request.parentName} will return ${request.childName} to your address`;
            } else if (carpool.returnDropoffPreference === 'my-home' || carpool.returnDropoffPreference === 'my-address') {
              dropoffDetails = `Dropoff: Collect ${request.childName} from ${carpool.address}, ${carpool.city}, ${carpool.postcode}`;
            } else {
              dropoffDetails = `Dropoff: Collect ${request.childName} from ${carpool.meetingPoint || carpool.address}`;
            }

            if (carpool.returnCollectionTime) {
              dropoffDetails += ` around ${carpool.returnCollectionTime}`;
            }
          }

          // Add departure time information
          let departureInfo = '';
          if (carpool.estimatedDepartureTime) {
            departureInfo = `Departure: ${carpool.estimatedDepartureTime}\n`;
          }

          // Create link to view carpool details
          const carpoolLink = `${process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 'http://localhost:5000'}/events/${partyGroup.shareableUrl}`;

          const message = `Great news! ${request.parentName} has approved your ride request for ${request.childName} to ${eventName}.\n\n` +
            `${departureInfo}${pickupDetails}${pickupDetails && dropoffDetails ? '\n' : ''}${dropoffDetails}\n\n` +
            `Driver contact: ${carpool.phoneNumber}\n\n` +
            `View event details: ${carpoolLink}`;

          await messagingService.sendCarpoolUpdate(request.phoneNumber, message);
        } catch (smsError) {
          console.error("Failed to send approval confirmation SMS:", smsError);
        }

        return res.send(`
          <html>
            <head><title>Request Approved</title></head>
            <body style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
              <h2>✅ Request Approved</h2>
              <p>You have successfully approved the ride request for <strong>${request.childName}</strong> to <strong>${eventName}</strong>.</p>
              <p>The parent has been notified via SMS.</p>
            </body>
          </html>
        `);
      } else if (action === "reject") {
        await storage.rejectCarpoolRequest(token, "Rejected by driver");

        // Send rejection SMS to the parent
        try {
          const message = `${request.parentName} has declined your ride request for ${request.childName} to ${eventName}. Please try booking with another carpool.`;
          await messagingService.sendCarpoolUpdate(request.phoneNumber, message);
        } catch (smsError) {
          console.error("Failed to send rejection notification SMS:", smsError);
        }

        return res.send(`
          <html>
            <head><title>Request Rejected</title></head>
            <body style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
              <h2>❌ Request Rejected</h2>
              <p>You have rejected the ride request for <strong>${request.childName}</strong> to <strong>${eventName}</strong>.</p>
              <p>The parent has been notified via SMS.</p>
            </body>
          </html>
        `);
      } else {
        return res.status(400).send(`
          <html>
            <head><title>Invalid Action</title></head>
            <body style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
              <h2>Invalid Action</h2>
              <p>Please use the links provided in your SMS message.</p>
            </body>
          </html>
        `);
      }
    } catch (error) {
      console.error("Error processing approval:", error);
      return res.status(500).send(`
        <html>
          <head><title>Error</title></head>
          <body style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
            <h2>Error</h2>
            <p>An error occurred while processing your request. Please try again.</p>
          </body>
        </html>
      `);
    }
  }

  // Legacy approval routes for backward compatibility
  app.get("/approve/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const { action } = req.query;

      const request = await storage.getCarpoolRequestByToken(token);
      if (!request) {
        return res.status(404).send(`
          <html>
            <head><title>Request Not Found</title></head>
            <body style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
              <h2>Request Not Found</h2>
              <p>This approval link is no longer valid or has expired.</p>
            </body>
          </html>
        `);
      }

      if (request.approvalStatus !== "pending") {
        const status = request.approvalStatus === "approved" ? "already approved" : "already rejected";
        return res.status(400).send(`
          <html>
            <head><title>Request ${status}</title></head>
            <body style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
              <h2>Request ${status}</h2>
              <p>This ride request has been ${status}.</p>
            </body>
          </html>
        `);
      }

      if (action === "approve") {
        await storage.approveCarpoolRequest(token);

        // Send confirmation SMS to the parent
        try {
          const message = `Great news! Your ride request for ${request.childName} has been approved by the driver.`;
          await messagingService.sendCarpoolUpdate(request.phoneNumber, message);
        } catch (smsError) {
          console.error("Failed to send approval confirmation SMS:", smsError);
        }

        return res.send(`
          <html>
            <head><title>Request Approved</title></head>
            <body style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
              <h2>✅ Request Approved</h2>
              <p>You have successfully approved the ride request for <strong>${request.childName}</strong>.</p>
              <p>The parent has been notified via SMS.</p>
            </body>
          </html>
        `);
      } else if (action === "reject") {
        await storage.rejectCarpoolRequest(token, "Rejected by driver");

        // Send rejection SMS to the parent
        try {
          const message = `Your ride request for ${request.childName} has been declined by the driver. Please try booking with another carpool.`;
          await messagingService.sendCarpoolUpdate(request.phoneNumber, message);
        } catch (smsError) {
          console.error("Failed to send rejection notification SMS:", smsError);
        }

        return res.send(`
          <html>
            <head><title>Request Rejected</title></head>
            <body style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
              <h2>❌ Request Rejected</h2>
              <p>You have rejected the ride request for <strong>${request.childName}</strong>.</p>
              <p>The parent has been notified via SMS.</p>
            </body>
          </html>
        `);
      } else {
        return res.status(400).send(`
          <html>
            <head><title>Invalid Action</title></head>
            <body style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
              <h2>Invalid Action</h2>
              <p>Please use the links provided in your SMS message.</p>
            </body>
          </html>
        `);
      }
    } catch (error) {
      console.error("Error processing approval:", error);
      return res.status(500).send(`
        <html>
          <head><title>Error</title></head>
          <body style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
            <h2>Error</h2>
            <p>An error occurred while processing your request. Please try again.</p>
          </body>
        </html>
      `);
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

  // Security monitoring endpoint
  app.get("/api/security/stats", async (req, res) => {
    try {
      // Only show stats in development or to authenticated admins
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ message: "Access denied" });
      }

      const stats = rateLimitService.getStats();
      res.json({
        timestamp: new Date().toISOString(),
        rateLimitStats: stats,
        message: "Security monitoring active"
      });
    } catch (error) {
      res.status(500).json({ message: "Error retrieving security stats" });
    }
  });


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
      // Check if this action requires phone verification
      const { phoneNumber, verificationCode } = req.body;
      if (phoneNumber && verificationCode) {
        const normalizedPhone = phoneValidator.normalizePhoneNumber(phoneNumber);
        const isVerified = await verificationService.verifyCode(normalizedPhone, verificationCode, 'delete_event');

        if (!isVerified) {
          return res.status(400).json({ 
            message: "Phone verification required. Please verify your phone number to delete this event.",
            requiresVerification: true,
            action: 'delete_event'
          });
        }
      }

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
      // Check if this action requires phone verification
      const { phoneNumber, verificationCode } = req.body;
      if (phoneNumber && verificationCode) {
        const normalizedPhone = phoneValidator.normalizePhoneNumber(phoneNumber);
        const isVerified = await verificationService.verifyCode(normalizedPhone, verificationCode, 'edit_event');

        if (!isVerified) {
          return res.status(400).json({ 
            message: "Phone verification required. Please verify your phone number to edit this event.",
            requiresVerification: true,
            action: 'edit_event'
          });
        }
      }

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

  // Driving distance calculation endpoint
  app.post("/api/calculate-driving-distance", async (req, res) => {
    try {
      const { startCoords, endCoords } = req.body;

      if (!startCoords || !endCoords || 
          !Array.isArray(startCoords) || !Array.isArray(endCoords) ||
          startCoords.length !== 2 || endCoords.length !== 2) {
        return res.status(400).json({ error: "Invalid coordinates provided" });
      }

      const { calculateDrivingDistance } = await import("./services/directions");
      const result = await calculateDrivingDistance(startCoords, endCoords);

      if (result) {
        res.json(result);
      } else {
        res.status(404).json({ error: "No route found" });
      }
    } catch (error) {
      console.error("Driving distance calculation error:", error);
      res.status(500).json({ error: "Failed to calculate driving distance" });
    }
  });

  // Route optimization endpoint for carpool drivers
  app.post("/api/carpools/:id/optimize-route", async (req, res) => {
    try {
      const carpoolId = parseInt(req.params.id);
      if (isNaN(carpoolId)) {
        return res.status(400).json({ error: "Invalid carpool ID" });
      }

      const { startLocation, destinationLocation, direction } = req.body;

      if (!startLocation || !destinationLocation || 
          !startLocation.address || !destinationLocation.address) {
        return res.status(400).json({ 
          error: "Start and destination locations with addresses are required" 
        });
      }

      // Get carpool to verify it exists
      const carpool = await storage.getCarpoolById(carpoolId);
      if (!carpool) {
        return res.status(404).json({ error: "Carpool not found" });
      }

      // Geocode both addresses
      const { geocodeAddress } = await import("./services/distance-cache");
      
      // Geocode start location
      const startCoords = await geocodeAddress(startLocation.address, process.env.VITE_GOOGLE_MAPS_API_KEY || '');
      if (!startCoords) {
        return res.status(400).json({ error: "Could not geocode start address" });
      }

      // Geocode destination location
      const destCoords = await geocodeAddress(destinationLocation.address, process.env.VITE_GOOGLE_MAPS_API_KEY || '');
      if (!destCoords) {
        return res.status(400).json({ error: "Could not geocode destination address" });
      }

      const startLocationWithCoords = {
        ...startLocation,
        lat: startCoords.lat,
        lng: startCoords.lng
      };

      const destinationLocationWithCoords = {
        ...destinationLocation,
        lat: destCoords.lat,
        lng: destCoords.lng
      };

      const optimizedRoute = await routeOptimizationService.optimizeRouteWithDirection(
        carpoolId,
        startLocationWithCoords,
        destinationLocationWithCoords,
        direction || 'outbound'
      );

      res.json(optimizedRoute);
    } catch (error) {
      console.error("Route optimization error:", error);
      res.status(500).json({ error: "Failed to optimize route" });
    }
  });

  app.post("/api/party-groups", async (req, res) => {
    try {
      // Input sanitization
      const sanitizedBody = {
        ...req.body,
        name: req.body.name?.trim(),
        description: req.body.description?.trim(),
        eventAddress: req.body.eventAddress?.trim(),
        eventCity: req.body.eventCity?.trim(),
        eventPostcode: req.body.eventPostcode?.trim(),
        createdBy: req.body.createdBy?.trim(),
        phoneNumber: req.body.phoneNumber?.trim(),
        additionalInformation: req.body.additionalInformation?.trim()
      };

      // Validate required fields exist and are not empty after trimming
      if (!sanitizedBody.name || !sanitizedBody.eventAddress || !sanitizedBody.createdBy || !sanitizedBody.phoneNumber) {
        return res.status(400).json({ message: "Required fields cannot be empty" });
      }

      const validationResult = insertPartyGroupSchema.safeParse(sanitizedBody);
      if (!validationResult.success) {
        const errorMessage = fromZodError(validationResult.error).message;
        return res.status(400).json({ message: errorMessage });
      }

      const newPartyGroup = await storage.createPartyGroup(validationResult.data);

      // Send SMS confirmation to event creator
      if (newPartyGroup.phoneNumber) {
        try {
          const eventUrl = `${req.protocol}://${req.get('host')}/events/${newPartyGroup.shareableUrl}`;
          const eventDate = new Date(newPartyGroup.eventDate).toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
          });

          const confirmationMessage = `🎉 Your ${newPartyGroup.eventType} event "${newPartyGroup.name}" is live!\n\n📅 ${eventDate} at ${newPartyGroup.targetArrivalTime}\n📍 ${newPartyGroup.eventAddress}, ${newPartyGroup.eventCity}\n\n🚗 Share with parents to get carpool offers: ${eventUrl}\n\n💡 Tip: Parents can create carpool offers or request rides directly from this link!`;

          await messagingService.sendCarpoolUpdate(
            newPartyGroup.phoneNumber,
            confirmationMessage
          );

          console.log(`Event creation confirmation SMS sent to ${newPartyGroup.phoneNumber}`);
        } catch (smsError) {
          console.error("Failed to send event creation confirmation SMS:", smsError);
          // Don't fail the request if SMS fails
        }
      }

      res.status(201).json(newPartyGroup);
    } catch (error) {
      console.error("Error creating party group:", error);
      res.status(500).json({ message: "Failed to create party group" });
    }
  });

  app.delete("/api/party-groups/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid party group ID" });
      }

      // Get the party group to check ownership
      const partyGroup = await storage.getPartyGroupById(id);
      if (!partyGroup) {
        return res.status(404).json({ message: "Party group not found" });
      }

      // Check if user is authorized to delete (basic phone number check)
      const userPhone = req.headers['x-user-phone'] || req.body.phoneNumber;
      if (!userPhone || userPhone !== partyGroup.phoneNumber) {
        return res.status(403).json({ message: "Not authorized to delete this event" });
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

  // Statistics endpoint for Kidpool Data
  app.get("/api/statistics", async (req, res) => {
    try {
      // Get total party groups/events created
      const partyGroups = await storage.getPartyGroups();
      const totalEvents = partyGroups.length;

      // Get all carpools to count available offers
      const allCarpools = await storage.getCarpools();
      const carpoolOffers = allCarpools.length;

      // Calculate rides taken (approved carpool requests) using cached distances
      let ridesAccepted = 0;
      let totalMilesSaved = 0;

      for (const carpool of allCarpools) {
        const requests = await storage.getCarpoolRequestsByCarpoolId(carpool.id);
        const approvedRequests = requests.filter(req => req.approvalStatus === 'approved');
        ridesAccepted += approvedRequests.length;

        // Use cached distances for each approved request
        for (const request of approvedRequests) {
          const cachedDistance = await storage.getCachedDistance(request.id);
          if (cachedDistance !== null) {
            // Use the cached distance (already accounts for round-trip vs one-way)
            totalMilesSaved += cachedDistance;
          } else {
            // Fallback to estimate if no cached distance available
            const estimatedMilesPerOneWayTrip = 5;
            if (request.needsBoth) {
              totalMilesSaved += estimatedMilesPerOneWayTrip * 2;
            } else if (request.needsPickup || request.needsDropoff) {
              totalMilesSaved += estimatedMilesPerOneWayTrip;
            }
          }
        }
      }

      // Calculate CO2 emissions reduced (400g per mile)
      const co2ReductionGrams = totalMilesSaved * 400;
      const co2ReductionKg = co2ReductionGrams / 1000;

      res.json({
        totalEvents,
        carpoolOffers,
        ridesAccepted,
        milesSaved: Math.round(totalMilesSaved * 10) / 10,
        co2ReductionKg: Math.round(co2ReductionKg * 10) / 10
      });
    } catch (error) {
      console.error("Error fetching statistics:", error);
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}