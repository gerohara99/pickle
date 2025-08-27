/**
 * Simple Error Page Test
 * A minimal test for the error page without any middlewares
 */

const express = require("express");
const path = require("path");
const fs = require("fs").promises;

const app = express();
const PORT = 3334; // Use a different port

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Direct error page handler
app.get("/error.html", async (req, res) => {
  try {
    // Get query parameters
    const statusCode = req.query.statusCode || 500;
    const message = req.query.message || "An unexpected error occurred";
    const title = req.query.title || "Error";

    console.log(
      `Simple test: Serving error page with status=${statusCode}, message=${message}`
    );

    // Path to error.html file
    const htmlPath = path.resolve(__dirname, "views", "error.html");

    // Read the HTML file
    const html = await fs.readFile(htmlPath, "utf8");

    // Inject error data
    const dataScript = `<script>
      window.templateData = {
        title: "${title.replace(/"/g, '\\"')}",
        message: "${message.replace(/"/g, '\\"')}",
        statusCode: ${statusCode}
      };
    </script>`;

    const modifiedHtml = html.replace("</head>", `${dataScript}</head>`);

    // Send the response
    res.send(modifiedHtml);
  } catch (err) {
    console.error("Error serving error page:", err);
    res.status(500).send("Error loading error page");
  }
});

// Test error route
app.get("/test-error", (req, res) => {
  console.log("Simple test: Error route triggered");
  res.redirect(
    "/error.html?statusCode=500&message=Test+error+message&title=Server+Error"
  );
});

// Start the server
app.listen(PORT, () => {
  console.log(`Simple test server running at http://localhost:${PORT}`);
  console.log(`Test the error page at: http://localhost:${PORT}/test-error`);
});
