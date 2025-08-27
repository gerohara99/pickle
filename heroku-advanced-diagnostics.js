// Advanced Heroku diagnostics script
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

console.log("==== HEROKU DIAGNOSTICS ====");
console.log("Current working directory:", process.cwd());
console.log("Environment variables:");
console.log("  NODE_ENV:", process.env.NODE_ENV);
console.log("  PORT:", process.env.PORT);

// List all files in the current directory
console.log("\nFiles in current directory:");
try {
  const files = fs.readdirSync(".");
  files.forEach((file) => {
    try {
      const stats = fs.statSync(file);
      console.log(`  ${file} (${stats.isDirectory() ? "directory" : "file"})`);
    } catch (err) {
      console.log(`  ${file} (error reading stats: ${err.message})`);
    }
  });
} catch (err) {
  console.error("Error listing files:", err);
}

// Check for config.env file
console.log("\nChecking for config.env:");
try {
  if (fs.existsSync("./config.env")) {
    console.log("  config.env exists");
    // Don't print contents for security reasons
  } else {
    console.log("  config.env does not exist");
  }
} catch (err) {
  console.error("Error checking for config.env:", err);
}

// Check database connection variables
console.log("\nDatabase connection variables:");
console.log("  STAGE_DATABASE exists:", !!process.env.STAGE_DATABASE);
if (process.env.STAGE_DATABASE) {
  // Print only the beginning of the connection string for security
  const dbString = process.env.STAGE_DATABASE;
  console.log(
    "  Connection string starts with:",
    dbString.substring(0, 20) + "..."
  );
}

// Check MongoDB connection with minimal code
console.log("\nTesting MongoDB connection:");
try {
  const mongoose = require("mongoose");

  console.log("  Mongoose loaded successfully");

  // Just create the connection promise, don't await it yet
  const connectionPromise = mongoose.connect(process.env.STAGE_DATABASE, {
    serverSelectionTimeoutMS: 5000, // 5 second timeout
  });

  console.log("  Connection attempt started...");

  // Set a timeout in case it hangs
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(
      () => reject(new Error("Connection timeout after 5 seconds")),
      5000
    );
  });

  // Race the connection against the timeout
  Promise.race([connectionPromise, timeoutPromise])
    .then(() => {
      console.log("  ✅ MongoDB connected successfully");

      // Close the connection and exit
      mongoose.connection
        .close()
        .then(() => {
          console.log("  Connection closed");
          console.log("\n==== DIAGNOSTICS COMPLETE ====");
        })
        .catch((err) => {
          console.error("  Error closing connection:", err);
          console.log("\n==== DIAGNOSTICS COMPLETE WITH ERRORS ====");
        });
    })
    .catch((err) => {
      console.error("  ❌ MongoDB connection failed:", err.message);
      console.log("\n==== DIAGNOSTICS COMPLETE WITH ERRORS ====");
    });
} catch (err) {
  console.error("  Error in MongoDB connection test:", err);
  console.log("\n==== DIAGNOSTICS COMPLETE WITH ERRORS ====");
}
