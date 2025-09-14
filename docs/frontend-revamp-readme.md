# Front-End Revamp Project: Complete Migration Plan

## Overview

This project involves the complete migration from Pug templates to a modern HTML/CSS/JS architecture. This document outlines the final steps needed for a full cutover to the new front-end.

## Current Status

The infrastructure for serving HTML files directly is already in place:

1. `directHtmlController.js` has been created to handle direct HTML serving
2. `app.js` has been updated to use this controller
3. Pug engine has been disabled in favor of direct HTML serving

## HTML Templates

All HTML templates should be placed in `/public/html/` directory:

### Event Management

- `browseMyEvents.html` - Personal event list
- `browseNewEvents.html` - Browse available events
- `createEvent.html` - Create new event form
- `editEvent.html` - Edit existing event
- `showAllEvents.html` - Admin view of all events
- `viewMasterSchedule.html` - View full event schedule
- `viewMySchedule.html` - View personal schedule
- `noShowEvent.html` - Error page for non-existent events

### User Management

- `createUser.html` - Admin user creation
- `editUser.html` - Edit user details
- `showAllUsers.html` - Admin view of all users
- `myAccountDetails.html` - Personal account page
- `myPasswordUpdate.html` - Change password form
- `myPasswordForgot.html` - Forgot password form
- `myPasswordReset.html` - Reset password form
- `login.html` - Login form
- `signUp.html` - New user registration

### System Pages

- `editSystemSettings.html` - System configuration
- `error.html` - General error page
- `homepage.html` - Main landing page
- `scheduleCalculator.html` - Schedule generation tool

## CSS and JavaScript Structure

### CSS Framework

The project uses a unified CSS framework in `/public/css/rallypoint.css` with:

- CSS variables for consistent theming
- Responsive design with mobile-first approach
- Component-based styling
- Role-based visibility classes
- Utility classes for common styling needs

### JavaScript Modules

JavaScript is organized into ES modules in `/public/js/`:

- `index.js` - Main entry point and initialization
- `api.js` - API request utilities
- `apiActions.js` - Specific API endpoints handling
- `buttonDelegates.js` - Event handling for buttons
- `formListeners.js` - Form submission handling
- `modal.js` - Modal dialog functionality
- `navToggle.js` - Navigation menu toggling
- `passwordValidator.js` - Password validation utilities
- `roleDetection.js` - User role detection and UI adaptation
- `scheduleCalculator.js` - Schedule generation logic
- `tabs.js` - Tab switching functionality
- `userManager.js` - User management functions
- `eventManager.js` - Event management functions

## Migration Steps

### 1. Run the Migration Helper

We've created a migration helper script to assist with this process:

```bash
# Make the script executable
chmod +x /Users/gerardohara/Code/Pickle/scripts/html-full-migration.js

# Run the migration helper
node /Users/gerardohara/Code/Pickle/scripts/html-full-migration.js
```

This script will:

1. Find existing HTML files in the project
2. Copy them to the `/public/html/` directory
3. Identify missing templates
4. Optionally create stub files for missing templates

### 2. Convert Remaining Pug Templates

For any templates that have not yet been converted to HTML:

1. Analyze the Pug template structure
2. Create an equivalent HTML file
3. Ensure all dynamic data points are handled via client-side JavaScript
4. Include all necessary CSS classes and JavaScript imports
5. Place the file in `/public/html/` directory

### 3. HTML Template Structure

Each HTML file should follow this basic structure:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Pickle - [Page Title]</title>

    <!-- Stylesheets -->
    <link rel="stylesheet" href="/css/styles.css" />
    <link rel="stylesheet" href="/css/mediaQueries.css" />
    <link rel="stylesheet" href="/css/typoGraphySystem.css" />
    <link rel="stylesheet" href="/css/rallypoint.css" />

    <!-- Favicon -->
    <link rel="icon" href="/img/favicon.png" />
    <link rel="apple-touch-icon" href="/img/apple-touch-icon.png" />
    <link rel="manifest" href="/manifest.webmanifest" />
  </head>
  <body>
    <!-- Header -->
    <header class="header">
      <!-- Navigation -->
      <!-- Will be injected by JS -->
    </header>

    <!-- Main content -->
    <main>
      <!-- Page-specific content -->
    </main>

    <!-- Footer -->
    <footer class="footer">
      <!-- Will be injected by JS -->
    </footer>

    <!-- Scripts -->
    <script type="module" src="/js/index.js"></script>
  </body>
</html>
```

### 4. Dynamic Data Handling

For pages that require dynamic data from the server:

1. Create corresponding API endpoints for data
2. Use client-side JavaScript to fetch and render data
3. For complex cases, use the `withData` function from `directHtmlController.js`

Example of data-driven API endpoint:

```javascript
// In routes/viewRoutes.js
router.get(
  "/api/html/userData/:id",
  authController.protect,
  directHtmlController.apiHandler(async (req) => {
    // Fetch and return user data
    const user = await User.findById(req.params.id);
    return {
      user: user,
    };
  })
);
```

Client-side data fetching:

```javascript
// In public/js/userManager.js
async function loadUserData(userId) {
  try {
    const response = await fetch(`/api/html/userData/${userId}`);
    const data = await response.json();
    if (data.status === "success") {
      renderUserData(data.data.user);
    }
  } catch (err) {
    console.error("Error loading user data:", err);
  }
}
```

### 5. Testing the Migration

After converting all templates:

1. Start the server with direct HTML serving:

   ```
   npm run start:dev
   ```

2. Test each route to ensure it loads the HTML file
3. Check for missing assets or broken links
4. Verify that dynamic data is correctly displayed

### 6. API Integration

The front-end communicates with the backend API at `/api/v1/` endpoints. Key integration points:

- User authentication: `/api/v1/users/login`, `/api/v1/users/signup`
- User management: `/api/v1/users`
- Event management: `/api/v1/events`
- System settings: `/api/v1/settings`

### 7. Deployment Strategy

1. Complete all HTML templates
2. Test all pages thoroughly in development environment
3. Deploy the changes in a single update
4. Monitor server logs for any errors
5. Be prepared for immediate rollback if needed

## Final Checklist

- [ ] All HTML files placed in `/public/html/`
- [ ] All routes tested with HTML files
- [ ] Dynamic data handling confirmed
- [ ] CSS and JavaScript working correctly
- [ ] API endpoints for data fetching created
- [ ] Error pages and handling working correctly
- [ ] Login and authentication flows tested
- [ ] Mobile responsiveness checked
- [ ] All assets (images, icons) loading correctly

## Key Features

1. **Responsive Design**: All pages adapt to various screen sizes
2. **Modern UI Components**: Cards, tables, modals, and forms styled consistently
3. **Password Validation**: Client-side validation with strength meter
4. **Role-Based UI**: Different views for admins vs. regular users
5. **Modular JavaScript**: ES modules with clear separation of concerns

## Browser Support

The revamped front-end is designed to work with modern browsers:

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)

Once all items in the checklist are completed, the migration will be complete and the application will be fully running on HTML files with no Pug dependency.
