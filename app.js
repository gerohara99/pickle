const path = require("path");
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
const globalErrorHandler = require("./controllers/errorController");
const userRouter = require("./routes/userRoutes");
const eventRouter = require("./routes/eventRoutes");
const viewRouter = require("./routes/viewRoutes");
const locationRouter = require("./routes/locationRoutes");

//Start express app
const app = express();

app.enable("trust proxy");
app.set("trust proxy", 1);

//Serving static files
app.use(express.static(path.join(__dirname, "public")));

//Implement cors - Access-Control-Allow-Origin * for Get and Post for all routes
app.use(cors());

// Alloow cors for 'complex' methods such as patch, put and delete for all routes
app.options("*", cors());

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
app.use("/api/v1/locations", locationRouter);

app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
