const path = require("path");
const dotenv = require("dotenv");

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION! Shutting down...");
  console.error(err.name, err.message);
  process.exit(1);
});

// Load environment variables
dotenv.config({ path: "./config.env" });

console.log("➡️ Requiring app.js...");
const app = require("./app");

const port = process.env.PORT || 3000;
let server;

// Start server with error handling
try {
  server = app.listen(port, () => {
    console.log(`App running on port ${port}`);
  });
} catch (err) {
  console.error("Error starting server:", err);
  process.exit(1);
}

// Graceful shutdown function
function gracefulShutdown(signal) {
  console.log(`${signal} RECEIVED. Shutting down gracefully`);
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
