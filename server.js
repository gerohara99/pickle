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
async function gracefulShutdown(signal) {
  console.log(`${signal} RECEIVED. Shutting down gracefully`);

  // Close the HTTP server first
  await new Promise((resolve) => {
    server.close(resolve);
  });

  // Close DB connections if using mongoose
  try {
    if (require("mongoose").connection.readyState === 1) {
      await require("mongoose").connection.close();
      console.log("MongoDB connection closed.");
    }
    console.log("Process terminated");
    setTimeout(() => process.exit(0), 1000);
  } catch (err) {
    console.error("Error during shutdown:", err);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION! Shutting down...");
  console.error(err.name, err.message);
  // Call gracefulShutdown but don't wait for it as it's async
  gracefulShutdown("unhandledRejection").catch((shutdownErr) => {
    console.error("Error during graceful shutdown:", shutdownErr);
    process.exit(1);
  });
});

// Graceful shutdown on SIGTERM/SIGINT
["SIGTERM", "SIGINT"].forEach((signal) => {
  process.on(signal, () => {
    gracefulShutdown(signal).catch((shutdownErr) => {
      console.error("Error during graceful shutdown:", shutdownErr);
      process.exit(1);
    });
  });
});
