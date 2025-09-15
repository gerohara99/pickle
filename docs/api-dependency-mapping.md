# API Dependency Mapping for React Migration

## Overview

This document maps current API usage patterns to inform React component architecture and state management decisions.

## Current API Architecture

### API Endpoints Inventory

```
Authentication:
==============
POST /api/v1/users/login
GET  /api/v1/users/logout
POST /api/v1/users/signup
POST /api/v1/users/forgotPassword
PATCH /api/v1/users/resetPassword/:token

User Management:
===============
GET    /api/v1/users (with pagination)
POST   /api/v1/users
PATCH  /api/v1/users/:id
DELETE /api/v1/users/:id
PATCH  /api/v1/users/updateMyPassword
PATCH  /api/v1/users/updateAcDetails

Event Management:
================
GET    /api/v1/events (with pagination, filtering)
POST   /api/v1/events
PATCH  /api/v1/events/:id
DELETE /api/v1/events/:id
POST   /api/v1/events/book
PATCH  /api/v1/events/booking/cancel
PATCH  /api/v1/events/updateMatchscore
POST   /api/v1/events/noShow

System Settings:
===============
GET   /api/v1/settings/get
PATCH /api/v1/settings/update
```

## Component → API Dependency Mapping

### Page-Level Components

#### EventListPage Dependencies

```javascript
// Direct API Calls:
GET /api/v1/events?page=1&limit=10&eventOrganiser[$regex]=search&eventOrganiser[$options]=i
DELETE /api/v1/events/:id

// API Action Functions Used:
- apiRequest (base function)
- deleteEventApiAction (from apiActions.js)

// Utility Functions:
- formatEventDate (dateUtils.js)
- validateEventId (formValidation.js)
- handleApiError (errorHandler.js)
- createLoadingState (errorHandler.js)

// State Management Needs:
- events[] array
- pagination (currentPage, totalPages)
- filters (organiser, date, active)
- loading state
- error state
- modal state (eventToDelete)

// React Hooks Needed:
- useState for component state
- useEffect for data fetching
- useCallback for event handlers
- useMemo for computed values (filteredEvents)
```

#### UserListPage Dependencies (Projected)

```javascript
// Direct API Calls:
GET /api/v1/users?page=1&limit=10
POST /api/v1/users
PATCH /api/v1/users/:id
DELETE /api/v1/users/:id

// API Action Functions:
- createUserApiAction
- editUserApiAction
- deleteUserApiAction

// Similar State Needs to EventListPage:
- users[] array
- pagination state
- filters state
- modal states (create, edit, delete)

// Additional State:
- form data for user creation/editing
- validation errors
- user role permissions
```

#### EventCreatePage Dependencies (Projected)

```javascript
// Direct API Calls:
POST /api/v1/events

// API Action Functions:
- createEventApiAction

// State Management Needs:
- form data (all event fields)
- validation errors
- loading/submitting state
- success/error feedback

// Form Fields State:
- eventName, eventOrganiser, eventDate
- eventStartTime, eventEndTime, eventLocation
- maxParticipants, eventDescription
- active status, etc.
```

### Shared Component Dependencies

#### DataTable Component

```javascript
// Props Needed (No Direct API Calls):
- data: array of objects
- columns: table configuration
- onEdit: callback function
- onDelete: callback function
- onView: callback function
- loading: boolean
- pagination: object

// No API dependencies - pure presentation component
// Parent components handle all data fetching
```

#### FilterForm Component

```javascript
// Props Needed (No Direct API Calls):
- filters: current filter state
- onFiltersChange: callback
- onReset: callback
- filterConfig: field definitions

// URL State Synchronization:
- Updates browser URL with filter parameters
- Reads initial state from URL parameters
```

#### ConfirmModal Component

```javascript
// Props Needed (No Direct API Calls):
- isOpen: boolean
- title: string
- message: string
- onConfirm: callback
- onCancel: callback
- loading: boolean (for async operations)

// No API dependencies - pure UI component
```

#### Pagination Component

```javascript
// Props Needed (No Direct API Calls):
- currentPage: number
- totalPages: number
- onPageChange: callback
- loading: boolean

// URL State Synchronization:
- Updates browser URL with page parameter
```

## API Integration Patterns

### Current Pattern Analysis

```javascript
// Current apiActions.js Pattern:
export const deleteEventApiAction = async (eventId) =>
  apiRequest({
    method: "DELETE",
    url: `/api/v1/events/${eventId}`,
    successMessage: "Event deleted successfully",
    redirect: "/events/showAll",
  });

// Issues with Current Pattern:
1. Hard-coded redirects (not React Router friendly)
2. Global success messages (not component-specific)
3. Mixed concerns (API + UI feedback)
```

### Proposed React Pattern

```javascript
// Future: Custom Hook Pattern
const useEventApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const deleteEvent = async (eventId) => {
    setLoading(true);
    setError(null);
    try {
      await apiRequest({
        method: "DELETE",
        url: `/api/v1/events/${eventId}`,
      });
      // Let component handle success feedback
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return { deleteEvent, loading, error };
};
```

## State Management Architecture

### Option 1: Component State + Custom Hooks

```javascript
// For simple apps - use React built-in state
// Each page component manages its own state
// Custom hooks handle API logic

// Example:
const EventListPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({});

  const { deleteEvent } = useEventApi();
  const { events: eventData, fetchEvents } = useEventList(filters);

  // Component logic...
};
```

### Option 2: Context + Reducers

```javascript
// For medium complexity - use React Context
// Shared state across components
// Useful for user auth, theme, etc.

// Example:
const AuthContext = createContext();
const UserContext = createContext();
const EventContext = createContext();
```

### Option 3: External State Management

```javascript
// For complex apps - use Zustand/Redux
// Global state management
// Time travel debugging, middleware support

// Example with Zustand:
const useEventStore = create((set, get) => ({
  events: [],
  filters: {},
  fetchEvents: async () => {
    const response = await apiRequest(...);
    set({ events: response.data });
  },
}));
```

## Authentication & Authorization

### Current Pattern

```javascript
// Current: Session-based authentication
// User data stored in localStorage
// Role checking in components

if (responseData.user.role === "clubAdmin") {
  landingPage = "/events/showAll";
} else {
  landingPage = "/events/myBrowse";
}
```

### React Pattern Considerations

```javascript
// Future: React Context for auth state
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state, handle login/logout
  // Provide auth state to all components

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Protected routes based on user role
const ProtectedRoute = ({ roles, children }) => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role))
    return <Navigate to="/unauthorized" />;

  return children;
};
```

## Error Handling Strategy

### Current Pattern

```javascript
// Current: Global error handler + alerts
handleApiError(err, `${method} ${url}`);
showAlert("error", errorMessage);
```

### React Pattern Options

```javascript
// Option 1: Error Boundaries
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}

// Option 2: React Query for API errors
const { data, error, isLoading } = useQuery({
  queryKey: ["events"],
  queryFn: fetchEvents,
  onError: (error) => {
    // Handle API errors consistently
  },
});
```

## Caching & Performance

### Current State

```javascript
// Current: No caching, fresh requests each time
// Cache busting with timestamps: &_cb=${Date.now()}
```

### React Optimization Opportunities

```javascript
// Option 1: React Query for caching
const { data: events } = useQuery({
  queryKey: ["events", filters],
  queryFn: () => fetchEvents(filters),
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// Option 2: SWR for data fetching
const { data, error, mutate } = useSWR(
  `/api/v1/events?${new URLSearchParams(filters)}`,
  fetcher
);

// Option 3: Manual caching with custom hooks
const useEventCache = () => {
  const [cache, setCache] = useState(new Map());

  const getCachedEvents = (key) => cache.get(key);
  const setCachedEvents = (key, data) =>
    setCache((prev) => new Map(prev.set(key, data)));

  return { getCachedEvents, setCachedEvents };
};
```

## Migration Strategy

### Phase 1: API Layer Isolation

1. Create custom hooks for each API endpoint
2. Remove hard-coded redirects from apiActions.js
3. Separate API logic from UI feedback

### Phase 2: State Management Setup

1. Choose state management approach
2. Create auth context/provider
3. Set up error boundaries

### Phase 3: Component Integration

1. Integrate API hooks into components
2. Implement proper loading states
3. Add error handling UI

### Phase 4: Performance Optimization

1. Add request caching where appropriate
2. Implement optimistic updates
3. Add request deduplication

This API dependency mapping provides a clear foundation for structuring React components and their data requirements.
