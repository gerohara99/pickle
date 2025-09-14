# HTML Migration Guide

This document explains the migration from Pug templates to pure HTML and provides guidance on how to work with the new HTML-based system.

## Migration Overview

The Pickle application has been migrated from Pug templates to pure HTML. This migration includes:

1. Converting all Pug templates to HTML
2. Converting Pug includes to HTML partials
3. Updating routes to use the directHtmlController
4. Creating client-side JavaScript modules to handle dynamic content

## Directory Structure

- `/views/*.html` - HTML templates for each page
- `/public/includes/*.html` - HTML partials/components used across pages
- `/public/js/*.js` - Client-side JavaScript modules
- `/controllers/directHtmlController.js` - Controller for serving HTML files

## How It Works

### Server-Side

1. The `directHtmlController` handles serving HTML files and injecting data
2. Data is injected into HTML files via `window.templateData`
3. Routes in `viewRoutes.js` use `serveHtmlWithData` to inject data into templates

Example route:

```javascript
router.get(
  "/me/myAccountDetails",
  authController.protect,
  directHtmlController.serveHtmlWithData("myAccountDetails", async (req) => {
    return {
      title: "Account Details",
      user: req.session.user,
      userRole: req.session.user.userRole,
      userName: req.session.user.userName,
      showNav: true,
    };
  })
);
```

### Client-Side

1. HTML files include necessary scripts and styles
2. HTML files use `fetch()` to load includes like header and footer
3. Client-side JavaScript accesses `window.templateData` to get data from the server

Example HTML template:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <!-- Meta tags, styles, etc. -->
    <title>Page Title</title>
  </head>
  <body>
    <!-- Header will be included dynamically -->
    <div id="header-placeholder"></div>

    <main>
      <!-- Page content -->
    </main>

    <!-- Template data script will be injected here by the server -->
    <script>
      // This will be populated by server with actual data
      window.templateData = window.templateData || {};
    </script>

    <!-- Load header component -->
    <script>
      fetch("/includes/header.html")
        .then((response) => response.text())
        .then((data) => {
          document.getElementById("header-placeholder").innerHTML = data;
        });
    </script>

    <!-- Page-specific script -->
    <script src="/js/pageSpecific.js"></script>
  </body>
</html>
```

## Template Data Utility

A utility module has been created to help work with template data:

```javascript
// Import the utility
import { getTemplateValue, getCurrentUser } from "/js/templateData.js";

// Use in your code
const user = getCurrentUser();
const title = getTemplateValue("title", "Default Title");
```

## HTML Includes

HTML includes are available in `/public/includes/` and can be loaded using fetch:

```javascript
fetch("/includes/header.html")
  .then((response) => response.text())
  .then((data) => {
    document.getElementById("header-placeholder").innerHTML = data;
  });
```

## Creating New Pages

To create a new page:

1. Create a new HTML file in `/views/`
2. Create any necessary client-side JavaScript in `/public/js/`
3. Add a route in `/routes/viewRoutes.js` using `directHtmlController.serveHtmlWithData`

## Verification

Use the HTML migration helper script to verify the migration status:

```bash
node scripts/html-migration-helper.js check
```

## Troubleshooting

- If includes aren't loading, check the browser console for network errors
- If data isn't available in the template, check the route handler
- If navigation isn't working, check the header include and its scripts

## Next Steps

- Clean up any unused Pug files once the HTML system is confirmed working
- Enhance client-side JavaScript modules for better code organization
- Consider implementing a client-side routing system for smoother navigation
