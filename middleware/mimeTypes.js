/**
 * MIME Types Middleware
 *
 * This middleware ensures JavaScript files are served with the correct MIME type
 * for ES modules to work properly in browsers.
 */

const path = require("path");

const mimeTypesMiddleware = (req, res, next) => {
  // Check if the request is for a JavaScript file
  if (req.path.endsWith(".js")) {
    // Set the proper MIME type for JavaScript modules
    res.setHeader("Content-Type", "application/javascript");
  }
  next();
};

module.exports = mimeTypesMiddleware;
