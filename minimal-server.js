// minimal-server.js - A minimal Express server for debugging
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

// Add basic routes
app.get("/", (req, res) => {
  res.send(`
    <h1>Pickle Admin Staging - Debug Page</h1>
    <p>Server is running in ${process.env.NODE_ENV} mode</p>
    <p>Current time: ${new Date().toISOString()}</p>
    <p>Node version: ${process.version}</p>
  `);
});

app.get("/env", (req, res) => {
  // List environment variables (excluding sensitive ones)
  const safeEnv = {};
  for (const key in process.env) {
    if (
      !key.includes("PASSWORD") &&
      !key.includes("SECRET") &&
      !key.includes("TOKEN")
    ) {
      // For database URLs, only show part of the string
      if (key.includes("DATABASE") && typeof process.env[key] === "string") {
        safeEnv[key] = process.env[key].substring(0, 20) + "...";
      } else {
        safeEnv[key] = process.env[key];
      }
    }
  }
  res.json(safeEnv);
});

// Start the server
app.listen(port, () => {
  console.log(`Minimal debug server running on port ${port}`);
});
