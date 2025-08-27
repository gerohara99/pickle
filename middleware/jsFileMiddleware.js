/**
 * JavaScript file serving middleware
 *
 * This middleware specifically handles JavaScript files with the correct MIME type
 */

const path = require("path");
const fs = require("fs");
const express = require("express");

// Create a router for JavaScript files
const jsRouter = express.Router();

// Middleware to serve JavaScript files with the correct MIME type
jsRouter.get("*.js", (req, res, next) => {
  const filePath = path.join(process.cwd(), "public", req.path);

  // Check if the file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      // File doesn't exist, continue to next middleware
      return next();
    }

    // Set the correct MIME type
    res.set("Content-Type", "application/javascript");

    // Send the file
    res.sendFile(filePath);
  });
});

module.exports = jsRouter;
