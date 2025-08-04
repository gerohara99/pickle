try {
  const path = require("path");
  const fs = require("fs");
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

  //Start express app
  const app = express();

  // ***************** DATABASE Setup ***************************************
  const DATABASE = process.env.DATABASE.replace(
    "<PASSWORD>",
    process.env.DATABASE_PASSWORD
  );

  mongoose
    .connect(DATABASE, {
      useNewUrlParser: true,
      createIndexes: true,
      useUnifiedTopology: true,
      FindAndModify: false,
    })
    .then(() => {
      console.log("MongoDB connected.");
    })
    .catch((err) => {
      console.log("MongoDB connection failed.");
      console.log(`Error: ${err.message}`);
    });

  // ***************** SESSION Setup ***************************************

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const store = new MongoDBStore({
    uri: DATABASE,
    collection: "sessions",
  });

  // Catch errors
  store.on("error", function (error) {
    console.log(error);
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

  app.use((req, res, next) => {
    try {
      const manifestPath = path.join(
        __dirname,
        "public/js/dist/.vite/manifest.json"
      );
      const manifest = require(manifestPath);

      // ✅ Use the correct key from manifest
      const entry = manifest["index.js"];
      if (entry && entry.file) {
        res.locals.viteScript = `/js/dist/${entry.file}`;
      } else {
        console.warn("⚠️ Could not find entry in manifest for index.js");
        res.locals.viteScript = "";
      }
    } catch (err) {
      console.error("⚠️ Could not load manifest.json", err.message);
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

  // Alloow cors for 'complex' methods such as patch, put and delete for all routes
  /* app.options("*", cors(corsOptions)); */

  app.set("view engine", "pug");
  app.set("views", path.join(__dirname, "views"));

  // MIDDLEWARES

  // Set security HTTP headers
  // app.use(helmet());
  app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
  // Fix for the mapbox to work without throwing security error..

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

  // ROUTES
  app.use("/", viewRouter);
  app.use("/api/v1/users", userRouter);
  app.use("/api/v1/events", eventRouter);
  app.use("/api/v1/settings", settingsRouter);

  app.all("*", (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
  });

  app.use(globalErrorHandler);

  module.exports = app;
} catch (err) {
  console.error("❌ app.js failed to load:", err);
  process.exit(1);
}
