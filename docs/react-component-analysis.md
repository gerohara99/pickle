# React Component Analysis

## Overview

This document maps current HTML patterns to future React components, identifies shared UI patterns, and documents API dependencies for migration planning.

## Component Inventory

### Page Components (Main Views)

```
Current HTML File → Future React Component → Current JS Manager
=============================================================
showAllEvents.html → <EventListPage /> → eventManager.js
showAllUsers.html → <UserListPage /> → userManager.js (assumed)
browseEvents.html → <EventBrowsePage /> → browseEvents.js (assumed)
myEvents.html → <MyEventsPage /> → myEvents.js (assumed)
createEvent.html → <EventCreatePage /> → createEvent.js (assumed)
editEvent.html → <EventEditPage /> → editEvent.js (assumed)
login.html → <LoginPage /> → login.js (assumed)
signup.html → <SignupPage /> → signup.js (assumed)
```

### Shared Components (Reusable UI)

```
HTML Pattern → React Component → Used In → CSS Classes
=====================================================
Filter forms → <FilterForm /> → 3+ pages → .filter-form, .form-group
Data tables → <DataTable /> → 3+ pages → .table, .table-row, .table-header
Pagination → <Pagination /> → 3+ pages → .pagination-list, .pagination-item
Delete modals → <ConfirmModal /> → 4+ pages → .modal, .modal-content
Status badges → <StatusBadge /> → 2+ pages → .status-badge, .status-badge--open
Action buttons → <ActionButton /> → All pages → .btn, .btn-icon, .btn-primary
Loading states → <LoadingSpinner /> → All data pages → .text-center
Empty states → <EmptyState /> → All lists → #emptyState
```

## Shared UI Pattern Analysis

### Tables (High Priority - Used in 3+ files)

**Current Implementation:**

- HTML: `.table`, `.table-row`, `.table-header` classes
- CSS: Estimated 45 lines of duplicated table styles
- JS: Manual DOM manipulation for row creation

**React Consolidation:**

- Component: `<DataTable columns={} data={} actions={} />`
- Props: `columns`, `data`, `onEdit`, `onDelete`, `onView`
- Benefits: Single table implementation, consistent styling

### Modals (Medium Priority - Used in 4+ files)

**Current Implementation:**

- HTML: `.modal`, `.modal-content`, `.modal-close` classes
- CSS: Estimated 30 lines of duplicated modal styles
- JS: Manual event listeners for open/close

**React Consolidation:**

- Component: `<Modal isOpen={} onClose={} title={}>{children}</Modal>`
- Variants: `<ConfirmModal />`, `<FormModal />`
- Benefits: Centralized modal logic, accessibility built-in

### Forms (High Priority - Used in 5+ files)

**Current Implementation:**

- HTML: `.filter-form`, `.form-group`, `.btn-secondary` classes
- CSS: Estimated 50 lines of duplicated form styles
- JS: Manual form handling and validation

**React Consolidation:**

- Components: `<FilterForm />`, `<EventForm />`, `<UserForm />`
- Shared: `<FormField />`, `<FormActions />`
- Benefits: Consistent validation, error handling

### Navigation (Critical - Used in all files)

**Current Implementation:**

- HTML: Header and nav elements repeated in each file
- CSS: Navigation styles duplicated
- JS: Manual active state management

**React Consolidation:**

- Components: `<AppHeader />`, `<Navigation />`, `<Layout />`
- Benefits: Single source of truth for navigation, role-based rendering

## API Dependencies Mapping

### EventListPage Dependencies

```javascript
Required APIs:
- GET /api/v1/events (with pagination, filtering)
- DELETE /api/v1/events/:id
- Uses: apiRequest, deleteEventApiAction

Required Utils:
- formatEventDate (from dateUtils.js)
- validateEventId (from formValidation.js)
- handleApiError (from errorHandler.js)
```

### UserListPage Dependencies

```javascript
Required APIs:
- GET /api/v1/users (with pagination, filtering)
- POST /api/v1/users
- PATCH /api/v1/users/:id
- DELETE /api/v1/users/:id
- Uses: createUserApiAction, editUserApiAction, deleteUserApiAction
```

### Shared Component APIs

```javascript
<FilterForm />:
- No direct API calls
- Passes filter state to parent components

<DataTable />:
- No direct API calls
- Receives data via props

<ConfirmModal />:
- No direct API calls
- Triggers callbacks passed via props
```

## Migration Priority Order

### Phase A: Foundation Components (Weeks 1-2)

1. `<Layout />` - App shell with header/nav
2. `<DataTable />` - Most reused component
3. `<Modal />` family - Critical for user interactions
4. `<FilterForm />` - Used across list pages

### Phase B: Page Components (Weeks 3-5)

1. `<LoginPage />` - Simplest, standalone
2. `<EventListPage />` - Already has eventManager.js foundation
3. `<UserListPage />` - Similar to EventListPage
4. `<EventBrowsePage />` - Public-facing, simpler state

### Phase C: Complex Features (Weeks 6-8)

1. `<EventCreatePage />` - Complex form handling
2. `<EventEditPage />` - Form + existing data
3. `<SchedulePage />` - Complex data relationships
4. `<ReportsPage />` - If exists, analytics/charts

## CSS Consolidation Plan

### Current Duplication Estimate

```
Component Type → Duplicate CSS Lines → Consolidation Benefit
===============================================================
Tables → ~45 lines → High (3+ files affected)
Modals → ~30 lines → Medium (4+ files affected)
Forms → ~50 lines → High (5+ files affected)
Buttons → ~35 lines → High (All files affected)
Navigation → ~40 lines → Critical (All files affected)
Layout → ~25 lines → Medium (All files affected)

Total Estimated Reduction: ~225 lines of duplicate CSS
```

### CSS Module Strategy

```
Current: Global CSS files (rallypoint.css)
Future: CSS Modules per component
- EventListPage.module.css
- DataTable.module.css
- Modal.module.css
- etc.
```

## Build Process Updates Needed

### Current Build (Vite)

```javascript
// vite.config.js updates needed:
- Add React plugin
- Configure CSS modules
- Set up React Fast Refresh
- Configure JSX transform
```

### Dependencies to Add

```javascript
// React ecosystem
"react": "^18.x",
"react-dom": "^18.x",
"@vitejs/plugin-react": "^4.x",

// Routing (if SPA)
"react-router-dom": "^6.x",

// State management (if needed)
"zustand": "^4.x" // or Redux Toolkit
```

## Risk Assessment

### Low Risk Components

- `<StatusBadge />` - Pure presentational
- `<LoadingSpinner />` - No state/logic
- `<EmptyState />` - Static content

### Medium Risk Components

- `<DataTable />` - Complex props, sorting, actions
- `<FilterForm />` - State management, URL sync
- `<Pagination />` - URL state synchronization

### High Risk Components

- `<EventCreatePage />` - Complex form validation, file uploads
- `<SchedulePage />` - Complex data relationships, real-time updates
- Navigation/Auth - Role-based rendering, session management

## Success Metrics

### Code Quality

- Reduce CSS duplication by ~225 lines
- Eliminate HTML template duplication
- Centralize UI logic in reusable components

### Developer Experience

- Faster feature development with reusable components
- Better error boundaries and debugging
- Hot reloading for faster iteration

### User Experience

- Consistent UI/UX across all pages
- Better performance with React optimizations
- Improved accessibility with semantic components
