import { Express, Request, Response, NextFunction } from 'express';
import session from 'express-session';
import { storage } from './storage';
import { User as SelectUser } from '@shared/schema';

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

// Middleware to add to our storage interface
export const setupAuth = (app: Express) => {
  // Configure session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'carpool-secret-key',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );

  // Simple auth middleware - for MVP without verification
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { phoneNumber, name } = req.body;

      if (!phoneNumber || !name) {
        return res.status(400).json({ message: 'Phone number and name are required' });
      }

      // For MVP, we automatically "log in" without sending verification codes
      // In production, we would verify the phone number with WhatsApp
      
      // Check if user exists
      let user = await storage.getUserByPhoneNumber(phoneNumber);
      
      if (!user) {
        // Create a new user if they don't exist
        user = await storage.createUser({
          username: phoneNumber, // Use phone number as username for now
          password: 'placeholder', // Not used in MVP
          email: `${phoneNumber}@example.com`, // Placeholder
          name: name,
          phoneNumber: phoneNumber
        });
      }

      // Set user in session
      req.session.user = user;
      
      res.json(user);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'An error occurred during login' });
    }
  });

  // Check current user endpoint
  app.get('/api/auth/me', (req, res) => {
    if (req.session.user) {
      res.json(req.session.user);
    } else {
      res.status(401).json({ message: 'Not authenticated' });
    }
  });

  // Logout endpoint
  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(err => {
      if (err) {
        return res.status(500).json({ message: 'Logout failed' });
      }
      res.clearCookie('connect.sid');
      res.json({ message: 'Logged out successfully' });
    });
  });
};

// Helper middleware to check if user is authenticated
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  // For MVP, we'll check the session
  if (req.session.user) {
    return next();
  }
  
  // If testing with headers
  const userName = req.headers['x-user-name'];
  const userEmail = req.headers['x-user-email'];
  
  if (userName || userEmail) {
    return next();
  }
  
  res.status(401).json({ message: 'Authentication required' });
};

// Check if user is the creator of a party group
export const isPartyGroupCreator = async (req: Request, res: Response, next: NextFunction) => {
  const partyGroupId = parseInt(req.params.id);
  
  if (isNaN(partyGroupId)) {
    return res.status(400).json({ message: 'Invalid party group ID' });
  }

  // If we have a user in session, verify ownership
  if (req.session.user) {
    const partyGroup = await storage.getPartyGroupById(partyGroupId);
    
    if (!partyGroup) {
      return res.status(404).json({ message: 'Party group not found' });
    }
    
    if (partyGroup.createdBy === req.session.user.email) {
      return next();
    }
  }
  
  // For testing with headers
  const creatorEmail = req.headers['x-user-email'];
  
  if (creatorEmail) {
    const partyGroup = await storage.getPartyGroupById(partyGroupId);
    
    if (!partyGroup) {
      return res.status(404).json({ message: 'Party group not found' });
    }
    
    if (partyGroup.createdBy === creatorEmail) {
      return next();
    }
  }
  
  res.status(403).json({ message: 'Only the creator can modify this party group' });
};

// Check if user is the provider of a carpool
export const isCarpoolProvider = async (req: Request, res: Response, next: NextFunction) => {
  const carpoolId = parseInt(req.params.id);
  
  if (isNaN(carpoolId)) {
    return res.status(400).json({ message: 'Invalid carpool ID' });
  }

  // If we have a user in session, verify ownership
  if (req.session.user) {
    const carpool = await storage.getCarpoolById(carpoolId);
    
    if (!carpool) {
      return res.status(404).json({ message: 'Carpool not found' });
    }
    
    if (carpool.parentName === req.session.user.name || 
        carpool.phoneNumber === req.session.user.phoneNumber) {
      return next();
    }
  }
  
  // For testing with headers
  const providerName = req.headers['x-user-name'];
  
  if (providerName) {
    const carpool = await storage.getCarpoolById(carpoolId);
    
    if (!carpool) {
      return res.status(404).json({ message: 'Carpool not found' });
    }
    
    if (carpool.parentName === providerName) {
      return next();
    }
  }
  
  res.status(403).json({ message: 'Only the provider can modify this carpool' });
};