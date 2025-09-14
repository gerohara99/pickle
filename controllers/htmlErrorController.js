/**
 * HTML Error Controller
 *
 * This controller handles the error.html page and error routes.
 */
const path = require("path");
const fs = require("fs").promises;

/**
 * Serve the error.html page with query parameters
 */
exports.serveErrorPage = async (req, res) => {
  try {
    // Get query parameters
    const statusCode = req.query.statusCode || 500;
    const message = req.query.message || "An unexpected error occurred";
    const title = req.query.title || "Error";

    // Path to error.html file
    const htmlPath = path.resolve(process.cwd(), "public/html", "error.html");

    console.log(
      `Serving error page from: ${htmlPath} with status=${statusCode}, message=${message}`
    );

    try {
      // Check if file exists
      await fs.access(htmlPath);

      // Read the HTML file
      let html = await fs.readFile(htmlPath, "utf8");

      // Inject error data two ways to ensure it's accessible:
      // 1. As window.templateData (for compatibility with existing code)
      // 2. By directly overriding the error handler script

      // Method 1: Add templateData
      const dataScript = `<script>
        window.templateData = {
          title: "${title.replace(/"/g, '\\"')}",
          message: "${message.replace(/"/g, '\\"')}",
          statusCode: ${statusCode}
        };
      </script>`;

      // Method 2: Override the DOMContentLoaded handler
      const directScript = `<script>
        // Direct error data injection
        document.addEventListener("DOMContentLoaded", function() {
          const errorTitle = document.getElementById("errorTitle");
          const errorMessage = document.getElementById("errorMessage");
          
          if (errorTitle) errorTitle.textContent = "${title.replace(/"/g, '\\"')}";
          if (errorMessage) errorMessage.textContent = "${message.replace(/"/g, '\\"')}";
          
          console.log("Error data injected directly into page elements");
        });
      </script>`;

      // Inject both scripts
      html = html.replace("</head>", `${dataScript}${directScript}</head>`);

      // Send the HTML response
      return res.status(Number(statusCode)).send(html);
    } catch (err) {
      console.error("Error reading error.html file:", err);
      // Fallback to plain text response
      return res.status(Number(statusCode)).send(`Error: ${message}`);
    }
  } catch (e) {
    console.error("Error in serveErrorPage:", e);
    // Final fallback
    return res.status(500).send("An error occurred");
  }
};

/**
 * Redirect to error.html page with appropriate query parameters
 */
exports.redirectToErrorPage = (err, req, res) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "An unexpected error occurred";
  const title = err.title || "Error";

  const redirectUrl = `/error.html?statusCode=${statusCode}&message=${encodeURIComponent(message)}&title=${encodeURIComponent(title)}`;

  console.log(`Redirecting to error page: ${redirectUrl}`);

  return res.redirect(302, redirectUrl);
};
