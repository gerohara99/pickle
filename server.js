const mongoose = require("mongoose");
const dotenv = require("dotenv");
const MongoStore = require("connect-mongo");
const session = require("express-session");

// This is for actual system issues i.e. memory corruption and so on
process.on("uncaughtException", (err) => {
  console.log("Uncaught exception");
  console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config({ path: "./config.env" }); // Point to config file for env variables
const app = require("./app");

//START SERVER
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App runnig on port ${port}`);
});

//Unhandled rejections --- this is for stuff like invalid db Id
process.on("unhandledRejection", (err) => {
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

//Handling heroku kills processes every 24 hours via SIGTERM signal
process.on("SIGTERM", () => {
  console.log("SIGTERM RECIEVED. Shutting down gracefully ");
  // Close the server but complete all outstanding requests first
  server.close(() => {
    console.log("Process terminated");
  });
});
