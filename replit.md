# Carpull - Smart Carpooling Platform

## Overview

Carpull is a full-stack carpooling application designed to organize and coordinate carpools for events, particularly focused on children's activities like birthday parties, graduations, and sports events. The platform helps parents share rides, reduce travel costs, and minimize environmental impact through intelligent matching and route optimization.

## System Architecture

### Frontend Architecture
- **React 18** with TypeScript for type safety and modern component patterns
- **Vite** as the build tool for fast development and optimized production builds
- **Tailwind CSS** for utility-first styling with custom theme configuration
- **Radix UI** components providing accessible, unstyled UI primitives
- **React Query** for efficient data fetching, caching, and synchronization
- **React Router (Wouter)** for lightweight client-side routing
- **React Hook Form** with Zod validation for robust form handling

### Backend Architecture
- **Node.js** with Express server providing RESTful API endpoints
- **TypeScript** throughout the stack for consistent type safety
- **PostgreSQL** database with Drizzle ORM for type-safe database operations
- **Session-based authentication** with Express sessions (currently disabled for MVP)
- **Rate limiting** middleware for API protection (100 requests per 15 minutes)
- **SMS verification** system for phone number validation

### Database Design
- **Users**: Basic user information with phone number as primary identifier
- **Party Groups**: Event entities with location, timing, and access control
- **Carpools**: Driver offerings with capacity and direction preferences
- **Carpool Requests**: Passenger requests linked to specific carpools
- **Calendar Events**: Integration support for calendar scheduling

## Key Components

### Event Management
- **Party Group Creation**: Organizers can create events with detailed information
- **Access Control**: Events can be private (access code) or public (shareable URL)
- **Event Types**: Support for birthdays, weddings, graduations, bar/bat mitzvahs, sports, and school events
- **Multi-day Events**: Optional end dates for extended events

### Carpool Coordination
- **Driver Offerings**: Parents can offer rides with specified capacity and preferences
- **Passenger Requests**: Request system for joining existing carpools
- **Directional Flexibility**: Support for one-way (to/from event) or round-trip carpools
- **Route Optimization**: Intelligent waypoint ordering for efficient pickup/dropoff routes

### Location Services
- **Google Maps Integration**: Geocoding, directions, and interactive maps
- **Distance Calculations**: Real-time driving distance and duration estimates
- **Address Validation**: Postcode-based location verification
- **Interactive Maps**: Visual representation of carpool routes and locations

### Communication System
- **SMS Notifications**: Twilio integration for verification and updates
- **Phone Verification**: Secure SMS-based user verification
- **Calendar Integration**: Export to Google Calendar, Outlook, and ICS format
- **Shareable Links**: Easy event sharing via URLs

## Data Flow

### Event Creation Flow
1. Organizer creates event with location and timing details
2. System generates unique shareable URL and optional access code
3. SMS verification confirms organizer's phone number
4. Event becomes available for carpool creation

### Carpool Offering Flow
1. Parent accesses event via shareable URL
2. Creates carpool offer with capacity and direction preferences
3. Phone verification via SMS ensures authentic contact
4. Carpool becomes available for passenger requests

### Ride Request Flow
1. Passenger browses available carpools for an event
2. Submits request with pickup location and direction needs
3. System calculates distances and optimizes routes
4. Driver receives notification of new passenger request

### Route Optimization Flow
1. System collects all pickup/dropoff locations for a carpool
2. Calculates optimal route using Google Directions API
3. Provides turn-by-turn directions and time estimates
4. Updates dynamically as new passengers join

## External Dependencies

### Required Services
- **PostgreSQL Database**: Data persistence (can be provisioned later)
- **Google Maps API**: Geocoding, directions, and maps display
- **Twilio**: SMS messaging and phone verification
- **SendGrid**: Email notifications (configured but not actively used)

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `VITE_GOOGLE_MAPS_API_KEY`: Google Maps API credentials
- `TWILIO_ACCOUNT_SID`: Twilio account identifier
- `TWILIO_AUTH_TOKEN`: Twilio authentication token
- `TWILIO_PHONE_NUMBER`: Twilio sending phone number
- `SESSION_SECRET`: Session encryption key

### API Rate Limits
- Google Maps API: 25,000 requests per day (free tier)
- Twilio SMS: Pay-per-message pricing
- Application API: 100 requests per 15 minutes per IP

## Deployment Strategy

### Cloud Run Deployment
- **Platform**: Google Cloud Run for serverless container deployment
- **Build Process**: Vite frontend build + esbuild backend compilation
- **Port Configuration**: Internal port 5000, external port 80
- **Environment**: Production mode with optimized builds

### Development Environment
- **Hot Reload**: Vite HMR for frontend, tsx for backend auto-restart
- **Database**: PostgreSQL 16 module in Replit environment
- **Concurrent Processes**: Frontend and backend run simultaneously

### Build Configuration
- **Frontend**: Vite builds to `dist/public` directory
- **Backend**: esbuild compiles TypeScript to `dist/index.js`
- **Static Assets**: Served from build output directory
- **Production Optimizations**: Minification, tree-shaking, and bundle splitting

## Changelog

```
Changelog:
- June 13, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```