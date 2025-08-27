/**
 * HTML View Controller
 * This controller handles serving HTML files directly
 */

const path = require("path");
const fs = require("fs");
const AppError = require("../utils/appError");

// Directory where HTML files are stored
const HTML_DIR = path.join(__dirname, "..", "public", "html");

/**
 * Helper function to find HTML file in supported directories
 * @param {string} templateName - Name of the template without .html extension
 * @returns {string|null} - Full path to HTML file or null if not found
 */
const findHtmlFile = (templateName) => {
  // Primary location for HTML files
  const htmlPath = path.join(HTML_DIR, `${templateName}.html`);

  // Check if the file exists
  if (fs.existsSync(htmlPath)) {
    return htmlPath;
  }

  // No HTML file found
  return null;
};

/**
 * Middleware to serve HTML files
 * This will be used for all routes to serve the appropriate HTML file
 */
const htmlMiddleware = (req, res, next) => {
  // Skip API routes and static files
  if (
    req.path.startsWith("/api/") ||
    req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg)$/)
  ) {
    return next();
  }

  // Extract the template name from the route
  // Handle different route patterns
  let templateName;
  const pathParts = req.path.split("/").filter(Boolean);

  // Special case for homepage
  if (req.path === "/") {
    templateName = "homepage";
  }
  // Handle routes with IDs like /events/get/123
  else if (pathParts.length >= 2 && pathParts[1] === "get" && pathParts[2]) {
    // For edit pages with IDs
    templateName = `edit${pathParts[0].charAt(0).toUpperCase() + pathParts[0].slice(0, -1)}`;
  }
  // Routes like /events/create
  else if (pathParts.length >= 2 && pathParts[1] === "create") {
    templateName = `create${pathParts[0].charAt(0).toUpperCase() + pathParts[0].slice(0, -1)}`;
  }
  // Routes like /events/showAll
  else if (pathParts.length >= 2) {
    templateName = pathParts[1];

    // Handle special templates
    const specialTemplates = {
      showAll: `showAll${pathParts[0].charAt(0).toUpperCase() + pathParts[0].slice(0, -1)}s`,
      myAccountDetails: "myAccountDetails",
      myPasswordUpdate: "myPasswordUpdate",
      myPasswordReset: "myPasswordReset",
      forgotPassword: "myPasswordForgot",
      showAllSchedules: "showAllSchedules",
      viewMasterSchedule: "viewMasterSchedule",
      viewMySchedule: "viewMySchedule",
      signup: "signUp",
      login: "login",
    };

    if (specialTemplates[templateName]) {
      templateName = specialTemplates[templateName];
    }
  }

  // Convert to standard naming convention if needed
  if (templateName && templateName.includes("-")) {
    templateName = templateName.replace(/-([a-z])/g, (match, letter) =>
      letter.toUpperCase()
    );
  }

  if (!templateName) {
    return next(
      new AppError(
        `Could not determine template name for path: ${req.path}`,
        404
      )
    );
  }

  // Find the HTML file
  const htmlPath = findHtmlFile(templateName);

  if (!htmlPath) {
    return next(
      new AppError(`HTML template not found: ${templateName}.html`, 404)
    );
  }

  // Serve the HTML file
  res.sendFile(htmlPath);
};

/**
 * Initialize HTML directory and set up middleware
 * @param {Express.Application} app - Express app
 */
const setupHtmlServing = (app) => {
  // Create HTML directory if it doesn't exist
  if (!fs.existsSync(HTML_DIR)) {
    fs.mkdirSync(HTML_DIR, { recursive: true });
    console.log(`Created HTML directory: ${HTML_DIR}`);
  }

  // Apply HTML middleware to all routes
  app.use(htmlMiddleware);

  console.log(
    "HTML direct serving enabled - all routes will be served from HTML files"
  );
};

/**
 * Serve an HTML file for a specific route
 * @param {string} template - Template name without .html extension
 * @returns {Function} - Express middleware function
 */
const serveHtml = (template) => {
  return (req, res, next) => {
    const htmlPath = findHtmlFile(template);

    if (!htmlPath) {
      return next(
        new AppError(`HTML template not found: ${template}.html`, 404)
      );
    }

    res.sendFile(htmlPath);
  };
};

/**
 * Serve an HTML file with data
 * @param {string} template - Template name without .html extension
 * @param {Function} dataHandler - Function to get data for the template
 * @returns {Function} - Express middleware function
 */
const serveHtmlWithData = (template, dataHandler) => {
  return async (req, res, next) => {
    try {
      // Get data
      const data = await dataHandler(req);

      // Find the HTML file
      const htmlPath = findHtmlFile(template);

      if (!htmlPath) {
        return next(
          new AppError(`HTML template not found: ${template}.html`, 404)
        );
      }

      // Read HTML file
      fs.readFile(htmlPath, "utf8", (err, html) => {
        if (err) {
          return next(
            new AppError(`Error reading HTML file: ${template}.html`, 500)
          );
        }

        // Inject data script
        const dataScript = `<script>window.templateData = ${JSON.stringify(data)};</script>`;
        html = html.replace("</head>", `${dataScript}</head>`);

        // Send HTML
        res.send(html);
      });
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Helper for handling API responses consistently
 * @param {Function} handler - Async function that handles the request
 * @returns {Function} - Express middleware function
 */
const apiHandler = (handler) => {
  return async (req, res, next) => {
    try {
      const result = await handler(req);
      res.status(200).json({
        status: "success",
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };
};

module.exports = {
  setupHtmlServing,
  serveHtml,
  serveHtmlWithData,
  apiHandler,
  HTML_DIR,
};
