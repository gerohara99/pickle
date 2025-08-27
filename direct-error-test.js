/**
 * Direct Error Page Test
 * Renders the error page directly without redirects for testing
 */

const express = require("express");
const path = require("path");
const fs = require("fs").promises;

const app = express();
const PORT = 3335; // Use a different port

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Direct test route that renders the error page immediately (no redirect)
app.get("/direct-error", async (req, res) => {
  try {
    // Get error parameters
    const statusCode = 500;
    const message = "This is a custom error message for testing";
    const title = "Test Error";

    console.log(
      `Direct test: Serving error page with status=${statusCode}, message=${message}`
    );

    // Path to error.html file
    const htmlPath = path.resolve(__dirname, "views", "error.html");

    // Read the HTML file
    const html = await fs.readFile(htmlPath, "utf8");

    // Inject error data directly into the HTML
    // This skips the URL parameters and directly injects the values
    const modifiedHtml = html.replace(
      /<script>[\s\S]*?<\/script>/,
      `<script>
        document.addEventListener("DOMContentLoaded", function () {
          const errorTitle = document.getElementById("errorTitle");
          const errorMessage = document.getElementById("errorMessage");
          const goBackButton = document.getElementById("goBackButton");
          
          // Set error information directly
          errorTitle.textContent = "${title}";
          errorMessage.textContent = "${message}";
          
          // Set up go back button
          goBackButton.addEventListener("click", function () {
            window.history.back();
          });
        });
      </script>`
    );

    // Send the response
    res.send(modifiedHtml);
  } catch (err) {
    console.error("Error serving error page:", err);
    res.status(500).send("Error loading error page: " + err.message);
  }
});

// Regular test route using URL parameters
app.get("/param-error", (req, res) => {
  console.log("Parameter error route triggered");
  res.redirect(
    "/error.html?statusCode=500&message=Parameter+Test+Error+Message&title=Parameter+Error"
  );
});

// Start the server
app.listen(PORT, () => {
  console.log(`Direct error test server running at http://localhost:${PORT}`);
  console.log(
    `Test with direct HTML injection: http://localhost:${PORT}/direct-error`
  );
  console.log(`Test with URL parameters: http://localhost:${PORT}/param-error`);
});
