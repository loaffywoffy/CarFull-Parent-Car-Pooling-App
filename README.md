
# Carpull - Smart Carpooling Platform

A modern, full-stack carpooling application built with React, TypeScript, Node.js, and PostgreSQL. Carpull helps organize carpools for events, reducing travel costs and environmental impact through intelligent ride-sharing coordination.

## 🚗 Features

### Core Functionality
- **Event Management**: Create and manage carpooling events with detailed scheduling
- **Smart Matching**: Automatically match drivers and passengers based on location and preferences
- **Real-time Communication**: SMS notifications for carpool updates and confirmations
- **Route Optimization**: Calculate optimal pickup/dropoff routes (coming soon)
- **Location Services**: Interactive maps with Google Maps integration
- **Phone Verification**: Secure SMS-based user verification

### User Types
- **Event Organizers**: Create and manage carpool events
- **Drivers**: Offer rides with capacity and route preferences
- **Passengers**: Request rides with pickup/dropoff requirements

### Technical Features
- Responsive web design optimized for mobile and desktop
- Real-time distance calculations and caching
- Environmental impact tracking (CO2 savings)
- Calendar integration for event scheduling
- Comprehensive admin dashboard with metrics

## 🛠 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Radix UI** components for accessible UI
- **React Query** for data fetching and caching
- **React Router** for navigation

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **PostgreSQL** database
- **Drizzle ORM** for database operations
- **JWT** authentication

### Services & APIs
- **Google Maps API** (Geocoding, Directions, Maps JavaScript)
- **SMS Service** for notifications
- **Rate Limiting** for API protection

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL database
- Google Cloud Platform account (for Maps API)
- SMS service credentials (optional)

### Installation

1. **Clone and setup**:
   ```bash
   git clone <your-repo-url>
   cd carpull
   npm install
   ```

2. **Configure environment variables**:
   Set up the following secrets in your Replit environment or `.env` file:
   
   ```env
   # Database
   DATABASE_URL=postgresql://username:password@host:port/database
   
   # Google Maps
   VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   
   # SMS (optional)
   SMS_API_KEY=your_sms_service_api_key
   SMS_API_SECRET=your_sms_service_secret
   
   # JWT
   JWT_SECRET=your_jwt_secret_key
   
   # App URLs
   VITE_API_BASE_URL=http://localhost:5000
   VITE_APP_BASE_URL=http://localhost:5173
   ```

3. **Setup Google Cloud APIs**:
   Enable these APIs in Google Cloud Console:
   - Maps JavaScript API
   - Geocoding API
   - Directions API
   - Places API (optional)

4. **Database setup**:
   ```bash
   npx drizzle-kit push:pg
   ```

5. **Start development server**:
   ```bash
   npm run dev
   ```

The app will be available at `http://localhost:5173`

## 📱 Usage Guide

### For Event Organizers
1. **Create Event**: Set up your event with date, time, and location
2. **Share Link**: Send the unique event link to participants
3. **Monitor Carpools**: Track ride requests and approvals
4. **View Analytics**: See environmental impact and participation metrics

### For Participants
1. **Join Event**: Use the shared link to access the event
2. **Offer/Request Ride**: Choose to drive or request a ride
3. **Set Preferences**: Specify pickup/dropoff locations and timing
4. **Get Matched**: Receive SMS notifications when matched
5. **Coordinate**: Contact your carpool partners directly

## 🏗 Project Structure

```
carpull/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Route components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utilities and services
│   │   └── api/           # API client functions
├── server/                # Node.js backend
│   ├── services/          # Business logic services
│   ├── routes.ts          # API route definitions
│   ├── db.ts             # Database configuration
│   └── index.ts          # Server entry point
├── shared/               # Shared TypeScript schemas
└── package.json
```

## 🔧 Configuration

### Database Schema
The app uses Drizzle ORM with PostgreSQL. Key tables:
- `party_groups` - Event information
- `carpools` - Driver offerings
- `carpool_requests` - Passenger requests
- `distance_cache` - Cached route calculations

### API Routes
- `/api/party-groups` - Event management
- `/api/carpools` - Carpool operations
- `/api/requests` - Request handling
- `/api/statistics` - Analytics data

### Environment Configuration
All configuration is handled through environment variables. See the Quick Start section for required variables.

## 🌍 Deployment

### Replit Deployment
This template is optimized for Replit deployment:

1. **Fork the template** on Replit
2. **Configure secrets** in the Replit environment
3. **Connect database** using Replit's PostgreSQL service
4. **Deploy** using Replit's deployment feature

### Custom Domain Setup
1. Configure DNS records for your domain
2. Add both root domain and www subdomain in deployment settings
3. SSL certificates are automatically provisioned

## 📊 Features in Detail

### Smart Route Matching
- Calculates driving distances between participants
- Optimizes pickup/dropoff sequences
- Caches route data for performance

### SMS Notifications
- Phone number verification
- Carpool approval confirmations
- Emergency contact notifications
- Rate-limited to prevent abuse

### Environmental Impact
- Tracks miles saved through carpooling
- Calculates CO2 emissions reduction
- Displays community impact metrics

### Security Features
- JWT-based authentication
- Phone verification system
- Rate limiting on API endpoints
- Input validation and sanitization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.

## 🆘 Support

For questions, issues, or feature requests:
1. Check the existing issues
2. Create a new issue with detailed information
3. Include steps to reproduce any bugs

## 🔮 Roadmap

- [ ] Advanced route optimization algorithms
- [ ] In-app messaging system
- [ ] Calendar integration (Google Calendar, Outlook)
- [ ] Payment splitting features
- [ ] Mobile app (React Native)
- [ ] Multi-language support
- [ ] Integration with ride-sharing services

---

**Built with ❤️ for sustainable transportation and community building.**
