# Pickle - Application Architecture

## Overview

Pickle is a sports event management system built with Express.js and MongoDB, featuring session-based authentication and a modular frontend architecture.

## Tech Stack

### Backend

- **Runtime**: Node.js v22
- **Framework**: Express.js 4.21.2
- **Database**: MongoDB with Mongoose ODM 8.18.0
- **Authentication**: Session-based with express-session + connect-mongodb-session
- **Security**: Helmet, CORS, express-rate-limit, xss-clean, express-mongo-sanitize
- **Validation**: express-validator
- **Email**: Nodemailer
- **SMS**: Twilio

### Frontend

- **Approach**: Vanilla JavaScript with ES Modules
- **Build Tool**: Vite 5.2.0
- **CSS**: Custom modular CSS with media queries
- **Icons**: Font Awesome 5.15.4

## Project Structure

```
/Users/gerardohara/Code/Pickle/
├── app.js                    # Express app configuration
├── server.js                 # Server entry point
├── controllers/              # Request handlers (MVC pattern)
├── models/                   # Mongoose schemas
├── routes/                   # Express route definitions
├── middleware/               # Custom middleware
├── utils/                    # Server-side utilities
├── public/                   # Static assets
│   ├── html/                # Static HTML templates
│   ├── css/                 # Stylesheets
│   ├── js/                  # Client-side JavaScript
│   └── img/                 # Images and icons
├── deprecated/              # Legacy Pug templates (migration in progress)
├── tests/                   # Test files
└── docs/                    # Documentation
```

## Architecture Patterns

### Backend Architecture

#### MVC Pattern

- **Models** (`/models`): Data layer with Mongoose schemas

  - `userModel.js` - User authentication and profile data
  - `eventModel.js` - Event details, scheduling, booking data
  - `settingsModel.js` - System configuration
  - `sessionModel.js` - Session management

- **Controllers** (`/controllers`): Business logic layer

  - `authController.js` - Authentication flow
  - `eventController.js` - Event CRUD operations
  - `userController.js` - User management
  - `settingsController.js` - System settings
  - `directHtmlController.js` - Static HTML serving
  - `handlerFactory.js` - Generic CRUD operations

- **Views**: Hybrid approach
  - Static HTML files (`/public/html/`) - Current approach
  - Pug templates (`/deprecated/`) - Legacy system

#### Route Organization

- `/routes/eventRoutes.js` - Event-related endpoints
- `/routes/userRoutes.js` - User management and auth
- `/routes/settingsRoutes.js` - System configuration
- `/routes/viewRoutes.js` - HTML template routing

### Frontend Architecture

#### Module System

- **ES Modules**: Native browser modules for modern development
- **Page-specific modules**: Each major page has dedicated JavaScript
- **Shared utilities**: Common functionality in `/public/js/utils/`

#### Key Frontend Modules

- `index.js` - Global site functionality
- `eventManager.js` - Admin event management
- `browseEvents.js` - Event browsing and booking
- `schedules.js` - Schedule viewing and score management
- `apiActions.js` - Centralized API communication
- `alerts.js` - User notification system

#### Utility Organization

```
/public/js/utils/
├── paginate.js              # Client-side pagination UI
├── clientSharedLogic.js     # Common DOM manipulation
├── filterUtils.js           # Filter form handling
└── eventListeners.js       # Event delegation patterns
```

## Data Models

### User Model

- Authentication (bcrypt passwords, JWT tokens)
- Role-based access control (user, admin, clubAdmin)
- Profile information (name, email, mobile)
- Account status management

### Event Model

- Event details (name, date, time, location, organizer)
- Capacity management and booking tracking
- Schedule generation with round-robin tournaments
- Match scoring and results tracking
- Dynamic schedule recalculation for no-shows

### Settings Model

- System-wide configuration
- Default values for event creation
- Feature flags and toggles

## Authentication & Authorization

### Session-Based Authentication

- MongoDB session store for persistence
- Role-based access control
- Session timeout and security measures

### User Roles

- **User**: Basic event browsing and booking
- **Admin**: Full system administration
- **ClubAdmin**: Event management and organization

## API Design

### RESTful Endpoints

```
/api/v1/users/*          # User management and authentication
/api/v1/events/*         # Event CRUD operations
/api/v1/settings/*       # System configuration
```

### Response Format

```javascript
{
  "status": "success|fail|error",
  "data": {
    "data": {
      "doc": [...] // Actual data
    },
    "results": 10 // Count for pagination
  }
}
```

## Key Features

### Event Management

- Dynamic schedule generation using round-robin algorithms
- Real-time booking and capacity management
- Score tracking and match results
- No-show handling with automatic rescheduling

### Schedule System

- Round-based tournament scheduling
- Court assignment optimization
- Player rotation algorithms
- Standout player management (rest periods)

### Pagination Strategy

- **Server-side**: MongoDB aggregation (`/utils/paginate.js`)
- **Client-side**: UI rendering (`/public/js/utils/paginate.js`)

## Migration Status

### Pug → Static HTML Migration

The application is currently migrating from Pug templates to static HTML:

- **Legacy**: `/deprecated/` contains Pug templates
- **Current**: `/public/html/` contains static HTML files
- **Status**: Active migration, both systems coexist

### Build Process

- **Development**: Direct module loading
- **Production**: Vite bundling (configured but not fully implemented)

## Development Workflow

### Scripts

- `npm run start:dev` - Development server
- `npm run start:prod` - Production server
- `npm run build` - Vite build process
- `npm run validateSchedule` - Schedule algorithm testing

### Environment Configuration

- Development, staging, and production configurations
- Environment-specific database connections
- Feature flags for different deployment stages

## Security Measures

### Backend Security

- Helmet.js for security headers
- Rate limiting for API endpoints
- Input sanitization (XSS, NoSQL injection)
- CORS configuration
- Session security with secure cookies

### Frontend Security

- XSS prevention in DOM manipulation
- Input validation on client and server
- Secure API communication patterns

## Deployment

### Heroku Configuration

- `Procfile` for process management
- `heroku-postbuild` script for build automation
- Environment variable management
- MongoDB Atlas integration

## Performance Considerations

### Database

- Mongoose query optimization
- Indexing strategies
- Pagination for large datasets

### Frontend

- Module lazy loading patterns
- Efficient DOM manipulation
- Centralized API request handling

## Future Considerations

### Potential Improvements

1. Complete Pug → HTML migration
2. Implement full Vite bundling for production
3. Standardize API endpoints (`/api/v1/` prefix)
4. Enhance error handling and logging
5. Add comprehensive testing suite
6. Consider TypeScript migration
7. Implement WebSocket for real-time updates

### Scalability Concerns

- Database query optimization for large event datasets
- Frontend bundle size management
- Session storage scaling
- API rate limiting fine-tuning

---

_Last Updated: December 2024_
_Version: 1.0.0_
