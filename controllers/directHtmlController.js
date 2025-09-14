/**
 * Direct HTML Controller
 *
 * This controller serves HTML files directly without any Pug fallback.
 * It's designed for a complete migration from Pug to HTML.
 */

const path = require("path");
const fs = require("fs").promises;
const { injectImportMap } = require("../utils/importMapInjector");

/**
 * Middleware to serve HTML files directly
 * @param {string} htmlDir - Directory containing HTML files (relative to project root)
 */
const serveHtmlMiddleware = (htmlDir = "public/html") => {
  console.log(`HTML middleware initialized with directory: ${htmlDir}`);

  return async (req, res, next) => {
    // Skip API routes and static files
    if (
      req.path.startsWith("/api/") ||
      req.path.startsWith("/js/") ||
      req.path.startsWith("/css/") ||
      req.path.match(/\.(css|png|jpg|jpeg|gif|ico|svg|js)$/)
    ) {
      return next();
    }

    // Extract the template name from the route
    let templateName;

    // Special case for HTML files directly in the path
    if (req.path.endsWith(".html")) {
      // Remove the .html extension to get the template name
      templateName = req.path.substring(1, req.path.length - 5); // Remove leading / and trailing .html

      // For the error page, get parameters from query string
      if (templateName === "error") {
        const htmlPath = path.join(
          process.cwd(),
          htmlDir,
          `${templateName}.html`
        );
        // Use path.resolve to make sure we have an absolute path
        const absolutePath = path.resolve(htmlPath);
        console.log(
          `Serving HTML file: ${templateName}.html from ${htmlDir}, path: ${absolutePath}`
        );
        return res.sendFile(absolutePath, (err) => {
          if (err) {
            console.error(
              `HTML file not found: ${templateName}.html at ${absolutePath}`,
              err
            );
            return next(new Error(`HTML file not found: ${templateName}.html`));
          }
        });
      }
    }

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
      // Special case for events/create
      if (pathParts[0] === "events") {
        templateName = "createEvent";
      } else {
        templateName = `create${pathParts[0].charAt(0).toUpperCase() + pathParts[0].slice(0, -1)}`;
      }
    }
    // Routes like /events/showAll
    else if (pathParts.length >= 2) {
      templateName = pathParts[1];
      console.log(`[HTML Middleware] Route part: ${templateName}`);

      // Handle special templates
      const specialTemplates = {
        showAll: `showAll${pathParts[0].charAt(0).toUpperCase() + pathParts[0].slice(0, -1)}s`,
        myAccountDetails: "myAccountDetails",
        myPasswordUpdate: "myPasswordUpdate",
        myPasswordReset: "myPasswordReset",
        forgotPassword: "myPasswordForgot",
        login: "login",
        signup: "signUp",
        showAllSchedules: "showAllSchedules",
        viewMasterSchedule: "viewMasterSchedule",
        viewMySchedule: "viewMySchedule",
      };

      // Special case for events/showAll to ensure it's always correctly mapped
      if (pathParts[0] === "events" && templateName === "showAll") {
        templateName = "showAllEvents";
        console.log(
          `[HTML Middleware] Special case for events/showAll: using ${templateName}`
        );
      } else if (specialTemplates[templateName]) {
        templateName = specialTemplates[templateName];
        console.log(
          `[HTML Middleware] Using special template: ${templateName}`
        );
      }
    }

    // Convert to standard naming convention if needed
    if (templateName && templateName.includes("-")) {
      templateName = templateName.replace(/-([a-z])/g, (match, letter) =>
        letter.toUpperCase()
      );
    }

    if (!templateName) {
      console.log(`Could not determine template name for path: ${req.path}`);
      return next(new Error(`Could not determine template for: ${req.path}`));
    }

    // Path to HTML file
    const htmlPath = path.join(process.cwd(), htmlDir, `${templateName}.html`);

    try {
      // Check if file exists
      await fs.access(htmlPath);

      // Read the HTML file
      let htmlContent = await fs.readFile(htmlPath, "utf8");

      // Inject importmap if needed
      htmlContent = injectImportMap(htmlContent);

      // Send the modified HTML content
      res.set("Content-Type", "text/html");
      res.send(htmlContent);
    } catch (err) {
      // File doesn't exist
      console.error(
        `HTML file not found: ${templateName}.html at ${htmlPath}`,
        err
      );
      next();
    }
  };
};

/**
 * Explicitly serve a specific HTML file
 * @param {string} template - Template name without .html extension
 * @param {string} htmlDir - Directory containing HTML files (relative to project root)
 */
const serveHtmlFile = (template, htmlDir = "public/html") => {
  return async (req, res, next) => {
    const htmlPath = path.join(process.cwd(), htmlDir, `${template}.html`);

    try {
      // Check if file exists
      await fs.access(htmlPath);

      // Read the HTML file
      let htmlContent = await fs.readFile(htmlPath, "utf8");

      // Inject importmap if needed
      htmlContent = injectImportMap(htmlContent);

      // Send the modified HTML content
      res.set("Content-Type", "text/html");
      res.send(htmlContent);
    } catch (err) {
      // File doesn't exist
      console.error(`HTML file not found: ${template}.html`, err);
      next(new Error(`HTML file not found: ${template}.html`));
    }
  };
};

/**
 * Serve HTML with data injection
 * @param {string} template - Template name without .html extension
 * @param {Function} dataHandler - Function to get data for the template
 * @param {string} htmlDir - Directory containing HTML files (relative to project root)
 */
const serveHtmlWithData = (template, dataHandler, htmlDir = "public/html") => {
  return async (req, res, next) => {
    try {
      // Get data
      const data = await dataHandler(req);

      // Add vite script if it's not already in the data
      if (!data.viteScript) {
        data.viteScript = "/js/index.js";
      }

      // Path to HTML file
      const htmlPath = path.join(process.cwd(), htmlDir, `${template}.html`);

      try {
        // Read HTML file
        let html = await fs.readFile(htmlPath, "utf8");

        // Inject data script as window.templateData
        const dataScript = `<script>window.templateData = ${JSON.stringify(data)};</script>`;
        html = html.replace("</head>", `${dataScript}</head>`);

        // Send HTML
        res.send(html);
      } catch (err) {
        // File doesn't exist
        console.error(`HTML file not found: ${template}.html`, err);
        next(new Error(`HTML file not found: ${template}.html`));
      }
    } catch (err) {
      console.error(`Error serving HTML with data: ${template}.html`, err);
      next(err);
    }
  };
};

module.exports = {
  serveHtmlMiddleware,
  serveHtmlFile,
  serveHtmlWithData,
};
