# React Architecture Plan

## Overview

This document defines the architectural decisions and implementation strategy for migrating from the current multi-page application to a React-based single-page application.

## Architecture Decision Record (ADR)

### ADR-001: Application Architecture Pattern

**Decision:** Single Page Application (SPA) with React Router
**Status:** Approved
**Context:** Current app uses server-rendered pages with client-side JavaScript managers
**Consequences:**

- ✅ Better user experience with faster navigation
- ✅ Shared state between pages
- ✅ Component reusability
- ❌ SEO considerations (mitigated with proper meta tags)
- ❌ Initial bundle size (mitigated with code splitting)

### ADR-002: State Management Strategy

**Decision:** Hybrid approach - React built-in state + Context for global state
**Status:** Approved
**Alternatives Considered:**

- Redux Toolkit (too complex for current needs)
- Zustand (good option for future scaling)
  **Rationale:**
- Current app has moderate state complexity
- Most state is page-specific
- Global state needed for: auth, theme, notifications

### ADR-003: Routing Strategy

**Decision:** Client-side routing with React Router v6
**Status:** Approved
**Context:** Replace current server routing with client-side navigation
**Implementation:**

- Nested routes for admin vs. user sections
- Protected routes based on user roles
- URL state synchronization for filters/pagination

### ADR-004: CSS Strategy

**Decision:** CSS Modules + Global utilities
**Status:** Approved
**Context:** Consolidate ~225 lines of duplicate CSS
**Implementation:**

- Component-scoped styles with CSS Modules
- Global utility classes preserved
- CSS custom properties for design tokens

### ADR-005: Build Process

**Decision:** Keep Vite, add React plugin
**Status:** Approved
**Rationale:**

- Current Vite setup works well
- Easy to add React support
- Fast hot reloading for development

## Application Structure

### Directory Structure

```
/Users/gerardohara/Code/Pickle/src/
├── components/
│   ├── ui/                     # Reusable UI components
│   │   ├── Button/
│   │   ├── DataTable/
│   │   ├── Modal/
│   │   ├── Pagination/
│   │   └── StatusBadge/
│   ├── forms/                  # Form-specific components
│   │   ├── FilterForm/
│   │   ├── EventForm/
│   │   └── UserForm/
│   └── layout/                 # Layout components
│       ├── Header/
│       ├── Navigation/
│       └── Layout/
├── pages/                      # Page-level components
│   ├── auth/
│   │   ├── LoginPage/
│   │   └── SignupPage/
│   ├── events/
│   │   ├── EventListPage/
│   │   ├── EventCreatePage/
│   │   ├── EventEditPage/
│   │   └── EventBrowsePage/
│   └── users/
│       └── UserListPage/
├── hooks/                      # Custom React hooks
│   ├── useAuth.js
│   ├── useApi.js
│   ├── useEventList.js
│   └── usePagination.js
├── context/                    # React Context providers
│   ├── AuthContext.js
│   ├── ThemeContext.js
│   └── NotificationContext.js
├── services/                   # API and external services
│   ├── api.js
│   ├── auth.js
│   └── events.js
├── utils/                      # Utility functions (migrated)
│   ├── dateUtils.js
│   ├── formValidation.js
│   └── errorHandler.js
├── styles/                     # Global styles
│   ├── design-tokens.css
│   ├── global-utilities.css
│   └── reset.css
├── App.jsx                     # Root component
├── main.jsx                    # Application entry point
└── router.jsx                  # Route configuration
```

### Component Hierarchy

```
App
├── AuthProvider
│   ├── ThemeProvider
│   │   ├── NotificationProvider
│   │   │   ├── Router
│   │   │   │   ├── Layout
│   │   │   │   │   ├── Header
│   │   │   │   │   ├── Navigation
│   │   │   │   │   └── Outlet (page content)
│   │   │   │   └── ProtectedRoute
│   │   │   │       └── [Page Components]
│   │   │   └── ErrorBoundary
```

## State Management Architecture

### Global State (React Context)

```javascript
// AuthContext - User authentication state
{
  user: { id, name, email, role },
  isAuthenticated: boolean,
  loading: boolean,
  login: (credentials) => Promise,
  logout: () => void
}

// NotificationContext - App-wide notifications
{
  notifications: [],
  addNotification: (message, type) => void,
  removeNotification: (id) => void
}

// ThemeContext - UI theme state (future)
{
  theme: 'light' | 'dark',
  toggleTheme: () => void
}
```

### Page-Level State (useState + Custom Hooks)

```javascript
// EventListPage state example
const EventListPage = () => {
  // Local component state
  const [filters, setFilters] = useState({});
  const [selectedEvents, setSelectedEvents] = useState([]);

  // Custom hooks for API logic
  const { events, loading, error, fetchEvents, deleteEvent } =
    useEventList(filters);
  const { currentPage, totalPages, goToPage } = usePagination();

  // Component logic...
};
```

### Custom Hooks Strategy

```javascript
// useEventList hook encapsulates event-related API logic
const useEventList = (filters) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.getEvents(filters);
      setEvents(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const deleteEvent = async (eventId) => {
    await api.deleteEvent(eventId);
    fetchEvents(); // Refresh list
  };

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { events, loading, error, fetchEvents, deleteEvent };
};
```

## Routing Configuration

### Route Structure

```javascript
// router.jsx
const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      // Public routes
      { index: true, element: <HomePage /> },
      { path: "login", element: <LoginPage /> },
      { path: "signup", element: <SignupPage /> },

      // Protected routes
      {
        path: "events",
        element: <ProtectedRoute roles={["user", "clubAdmin"]} />,
        children: [
          { path: "browse", element: <EventBrowsePage /> },
          { path: "my", element: <MyEventsPage /> },
        ],
      },

      // Admin-only routes
      {
        path: "admin",
        element: <ProtectedRoute roles={["clubAdmin"]} />,
        children: [
          { path: "events", element: <EventListPage /> },
          { path: "events/create", element: <EventCreatePage /> },
          { path: "events/edit/:id", element: <EventEditPage /> },
          { path: "users", element: <UserListPage /> },
        ],
      },
    ],
  },
]);
```

### Route Protection

```javascript
// ProtectedRoute component
const ProtectedRoute = ({ roles, children }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) return <LoadingSpinner />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};
```

## API Integration Layer

### Service Layer Architecture

```javascript
// services/api.js - Base API service
class ApiService {
  constructor(baseURL = "/api/v1") {
    this.baseURL = baseURL;
  }

  async request(method, url, data = null) {
    try {
      const response = await fetch(`${this.baseURL}${url}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) throw new Error(`${method} ${url} failed`);
      return await response.json();
    } catch (error) {
      // Centralized error handling
      throw error;
    }
  }

  get(url) {
    return this.request("GET", url);
  }
  post(url, data) {
    return this.request("POST", url, data);
  }
  patch(url, data) {
    return this.request("PATCH", url, data);
  }
  delete(url) {
    return this.request("DELETE", url);
  }
}

// services/events.js - Event-specific API methods
class EventService extends ApiService {
  getEvents(filters = {}, pagination = {}) {
    const params = new URLSearchParams({ ...filters, ...pagination });
    return this.get(`/events?${params}`);
  }

  createEvent(eventData) {
    return this.post("/events", eventData);
  }

  updateEvent(id, eventData) {
    return this.patch(`/events/${id}`, eventData);
  }

  deleteEvent(id) {
    return this.delete(`/events/${id}`);
  }
}
```

### Error Handling Strategy

```javascript
// utils/errorHandler.js - Enhanced for React
export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export const handleApiError = (error) => {
  if (error.status === 401) {
    // Redirect to login
    window.location.href = "/login";
  }

  // Return user-friendly error message
  return error.data?.message || "An unexpected error occurred";
};
```

## Performance Optimization Strategy

### Code Splitting

```javascript
// Lazy load page components
const EventListPage = lazy(() => import('../pages/events/EventListPage'));
const UserListPage = lazy(() => import('../pages/users/UserListPage'));

// Route-based code splitting
{
  path: "admin/events",
  element: (
    <Suspense fallback={<LoadingSpinner />}>
      <EventListPage />
    </Suspense>
  )
}
```

### Bundle Optimization

```javascript
// vite.config.js - Bundle splitting
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          api: ["./src/services/api.js", "./src/services/events.js"],
          ui: ["./src/components/ui"],
        },
      },
    },
  },
});
```

### React Optimizations

```javascript
// Memoization for expensive computations
const filteredEvents = useMemo(() => {
  return events.filter((event) => matchesFilters(event, filters));
}, [events, filters]);

// Callback memoization for child components
const handleEventDelete = useCallback(
  (eventId) => {
    deleteEvent(eventId);
  },
  [deleteEvent]
);

// Component memoization for pure components
const EventCard = memo(({ event, onEdit, onDelete }) => {
  // Component implementation
});
```

## Testing Strategy

### Testing Architecture

```
Testing Layers:
==============
1. Unit Tests - Individual components and utilities
2. Integration Tests - Component interactions and API calls
3. E2E Tests - Critical user journeys

Tools:
======
- Vitest (unit/integration testing)
- React Testing Library (component testing)
- Playwright (E2E testing)
```

### Testing Examples

```javascript
// EventListPage.test.jsx
import { render, screen, waitFor } from "@testing-library/react";
import { EventListPage } from "./EventListPage";

test("displays loading state initially", () => {
  render(<EventListPage />);
  expect(screen.getByText("Loading...")).toBeInTheDocument();
});

test("displays events after loading", async () => {
  render(<EventListPage />);
  await waitFor(() => {
    expect(screen.getByText("Test Event")).toBeInTheDocument();
  });
});
```

## Migration Timeline

### Phase A: Foundation (Weeks 1-2)

**Week 1:**

- Set up React development environment
- Create base components (Layout, Navigation, Button)
- Implement routing structure
- Set up authentication context

**Week 2:**

- Create shared UI components (DataTable, Modal, Form components)
- Implement error boundaries and loading states
- Set up testing framework
- Create utility hooks (useApi, useAuth)

### Phase B: Core Pages (Weeks 3-5)

**Week 3:**

- Migrate LoginPage and SignupPage
- Implement protected routing
- Create EventListPage with full functionality

**Week 4:**

- Migrate UserListPage
- Create EventBrowsePage for public users
- Implement pagination and filtering

**Week 5:**

- Create EventCreatePage and EventEditPage
- Implement form validation and error handling
- Add confirmation modals and success feedback

### Phase C: Advanced Features (Weeks 6-8)

**Week 6:**

- Migrate complex features (scheduling, scoring)
- Implement real-time updates if needed
- Add advanced error handling and retry logic

**Week 7:**

- Performance optimization
- Code splitting and bundle optimization
- Comprehensive testing

**Week 8:**

- User acceptance testing
- Bug fixes and polish
- Deployment preparation

## Deployment Strategy

### Build Process

```javascript
// package.json - Updated scripts
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:e2e": "playwright test",
    "build:analyze": "vite build --mode analyze"
  }
}
```

### Environment Configuration

```javascript
// .env files for different environments
// .env.development
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_APP_ENV=development

// .env.production
VITE_API_BASE_URL=/api/v1
VITE_APP_ENV=production
```

### Progressive Migration

1. **Parallel Development:** Build React components alongside existing pages
2. **Feature Flagging:** Use feature flags to toggle between old/new implementations
3. **Gradual Rollout:** Migrate pages one at a time
4. **Fallback Strategy:** Keep existing pages as fallback during transition

## Success Metrics

### Technical Metrics

- **Bundle Size:** Target < 200KB initial bundle
- **Performance:** First Contentful Paint < 1.5s
- **Code Quality:** Test coverage > 80%
- **CSS Reduction:** Eliminate 225+ lines of duplicate CSS

### User Experience Metrics

- **Page Load Time:** Reduce by 40% after initial load
- **Navigation Speed:** Instant navigation between pages
- **Error Rates:** Reduce client-side errors by 50%
- **Mobile Performance:** Improve mobile lighthouse score to 90+

### Developer Experience Metrics

- **Development Speed:** 30% faster feature development
- **Bug Reduction:** Fewer UI-related bugs due to component reusability
- **Code Maintainability:** Easier to modify and extend components

This architecture plan provides a comprehensive roadmap for the React migration, ensuring scalability, maintainability, and optimal user experience.
