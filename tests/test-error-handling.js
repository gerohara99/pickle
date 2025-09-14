/**
 * Test Error Page Handling
 * This script tests the error handling route to ensure error.html is served correctly
 */

const express = require("express");
const path = require("path");

// Import the HTML error controller
const htmlErrorController = require("./controllers/htmlErrorController");

// Create a simple test app
const app = express();
const PORT = 3333;

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// IMPORTANT: Handle specific routes BEFORE any middleware
// Direct route to handle error.html
app.get("/error.html", htmlErrorController.serveErrorPage);

// Create a route that triggers an error - DIRECT ROUTE
// Create a route that triggers an error through redirect
app.get("/test-error", (req, res) => {
  // Create an error object
  const error = {
    statusCode: 500,
    message: "Test error message",
    status: "error",
  };

  // Use the error controller to handle redirection
  htmlErrorController.redirectToErrorPage(error, req, res);
});

// Direct render route - no redirect
app.get("/direct-error", async (req, res) => {
  try {
    await htmlErrorController.serveErrorPage(
      {
        query: {
          statusCode: 500,
          message: "Direct render test error message",
          title: "Direct Error",
        },
      },
      res
    );
  } catch (err) {
    console.error("Error in direct render:", err);
    res.status(500).send("Error in direct render: " + err.message);
  }
});

// Start the server

// Start the server
app.listen(PORT, () => {
  console.log(`Test server running at http://localhost:${PORT}`);
  console.log(
    `To test error handling via redirect, visit: http://localhost:${PORT}/test-error`
  );
  console.log(
    `To test direct error rendering (no redirect), visit: http://localhost:${PORT}/direct-error`
  );
});

// Start the server
app.listen(PORT, () => {
  console.log(`Test server running at http://localhost:${PORT}`);
  console.log(
    `To test error handling, visit: http://localhost:${PORT}/test-error`
  );
});
