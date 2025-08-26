require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const path = require("path");
const morgan = require("morgan");
const helmet = require("helmet");
const compression = require("compression");
const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorController");

// Express app setup
const app = express();
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
if (process.env.NODE_ENV === "development") app.use(morgan("dev"));

// MongoDB connection
const DATABASE = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD
);

async function connectWithRetry() {
  try {
    await mongoose.connect(DATABASE, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection failed, retrying in 5s...", err);
    setTimeout(connectWithRetry, 5000);
  }
}

// Ensure TTL index for sessions
async function ensureSessionTTLIndex() {
  try {
    const collection = mongoose.connection.collection("sessions");
    await collection.createIndex({ expires: 1 }, { expireAfterSeconds: 0 });
    console.log("✅ TTL index ensured for sessions collection.");
  } catch (err) {
    console.error("Failed to ensure TTL index for sessions:", err);
  }
}

// MongoDB connection pool diagnostics
setInterval(() => {
  const conn = mongoose.connection;
  if (conn && conn.readyState === 1 && conn.client && conn.client.topology) {
    const servers = conn.client.topology.s.servers;
    Object.values(servers).forEach((server, idx) => {
      const pool = server.s.pool;
      if (pool) {
        console.log(
          `[MongoDB Pool] Server ${idx}: size=${pool.size}, available=${pool.available}, connections=${pool.connections.length}`
        );
      }
    });
  } else {
    console.log("[MongoDB Pool] Connection not ready or topology missing.");
  }
}, 10000);

// App startup sequence
async function startup() {
  await connectWithRetry();
  await ensureSessionTTLIndex();

  // Session store setup
  const store = new MongoDBStore({
    uri: DATABASE,
    collection: "sessions",
  });

  store.on("error", function (error) {
    console.error("Session store error:", error);
  });

  app.use(
    session({
      secret: process.env.SESSIONS_SECRET,
      store: store,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24, // 1 day
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      },
    })
  );

  // Your routes and middleware here
  // Example:
  // const eventRouter = require("./routes/eventRoutes");
  // app.use("/api/v1/events", eventRouter);

  // Global error handler
  app.use(globalErrorHandler);

  // 404 handler
  app.all("*", (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
  });

  // Start server
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

startup();
