const path = require("path");
const fs = require("fs");
const express = require("express");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const hpp = require("hpp");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const cookieParser = require("cookie-parser");
const AppError = require("./utils/appError");
const compression = require("compression");
const cors = require("cors");
const session = require("express-session");
const mongoose = require("mongoose");
const MongoDBStore = require("connect-mongodb-session")(session);
const globalErrorHandler = require("./controllers/errorController");
const userRouter = require("./routes/userRoutes");
const viewRouter = require("./routes/viewRoutes");
const eventRouter = require("./routes/eventRoutes");
const settingsRouter = require("./routes/settingsRoutes");
require("dotenv").config({ path: path.resolve(__dirname, "config.env") });

// Define required environment variables for each environment
const envVarsByEnv = {
  production: [
    "PROD_DATABASE",
    "PROD_DATABASE_PASSWORD",
    // Add any other prod-only variables here
  ],
  staging: [
    "STAGE_DATABASE",
    "STAGE_DATABASE_PASSWORD",
    // Add any other staging-only variables here
  ],
  development: [
    "DEV_DATABASE",
    "DEV_DATABASE_PASSWORD",
    // Add any other dev-only variables here
  ],
};

// Variables required in all environments
const alwaysRequired = [
  "SESSIONS_SECRET",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "EMAIL_HOST",
  "EMAIL_PORT",
  "EMAIL_USERNAME",
  "EMAIL_PASSWORD",
];

// Determine which environment variables to check
const requiredEnv = (
  envVarsByEnv[process.env.NODE_ENV] || envVarsByEnv.development
).concat(alwaysRequired);

// Check for missing environment variables
requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
});

//Start express app
const app = express();

// ***************** DATABASE Setup with retry logic (recommendation 1)
let DATABASE, DATABASE_PASSWORD;
if (process.env.NODE_ENV === "production") {
  DATABASE = process.env.PROD_DATABASE;
  DATABASE_PASSWORD = process.env.PROD_DATABASE_PASSWORD;
} else if (process.env.NODE_ENV === "staging") {
  DATABASE = process.env.STAGE_DATABASE;
  DATABASE_PASSWORD = process.env.STAGE_DATABASE_PASSWORD;
} else {
  DATABASE = process.env.DEV_DATABASE;
  DATABASE_PASSWORD = process.env.DEV_DATABASE_PASSWORD;
}

// Replace <PASSWORD> placeholder if present
if (DATABASE.includes("<PASSWORD>")) {
  DATABASE = DATABASE.replace("<PASSWORD>", DATABASE_PASSWORD || "");
}

async function connectWithRetry(retries = 5, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(DATABASE, {
        useNewUrlParser: true,
        createIndexes: true,
        useUnifiedTopology: true,
        FindAndModify: false,
      });
      console.log("MongoDB connected.");
      return;
    } catch (err) {
      console.log(
        `MongoDB connection failed (attempt ${i + 1}/${retries}). Retrying in ${delay / 1000}s...`
      );
      if (i === retries - 1) {
        console.error("MongoDB connection failed after maximum retries.");
        process.exit(1);
      }
      await new Promise((res) => setTimeout(res, delay));
    }
  }
}
connectWithRetry();

// ***************** SESSION Setup ***************************************

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const store = new MongoDBStore({
  uri: DATABASE,
  collection: "sessions",
});

// Catch errors (recommendation 4)
store.on("error", function (error) {
  console.error("Session store error:", error);
  // Optionally, alert or fallback logic here
});

app.use(
  session({
    secret: process.env.SESSIONS_SECRET,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    },
    store: store,
    resave: false,
    saveUninitialized: false,
  })
);

app.enable("trust proxy");
app.set("trust proxy", 1);

//Serving static files
app.use(express.static(path.join(__dirname, "public")));
app.use("/js/dist", express.static(path.join(__dirname, "public/js/dist")));

// Vite manifest middleware (recommendation 4)
app.use((req, res, next) => {
  try {
    const manifestPath = path.join(
      __dirname,
      "public/js/dist/.vite/manifest.json"
    );
    let manifest = {};
    if (fs.existsSync(manifestPath)) {
      manifest = require(manifestPath);
    } else {
      console.warn("⚠️ Could not load manifest.json");
    }
    const entry = manifest["index.js"];
    if (entry && entry.file) {
      res.locals.viteScript = `/js/dist/${entry.file}`;
    } else {
      console.warn("⚠️ Could not find entry in manifest for index.js");
      res.locals.viteScript = "";
    }
  } catch (err) {
    console.error("⚠️ Error loading manifest.json:", err.message);
    res.locals.viteScript = "";
  }
  next();
});

//Implement cors - Access-Control-Allow-Origin * for Get and Post for all routes
const corsOptions = {
  credentials: true,
  origin: [
    "https://unpkg.com/ionicons@5.4.0/dist/ionicons/ionicons.esm.js",
    "https://unpkg.com/ionicons@5.4.0/dist/ionicons/ionicons.js",
    "https://fonts.gstatic.com",
    "https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&display=swap",
  ],
};
app.use(cors(corsOptions));

// app.options("*", cors(corsOptions)); // Uncomment if needed for complex methods

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

// MIDDLEWARES

// Set security HTTP headers
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));

// Rate limiter
const limiter = rateLimit({
  max: 100,
  windowMS: 60 * 60 * 1000,
  message: "Too many requests from this IP, please try again in an hour",
});
app.use("/api", limiter);

// Development Logging
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Body parser, reading data from body into req.body
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

//Data sanitization against NoSQL query injection
app.use(mongoSanitize());

//Data sanitization against Xss
app.use(xss());

//Data sanitization against parameter pollution (duplicates etc.. )
app.use(
  hpp({
    whitelist: [], // Specifying parameters that are ok to be duplicated
  })
);
app.use(compression());

//Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// Request timeout middleware (recommendation 5)
app.use((req, res, next) => {
  res.setTimeout(15000, () => {
    console.warn(`Request timed out: ${req.originalUrl}`);
    res.status(503).send("Request timed out");
  });
  next();
});

// Health check endpoint (recommendation 6)
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// ROUTES
app.use("/", viewRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/events", eventRouter);
app.use("/api/v1/settings", settingsRouter);

app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

// Error-handling middleware should be last
app.use(globalErrorHandler);

module.exports = app;
