const path = require("path");
const dotenv = require("dotenv");

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION! Shutting down...");
  console.error(err.name, err.message);
  console.error(err.stack);
  process.exit(1);
});

// Load environment variables
dotenv.config({ path: "./config.env" });

console.log("➡️ Loading application modules...");
console.log("➡️ Environment: " + process.env.NODE_ENV);

// Declare server variable in global scope
let server;

// Graceful shutdown function (defined outside try block)
function gracefulShutdown(signal) {
  console.log(`${signal} RECEIVED. Shutting down gracefully`);
  if (server) {
    server.close(async () => {
      // Close DB connections if using mongoose
      if (require("mongoose").connection.readyState === 1) {
        try {
          await require("mongoose").connection.close(false);
          console.log("MongoDB connection closed.");
        } catch (err) {
          console.error("Error closing MongoDB connection:", err);
        }
      }
      console.log("Process terminated");
      setTimeout(() => process.exit(0), 1000);
    });
  } else {
    console.log("No server to close. Exiting immediately.");
    process.exit(0);
  }
}

try {
  console.log("➡️ Requiring app.js...");
  const app = require("./app");
  console.log("✅ App loaded successfully");

  const port = process.env.PORT || 4000;

  // Start server with error handling
  console.log(`➡️ Starting server on port ${port}...`);
  server = app.listen(port, () => {
    console.log(`✅ Server running on port ${port}`);
  });
} catch (err) {
  console.error("❌ Fatal error starting application:", err);
  console.error(err.stack);
  process.exit(1);
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION! Shutting down...");
  console.error(err.name, err.message);
  gracefulShutdown("unhandledRejection");
});

// Graceful shutdown on SIGTERM/SIGINT
["SIGTERM", "SIGINT"].forEach((signal) => {
  process.on(signal, () => gracefulShutdown(signal));
});
