/**
 * Test HTML Serving
 *
 * This script tests that the HTML middleware and error controller changes
 * are working correctly.
 */

const express = require("express");
const path = require("path");
const fs = require("fs");

// Create a simple Express app
const app = express();

// Serve static files from public directory
app.use(express.static(path.join(__dirname, "public")));
app.use("/includes", express.static(path.join(__dirname, "public/includes")));

// Simple HTML middleware
app.use((req, res, next) => {
  // Skip API routes and static files
  if (
    req.path.startsWith("/api/") ||
    req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg)$/)
  ) {
    return next();
  }

  console.log(`Processing request for: ${req.path}`);

  // Special case for homepage
  let templateName;
  if (req.path === "/") {
    templateName = "homepage";
  } else if (req.path === "/error.html") {
    templateName = "error";
  } else {
    // Extract template name from path
    templateName = req.path.split("/").filter(Boolean)[0] || "homepage";
  }

  // Path to HTML file
  const htmlPath = path.join(__dirname, "views", `${templateName}.html`);

  console.log(`Looking for HTML file: ${htmlPath}`);

  // Check if file exists
  if (fs.existsSync(htmlPath)) {
    console.log(`Serving HTML file: ${templateName}.html`);
    return res.sendFile(htmlPath);
  }

  // File not found
  console.log(`HTML file not found: ${templateName}.html`);
  return res.status(404).send(`Template not found: ${templateName}.html`);
});

// Simple error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).send(`
    <html>
      <head>
        <title>Error</title>
      </head>
      <body>
        <h1>Error</h1>
        <p>${err.message || "An error occurred"}</p>
        <a href="/">Go to homepage</a>
      </body>
    </html>
  `);
});

// Start server
const PORT = process.env.PORT || 4500;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});
