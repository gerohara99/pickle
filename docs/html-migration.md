# Front-End Migration: Pug to HTML

This document describes the process of migrating from Pug templates to static HTML files in the Pickle application.

## Architecture Overview

The application now supports both Pug templates and HTML files, allowing for a gradual migration:

1. **HTML Fallback Mechanism**: For each route, the system checks if an HTML file exists before falling back to Pug rendering
2. **Dual Location Support**: HTML files can be placed in either `/views/` or `/public/html/` directories
3. **Configurable**: The migration can be controlled via the `USE_HTML_FALLBACK` environment variable
4. **Data Injection**: HTML files can receive data from the server for dynamic content

## HTML File Locations

HTML files can be placed in two locations:

- `/public/html/`: Primary location for HTML files (recommended for new files)
- `/views/`: Secondary location, checked if a file is not found in `/public/html/`

## Migration Process

1. **Enable HTML Fallback**: Make sure `USE_HTML_FALLBACK=true` in `config.env`
2. **Convert Pug Templates**: Convert each Pug template to an equivalent HTML file
3. **Place HTML Files**: Store HTML files in `/public/html/` directory
4. **Test Both Versions**: The system will serve HTML files when available, falling back to Pug

## Naming Conventions

HTML files should follow the same naming convention as Pug templates:

- `homepage.pug` → `homepage.html`
- `showAllUsers.pug` → `showAllUsers.html`
- etc.

## Data Injection

For routes that need dynamic data:

1. **Use `htmlViewHandler`**: This helper injects data into HTML files
2. **Access via `window.templateData`**: Data is available in the browser via this global variable
3. **API Endpoints**: For fully client-side rendering, use the `jsonDataHandler` to create API endpoints

## Testing the Migration

1. Rename or remove an HTML file to test the fallback to Pug
2. Set `USE_HTML_FALLBACK=false` in `config.env` to disable HTML serving entirely
3. Check server logs for messages about which files are being served

## Fully Migrated Routes

For routes that are fully migrated to HTML:

```javascript
// Direct HTML serving
router.get("/html/login", htmlViewController.serveHtmlFile("login"));

// HTML with data injection
router.get(
  "/html/editUser/:id",
  authController.protect,
  htmlViewController.htmlViewHandler("editUser", dataHandler)
);
```
