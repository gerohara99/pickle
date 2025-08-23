# Codebase Review

## Procfile

*Size: 24 bytes*

```
web: npm run start:prod

```

## app.js

*Size: 7362 bytes*

```js
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

```

## app.js.map

*Size: 40720 bytes*

```map
{"mappings":";;;;;;;AAAA,gBAAgB;ACAhB,kBAAkB;;ACAlB,+BAA+B;AAExB,MAAM,4CAAY;IACvB,MAAM,KAAK,SAAS,aAAa,CAAC;IAClC,IAAI,IAAI,GAAG,aAAa,CAAC,WAAW,CAAC;AACvC;AAEO,MAAM,4CAAY,CAAC,MAAM;IAC9B;IACA,MAAM,SAAS,CAAC,yBAAyB,EAAE,KAAK,EAAE,EAAE,IAAI,MAAM,CAAC;IAC/D,SAAS,aAAa,CAAC,QAAQ,kBAAkB,CAAC,cAAc;IAChE,OAAO,UAAU,CAAC,2CAAW;AAC/B;;;ADNO,MAAM,4CAAQ,OAAO,OAAO;IACjC,IAAI;QACF,MAAM,MAAM,MAAM,CAAA,GAAA,sCAAI,EAAE;YACtB,QAAQ;YACR,KAAK;YACL,MAAM;uBACJ;0BACA;YACF;QACF;QACA,IAAI,IAAI,IAAI,CAAC,MAAM,KAAK,WAAW;YACjC,IAAI,cAAc;YAElB,CAAA,GAAA,yCAAQ,EAAE,WAAW;YACrB,IAAI,IAAI,IAAI,CAAC,IAAI,CAAC,IAAI,KAAK,aACzB,cAAc;iBAEd,cAAc;YAGhB,OAAO,UAAU,CAAC;gBAChB,SAAS,MAAM,CAAC;YAClB,GAAG;QACL;IACF,EAAE,OAAO,KAAK;QACZ,CAAA,GAAA,yCAAQ,EAAE,SAAS,IAAI,QAAQ,CAAC,IAAI,CAAC,OAAO;IAC9C;AACF;AAEO,MAAM,4CAAS;IACpB,IAAI;QACF,MAAM,MAAM,MAAM,CAAA,GAAA,sCAAI,EAAE;YACtB,QAAQ;YACR,KAAK;QACP;QACA,IAAI,IAAI,IAAI,CAAC,MAAM,KAAK,WAAW;YACjC,CAAA,GAAA,yCAAQ,EAAE,WAAW;YACrB,OAAO,UAAU,CAAC;gBAChB,SAAS,MAAM,CAAC;YAClB,GAAG;QACL;IACF,EAAE,OAAO,KAAK;QACZ,CAAA,GAAA,yCAAQ,EAAE,SAAS,IAAI,QAAQ,CAAC,IAAI,CAAC,OAAO;IAC9C;AACF;;;AElDA,kBAAkB;;AAIX,MAAM,4CAAS;IACpB,IAAI;QACF,MAAM,MAAM,MAAM,CAAA,GAAA,sCAAI,EAAE;YACtB,QAAQ;YACR,KAAK;QACP;QACA,IAAI,IAAI,IAAI,CAAC,MAAM,KAAK,WAAW;YACjC,CAAA,GAAA,yCAAQ,EAAE,WAAW;YACrB,OAAO,UAAU,CAAC;gBAChB,SAAS,MAAM,CAAC;YAClB,GAAG;QACL;IACF,EAAE,OAAO,KAAK;QACZ,CAAA,GAAA,yCAAQ,EAAE,SAAS,IAAI,QAAQ,CAAC,IAAI,CAAC,OAAO;IAC9C;AACF;;;ACnBA,kBAAkB;;AAIX,MAAM,4CAAS,OACpB,MACA,OACA,QACA,UACA;IAEA,IAAI;QACF,MAAM,MAAM,MAAM,CAAA,GAAA,sCAAI,EAAE;YACtB,QAAQ;YACR,KAAK;YACL,MAAM;sBACJ;uBACA;wBACA;0BACA;iCACA;YACF;QACF;QAEA,IAAI,IAAI,IAAI,CAAC,MAAM,KAAK,WAAW;YACjC,CAAA,GAAA,yCAAQ,EAAE,WAAW;YACrB,OAAO,UAAU,CAAC;gBAChB,SAAS,MAAM,CAAC;YAClB,GAAG;QACL;IACF,EAAE,OAAO,KAAK;QACZ,CAAA,GAAA,yCAAQ,EAAE,SAAS,IAAI,QAAQ,CAAC,IAAI,CAAC,OAAO;IAC9C;AACF;;;ACjCA,kBAAkB;;AAIX,MAAM,4CAAkB,OAC7B,MACA,OACA,QACA,UACA;IAEA,IAAI;QACF,MAAM,MAAM,MAAM,CAAA,GAAA,sCAAI,EAAE;YACtB,QAAQ;YACR,KAAK;YACL,MAAM;sBACJ;uBACA;wBACA;0BACA;iCACA;YACF;QACF;QAEA,IAAI,IAAI,IAAI,CAAC,MAAM,KAAK,WAAW;YACjC,CAAA,GAAA,yCAAQ,EAAE,WAAW;YACrB,OAAO,UAAU,CAAC;gBAChB,SAAS,MAAM,CAAC;YAClB,GAAG;QACL;IACF,EAAE,OAAO,KAAK;QACZ,CAAA,GAAA,yCAAQ,EAAE,SAAS,IAAI,QAAQ,CAAC,IAAI,CAAC,OAAO;IAC9C;AACF;;;ACjCA,kBAAkB;;AAKX,MAAM,4CAAW,OAAO,MAAM;IACnC,IAAI;QACF,MAAM,MACJ,SAAS,aACL,mCACA;QAEN,MAAM,MAAM,MAAM,CAAA,GAAA,sCAAI,EAAE;YACtB,QAAQ;iBACR;kBACA;QACF;QAEA,IAAI,IAAI,IAAI,CAAC,MAAM,KAAK,WACtB,CAAA,GAAA,yCAAQ,EAAE,WAAW,GAAG,KAAK,WAAW,GAAG,sBAAsB,CAAC;IAEtE,EAAE,OAAO,KAAK;QACZ,CAAA,GAAA,yCAAQ,EAAE,SAAS,IAAI,QAAQ,CAAC,IAAI,CAAC,OAAO;IAC9C;AACF;;;ACxBA,kBAAkB;;AAIX,MAAM,4CAAmB,OAAO;IACrC,IAAI;QACF,MAAM,MAAM,MAAM,CAAA,GAAA,sCAAI,EAAE;YACtB,QAAQ;YACR,KAAK;YACL,MAAM;QACR;QACA,IAAI,IAAI,IAAI,CAAC,MAAM,KAAK,WAAW;YACjC,CAAA,GAAA,yCAAQ,EAAE,WAAW;YAErB,OAAO,UAAU,CAAC;gBAChB,SAAS,MAAM,CAAC;YAClB,GAAG;QACL;IACF,EAAE,OAAO,KAAK;QACZ,CAAA,GAAA,yCAAQ,EAAE,SAAS,IAAI,QAAQ,CAAC,IAAI,CAAC,OAAO;IAC9C;AACF;AAEO,MAAM,4CAAmB,OAAO;IACrC,IAAI;QACF,MAAM,MAAM,MAAM,CAAA,GAAA,sCAAI,EAAE;YACtB,QAAQ;YACR,KAAK,CAAC,eAAe,EAAE,KAAK,OAAO,EAAE;YACrC,MAAM;QACR;QACA,IAAI,IAAI,MAAM,KAAK,KAAK;YACtB,CAAA,GAAA,yCAAQ,EAAE,WAAW;YAErB,OAAO,UAAU,CAAC;gBAChB,SAAS,MAAM,CAAC;YAClB,GAAG;QACL;IACF,EAAE,OAAO,KAAK;QACZ,CAAA,GAAA,yCAAQ,EAAE,SAAS,IAAI,QAAQ,CAAC,IAAI,CAAC,OAAO;IAC9C;AACF;AAEO,MAAM,2CAAmB,OAAO;IACrC,IAAI;QACF,MAAM,MAAM,MAAM,CAAA,GAAA,sCAAI,EAAE;YACtB,QAAQ;YACR,KAAK,CAAC,eAAe,EAAE,SAAS;QAClC;QACA,IAAI,IAAI,MAAM,KAAK,KAAK;YACtB,CAAA,GAAA,yCAAQ,EAAE,WAAW;YAErB,OAAO,UAAU,CAAC;gBAChB,SAAS,MAAM,CAAC;YAClB,GAAG;QACL;IACF,EAAE,OAAO,KAAK;QACZ,CAAA,GAAA,yCAAQ,EAAE,SAAS,IAAI,QAAQ,CAAC,IAAI,CAAC,OAAO;IAC9C;AACF;AAEO,MAAM,4CAA0B,OAAO;IAC5C,IAAI;QACF,MAAM,MAAM,MAAM,CAAA,GAAA,sCAAI,EAAE;YACtB,QAAQ;YACR,KAAK,CAAC,6BAA6B,CAAC;YACpC,MAAM;yBAAE;YAAQ;QAClB;QACA,IAAI,IAAI,MAAM,KAAK,KAAK;YACtB,CAAA,GAAA,yCAAQ,EAAE,WAAW;YAErB,OAAO,UAAU,CAAC;gBAChB,SAAS,MAAM,CAAC;YAClB,GAAG;QACL;IACF,EAAE,OAAO,KAAK;QACZ,CAAA,GAAA,yCAAQ,EAAE,SAAS,IAAI,QAAQ,CAAC,IAAI,CAAC,OAAO;IAC9C;AACF;AAEO,MAAM,4CAA0B,OAAO;IAC5C,IAAI;QACF,MAAM,MAAM,MAAM,CAAA,GAAA,sCAAI,EAAE;YACtB,QAAQ;YACR,KAAK,CAAC,6BAA6B,CAAC;YACpC,MAAM;yBAAE;YAAQ;QAClB;QACA,IAAI,IAAI,MAAM,KAAK,KAAK;YACtB,CAAA,GAAA,yCAAQ,EAAE,WAAW;YAErB,OAAO,UAAU,CAAC;gBAChB,SAAS,MAAM,CAAC;YAClB,GAAG;QACL;IACF,EAAE,OAAO,KAAK;QACZ,CAAA,GAAA,yCAAQ,EAAE,SAAS,IAAI,QAAQ,CAAC,IAAI,CAAC,OAAO;IAC9C;AACF;AAEO,MAAM,4CAA6B,OAAO;IAC/C,IAAI;QACF,MAAM,MAAM,MAAM,CAAA,GAAA,sCAAI,EAAE;YACtB,QAAQ;YACR,KAAK,CAAC,+BAA+B,CAAC;YACtC,MAAM;QACR;QAEA,IAAI,IAAI,MAAM,KAAK,KAAK;YACtB,CAAA,GAAA,yCAAQ,EAAE,WAAW;YAErB,OAAO,UAAU,CAAC;gBAChB,SAAS,MAAM,CAAC;YAClB,GAAG;QACL;IACF,EAAE,OAAO,KAAK;QACZ,CAAA,GAAA,yCAAQ,EAAE,SAAS,IAAI,QAAQ,CAAC,IAAI,CAAC,OAAO;QAC5C,OAAO,UAAU,CAAC;YAChB,SAAS,MAAM,CAAC;QAClB,GAAG;IACL;AACF;;;ACvHA,kBAAkB;;AAIX,MAAM,4CAAkB,OAC7B,MACA,OACA,QACA,UACA;IAEA,IAAI;QACF,MAAM,MAAM,MAAM,CAAA,GAAA,sCAAI,EAAE;YACtB,QAAQ;YACR,KAAK;YACL,MAAM;sBACJ;uBACA;wBACA;0BACA;iCACA;YACF;QACF;QACA,IAAI,IAAI,IAAI,CAAC,MAAM,KAAK,WAAW;YACjC,CAAA,GAAA,yCAAQ,EAAE,WAAW;YAErB,OAAO,UAAU,CAAC;gBAChB,SAAS,MAAM,CAAC;YAClB,GAAG;QACL;IACF,EAAE,OAAO,KAAK;QACZ,CAAA,GAAA,yCAAQ,EAAE,SAAS,IAAI,QAAQ,CAAC,IAAI,CAAC,OAAO;IAC9C;AACF;AAEO,MAAM,4CAAkB,OAAO,QAAQ,MAAM,OAAO;IACzD,IAAI;QACF,MAAM,MAAM,MAAM,CAAA,GAAA,sCAAI,EAAE;YACtB,QAAQ;YACR,KAAK,CAAC,cAAc,EAAE,QAAQ;YAC9B,MAAM;sBACJ;uBACA;wBACA;YACF;QACF;QACA,IAAI,IAAI,MAAM,KAAK,KAAK;YACtB,CAAA,GAAA,yCAAQ,EAAE,WAAW;YAErB,OAAO,UAAU,CAAC;gBAChB,SAAS,MAAM,CAAC;YAClB,GAAG;QACL;IACF,EAAE,OAAO,KAAK;QACZ,CAAA,GAAA,yCAAQ,EAAE,SAAS,IAAI,QAAQ,CAAC,IAAI,CAAC,OAAO;IAC9C;AACF;AAEO,MAAM,4CAAkB,OAAO;IACpC,IAAI;QACF,MAAM,MAAM,MAAM,CAAA,GAAA,sCAAI,EAAE;YACtB,QAAQ;YACR,KAAK,CAAC,cAAc,EAAE,QAAQ;QAChC;QACA,IAAI,IAAI,MAAM,KAAK,KAAK;YACtB,CAAA,GAAA,yCAAQ,EAAE,WAAW;YAErB,OAAO,UAAU,CAAC;gBAChB,SAAS,MAAM,CAAC;YAClB,GAAG;QACL;IACF,EAAE,OAAO,KAAK;QACZ,CAAA,GAAA,yCAAQ,EAAE,SAAS,IAAI,QAAQ,CAAC,IAAI,CAAC,OAAO;IAC9C;AACF;;;AC1EA,kBAAkB;;AAIX,MAAM,4CAAsB,OAAO;IACxC,IAAI;QACF,MAAM,MAAM;QAEZ,MAAM,MAAM,MAAM,CAAA,GAAA,sCAAI,EAAE;YACtB,QAAQ;iBACR;kBACA;QACF;QAEA,IAAI,IAAI,IAAI,CAAC,MAAM,KAAK,WACtB,CAAA,GAAA,yCAAQ,EACN,WACA,GAAG,KAAK,WAAW,GAAG,8BAA8B,CAAC;IAG3D,EAAE,OAAO,KAAK;QACZ,CAAA,GAAA,yCAAQ,EAAE,SAAS,IAAI,QAAQ,CAAC,IAAI,CAAC,OAAO;IAC9C;AACF;;;ACvBA,kBAAkB;;AAIX,MAAM,4CAAqB,OAAO;IACvC,IAAI;QACF,MAAM,MAAM;QAEZ,MAAM,MAAM,MAAM,CAAA,GAAA,sCAAI,EAAE;YACtB,QAAQ;iBACR;kBACA;QACF;QAEA,IAAI,IAAI,IAAI,CAAC,MAAM,KAAK,WACtB,CAAA,GAAA,yCAAQ,EAAE,WAAW,GAAG,KAAK,WAAW,GAAG,4BAA4B,CAAC;IAE5E,EAAE,OAAO,KAAK;QACZ,CAAA,GAAA,yCAAQ,EAAE,SAAS,IAAI,QAAQ,CAAC,IAAI,CAAC,OAAO;IAC9C;AACF;;;ACpBA,kBAAkB;;AAIX,MAAM,4CAAyB;IACpC,IAAI;QACF,MAAM,MAAM,MAAM,CAAA,GAAA,sCAAI,EAAE;YACtB,QAAQ;YACR,KAAK;QACP;QACA,IAAI,IAAI,IAAI,CAAC,MAAM,KAAK,WACtB,QAAQ,GAAG,CAAC;IAEhB,EAAE,OAAO,KAAK;QACZ,CAAA,GAAA,yCAAQ,EAAE,SAAS,IAAI,QAAQ,CAAC,IAAI,CAAC,OAAO;IAC9C;AACF;AAEO,MAAM,4CAA4B,OAAO;IAC9C,IAAI;QACF,MAAM,MAAM,MAAM,CAAA,GAAA,sCAAI,EAAE;YACtB,QAAQ;YACR,KAAK;YACL,MAAM;QACR;QACA,IAAI,IAAI,IAAI,CAAC,MAAM,KAAK,WAAW;YACjC,CAAA,GAAA,yCAAQ,EAAE,WAAW;YAErB,OAAO,UAAU,CAAC;gBAChB,SAAS,MAAM,CAAC;YAClB,GAAG;QACL;IACF,EAAE,OAAO,KAAK;QACZ,CAAA,GAAA,yCAAQ,EAAE,SAAS,IAAI,QAAQ,CAAC,IAAI,CAAC,OAAO;IAC9C;AACF;;;AXPA,eAAe;AAEf,mFAAmF;AACnF,MAAM,kCAAY,SAAS,cAAc,CAAC;AAC1C,MAAM,oCAAc,SAAS,cAAc,CAAC;AAC5C,MAAM,qCAAe,SAAS,cAAc,CAAC;AAC7C,MAAM,qCAAe,SAAS,cAAc,CAAC;AAE7C,oEAAoE;AACpE,MAAM,yCAAmB,SAAS,cAAc,CAAC;AACjD,MAAM,uCAAiB,SAAS,cAAc,CAAC;AAC/C,MAAM,0CAAoB,SAAS,gBAAgB,CAAC;AACpD,MAAM,wCAAkB,SAAS,gBAAgB,CAAC;AAElD,MAAM,0CAAoB,SAAS,cAAc,CAAC;AAClD,MAAM,wCAAkB,SAAS,cAAc,CAAC;AAChD,MAAM,2CAAqB,SAAS,gBAAgB,CAAC;AACrD,MAAM,yCAAmB,SAAS,gBAAgB,CAAC;AAEnD,mEAAmE;AACnE,MAAM,4CAAsB,SAAS,cAAc,CAAC;AACpD,MAAM,6CAAuB,SAAS,cAAc,CAAC;AACrD,MAAM,2CAAqB,SAAS,cAAc,CAAC;AACnD,MAAM,4CAAsB,SAAS,cAAc,CAAC;AACpD,MAAM,yCAAmB,SAAS,gBAAgB,CAAC;AACnD,MAAM,2CAAqB,SAAS,gBAAgB,CAAC;AACrD,MAAM,8CAAwB,SAAS,gBAAgB,CACrD;AAGF,MAAM,8BAAQ,SAAS,cAAc,CAAC;AACtC,MAAM,oCAAc,SAAS,aAAa,CAAC;AAC3C,MAAM,qCAAe,SAAS,gBAAgB,CAAC;AAC/C,MAAM,kCAAY,SAAS,cAAc,CAAC;AAE1C,MAAM,iDAA2B,SAAS,cAAc,CACtD;AAGF,8CAA8C;AAC9C,IAAI,iCACF,kCAAY,gBAAgB,CAAC,UAAU,CAAC;IACtC,IAAI,CAAC,KAAK,aAAa,IAAI;QACzB,2CAA2C;QAC3C,KAAK,cAAc;QACnB;IACF;IACA,EAAE,cAAc;IAChB,MAAM,QAAQ,SAAS,cAAc,CAAC,SAAS,KAAK;IACpD,MAAM,WAAW,SAAS,cAAc,CAAC,YAAY,KAAK;IAC1D,CAAA,GAAA,yCAAI,EAAE,OAAO;IACb,CAAA,GAAA,yCAAqB;AACvB;AAEF,IAAI,oCACF,mCAAa,gBAAgB,CAAC,SAAS,CAAC;IACtC,EAAE,cAAc;IAChB,MAAM,OAAO,SAAS,cAAc,CAAC,QAAQ,KAAK;IAClD,MAAM,QAAQ,SAAS,cAAc,CAAC,SAAS,KAAK;IACpD,MAAM,SAAS,SAAS,cAAc,CAAC,UAAU,KAAK;IACtD,MAAM,WAAW,SAAS,cAAc,CAAC,YAAY,KAAK;IAC1D,MAAM,kBAAkB,SAAS,cAAc,CAAC,mBAAmB,KAAK;IACxE,CAAA,GAAA,yCAAK,EAAE,MAAM,OAAO,QAAQ,UAAU;AACxC;AAEF,IAAI,oCACF,mCAAa,gBAAgB,CAAC,SAAS,CAAC;IACtC,EAAE,cAAc;IAChB,CAAA,GAAA,yCAAK;AACP;AAEF,0FAA0F;AAE1F,4EAA4E;AAC5E,IAAI,wCACF,uCAAiB,gBAAgB,CAAC,SAAS,CAAC;IAC1C,EAAE,cAAc;IAChB,MAAM,WAAW,SAAS,cAAc,CAAC,QAAQ,KAAK;IACtD,MAAM,YAAY,SAAS,cAAc,CAAC,SAAS,KAAK;IACxD,MAAM,aAAa,SAAS,cAAc,CAAC,UAAU,KAAK;IAC1D,MAAM,eAAe,SAAS,cAAc,CAAC,YAAY,KAAK;IAC9D,MAAM,sBACJ,SAAS,cAAc,CAAC,mBAAmB,KAAK;IAClD,CAAA,GAAA,yCAAc,EACZ,UACA,WACA,YACA,cACA;AAEJ;AAEF,IAAI,uCACF,sCAAgB,OAAO,CAAC,CAAC,OACvB,KAAK,gBAAgB,CAAC,SAAS,CAAC;QAC9B,EAAE,cAAc;QAChB,MAAM,SAAS,EAAE,MAAM,CAAC,aAAa,CAAC,aAAa,CAAC;QACpD,MAAM,eAAe,gBAAgB,OAAO,WAAW;QACvD,SAAS,MAAM,CAAC;IAClB;AAGJ,IAAI,yCACF,wCAAkB,OAAO,CAAC,CAAC,OACzB,KAAK,gBAAgB,CAAC,SAAS,CAAC;QAC9B,EAAE,cAAc;QAChB,MAAM,SAAS,EAAE,MAAM,CAAC,aAAa,CAAC,aAAa,CAAC;QACpD,CAAA,GAAA,yCAAc,EAAE,OAAO,WAAW;IACpC;AAGJ,IAAI,sCACF,qCAAe,gBAAgB,CAAC,SAAS,CAAC;IACxC,EAAE,cAAc;IAChB,MAAM,WAAW,SAAS,cAAc,CAAC,QAAQ,KAAK;IACtD,MAAM,YAAY,SAAS,cAAc,CAAC,SAAS,KAAK;IACxD,MAAM,aAAa,SAAS,cAAc,CAAC,UAAU,KAAK;IAC1D,MAAM,SAAS,SAAS,cAAc,CAAC,UAAU,WAAW;IAC5D,CAAA,GAAA,yCAAc,EAAE,QAAQ,UAAU,WAAW;AAC/C;AAEF,IAAI,wCACF,uCAAiB,gBAAgB,CAAC,SAAS,CAAC;IAC1C,EAAE,cAAc;IAChB,MAAM,WAAW,SAAS,cAAc,CAAC,QAAQ,KAAK;IACtD,MAAM,YAAY,SAAS,cAAc,CAAC,SAAS,KAAK;IACxD,MAAM,aAAa,SAAS,cAAc,CAAC,UAAU,KAAK;IAC1D,MAAM,eAAe,SAAS,cAAc,CAAC,YAAY,KAAK;IAC9D,MAAM,sBACJ,SAAS,cAAc,CAAC,mBAAmB,KAAK;IAClD,CAAA,GAAA,yCAAc,EACZ,UACA,WACA,YACA,cACA;AAEJ;AAEF,kEAAkE;AAElE,IAAI,yCACF,wCAAkB,gBAAgB,CAAC,SAAS,CAAC;IAC3C,EAAE,cAAc;IAChB,IAAI,OAAO,CAAC;IACZ,KAAK,SAAS,GAAG,SAAS,cAAc,CAAC,aAAa,KAAK;IAC3D,KAAK,aAAa,GAAG,SAAS,cAAc,CAAC,iBAAiB,KAAK;IACnE,KAAK,SAAS,GAAG,SAAS,cAAc,CAAC,aAAa,KAAK;IAC3D,KAAK,SAAS,GAAG,SAAS,cAAc,CAAC,aAAa,KAAK;IAC3D,KAAK,cAAc,GAAG,SAAS,cAAc,CAAC,kBAAkB,KAAK;IACrE,KAAK,cAAc,GAAG,SAAS,cAAc,CAAC,kBAAkB,KAAK;IACrE,KAAK,gBAAgB,GAAG,SAAS,cAAc,CAAC,oBAAoB,KAAK;IACzE,KAAK,sBAAsB,GAAG,SAAS,cAAc,CACnD,0BACA,KAAK;IACP,KAAK,gBAAgB,GAAG,SAAS,cAAc,CAAC,oBAAoB,KAAK;IACzE,KAAK,iBAAiB,GAAG,SAAS,cAAc,CAAC,qBAAqB,KAAK;IAC3E,KAAK,kBAAkB,GACrB,SAAS,cAAc,CAAC,sBAAsB,KAAK;IACrD,CAAA,GAAA,yCAAe,EAAE;AACnB;AAEF,IAAI,wCACF,uCAAiB,OAAO,CAAC,CAAC,OACxB,KAAK,gBAAgB,CAAC,SAAS,CAAC;QAC9B,EAAE,cAAc;QAChB,MAAM,UAAU,EAAE,MAAM,CAAC,aAAa,CAAC,aAAa,CAAC;QACrD,MAAM,eAAe,iBAAiB,QAAQ,WAAW;QACzD,SAAS,MAAM,CAAC;IAClB;AAGJ,IAAI,0CACF,yCAAmB,OAAO,CAAC,CAAC,OAC1B,KAAK,gBAAgB,CAAC,SAAS,CAAC;QAC9B,EAAE,cAAc;QAChB,MAAM,UAAU,EAAE,MAAM,CAAC,aAAa,CAAC,aAAa,CAAC;QACrD,CAAA,GAAA,wCAAe,EAAE,QAAQ,WAAW;IACtC;AAGJ,IAAI,uCACF,sCAAgB,gBAAgB,CAAC,SAAS,CAAC;IACzC,IAAI,OAAO,CAAC;IACZ,EAAE,cAAc;IAChB,KAAK,OAAO,GAAG,SAAS,cAAc,CAAC,WAAW,WAAW;IAC7D,KAAK,SAAS,GAAG,SAAS,cAAc,CAAC,aAAa,KAAK;IAC3D,KAAK,aAAa,GAAG,SAAS,cAAc,CAAC,iBAAiB,KAAK;IACnE,KAAK,SAAS,GAAG,SAAS,cAAc,CAAC,aAAa,KAAK;IAC3D,KAAK,SAAS,GAAG,SAAS,cAAc,CAAC,aAAa,KAAK;IAC3D,KAAK,cAAc,GAAG,SAAS,cAAc,CAAC,kBAAkB,KAAK;IACrE,KAAK,cAAc,GAAG,SAAS,cAAc,CAAC,kBAAkB,KAAK;IACrE,KAAK,gBAAgB,GAAG,SAAS,cAAc,CAAC,oBAAoB,KAAK;IACzE,KAAK,sBAAsB,GAAG,SAAS,cAAc,CACnD,0BACA,KAAK;IACP,KAAK,gBAAgB,GAAG,SAAS,cAAc,CAAC,oBAAoB,KAAK;IACzE,KAAK,iBAAiB,GAAG,SAAS,cAAc,CAAC,qBAAqB,KAAK;IAC3E,KAAK,kBAAkB,GACrB,SAAS,cAAc,CAAC,sBAAsB,KAAK;IACrD,CAAA,GAAA,yCAAe,EAAE;AACnB;AAEF,mDAAmD,GACnD,IAAI,2CACF,0CAAoB,gBAAgB,CAAC,SAAS,CAAC;IAC7C,EAAE,cAAc;IAChB,IAAI,OAAO,CAAC;IACZ,KAAK,IAAI,GAAG,SAAS,cAAc,CAAC,QAAQ,KAAK;IACjD,KAAK,KAAK,GAAG,SAAS,cAAc,CAAC,SAAS,KAAK;IACnD,KAAK,MAAM,GAAG,SAAS,cAAc,CAAC,UAAU,KAAK;IACrD,KAAK,MAAM,GAAG,SAAS,cAAc,CAAC,UAAU,WAAW;IAC3D,MAAM,OAAO;IACb,CAAA,GAAA,yCAAO,EAAE,MAAM;IACf,SAAS,MAAM,CAAC;AAClB;AAEF,IAAI,4CACF,2CAAqB,gBAAgB,CAAC,SAAS,CAAC;IAC9C,EAAE,cAAc;IAChB,IAAI,OAAO,CAAC;IACZ,KAAK,eAAe,GAAG,SAAS,cAAc,CAAC,mBAAmB,KAAK;IACvE,KAAK,WAAW,GAAG,SAAS,cAAc,CAAC,eAAe,KAAK;IAC/D,KAAK,kBAAkB,GACrB,SAAS,cAAc,CAAC,sBAAsB,KAAK;IACrD,KAAK,MAAM,GAAG,SAAS,cAAc,CAAC,UAAU,WAAW;IAC3D,MAAM,OAAO;IACb,CAAA,GAAA,yCAAO,EAAE,MAAM;IACf,SAAS,MAAM,CAAC;AAClB;AAEF,IAAI,0CACF,yCAAmB,gBAAgB,CAAC,SAAS,CAAC;IAC5C,EAAE,cAAc;IAChB,IAAI,OAAO,CAAC;IACZ,KAAK,KAAK,GAAG,SAAS,cAAc,CAAC,SAAS,KAAK;IACnD,CAAA,GAAA,yCAAkB,EAAE;AACtB;AAEF,IAAI,2CACF,0CAAoB,gBAAgB,CAAC,SAAS,CAAC;IAC7C,EAAE,cAAc;IAChB,IAAI,OAAO,CAAC;IACZ,KAAK,QAAQ,GAAG,SAAS,cAAc,CAAC,eAAe,KAAK;IAC5D,KAAK,eAAe,GAAG,SAAS,cAAc,CAAC,sBAAsB,KAAK;IAC1E,KAAK,UAAU,GAAG,SAAS,cAAc,CAAC,cAAc,WAAW;IACnE,CAAA,GAAA,yCAAiB,EAAE;AACrB;AAEF,IAAI,wCACF,uCAAiB,OAAO,CAAC,CAAC,OACxB,KAAK,gBAAgB,CAAC,SAAS,CAAC;QAC9B,EAAE,cAAc;QAChB,MAAM,UAAU,EAAE,MAAM,CAAC,aAAa,CAAC,aAAa,CAAC;QACrD,CAAA,GAAA,yCAAsB,EAAE,QAAQ,WAAW;IAC7C;AAGJ,IAAI,0CACF,yCAAmB,OAAO,CAAC,CAAC,OAC1B,KAAK,gBAAgB,CAAC,SAAS,CAAC;QAC9B,EAAE,cAAc;QAChB,MAAM,UAAU,EAAE,MAAM,CAAC,aAAa,CAAC,aAAa,CAAC;QACrD,CAAA,GAAA,yCAAsB,EAAE,QAAQ,WAAW;IAC7C;AAGJ,IAAI,6CACF,4CAAsB,OAAO,CAAC,CAAC,OAC7B,KAAK,gBAAgB,CAAC,SAAS,CAAC;QAC9B,EAAE,cAAc;QAChB,MAAM,UAAU,EAAE,MAAM,CAAC,aAAa,CAAC,aAAa,CAAC;QACrD,MAAM,eAAe,4BAA4B,QAAQ,WAAW;QACpE,SAAS,MAAM,CAAC;IAClB;AAEJ,uCAAuC;AACvC,0EAA0E;AAC1E,IAAI,oCACF,mCAAa,OAAO,CAAC,CAAC,OACpB,KAAK,gBAAgB,CAAC,SAAS,CAAC;QAC9B,EAAE,cAAc,IAAI,2BAA2B;QAE/C,0CAA0C;QAC1C,MAAM,QAAQ,KAAK,YAAY,CAAC;QAChC,MAAM,aAAa,KAAK,YAAY,CAAC;QACrC,MAAM,UAAU,KAAK,YAAY,CAAC,iBAAiB,kBAAkB;QAErE,4DAA4D;QAC5D,SAAS,cAAc,CAAC,cAAc,KAAK,GAAG;QAC9C,SAAS,cAAc,CAAC,cAAc,KAAK,GAAG;QAC9C,SAAS,cAAc,CAAC,WAAW,KAAK,GAAG,SAAS,0BAA0B;QAE9E,iBAAiB;QACjB,4BAAM,KAAK,CAAC,OAAO,GAAG;IACxB;AAGJ,sDAAsD;AACtD,IAAI,mCACF,kCAAY,gBAAgB,CAAC,SAAS,CAAC;IACrC,EAAE,cAAc;IAChB,4BAAM,KAAK,CAAC,OAAO,GAAG,QAAQ,kBAAkB;AAClD;AAEF,4DAA4D;AAC5D,OAAO,OAAO,GAAG,SAAU,CAAC;IAC1B,IAAI,EAAE,MAAM,IAAI,6BACd,4BAAM,KAAK,CAAC,OAAO,GAAG,QAAQ,kBAAkB;AAEpD;AAEA,uCAAuC;AACvC,IAAI,iCACF,gCAAU,gBAAgB,CAAC,UAAU,OAAO;IAC1C,EAAE,cAAc,IAAI,kCAAkC;IAEtD,MAAM,WAAW,IAAI,SAAS;IAC9B,MAAM,OAAO,CAAC;IACd,SAAS,OAAO,CAAC,CAAC,OAAO;QACvB,IAAI,CAAC,IAAI,GAAG;IACd;IAEA,CAAA,GAAA,yCAAyB,EAAE;IAC3B,4BAAM,KAAK,CAAC,OAAO,GAAG,QAAQ,kBAAkB;IAEhD,uDAAuD;IACvD,MAAM,UAAU,SAAS,cAAc,CAAC,WAAW,KAAK;IACxD,MAAM,eAAe,4BAA4B;IACjD,SAAS,MAAM,CAAC,eAAe,gCAAgC;AACjE;AAGF,IAAI,gDACF,+CAAyB,gBAAgB,CAAC,SAAS,CAAC;IAClD,EAAE,cAAc;IAChB,IAAI,OAAO,CAAC;IACZ,KAAK,cAAc,GAAG,SAAS,cAAc,CAAC,kBAAkB,KAAK;IACrE,KAAK,WAAW,GAAG,SAAS,cAAc,CAAC,eAAe,KAAK;IAC/D,KAAK,WAAW,GAAG,SAAS,cAAc,CAAC,eAAe,KAAK;IAC/D,KAAK,qBAAqB,GAAG,SAAS,cAAc,CAClD,yBACA,KAAK;IACP,KAAK,YAAY,GAAG,SAAS,cAAc,CAAC,gBAAgB,KAAK;IACjE,CAAA,GAAA,yCAAwB,EAAE;AAC5B","sources":["public/js/index.js","public/js/login.js","public/js/alerts.js","public/js/logout.js","public/js/signUp.js","public/js/_deprecated_adminCreateUser.js","public/js/updateAc.js","public/js/eventsPubJs.js","public/js/usersPubJs.js","public/js/forgotPasswordPubJs.js","public/js/resetPasswordPubJs.js","public/js/settingsPubJs.js"],"sourcesContent":["/*eslint-disable*/\nimport \"core-js/stable\";\nimport \"regenerator-runtime/runtime\";\nimport { login } from \"./login\";\nimport { logOut } from \"./logout\";\nimport { signUp } from \"./signUp\";\nimport { adminCreateUser } from \"./_deprecated_adminCreateUser\";\nimport { updateAc } from \"./updateAc\";\nimport {\n  createEventPubJs,\n  updateEventPubJs,\n  deleteEventPubJs,\n  eventCreateBookingPubJs,\n  eventCancelBookingPubJs,\n  eventUpdateMatchScorePubJs,\n} from \"./eventsPubJs\";\nimport {\n  createUserPubJs,\n  updateUserPubJs,\n  deleteUserPubJs,\n} from \"./usersPubJs\";\nimport { forgotPasswordPubJs } from \"./forgotPasswordPubJs\";\nimport { resetPasswordPubJs } from \"./resetPasswordPubJs\";\nimport {\n  getSystemSettingsPubJs,\n  manageSystemSettingsPubJs,\n} from \"./settingsPubJs\";\n\n// DOM ELements\n\n//Auth Elements -- note all these functions are in public/js folder NOT auth routes\nconst loginForm = document.getElementById(\"loginForm\");\nconst loginButton = document.getElementById(\"loginButton\");\nconst signUpButton = document.getElementById(\"signUpButton\");\nconst logOutButton = document.getElementById(\"logOutButton\");\n\n// Admin elements for creating, updating, deleteing Users and Events\nconst createUserButton = document.getElementById(\"createUserButton\");\nconst saveUserButton = document.getElementById(\"saveUserButton\");\nconst deleteUserButtons = document.querySelectorAll(\"a.deleteUserButtons\");\nconst editUserButtons = document.querySelectorAll(\"a.editUserButtons\");\n\nconst createEventButton = document.getElementById(\"createEventButton\");\nconst saveEventButton = document.getElementById(\"saveEventButton\");\nconst deleteEventButtons = document.querySelectorAll(\"a.deleteEventButtons\");\nconst editEventButtons = document.querySelectorAll(\"a.editEventButtons\");\n\n// User Elements for editing profile, booking and cencelling events\nconst saveAcDetailsButton = document.getElementById(\"saveAcDetailsButton\");\nconst updatePasswordButton = document.getElementById(\"updatePasswordButton\");\nconst forgotPasswordLink = document.getElementById(\"forgotPasswordLink\");\nconst resetPasswordButton = document.getElementById(\"resetPasswordButton\");\nconst bookEventButtons = document.querySelectorAll(\"a.bookEventButtons\");\nconst cancelEventButtons = document.querySelectorAll(\"a.cancelEventButtons\");\nconst viewMyScheduleButtons = document.querySelectorAll(\n  \"a.viewMyScheduleButtons\"\n);\n\nconst modal = document.getElementById(\"scoreModal\");\nconst closeButton = document.querySelector(\".close\");\nconst scoreButtons = document.querySelectorAll(\".score-button\");\nconst scoreForm = document.getElementById(\"scoreForm\");\n\nconst saveSystemSettingsButton = document.getElementById(\n  \"saveSystemSettingsButton\"\n);\n\n//******************** Authorization functions\nif (loginForm)\n  loginButton.addEventListener(\"submit\", (e) => {\n    if (!form.checkValidity()) {\n      // Let the browser show validation messages\n      form.reportValidity();\n      return;\n    }\n    e.preventDefault();\n    const email = document.getElementById(\"email\").value;\n    const password = document.getElementById(\"password\").value;\n    login(email, password);\n    getSystemSettingsPubJs();\n  });\n\nif (signUpButton)\n  signUpButton.addEventListener(\"click\", (e) => {\n    e.preventDefault();\n    const name = document.getElementById(\"name\").value;\n    const email = document.getElementById(\"email\").value;\n    const mobile = document.getElementById(\"mobile\").value;\n    const password = document.getElementById(\"password\").value;\n    const passwordConfirm = document.getElementById(\"passwordConfirm\").value;\n    signUp(name, email, mobile, password, passwordConfirm);\n  });\n\nif (logOutButton)\n  logOutButton.addEventListener(\"click\", (e) => {\n    e.preventDefault();\n    logOut();\n  });\n\n// ******************   Admin functions for creating, updating, deleteing Users and Events\n\n// *************************** Users ***************************************\nif (createUserButton)\n  createUserButton.addEventListener(\"click\", (e) => {\n    e.preventDefault();\n    const userName = document.getElementById(\"name\").value;\n    const userEmail = document.getElementById(\"email\").value;\n    const userMobile = document.getElementById(\"mobile\").value;\n    const userPassword = document.getElementById(\"password\").value;\n    const userPasswordConfirm =\n      document.getElementById(\"passwordConfirm\").value;\n    createUserPubJs(\n      userName,\n      userEmail,\n      userMobile,\n      userPassword,\n      userPasswordConfirm\n    );\n  });\n\nif (editUserButtons)\n  editUserButtons.forEach((item) =>\n    item.addEventListener(\"click\", (e) => {\n      e.preventDefault();\n      const userId = e.target.parentElement.querySelector(\".userId\");\n      const locationPath = \"/users/get/\" + userId.textContent;\n      location.assign(locationPath);\n    })\n  );\n\nif (deleteUserButtons)\n  deleteUserButtons.forEach((item) =>\n    item.addEventListener(\"click\", (e) => {\n      e.preventDefault();\n      const userId = e.target.parentElement.querySelector(\".userId\");\n      deleteUserPubJs(userId.textContent);\n    })\n  );\n\nif (saveUserButton)\n  saveUserButton.addEventListener(\"click\", (e) => {\n    e.preventDefault();\n    const userName = document.getElementById(\"name\").value;\n    const userEmail = document.getElementById(\"email\").value;\n    const userMobile = document.getElementById(\"mobile\").value;\n    const userId = document.getElementById(\"userId\").textContent;\n    updateUserPubJs(userId, userName, userEmail, userMobile);\n  });\n\nif (createUserButton)\n  createUserButton.addEventListener(\"click\", (e) => {\n    e.preventDefault();\n    const userName = document.getElementById(\"name\").value;\n    const userEmail = document.getElementById(\"email\").value;\n    const userMobile = document.getElementById(\"mobile\").value;\n    const userPassword = document.getElementById(\"password\").value;\n    const userPasswordConfirm =\n      document.getElementById(\"passwordConfirm\").value;\n    adminCreateUser(\n      userName,\n      userEmail,\n      userMobile,\n      userPassword,\n      userPasswordConfirm\n    );\n  });\n\n// ***************************** Events **************************\n\nif (createEventButton)\n  createEventButton.addEventListener(\"click\", (e) => {\n    e.preventDefault();\n    let data = {};\n    data.eventName = document.getElementById(\"eventName\").value;\n    data.eventLocation = document.getElementById(\"eventLocation\").value;\n    data.eventType = document.getElementById(\"eventType\").value;\n    data.eventDate = document.getElementById(\"eventDate\").value;\n    data.eventStartTime = document.getElementById(\"eventStartTime\").value;\n    data.eventOrganiser = document.getElementById(\"eventOrganiser\").value;\n    data.eventNumOfCourts = document.getElementById(\"eventNumOfCourts\").value;\n    data.numOfStandOutsPerRound = document.getElementById(\n      \"numOfStandOutsPerRound\"\n    ).value;\n    data.eventNumOfRounds = document.getElementById(\"eventNumOfRounds\").value;\n    data.eventWaitListSize = document.getElementById(\"eventWaitListSize\").value;\n    data.eventNumOfPairings =\n      document.getElementById(\"eventNumOfPairings\").value;\n    createEventPubJs(data);\n  });\n\nif (editEventButtons)\n  editEventButtons.forEach((item) =>\n    item.addEventListener(\"click\", (e) => {\n      e.preventDefault();\n      const eventId = e.target.parentElement.querySelector(\".eventId\");\n      const locationPath = \"/events/get/\" + eventId.textContent;\n      location.assign(locationPath);\n    })\n  );\n\nif (deleteEventButtons)\n  deleteEventButtons.forEach((item) =>\n    item.addEventListener(\"click\", (e) => {\n      e.preventDefault();\n      const eventId = e.target.parentElement.querySelector(\".eventId\");\n      deleteEventPubJs(eventId.textContent);\n    })\n  );\n\nif (saveEventButton)\n  saveEventButton.addEventListener(\"click\", (e) => {\n    let data = {};\n    e.preventDefault();\n    data.eventId = document.getElementById(\"eventId\").textContent;\n    data.eventName = document.getElementById(\"eventName\").value;\n    data.eventLocation = document.getElementById(\"eventLocation\").value;\n    data.eventType = document.getElementById(\"eventType\").value;\n    data.eventDate = document.getElementById(\"eventDate\").value;\n    data.eventStartTime = document.getElementById(\"eventStartTime\").value;\n    data.eventOrganiser = document.getElementById(\"eventOrganiser\").value;\n    data.eventNumOfCourts = document.getElementById(\"eventNumOfCourts\").value;\n    data.numOfStandOutsPerRound = document.getElementById(\n      \"numOfStandOutsPerRound\"\n    ).value;\n    data.eventNumOfRounds = document.getElementById(\"eventNumOfRounds\").value;\n    data.eventWaitListSize = document.getElementById(\"eventWaitListSize\").value;\n    data.eventNumOfPairings =\n      document.getElementById(\"eventNumOfPairings\").value;\n    updateEventPubJs(data);\n  });\n\n/******** User functions    ************************/\nif (saveAcDetailsButton)\n  saveAcDetailsButton.addEventListener(\"click\", (e) => {\n    e.preventDefault();\n    let data = {};\n    data.name = document.getElementById(\"name\").value;\n    data.email = document.getElementById(\"email\").value;\n    data.mobile = document.getElementById(\"mobile\").value;\n    data.userId = document.getElementById(\"userId\").textContent;\n    const type = \"account\";\n    updateAc(data, type);\n    location.assign(\"/events/browseNew\");\n  });\n\nif (updatePasswordButton)\n  updatePasswordButton.addEventListener(\"click\", (e) => {\n    e.preventDefault();\n    let data = {};\n    data.currentPassword = document.getElementById(\"currentPassword\").value;\n    data.newPassword = document.getElementById(\"newPassword\").value;\n    data.newPasswordConfirm =\n      document.getElementById(\"newPasswordConfirm\").value;\n    data.userId = document.getElementById(\"userId\").textContent;\n    const type = \"password\";\n    updateAc(data, type);\n    location.assign(\"/events/browseNew\");\n  });\n\nif (forgotPasswordLink)\n  forgotPasswordLink.addEventListener(\"click\", (e) => {\n    e.preventDefault();\n    let data = {};\n    data.email = document.getElementById(\"email\").value;\n    forgotPasswordPubJs(data);\n  });\n\nif (resetPasswordButton)\n  resetPasswordButton.addEventListener(\"click\", (e) => {\n    e.preventDefault();\n    let data = {};\n    data.password = document.getElementById(\"newPassword\").value;\n    data.passwordConfirm = document.getElementById(\"newPasswordConfirm\").value;\n    data.resetToken = document.getElementById(\"resetToken\").textContent;\n    resetPasswordPubJs(data);\n  });\n\nif (bookEventButtons)\n  bookEventButtons.forEach((item) =>\n    item.addEventListener(\"click\", (e) => {\n      e.preventDefault();\n      const eventId = e.target.parentElement.querySelector(\".eventId\");\n      eventCreateBookingPubJs(eventId.textContent);\n    })\n  );\n\nif (cancelEventButtons)\n  cancelEventButtons.forEach((item) =>\n    item.addEventListener(\"click\", (e) => {\n      e.preventDefault();\n      const eventId = e.target.parentElement.querySelector(\".eventId\");\n      eventCancelBookingPubJs(eventId.textContent);\n    })\n  );\n\nif (viewMyScheduleButtons)\n  viewMyScheduleButtons.forEach((item) =>\n    item.addEventListener(\"click\", (e) => {\n      e.preventDefault();\n      const eventId = e.target.parentElement.querySelector(\".eventId\");\n      const locationPath = \"/events/viewMySchedule/\" + eventId.textContent;\n      location.assign(locationPath);\n    })\n  );\n// Get the buttons to trigger the popup\n// Loop through all score buttons and add click event to trigger the modal\nif (scoreButtons)\n  scoreButtons.forEach((item) =>\n    item.addEventListener(\"click\", (e) => {\n      e.preventDefault(); // Prevent default behavior\n\n      // Extract data attributes from the button\n      const round = item.getAttribute(\"data-round\");\n      const matchIndex = item.getAttribute(\"data-matchindex\");\n      const eventId = item.getAttribute(\"data-eventid\"); // Extract eventId\n\n      // Set hidden input values (roundIndex, matchIndex, eventId)\n      document.getElementById(\"roundIndex\").value = round;\n      document.getElementById(\"matchIndex\").value = matchIndex;\n      document.getElementById(\"eventId\").value = eventId; // Set eventId in the form\n\n      // Show the modal\n      modal.style.display = \"block\";\n    })\n  );\n\n// When the user clicks on <span> (x), close the modal\nif (closeButton)\n  closeButton.addEventListener(\"click\", (e) => {\n    e.preventDefault();\n    modal.style.display = \"none\"; // Close the modal\n  });\n\n// When the user clicks anywhere outside the modal, close it\nwindow.onclick = function (e) {\n  if (e.target == modal) {\n    modal.style.display = \"none\"; // Close the modal\n  }\n};\n\n// Handle form submission for the score\nif (scoreForm) {\n  scoreForm.addEventListener(\"submit\", async (e) => {\n    e.preventDefault(); // Prevent default form submission\n\n    const formData = new FormData(scoreForm);\n    const data = {};\n    formData.forEach((value, key) => {\n      data[key] = value;\n    });\n\n    eventUpdateMatchScorePubJs(data);\n    modal.style.display = \"none\"; // Close the modal\n\n    //Navigate to the schedule page after submitting scores\n    const eventId = document.getElementById(\"eventId\").value;\n    const locationPath = \"/events/viewMySchedule/\" + eventId;\n    location.assign(locationPath); // Navigate to the schedule page\n  });\n}\n\nif (saveSystemSettingsButton)\n  saveSystemSettingsButton.addEventListener(\"click\", (e) => {\n    e.preventDefault();\n    let data = {};\n    data.numOfStandOuts = document.getElementById(\"numOfStandOuts\").value;\n    data.numOfRounds = document.getElementById(\"numOfRounds\").value;\n    data.numOfCourts = document.getElementById(\"numOfCourts\").value;\n    data.numOfPairingsPerCourt = document.getElementById(\n      \"numOfPairingsPerCourt\"\n    ).value;\n    data.waitListSize = document.getElementById(\"waitListSize\").value;\n    manageSystemSettingsPubJs(data);\n  });\n","/* eslint-disable */\nimport \"core-js/stable\";\nimport \"regenerator-runtime/runtime\";\nimport axios from \"axios\";\nimport { showAlert } from \"./alerts\";\n\nexport const login = async (email, password) => {\n  try {\n    const res = await axios({\n      method: \"POST\",\n      url: \"/api/v1/users/login\",\n      data: {\n        email,\n        password,\n      },\n    });\n    if (res.data.status === \"success\") {\n      let landingPage = \"\";\n\n      showAlert(\"success\", \"Logged in successfully\");\n      if (res.data.user.role === \"clubAdmin\") {\n        landingPage = \"/events/showAll\";\n      } else {\n        landingPage = \"/events/myBrowse\";\n      }\n\n      window.setTimeout(() => {\n        location.assign(landingPage);\n      }, 1500);\n    }\n  } catch (err) {\n    showAlert(\"error\", err.response.data.message);\n  }\n};\n\nexport const logout = async () => {\n  try {\n    const res = await axios({\n      method: \"GET\",\n      url: \"/api/v1/users/logout\",\n    });\n    if (res.data.status === \"success\") {\n      showAlert(\"success\", \"Logged out successfully\");\n      window.setTimeout(() => {\n        location.assign(\"/\");\n      }, 1500);\n    }\n  } catch (err) {\n    showAlert(\"error\", err.response.data.message);\n  }\n};\n","// type is 'success' or 'error'\n\nexport const hideAlert = () => {\n  const el = document.querySelector('.alert');\n  if (el) el.parentElement.removeChild(el);\n};\n\nexport const showAlert = (type, msg) => {\n  hideAlert();\n  const markup = `<div class=\"alert alert--${type}\">${msg}</div>`;\n  document.querySelector('body').insertAdjacentHTML('afterbegin', markup);\n  window.setTimeout(hideAlert, 5000);\n};\n","/* eslint-disable */\nimport axios from \"axios\";\nimport { showAlert } from \"./alerts\";\n\nexport const logOut = async () => {\n  try {\n    const res = await axios({\n      method: \"GET\",\n      url: \"/api/v1/users/logout\",\n    });\n    if (res.data.status === \"success\") {\n      showAlert(\"success\", \"Logged out successfully\");\n      window.setTimeout(() => {\n        location.assign(\"/\");\n      }, 1500);\n    }\n  } catch (err) {\n    showAlert(\"error\", err.response.data.message);\n  }\n};\n","/* eslint-disable */\nimport axios from \"axios\";\nimport { showAlert } from \"./alerts\";\n\nexport const signUp = async (\n  name,\n  email,\n  mobile,\n  password,\n  passwordConfirm\n) => {\n  try {\n    const res = await axios({\n      method: \"POST\",\n      url: \"/api/v1/users/signup\",\n      data: {\n        name,\n        email,\n        mobile,\n        password,\n        passwordConfirm,\n      },\n    });\n\n    if (res.data.status === \"success\") {\n      showAlert(\"success\", \"Account successfully created\");\n      window.setTimeout(() => {\n        location.assign(\"/events/showall\");\n      }, 1500);\n    }\n  } catch (err) {\n    showAlert(\"error\", err.response.data.message);\n  }\n};\n","/* eslint-disable */\nimport axios from \"axios\";\nimport { showAlert } from \"./alerts\";\n\nexport const adminCreateUser = async (\n  name,\n  email,\n  mobile,\n  password,\n  passwordConfirm\n) => {\n  try {\n    const res = await axios({\n      method: \"POST\",\n      url: \"/api/v1/users/signup\",\n      data: {\n        name,\n        email,\n        mobile,\n        password,\n        passwordConfirm,\n      },\n    });\n\n    if (res.data.status === \"success\") {\n      showAlert(\"success\", \"Account successfully created\");\n      window.setTimeout(() => {\n        location.assign(\"/users/showall\");\n      }, 1500);\n    }\n  } catch (err) {\n    showAlert(\"error\", err.response.data.message);\n  }\n};\n","/* eslint-disable */\nimport axios from \"axios\";\nimport { showAlert } from \"./alerts\";\n\n// type is either 'password' or 'data'\nexport const updateAc = async (data, type) => {\n  try {\n    const url =\n      type === \"password\"\n        ? \"/api/v1/users/updateMyPassword\"\n        : \"/api/v1/users/updateAcDetails\";\n\n    const res = await axios({\n      method: \"PATCH\",\n      url,\n      data,\n    });\n\n    if (res.data.status === \"success\") {\n      showAlert(\"success\", `${type.toUpperCase()} updated successfully!`);\n    }\n  } catch (err) {\n    showAlert(\"error\", err.response.data.message);\n  }\n};\n","/* eslint-disable */\nimport axios from \"axios\";\nimport { showAlert } from \"./alerts\";\n\nexport const createEventPubJs = async (data) => {\n  try {\n    const res = await axios({\n      method: \"POST\",\n      url: \"/api/v1/events\",\n      data: data,\n    });\n    if (res.data.status === \"success\") {\n      showAlert(\"success\", \"Event successfully created\");\n\n      window.setTimeout(() => {\n        location.assign(\"/events/showAll\");\n      }, 1500);\n    }\n  } catch (err) {\n    showAlert(\"error\", err.response.data.message);\n  }\n};\n\nexport const updateEventPubJs = async (data) => {\n  try {\n    const res = await axios({\n      method: \"PATCH\",\n      url: `/api/v1/events/${data.eventId}`,\n      data: data,\n    });\n    if (res.status === 204) {\n      showAlert(\"success\", \"Event successfully updated\");\n\n      window.setTimeout(() => {\n        location.assign(\"/events/showAll\");\n      }, 1500);\n    }\n  } catch (err) {\n    showAlert(\"error\", err.response.data.message);\n  }\n};\n\nexport const deleteEventPubJs = async (eventId) => {\n  try {\n    const res = await axios({\n      method: \"DELETE\",\n      url: `/api/v1/events/${eventId}`,\n    });\n    if (res.status === 204) {\n      showAlert(\"success\", \"Event successfully deleted\");\n\n      window.setTimeout(() => {\n        location.assign(\"/events/showAll\");\n      }, 1500);\n    }\n  } catch (err) {\n    showAlert(\"error\", err.response.data.message);\n  }\n};\n\nexport const eventCreateBookingPubJs = async (eventId) => {\n  try {\n    const res = await axios({\n      method: \"PATCH\",\n      url: `/api/v1/events/booking/create`,\n      data: { eventId },\n    });\n    if (res.status === 200) {\n      showAlert(\"success\", \"Booking successfully created\");\n\n      window.setTimeout(() => {\n        location.assign(\"/events/myBrowse\");\n      }, 1500);\n    }\n  } catch (err) {\n    showAlert(\"error\", err.response.data.message);\n  }\n};\n\nexport const eventCancelBookingPubJs = async (eventId) => {\n  try {\n    const res = await axios({\n      method: \"PATCH\",\n      url: `/api/v1/events/booking/cancel`,\n      data: { eventId },\n    });\n    if (res.status === 200) {\n      showAlert(\"success\", \"Booking successfully cancelled\");\n\n      window.setTimeout(() => {\n        location.assign(\"/events/myBrowse\");\n      }, 1500);\n    }\n  } catch (err) {\n    showAlert(\"error\", err.response.data.message);\n  }\n};\n\nexport const eventUpdateMatchScorePubJs = async (formData) => {\n  try {\n    const res = await axios({\n      method: \"PATCH\",\n      url: `/api/v1/events/updateMatchScore`,\n      data: formData,\n    });\n\n    if (res.status === 200) {\n      showAlert(\"success\", \"Match score successfully saved\");\n\n      window.setTimeout(() => {\n        location.assign(\"/events/myBrowse\");\n      }, 1500);\n    }\n  } catch (err) {\n    showAlert(\"error\", err.response.data.message);\n    window.setTimeout(() => {\n      location.assign(\"/events/myBrowse\");\n    }, 1500);\n  }\n};\n","/* eslint-disable */\nimport axios from \"axios\";\nimport { showAlert } from \"./alerts\";\n\nexport const createUserPubJs = async (\n  name,\n  email,\n  mobile,\n  password,\n  passwordConfirm\n) => {\n  try {\n    const res = await axios({\n      method: \"POST\",\n      url: \"/api/v1/users\",\n      data: {\n        name,\n        email,\n        mobile,\n        password,\n        passwordConfirm,\n      },\n    });\n    if (res.data.status === \"success\") {\n      showAlert(\"success\", \"User successfully created\");\n\n      window.setTimeout(() => {\n        location.assign(\"/\");\n      }, 1500);\n    }\n  } catch (err) {\n    showAlert(\"error\", err.response.data.message);\n  }\n};\n\nexport const updateUserPubJs = async (userId, name, email, mobile) => {\n  try {\n    const res = await axios({\n      method: \"PATCH\",\n      url: `/api/v1/users/${userId}`,\n      data: {\n        name,\n        email,\n        mobile,\n      },\n    });\n    if (res.status === 204) {\n      showAlert(\"success\", \"User successfully updated\");\n\n      window.setTimeout(() => {\n        location.assign(\"/users/showall\");\n      }, 1500);\n    }\n  } catch (err) {\n    showAlert(\"error\", err.response.data.message);\n  }\n};\n\nexport const deleteUserPubJs = async (userId) => {\n  try {\n    const res = await axios({\n      method: \"DELETE\",\n      url: `/api/v1/users/${userId}`,\n    });\n    if (res.status === 204) {\n      showAlert(\"success\", \"User successfully deleted\");\n\n      window.setTimeout(() => {\n        location.assign(\"/users/showall\");\n      }, 1500);\n    }\n  } catch (err) {\n    showAlert(\"error\", err.response.data.message);\n  }\n};\n","/* eslint-disable */\nimport axios from \"axios\";\nimport { showAlert } from \"./alerts\";\n\nexport const forgotPasswordPubJs = async (data) => {\n  try {\n    const url = \"/api/v1/users/forgotPassword\";\n\n    const res = await axios({\n      method: \"POST\",\n      url,\n      data,\n    });\n\n    if (res.data.status === \"success\") {\n      showAlert(\n        \"success\",\n        `${type.toUpperCase()} reset link sent to your email`\n      );\n    }\n  } catch (err) {\n    showAlert(\"error\", err.response.data.message);\n  }\n};\n","/* eslint-disable */\nimport axios from \"axios\";\nimport { showAlert } from \"./alerts\";\n\nexport const resetPasswordPubJs = async (data) => {\n  try {\n    const url = \"/api/v1/users/passwordReset\";\n\n    const res = await axios({\n      method: \"PATCH\",\n      url,\n      data,\n    });\n\n    if (res.data.status === \"success\") {\n      showAlert(\"success\", `${type.toUpperCase()} password successfully reset`);\n    }\n  } catch (err) {\n    showAlert(\"error\", err.response.data.message);\n  }\n};\n","/* eslint-disable */\nimport axios from \"axios\";\nimport { showAlert } from \"./alerts\";\n\nexport const getSystemSettingsPubJs = async () => {\n  try {\n    const res = await axios({\n      method: \"PATCH\",\n      url: \"/api/v1/settings/get\",\n    });\n    if (res.data.status === \"success\") {\n      console.log(\"success system ettings successfully retrieved\");\n    }\n  } catch (err) {\n    showAlert(\"error\", err.response.data.message);\n  }\n};\n\nexport const manageSystemSettingsPubJs = async (data) => {\n  try {\n    const res = await axios({\n      method: \"PATCH\",\n      url: \"/api/v1/settings/update\",\n      data: data,\n    });\n    if (res.data.status === \"success\") {\n      showAlert(\"success\", \"Settings successfully saved\");\n\n      window.setTimeout(() => {\n        location.assign(\"/events/showAll\");\n      }, 1500);\n    }\n  } catch (err) {\n    showAlert(\"error\", err.response.data.message);\n  }\n};\n"],"names":[],"version":3,"file":"app.js.map","sourceRoot":"/"}
```

## controllers/authController.js

*Size: 12581 bytes*

```js
const crypto = require("crypto");
const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const Settings = require("../models/settingsModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const sendEMail = require("../utils/email");
const mongoose = require("mongoose");

exports.authTimeout = (req, res, next) => {
  try {
    res.setTimeout(15000, () => {
      console.warn(`Auth request timed out: ${req.originalUrl}`);
      res.status(503).send("Request timed out");
    });
    next();
  } catch (err) {
    console.error("Error in authTimeout middleware:", err);
    next(err);
  }
};

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createSendToken = (user, statusCode, req, res, next) => {
  try {
    const token = signToken(user._id);

    res.cookie("jwt", token, {
      expiresIn: new Date(
        Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
      secure: req.secure || req.headers["x-forwarded-proto"] === "https",
    });

    req.session.user = {};
    req.session.systemDefaults = {};

    req.session.user.userId = user._id.toString();
    req.session.user.userName = user.name;
    req.session.user.userRole = user.role;
    req.session.user.userMobile = user.mobile;
    user.password = undefined;

    req.session.save((error) => {
      if (error) {
        console.error("Session save error:", error);
        return next(error);
      }

      res.status(statusCode).json({
        status: "success",
        token,
        user: user,
      });
    });
  } catch (err) {
    console.error("Synchronous error in createSendToken:", err);
    next(err);
  }
};

exports.signup = catchAsync(async (req, res, next) => {
  try {
    if (!req.body.email) throw new AppError("Email is required", 400);
    if (!req.body.password) throw new AppError("Password is required", 400);
    if (!req.body.passwordConfirm)
      throw new AppError("Password confirmation is required", 400);
  } catch (err) {
    console.error("Synchronous error in signup:", err);
    return next(err);
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const newUserArr = await User.create(
      [
        {
          name: req.body.name,
          email: req.body.email,
          mobile: req.body.mobile,
          password: req.body.password,
          passwordConfirm: req.body.passwordConfirm,
          passwordChangedAt: req.body.passwordChangedAt,
          role: req.body.role,
          active: true,
        },
      ],
      { session }
    );
    await session.commitTransaction();
    session.endSession();
    createSendToken(newUserArr[0], 201, req, res, next);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("Signup transaction error:", err);
    next(new AppError("Failed to sign up user", 500));
  }
});

exports.create = catchAsync(async (req, res, next) => {
  try {
    if (!req.body.email) throw new AppError("Email is required", 400);
    if (!req.body.password) throw new AppError("Password is required", 400);
    if (!req.body.passwordConfirm)
      throw new AppError("Password confirmation is required", 400);
  } catch (err) {
    console.error("Synchronous error in create:", err);
    return next(err);
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const newUserArr = await User.create(
      [
        {
          name: req.body.name,
          email: req.body.email,
          mobile: req.body.mobile,
          password: req.body.password,
          passwordConfirm: req.body.passwordConfirm,
          passwordChangedAt: req.body.passwordChangedAt,
          role: req.body.role,
        },
      ],
      { session }
    );
    await session.commitTransaction();
    session.endSession();
    createSendToken(newUserArr[0], 201, req, res, next);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("User creation transaction error:", err);
    next(new AppError("Failed to create user", 500));
  }
});

exports.login = catchAsync(async (req, res, next) => {
  try {
    if (!req.body.email) throw new AppError("Please provide email", 400);
    if (!req.body.password) throw new AppError("Please provide password", 400);
  } catch (err) {
    console.error("Synchronous error in login:", err);
    return next(err);
  }

  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect email or password", 401));
  }

  createSendToken(user, 200, req, res, next);
});

exports.logout = (req, res, next) => {
  try {
    res.cookie("jwt", "loggedout", {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });
    res.locals.user = undefined;
    res.status(200).json({ status: "success" });
  } catch (err) {
    console.error("Synchronous error in logout:", err);
    next(err);
  }
};

exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      res.locals.user = currentUser;
    } catch (err) {
      console.error("Authentication issue:", err);
      return next(new AppError("Issue with Authentication", 401));
    }
  }
  next();
};

exports.protect = catchAsync(async (req, res, next) => {
  let token;

  try {
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      throw new AppError("You are not logged in", 401);
    }
  } catch (err) {
    console.error("Synchronous error in protect:", err);
    return next(err);
  }

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError("The user belonging to the token no longer exists", 401)
    );
  }

  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("User recently changed password please log in again", 401)
    );
  }

  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    try {
      if (!roles.includes(req.session.user.userRole)) {
        throw new AppError(
          "You do not have permission to perform this action",
          403
        );
      }
      next();
    } catch (err) {
      console.error("Synchronous error in restrictTo:", err);
      next(err);
    }
  };

exports.forgotPassword = catchAsync(async (req, res, next) => {
  try {
    if (!req.body.email) throw new AppError("Email is required", 400);
  } catch (err) {
    console.error("Synchronous error in forgotPassword:", err);
    return next(err);
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user = await User.findOne({ email: req.body.email }).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return next(
        new AppError("User does not exist with that email address", 404)
      );
    }
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false, session });

    const resetURL = `${req.protocol}://${req.get("host")}/me/myPasswordReset/${resetToken}`;
    const message = `Forgot your password? Submit a PATCH request with your new password and password confirm to: ${resetURL}. \nIf you didn't forget your password, please ignore this email`;

    try {
      await sendEMail({
        email: req.body.email,
        subject: "Your password reset token (valid only for 10 minutes)",
        message,
      });

      await session.commitTransaction();
      session.endSession();

      res.status(200).json({
        status: "success",
        message: "Token sent to email",
      });
    } catch (err) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false, session });
      await session.abortTransaction();
      session.endSession();

      console.error("Error sending password reset email:", err);
      return next(
        new AppError("There was an error sending password reset email", 500)
      );
    }
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("Forgot password transaction error:", err);
    next(new AppError("Unexpected error during password reset", 500));
  }
});

exports.passwordReset = catchAsync(async (req, res, next) => {
  try {
    if (!req.body.resetToken)
      throw new AppError("Reset token is required", 400);
    if (!req.body.password) throw new AppError("Password is required", 400);
    if (!req.body.passwordConfirm)
      throw new AppError("Password confirmation is required", 400);
  } catch (err) {
    console.error("Synchronous error in passwordReset:", err);
    return next(err);
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const hashedToken = crypto
      .createHash("sha256")
      .update(req.body.resetToken)
      .digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    }).session(session);

    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError("Token is invalid or has expired", 400));
    }

    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ session });

    await session.commitTransaction();
    session.endSession();

    createSendToken(user, 200, req, res, next);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("Password reset transaction error:", err);
    next(new AppError("Unexpected error during password reset", 500));
  }
});

exports.updateMyPassword = catchAsync(async (req, res, next) => {
  try {
    if (!req.body.userId) throw new AppError("User ID is required", 400);
    if (!req.body.currentPassword)
      throw new AppError("Current password is required", 400);
    if (!req.body.newPassword)
      throw new AppError("New password is required", 400);
    if (!req.body.newPasswordConfirm)
      throw new AppError("New password confirmation is required", 400);
  } catch (err) {
    console.error("Synchronous error in updateMyPassword:", err);
    return next(err);
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user = await User.findById(req.body.userId)
      .select("+password")
      .session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError("No match for logged in user in database", 404));
    }

    if (
      !(await user.correctPassword(req.body.currentPassword, user.password))
    ) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError("Your current password is wrong", 401));
    }

    if (req.body.newPassword !== req.body.newPasswordConfirm) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError("Passwords are not the same", 400));
    }

    user.password = req.body.newPassword;
    user.passwordConfirm = req.body.newPasswordConfirm;
    await user.save({ session });

    await session.commitTransaction();
    session.endSession();

    createSendToken(user, 200, req, res, next);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("Update password transaction error:", err);
    next(new AppError("Unexpected error during password update", 500));
  }
});

```

## controllers/errorController.js

*Size: 4759 bytes*

```js
const AppError = require("../utils/appError");

const handleCastErrorDB = (err) => {
  try {
    const message = `Invalid ${err.path}: ${err.value}.`;
    return new AppError(message, 400);
  } catch (syncErr) {
    console.error("Synchronous error in handleCastErrorDB:", syncErr);
    return new AppError("Database cast error", 500);
  }
};

const handleDuplicateFieldsDB = (err) => {
  try {
    const duplicates = Object.values(err.keyValue);
    const message = `Duplicate value - ${duplicates}. Please enter a different value`;
    return new AppError(message, 400);
  } catch (syncErr) {
    console.error("Synchronous error in handleDuplicateFieldsDB:", syncErr);
    return new AppError("Database duplicate error", 500);
  }
};

const handleValidationErrorDB = (err) => {
  try {
    const errors = Object.values(err.errors).map((el) => el.message);
    const message = `Invalid input data ${errors.join(". ")}`;
    return new AppError(message, 400);
  } catch (syncErr) {
    console.error("Synchronous error in handleValidationErrorDB:", syncErr);
    return new AppError("Database validation error", 500);
  }
};

const handleJWTError = () => {
  try {
    return new AppError("Invalid token. Please log in again", 401);
  } catch (syncErr) {
    console.error("Synchronous error in handleJWTError:", syncErr);
    return new AppError("JWT error", 500);
  }
};

const handleTokenExpiredError = () => {
  try {
    return new AppError("Your login has expired.", 401);
  } catch (syncErr) {
    console.error("Synchronous error in handleTokenExpiredError:", syncErr);
    return new AppError("Token expired error", 500);
  }
};

const sendErrorDev = (err, req, res) => {
  try {
    // A) API
    if (req.originalUrl.startsWith("/api")) {
      return res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack,
      });
    }

    // B) RENDERED WEBSITE
    console.error("ERROR 💥", err);
    return res.status(err.statusCode).render("error", {
      title: "Something went wrong!",
      msg: err.message,
    });
  } catch (syncErr) {
    console.error("Synchronous error in sendErrorDev:", syncErr);
    return res.status(500).render("error", {
      title: "Something went wrong!",
      msg: "Please try again later.",
    });
  }
};

const sendErrorProd = (err, req, res) => {
  try {
    // A) API
    if (req.originalUrl.startsWith("/api")) {
      // A) Operational, trusted error: send message to client
      if (err.isOperational) {
        return res.status(err.statusCode).json({
          status: err.status,
          message: err.message,
        });
      }
      // B) Programming or other unknown error: don't leak error details
      // 1) Log error
      console.error("ERROR 💥", err);
      // 2) Send generic message
      return res.status(500).json({
        status: "error",
        message: "Something went very wrong!",
      });
    }

    // B) RENDERED WEBSITE
    // A) Operational, trusted error: send message to client
    if (err.isOperational) {
      return res.status(err.statusCode).render("error", {
        title: "Something went wrong!",
        msg: err.message,
      });
    }
    // B) Programming or other unknown error: don't leak error details
    // 1) Log error
    console.error("ERROR 💥", err);
    // 2) Send generic message
    return res.status(err.statusCode).render("error", {
      title: "Something went wrong!",
      msg: "Please try again later.",
    });
  } catch (syncErr) {
    console.error("Synchronous error in sendErrorProd:", syncErr);
    return res.status(500).render("error", {
      title: "Something went wrong!",
      msg: "Please try again later.",
    });
  }
};

module.exports = (err, req, res, next) => {
  try {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || "error";

    if (process.env.NODE_ENV === "development") {
      sendErrorDev(err, req, res);
    } else if (process.env.NODE_ENV === "production") {
      let error = { ...err };
      error.message = err.message;

      if (err.name === "CastError") error = handleCastErrorDB(error);
      if (err.code === 11000) error = handleDuplicateFieldsDB(error);
      if (err._message === "Tour validation failed")
        error = handleValidationErrorDB(error);
      if (error.name === "JsonWebTokenError") error = handleJWTError();
      if (error.name === "TokenExpiredError") error = handleTokenExpiredError();
      sendErrorProd(error, req, res);
    }
  } catch (syncErr) {
    console.error("Synchronous error in errorController middleware:", syncErr);
    res.status(500).render("error", {
      title: "Something went wrong!",
      msg: "Please try again later.",
    });
  }
};

```

## controllers/eventController.js

*Size: 19674 bytes*

```js
const Event = require("../models/eventModel");
const factory = require("./handlerFactory");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const { sendWhatsAppMessage } = require("../utils/twilioClient");
const ScheduleService = require("../services/scheduleService");

exports.createBooking = catchAsync(async (req, res, next) => {
  try {
    if (!req.body.eventId) {
      throw new AppError("Event ID is required", 400);
    }
  } catch (err) {
    console.error("Synchronous error in createBooking:", err);
    return next(err);
  }

  try {
    const event = await Event.findById(req.body.eventId);

    if (!event) {
      return next(new AppError("No event found with that ID", 404));
    }

    if (
      event.eventBookings.length ===
      event.eventNumOfPlayers + event.eventWaitListSize
    ) {
      return next(new AppError("There are no spaces left for this event", 400));
    }

    // Update event with booking
    let newBookings = [...event.eventBookings];
    let newBooking = {
      userId: req.session.user.userId,
      userName: req.session.user.userName,
    };
    newBookings.push(newBooking);

    try {
      await Event.findByIdAndUpdate(req.body.eventId, {
        eventBookings: newBookings,
        runValidators: false,
      });
    } catch (dbErr) {
      console.error("Failed to update event bookings:", dbErr);
      return next(new AppError("Failed to update event bookings", 500));
    }

    try {
      await checkAndUpdateSchedule(req.body.eventId, next);
    } catch (scheduleErr) {
      console.error("Failed to update event schedule:", scheduleErr);
      return next(new AppError("Failed to update event schedule", 500));
    }

    /* try {
      await sendWhatsAppMessage(
        req.session.user.userMobile,
        `Your booking for event ${event.eventName} is confirmed!`
      );
    } catch (waErr) {
      // Log error but don't block booking creation
      console.error("WhatsApp message failed:", waErr);
    } */

    res.status(200).json({
      status: "success",
      message: "Booking successfully created",
    });
  } catch (err) {
    console.error("Unexpected error during booking:", err);
    next(new AppError("Unexpected error during booking", 500));
  }
});

exports.cancelBooking = catchAsync(async (req, res, next) => {
  try {
    if (!req.session.user || !req.session.user.userId) {
      throw new AppError("User not authenticated", 401);
    }
    if (!req.body.eventId) {
      throw new AppError("Event ID is required", 400);
    }
  } catch (err) {
    console.error("Synchronous error in cancelBooking:", err);
    return next(err);
  }

  try {
    const userId = req.session.user.userId;
    const eventId = req.body.eventId;

    const event = await Event.findById(eventId);
    if (!event) {
      return next(new AppError("No event found with that ID", 404));
    }

    let newBookings = event.eventBookings.filter((val) => val.userId != userId);

    try {
      await Event.findByIdAndUpdate(eventId, {
        eventBookings: newBookings,
        rounds: [],
        runValidators: false,
      });
    } catch (dbErr) {
      console.error(
        "Failed to update event bookings during cancellation:",
        dbErr
      );
      return next(
        new AppError("Failed to update event bookings during cancellation", 500)
      );
    }

    try {
      await checkAndUpdateSchedule(eventId, next);
    } catch (scheduleErr) {
      console.error(
        "Failed to update event schedule after cancellation:",
        scheduleErr
      );
      return next(
        new AppError("Failed to update event schedule after cancellation", 500)
      );
    }

    /*try {
      await sendWhatsAppMessage(
        req.session.user.userMobile,
        `Your booking for event ${event.eventName} has been cancelled.`
      );
    } catch (waErr) {
      // Log error but don't block cancellation
      console.error("WhatsApp message failed:", waErr);
    } */

    res.status(200).json({
      status: "success",
      message: "Booking successfully cancelled",
      data: { eventBooking: userId },
    });
  } catch (err) {
    console.error("Unexpected error during booking cancellation:", err);
    next(new AppError("Unexpected error during booking cancellation", 500));
  }
});

exports.eventTimeout = (req, res, next) => {
  try {
    res.setTimeout(15000, () => {
      console.warn(`Request timed out: ${req.originalUrl}`);
      res.status(503).send("Request timed out");
    });
    next();
  } catch (err) {
    console.error("Error in eventTimeout middleware:", err);
    next(err);
  }
};

async function checkAndUpdateSchedule(eventId, next) {
  try {
    const event = await Event.findById(eventId);
    if (!event) return next(new AppError("No event found with that ID", 404));

    let playerslist = event.eventBookings.slice(0, event.eventNumOfPlayers);

    if (event.eventBookings.length >= event.eventNumOfPlayers) {
      const standOuts = generateStandOutsPubJs(
        playerslist,
        event.eventNumOfRounds,
        event.numOfStandOutsPerRound
      );
      const availablePairings = generateAvailablePairingsPubJs(playerslist);
      const schedule = generateSchedulePubJs(
        availablePairings,
        standOuts,
        event.eventNumOfCourts,
        event.eventNumOfPairings
      );
      await Event.findByIdAndUpdate(
        eventId,
        { $set: { rounds: schedule } },
        { new: true, runValidators: false }
      );
    }
  } catch (err) {
    console.error("Error in checkAndUpdateSchedule:", err);
    next(err);
  }
}

function generateStandOutsPubJs(playersList, numOfRounds, numStandOuts) {
  // Calculate total rests needed
  const totalRests = numOfRounds * numStandOuts;
  const baseRests = Math.floor(totalRests / playersList.length);
  const extraRests = totalRests % playersList.length;

  // Assign rest counts per player
  const restCounts = Array(playersList.length).fill(baseRests);
  for (let i = 0; i < extraRests; i++) {
    restCounts[i]++;
  }

  // Track which rounds each player rests in
  const playerRestRounds = Array(playersList.length)
    .fill(0)
    .map(() => []);

  // For each round, pick the numStandOuts players who have the most remaining rests to assign,
  // and who did NOT rest in the previous round
  const restSchedule = Array(numOfRounds)
    .fill(0)
    .map(() => []);
  for (let round = 0; round < numOfRounds; round++) {
    // Build candidate list: players who still need rests, and didn't rest last round
    let candidates = [];
    for (let pIdx = 0; pIdx < playersList.length; pIdx++) {
      if (
        restCounts[pIdx] > 0 &&
        (playerRestRounds[pIdx].length === 0 ||
          playerRestRounds[pIdx][playerRestRounds[pIdx].length - 1] !==
            round - 1)
      ) {
        candidates.push({ idx: pIdx, remaining: restCounts[pIdx] });
      }
    }
    // Sort candidates by most remaining rests, then by least recent rest
    candidates.sort((a, b) => b.remaining - a.remaining);

    // Pick up to numStandOuts
    for (let i = 0; i < numStandOuts && i < candidates.length; i++) {
      const pIdx = candidates[i].idx;
      restSchedule[round].push(playersList[pIdx]);
      restCounts[pIdx]--;
      playerRestRounds[pIdx].push(round);
    }
  }

  // If any rests remain unassigned, fill them in remaining rounds (fallback)
  for (let pIdx = 0; pIdx < playersList.length; pIdx++) {
    while (restCounts[pIdx] > 0) {
      // Find a round where this player is not already resting and not consecutive
      let found = false;
      for (let round = 0; round < numOfRounds; round++) {
        if (
          !restSchedule[round].some(
            (p) => p.userId === playersList[pIdx].userId
          ) &&
          (playerRestRounds[pIdx].length === 0 ||
            !playerRestRounds[pIdx].includes(round - 1))
        ) {
          restSchedule[round].push(playersList[pIdx]);
          restCounts[pIdx]--;
          playerRestRounds[pIdx].push(round);
          found = true;
          break;
        }
      }
      if (!found) break; // Can't assign without consecutive rests
    }
  }

  // Ensure each round has at most numStandOuts
  for (let round = 0; round < numOfRounds; round++) {
    while (restSchedule[round].length > numStandOuts) {
      restSchedule[round].pop();
    }
  }

  return restSchedule;
}
function generateAvailablePairingsPubJs(playersList) {
  try {
    const DUMMY = -1;
    let availablePairings = [];

    if (!playersList) throw new AppError("Players list missing", 400);

    if (playersList.length % 2 === 1) {
      playersList.push({ userName: "DUMMY" });
    }

    for (let j = 0; j < playersList.length - 1; j += 1) {
      for (let i = 0; i < playersList.length / 2; i += 1) {
        const o = playersList.length - 1 - i;
        if (
          playersList[i].userName !== "DUMMY" &&
          playersList[o].userName !== "DUMMY" &&
          playersList[o].userId !== playersList[i].userId
        ) {
          availablePairings.push({
            playerA: playersList[o],
            playerB: playersList[i],
            pairingUsed: false,
          });
        }
      }
      playersList.splice(1, 0, playersList.pop());
    }
    return availablePairings;
  } catch (err) {
    console.error("Error in generateAvailablePairingsPubJs:", err);
    throw err;
  }
}

function generateSchedulePubJs(
  availablePairings,
  standOuts,
  numOfCourts,
  numOfPairings
) {
  try {
    let schedule = [];

    // Initialize schedule rounds and standOuts
    for (let round = 0; round < standOuts.length; round++) {
      schedule[round] = { matches: [], standOuts: [] };
      schedule[round].standOuts = standOuts[round].map((player) => ({
        userId: String(player.userId),
        name: player.userName,
      }));
    }

    // For each round, only assign matches to players NOT in standOuts for that round
    for (let i = 0; i < standOuts.length; i++) {
      const restingIds = new Set(standOuts[i].map((p) => String(p.userId)));
      let assignedPlayers = new Set();
      let roundPairings = availablePairings.filter(
        (pair) =>
          !restingIds.has(String(pair.playerA.userId)) &&
          !restingIds.has(String(pair.playerB.userId)) &&
          pair.pairingUsed === false
      );

      let courtsAssigned = 0;

      // For each court, find two pairings with four unique, unassigned players
      for (let k = 0; k < numOfCourts; k++) {
        let found = false;
        for (let idxA = 0; idxA < roundPairings.length; idxA++) {
          const pA1 = String(roundPairings[idxA].playerA.userId);
          const pB1 = String(roundPairings[idxA].playerB.userId);
          if (assignedPlayers.has(pA1) || assignedPlayers.has(pB1)) continue;
          for (let idxB = idxA + 1; idxB < roundPairings.length; idxB++) {
            const pA2 = String(roundPairings[idxB].playerA.userId);
            const pB2 = String(roundPairings[idxB].playerB.userId);
            if (
              assignedPlayers.has(pA2) ||
              assignedPlayers.has(pB2) ||
              [pA1, pB1].includes(pA2) ||
              [pA1, pB1].includes(pB2)
            )
              continue;

            // Found two valid pairings for this court
            roundPairings[idxA].pairingUsed = true;
            roundPairings[idxB].pairingUsed = true;
            assignedPlayers.add(pA1);
            assignedPlayers.add(pB1);
            assignedPlayers.add(pA2);
            assignedPlayers.add(pB2);

            let teamA = {
              playerA: roundPairings[idxA].playerA,
              playerB: roundPairings[idxA].playerB,
            };
            let teamB = {
              playerA: roundPairings[idxB].playerA,
              playerB: roundPairings[idxB].playerB,
            };

            let newMatch = {
              teamA: [
                { userId: teamA.playerA.userId, name: teamA.playerA.userName },
                { userId: teamA.playerB.userId, name: teamA.playerB.userName },
              ],
              teamB: [
                { userId: teamB.playerA.userId, name: teamB.playerA.userName },
                { userId: teamB.playerB.userId, name: teamB.playerB.userName },
              ],
              court: k,
            };
            schedule[i].matches.push(newMatch);
            found = true;
            break;
          }
          if (found) break;
        }
      }

      // --- FIX: Ensure all players are accounted for in this round ---
      // Gather all assigned player IDs (playing or resting)
      const allAssigned = new Set([
        ...schedule[i].standOuts.map((p) => String(p.userId)),
        ...schedule[i].matches.flatMap((m) => [
          String(m.teamA[0].userId),
          String(m.teamA[1].userId),
          String(m.teamB[0].userId),
          String(m.teamB[1].userId),
        ]),
      ]);

      // Get all player IDs from availablePairings
      const allPlayerIds = new Set(
        availablePairings.flatMap((pair) => [
          String(pair.playerA.userId),
          String(pair.playerB.userId),
        ])
      );

      // Add any missing players to standOuts for this round
      for (const pid of allPlayerIds) {
        if (!allAssigned.has(pid)) {
          // Find player object from pairings
          const playerObj =
            availablePairings.find(
              (pair) => String(pair.playerA.userId) === pid
            )?.playerA ||
            availablePairings.find(
              (pair) => String(pair.playerB.userId) === pid
            )?.playerB;
          if (playerObj) {
            schedule[i].standOuts.push({
              userId: String(playerObj.userId),
              name: playerObj.userName,
            });
          }
        }
      }
      // --- END FIX ---
    }
    return schedule;
  } catch (err) {
    console.error("Error in generateSchedulePubJs:", err);
    throw err;
  }
}
exports.updateMatchScore = catchAsync(async (req, res, next) => {
  try {
    if (!req.body.eventId) throw new AppError("Event ID is required", 400);
    if (typeof req.body.roundIndex === "undefined")
      throw new AppError("Round index is required", 400);
    if (typeof req.body.matchIndex === "undefined")
      throw new AppError("Match index is required", 400);
    if (isNaN(req.body.teamAScore) || isNaN(req.body.teamBScore))
      throw new AppError("Scores must be valid numbers", 400);
  } catch (err) {
    console.error("Synchronous error in updateMatchScore:", err);
    return next(err);
  }

  const { eventId, roundIndex, matchIndex, teamAScore, teamBScore } = req.body;

  const roundIdx = Number(roundIndex);
  const matchIdx = Number(matchIndex);

  const event = await Event.findById(eventId);
  if (!event) {
    return next(new AppError("No event found with that ID", 404));
  }

  if (
    !event.rounds ||
    !event.rounds[roundIdx] ||
    !event.rounds[roundIdx].matches ||
    !event.rounds[roundIdx].matches[matchIdx]
  ) {
    return next(new AppError("Match or Round not found", 400));
  }

  event.rounds[roundIdx].matches[matchIdx].teamAScore = teamAScore;
  event.rounds[roundIdx].matches[matchIdx].teamBScore = teamBScore;

  try {
    await event.save();
    res.status(200).json({
      status: "success",
      message: "Match score updated successfully",
    });
  } catch (error) {
    console.error("Error saving event:", error);
    next(new AppError("Failed to update match score", 500));
  }
});

exports.createEvent = catchAsync(async (req, res, next) => {
  try {
    if (!req.body.eventName) throw new AppError("Event name is required", 400);
    if (!req.body.eventDate) throw new AppError("Event date is required", 400);
  } catch (err) {
    console.error("Synchronous error in createEvent:", err);
    return next(err);
  }

  let activeValue = false;
  if (typeof req.body.active !== "undefined") {
    if (typeof req.body.active === "string") {
      activeValue = req.body.active === "true" || req.body.active === "on";
    } else {
      activeValue = !!req.body.active;
    }
  }

  try {
    const newEvent = await Event.create({
      eventName: req.body.eventName,
      eventLocation: req.body.eventLocation,
      eventType: req.body.eventType,
      eventDate: req.body.eventDate,
      eventStartTime: req.body.eventStartTime,
      eventOrganiser: req.body.eventOrganiser,
      eventNumOfCourts: req.body.eventNumOfCourts,
      numOfStandOutsPerRound: req.body.numOfStandOutsPerRound,
      eventNumOfRounds: req.body.eventNumOfRounds,
      eventWaitListSize: req.body.eventWaitListSize,
      eventNumOfPairings: req.body.eventNumOfPairings,
      active: activeValue,
    });
    res.status(201).json({
      status: "success",
      data: { event: newEvent },
    });
  } catch (err) {
    console.error("Error creating event:", err);
    next(new AppError("Failed to create event", 500));
  }
});

exports.updateEvent = catchAsync(async (req, res, next) => {
  try {
    if (!req.body.eventId) throw new AppError("Event ID is required", 400);
  } catch (err) {
    console.error("Synchronous error in updateEvent:", err);
    return next(err);
  }

  let activeValue = undefined;
  if (typeof req.body.active !== "undefined") {
    if (typeof req.body.active === "string") {
      activeValue = req.body.active === "true" || req.body.active === "on";
    } else {
      activeValue = !!req.body.active;
    }
  }

  const updateObj = {
    eventName: req.body.eventName,
    eventLocation: req.body.eventLocation,
    eventType: req.body.eventType,
    eventDate: req.body.eventDate,
    eventStartTime: req.body.eventStartTime,
    eventOrganiser: req.body.eventOrganiser,
    eventNumOfCourts: req.body.eventNumOfCourts,
    numOfStandOutsPerRound: req.body.numOfStandOutsPerRound,
    eventNumOfRounds: req.body.eventNumOfRounds,
    eventWaitListSize: req.body.eventWaitListSize,
    eventNumOfPairings: req.body.eventNumOfPairings,
  };
  if (typeof activeValue !== "undefined") updateObj.active = activeValue;

  try {
    const updatedEvent = await Event.findByIdAndUpdate(
      req.body.eventId,
      updateObj,
      {
        new: true,
        runValidators: true,
      }
    );
    res.status(200).json({
      status: "success",
      data: { event: updatedEvent },
    });
  } catch (err) {
    console.error("Error updating event:", err);
    next(new AppError("Failed to update event", 500));
  }
});

exports.handleNoShow = catchAsync(async (req, res, next) => {
  try {
    if (!req.body.eventId) throw new AppError("Event ID is required", 400);
    if (!req.body.userId) throw new AppError("User ID is required", 400);
  } catch (err) {
    console.error("Synchronous error in handleNoShow:", err);
    return next(err);
  }

  const { eventId, userId } = req.body;

  const event = await Event.findById(eventId);
  if (!event) return next(new AppError("No event found with that ID", 404));

  event.eventBookings = event.eventBookings.filter(
    (booking) => booking.userId.toString() !== userId.toString()
  );

  event.numOfStandOutsPerRound = Math.max(
    (event.numOfStandOutsPerRound || 1) - 1,
    1
  );

  event.rounds = [];
  try {
    await event.save();
    await checkAndUpdateSchedule(eventId, next);
    res.status(200).json({
      status: "success",
      message: "No show processed and schedule recalculated",
      data: { event },
    });
  } catch (err) {
    console.error("Error handling no-show:", err);
    next(new AppError("Failed to process no-show", 500));
  }
});

exports.getEvent = factory.getOne(Event);
exports.getAllEvents = factory.getAll(Event);
exports.deleteEvent = factory.deleteOne(Event);

```

## controllers/handlerFactory.js

*Size: 5160 bytes*

```js
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const APIFeatures = require("../utils/apiFeatures");
const mongoose = require("mongoose");

const requestTimeout = (req, res, next) => {
  try {
    res.setTimeout(15000, () => {
      console.warn(`Request timed out: ${req.originalUrl}`);
      res.status(503).send("Request timed out");
    });
    next();
  } catch (err) {
    console.error("Synchronous error in requestTimeout:", err);
    next(err);
  }
};

exports.deleteOne = (Model) => [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    try {
      if (!req.params.id) throw new AppError("ID is required", 400);
    } catch (err) {
      console.error("Synchronous error in deleteOne:", err);
      return next(err);
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const doc = await Model.findByIdAndDelete(
        req.params.id,
        req.body
      ).session(session);

      if (!doc) {
        await session.abortTransaction();
        session.endSession();
        return next(new AppError("No document found with that ID", 404));
      }
      await session.commitTransaction();
      session.endSession();
      res.status(204).json({
        status: "success",
        data: null,
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      console.error("Delete operation error:", err);
      next(new AppError("Failed to delete document", 500));
    }
  }),
];

exports.updateOne = (Model) => [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    try {
      if (!req.params.id) throw new AppError("ID is required", 400);
    } catch (err) {
      console.error("Synchronous error in updateOne:", err);
      return next(err);
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
        session,
      });

      if (!doc) {
        await session.abortTransaction();
        session.endSession();
        return next(new AppError("No document found with that ID", 404));
      }
      await session.commitTransaction();
      session.endSession();
      res.status(200).json({
        status: "success",
        data: { data: doc },
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      console.error("Update operation error:", err);
      next(new AppError("Failed to update document", 500));
    }
  }),
];

exports.createOne = (Model) => [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    try {
      if (!req.body) throw new AppError("Request body is required", 400);
    } catch (err) {
      console.error("Synchronous error in createOne:", err);
      return next(err);
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const docArr = await Model.create([req.body], { session });
      const doc = docArr[0];

      if (!doc) {
        await session.abortTransaction();
        session.endSession();
        return next(new AppError("No document created", 404));
      }
      await session.commitTransaction();
      session.endSession();
      res.status(201).json({
        status: "success",
        data: { data: doc },
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      console.error("Create operation error:", err);
      next(new AppError("Failed to create document", 500));
    }
  }),
];

exports.getOne = (Model, popOptions) => [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    try {
      if (!req.params.id) throw new AppError("ID is required", 400);
    } catch (err) {
      console.error("Synchronous error in getOne:", err);
      return next(err);
    }

    try {
      let query = Model.findById(req.params.id);
      if (popOptions) query = query.populate(popOptions);
      const doc = await query;

      if (!doc) {
        return next(new AppError("No document found with that ID", 404));
      }
      res.status(200).json({
        status: "success",
        data: { data: doc },
      });
    } catch (err) {
      console.error("Get one operation error:", err);
      next(new AppError("Failed to get document", 500));
    }
  }),
];

exports.getAll = (Model) => [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    try {
      let filter = {};
      if (req.params.tourId) filter = { tour: req.params.tourId };

      const features = new APIFeatures(Model.find(filter), req.query)
        .filter()
        .sort()
        .limitFields()
        .paginate();

      const doc = await features.query;

      if (!doc) {
        return next(new AppError("No documents found", 404));
      }
      res.status(200).json({
        status: "success",
        results: doc.length,
        data: { doc },
      });
    } catch (err) {
      console.error("Get all operation error:", err);
      next(new AppError("Failed to get documents", 500));
    }
  }),
];

```

## controllers/settingsController.js

*Size: 3727 bytes*

```js
const Settings = require("../models/settingsModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const mongoose = require("mongoose");

const requestTimeout = (req, res, next) => {
  try {
    res.setTimeout(15000, () => {
      console.warn(`Settings request timed out: ${req.originalUrl}`);
      res.status(503).send("Request timed out");
    });
    next();
  } catch (err) {
    console.error("Synchronous error in requestTimeout:", err);
    next(err);
  }
};

exports.getSystemSettings = [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    try {
      if (!req.session) throw new AppError("Session not available", 500);
    } catch (err) {
      console.error("Synchronous error in getSystemSettings:", err);
      return next(err);
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const settings = await Settings.findOne({}).session(session);
      if (!settings) {
        await session.abortTransaction();
        session.endSession();
        return next(new AppError("No system settings found", 404));
      }

      req.session.systemDefaults = settings.systemDefaults;
      req.session.features = settings.features;

      req.session.save((err) => {
        if (err) {
          session.abortTransaction();
          session.endSession();
          console.error("Session save error:", err);
          return next(err);
        }

        session.commitTransaction();
        session.endSession();

        res.status(200).json({
          status: "success",
          message: "System settings retrieved successfully",
          data: {
            systemDefaults: req.session.systemDefaults,
            features: req.session.features,
          },
        });
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error("Error retrieving system settings:", error);
      next(new AppError("Failed to retrieve system settings", 500));
    }
  }),
];

exports.saveSettings = [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    try {
      if (!req.session) throw new AppError("Session not available", 500);
      if (!req.body) throw new AppError("Request body is required", 400);
    } catch (err) {
      console.error("Synchronous error in saveSettings:", err);
      return next(err);
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const updateObj = {};
      if (req.body.systemDefaults)
        updateObj.systemDefaults = req.body.systemDefaults;
      if (req.body.features) updateObj.features = req.body.features;

      await Settings.findOneAndUpdate({}, { $set: updateObj }, { session });

      if (req.body.systemDefaults)
        req.session.systemDefaults = req.body.systemDefaults;
      if (req.body.features) req.session.features = req.body.features;

      req.session.save((err) => {
        if (err) {
          session.abortTransaction();
          session.endSession();
          console.error("Session save error:", err);
          return next(err);
        }

        session.commitTransaction();
        session.endSession();

        res.status(200).json({
          status: "success",
          message: "System settings saved successfully",
          data: {
            systemDefaults: req.session.systemDefaults,
            features: req.session.features,
          },
        });
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error("Error saving system settings:", error);
      next(new AppError("Failed to save system settings", 500));
    }
  }),
];

```

## controllers/userController.js

*Size: 8676 bytes*

```js
const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const factory = require("./handlerFactory");
const mongoose = require("mongoose");

const requestTimeout = (req, res, next) => {
  try {
    res.setTimeout(15000, () => {
      console.warn(`User request timed out: ${req.originalUrl}`);
      res.status(503).send("Request timed out");
    });
    next();
  } catch (err) {
    console.error("Synchronous error in requestTimeout:", err);
    next(err);
  }
};

exports.getMe = (req, res, next) => {
  try {
    if (!req.session || !req.session.user || !req.session.user.userId) {
      throw new AppError("Session user ID not available", 401);
    }
    req.params.id = req.session.user.userId;
    next();
  } catch (err) {
    console.error("Synchronous error in getMe:", err);
    next(err);
  }
};

exports.updateAcDetails = [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    try {
      if (!req.body.userId) throw new AppError("User ID is required", 400);
      if (!req.body.name) throw new AppError("Name is required", 400);
      if (!req.body.email) throw new AppError("Email is required", 400);
      if (!req.body.mobile) throw new AppError("Mobile is required", 400);
    } catch (err) {
      console.error("Synchronous error in updateAcDetails:", err);
      return next(err);
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const updatedUser = await User.findByIdAndUpdate(
        req.body.userId,
        {
          name: req.body.name,
          email: req.body.email,
          mobile: req.body.mobile,
        },
        { runValidators: true, session }
      );
      await session.commitTransaction();
      session.endSession();
      res.status(200).json({ status: "success", data: { user: updatedUser } });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      console.error("Error updating account details:", err);
      next(new AppError("Failed to update account details", 500));
    }
  }),
];

exports.deleteMe = [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    try {
      if (!req.user || !req.user.id)
        throw new AppError("User not authenticated", 401);
    } catch (err) {
      console.error("Synchronous error in deleteMe:", err);
      return next(err);
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await User.findByIdAndUpdate(req.user.id, { active: false }, { session });
      await session.commitTransaction();
      session.endSession();
      res.status(204).json({
        status: "success",
        data: null,
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      console.error("Error deleting user:", err);
      next(new AppError("Failed to delete user", 500));
    }
  }),
];

exports.createUser = [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    try {
      if (!req.body.name) throw new AppError("Name is required", 400);
      if (!req.body.email) throw new AppError("Email is required", 400);
      if (!req.body.mobile) throw new AppError("Mobile is required", 400);
      if (!req.body.password) throw new AppError("Password is required", 400);
      if (!req.body.passwordConfirm)
        throw new AppError("Password confirmation is required", 400);
    } catch (err) {
      console.error("Synchronous error in createUser:", err);
      return next(err);
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      let activeValue = false;
      if (typeof req.body.active !== "undefined") {
        if (typeof req.body.active === "string") {
          activeValue = req.body.active === "true" || req.body.active === "on";
        } else {
          activeValue = !!req.body.active;
        }
      }

      const newUserArr = await User.create(
        [
          {
            name: req.body.name,
            email: req.body.email,
            mobile: req.body.mobile,
            password: req.body.password,
            passwordConfirm: req.body.passwordConfirm,
            active: activeValue,
          },
        ],
        { session }
      );
      const newUser = newUserArr[0];
      await session.commitTransaction();
      session.endSession();
      res.status(201).json({
        status: "success",
        data: { user: newUser },
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      console.error("Error creating user:", err);
      next(new AppError("Failed to create user", 500));
    }
  }),
];

exports.updateUser = [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    try {
      if (!req.params.id) throw new AppError("User ID param is required", 400);
      if (!req.body.name) throw new AppError("Name is required", 400);
      if (!req.body.email) throw new AppError("Email is required", 400);
      if (!req.body.mobile) throw new AppError("Mobile is required", 400);
    } catch (err) {
      console.error("Synchronous error in updateUser:", err);
      return next(err);
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      let activeValue = undefined;
      if (typeof req.body.active !== "undefined") {
        if (typeof req.body.active === "string") {
          activeValue = req.body.active === "true" || req.body.active === "on";
        } else {
          activeValue = !!req.body.active;
        }
      }

      const updateObj = {
        name: req.body.name,
        email: req.body.email,
        mobile: req.body.mobile,
      };
      if (typeof activeValue !== "undefined") updateObj.active = activeValue;

      const updatedUser = await User.findByIdAndUpdate(
        req.params.id,
        updateObj,
        {
          new: true,
          runValidators: true,
          session,
        }
      );

      if (!updatedUser) {
        await session.abortTransaction();
        session.endSession();
        return next(new AppError("No user found with that ID", 404));
      }

      await session.commitTransaction();
      session.endSession();
      res.status(200).json({
        status: "success",
        data: { user: updatedUser },
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      console.error("Error updating user:", err);
      next(new AppError("Failed to update user", 500));
    }
  }),
];

exports.deleteUser = [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    try {
      if (!req.params.id) throw new AppError("User ID param is required", 400);
    } catch (err) {
      console.error("Synchronous error in deleteUser:", err);
      return next(err);
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const deletedUser = await User.findByIdAndDelete(req.params.id, {
        session,
      });
      if (!deletedUser) {
        await session.abortTransaction();
        session.endSession();
        return next(new AppError("No user found with that ID", 404));
      }
      await session.commitTransaction();
      session.endSession();
      res.status(204).json({
        status: "success",
        data: null,
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      console.error("Error deleting user:", err);
      next(new AppError("Failed to delete user", 500));
    }
  }),
];

exports.getUser = [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    try {
      if (!req.params.id) throw new AppError("User ID param is required", 400);
    } catch (err) {
      console.error("Synchronous error in getUser:", err);
      return next(err);
    }

    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return next(new AppError("No user found with that ID", 404));
      }
      res.status(200).json({
        status: "success",
        data: { user },
      });
    } catch (err) {
      console.error("Error fetching user:", err);
      next(new AppError("Failed to fetch user", 500));
    }
  }),
];

exports.getAllUsers = [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    try {
      const users = await User.find();
      res.status(200).json({
        status: "success",
        results: users.length,
        data: { users },
      });
    } catch (err) {
      console.error("Error fetching users:", err);
      next(new AppError("Failed to fetch users", 500));
    }
  }),
];

```

## controllers/viewsController.js

*Size: 20343 bytes*

```js
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const User = require("../models/userModel");
const Event = require("../models/eventModel");
const settings = require("../models/settingsModel");
const paginate = require("../utils/paginate");
const mongoose = require("mongoose");

const requestTimeout = (req, res, next) => {
  try {
    res.setTimeout(15000, () => {
      console.warn(`View request timed out: ${req.originalUrl}`);
      res.status(503).send("Request timed out");
    });
    next();
  } catch (err) {
    console.error("Synchronous error in requestTimeout:", err);
    next(err);
  }
};

exports.getHomePage = [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    try {
      res.status(200).render("homepage", {
        title: "Pickle Admin !!!",
        userRole: null,
        showNav: false,
      });
    } catch (err) {
      console.error("Synchronous error in getHomePage:", err);
      next(err);
    }
  }),
];

// INDIVIDUAL USER FUNCTIONALITY
exports.getLoginForm = [
  requestTimeout,
  (req, res, next) => {
    try {
      res.status(200).render("login", {
        title: "log into your account",
        userRole: null,
        showNav: false,
      });
    } catch (err) {
      console.error("Synchronous error in getLoginForm:", err);
      next(err);
    }
  },
];

exports.getsignupForm = [
  requestTimeout,
  (req, res, next) => {
    try {
      res.status(200).render("signUp", {
        title: "create your account",
        userRole: null,
        showNav: false,
      });
    } catch (err) {
      console.error("Synchronous error in getsignupForm:", err);
      next(err);
    }
  },
];

exports.getMyAccountDetails = [
  requestTimeout,
  (req, res, next) => {
    try {
      res.status(200).render("myAccountDetails", {
        title: "Your account",
        userRole: req.session.user.userRole,
        userName: req.session.user.userName,
        showNav: true,
      });
    } catch (err) {
      console.error("Synchronous error in getMyAccountDetails:", err);
      next(err);
    }
  },
];

exports.myPasswordUpdate = [
  requestTimeout,
  (req, res, next) => {
    try {
      res.status(200).render("myPasswordUpdate", {
        title: "Update Password",
        userRole: req.session.user.userRole,
        userName: req.session.user.userName,
        showNav: true,
      });
    } catch (err) {
      console.error("Synchronous error in myPasswordUpdate:", err);
      next(err);
    }
  },
];

exports.forgotPassword = [
  requestTimeout,
  (req, res, next) => {
    try {
      res.status(200).render("myPasswordForgot", {
        title: "Forgot Password",
        userRole: req.session.user.userRole,
        showNav: false,
      });
    } catch (err) {
      console.error("Synchronous error in forgotPassword:", err);
      next(err);
    }
  },
];

exports.myPasswordReset = [
  requestTimeout,
  (req, res, next) => {
    try {
      const resetToken = req.params.resetToken;
      let data = {};
      data.resetToken = resetToken;
      res.status(200).render("myPasswordReset", {
        title: "Reset Password",
        data,
        userRole: req.session.user.userRole,
        userName: req.session.user.userName,
        showNav: false,
      });
    } catch (err) {
      console.error("Synchronous error in myPasswordReset:", err);
      next(err);
    }
  },
];

// ADMIN USER FUNCTIONALITY
exports.showAllUsers = [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const filter = {};
      if (req.query.username) {
        filter.name = { $regex: req.query.username, $options: "i" };
      }
      if (req.query.role && req.query.role !== "") {
        filter.role = req.query.role;
      }
      if (typeof req.query.active !== "undefined" && req.query.active !== "") {
        if (req.query.active === "true") filter.active = true;
        else if (req.query.active === "false") filter.active = false;
      }

      const query = User.find(filter).sort({ name: 1 }).session(session);
      const pagination = await paginate(query, req);

      await session.commitTransaction();
      session.endSession();

      res.status(200).render("showAllUsers", {
        title: "All Users",
        users: pagination.results,
        userRole: req.session.user.userRole,
        userName: req.session.user.userName,
        showNav: true,
        currentPage: pagination.currentPage,
        totalPages: pagination.totalPages,
        results: pagination.results.length,
        limit: pagination.limit,
        username: req.query.username || "",
        role: req.query.role || "",
        active: typeof req.query.active !== "undefined" ? req.query.active : "",
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      console.error("Error rendering showAllUsers:", err);
      next(new AppError("Failed to render all users", 500));
    }
  }),
];

exports.createUser = [
  requestTimeout,
  (req, res, next) => {
    try {
      res.status(200).render("createUser", {
        title: "Create User",
        userRole: req.session.user.userRole,
        userName: req.session.user.userName,
        showNav: true,
      });
    } catch (err) {
      console.error("Synchronous error in createUser:", err);
      next(err);
    }
  },
];

exports.editUser = [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const user = await User.findOne({ _id: req.params.id }).session(session);

      if (!user) {
        await session.abortTransaction();
        session.endSession();
        return next(new AppError("There is no user with that name", 404));
      }

      await session.commitTransaction();
      session.endSession();

      res.status(200).render("editUser", {
        title: `${user.name} Name`,
        user: {
          ...user.toObject(),
          active: user.active === true || user.active === "true",
        },
        userRole: req.session.user.userRole,
        userName: req.session.user.userName,
        showNav: true,
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      console.error("Error rendering editUser:", err);
      next(new AppError("Failed to render edit user", 500));
    }
  }),
];

// EVENTS FUNCTIONALITY
exports.createEvent = [
  requestTimeout,
  (req, res, next) => {
    try {
      res.status(200).render("createEvent", {
        title: "Events",
        userRole: req.session.user.userRole,
        userName: req.session.user.userName,
        systemDefaults: req.session.systemDefaults,
        showNav: true,
      });
    } catch (err) {
      console.error("Synchronous error in createEvent:", err);
      next(err);
    }
  },
];

exports.showAllEvents = [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const filter = {};
      if (req.query.organiser) {
        filter.eventOrganiser = { $regex: req.query.organiser, $options: "i" };
      }
      if (req.query.date) {
        const date = new Date(req.query.date);
        const nextDate = new Date(date);
        nextDate.setDate(date.getDate() + 1);
        filter.eventDate = { $gte: date, $lt: nextDate };
      }
      if (typeof req.query.active !== "undefined" && req.query.active !== "") {
        if (req.query.active === "true") filter.active = true;
        else if (req.query.active === "false") filter.active = false;
      }

      const query = Event.find(filter).sort({ eventDate: 1 }).session(session);
      const pagination = await paginate(query, req);

      await session.commitTransaction();
      session.endSession();

      res.status(200).render("showAllEvents", {
        title: "All Events",
        events: pagination.results,
        userRole: req.session.user.userRole,
        userName: req.session.user.userName,
        showNav: true,
        currentPage: pagination.currentPage,
        totalPages: pagination.totalPages,
        results: pagination.results.length,
        limit: pagination.limit,
        organiser: req.query.organiser || "",
        date: req.query.date || "",
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      console.error("Error rendering showAllEvents:", err);
      next(new AppError("Failed to render all events", 500));
    }
  }),
];

exports.showAllSchedules = [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const filter = { "rounds.0": { $exists: true } };
      if (req.query.organiser) {
        filter.eventOrganiser = { $regex: req.query.organiser, $options: "i" };
      }
      if (req.query.date) {
        const date = new Date(req.query.date);
        const nextDate = new Date(date);
        nextDate.setDate(date.getDate() + 1);
        filter.eventDate = { $gte: date, $lt: nextDate };
      }

      const query = Event.find(filter).sort({ eventDate: 1 }).session(session);
      const pagination = await paginate(query, req);

      await session.commitTransaction();
      session.endSession();

      res.status(200).render("showAllSchedules", {
        title: "All Schedules",
        events: pagination.results,
        userRole: req.session.user.userRole,
        userName: req.session.user.userName,
        showNav: true,
        currentPage: pagination.currentPage,
        totalPages: pagination.totalPages,
        results: pagination.results.length,
        limit: pagination.limit,
        organiser: req.query.organiser || "",
        date: req.query.date || "",
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      console.error("Error rendering showAllSchedules:", err);
      next(new AppError("Failed to render all schedules", 500));
    }
  }),
];

exports.browseMyEvents = [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const userId = req.session.user.userId;
      const events = await Event.find({
        "eventBookings.userId": { $in: userId },
        active: true,
      })
        .sort({ eventDate: 1 })
        .session(session);

      events.forEach((event) => {
        event.userInRounds =
          event.rounds &&
          event.rounds.some((round) =>
            round.matches.some(
              (match) =>
                match.teamA.some(
                  (player) => player.userId.toString() === userId
                ) ||
                match.teamB.some(
                  (player) => player.userId.toString() === userId
                )
            )
          );
      });

      await session.commitTransaction();
      session.endSession();

      res.status(200).render("browseMyEvents", {
        title: "Browse Events",
        events: events,
        userRole: req.session.user.userRole,
        userName: req.session.user.userName,
        showNav: true,
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      console.error("Error rendering browseMyEvents:", err);
      next(new AppError("Failed to render browse my events", 500));
    }
  }),
];

exports.browseNewEvents = [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const userId = req.session.user.userId;
      const events = await Event.find({
        "eventBookings.userId": { $nin: userId },
        active: true,
      })
        .sort({ eventDate: 1 })
        .session(session);

      await session.commitTransaction();
      session.endSession();

      res.status(200).render("browseNewEvents", {
        title: "Browse Events",
        events: events,
        userRole: req.session.user.userRole,
        userName: req.session.user.userName,
        showNav: true,
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      console.error("Error rendering browseNewEvents:", err);
      next(new AppError("Failed to render browse new events", 500));
    }
  }),
];

exports.editEvent = [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const event = await Event.findOne({ _id: req.params.id }).session(
        session
      );

      if (!event) {
        await session.abortTransaction();
        session.endSession();
        return next(new AppError("There is no event with that name", 404));
      }

      await session.commitTransaction();
      session.endSession();

      res.status(200).render("editEvent", {
        title: `${event.eventName} Event`,
        event: {
          ...event.toObject(),
          active: event.active === true || event.active === "true",
        },
        userRole: req.session.user.userRole,
        userName: req.session.user.userName,
        showNav: true,
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      console.error("Error rendering editEvent:", err);
      next(new AppError("Failed to render edit event", 500));
    }
  }),
];

exports.viewMySchedule = [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const event = await Event.findOne({ _id: req.params.id }).session(
        session
      );

      if (!event) {
        await session.abortTransaction();
        session.endSession();
        return next(new AppError("There is no event with that name", 404));
      }

      const userId = req.session.user.userId.toString();

      let restingRounds = [];
      event.rounds.forEach((round, roundIndex) => {
        if (
          round.standOuts &&
          round.standOuts.some(
            (player) => player.userId && player.userId.toString() === userId
          )
        ) {
          restingRounds.push(roundIndex + 1);
        }
      });

      let filteredMatches = [];
      event.rounds.forEach((round, roundIndex) => {
        round.matches.forEach((match, matchIndex) => {
          let playerInMatch =
            match.teamA.some(
              (player) => player.userId && player.userId.toString() === userId
            ) ||
            match.teamB.some(
              (player) => player.userId && player.userId.toString() === userId
            );

          if (playerInMatch) {
            let playerTeam = match.teamA.some(
              (player) => player.userId && player.userId.toString() === userId
            )
              ? "teamA"
              : "teamB";

            const hasScore =
              (typeof match.teamAScore === "number" && match.teamAScore > 0) ||
              (typeof match.teamBScore === "number" && match.teamBScore > 0);

            filteredMatches.push({
              round: roundIndex,
              match,
              playerTeam,
              matchIndex,
              hasScore,
            });
          }
        });
      });

      await session.commitTransaction();
      session.endSession();

      res.status(200).render("viewMySchedule", {
        title: `${event.eventName} Event`,
        event: event,
        filteredMatches: filteredMatches,
        restingRounds: restingRounds,
        features: req.session.features,
        userRole: req.session.user.userRole,
        userName: req.session.user.userName,
        showNav: true,
        userId: userId,
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      console.error("Error rendering viewMySchedule:", err);
      next(new AppError("Failed to render view my schedule", 500));
    }
  }),
];

exports.viewMasterSchedule = [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const event = await Event.findOne({ _id: req.params.id }).session(
        session
      );

      if (!event) {
        await session.abortTransaction();
        session.endSession();
        return next(new AppError("There is no event with that name", 404));
      }

      let filteredRounds = event.rounds;
      let round = req.query.round || "";
      let roundsCount = event.rounds ? event.rounds.length : 0;

      if (round && !isNaN(round) && round > 0 && round <= roundsCount) {
        filteredRounds = [event.rounds[round - 1]];
      }

      let allMatches = [];
      filteredRounds.forEach((roundObj, roundIndex) => {
        roundObj.matches.forEach((match, matchIndex) => {
          const hasScore =
            (typeof match.teamAScore === "number" && match.teamAScore > 0) ||
            (typeof match.teamBScore === "number" && match.teamBScore > 0);
          allMatches.push({ match, roundIndex, matchIndex, hasScore });
        });
      });

      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const totalMatches = allMatches.length;
      const totalPages = Math.ceil(totalMatches / limit);
      const start = (page - 1) * limit;
      const end = start + limit;
      const paginatedMatches = allMatches.slice(start, end);

      await session.commitTransaction();
      session.endSession();

      res.status(200).render("viewMasterSchedule", {
        title: `${event.eventName} Event`,
        event: event,
        filteredRounds: filteredRounds,
        paginatedMatches: paginatedMatches,
        round: round,
        roundsCount: roundsCount,
        page: page,
        totalPages: totalPages,
        totalMatches: totalMatches,
        userRole: req.session.user.userRole,
        userName: req.session.user.userName,
        showNav: true,
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      console.error("Error rendering viewMasterSchedule:", err);
      next(new AppError("Failed to render master schedule", 500));
    }
  }),
];

exports.getSettings = [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const systemSettings = await settings.findOne().session(session);

      if (!systemSettings) {
        await session.abortTransaction();
        session.endSession();
        return next(new AppError("There are no system settings in place", 404));
      }

      await session.commitTransaction();
      session.endSession();

      res.status(200).render("editSystemSettings", {
        title: "System Settings",
        systemSettings: systemSettings,
        userRole: req.session.user.userRole,
        userName: req.session.user.userName,
        showNav: true,
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      console.error("Error rendering getSettings:", err);
      next(new AppError("Failed to render system settings", 500));
    }
  }),
];

exports.showNoShowForm = [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const events = await Event.find({
        active: true,
        //eventDate: { $gte: today, $lt: tomorrow },
      }).session(session);

      await session.commitTransaction();
      session.endSession();

      res.status(200).render("noShowEvent", {
        title: "Mark No Show",
        events,
        userRole: req.session.user.userRole,
        userName: req.session.user.userName,
        showNav: true,
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      console.error("Error rendering showNoShowForm:", err);
      next(new AppError("Failed to render no show form", 500));
    }
  }),
];

```

## data/copyDb.js

*Size: 1941 bytes*

```js
const { exec } = require("child_process");
const readline = require("readline");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../config.env") });

const PROD_URI = process.env.PROD_DATABASE;
const STAGE_URI = process.env.STAGE_DATABASE;
const DEV_URI = process.env.DEV_DATABASE;
const PROD_DB_NAME = process.env.PROD_DATABASE_NAME.replace(/"/g, "");
const DUMP_PATH = path.resolve(__dirname, "../dump");

function run(command) {
  return new Promise((resolve, reject) => {
    exec(command, (err, stdout, stderr) => {
      if (err) return reject(stderr || err);
      resolve(stdout);
    });
  });
}

async function copyDb(target) {
  let targetUri;
  let targetName;
  if (target === "staging") {
    targetUri = STAGE_URI;
    targetName = "STAGE";
  } else if (target === "dev") {
    targetUri = DEV_URI;
    targetName = "DEV";
  } else {
    console.error("Invalid target environment.");
    return;
  }

  try {
    console.log(`Dumping production database (${PROD_DB_NAME})...`);
    await run(
      `mongodump --uri="${PROD_URI}" --db=${PROD_DB_NAME} --out=${DUMP_PATH}`
    );
    console.log(`Restoring to ${targetName} database...`);
    await run(
      `mongorestore --uri="${targetUri}" --drop ${DUMP_PATH}/${PROD_DB_NAME}`
    );
    console.log(
      `Copy complete! Production data copied to ${targetName} database.`
    );
  } catch (err) {
    console.error("Error copying database:", err);
  }
}

function promptEnvironment() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question("Copy production data to (staging/dev)? ", (answer) => {
    const env = answer.trim().toLowerCase();
    if (env === "staging" || env === "dev") {
      copyDb(env).finally(() => rl.close());
    } else {
      console.log("Invalid input. Please enter 'staging' or 'dev'.");
      rl.close();
    }
  });
}

promptEnvironment();

```

## dump/Pickle-Database/events.bson

*Size: 15902 bytes*

```bson
�5  _id h�@Z� 7x�ueventName    Tuesday at St Olaf's eventLocation 
   St Olaf's eventType    Text Event Type 	eventDate  4�O�  eventStartTime    19:25 eventOrganiser    Ger eventNumOfCourts    numOfStandOutsPerRound    eventNumOfRounds 	   eventWaitListSize    eventNumOfPairings    eventBookings   0 B   _id h�Z� 7x��userId hD��>�5�� userName 
   testuser2  1 B   _id h�)Z� 7x��userId hD�,>�5��¤userName 
   testuser3  2 B   _id h�JZ� 7x��userId hD��>�5��®userName 
   testuser4  3 B   _id h�kZ� 7x��userId hD��>�5����userName 
   testuser5  4 B   _id h�Z� 7x��userId hD��>�5��¸userName 
   testuser7  5 B   _id h�Z� 7x�userId hD��>�5��½userName 
   testuser8  6 B   _id h�EZ� 7x�)userId hD��>�5����userName 
   testuser9  7 C   _id h��Z� 7x��userId hx�fu�8T�m\�userName    testuser12  8 C   _id h��Z� 7x��userId hxގu�8T�m]userName    testuser13  9 C   _id h�(Z� 7x��userId hx޶u�8T�m]userName    testuser14  10 C   _id h�aZ� 7x��userId hx��u�8T�m]userName    testuser15  11 C   _id h��Z� 7x�'userId hx��u�8T�m]userName    testuser16  12 C   _id h�\Z:薻wuserId h{��kp�KF�userName    testuser20  13 C   _id h��^1��nuserId h7]Wf���pJ]userName    testuser76  14 C   _id h�CT�+u ���userId hD�7>�5����userName    testuser11   eventNumOfPlayers    __v     active rounds 0  0 P  _id h�CT�+u ���matches +  0 _  teamAScore     teamBScore     _id h�CT�+u ���teamA �   0 ?   _id h�CT�+u ���userId hD�7>�5����name    testuser11  1 >   _id h�CT�+u ���userId hD�,>�5��¤name 
   testuser3   teamB �   0 ?   _id h�CT�+u ���userId h7]Wf���pJ]name    testuser76  1 >   _id h�CT�+u ���userId hD��>�5��®name 
   testuser4   court      1 _  teamAScore     teamBScore     _id h�CT�+u ���teamA �   0 ?   _id h�CT�+u ���userId h{��kp�KF�name    testuser20  1 >   _id h�CT�+u ���userId hD��>�5����name 
   testuser5   teamB �   0 ?   _id h�CT�+u ���userId hx��u�8T�m]name    testuser16  1 >   _id h�CT�+u ���userId hD��>�5��¸name 
   testuser7   court     2 _  teamAScore     teamBScore     _id h�CT�+u ���teamA �   0 ?   _id h�CT�+u ���userId hx��u�8T�m]name    testuser15  1 >   _id h�CT�+u ���userId hD��>�5��½name 
   testuser8   teamB �   0 ?   _id h�CT�+u ���userId hx޶u�8T�m]name    testuser14  1 >   _id h�CT�+u ���userId hD��>�5����name 
   testuser9   court      standOuts �   0 O   _id h�CT�+u ���userId    684484e13efd35198cbac2a0 name 
   testuser2  1 O   _id h�CT�+u ���userId    6844852c3efd35198cbac2a4 name 
   testuser3  2 O   _id h�CT�+u ���userId    684485873efd35198cbac2ae name 
   testuser4    1 Q  _id h�CT�+u ���matches ,  0 `  teamAScore     teamBScore     _id h�CT�+u ���teamA �   0 ?   _id h�CT�+u ���userId hxގu�8T�m]name    testuser13  1 ?   _id h�CT�+u �� userId hx�fu�8T�m\�name    testuser12   teamB �   0 ?   _id h�CT�+u ��userId hD�7>�5����name    testuser11  1 >   _id h�CT�+u ��userId hD��>�5�� name 
   testuser2   court      1 _  teamAScore     teamBScore     _id h�CT�+u ��teamA �   0 ?   _id h�CT�+u ��userId h{��kp�KF�name    testuser20  1 >   _id h�CT�+u ��userId hD�,>�5��¤name 
   testuser3   teamB �   0 ?   _id h�CT�+u ��userId hx��u�8T�m]name    testuser16  1 >   _id h�CT�+u ��userId hD��>�5��®name 
   testuser4   court     2 _  teamAScore     teamBScore     _id h�CT�+u ��teamA �   0 ?   _id h�CT�+u ��	userId hx��u�8T�m]name    testuser15  1 >   _id h�CT�+u ��
userId hD��>�5����name 
   testuser5   teamB �   0 ?   _id h�CT�+u ��userId hx޶u�8T�m]name    testuser14  1 >   _id h�CT�+u ��userId hD��>�5��¸name 
   testuser7   court      standOuts �   0 O   _id h�CT�+u ��userId    684486893efd35198cbac2db name 
   testuser5  1 O   _id h�CT�+u ��userId    684485c93efd35198cbac2b8 name 
   testuser7  2 O   _id h�CT�+u ��userId    684485e53efd35198cbac2bd name 
   testuser8    2 S  _id h�CT�+u ��matches ,  0 _  teamAScore     teamBScore     _id h�CT�+u ��teamA �   0 ?   _id h�CT�+u ��userId hxގu�8T�m]name    testuser13  1 >   _id h�CT�+u ��userId hD��>�5��½name 
   testuser8   teamB �   0 ?   _id h�CT�+u ��userId hx�fu�8T�m\�name    testuser12  1 >   _id h�CT�+u ��userId hD��>�5����name 
   testuser9   court      1 `  teamAScore     teamBScore     _id h�CT�+u ��teamA �   0 ?   _id h�CT�+u ��userId h7]Wf���pJ]name    testuser76  1 >   _id h�CT�+u ��userId hD��>�5�� name 
   testuser2   teamB �   0 ?   _id h�CT�+u ��userId h{��kp�KF�name    testuser20  1 ?   _id h�CT�+u ��userId hD�7>�5����name    testuser11   court     2 _  teamAScore     teamBScore     _id h�CT�+u ��teamA �   0 ?   _id h�CT�+u ��userId hx��u�8T�m]name    testuser15  1 >   _id h�CT�+u ��userId hD�,>�5��¤name 
   testuser3   teamB �   0 ?   _id h�CT�+u ��userId hx޶u�8T�m]name    testuser14  1 >   _id h�CT�+u ��userId hD��>�5��®name 
   testuser4   court      standOuts �   0 O   _id h�CT�+u �� userId    684485fd3efd35198cbac2c2 name 
   testuser9  1 P   _id h�CT�+u ��!userId    6878de6675ce3854a16d5cfb name    testuser12  2 P   _id h�CT�+u ��"userId    6878de8e75ce3854a16d5d05 name    testuser13    3 T  _id h�CT�+u ��#matches ,  0 _  teamAScore     teamBScore     _id h�CT�+u ��$teamA �   0 ?   _id h�CT�+u ��%userId hxގu�8T�m]name    testuser13  1 >   _id h�CT�+u ��&userId hD��>�5����name 
   testuser5   teamB �   0 ?   _id h�CT�+u ��'userId hx�fu�8T�m\�name    testuser12  1 >   _id h�CT�+u ��(userId hD��>�5��¸name 
   testuser7   court      1 ^  teamAScore     teamBScore     _id h�CT�+u ��)teamA �   0 >   _id h�CT�+u ��*userId hD��>�5����name 
   testuser9  1 >   _id h�CT�+u ��+userId hD��>�5��½name 
   testuser8   teamB �   0 ?   _id h�CT�+u ��,userId h{��kp�KF�name    testuser20  1 >   _id h�CT�+u ��-userId hD��>�5�� name 
   testuser2   court     2 a  teamAScore     teamBScore     _id h�CT�+u ��.teamA �   0 ?   _id h�CT�+u ��/userId hx��u�8T�m]name    testuser16  1 ?   _id h�CT�+u ��0userId h7]Wf���pJ]name    testuser76   teamB �   0 ?   _id h�CT�+u ��1userId hx��u�8T�m]name    testuser15  1 ?   _id h�CT�+u ��2userId hD�7>�5����name    testuser11   court      standOuts �   0 P   _id h�CT�+u ��3userId    6878deb675ce3854a16d5d0b name    testuser14  1 P   _id h�CT�+u ��4userId    6878ded475ce3854a16d5d11 name    testuser15  2 P   _id h�CT�+u ��5userId    6878deef75ce3854a16d5d17 name    testuser16    4 R  _id h�CT�+u ��6matches *  0 _  teamAScore     teamBScore     _id h�CT�+u ��7teamA �   0 ?   _id h�CT�+u ��8userId hxގu�8T�m]name    testuser13  1 >   _id h�CT�+u ��9userId hD�,>�5��¤name 
   testuser3   teamB �   0 ?   _id h�CT�+u ��:userId hx�fu�8T�m\�name    testuser12  1 >   _id h�CT�+u ��;userId hD��>�5��®name 
   testuser4   court      1 ]  teamAScore     teamBScore     _id h�CT�+u ��<teamA �   0 >   _id h�CT�+u ��=userId hD��>�5����name 
   testuser9  1 >   _id h�CT�+u ��>userId hD��>�5����name 
   testuser5   teamB �   0 >   _id h�CT�+u ��?userId hD��>�5��½name 
   testuser8  1 >   _id h�CT�+u ��@userId hD��>�5��¸name 
   testuser7   court     2 `  teamAScore     teamBScore     _id h�CT�+u ��AteamA �   0 ?   _id h�CT�+u ��BuserId hx��u�8T�m]name    testuser16  1 >   _id h�CT�+u ��CuserId hD��>�5�� name 
   testuser2   teamB �   0 ?   _id h�CT�+u ��DuserId hx��u�8T�m]name    testuser15  1 ?   _id h�CT�+u ��EuserId h{��kp�KF�name    testuser20   court      standOuts �   0 P   _id h�CT�+u ��FuserId    687ba7c66b70db16084b46a2 name    testuser20  1 P   _id h�CT�+u ��GuserId    68375d5766f0f087704a5d13 name    testuser76  2 P   _id h�CT�+u ��HuserId    684486373efd35198cbac2cc name    testuser11    5 O  _id h�CT�+u ��Imatches *  0 a  teamAScore     teamBScore     _id h�CT�+u ��JteamA �   0 ?   _id h�CT�+u ��KuserId hx޶u�8T�m]name    testuser14  1 ?   _id h�CT�+u ��LuserId h7]Wf���pJ]name    testuser76   teamB �   0 ?   _id h�CT�+u ��MuserId hxގu�8T�m]name    testuser13  1 ?   _id h�CT�+u ��NuserId hD�7>�5����name    testuser11   court      1 ]  teamAScore     teamBScore     _id h�CT�+u ��OteamA �   0 >   _id h�CT�+u ��PuserId hD��>�5����name 
   testuser9  1 >   _id h�CT�+u ��QuserId hD�,>�5��¤name 
   testuser3   teamB �   0 >   _id h�CT�+u ��RuserId hD��>�5��½name 
   testuser8  1 >   _id h�CT�+u ��SuserId hD��>�5��®name 
   testuser4   court     2 ^  teamAScore     teamBScore     _id h�CT�+u ��TteamA �   0 >   _id h�CT�+u ��UuserId hD��>�5��¸name 
   testuser7  1 >   _id h�CT�+u ��VuserId hD��>�5����name 
   testuser5   teamB �   0 ?   _id h�CT�+u ��WuserId hx��u�8T�m]name    testuser15  1 >   _id h�CT�+u ��XuserId hD��>�5�� name 
   testuser2   court      standOuts �   0 O   _id h�CT�+u ��YuserId    684484e13efd35198cbac2a0 name 
   testuser2  1 O   _id h�CT�+u ��ZuserId    6844852c3efd35198cbac2a4 name 
   testuser3  2 O   _id h�CT�+u ��[userId    684485873efd35198cbac2ae name 
   testuser4    6 Q  _id h�CT�+u ��\matches ,  0 a  teamAScore     teamBScore     _id h�CT�+u ��]teamA �   0 ?   _id h�CT�+u ��^userId hx޶u�8T�m]name    testuser14  1 ?   _id h�CT�+u ��_userId hx��u�8T�m]name    testuser16   teamB �   0 ?   _id h�CT�+u ��`userId hxގu�8T�m]name    testuser13  1 ?   _id h�CT�+u ��auserId h{��kp�KF�name    testuser20   court      1 `  teamAScore     teamBScore     _id h�CT�+u ��bteamA �   0 ?   _id h�CT�+u ��cuserId hx�fu�8T�m\�name    testuser12  1 ?   _id h�CT�+u ��duserId h7]Wf���pJ]name    testuser76   teamB �   0 >   _id h�CT�+u ��euserId hD��>�5����name 
   testuser9  1 ?   _id h�CT�+u ��fuserId hD�7>�5����name    testuser11   court     2 ]  teamAScore     teamBScore     _id h�CT�+u ��gteamA �   0 >   _id h�CT�+u ��huserId hD��>�5��¸name 
   testuser7  1 >   _id h�CT�+u ��iuserId hD�,>�5��¤name 
   testuser3   teamB �   0 >   _id h�CT�+u ��juserId hD��>�5����name 
   testuser5  1 >   _id h�CT�+u ��kuserId hD��>�5��®name 
   testuser4   court      standOuts �   0 O   _id h�CT�+u ��luserId    684486893efd35198cbac2db name 
   testuser5  1 O   _id h�CT�+u ��muserId    684485c93efd35198cbac2b8 name 
   testuser7  2 O   _id h�CT�+u ��nuserId    684485e53efd35198cbac2bd name 
   testuser8    7 T  _id h�CT�+u ��omatches -  0 `  teamAScore     teamBScore     _id h�CT�+u ��pteamA �   0 ?   _id h�CT�+u ��quserId hx޶u�8T�m]name    testuser14  1 >   _id h�CT�+u ��ruserId hD��>�5�� name 
   testuser2   teamB �   0 ?   _id h�CT�+u ��suserId hxގu�8T�m]name    testuser13  1 ?   _id h�CT�+u ��tuserId hx��u�8T�m]name    testuser15   court      1 `  teamAScore     teamBScore     _id h�CT�+u ��uteamA �   0 ?   _id h�CT�+u ��vuserId hx�fu�8T�m\�name    testuser12  1 ?   _id h�CT�+u ��wuserId hx��u�8T�m]name    testuser16   teamB �   0 >   _id h�CT�+u ��xuserId hD��>�5����name 
   testuser9  1 ?   _id h�CT�+u ��yuserId h{��kp�KF�name    testuser20   court     2 _  teamAScore     teamBScore     _id h�CT�+u ��zteamA �   0 >   _id h�CT�+u ��{userId hD��>�5��½name 
   testuser8  1 ?   _id h�CT�+u ��|userId h7]Wf���pJ]name    testuser76   teamB �   0 >   _id h�CT�+u ��}userId hD��>�5��¸name 
   testuser7  1 ?   _id h�CT�+u ��~userId hD�7>�5����name    testuser11   court      standOuts �   0 O   _id h�CT�+u ��userId    684485fd3efd35198cbac2c2 name 
   testuser9  1 P   _id h�CT�+u ��userId    6878de6675ce3854a16d5cfb name    testuser12  2 P   _id h�CT�+u ��userId    6878de8e75ce3854a16d5d05 name    testuser13    8 S  _id h�CT�+u ��matches +  0 ^  teamAScore     teamBScore     _id h�CT�+u ��teamA �   0 >   _id h�CT�+u ��userId hD��>�5��®name 
   testuser4  1 >   _id h�CT�+u ��userId hD�,>�5��¤name 
   testuser3   teamB �   0 ?   _id h�CT�+u ��userId hxގu�8T�m]name    testuser13  1 >   _id h�CT�+u ��userId hD��>�5�� name 
   testuser2   court      1 `  teamAScore     teamBScore     _id h�CT�+u ��teamA �   0 ?   _id h�CT�+u ��userId hx�fu�8T�m\�name    testuser12  1 ?   _id h�CT�+u ��userId hx޶u�8T�m]name    testuser14   teamB �   0 >   _id h�CT�+u ��userId hD��>�5����name 
   testuser9  1 ?   _id h�CT�+u ��userId hx��u�8T�m]name    testuser15   court     2 _  teamAScore     teamBScore     _id h�CT�+u ��teamA �   0 >   _id h�CT�+u ��userId hD��>�5��½name 
   testuser8  1 ?   _id h�CT�+u ��userId hx��u�8T�m]name    testuser16   teamB �   0 >   _id h�CT�+u ��userId hD��>�5��¸name 
   testuser7  1 ?   _id h�CT�+u ��userId h{��kp�KF�name    testuser20   court      standOuts �   0 P   _id h�CT�+u ��userId    6878deb675ce3854a16d5d0b name    testuser14  1 P   _id h�CT�+u ��userId    6878ded475ce3854a16d5d11 name    testuser15  2 P   _id h�CT�+u ��userId    6878deef75ce3854a16d5d17 name    testuser16      �  _id h�}Z� 7x�{eventName    Thursday at St Olaf's eventLocation 
   St Olaf's eventType    test event type 	eventDate  �kd�  eventStartTime    19:00 eventOrganiser    Ger eventNumOfCourts    numOfStandOutsPerRound    eventNumOfRounds 	   eventWaitListSize    eventNumOfPairings    eventBookings a  0 B   _id h�0Z� 7x��userId hD�,>�5��¤userName 
   testuser3  1 B   _id h�lZ� 7x��userId hD��>�5����userName 
   testuser5  2 C   _id h�pZ� 7x�ZuserId hD�>�5����userName    testuser10  3 C   _id h��Z� 7x��userId hx�fu�8T�m\�userName    testuser12  4 C   _id h��Z� 7x��userId h{�*��sA{�<userName    testuser17   rounds     eventNumOfPlayers    __v     active  5  _id h��Z� 7x��eventName    Sarturday Drills eventLocation    Drill Place eventType    test event type 	eventDate   _@�  eventStartTime    10:00 eventOrganiser    Ger 22 eventNumOfCourts    numOfStandOutsPerRound    eventNumOfRounds 	   eventWaitListSize    eventNumOfPairings    eventBookings �  0 B   _id h�Z� 7x��userId hD��>�5�� userName 
   testuser2  1 B   _id h�OZ� 7x��userId hD��>�5��®userName 
   testuser4  2 B   _id h�!Z� 7x�userId hD��>�5��½userName 
   testuser8  3 B   _id h�OZ� 7x�9userId hD��>�5����userName 
   testuser9  4 C   _id h��Z� 7x��userId hxގu�8T�m]userName    testuser13  5 C   _id h�,Z� 7x��userId hx޶u�8T�m]userName    testuser14  6 C   _id h�eZ� 7x�userId hx��u�8T�m]userName    testuser15  7 C   _id h��Z� 7x��userId hx��u�8T�m]userName    testuser16  8 C   _id h��Z� 7x�KuserId h{��kp�KF�userName    testuser18  9 C   _id h��S��FV���;userId hD�7>�5����userName    testuser11   rounds     eventNumOfPlayers    __v     active  �  _id h�y���<lr��active  eventName %   Tuesday at St Olaf's - Not active mm eventLocation    Dublin eventType    Social 	eventDate  �y��  eventStartTime    20:04 eventOrganiser    Ger eventNumOfCourts    numOfStandOutsPerRound    eventNumOfRounds 	   eventWaitListSize    eventNumOfPairings    eventBookings     rounds     eventNumOfPlayers    __v      
```

## dump/Pickle-Database/events.metadata.json

*Size: 266 bytes*

```json
{"indexes":[{"v":{"$numberInt":"2"},"key":{"_id":{"$numberInt":"1"}},"name":"_id_"},{"v":{"$numberInt":"2"},"key":{"slug":{"$numberInt":"1"}},"name":"slug_1","background":true}],"uuid":"c8c5797ba0d7437f8cc6150158483192","collectionName":"events","type":"collection"}
```

## dump/Pickle-Database/prelude.json

*Size: 51 bytes*

```json
{"ServerVersion":"8.0.12","ToolVersion":"100.12.1"}
```

## dump/Pickle-Database/sessions.bson

*Size: 1872 bytes*

```bson
�  _id !   nwEb5JwsVGSrEfu6WqDDZo3p3QoIlG-o 	expires 4���  session �  cookie r   originalMaxAge  �$
partitioned 
priority 	expires 4���  
secure httpOnly 
domain path    / 
sameSite  user j   userId    684486373efd35198cbac2cc userName    testuser11 userRole    user userMobile  ��q�TB systemDefaults h   numOfStandOuts    numOfRounds 	   numOfCourts 	   numOfPairingsPerCourt    waitListSize     features    teamCanEditScore     �  _id !   F9GKoSQ4an8X1ZNuglpOXgvgOez9jerT 	expires ���  session �  cookie r   originalMaxAge  �$
partitioned 
priority 	expires ���  
secure httpOnly 
domain path    / 
sameSite  user j   userId    684486373efd35198cbac2cc userName    testuser11 userRole    user userMobile  ��q�TB systemDefaults h   numOfStandOuts    numOfRounds 	   numOfCourts 	   numOfPairingsPerCourt    waitListSize     features    teamCanEditScore     �  _id !   LF65mqjbK-LlB_iLwbSCw3fNuDhJq9vz 	expires ��*�  session �  cookie r   originalMaxAge  �$
partitioned 
priority 	expires ��*�  
secure httpOnly 
domain path    / 
sameSite  user r   userId    682f180f32ccbd78850a8bb7 userName    Club Admin 99 userRole 
   clubAdmin userMobile   ��:0B systemDefaults h   numOfStandOuts    numOfRounds 	   numOfCourts 	   numOfPairingsPerCourt    waitListSize     features    teamCanEditScore     �  _id !   UJFZGSjp-nO_DPnBNKIyvvSXugdeZ8D2 	expires ���  session �  cookie r   originalMaxAge  �$
partitioned 
priority 	expires ���  
secure httpOnly 
domain path    / 
sameSite  user j   userId    684486373efd35198cbac2cc userName    testuser11 userRole    user userMobile  ��q�TB systemDefaults h   numOfStandOuts    numOfRounds 	   numOfCourts 	   numOfPairingsPerCourt    waitListSize     features    teamCanEditScore     
```

## dump/Pickle-Database/sessions.metadata.json

*Size: 296 bytes*

```json
{"indexes":[{"v":{"$numberInt":"2"},"key":{"_id":{"$numberInt":"1"}},"name":"_id_"},{"v":{"$numberInt":"2"},"key":{"expires":{"$numberInt":"1"}},"name":"expires_1","expireAfterSeconds":{"$numberInt":"0"}}],"uuid":"7679231002214e978ad3b5122fc8ede9","collectionName":"sessions","type":"collection"}
```

## dump/Pickle-Database/settings.bson

*Size: 176 bytes*

```bson
�   _id h���O Vf|wۭsystemDefaults h   numOfStandOuts    numOfRounds 	   numOfCourts 	   numOfPairingsPerCourt    waitListSize     features    teamCanEditScore    
```

## dump/Pickle-Database/settings.metadata.json

*Size: 175 bytes*

```json
{"indexes":[{"v":{"$numberInt":"2"},"key":{"_id":{"$numberInt":"1"}},"name":"_id_"}],"uuid":"6028de3724694ac38479cfbb38d73fea","collectionName":"settings","type":"collection"}
```

## dump/Pickle-Database/users.bson

*Size: 5310 bytes*

```bson
G  _id h/2̽x�
��role 
   clubAdmin active name    Club Admin 99 email    clubadmin99@gmail.com mobile   ��:0Bpassword =   $2a$12$CUyq3garlwUuIoES627.Muxl7D3.CZVa8cOGLJabmRp5Kuu/Ca7mm __v     	passwordResetExpires .�J�  passwordResetToken A   9fad9b7675255ef7c6c6596f8bbe29c80ecc451ddcfed47e216b7c3479ad4ecb  �   _id h7]Wf���pJ]role    user active  name    testuser76 email    testuser76@gmail.com mobile 8VLpassword =   $2a$12$ZbIOd8fhwXGqPZ/Xg4sabOfW.NiEPuwyPcLn45nBT4ikZamOw9t1m __v      �   _id hD��>�5��role    user active name 
   testuser1 email    testuser1@gmail.com mobile    password =   $2a$12$IPPk9YGC5/BKhuYhmIjCreAwZZ.i7543t9MUtkELdJayd44GwY/Nm __v      �   _id hD��>�5�� role    user active name 
   testuser2 email    testuser2@gmail.com mobile    password =   $2a$12$CGOhWpq9LXZti7/1AyNMT.20m/I9hz2kS9ZJ8CwV/loa5C/RtHCuq __v      �   _id hD�,>�5��¤role    user active name 
   testuser3 email    testuser3@gmail.com mobile    password =   $2a$12$As.Uo9loofsLJ61LHuyptO6jKeCDpGJj2O42Ow6LTpW0a9gigPLiC __v      �   _id hD��>�5��®role    user active name 
   testuser4 email    testuser4@gmail.com mobile    password =   $2a$12$oDGSuNgDkjY6opFu8HFlB.F238xV4eAORLHDvZQdRDuEHaoi4FH96 __v      �   _id hD��>�5��³role    user active name 
   testuser6 email    testuser6@gmail.com mobile    password =   $2a$12$MSVYVdkEGOYd5xpEyhO0Her8Y411c5DjGxw2IvoD1UVPqKSXmH.VS __v      �   _id hD��>�5��¸role    user active name 
   testuser7 email    testuser7@gmail.com mobile    password =   $2a$12$UCxdeO4E7xJz6O/Z/ek98.YkOoqzayQCLBPyExfIyh7Ocpw5UtHNy __v      �   _id hD��>�5��½role    user active name 
   testuser8 email    testuser8@gmail.com mobile    password =   $2a$12$f9vPOJDHlxkhVDYMICtpX.md5HrcAk56M6aHGN5S3Pr6aA10eUOU6 __v      �   _id hD��>�5����role    user active name 
   testuser9 email    testuser9@gmail.com mobile 	   password =   $2a$12$Pf4TQcsB7u5yWCAShNwUTuIIL6Gxt7J4ko/UZCVYx5FhfPyNye.WC __v      �   _id hD�>�5����role    user active name    testuser10 email    testuser10@gmail.com mobile 
   password =   $2a$12$eEl1ZXKrM4enWPIgvC7Ze.yZpcQ60JgFkuhF7mHA5qOY5aeOM925m __v      �   _id hD�7>�5����role    user active name    testuser11 email    testuser11@gmail.com mobile  ��q�TBpassword =   $2a$12$6XSMu.Ng9SPtsKCFiroAs.VvwiZsttRXPVSyaONGG4quqMnFmIvgi __v      �   _id hD��>�5����role    user active name 
   testuser5 email    testuser5@gmail.com mobile    password =   $2a$12$.rxZ3XhbW8UNoP8gNBOrIOA840Zgo8qv5ZZdMRzQZYZ.CADKVnfqK __v      �   _id hx�fu�8T�m\�role    user active name    testuser12 email    testuser12@gmail.com mobile ��3password =   $2a$12$9rxvmpT3.l9iPJkkS8bPLOjwAZG9Tg1hjgd.4E5NuDADDnO9pMOKy __v      �   _id hxގu�8T�m]role    user active name    testuser13 email    testuser13@gmail.com mobile    password =   $2a$12$OwMIjxnzr5E4BvQRyxEG1.9oP4E23.W6.lpNZlDcrDnBQMMRFM4cq __v      �   _id hx޶u�8T�m]role    user active name    testuser14 email    testuser14@gmail.com mobile    password =   $2a$12$p2vawh3jSeZIlZgnfzaLeeuWCA28SqZ4IeGj/AgdZ8N6itZuwGEiW __v      �   _id hx��u�8T�m]role    user active name    testuser15 email    testuser15@gmail.com mobile    password =   $2a$12$6sxrFeA/FnA3sfBVobUuBejqw13TtDZJ2LTyqtk55tg/vepU2YT3a __v      �   _id hx��u�8T�m]role    user active name    testuser16 email    testuser16@gmail.com mobile    password =   $2a$12$afVbHqktnTeth47dFrMLoeHYYNvjD7cLthNX7nZCCYIo/BQyomZ8. __v      �   _id h{�*��sA{�<role    user active name    testuser17 email    testuser17@gmail.com mobile    password =   $2a$12$QEROcku7TATpNHU0O3q0/eULd/GsjAgOOzq8OUk3ly/.DUCTk2Jnq __v      �   _id h{��kp�KF�role    user active name    testuser18 email    testuser18@gmail.com mobile    password =   $2a$12$tNLuc.ZSJ28wB/Twv.8LMult.JcBKx0mfCC8sYbh8TgMMOQuuUcoO __v      �   _id h{��kp�KF�role    user active name    testuser19 email    testuser19@gmail.com mobile    password =   $2a$12$nHgsoOvppcrbKOXlJMpuzuSDkG1.ZtwIbBclqdRUF37oxIZR57YNe __v      �   _id h{��kp�KF�role    user active name    testuser20 email    testuser20@gmail.com mobile    password =   $2a$12$Q5Kq7PbuYgUHgR5QkEcFQOoSwmQ9rPkdMcePLTaEfh1dblSI7JAWy __v      �   _id h{��kp�KF�role    user active name    testuser21 email    testuser21@gmail.com mobile    password =   $2a$12$yJJImFwFZctxQt22kNcMSud11JyortfXPk0Ghm504IEeWl3tWfy3O __v      =  _id h}:��,�9��&role    user active  name    Gerard O'Hara email    gerohara99@gmail.com mobile N   password =   $2a$12$1xJavp/QWyCh57zvm7BdPOcii34AqvQedsXKnqvPNVlUg6yJJcTMy __v     	passwordResetExpires ���  passwordResetToken A   54c9ec7a8efeb914443490abe6e28af69d86408a8eee354a8bc12ebc05c261bb  �   _id h�<�.ٲ���role    user active name    testuser30 email    testuser30@gmail.com mobile    password =   $2a$12$v5rg8qDWm9.Vi88DiBZqFODAYtsTKQczHrFLhE9YedF9NfYNI5.Aq __v      �   _id h���d��Q��)role    user active name    testuser31 email    testuser31@gmail.com mobile    password =   $2a$12$gDxIdwAmpnow0cNkuQRvc.R.2EoKWkzd5K9HgOuzmU2UACak9XUay __v      
```

## dump/Pickle-Database/users.metadata.json

*Size: 392 bytes*

```json
{"indexes":[{"v":{"$numberInt":"2"},"key":{"_id":{"$numberInt":"1"}},"name":"_id_"},{"v":{"$numberInt":"2"},"key":{"email":{"$numberInt":"1"}},"name":"email_1","background":true,"unique":true},{"v":{"$numberInt":"2"},"key":{"mobile":{"$numberInt":"1"}},"name":"mobile_1","background":true,"unique":true}],"uuid":"754d86c70ad64b99986659b17900ba11","collectionName":"users","type":"collection"}
```

## manifest.webmanifest

*Size: 222 bytes*

```webmanifest
{
  "icons": [
    {
      "src": "img/favicon-192.png",
      "type": "image/png",
      "sizes": "192x192"
    },
    {
      "src": "img/favicon-512.png",
      "type": "image/png",
      "sizes": "512x512"
    }
  ]
}

```

## models/eventModel.js

*Size: 2560 bytes*

```js
const mongoose = require("mongoose");

const playerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.ObjectId },
  name: { type: String },
});

const matchSchema = new mongoose.Schema({
  teamA: { type: [playerSchema] },
  teamB: { type: [playerSchema] },
  court: { type: Number },
  teamAScore: { type: Number, default: 0 },
  teamBScore: { type: Number, default: 0 },
});

const roundSchema = new mongoose.Schema({
  matches: { type: [matchSchema] },
  standOuts: [
    {
      userId: { type: String }, // Store userId directly as string
      name: { type: String },
    },
  ],
});

const eventSchema = new mongoose.Schema(
  {
    eventName: {
      type: String,
      required: [true, "Please enter the name of the event"],
    },
    eventLocation: {
      type: String,
      required: [true, "Please enter location of the event"],
    },
    eventType: {
      type: String,
    },
    eventDate: {
      type: Date,
      required: [true, "Please enter a date for the event"],
    },
    eventStartTime: {
      type: String,
      required: [true, "Please enter a start time for the event"],
    },
    eventOrganiser: {
      type: String,
      required: [true, "Please enter an organiser name for the event"],
    },
    eventNumOfCourts: {
      type: Number,
      required: [
        true,
        "Please enter number of courts available for this event",
      ],
    },
    numOfStandOutsPerRound: {
      type: Number,
      required: [true, "Please enter number of players resting per round"],
    },
    eventNumOfRounds: {
      type: Number,
      required: [true, "Please enter number of rounds per event"],
    },
    eventWaitListSize: {
      type: Number,
      required: [
        true,
        "Please enter max number of players allowed on wait list",
      ],
    },
    eventNumOfPairings: {
      type: Number,
      required: [true, "Please enter number of pairings per court"],
    },
    eventNumOfPlayers: {
      type: Number,
    },
    eventBookings: [
      {
        userId: { type: mongoose.Schema.ObjectId },
        userName: { type: String },
      },
    ],

    rounds: { type: [roundSchema] },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    // enable virtual fields
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

eventSchema.pre("save", function (next) {
  this.eventNumOfPlayers =
    this.eventNumOfCourts * 4 + this.numOfStandOutsPerRound;
  next();
});

const Event = mongoose.model("Event", eventSchema);

module.exports = Event;

```

## models/sessionModel.js

*Size: 614 bytes*

```js
const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema({
  user: {
    userId: { type: mongoose.Schema.ObjectId },
    userName: { type: String },
    userRole: { type: String },
    userMobile: { Number, default: 0 },
  },
  systemDefaults: {
    numOfStandOuts: { type: Number, default: 0 },
    numOfRounds: { type: Number, default: 0 },
    numOfCourts: { type: Number, default: 0 },
    numOfPairingsPerCourt: { type: Number, default: 0 },
    waitListSize: { type: Number, default: 0 },
  },
});

const Session = mongoose.model("Session", sessionSchema);

module.exports = Session;

```

## models/settingsModel.js

*Size: 528 bytes*

```js
const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema({
  systemDefaults: {
    numOfStandOuts: { type: Number, default: 0 },
    numOfRounds: { type: Number, default: 0 },
    numOfCourts: { type: Number, default: 0 },
    numOfPairingsPerCourt: { type: Number, default: 0 },
    waitListSize: { type: Number, default: 0 },
  },
  features: {
    teamCanEditScore: { type: Boolean, default: false },
  },
});

const Settings = mongoose.model("Settings", settingsSchema);

module.exports = Settings;

```

## models/userModel.js

*Size: 2972 bytes*

```js
const crypto = require("crypto");
const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");

// name, email, mobile, password, passwordConfirm

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please tell us your name"],
  },
  email: {
    type: String,
    required: [true, "please enter your email address"],
    unique: [true, "This email is already taken"],
    lowercase: true,
    validate: [validator.isEmail, "Incorrect email format"],
  },
  mobile: {
    type: Number,
    required: [true, "please enter your mobile phone number"],
    unique: [true, "This mobile phone number is already taken"],
  },
  role: {
    type: String,
    enum: ["user", "clubAdmin", "pickleAdmin"],
    default: "user",
  },
  PasswordChangedAt: {
    type: Date,
  },
  password: {
    type: String,
    required: [true, "please proivide a password"],
    minLength: 8,
    select: false, // setting to enusre value is never displayed
  },
  passwordConfirm: {
    type: String,
    required: [true, "please proivide a password confirmation"],
    validate: {
      // This only works on create and save
      validator: function (el) {
        return el === this.password;
      },
      message: "passwords are not the same",
    },
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
  },
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  // .hash is async version which is what we want in order not to block event loop
  this.password = await bcrypt.hash(this.password, 12); // 12 is cpu usage for crypto

  this.passwordConfirm = undefined; // Only need this at data entry stage
  next();
});

userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000; // Allow for db latency
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    // eslint-disable-next-line radix
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    // If password changed after token issued then return true otherwise false
    return JWTTimestamp < changedTimestamp;
  }
  // False means password not changed
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model("User", userSchema);

module.exports = User;

```

## prototype/generateSchedule.js

*Size: 7859 bytes*

```js
/**
 * Generate a perfect schedule given only:
 *   - number of courts
 *   - number of rests per player
 * The code calculates the ideal number of players and rounds to guarantee:
 *   - unique partners every round
 *   - each player rests the same number of times
 *   - rests are evenly distributed
 */

function factorial(n) {
  return n <= 1 ? 1 : n * factorial(n - 1);
}

// Helper: Calculate max rounds for unique partners
function maxRoundsForUniquePartners(numPlayers, numCourts) {
  const uniquePairs = (numPlayers * (numPlayers - 1)) / 2;
  const matchesPerRound = numCourts;
  const pairsPerRound = matchesPerRound * 2; // 2 pairs per match
  return Math.floor(uniquePairs / pairsPerRound);
}

// Helper: Find ideal number of players and rounds for perfect schedule
function findIdealConfig(numCourts, restsPerPlayer) {
  // Try increasing player count until all requirements are met
  for (let numPlayers = numCourts * 2 + 2; numPlayers < 100; numPlayers++) {
    // Each round: numCourts matches × 4 players = numCourts * 4 players playing
    // Resting per round: numPlayers - numCourts * 4
    const playingPerRound = numCourts * 4;
    const restingPerRound = numPlayers - playingPerRound;
    if (restingPerRound <= 0) continue;

    // Total rests needed: numPlayers * restsPerPlayer
    // Total rounds needed: totalRests / restingPerRound
    const totalRests = numPlayers * restsPerPlayer;
    if (totalRests % restingPerRound !== 0) continue;
    const numRounds = totalRests / restingPerRound;

    // Check if unique partners possible
    const maxRounds = maxRoundsForUniquePartners(numPlayers, numCourts);
    if (numRounds <= maxRounds) {
      return { numPlayers, numRounds, restingPerRound, playingPerRound };
    }
  }
  throw new Error("No ideal configuration found for these inputs.");
}

// Generate dummy players
function generateDummyPlayers(num) {
  return Array.from({ length: num }, (_, i) => ({
    userId: `user${i + 1}`,
    userName: `Player${i + 1}`,
  }));
}

// Assign rests evenly and spread out
function assignRests(players, numRounds, restingPerRound) {
  const totalRests = numRounds * restingPerRound;
  const baseRests = Math.floor(totalRests / players.length);
  const extraRests = totalRests % players.length;
  const restCounts = Array(players.length).fill(baseRests);
  for (let i = 0; i < extraRests; i++) restCounts[i]++;

  const playerRestRounds = Array(players.length)
    .fill(0)
    .map(() => []);
  const restSchedule = Array(numRounds)
    .fill(0)
    .map(() => []);

  for (let round = 0; round < numRounds; round++) {
    let candidates = [];
    for (let pIdx = 0; pIdx < players.length; pIdx++) {
      if (
        restCounts[pIdx] > 0 &&
        (playerRestRounds[pIdx].length === 0 ||
          playerRestRounds[pIdx][playerRestRounds[pIdx].length - 1] !==
            round - 1)
      ) {
        candidates.push({ idx: pIdx, remaining: restCounts[pIdx] });
      }
    }
    candidates.sort((a, b) => b.remaining - a.remaining);
    for (let i = 0; i < restingPerRound && i < candidates.length; i++) {
      const pIdx = candidates[i].idx;
      restSchedule[round].push(players[pIdx]);
      restCounts[pIdx]--;
      playerRestRounds[pIdx].push(round);
    }
  }

  // Fallback for any unassigned rests
  for (let pIdx = 0; pIdx < players.length; pIdx++) {
    while (restCounts[pIdx] > 0) {
      let found = false;
      for (let round = 0; round < numRounds; round++) {
        if (
          !restSchedule[round].some((p) => p.userId === players[pIdx].userId) &&
          (playerRestRounds[pIdx].length === 0 ||
            !playerRestRounds[pIdx].includes(round - 1))
        ) {
          restSchedule[round].push(players[pIdx]);
          restCounts[pIdx]--;
          playerRestRounds[pIdx].push(round);
          found = true;
          break;
        }
      }
      if (!found) break;
    }
  }

  // Ensure each round has at most restingPerRound
  for (let round = 0; round < numRounds; round++) {
    while (restSchedule[round].length > restingPerRound) {
      restSchedule[round].pop();
    }
  }

  return restSchedule;
}

// Unique partner assignment for each round
function buildUniquePartnerSchedule(
  players,
  numRounds,
  restingPerRound,
  numCourts
) {
  const restSchedule = assignRests(players, numRounds, restingPerRound);
  const schedule = [];
  const playerIds = players.map((p) => p.userId);

  // Track previous partners for each player
  const partnersHistory = {};
  playerIds.forEach((pid) => (partnersHistory[pid] = new Set()));

  for (let round = 0; round < numRounds; round++) {
    const restingIds = new Set(restSchedule[round].map((p) => p.userId));
    const playingPlayers = players.filter((p) => !restingIds.has(p.userId));
    const available = [...playingPlayers.map((p) => p.userId)];
    const matches = [];

    // Greedy pairing for unique partners
    while (available.length >= 4) {
      available.sort(
        (a, b) => partnersHistory[a].size - partnersHistory[b].size
      );
      const p1 = available[0];
      let p2 = null;
      for (let i = 1; i < available.length; i++) {
        if (!partnersHistory[p1].has(available[i])) {
          p2 = available[i];
          break;
        }
      }
      if (!p2) p2 = available[1];
      available.splice(available.indexOf(p1), 1);
      available.splice(available.indexOf(p2), 1);

      available.sort(
        (a, b) => partnersHistory[a].size - partnersHistory[b].size
      );
      const p3 = available[0];
      let p4 = null;
      for (let i = 1; i < available.length; i++) {
        if (!partnersHistory[p3].has(available[i])) {
          p4 = available[i];
          break;
        }
      }
      if (!p4) p4 = available[1];
      available.splice(available.indexOf(p3), 1);
      available.splice(available.indexOf(p4), 1);

      partnersHistory[p1].add(p2);
      partnersHistory[p2].add(p1);
      partnersHistory[p3].add(p4);
      partnersHistory[p4].add(p3);

      matches.push({
        teamA: [p1, p2],
        teamB: [p3, p4],
      });
    }

    schedule.push({
      round: round + 1,
      standOuts: restSchedule[round].map((p) => p.userName),
      matches: matches.map((m, idx) => ({
        court: idx % numCourts,
        teamA: m.teamA.map(
          (pid) => players.find((p) => p.userId === pid).userName
        ),
        teamB: m.teamB.map(
          (pid) => players.find((p) => p.userId === pid).userName
        ),
      })),
    });
  }
  return schedule;
}

// Main runner: accepts only number of courts and rests per player
function main(numCourts, restsPerPlayer) {
  try {
    const config = findIdealConfig(numCourts, restsPerPlayer);
    const { numPlayers, numRounds, restingPerRound, playingPerRound } = config;

    console.log("\n=== Perfect Schedule Configuration ===");
    console.log(`Courts: ${numCourts}`);
    console.log(`Rests per player: ${restsPerPlayer}`);
    console.log(`Total players: ${numPlayers}`);
    console.log(`Rounds: ${numRounds}`);
    console.log(`Players resting per round: ${restingPerRound}`);
    console.log(`Players playing per round: ${playingPerRound}`);

    const dummyPlayers = generateDummyPlayers(numPlayers);

    const schedule = buildUniquePartnerSchedule(
      dummyPlayers,
      numRounds,
      restingPerRound,
      numCourts
    );

    schedule.forEach((round) => {
      console.log(`\nRound ${round.round}:`);
      console.log(`  Resting: ${round.standOuts.join(", ")}`);
      round.matches.forEach((match, idx) => {
        console.log(
          `  Court ${match.court}: TeamA [${match.teamA.join(", ")}] vs TeamB [${match.teamB.join(", ")}]`
        );
      });
    });
  } catch (err) {
    console.error("Error:", err.message);
  }
}

// Example usage: change these values to test different configurations
main(3, 2); // 3 courts, 2 rests per player

```

## prototype/scheduleCalculator.html

*Size: 6980 bytes*

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Pickle Event Schedule Calculator</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        margin: 2em;
      }
      label {
        display: block;
        margin-top: 1em;
      }
      input[type="number"] {
        width: 60px;
      }
      .result {
        margin-top: 2em;
        padding: 1em;
        border: 1px solid #ccc;
        background: #f9f9f9;
      }
      .error {
        color: red;
      }
      .hidden {
        display: none;
      }
    </style>
  </head>
  <body>
    <h2>Pickle Event Schedule Calculator</h2>
    <form id="scheduleForm">
      <label>
        Number of courts:
        <input type="number" id="numCourts" min="1" value="3" required />
      </label>
      <label>
        Pairings per court:
        <input type="number" id="numPairings" min="1" value="2" required />
      </label>
      <label>
        Rest rounds per player (event):
        <input type="number" id="restsPerPlayer" min="0" value="2" required />
      </label>
      <div id="roundsInputContainer" class="hidden">
        <label>
          Number of rounds:
          <input type="number" id="numRounds" min="1" />
        </label>
      </div>
      <button type="submit">Calculate</button>
    </form>

    <div class="result" id="result"></div>

    <script>
      let roundsEditable = false;

      function maxUniquePartnerRounds(numPlayers) {
        return numPlayers - 1;
      }

      function minRounds(numPlayers, numCourts, numPairings, restsPerPlayer) {
        const playingPerRound = numCourts * numPairings * 2;
        const restingPerRound = numPlayers - playingPerRound;
        if (restingPerRound <= 0) return null;
        const totalRests = numPlayers * restsPerPlayer;
        if (totalRests % restingPerRound !== 0) return null;
        return totalRests / restingPerRound;
      }

      function findTotalPlayers(numCourts, numPairings, restsPerPlayer) {
        for (
          let numPlayers = numCourts * numPairings * 2 + 2;
          numPlayers < 100;
          numPlayers++
        ) {
          const playingPerRound = numCourts * numPairings * 2;
          const restingPerRound = numPlayers - playingPerRound;
          if (restingPerRound <= 0) continue;
          const totalRests = numPlayers * restsPerPlayer;
          if (totalRests % restingPerRound !== 0) continue;
          const minRoundsVal = totalRests / restingPerRound;
          const maxRoundsVal = maxUniquePartnerRounds(numPlayers);
          if (minRoundsVal <= maxRoundsVal) {
            return numPlayers;
          }
        }
        return null;
      }

      function restPlayUniformity(
        numPlayers,
        numRounds,
        numCourts,
        numPairings
      ) {
        const playingPerRound = numCourts * numPairings * 2;
        const restingPerRound = numPlayers - playingPerRound;
        if (restingPerRound < 0)
          return {
            restsPerPlayer: 0,
            playsPerPlayer: 0,
          };
        const totalRests = numRounds * restingPerRound;
        const restsPerPlayer = totalRests / numPlayers;
        const playsPerPlayer = numRounds - restsPerPlayer;
        return {
          restsPerPlayer,
          playsPerPlayer,
        };
      }

      document
        .getElementById("scheduleForm")
        .addEventListener("submit", function (e) {
          e.preventDefault();
          const numCourts = parseInt(
            document.getElementById("numCourts").value,
            10
          );
          const numPairings = parseInt(
            document.getElementById("numPairings").value,
            10
          );
          const restsPerPlayer = parseInt(
            document.getElementById("restsPerPlayer").value,
            10
          );
          const roundsInputContainer = document.getElementById(
            "roundsInputContainer"
          );
          const numRoundsInput = document.getElementById("numRounds");
          const resultDiv = document.getElementById("result");

          // Find total players needed for perfect schedule
          const totalPlayersNeeded = findTotalPlayers(
            numCourts,
            numPairings,
            restsPerPlayer
          );

          // Calculate min/max rounds for unique partners
          let minRoundsVal = null;
          let maxRoundsVal = null;
          if (totalPlayersNeeded) {
            minRoundsVal = minRounds(
              totalPlayersNeeded,
              numCourts,
              numPairings,
              restsPerPlayer
            );
            maxRoundsVal = maxUniquePartnerRounds(totalPlayersNeeded);
          }

          let numRounds = minRoundsVal;
          let warningMsg = "";

          // If user has already edited rounds, use their value
          if (roundsEditable && numRoundsInput.value) {
            numRounds = parseInt(numRoundsInput.value, 10);
            if (numRounds > maxRoundsVal) {
              warningMsg = `<span class="error">Warning: With ${numRounds} rounds, some players will have to repeat partners. Maximum rounds for unique partners is ${maxRoundsVal}.</span><br>`;
            }
            if (minRoundsVal && numRounds < minRoundsVal) {
              warningMsg += `<span class="error">Warning: With ${numRounds} rounds, not all players will have equal rest time. Minimum rounds for equal rest is ${minRoundsVal}.</span><br>`;
            }
            if (totalPlayersNeeded - numCourts * numPairings * 2 < 0) {
              warningMsg += `<span class="error">Error: Too many players assigned to play per round. Increase number of players or reduce courts/pairings.</span><br>`;
            }
          }

          // Calculate rest/play values for current rounds
          const dist = restPlayUniformity(
            totalPlayersNeeded || 0,
            numRounds,
            numCourts,
            numPairings
          );

          resultDiv.innerHTML = `
          ${warningMsg}
          <strong>Schedule Summary:</strong><br>
          <ul>
            <li><strong>Number of rounds:</strong> ${numRounds !== null ? numRounds : "N/A"}</li>
            <li><strong>Total players needed:</strong> ${totalPlayersNeeded !== null ? totalPlayersNeeded : "N/A"}</li>
            <li><strong>Rests per player:</strong> ${dist.restsPerPlayer.toFixed(2)}</li>
            <li><strong>Playing rounds per player:</strong> ${dist.playsPerPlayer.toFixed(2)}</li>
          </ul>
          <em>Adjust the values above and click "Calculate" to see the implications for your event configuration.</em>
        `;

          // After first calculation, show and enable rounds input for editing
          if (!roundsEditable && minRoundsVal !== null) {
            roundsEditable = true;
            roundsInputContainer.classList.remove("hidden");
            numRoundsInput.value = minRoundsVal;
          }
        });
    </script>
  </body>
</html>

```

## public/css/mediaQueries.css

*Size: 5754 bytes*

```css
/* Responsive styles for screens up to 768px wide */
@media (max-width: 768px) {
  /* Show mobile nav toggle, hide desktop nav */
  .btn-mobile-nav {
    display: inline-block;
  }
  nav.main-nav {
    display: none;
  }

  /* Navigation list - vertical stacking */
  .main-nav-list {
    flex-direction: column !important;
    gap: 1.6rem;
    padding-left: 1.6rem;
    margin: 0;
  }
  .main-nav-link {
    font-size: 1.6rem;
  }

  /* Containers and content wrappers */
  .crudContainer-1-cols,
  .crudContainer-2-cols,
  .container {
    max-width: 100%;
    padding: 1.6rem;
    margin: 0 auto;
    box-shadow: none;
    border-radius: 0;
    min-height: auto;
    display: block;
  }

  /* Reduce padding inside text boxes */
  .text-box {
    padding: 2rem 1.6rem;
  }

  /* Forms - switch from grid to block for single column flow */
  .form-1-cols,
  .form-2-cols {
    display: block;
    column-gap: 0;
    row-gap: 1.6rem;
  }
  .form-2-cols label,
  .form-1-cols label {
    font-size: 1.4rem;
  }
  .form-1-cols input,
  .form-2-cols input {
    width: 100%;
    font-size: 1.6rem;
    padding: 1rem;
    margin-bottom: 2.4rem;
  }
  .filter-form {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
    padding: 1.2rem 1rem;
  }
  .filter-form label {
    font-size: 1.4rem;
  }
  .filter-form input[type="text"],
  .filter-form select {
    width: 100%;
    font-size: 1.5rem;
    padding: 1rem;
  }
  .filter-form button {
    width: 100%;
    font-size: 1.5rem;
    padding: 1rem 0;
  }

  /* Form buttons row */
  .form-buttons {
    gap: 1rem;
  }
  .form-buttons > button,
  .form-buttons > .btn {
    flex: 1 1 0;
    min-width: 0;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Headings: smaller size */
  .heading-primary {
    font-size: 3.6rem;
    margin-bottom: 2.4rem;
  }
  .heading-secondary {
    font-size: 2.8rem;
    margin-bottom: 2rem;
  }

  /* Paragraph text */
  .normal-text,
  .homepage-description {
    font-size: 1.4rem;
    margin-bottom: 2rem;
  }

  /* Layout grids */
  .homepage {
    display: block;
    padding: 0 1.6rem;
  }
  .homepage-text-box,
  .homepage-img-box {
    margin-bottom: 2rem;
    width: 100%;
  }
  .homepage-img {
    width: 100%;
    height: auto;
  }

  /* Event cards and schedules - stack columns */
  .eventContainer,
  .mySchedule-table {
    display: block;
    padding: 0 1.6rem;
  }
  .eventContainer > .eventCardHeader {
    margin-bottom: 2.4rem; /* Add more space between cards */
  }

  .eventCardHeader .form-buttons {
    display: flex;
    justify-content: center;
    gap: 5%;
  }
  .eventCardHeader .form-buttons a.btn {
    flex: 0 1 45%;
    max-width: 45%;
    padding: 0.8rem 1rem;
  }

  /* Footer padding reduced */
  .footer {
    padding: 6rem 1.6rem;
  }

  /* Responsive styles for viewMySchedule.pug */
  .mySchedule-table {
    display: block !important;
    width: 100%;
    padding: 0;
    margin: 0;
  }
  .mySchedule-table .table-row {
    display: flex !important;
    flex-direction: column;
    gap: 0.6rem;
    background: #fff7ed;
    border-radius: 0.8rem;
    margin-bottom: 1.2rem;
    padding: 1.2rem 1rem;
    box-shadow: 0 0.1rem 0.2rem rgba(0, 0, 0, 0.04);
  }
  .row-pair {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.8rem;
    font-size: 1.4rem;
    margin-bottom: 0.2rem;
  }
  .label {
    font-weight: 600;
    color: #cf711f;
    min-width: 6rem;
    font-size: 1.3rem;
  }
  .value {
    color: #333;
    font-weight: 400;
    flex: 1;
    word-break: break-word;
    font-size: 1.3rem;
  }
  .score-button {
    min-width: 7rem;
    width: 7rem;
    height: 4.4rem;
    white-space: normal;
    text-align: center;
    font-size: 1.4rem;
    padding: 0.8rem 0.5rem;
    line-height: 1.2;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background-color: #cf711f;
    color: #fff;
    border: none;
    border-radius: 0.8rem;
    cursor: pointer;
    transition: background 0.2s;
    box-shadow: 0 2px 8px rgba(207, 113, 31, 0.08);
  }
  .score-button:hover,
  .score-button:active {
    background-color: #cf711f;
    filter: brightness(0.95);
  }

  /* Modal adjustments for mobile */
  .modal-content {
    width: 95vw;
    max-width: 400px;
    padding: 2rem 1rem;
    left: 50%;
    transform: translateX(-50%);
  }
  .modal-content .form-2-cols {
    display: block;
    gap: 0;
  }
  .modal-content label {
    font-size: 1.3rem;
  }
  .modal-content input[type="number"] {
    width: 100%;
    font-size: 1.4rem;
    padding: 0.8rem;
    margin-bottom: 1rem;
  }
  .modal-content button.btn--form {
    width: 100%;
    font-size: 1.4rem;
    padding: 1rem 0;
  }

  .modal-content {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 95vw;
    max-width: 400px;
    padding: 2rem 1rem;
    background: #fff;
    border-radius: 1rem;
    z-index: 1001;
    box-shadow: 0 2px 16px rgba(0, 0, 0, 0.18);
  }
  /* Responsive style for show-password-link in login form */
  .show-password-link {
    font-size: 1.4rem;
    margin-left: 0.8rem;
    padding: 0.2rem 0.6rem;
    color: #fff;
    background: none;
    border: none;
    cursor: pointer;
    text-decoration: none;
    display: inline;
    vertical-align: middle;
  }
}

/* Hide logo on mobile */
.logo {
  display: none;
}

@media (max-width: 900px) {
  .mobile-nav-header {
    display: flex;
  }
  nav.main-nav {
    display: none;
  }
  .mobile-user-greeting {
    margin-left: 1rem;
    margin-right: 1.2rem;
    font-size: 1.1rem;
  }
  .mobile-drawer {
    padding-left: 1.2rem;
  }
  .mobile-nav-list li {
    margin-bottom: 2rem;
  }
}

```

## public/css/styles.css

*Size: 19544 bytes*

```css
/*********************************/
/* Everything                    */
/*********************************/
* {
  padding: 0;
  margin: 0;
  box-sizing: border-box;
}

/*********************************/
/* Html                          */
/*********************************/
html {
  font-size: 62.5%;
  overflow-x: hidden;
}
/*********************************/
/* Body                          */
/*********************************/
body {
  font-family: "Rubik", sans-serif;
  line-height: 1;
  font-weight: 400;
  color: #555;

  /* Only works if there is nothing absolutely positioned in relation to body */
  /* overflow-x: hidden; */
}

/*********************************/
/* Containers and Grids          */
/*********************************/
.container {
  max-width: 120rem;
  padding: 0 3.2rem;
  margin: 0 auto;
}

.crudContainer-2-cols {
  display: grid;
  /* 2/3 = 66.6% + 1/3 = 33.3% */
  grid-template-columns: 2fr;
  box-shadow: 0 2.4rem 4.8rem rgba(0, 0, 0, 0.15);
  border-radius: 1rem;
  padding: 1.6rem 1.6rem 1rem 1.6rem;
  background-image: linear-gradient(to right bottom, #eb984e, #e67e22);
  overflow: hidden;
}

.crudContainer-1-cols {
  display: grid;
  grid-template-columns: 1fr;
  max-width: 50rem; /* or 40rem */
  margin: 0 auto;
  padding: 1.6rem 1.6rem 1rem 1.6rem;
  border-radius: 1rem;
  background-image: linear-gradient(to right bottom, #eb984e, #e67e22);
  box-shadow: 0 2.4rem 4.8rem rgba(0, 0, 0, 0.15);
  /* min-height: 100vh; */
  /* display: flex;
  align-items: center;
  justify-content: center; */
}

.text-box {
  padding: 1.2rem 1.6rem;
  color: #45260a;
}

.normal-text {
  font-size: 1.8rem;
  line-height: 1.8;
  margin-bottom: 4.8rem;
}

.grid {
  display: grid;
  column-gap: 6.4rem;
  row-gap: 9.6rem;

  /* margin-bottom: 9.6rem; */
}

.grid:not(:last-child) {
  margin-bottom: 9.6rem;
}

.grid--2-cols {
  grid-template-columns: repeat(2, 1fr);
}

.grid--3-cols {
  grid-template-columns: repeat(3, 1fr);
}

.grid--4-cols {
  grid-template-columns: repeat(4, 1fr);
}

.grid--5-cols {
  grid-template-columns: repeat(5, 1fr);
}

.grid--center-v {
  align-items: center;
}

/* Sections */
.section {
  /* top / right / bottom / left */
  /* padding: 9.6rem 0 12.8rem 0; */

  /* top / horizontal / left */
  padding: 0.4rem 0 2rem;
}

/* Forms */
.form-1-cols {
  display: grid;
  grid-template-columns: 1fr;
  column-gap: 3.2rem;
  row-gap: 2.4rem;
}

.form-2-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 3.2rem;
  row-gap: 2.4rem;
}

.form-1-cols label,
.form-2-cols label {
  display: block;
  font-size: 1.6rem;
  font-weight: 500;
  margin-bottom: 1.2rem;
}

.form-1-cols input,
.form-2-cols input {
  width: 40rem;
  padding: 1.2rem;
  font-size: 1.8rem;
  font-family: inherit;
  color: inherit;
  border: none;
  background-color: #fdf2e9;
  border-radius: 1rem;
  box-shadow: 0 0.1rem 0.2rem rgba(0, 0, 0, 0.1);
  margin-bottom: 2.4rem;
}

.form-1-cols input::placeholder,
.form-2-cols input::placeholde {
  color: #aaa;
}

.form-row {
  display: flex;
  align-items: center;
  gap: 1.2rem;
  margin-bottom: 1.2rem;
}

/*********************************/
/* Buttons                       */
/*********************************/

.form-buttons {
  display: flex; /* Use Flexbox to align buttons side by side */
  gap: 1.6rem; /* Space between buttons */
  flex-wrap: wrap; /* Allow buttons to wrap if necessary */
  grid-column: span 2; /* Make sure buttons span across both columns */
  justify-content: space-between; /* Distribute space between buttons */
  margin-top: 2.4rem; /* Add spacing above the buttons */
  font-size: 1.8rem;
  display: flex !important;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: space-between;
  width: 100%;
  margin-top: 0.8rem;
  margin-bottom: 0.4rem;
}

/* Ensure buttons are properly aligned */
.form-buttons a {
  text-align: center; /* Ensure buttons are centered */
}

.btn,
.btn:link,
.btn:visited {
  display: inline-block;
  text-decoration: none;
  font-weight: 600;
  font-size: 1.8rem !important;
  padding: 1.6rem 3.2rem !important;
  border-radius: 1rem;
  border: none;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.3s;
}

.btn--full:link,
.btn--full:visited {
  background-color: #e67e22;
  color: #fff;
}

.btn--full:hover,
.btn--full:active {
  background-color: #cf711f;
}

.btn--outline:link,
.btn--outline:visited {
  background-color: #fff;
  color: #555;
}

.btn--outline:hover,
.btn--outline:active {
  background-color: #fdf2e9;

  /* Trick to add border inside */
  box-shadow: inset 0 0 0 0.3rem #fff;
}

.btn--form {
  background-color: #45260a;
  color: #fdf2e9;
  align-self: end;
  padding: 1.2rem;
}

.btn--form:hover {
  background-color: #fff;
  color: #555;
}

.button-container {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  margin-top: 2rem;
}
/*********************************/
/* Links                         */
/*********************************/

.link:link,
.link:visited {
  display: inline-block;
  color: #e67e22;
  text-decoration: none;
  border-bottom: 0.1rem solid currentColor;
  padding-bottom: 0.2rem;
  transition: all 0.3s;
}

.link:hover,
.link:active {
  color: #cf711f;
  border-bottom: 0.1rem solid transparent;
}

.text-link:link,
.text-link:visited {
  font-size: 1.6rem;
  color: #fff;
  transition: all 0.3s;
}

.text-link:hover,
.text-link:active {
  color: #555;
}

.list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 1.6rem;
}

/*********************************/
/* Lists                         */
/*********************************/
.list-item {
  font-size: 1.8rem;
  display: flex;
  align-items: center;
  gap: 1.6rem;
  line-height: 1.2;
}

.list-icon {
  width: 3rem;
  height: 3rem;
  color: #e67e22;
}

.listItemText {
  font-size: 1.8rem;
  line-height: 1.8rem;
}

.section-list {
  background-color: #fdf2e9;
}

*:focus {
  outline: none;
  box-shadow: 0 0 0 0.8rem rgba(230, 125, 34, 0.5);
}

/***********************************/
/*    Alerts                       */
/***********************************/
.alert {
  position: fixed;
  top: 0;
  left: 50%;
  -webkit-transform: translateX(-50%);
  transform: translateX(-50%);
  z-index: 9999;
  color: #fff;
  font-size: 1.8rem;
  font-weight: 400;
  text-align: center;
  border-bottom-left-radius: 0.5rem;
  border-bottom-right-radius: 0.5rem;
  padding: 1.6rem 15rem;
  -webkit-box-shadow: 0 2rem 4rem rgba(0, 0, 0, 0.25);
  box-shadow: 0 2rem 4rem rgba(0, 0, 0, 0.25);
}
.alert--success {
  background-color: #20bf6b;
}
.alert--error {
  background-color: #eb4d4b;
}

/* HELPER/SETTINGS CLASSES */
.margin-right-sm {
  margin-right: 1.6rem !important;
}

.margin-bottom-md {
  margin-bottom: 4.8rem !important;
}

.center-text {
  text-align: center;
}

strong {
  font-weight: 500;
}

/***********************************/
/* Tables                          */
/***********************************/

.events-table {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  column-gap: 0rem;
  row-gap: 1rem;
}

.users-table {
  display: grid;
  grid-template-columns: 30fr 30fr 30fr 5fr 5fr;
  column-gap: 0rem;
  row-gap: 1rem;
}

.schedule-table {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  column-gap: 2rem;
  row-gap: 1rem;
}

.mySchedule-table {
  display: grid;
  grid-template-columns: 1fr 1fr 4fr 4fr 3fr 2fr;
  column-gap: 2rem;
  row-gap: 2rem;
}

.users-table .table-row,
.events-table .table-row,
.mySchedule-table .table-row,
.schedule-table .table-row {
  display: contents;
}
.users-table .table-row:nth-child(odd) *,
.events-table .table-row:nth-child(odd) *,
.mySchedule-table .table-row:nth-child(odd) *,
.schedule-table .table-row:nth-child(odd) * {
  background-color: #fae5d3;
}

.table-row {
  display: contents;
  padding: 0.5rem 0;
  border-bottom: 0.1rem solid #ddd; /* Adds a light border between rows */
  background-color: #f9f9f9; /* Light background color */
}

/* Ensures player names stack vertically */
.team-column {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
/*************************************/
/* Icons                             */
/*************************************/
.actions-icon {
  height: 2rem;
  width: 2rem;
  color: #555;
}

/***************************************/
/* Hidden Fields                        */
/***************************************/
.hiddenField {
  display: none;
}

.userId {
  display: none;
}

.eventId {
  display: none;
}

/***************************************/
/* Modals.                             */
/***************************************/
/* Modal */
.modal {
  display: none; /* Hidden by default */
  position: fixed;
  z-index: 1; /* Sit on top */
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  overflow: auto; /* Enable scroll if needed */
  background-color: rgba(0, 0, 0, 0.4); /* Semi-transparent background */
}

.modal-content {
  background-color: #fefefe;
  margin: 15% auto;
  padding: 2rem;
  border: 0.1rem solid #888;
  width: 80%; /* Adjust width to match your design */
}

/* Modal close button */
.close {
  color: #aaa;
  float: right;
  font-size: 2.8rem;
  font-weight: bold;
}

.close:hover,
.close:focus {
  color: black;
  text-decoration: none;
  cursor: pointer;
}
/**********************************/
/* Forms                          */
/**********************************/
.form-input {
  width: 100%;
  padding: 1.2rem;
  font-size: 1.8rem;
  font-family: inherit;
  color: inherit;
  border: none;
  background-color: #fdf2e9;
  border-radius: 9px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

/* Center the button and make it fill the column */
.enter-score-column {
  justify-content: center;
  align-items: center;
  display: flex;
  width: 100%;
}

/*********************************/
/* Events                        */
/*********************************/

.eventContainer {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  column-gap: 3.2rem;
  row-gap: 2.4rem;
}

.eventCard {
  display: grid;
  grid-template-columns: 1fr 1fr;
  background-color: #e67e22;
  border-radius: 11px;
  padding: 1.6rem;
}

.eventCardHeader {
  display: flex;
  flex-direction: column;
  background-color: #e67e22;
  border-radius: 11px;
  padding: 1.6rem;
}
.eventCardDetails {
  display: grid;
  grid-template-columns: 1fr 1fr;
  background-color: #e67e22;
  border-radius: 11px;
  padding: 1.6rem;
}

.event-title {
  font-size: 1.8rem;
  color: #333;
  font-weight: 600;
  grid-column: span 2;
  justify-self: center;
  padding: 1.2rem;
  text-align: center;
  width: 100%;
  display: block;
}
.event-attributes {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.event-attribute {
  font-size: 1.6rem;
  display: flex;
  align-items: center;
  gap: 1.6rem;
}

.eventCardHeader {
  display: flex;
  flex-direction: column;
}

/* Push the button row to the bottom */
.eventCardHeader .form-buttons {
  margin-top: auto;
}

.event-label {
  font-weight: bold;
}

/**************************/
/* HomePage                */
/**************************/

.homepage {
  max-width: 130rem;
  margin: 0 auto;
  padding: 0 3.2rem;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 9.6rem;
  align-items: center;
}

.homepage-description {
  font-size: 2rem;
  line-height: 1.6;
  margin-bottom: 4.8rem;
}

.homepage-img {
  width: 100%;
}

/**************************/
/* NAVIGATION */
/**************************/

nav.main-nav {
  width: 100%;
}

.main-nav-list {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  list-style: none;
  padding: 0;
  margin: 0;
}

.main-nav-link:link,
.main-nav-link:visited {
  display: inline-block;
  text-decoration: none;
  color: #333;
  font-weight: 500;
  font-size: 1.8rem;
  transition: all 0.3s;
}

.main-nav-link:hover,
.main-nav-link:active {
  color: #cf711f;
}

.main-nav-link.user-display {
  color: #cf711f;
  font-weight: 600;
  font-size: 1.6rem;
  cursor: default;
  pointer-events: none;
  background: none;
  padding: 0;
}
.center-nav {
  flex: 1 1 0%;
  display: flex;
  justify-content: center;
  min-width: 0; /* Prevent overflow */
}

.center-nav-list {
  display: flex;
  gap: 4.8rem;
  list-style: none;
  padding: 0;
  margin: 0;
}

.left-nav,
.right-nav {
  flex: 0 0 auto;
}

/* Dropdown hidden by default */
.settings-dropdown {
  display: none;
  position: absolute;
  right: 0;
  top: 100%;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border-radius: 0.8rem;
  min-width: 16rem;
  z-index: 100;
  padding: 1rem 0;
}

/* Show dropdown when .open class is added to .settings-dropdown */
.settings-dropdown.open {
  display: block;
}

.settings-dropdown li {
  list-style: none;
}

.settings-dropdown a {
  display: block;
  padding: 1rem 2rem;
  color: #333;
  text-decoration: none;
  font-size: 1.6rem;
}

.settings-dropdown a:hover {
  background: #fdf2e9;
  color: #cf711f;
}

/* MOBILE */

/* Icons inside button */
.icon-mobile-nav {
  width: 3.2rem;
  height: 3.2rem;
  color: #333;
}

.icon-close {
  display: none; /* initially hide close icon */
}

/* Show mobile nav header only on mobile */
.mobile-nav-header {
  display: none;
  align-items: center;
  padding: 0.8rem 1.2rem;
}

.mobile-user-greeting {
  display: inline-block;
  font-weight: 500;
  margin-right: 1.2rem;
  vertical-align: middle;
}

/**************************/
/* HEADERS                 */
/**************************/

.heading-primary,
.heading-secondary,
.heading-tertiary {
  font-weight: 700;
  color: #333;
  /* color: #45260a; */
  /* color: #343a40; */
  letter-spacing: -0.05rem;
}

.heading-primary {
  font-size: 5.2rem;
  line-height: 1.05;
  margin-bottom: 3.2rem;
}

.heading-secondary {
  font-size: 4.4rem;
  line-height: 1.2;
  margin-bottom: 2rem;
}

.heading-tertiary {
  font-size: 3rem;
  line-height: 1.2;
  margin-bottom: 3.2rem;
}

.subheading {
  display: block;
  font-size: 1.6rem;
  font-weight: 500;
  color: #cf711f;
  text-transform: uppercase;
  margin-bottom: 1.6rem;
  letter-spacing: 0.075rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #fdf2e9;
  height: 9.6rem;
  padding: 0 4.8rem;
  position: relative;
}
.logo img {
  display: block;
}

.header .logo {
  height: 9.6rem;
}

/**************************/
/* FOOTER */
/**************************/

.footer {
  padding: 12.8rem 0;
  border-top: 0.1rem solid #eee;
}

/* Mobile drawer hidden by default */
.mobile-drawer {
  display: block; /* keep block for positioning */
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: 250px;
  background-color: #fdf2e9;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.2);
  transform: translateX(-100%);
  transition: transform 0.3s ease;
  z-index: 1000;
  padding-top: 9.6rem; /* space for header */
  overflow-y: auto;
}

/************************************/
/*** Mobile                       
/* Show mobile drawer when active */

.mobile-drawer.open {
  transform: translateX(0);
}

.btn-mobile-nav {
  display: none; /* hide hamburger on desktop */
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 1100;
  background: none;
  border: none;
  cursor: pointer;
  width: 3.2rem;
  height: 3.2rem;
}

/* Pagination styles */
.pagination {
  display: flex;
  justify-content: center;
  margin: 2rem 0;
}

.pagination-list {
  display: flex;
  gap: 0.8rem;
  list-style: none;
  padding: 0;
  margin: 0;
}

.pagination-list li {
  display: inline-block;
}

.pagination-list a {
  display: inline-block;
  padding: 0.6rem 1.2rem;
  border-radius: 0.5rem;
  background: #fff;
  color: #e67e22;
  font-weight: 500;
  text-decoration: none;
  border: 1px solid #e67e22;
  transition:
    background 0.2s,
    color 0.2s;
}

.pagination-list li.active a,
.pagination-list a:hover {
  background: #e67e22;
  color: #fff;
  border-color: #e67e22;
  cursor: pointer;
}

.pagination-list li.disabled a {
  pointer-events: none;
  opacity: 0.5;
}

/* Filter form styles */
.filter-form {
  display: flex;
  align-items: center;
  gap: 1.6rem;
  margin-bottom: 2.4rem;
  padding: 1.2rem 2rem;
  background: #fff7ed;
  border-radius: 1rem;
  box-shadow: 0 0.1rem 0.2rem rgba(0, 0, 0, 0.05);
}

.filter-form label {
  font-size: 1.6rem;
  font-weight: 500;
  color: #cf711f;
  margin-right: 0.8rem;
}

.filter-form input[type="text"] {
  padding: 1.2rem;
  font-size: 1.6rem;
  border: none;
  border-radius: 0.8rem;
  background-color: #fdf2e9;
  color: #555;
  box-shadow: 0 0.1rem 0.2rem rgba(0, 0, 0, 0.05);
  width: 20rem;
  accent-color: #cf711f;
}

.filter-form input[type="text"]::placeholder {
  color: #aaa;
}

.filter-form button {
  padding: 1.2rem 2.4rem;
  border-radius: 0.8rem;
  border: none;
  background-color: #e67e22;
  color: #fff;
  font-size: 1.6rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.filter-form button:hover,
.filter-form button:active {
  background-color: #cf711f;
}

.filter-form input[type="radio"] {
  accent-color: #cf711f;
}

/* Row-pair for horizontal label-value display */
.row-pair {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 1.2rem;
  font-size: 1.6rem;
  margin-bottom: 0.4rem;
}

.row-pair.resting-row {
  gap: 0.4rem;
}

.resting-value {
  flex: unset;
  display: inline;
}

.resting-info {
  margin-bottom: 2rem;
  font-size: 1.8rem;
  color: #cf711f;
  font-weight: 600;
  background: #fdf2e9;
  padding: 1.2rem 2rem;
  border-radius: 1rem;
  box-shadow: 0 0.1rem 0.2rem rgba(230, 125, 34, 0.05);
}

.label {
  font-weight: 600;
  color: #cf711f;
  min-width: 7rem;
}

.value {
  color: #333;
  font-weight: 400;
  flex: 1;
  word-break: break-word;
}

/* Score button modifier */
.score-button {
  width: 100%;
  padding: 0.8rem;
  border-radius: 0.8rem;
  font-size: 1.6rem;
  line-height: 1.2;
  box-shadow: 0 2px 8px rgba(207, 113, 31, 0.08);
  border: none;
  cursor: pointer;
  background-color: #cf711f !important;
  color: #fff !important;
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
  white-space: nowrap;
  min-width: 0;
  max-width: 100%;
}

.score-button:hover,
.score-button:active {
  filter: brightness(0.95);
}

.show-password-link {
  background: none;
  border: none;
  color: #fff;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  margin-left: 1.2rem;
  text-decoration: none;
  font-family: inherit;
  transition: color 0.2s;
}

.show-password-link:hover,
.show-password-link:focus {
  color: #cf711f;
  text-decoration: none;
}

.active-label {
  min-width: 18rem;
}

.active-checkbox {
  width: 1em;
  min-width: 1em;
  max-width: 1em;
  height: 1em;
  min-height: 1em;
  max-height: 1em;
  margin: 0 0.5em;
  vertical-align: top;
  accent-color: white;
}
/*********************************************/
/* Tabs                                      */
/*********************************************/

.tabs {
  display: flex;
  list-style: none;
  padding: 0;
  margin-bottom: 2rem;
  border-bottom: 2px solid #cf711f;
}

.tab {
  background: #cf711f;
  color: #fff;
  border: 1px solid #cf711f;
  border-bottom: none;
  cursor: pointer;
}

.tab.active {
  background: #e67e22;
  color: #fff;
  border: 1px solid #e67e22;
  border-bottom: none;
  font-weight: 700;
}

.tab,
.tab.active {
  font-size: 2.2rem;
  padding: 2rem 3.2rem;
  border-radius: 1.2rem 1.2rem 0 0;
  transition: background 0.2s;
}

.tab-content {
  display: none !important;
}
.tab-content.active {
  display: block !important;
}

```

## public/css/typoGraphySystem.css

*Size: 723 bytes*

```css
/*
--- 01 TYPOGRAPHY SYSTEM

- Font sizes (px)
10 / 12 / 14 / 16 / 18 / 20 / 24 / 30 / 36 / 44 / 52 / 62 / 74 / 86 / 98

- Font weights
Default: 400
Medium: 500
Semi-bold: 600
Bold: 700

- Line heights
Default: 1
Small: 1.05
Medium: 1.2
Paragraph default: 1.6
Large: 1.8

- Letter spacing
-0.5px
0.75px

--- 02 COLORS

- Primary: #e67e22
- Tints:
#fdf2e9
#fae5d3
#eb984e

- Shades: 
#cf711f
#45260a

- Accents:
- Greys

#888
#767676 (lightest grey allowed on #fff)
#6f6f6f (lightest grey allowed on #fdf2e9)
#555
#333

--- 05 SHADOWS

0 2.4rem 4.8rem rgba(0, 0, 0, 0.075);

--- 06 BORDER-RADIUS

Default: 9px
Medium: 11px

--- 07 WHITESPACE

- Spacing system (px)
2 / 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 80 / 96 / 128
*/

```

## public/favicon.ico

*Size: 0 bytes*

```ico

```

## public/js/alerts.js

*Size: 401 bytes*

```js
// type is 'success' or 'error'

export const hideAlert = () => {
  const el = document.querySelector('.alert');
  if (el) el.parentElement.removeChild(el);
};

export const showAlert = (type, msg) => {
  hideAlert();
  const markup = `<div class="alert alert--${type}">${msg}</div>`;
  document.querySelector('body').insertAdjacentHTML('afterbegin', markup);
  window.setTimeout(hideAlert, 5000);
};

```

## public/js/api.js

*Size: 100 bytes*

```js
// api.js
import axios from "axios";

axios.defaults.withCredentials = true;

export default axios;

```

## public/js/apiActions.js

*Size: 6141 bytes*

```js
/* eslint-disable */
import "core-js/stable";
import "regenerator-runtime/runtime";
import axios from "./api";
import { showAlert } from "./alerts";

// --- Helper Functions ---
async function apiRequest({
  method,
  url,
  data,
  onSuccess,
  successMessage,
  redirect,
  reload,
}) {
  try {
    const res = await axios({ method, url, data });
    if (res.data?.status === "success" || res.status === 204) {
      if (successMessage) showAlert("success", successMessage);
      if (onSuccess) onSuccess(res);

      // Only one of redirect or reload will happen
      if (redirect === "userLoggingIn") {
        let landingPage;
        if (res.data.user.role === "clubAdmin") {
          landingPage = "/events/showAll";
        } else {
          landingPage = "/events/myBrowse";
        }
        window.setTimeout(() => location.assign(landingPage), 1500);
      } else if (redirect) {
        window.setTimeout(() => location.assign(redirect), 1500);
      } else if (reload) {
        window.setTimeout(() => location.reload(), 1500);
      }
    }
    return res;
  } catch (err) {
    handleError(err);
    throw err;
  }
}

function handleError(err) {
  if (err.response && err.response.data && err.response.data.message) {
    showAlert("error", err.response.data.message);
  } else {
    showAlert("error", err.message || "An unexpected error occurred");
  }
}

// --- User Actions ---
export const createUserApiAction = async (
  name,
  email,
  mobile,
  password,
  passwordConfirm,
  active
) =>
  apiRequest({
    method: "POST",
    url: "/api/v1/users",
    data: { name, email, mobile, password, passwordConfirm, active },
    successMessage: "User successfully created",
    redirect: "/users/showall",
  });

export const editUserApiAction = async (userId, name, email, mobile, active) =>
  apiRequest({
    method: "PATCH",
    url: `/api/v1/users/${userId}`,
    data: { name, email, mobile, active },
    successMessage: "User successfully updated",
    redirect: "/users/showall",
  });

export const deleteUserApiAction = async (userId) =>
  apiRequest({
    method: "DELETE",
    url: `/api/v1/users/${userId}`,
    successMessage: "User successfully deleted",
    redirect: "/users/showall",
  });

// --- Event Actions ---
export const createEventApiAction = async (data) =>
  apiRequest({
    method: "POST",
    url: "/api/v1/events",
    data,
    successMessage: "Event successfully created",
    redirect: "/events/showAll",
  });

export const updateEventApiAction = async (data) =>
  apiRequest({
    method: "PATCH",
    url: `/api/v1/events/${data.eventId}`,
    data,
    successMessage: "Event successfully updated",
    redirect: "/events/showAll",
  });

export const deleteEventApiAction = async (eventId) =>
  apiRequest({
    method: "DELETE",
    url: `/api/v1/events/${eventId}`,
    successMessage: "Event successfully deleted",
    redirect: "/events/showAll",
  });

export const eventCreateBookingApiAction = async (eventId) =>
  apiRequest({
    method: "PATCH",
    url: `/api/v1/events/booking/create`,
    successMessage: "Booking successful",
    data: { eventId },
    reload: true,
  });

export const eventCancelBookingApiAction = async (eventId) =>
  apiRequest({
    method: "PATCH",
    url: `/api/v1/events/booking/cancel`,
    successMessage: "Booking cancelled",
    data: { eventId },
    reload: true,
  });

export const eventUpdateMatchScoreApiAction = async (
  roundIndex,
  matchIndex,
  teamAScore,
  teamBScore,
  eventId
) =>
  apiRequest({
    method: "PATCH",
    url: `/api/v1/events/updateMatchscore`,
    data: { roundIndex, matchIndex, teamAScore, teamBScore, eventId },
    successMessage: "Score updated",
    reload: true,
  });

export const markNoShowApiAction = async (eventId, userId) =>
  apiRequest({
    method: "POST",
    url: "/api/v1/events/noShow",
    data: { eventId, userId },
    successMessage: "No show processed and schedule recalculated",
    reload: true,
  });

// --- Auth Actions ---
export const loginApiAction = async (email, password) =>
  apiRequest({
    method: "POST",
    url: "/api/v1/users/login",
    data: { email, password },
    successMessage: "Logged in successfully!",
    redirect: "userLoggingIn",
  });

export const logOutApiAction = async () => {
  try {
    await axios({ method: "GET", url: "/api/v1/users/logout" });
    window.location.assign("/");
  } catch (err) {
    showAlert("error", "Error logging out! Try again.");
  }
};

export const signUpApiAction = async (
  name,
  email,
  mobile,
  password,
  passwordConfirm
) =>
  apiRequest({
    method: "POST",
    url: "/api/v1/users/signup",
    data: { name, email, mobile, password, passwordConfirm },
    successMessage: "Signed up successfully!",
    redirect: "/events/browseNew",
  });

export const updateAcApiAction = async (data, type) =>
  apiRequest({
    method: "PATCH",
    url:
      type === "password"
        ? "/api/v1/users/updateMyPassword"
        : "/api/v1/users/updateAcDetails",
    data,
    successMessage: "Update successful!",
    redirect: "/events/browseNew",
  });

// --- Password Actions ---
export const forgotPasswordApiAction = async ({ email }) =>
  apiRequest({
    method: "POST",
    url: "/api/v1/users/forgotPassword",
    data: { email },
    successMessage: "Reset link sent to email!",
  });

export const resetPasswordApiAction = async ({
  password,
  passwordConfirm,
  resetToken,
}) =>
  apiRequest({
    method: "PATCH",
    url: `/api/v1/users/resetPassword/${resetToken}`,
    data: { password, passwordConfirm },
    successMessage: "Password reset successful!",
    redirect: "/me/login",
  });

// --- Settings Actions ---
export const getSystemSettingsApiAction = async () =>
  apiRequest({
    method: "GET",
    url: "/api/v1/settings/get",
    onSuccess: () => {
      console.log("success system settings successfully retrieved");
    },
  });

export const manageSystemSettingsApiAction = async (data) =>
  apiRequest({
    method: "PATCH",
    url: "/api/v1/settings/update",
    data,
    successMessage: "Settings successfully saved",
    redirect: "/events/showAll",
  });

```

## public/js/buttonDelegates.js

*Size: 5842 bytes*

```js
export function initButtonDelegates(deps) {
  const {
    logOutApiAction,
    deleteUserApiAction,
    eventCreateBookingApiAction,
    eventCancelBookingApiAction,
    deleteEventApiAction,
  } = deps;

  // Graceful Degradation: Check for missing dependencies
  function safeApiCall(fn, ...args) {
    if (typeof fn !== "function") {
      alert("This action is currently unavailable.");
      return Promise.reject(new Error("Missing dependency"));
    }
    return fn(...args);
  }

  // Network Reliability: Retry wrapper for transient errors
  async function retryAsync(fn, args = [], retries = 2, delay = 500) {
    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn(...args);
      } catch (err) {
        lastErr = err;
        // Only retry for network errors (can be customized)
        if (
          err instanceof TypeError ||
          (err.message && err.message.includes("Network"))
        ) {
          await new Promise((res) => setTimeout(res, delay));
        } else {
          break;
        }
      }
    }
    throw lastErr;
  }

  function delegate(parent, selector, eventType, handler) {
    parent.addEventListener(eventType, (event) => {
      const target = event.target.closest(selector);
      if (target && parent.contains(target)) {
        handler(event, target);
      }
    });
  }

  delegate(document.body, "a.logOutButton", "click", async (e, target) => {
    e.preventDefault();
    target.disabled = true;
    try {
      await retryAsync(() => safeApiCall(logOutApiAction), [], 2, 500);
    } catch (err) {
      alert("Logout failed. Please try again.");
      console.error("Logout failed:", err);
    } finally {
      target.disabled = false;
    }
  });

  delegate(document.body, "a.editUserButtons", "click", (e, target) => {
    e.preventDefault();
    const userIdElem = target.parentElement.querySelector(".userId");
    if (!userIdElem) return;
    const userId = userIdElem.textContent;
    location.assign(`/users/get/${userId}`);
  });

  delegate(document.body, "a.deleteUserButtons", "click", async (e, target) => {
    e.preventDefault();
    target.disabled = true;
    const userIdElem = target.parentElement.querySelector(".userId");
    if (!userIdElem) {
      target.disabled = false;
      return;
    }
    try {
      await retryAsync(
        () => safeApiCall(deleteUserApiAction, userIdElem.textContent),
        [],
        2,
        500
      );
    } catch (err) {
      alert("Delete user failed. Please try again.");
      console.error("Delete user failed:", err);
    } finally {
      target.disabled = false;
    }
  });

  delegate(document.body, "a.editEventButtons", "click", (e, target) => {
    e.preventDefault();
    const eventIdElem = target.parentElement.querySelector(".eventId");
    if (!eventIdElem) return;
    location.assign(`/events/get/${eventIdElem.textContent}`);
  });

  delegate(
    document.body,
    "a.deleteEventButtons",
    "click",
    async (e, target) => {
      e.preventDefault();
      target.disabled = true;
      const eventIdElem = target.parentElement.querySelector(".eventId");
      if (!eventIdElem) {
        target.disabled = false;
        return;
      }
      try {
        await retryAsync(
          () => safeApiCall(deleteEventApiAction, eventIdElem.textContent),
          [],
          2,
          500
        );
      } catch (err) {
        alert("Delete event failed. Please try again.");
        console.error("Delete event failed:", err);
      } finally {
        target.disabled = false;
      }
    }
  );

  delegate(document.body, "a.bookEventButtons", "click", async (e, target) => {
    e.preventDefault();
    target.disabled = true;
    const eventIdElem = target.parentElement.querySelector(".eventId");
    if (!eventIdElem) {
      target.disabled = false;
      return;
    }
    try {
      await retryAsync(
        () => safeApiCall(eventCreateBookingApiAction, eventIdElem.textContent),
        [],
        2,
        500
      );
    } catch (err) {
      alert("Booking failed. Please try again.");
      console.error("Create booking failed:", err);
    } finally {
      target.disabled = false;
    }
  });

  delegate(
    document.body,
    "a.cancelEventButtons",
    "click",
    async (e, target) => {
      e.preventDefault();
      target.disabled = true;
      const eventIdElem = target.parentElement.querySelector(".eventId");
      if (!eventIdElem) {
        target.disabled = false;
        return;
      }
      try {
        await retryAsync(
          () =>
            safeApiCall(eventCancelBookingApiAction, eventIdElem.textContent),
          [],
          2,
          500
        );
      } catch (err) {
        alert("Cancel booking failed. Please try again.");
        console.error("Cancel booking failed:", err);
      } finally {
        target.disabled = false;
      }
    }
  );

  delegate(document.body, "a.viewMyScheduleButtons", "click", (e, target) => {
    e.preventDefault();
    const eventIdElem = target.parentElement.querySelector(".eventId");
    if (!eventIdElem) return;
    location.assign(`/events/viewMySchedule/${eventIdElem.textContent}`);
  });
}

// Cog/settings dropdown logic (NO delegate needed)
const settingsToggle = document.querySelector(".settings-toggle");
const settingsDropdown = document.querySelector(".settings-dropdown");
if (settingsToggle && settingsDropdown) {
  settingsToggle.addEventListener("click", function (e) {
    e.preventDefault();
    console.log("Cog clicked");
    settingsDropdown.classList.toggle("open");
  });
  document.addEventListener("click", function (e) {
    if (
      !settingsDropdown.contains(e.target) &&
      !settingsToggle.contains(e.target)
    ) {
      settingsDropdown.classList.remove("open");
    }
  });
}

```

## public/js/formListeners.js

*Size: 9700 bytes*

```js
export function initFormListeners(deps) {
  // Graceful Degradation: Check for missing dependencies
  function depCheck(fn, name) {
    if (typeof fn !== "function") {
      return async () => {
        showError(`Required API action "${name}" is not available.`);
        throw new Error(`Missing dependency: ${name}`);
      };
    }
    return fn;
  }

  // User-friendly error display
  function showError(message) {
    alert(message); // Replace with custom UI if desired
  }

  // Network Reliability: Retry wrapper for transient errors
  async function retryAsync(fn, args = [], retries = 2, delay = 500) {
    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn(...args);
      } catch (err) {
        lastErr = err;
        // Only retry for network errors (can be customized)
        if (
          err instanceof TypeError ||
          (err.message && err.message.includes("Network"))
        ) {
          await new Promise((res) => setTimeout(res, delay));
        } else {
          break;
        }
      }
    }
    throw lastErr;
  }

  // Dependency checks
  const loginApiAction = depCheck(deps.loginApiAction, "loginApiAction");
  const getSystemSettingsApiAction = depCheck(
    deps.getSystemSettingsApiAction,
    "getSystemSettingsApiAction"
  );
  const manageSystemSettingsApiAction = depCheck(
    deps.manageSystemSettingsApiAction,
    "manageSystemSettingsApiAction"
  );
  const signUpApiAction = depCheck(deps.signUpApiAction, "signUpApiAction");
  const updateAcApiAction = depCheck(
    deps.updateAcApiAction,
    "updateAcApiAction"
  );
  const forgotPasswordApiAction = depCheck(
    deps.forgotPasswordApiAction,
    "forgotPasswordApiAction"
  );
  const resetPasswordApiAction = depCheck(
    deps.resetPasswordApiAction,
    "resetPasswordApiAction"
  );
  const createUserApiAction = depCheck(
    deps.createUserApiAction,
    "createUserApiAction"
  );
  const editUserApiAction = depCheck(
    deps.editUserApiAction,
    "editUserApiAction"
  );
  const createEventApiAction = depCheck(
    deps.createEventApiAction,
    "createEventApiAction"
  );
  const updateEventApiAction = depCheck(
    deps.updateEventApiAction,
    "updateEventApiAction"
  );
  const markNoShowApiAction = depCheck(
    deps.markNoShowApiAction,
    "markNoShowApiAction"
  );

  function handleFormSubmit(form, asyncFn, getArgs = () => [], successCb) {
    if (!form) return;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      const submitBtn = form.querySelector("button[type='submit']");
      if (submitBtn) submitBtn.disabled = true;
      try {
        await retryAsync(asyncFn, getArgs(), 2, 500);
        if (typeof successCb === "function") successCb();
      } catch (err) {
        console.error("Form submission failed:", err);
        showError("An error occurred. Please try again.");
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  handleFormSubmit(
    document.getElementById("loginForm"),
    async (...args) => {
      await loginApiAction(...args);
      await getSystemSettingsApiAction();
    },
    () => [
      document.getElementById("email").value,
      document.getElementById("password").value,
    ]
  );

  handleFormSubmit(
    document.getElementById("saveSystemSettingsForm"),
    manageSystemSettingsApiAction,
    () => [
      {
        systemDefaults: {
          numOfStandOuts: document.getElementById("numOfStandOuts").value,
          numOfRounds: document.getElementById("numOfRounds").value,
          numOfCourts: document.getElementById("numOfCourts").value,
          numOfPairingsPerCourt: document.getElementById(
            "numOfPairingsPerCourt"
          ).value,
          waitListSize: document.getElementById("waitListSize").value,
        },
      },
    ]
  );

  handleFormSubmit(
    document.getElementById("signUpForm"),
    signUpApiAction,
    () => [
      document.getElementById("name").value,
      document.getElementById("email").value,
      document.getElementById("mobile").value,
      document.getElementById("password").value,
      document.getElementById("passwordConfirm").value,
    ]
  );

  handleFormSubmit(
    document.getElementById("acDetailsForm"),
    async (data) => {
      await updateAcApiAction(data, "account");
      location.assign("/events/browseNew");
    },
    () => [
      {
        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        mobile: document.getElementById("mobile").value,
        userId: document.getElementById("userId").value,
      },
    ]
  );

  handleFormSubmit(
    document.getElementById("updatePasswordForm"),
    async (data) => {
      await updateAcApiAction(data, "password");
      location.assign("/events/browseNew");
    },
    () => [
      {
        currentPassword: document.getElementById("currentPassword").value,
        newPassword: document.getElementById("newPassword").value,
        newPasswordConfirm: document.getElementById("newPasswordConfirm").value,
        userId: document.getElementById("userId").textContent,
      },
    ]
  );

  handleFormSubmit(
    document.getElementById("forgotPasswordForm"),
    forgotPasswordApiAction,
    () => [{ email: document.getElementById("email").value }]
  );

  handleFormSubmit(
    document.getElementById("resetPasswordForm"),
    resetPasswordApiAction,
    () => [
      {
        password: document.getElementById("newPassword").value,
        passwordConfirm: document.getElementById("newPasswordConfirm").value,
        resetToken: document.getElementById("resetToken").textContent,
      },
    ]
  );

  handleFormSubmit(
    document.getElementById("createUserForm"),
    createUserApiAction,
    () => [
      document.getElementById("name").value,
      document.getElementById("email").value,
      document.getElementById("mobile").value,
      document.getElementById("password").value,
      document.getElementById("passwordConfirm").value,
      document.getElementById("active").checked,
    ]
  );

  handleFormSubmit(
    document.getElementById("editUserForm"),
    editUserApiAction,
    () => [
      document.getElementById("userId").value,
      document.getElementById("name").value,
      document.getElementById("email").value,
      document.getElementById("mobile").value,
      document.getElementById("active").checked,
    ]
  );

  handleFormSubmit(
    document.getElementById("createEventForm"),
    createEventApiAction,
    () => [
      {
        eventName: document.getElementById("eventName").value,
        eventLocation: document.getElementById("eventLocation").value,
        eventType: document.getElementById("eventType").value,
        eventDate: document.getElementById("eventDate").value,
        eventStartTime: document.getElementById("eventStartTime").value,
        eventOrganiser: document.getElementById("eventOrganiser").value,
        eventNumOfCourts: document.getElementById("eventNumOfCourts").value,
        numOfStandOutsPerRound: document.getElementById(
          "numOfStandOutsPerRound"
        ).value,
        eventNumOfRounds: document.getElementById("eventNumOfRounds").value,
        eventWaitListSize: document.getElementById("eventWaitListSize").value,
        eventNumOfPairings: document.getElementById("eventNumOfPairings").value,
        active: document.getElementById("active").checked,
      },
    ]
  );

  handleFormSubmit(
    document.getElementById("saveEventForm"),
    updateEventApiAction,
    () => [
      {
        eventId: document.getElementById("eventId").value,
        eventName: document.getElementById("eventName").value,
        eventLocation: document.getElementById("eventLocation").value,
        eventType: document.getElementById("eventType").value,
        eventDate: document.getElementById("eventDate").value,
        eventStartTime: document.getElementById("eventStartTime").value,
        eventOrganiser: document.getElementById("eventOrganiser").value,
        eventNumOfCourts: document.getElementById("eventNumOfCourts").value,
        numOfStandOutsPerRound: document.getElementById(
          "numOfStandOutsPerRound"
        ).value,
        eventNumOfRounds: document.getElementById("eventNumOfRounds").value,
        eventWaitListSize: document.getElementById("eventWaitListSize").value,
        eventNumOfPairings: document.getElementById("eventNumOfPairings").value,
        active: document.getElementById("active").checked,
      },
    ]
  );

  // No Show Form
  handleFormSubmit(
    document.getElementById("noShowForm"),
    async (eventId, userId) => {
      await markNoShowApiAction(eventId, userId);
    },
    () => [
      document.getElementById("eventId").value,
      document.getElementById("userId").value,
    ]
  );

  handleFormSubmit(
    document.getElementById("saveFeaturesForm"),
    manageSystemSettingsApiAction,
    () => [
      {
        features: {
          teamCanEditScore: document.getElementById("teamCanEditScore").checked,
        },
      },
    ]
  );

  document.addEventListener("DOMContentLoaded", function () {
    const toggle = document.getElementById("togglePassword");
    const pwd = document.getElementById("password");
    if (toggle && pwd) {
      toggle.addEventListener("click", function () {
        if (pwd.type === "password") {
          pwd.type = "text";
          toggle.textContent = "Hide";
        } else {
          pwd.type = "password";
          toggle.textContent = "Show";
        }
      });
    }
  });
}

```

## public/js/index.js

*Size: 3596 bytes*

```js
import { initFormListeners } from "./formListeners";
import { initButtonDelegates } from "./buttonDelegates";
import { initScoreModal } from "./modal";
import { initMobileNavToggle } from "./navToggle";
import { initTabs } from "./tabs";
import { initScheduleCalculator } from "./scheduleCalculator.js";
import {
  createUserApiAction,
  editUserApiAction,
  deleteUserApiAction,
  createEventApiAction,
  updateEventApiAction,
  deleteEventApiAction,
  eventUpdateMatchScoreApiAction,
  loginApiAction,
  logOutApiAction,
  signUpApiAction,
  updateAcApiAction,
  forgotPasswordApiAction,
  resetPasswordApiAction,
  getSystemSettingsApiAction,
  manageSystemSettingsApiAction,
  markNoShowApiAction,
  eventCreateBookingApiAction,
  eventCancelBookingApiAction,
} from "./apiActions";

// Dependency check helper
function validateDeps(deps, requiredKeys, context) {
  let missing = [];
  requiredKeys.forEach((key) => {
    if (typeof deps[key] !== "function") {
      missing.push(key);
    }
  });
  if (missing.length) {
    console.warn(`Missing dependencies for ${context}: ${missing.join(", ")}`);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  try {
    // Forms
    const formDeps = {
      createUserApiAction,
      editUserApiAction,
      deleteUserApiAction,
      createEventApiAction,
      updateEventApiAction,
      deleteEventApiAction,
      eventUpdateMatchScoreApiAction,
      loginApiAction,
      logOutApiAction,
      signUpApiAction,
      updateAcApiAction,
      forgotPasswordApiAction,
      resetPasswordApiAction,
      getSystemSettingsApiAction,
      manageSystemSettingsApiAction,
      markNoShowApiAction,
      eventCreateBookingApiAction,
      eventCancelBookingApiAction,
    };
    validateDeps(
      formDeps,
      [
        "createUserApiAction",
        "editUserApiAction",
        "deleteUserApiAction",
        "createEventApiAction",
        "updateEventApiAction",
        "deleteEventApiAction",
        "eventUpdateMatchScoreApiAction",
        "loginApiAction",
        "logOutApiAction",
        "signUpApiAction",
        "updateAcApiAction",
        "forgotPasswordApiAction",
        "resetPasswordApiAction",
        "getSystemSettingsApiAction",
        "manageSystemSettingsApiAction",
        "markNoShowApiAction",
        "eventCreateBookingApiAction",
        "eventCancelBookingApiAction",
      ],
      "initFormListeners"
    );
    initFormListeners(formDeps);

    // Score modal
    if (typeof eventUpdateMatchScoreApiAction !== "function") {
      console.warn(
        "Missing dependency for initScoreModal: eventUpdateMatchScoreApiAction"
      );
    }
    initScoreModal(eventUpdateMatchScoreApiAction);

    // Mobile nav toggle
    initMobileNavToggle();

    // Tabs
    initTabs();

    // Button and link event delegation
    const buttonDeps = {
      logOutApiAction,
      deleteUserApiAction,
      eventCreateBookingApiAction,
      eventCancelBookingApiAction,
      deleteEventApiAction,
      markNoShowApiAction,
    };
    validateDeps(
      buttonDeps,
      [
        "logOutApiAction",
        "deleteUserApiAction",
        "eventCreateBookingApiAction",
        "eventCancelBookingApiAction",
        "deleteEventApiAction",
        "markNoShowApiAction",
      ],
      "initButtonDelegates"
    );
    initButtonDelegates(buttonDeps);
    initScheduleCalculator();

    console.log("App initialized successfully.");
  } catch (err) {
    console.error("Error during app initialization:", err);
    // Optionally, show a user-friendly error message to the user here
  }
});

```

## public/js/modal.js

*Size: 2298 bytes*

```js
export function initScoreModal(eventUpdateMatchScorePubJs) {
  const modal = document.getElementById("scoreModal");
  const scoreForm = document.getElementById("scoreForm");
  const closeButton = modal ? modal.querySelector(".close") : null;
  const scoreButtons = document.querySelectorAll(".score-button");

  // Helper to show user-friendly error
  function showError(message) {
    alert(message); // Replace with custom UI if desired
  }

  if (scoreButtons && modal) {
    scoreButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        modal.style.display = "block";
        const round = btn.dataset.round;
        const matchIndex = btn.dataset.matchindex;
        const eventId = btn.dataset.eventid;
        const teamAScore = btn.dataset.teamaScore;
        const teamBScore = btn.dataset.teambScore;

        document.getElementById("roundIndex").value = Number(round);
        document.getElementById("matchIndex").value = Number(matchIndex);
        document.getElementById("eventId").value = eventId;
        document.getElementById("teamAScore").value =
          teamAScore && teamAScore !== "undefined" ? teamAScore : "";
        document.getElementById("teamBScore").value =
          teamBScore && teamBScore !== "undefined" ? teamBScore : "";
      });
    });
  }

  if (closeButton && modal) {
    closeButton.addEventListener("click", () => {
      modal.style.display = "none";
    });
  }

  if (scoreForm) {
    scoreForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const submitBtn = scoreForm.querySelector("button[type='submit']");
      if (submitBtn) submitBtn.disabled = true;
      try {
        await eventUpdateMatchScorePubJs(
          document.getElementById("roundIndex").value,
          document.getElementById("matchIndex").value,
          document.getElementById("teamAScore").value,
          document.getElementById("teamBScore").value,
          document.getElementById("eventId").value
        );
        modal.style.display = "none";
      } catch (err) {
        console.error("Update match score failed:", err);
        showError("Failed to update score. Please try again.");
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }
}

```

## public/js/navToggle.js

*Size: 1070 bytes*

```js
export function initMobileNavToggle() {
  const mobileNavToggle = document.getElementById("mobileNavToggle");
  const mobileDrawer = document.querySelector(".mobile-drawer");
  const iconMenu = document.querySelector(".icon-menu");
  const iconClose = document.querySelector(".icon-close");

  // Error handling for missing DOM elements
  if (!mobileNavToggle) {
    console.warn("Mobile nav toggle button not found.");
    return;
  }
  if (!mobileDrawer) {
    console.warn("Mobile drawer element not found.");
    return;
  }
  if (!iconMenu) {
    console.warn("Menu icon not found.");
  }
  if (!iconClose) {
    console.warn("Close icon not found.");
  }

  mobileNavToggle.addEventListener("click", () => {
    mobileDrawer.classList.toggle("open");
    // Toggle icons
    if (iconMenu && iconClose) {
      if (mobileDrawer.classList.contains("open")) {
        iconMenu.style.display = "none";
        iconClose.style.display = "inline";
      } else {
        iconMenu.style.display = "inline";
        iconClose.style.display = "none";
      }
    }
  });
}

```

## public/js/scheduleCalculator.js

*Size: 4969 bytes*

```js
let roundsEditable = false;

// Calculation helpers
export function maxUniquePartnerRounds(numPlayers) {
  return numPlayers - 1;
}

export function minRounds(numPlayers, numCourts, numPairings, restsPerPlayer) {
  const playingPerRound = numCourts * numPairings * 2;
  const restingPerRound = numPlayers - playingPerRound;
  if (restingPerRound <= 0) return null;
  const totalRests = numPlayers * restsPerPlayer;
  if (totalRests % restingPerRound !== 0) return null;
  return totalRests / restingPerRound;
}

export function findTotalPlayers(numCourts, numPairings, restsPerPlayer) {
  for (
    let numPlayers = numCourts * numPairings * 2 + 2;
    numPlayers < 100;
    numPlayers++
  ) {
    const playingPerRound = numCourts * numPairings * 2;
    const restingPerRound = numPlayers - playingPerRound;
    if (restingPerRound <= 0) continue;
    const totalRests = numPlayers * restsPerPlayer;
    if (totalRests % restingPerRound !== 0) continue;
    const minRoundsVal = totalRests / restingPerRound;
    const maxRoundsVal = maxUniquePartnerRounds(numPlayers);
    if (minRoundsVal <= maxRoundsVal) {
      return numPlayers;
    }
  }
  return null;
}

export function restPlayUniformity(
  numPlayers,
  numRounds,
  numCourts,
  numPairings
) {
  const playingPerRound = numCourts * numPairings * 2;
  const restingPerRound = numPlayers - playingPerRound;
  if (restingPerRound < 0)
    return {
      restsPerPlayer: 0,
      playsPerPlayer: 0,
    };
  const totalRests = numRounds * restingPerRound;
  const restsPerPlayer = totalRests / numPlayers;
  const playsPerPlayer = numRounds - restsPerPlayer;
  return {
    restsPerPlayer,
    playsPerPlayer,
  };
}

// Main initialization function
export function initScheduleCalculator() {
  const scheduleForm = document.getElementById("scheduleForm");
  if (!scheduleForm) return;

  scheduleForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const numCourts = parseInt(document.getElementById("numCourts").value, 10);
    const numPairings = parseInt(
      document.getElementById("numPairings").value,
      10
    );
    const restsPerPlayer = parseInt(
      document.getElementById("restsPerPlayer").value,
      10
    );
    const roundsInputContainer = document.getElementById(
      "roundsInputContainer"
    );
    const numRoundsInput = document.getElementById("numRounds");
    const resultDiv = document.getElementById("result");

    // Find total players needed for perfect schedule
    const totalPlayersNeeded = findTotalPlayers(
      numCourts,
      numPairings,
      restsPerPlayer
    );

    // Calculate min/max rounds for unique partners
    let minRoundsVal = null;
    let maxRoundsVal = null;
    if (totalPlayersNeeded) {
      minRoundsVal = minRounds(
        totalPlayersNeeded,
        numCourts,
        numPairings,
        restsPerPlayer
      );
      maxRoundsVal = maxUniquePartnerRounds(totalPlayersNeeded);
    }

    let numRounds = minRoundsVal;
    let warningMsg = "";

    // If user has already edited rounds, use their value
    if (roundsEditable && numRoundsInput.value) {
      numRounds = parseInt(numRoundsInput.value, 10);
      if (numRounds > maxRoundsVal) {
        warningMsg = `<span class="error">Warning: With ${numRounds} rounds, some players will have to repeat partners. Maximum rounds for unique partners is ${maxRoundsVal}.</span><br>`;
      }
      if (minRoundsVal && numRounds < minRoundsVal) {
        warningMsg += `<span class="error">Warning: With ${numRounds} rounds, not all players will have equal rest time. Minimum rounds for equal rest is ${minRoundsVal}.</span><br>`;
      }
      if (totalPlayersNeeded - numCourts * numPairings * 2 < 0) {
        warningMsg += `<span class="error">Error: Too many players assigned to play per round. Increase number of players or reduce courts/pairings.</span><br>`;
      }
    }

    // Calculate rest/play values for current rounds
    const dist = restPlayUniformity(
      totalPlayersNeeded || 0,
      numRounds,
      numCourts,
      numPairings
    );

    resultDiv.innerHTML = `
      ${warningMsg}
      <strong>Schedule Summary:</strong><br>
      <ul>
        <li><strong>Number of rounds:</strong> ${numRounds !== null ? numRounds : "N/A"}</li>
        <li><strong>Total players needed:</strong> ${totalPlayersNeeded !== null ? totalPlayersNeeded : "N/A"}</li>
        <li><strong>Rests per player:</strong> ${dist.restsPerPlayer.toFixed(2)}</li>
        <li><strong>Playing rounds per player:</strong> ${dist.playsPerPlayer.toFixed(2)}</li>
      </ul>
      <em>Adjust the values above and click "Calculate" to see the implications for your event configuration.</em>
    `;

    // After first calculation, show and enable rounds input for editing
    if (!roundsEditable && minRoundsVal !== null) {
      roundsEditable = true;
      roundsInputContainer.classList.remove("hidden");
      numRoundsInput.value = minRoundsVal;
    }
  });
}

```

## public/js/tabs.js

*Size: 864 bytes*

```js
export function initTabs() {
  const tabs = document.querySelectorAll(".tab");
  const tabContents = document.querySelectorAll(".tab-content");

  if (!tabs.length) {
    console.warn("No tab elements found.");
    return;
  }
  if (!tabContents.length) {
    console.warn("No tab-content elements found.");
    return;
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", function () {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      tabContents.forEach((tc) => tc.classList.remove("active"));
      const targetId = tab.getAttribute("data-tab");
      const targetContent = document.getElementById(targetId);
      if (!targetContent) {
        console.warn(`Tab content element with id "${targetId}" not found.`);
        return;
      }
      targetContent.classList.add("active");
    });
  });
}

```

## routes/eventRoutes.js

*Size: 2289 bytes*

```js
const express = require("express");
const { body } = require("express-validator");
const eventController = require("../controllers/eventController");
const authController = require("../controllers/authController");

const router = express.Router();

// Input validation for critical event fields
const validateEventFields = [
  body("eventName").notEmpty().withMessage("Event name is required"),
  body("eventDate").notEmpty().withMessage("Event date is required"),
];

const validateBookingFields = [
  body("eventId").notEmpty().withMessage("Event ID is required"),
];

const validateCancelBookingFields = [
  body("eventId").notEmpty().withMessage("Event ID is required"),
];

const validateNoShowFields = [
  body("eventId").notEmpty().withMessage("Event ID is required"),
  body("userId").notEmpty().withMessage("User ID is required"),
];

// User functions
router
  .route("/updateMatchScore")
  .patch(
    eventController.eventTimeout,
    authController.protect,
    eventController.updateMatchScore
  );

router
  .route("/booking/create/")
  .patch(
    eventController.eventTimeout,
    validateBookingFields,
    eventController.createBooking
  );

router
  .route("/booking/cancel/")
  .patch(
    eventController.eventTimeout,
    validateCancelBookingFields,
    eventController.cancelBooking
  );

// Admin functions
router
  .route("/")
  .get(eventController.eventTimeout, eventController.getAllEvents)
  .post(
    eventController.eventTimeout,
    authController.protect,
    authController.restrictTo("clubAdmin", "pickleAdmin"),
    validateEventFields,
    eventController.createEvent
  );

router
  .route("/:id")
  .get(eventController.eventTimeout, eventController.getEvent)
  .patch(
    eventController.eventTimeout,
    authController.protect,
    authController.restrictTo("clubAdmin", "pickleAdmin"),
    validateEventFields,
    eventController.updateEvent
  )
  .delete(
    eventController.eventTimeout,
    authController.protect,
    authController.restrictTo("clubAdmin", "pickleAdmin"),
    eventController.deleteEvent
  );

router.post(
  "/noShow",
  eventController.eventTimeout,
  authController.protect,
  authController.restrictTo("clubAdmin", "pickleAdmin"),
  validateNoShowFields,
  eventController.handleNoShow
);

module.exports = router;

```

## routes/settingsRoutes.js

*Size: 870 bytes*

```js
const express = require("express");
const { body } = require("express-validator");
const authController = require("../controllers/authController");
const settingsController = require("../controllers/settingsController");

const router = express.Router();

// Input validation for settings update
const validateSettingsFields = [
  body("systemDefaults")
    .optional()
    .isObject()
    .withMessage("systemDefaults must be an object"),
  body("features")
    .optional()
    .isObject()
    .withMessage("features must be an object"),
];

// User functions
router.route("/get").get(...settingsController.getSystemSettings);

// Admin functions
router
  .route("/update")
  .patch(
    authController.protect,
    authController.restrictTo("clubAdmin", "pickleAdmin"),
    ...settingsController.saveSettings,
    validateSettingsFields
  );

module.exports = router;

```

## routes/userRoutes.js

*Size: 1956 bytes*

```js
const express = require("express");
const { body } = require("express-validator");
const userController = require("../controllers/userController");
const authController = require("../controllers/authController");

const router = express.Router();

// Input validation for critical user fields
const validateUserFields = [
  body("name").notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("mobile").notEmpty().withMessage("Mobile is required"),
];

// --- Auth routes ---
router.post("/signup", authController.signup);
router.post("/create", authController.create);
router.post("/login", authController.login);
router.get("/logout", authController.logout);

router.post("/forgotPassword", authController.forgotPassword);
router.patch("/passwordReset", authController.passwordReset);

router.patch(
  "/updateMyPassword",
  authController.protect,
  authController.updateMyPassword
);

// --- Protect all subsequent routes ---
router.use(authController.protect);

// --- User routes with requestTimeout and validation ---
router.get("/me", userController.getMe, ...userController.getUser);

router.patch(
  "/updateAcDetails",
  ...userController.updateAcDetails,
  validateUserFields
);

router.delete("/deleteMe", ...userController.deleteMe);

router
  .route("/")
  .get(
    authController.restrictTo("clubAdmin", "pickleAdmin"),
    ...userController.getAllUsers
  )
  .post(
    authController.restrictTo("clubAdmin", "pickleAdmin"),
    ...userController.createUser,
    validateUserFields
  );

router
  .route("/:id")
  .get(
    authController.restrictTo("clubAdmin", "pickleAdmin"),
    ...userController.getUser
  )
  .patch(
    authController.restrictTo("clubAdmin", "pickleAdmin"),
    ...userController.updateUser,
    validateUserFields
  )
  .delete(
    authController.restrictTo("clubAdmin", "pickleAdmin"),
    ...userController.deleteUser
  );

module.exports = router;

```

## routes/viewRoutes.js

*Size: 2319 bytes*

```js
const path = require("path");
const express = require("express");
const viewsController = require("../controllers/viewsController");
const authController = require("../controllers/authController");

const router = express.Router();

// Homepage
router.get("/", ...viewsController.getHomePage);

// Individual users
router.get("/me/login", ...viewsController.getLoginForm);
router.get("/me/signup", ...viewsController.getsignupForm);
router.get(
  "/me/myAccountDetails",
  authController.protect,
  ...viewsController.getMyAccountDetails
);

router.get(
  "/me/myPasswordUpdate",
  authController.protect,
  ...viewsController.myPasswordUpdate
);

router.get("/me/forgotPassword", ...viewsController.forgotPassword);

router.get(
  "/me/myPasswordReset/:resetToken",
  ...viewsController.myPasswordReset
);

// Admin user functionality
router.get(
  "/users/showAll",
  authController.isLoggedIn,
  ...viewsController.showAllUsers
);

router.get(
  "/users/create",
  authController.protect,
  ...viewsController.createUser
);

router.get(
  "/users/get/:id",
  authController.isLoggedIn,
  ...viewsController.editUser
);

// Events
router.get(
  "/events/showAll",
  authController.isLoggedIn,
  ...viewsController.showAllEvents
);

router.get(
  "/events/showAllSchedules",
  authController.isLoggedIn,
  ...viewsController.showAllSchedules
);

router.get(
  "/events/viewMasterSchedule/:id",
  authController.isLoggedIn,
  ...viewsController.viewMasterSchedule
);

router.get(
  "/events/browseNew",
  authController.isLoggedIn,
  ...viewsController.browseNewEvents
);

router.get(
  "/events/myBrowse",
  authController.isLoggedIn,
  ...viewsController.browseMyEvents
);

router.get(
  "/events/create",
  authController.protect,
  ...viewsController.createEvent
);

router.get(
  "/events/get/:id",
  authController.isLoggedIn,
  ...viewsController.editEvent
);

router.get(
  "/events/viewMySchedule/:id",
  authController.isLoggedIn,
  ...viewsController.viewMySchedule
);

router.get(
  "/settings/get",
  authController.isLoggedIn,
  authController.restrictTo("clubAdmin", "pickleAdmin"),
  ...viewsController.getSettings
);

router.get(
  "/events/noShowForm",
  authController.protect,
  authController.restrictTo("clubAdmin", "pickleAdmin"),
  ...viewsController.showNoShowForm
);

module.exports = router;

```

## server.js

*Size: 1628 bytes*

```js
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
  server.close(() => {
    // Close DB connections if using mongoose
    if (require("mongoose").connection.readyState === 1) {
      require("mongoose").connection.close(false, () => {
        console.log("MongoDB connection closed.");
        console.log("Process terminated");
        setTimeout(() => process.exit(0), 1000);
      });
    } else {
      console.log("Process terminated");
      setTimeout(() => process.exit(0), 1000);
    }
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

```

## services/scheduleService.js

*Size: 13526 bytes*

```js
const AppError = require("../utils/appError");

/**
 * Helper to distribute rest periods as evenly and spread out as possible
 */
function distributeRests(players, numRounds, numResting) {
  const restSchedule = {};
  const totalRests = numRounds * numResting;
  const baseRests = Math.floor(totalRests / players.length);
  const extraRests = totalRests % players.length;

  players.forEach((p, i) => {
    restSchedule[p.userId] = [];
    const numPlayerRests = baseRests + (i < extraRests ? 1 : 0);
    for (let r = 0; r < numPlayerRests; r++) {
      const roundIdx =
        Math.round(((r + 1) * numRounds) / (numPlayerRests + 1)) - 1;
      restSchedule[p.userId].push(roundIdx);
    }
  });
  return restSchedule;
}

/**
 * Backtracking pairing algorithm to avoid repeat partnerships
 */
function generateRoundMatchesBT(activePlayers, numCourts, usedPairs) {
  const matches = [];
  const n = activePlayers.length;
  const maxMatches = Math.min(numCourts, Math.floor(n / 4));

  function backtrack(startIdx, currMatches, currUsedPlayers, currUsedPairs) {
    if (currMatches.length === maxMatches) {
      return currMatches;
    }
    for (let i = 0; i < n - 3; i++) {
      if (currUsedPlayers.has(i)) continue;
      for (let j = i + 1; j < n - 2; j++) {
        if (currUsedPlayers.has(j)) continue;
        for (let k = j + 1; k < n - 1; k++) {
          if (currUsedPlayers.has(k)) continue;
          for (let l = k + 1; l < n; l++) {
            if (currUsedPlayers.has(l)) continue;
            const combos = [
              [
                [i, j],
                [k, l],
              ],
              [
                [i, k],
                [j, l],
              ],
              [
                [i, l],
                [j, k],
              ],
            ];
            for (const [teamAIdx, teamBIdx] of combos) {
              const teamA = [
                activePlayers[teamAIdx[0]],
                activePlayers[teamAIdx[1]],
              ];
              const teamB = [
                activePlayers[teamBIdx[0]],
                activePlayers[teamBIdx[1]],
              ];
              const pairA = [teamA[0].userId, teamA[1].userId].sort().join("-");
              const pairB = [teamB[0].userId, teamB[1].userId].sort().join("-");
              if (currUsedPairs.has(pairA) || currUsedPairs.has(pairB))
                continue;
              currUsedPlayers.add(teamAIdx[0]);
              currUsedPlayers.add(teamAIdx[1]);
              currUsedPlayers.add(teamBIdx[0]);
              currUsedPlayers.add(teamBIdx[1]);
              currUsedPairs.add(pairA);
              currUsedPairs.add(pairB);
              currMatches.push({
                teamA: teamA.map((p) => ({
                  userId: String(p.userId),
                  name: p.userName,
                })),
                teamB: teamB.map((p) => ({
                  userId: String(p.userId),
                  name: p.userName,
                })),
                court: currMatches.length,
              });
              const result = backtrack(
                i + 1,
                currMatches,
                currUsedPlayers,
                currUsedPairs
              );
              if (result) return result;
              currMatches.pop();
              currUsedPlayers.delete(teamAIdx[0]);
              currUsedPlayers.delete(teamAIdx[1]);
              currUsedPlayers.delete(teamBIdx[0]);
              currUsedPlayers.delete(teamBIdx[1]);
              currUsedPairs.delete(pairA);
              currUsedPairs.delete(pairB);
            }
          }
        }
      }
    }
    return currMatches.length === maxMatches ? currMatches : null;
  }

  const result = backtrack(0, [], new Set(), new Set(usedPairs));
  return result || [];
}

class ScheduleService {
  /**
   * Main function to generate complete schedule for an event
   */
  generateCompleteSchedule(playersList, numOfRounds, numOfCourts, numResting) {
    if (
      !playersList ||
      playersList.length < 4 ||
      numOfRounds < 1 ||
      numOfCourts < 1
    ) {
      throw new AppError("Invalid schedule parameters", 400);
    }

    // Distribute rest periods
    const restSchedule = distributeRests(playersList, numOfRounds, numResting);

    // Track all partnerships used so far
    const usedPairs = new Set();
    const rounds = [];

    for (let round = 0; round < numOfRounds; round++) {
      // Find players resting this round
      const standOuts = playersList.filter((p) =>
        restSchedule[String(p.userId)].includes(round)
      );

      // Active players for this round
      const activePlayers = playersList.filter(
        (p) => !restSchedule[String(p.userId)].includes(round)
      );

      // Generate matches for this round using backtracking
      const matches = generateRoundMatchesBT(
        activePlayers,
        numOfCourts,
        usedPairs
      );

      // Add new partnerships to usedPairs
      matches.forEach((m) => {
        const pairA = [m.teamA[0].userId, m.teamA[1].userId].sort().join("-");
        const pairB = [m.teamB[0].userId, m.teamB[1].userId].sort().join("-");
        usedPairs.add(pairA);
        usedPairs.add(pairB);
      });

      // Ensure all players are accounted for: if not in matches, must be in standOuts
      const accountedIds = new Set([
        ...standOuts.map((p) => String(p.userId)),
        ...matches.flatMap((m) => [
          String(m.teamA[0].userId),
          String(m.teamA[1].userId),
          String(m.teamB[0].userId),
          String(m.teamB[1].userId),
        ]),
      ]);
      // If any player is missing, add them to standOuts for this round
      playersList.forEach((p) => {
        if (!accountedIds.has(String(p.userId))) {
          standOuts.push({
            userId: String(p.userId),
            name: p.userName,
          });
        }
      });

      rounds.push({
        matches,
        standOuts: standOuts.map((p) => ({
          userId: String(p.userId),
          name: p.userName,
        })),
      });
    }

    // Validate and summarize
    const validationResults = this.validateScheduleEnhanced(
      rounds,
      playersList
    );

    // Summary logging only
    if (validationResults.isValid) {
      console.log(`✅ Schedule validation passed`);
    } else {
      console.error(`❌ Schedule validation failed`);
      const partnershipViolations = validationResults.errors.filter((e) =>
        e.startsWith("Partnership violation")
      );
      console.error(
        `Total partnership violations: ${partnershipViolations.length}`
      );
      if (partnershipViolations.length > 0) {
        console.error(`First violation: ${partnershipViolations[0]}`);
      }
    }

    if (validationResults.warnings.length > 0) {
      console.warn(
        `⚠️ Warnings: ${validationResults.warnings.length} (e.g. ${validationResults.warnings[0]})`
      );
    }

    if (validationResults.stats) {
      console.log(
        `Rest distribution: min=${validationResults.stats.minRests}, max=${validationResults.stats.maxRests}, avg=${validationResults.stats.averageRests.toFixed(1)}`
      );
      console.log(
        `Play distribution: min=${validationResults.stats.minPlays}, max=${validationResults.stats.maxPlays}, avg=${validationResults.stats.averagePlays.toFixed(1)}`
      );
    }

    if (!validationResults.isValid) {
      throw new AppError(
        `Schedule validation failed: ${validationResults.errors.join(", ")}`,
        500
      );
    }

    return rounds;
  }

  /**
   * Enhanced validation with summary reporting
   */
  validateScheduleEnhanced(schedule, playersList) {
    const validationResults = {
      isValid: true,
      errors: [],
      warnings: [],
      stats: {},
    };

    try {
      const partnershipCheck = new Map();
      const restCount = new Map();
      const playCount = new Map();

      // Initialize tracking
      playersList.forEach((player) => {
        partnershipCheck.set(player.userId, new Set());
        restCount.set(player.userId, 0);
        playCount.set(player.userId, 0);
      });

      // Validate each round
      for (let roundIndex = 0; roundIndex < schedule.length; roundIndex++) {
        const round = schedule[roundIndex];
        const playingPlayers = new Set();
        const restingPlayers = new Set();

        // Track resting players
        round.standOuts.forEach((player) => {
          restingPlayers.add(player.userId);
          restCount.set(player.userId, (restCount.get(player.userId) || 0) + 1);
        });

        // Validate matches
        for (const match of round.matches) {
          const allMatchPlayers = [
            ...match.teamA.map((p) => p.userId),
            ...match.teamB.map((p) => p.userId),
          ];

          // Check for duplicate players in same match
          if (new Set(allMatchPlayers).size !== allMatchPlayers.length) {
            validationResults.errors.push(
              `Duplicate player in match in round ${roundIndex + 1}`
            );
            validationResults.isValid = false;
          }

          // Check no player is both playing and resting
          for (const playerId of allMatchPlayers) {
            if (restingPlayers.has(playerId)) {
              validationResults.errors.push(
                `Player ${playerId} is both playing and resting in round ${roundIndex + 1}`
              );
              validationResults.isValid = false;
            }
            if (playingPlayers.has(playerId)) {
              validationResults.errors.push(
                `Player ${playerId} appears in multiple matches in round ${roundIndex + 1}`
              );
              validationResults.isValid = false;
            }
            playingPlayers.add(playerId);
            playCount.set(playerId, (playCount.get(playerId) || 0) + 1);
          }

          // Check team composition (exactly 2 players per team)
          if (match.teamA.length !== 2 || match.teamB.length !== 2) {
            validationResults.errors.push(
              `Invalid team size in round ${roundIndex + 1}, court ${match.court}`
            );
            validationResults.isValid = false;
          }

          // Check partnerships
          const teamAPair = [match.teamA[0].userId, match.teamA[1].userId];
          const teamBPair = [match.teamB[0].userId, match.teamB[1].userId];

          for (const pair of [teamAPair, teamBPair]) {
            const [player1, player2] = pair;
            if (partnershipCheck.get(player1)?.has(player2)) {
              validationResults.errors.push(
                `Partnership violation: ${player1} and ${player2} play together again in round ${roundIndex + 1}`
              );
              validationResults.isValid = false;
            }
            partnershipCheck.get(player1)?.add(player2);
            partnershipCheck.get(player2)?.add(player1);
          }
        }

        // Check all eligible players are accounted for
        const totalAccountedPlayers = playingPlayers.size + restingPlayers.size;
        if (totalAccountedPlayers !== playersList.length) {
          validationResults.warnings.push(
            `Round ${roundIndex + 1}: ${totalAccountedPlayers} players accounted for, expected ${playersList.length}`
          );
        }
      }

      // Check rest distribution fairness
      const restCounts = Array.from(restCount.values());
      const minRests = Math.min(...restCounts);
      const maxRests = Math.max(...restCounts);

      if (maxRests - minRests > 1) {
        validationResults.warnings.push(
          `Uneven rest distribution: min=${minRests}, max=${maxRests}`
        );
      }

      // Check minimum play requirements
      const playCounts = Array.from(playCount.values());
      const minPlays = Math.min(...playCounts);

      if (minPlays === 0) {
        validationResults.warnings.push(
          `Some players never play during the event`
        );
      }

      // Compile statistics
      validationResults.stats = {
        totalRounds: schedule.length,
        totalPlayers: playersList.length,
        restDistribution: Object.fromEntries(restCount),
        playDistribution: Object.fromEntries(playCount),
        restVariance: maxRests - minRests,
        averageRests: restCounts.reduce((a, b) => a + b, 0) / restCounts.length,
        averagePlays: playCounts.reduce((a, b) => a + b, 0) / playCounts.length,
        minRests,
        maxRests,
        minPlays,
        maxPlays: Math.max(...playCounts),
      };

      return validationResults;
    } catch (err) {
      console.error("Error in validateScheduleEnhanced:", err);
      return {
        isValid: false,
        errors: [`Validation error: ${err.message}`],
        warnings: [],
        stats: {},
      };
    }
  }

  validateSchedule(schedule, playersList) {
    const results = this.validateScheduleEnhanced(schedule, playersList);
    return results.isValid;
  }

  analyzeSchedule(schedule, playersList) {
    const validationResults = this.validateScheduleEnhanced(
      schedule,
      playersList
    );
    return {
      isValid: validationResults.isValid,
      summary: validationResults.stats,
      issues: {
        errors: validationResults.errors,
        warnings: validationResults.warnings,
      },
      detailed: {
        restDistribution: validationResults.stats.restDistribution,
        playDistribution: validationResults.stats.playDistribution,
      },
    };
  }
}

module.exports = ScheduleService;

```

## tests/validateSchedule.js

*Size: 5836 bytes*

```js
require("dotenv").config({ path: "./config.env" });
const mongoose = require("mongoose");
const Event = require("../models/eventModel");

const mongoUri = process.env.DEV_DATABASE || "mongodb://localhost:27017/pickle";

// Helper to get user name from userId
function getUserNameById(players, userId) {
  const player = players.find((p) => p.userId === userId);
  return player ? player.userName : userId;
}

async function validateEventSchedule(event) {
  const rounds = event.rounds || [];
  if (!rounds.length) {
    // Skip events with empty rounds
    return;
  }
  const players = event.eventBookings.map((b) => ({
    userId: String(b.userId),
    userName: b.userName,
  }));

  // Track partnerships: { userId: Set of userIds they've partnered with }
  const partnerships = {};
  players.forEach((p) => (partnerships[p.userId] = new Set()));

  // Track rest/play counts and rounds
  const restCounts = {};
  const playCounts = {};
  const restRounds = {};
  players.forEach((p) => {
    restCounts[p.userId] = 0;
    playCounts[p.userId] = 0;
    restRounds[p.userId] = [];
  });

  let errors = [];
  let warnings = [];

  rounds.forEach((round, roundIdx) => {
    const resting = new Set(round.standOuts.map((p) => String(p.userId)));
    const playing = new Set();

    // Check matches
    round.matches.forEach((match, matchIdx) => {
      // Team size
      if (match.teamA.length !== 2 || match.teamB.length !== 2) {
        errors.push(
          `Round ${roundIdx + 1}, Match ${matchIdx + 1}: Invalid team size`
        );
      }

      // No duplicate players in a match
      const allPlayers = [
        ...match.teamA.map((p) => String(p.userId)),
        ...match.teamB.map((p) => String(p.userId)),
      ];
      if (new Set(allPlayers).size !== allPlayers.length) {
        errors.push(
          `Round ${roundIdx + 1}, Match ${matchIdx + 1}: Duplicate player in match`
        );
      }

      // No player both resting and playing
      allPlayers.forEach((pid) => {
        if (resting.has(pid)) {
          errors.push(
            `Round ${roundIdx + 1}: Player ${getUserNameById(players, pid)} is both resting and playing`
          );
        }
        playing.add(pid);
        playCounts[pid] = (playCounts[pid] || 0) + 1;
      });

      // Partnership check
      [
        [match.teamA[0], match.teamA[1]],
        [match.teamB[0], match.teamB[1]],
      ].forEach(([p1, p2]) => {
        const id1 = String(p1.userId);
        const id2 = String(p2.userId);
        if (partnerships[id1].has(id2)) {
          errors.push(
            `Players ${getUserNameById(players, id1)} and ${getUserNameById(players, id2)} are partners more than once (repeat partnership)`
          );
        }
        partnerships[id1].add(id2);
        partnerships[id2].add(id1);
      });
    });

    // Track rests
    round.standOuts.forEach((p) => {
      const pid = String(p.userId);
      restCounts[pid] = (restCounts[pid] || 0) + 1;
      restRounds[pid].push(roundIdx + 1);
    });

    // Check all players accounted for
    const accounted = new Set([...resting, ...playing]);
    if (accounted.size !== players.length) {
      warnings.push(
        `Round ${roundIdx + 1}: ${accounted.size} players accounted for, expected ${players.length}`
      );
    }
  });

  // Best effort checks
  const restVals = Object.values(restCounts);
  const minRest = Math.min(...restVals);
  const maxRest = Math.max(...restVals);
  if (maxRest - minRest > 1) {
    warnings.push(`Uneven rest distribution: min=${minRest}, max=${maxRest}`);
  }

  // Distribution check
  Object.entries(restRounds).forEach(([pid, rounds]) => {
    if (rounds.length > 1) {
      for (let i = 1; i < rounds.length; i++) {
        if (rounds[i] - rounds[i - 1] === 1) {
          warnings.push(
            `Player ${getUserNameById(players, pid)} has consecutive rests in rounds ${rounds[i - 1]} and ${rounds[i]}`
          );
        }
      }
    }
  });

  // --- SUMMARY DATA AT TOP ---
  const avgGames =
    Object.values(playCounts).reduce((a, b) => a + b, 0) / players.length;
  const avgRests =
    Object.values(restCounts).reduce((a, b) => a + b, 0) / players.length;

  console.log(
    `=== Schedule Validation Results for Event: ${event._id} (${event.eventName || ""}) ===`
  );
  console.log(`Average number of games per player: ${avgGames.toFixed(2)}`);
  console.log(`Average number of rests per player: ${avgRests.toFixed(2)}`);
  // --- END SUMMARY DATA ---

  if (errors.length === 0) {
    console.log("✅ No mandatory rule violations found.");
  } else {
    console.error("❌ Errors:");
    errors.forEach((e) => console.error("  - " + e));
  }
  if (warnings.length > 0) {
    console.warn("⚠️ Warnings:");
    warnings.forEach((w) => console.warn("  - " + w));
  }

  // Summary stats (show user names)
  console.log(
    "Rest counts per player:",
    Object.fromEntries(
      Object.entries(restCounts).map(([pid, count]) => [
        getUserNameById(players, pid),
        count,
      ])
    )
  );
  console.log(
    "Play counts per player:",
    Object.fromEntries(
      Object.entries(playCounts).map(([pid, count]) => [
        getUserNameById(players, pid),
        count,
      ])
    )
  );
  console.log(
    "Rest rounds per player:",
    Object.fromEntries(
      Object.entries(restRounds).map(([pid, rounds]) => [
        getUserNameById(players, pid),
        rounds,
      ])
    )
  );
  console.log("\n");
}

async function main() {
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  const events = await Event.find({});
  if (!events.length) {
    console.log("No events found.");
    process.exit(0);
  }
  for (const event of events) {
    await validateEventSchedule(event);
  }
  await mongoose.disconnect();
}

main();

```

## utils/apiFeatures.js

*Size: 2233 bytes*

```js
class APIFeatures {
  constructor(query, queryString) {
    if (!query || typeof query.find !== "function") {
      console.warn("APIFeatures: Invalid query object provided.");
      throw new Error("Invalid query object for APIFeatures.");
    }
    if (!queryString || typeof queryString !== "object") {
      console.warn("APIFeatures: Invalid queryString provided.");
      throw new Error("Invalid queryString for APIFeatures.");
    }
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    try {
      const queryObj = { ...this.queryString };
      const excludedFields = ["page", "sort", "limit", "fields"];
      excludedFields.forEach((el) => delete queryObj[el]);

      let queryStr = JSON.stringify(queryObj);
      queryStr = queryStr.replace(
        /\b(gte|gt|lte|lt)\b/g,
        (match) => `$${match}`
      );

      this.query = this.query.find(JSON.parse(queryStr));
    } catch (err) {
      console.error("APIFeatures.filter error:", err);
      this.query = this.query.find({});
    }
    return this;
  }

  sort() {
    try {
      if (this.queryString.sort) {
        const sortBy = this.queryString.sort.split(",").join(" ");
        this.query = this.query.sort(sortBy);
      } else {
        this.query = this.query.sort("-createdAt");
      }
    } catch (err) {
      console.error("APIFeatures.sort error:", err);
      // fallback: no sort
    }
    return this;
  }

  limitFields() {
    try {
      if (this.queryString.fields) {
        const fields = this.queryString.fields.split(",").join(" ");
        this.query = this.query.select(fields);
      } else {
        this.query = this.query.select("-__v");
      }
    } catch (err) {
      console.error("APIFeatures.limitFields error:", err);
      // fallback: no field limiting
    }
    return this;
  }

  paginate() {
    try {
      const page = Number(this.queryString.page) || 1;
      const limit = Number(this.queryString.limit) || 100;
      const skip = (page - 1) * limit;

      this.query = this.query.skip(skip).limit(limit);
    } catch (err) {
      console.error("APIFeatures.paginate error:", err);
      // fallback: no pagination
    }
    return this;
  }
}

module.exports = APIFeatures;

```

## utils/appError.js

*Size: 994 bytes*

```js
class AppError extends Error {
  constructor(message = "An error occurred", statusCode = 500) {
    // Type checking for parameters
    if (typeof message !== "string") {
      console.warn("AppError: message should be a string.");
      message = String(message);
    }
    if (
      typeof statusCode !== "number" ||
      statusCode < 100 ||
      statusCode > 599
    ) {
      console.warn("AppError: statusCode should be a valid HTTP status code.");
      statusCode = 500;
    }
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;

    // Stack trace robustness
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, this.constructor);
    }

    // Optional: log error in development
    if (process.env.NODE_ENV === "development") {
      console.error(`AppError created: ${message} (${statusCode})`);
    }
  }
}

module.exports = AppError;

```

## utils/catchAsync.js

*Size: 795 bytes*

```js
module.exports = (fn) => (req, res, next) => {
  if (typeof fn !== "function") {
    const err = new Error("catchAsync: Wrapped value is not a function");
    if (process.env.NODE_ENV === "development") {
      console.error(err);
    }
    return next(err);
  }
  try {
    const maybePromise = fn(req, res, next);
    if (maybePromise && typeof maybePromise.catch === "function") {
      maybePromise.catch((err) => {
        if (process.env.NODE_ENV === "development") {
          console.error("Async error caught:", err);
        }
        next(err);
      });
    } else {
      // If not a promise, just return
      return maybePromise;
    }
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("Sync error caught:", err);
    }
    next(err);
  }
};

```

## utils/email.js

*Size: 1505 bytes*

```js
const nodeMailer = require("nodemailer");

const sendEmail = async (options) => {
  // Input validation
  if (
    !options ||
    typeof options.email !== "string" ||
    typeof options.subject !== "string" ||
    typeof options.message !== "string"
  ) {
    throw new Error(
      "sendEmail: Invalid options provided. 'email', 'subject', and 'message' are required strings."
    );
  }

  // Transporter configuration validation
  const requiredEnv = [
    "EMAIL_HOST",
    "EMAIL_PORT",
    "EMAIL_USERNAME",
    "EMAIL_PASSWORD",
  ];
  requiredEnv.forEach((key) => {
    if (!process.env[key]) {
      console.warn(`sendEmail: Missing environment variable ${key}`);
    }
  });

  const transporter = nodeMailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: Number(process.env.EMAIL_PORT) === 465, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
    connectionTimeout: 10000,
  });

  const mailOptions = {
    from: "Club Admin <clubadmin@gmail.com>",
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    if (process.env.NODE_ENV === "development") {
      console.log("Email sent:", info.response);
    }
    return info;
  } catch (err) {
    console.error("sendEmail error:", err);
    throw err;
  }
};

module.exports = sendEmail;

```

## utils/paginate.js

*Size: 1470 bytes*

```js
module.exports = async function paginate(
  queryOrModel,
  req,
  filter = {},
  options = {}
) {
  let page = Number(req.query.page);
  let limit = Number(req.query.limit);

  // Input validation and defaults
  if (!Number.isInteger(page) || page < 1) page = 1;
  if (!Number.isInteger(limit) || limit < 1) limit = 10;
  const skip = (page - 1) * limit;

  let query, countQuery;
  try {
    // Type checking for queryOrModel
    if (
      typeof queryOrModel.find === "function" &&
      typeof queryOrModel.exec !== "function"
    ) {
      // It's a Model
      query = queryOrModel.find(filter, null, options).skip(skip).limit(limit);
      countQuery = queryOrModel.countDocuments(filter);
    } else if (
      typeof queryOrModel.skip === "function" &&
      typeof queryOrModel.limit === "function"
    ) {
      // It's a Query
      query = queryOrModel.skip(skip).limit(limit);
      countQuery = query.model.countDocuments(query.getQuery());
    } else {
      console.warn("paginate: queryOrModel must be a Mongoose Model or Query.");
      throw new Error("paginate: Invalid queryOrModel argument.");
    }

    const [results, totalDocs] = await Promise.all([query.exec(), countQuery]);
    const totalPages = totalDocs > 0 ? Math.ceil(totalDocs / limit) : 1;

    return {
      results,
      currentPage: page,
      totalPages,
      limit,
      totalDocs,
    };
  } catch (err) {
    console.error("paginate error:", err);
    throw err;
  }
};

```

## utils/twilioClient.js

*Size: 1418 bytes*

```js
const twilio = require("twilio");

const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM } =
  process.env;

// Environment variable validation
if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
  console.warn(
    "Twilio config missing: Check TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM"
  );
}

const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

async function sendWhatsAppMessage(to, message) {
  // Input validation
  if (typeof to !== "string" || !to.trim()) {
    throw new Error("sendWhatsAppMessage: 'to' must be a non-empty string.");
  }
  if (typeof message !== "string" || !message.trim()) {
    throw new Error(
      "sendWhatsAppMessage: 'message' must be a non-empty string."
    );
  }
  if (!TWILIO_WHATSAPP_FROM) {
    throw new Error("sendWhatsAppMessage: TWILIO_WHATSAPP_FROM is not set.");
  }

  try {
    const result = await twilioClient.messages.create({
      from: TWILIO_WHATSAPP_FROM,
      to: `whatsapp:${to}`,
      body: message,
    });
    if (process.env.NODE_ENV === "development") {
      console.log("WhatsApp message sent:", result.sid);
    }
    return result;
  } catch (err) {
    console.error("sendWhatsAppMessage error:", err);
    throw err;
  }
}

// Export client, from number, and send function
module.exports = {
  twilioClient,
  whatsappFrom: TWILIO_WHATSAPP_FROM,
  sendWhatsAppMessage,
};

```

## views/base.pug

*Size: 1063 bytes*

```pug
doctype html

html(lang="en")
	head
		block head    
			meta(charset='UTF-8')
			meta( http-equiv="X-UA-Compatible" content="IE=edge")
			meta(name="description" content="Pickleball admin")
			link(rel="icon" href='/img/favicon.png')
			link(rel="apple-touch-icon" href="/img/apple-touch-icon.png")
			meta(name='viewport' content='width=device-width, initial-scale=1.0')
			link(rel="preconnect" href="https://fonts.gstatic.com")
			link(href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&display=swap" rel="stylesheet")
			link(rel='stylesheet' href='/css/styles.css')
			link(rel='stylesheet' href='/css/mediaQueries.css')
			script(type="module" src="https://unpkg.com/ionicons@5.4.0/dist/ionicons/ionicons.esm.js")
			//script(src="/js/stickyNavigation.js" defer)
			script(nomodule="" src="https://unpkg.com/ionicons@5.4.0/dist/ionicons/ionicons.js")
			title Pickleball| Admin
	body
		include includes/_header
		// This is where child templates will inject their content
		block content

script(type="module", defer, src=viteScript)

```

## views/browseMyEvents.pug

*Size: 1602 bytes*

```pug
extends base

block content
  main.main
    section.section-browseEvents
      div.container
        if events.length === 0
          p.subheading.center-text You currently do not have any events booked
        else
          div.eventContainer
            each event in events
              div.eventCardHeader
                - const options = {weekday: "short", year: "numeric", month: "short", day: "numeric"};
                - const eventDate = event.eventDate.toLocaleDateString(undefined, options);
                p.event-attribute
                  span.event-label When :
                  span.event-attribute=`${eventDate}`
                  span() @ 
                  span.event-attribute=`${event.eventStartTime}`
                p.event-attribute
                  span.event-label Where:
                  span()=`${event.eventLocation}`
                p.event-title Players
                  div.eventCardDetails
                    - let i = 0;
                    each booking in event.eventBookings
                      if i === event.eventNumOfPlayers
                        p.event-title Wait List
                        p.event-attribute=booking.userName
                      else
                        p.event-attribute=booking.userName
                      - i++;
                  div.form-buttons
                    if event.userInRounds
                      a.btn.btn--outline.viewMyScheduleButtons(href="#") View Schedule
                    a.btn.btn--outline.cancelEventButtons(href="#") Cancel Booking
                    p.hiddenField.eventId=`${event._id}`
```

## views/browseNewEvents.pug

*Size: 1385 bytes*

```pug
extends base

block content
	main.main
		section.section-browseEvents
			div.container
				if events.length === 0
					p.subheading.center-text There are currently no new events for you to book
				else
					div.eventContainer
						each event in events
							div.eventCardHeader
								- const options = {weekday: "short", year: "numeric", month: "short", day: "numeric"};
								- const eventDate = event.eventDate.toLocaleDateString(undefined, options);
								p.event-attribute
									span.event-label When :
									span.event-attribute=`${eventDate}`
									span() @ 
									span.event-attribute=`${event.eventStartTime}`
								p.event-attribute
									span.event-label Where:
									span()=`${event.eventLocation}`
								p.event-title Players
									div.eventCardDetails
										- let i = 0;
										each booking in event.eventBookings
											if i === event.eventNumOfPlayers
												p.event-title Wait List
												p.event-attribute=booking.userName
											else
												p.event-attribute=booking.userName
											- i++;

									div.form-buttons
										- const isWaitList = event.eventBookings.length >= event.eventNumOfPlayers
										a.btn.btn--outline.bookEventButtons(href="#")
											if isWaitList
												| Join Wait List
											else
												| Book Event
										p.hiddenField.eventId=`${event._id}`
```

## views/createEvent copy.pug

*Size: 2642 bytes*

```pug
extends base

block content 

	main.main
		section(class="section")
			div(class="container")
				div(class="crudContainer-2-cols")
					div(class="text-box") 
						h1(class="heading-secondary") Create an Event
						form(class="form-2-cols" id="createEventForm")
							div
								label(for="eventName") Event name
								input(name="eventName" type="text" id="eventName" required)
							div
								label(for="eventLocation") Event location
								input(name="eventLocation" type="text" id="eventLocation" required)
							div
								label(for="eventType") Event Type
								input(name="eventType" type="text" id="eventType")
							div
								label(for="eventDate") Event date
								input(name="eventDate" type="date" id="eventDate" required)
							div
								label(for="eventStartTime") Event start time
								input(name="eventStartTime" type="time" id="eventStartTime" required)
							div
								label(for="eventOrganiser") Event organiser
								input(name="eventOrganiser" type="text" id="eventOrganiser" required)
							div
								label(for="eventNumOfCourts") Number of available courts for event
								input(name="eventNumOfCourts" type="number" id="eventNumOfCourts" value=systemDefaults.numOfStandOuts required)
							div
								label(for="numOfStandOutsPerRound") Number of players resting per round
								input(name="numOfStandOutsPerRound" type="number" id="numOfStandOutsPerRound" value=systemDefaults.numOfStandOuts required)
							div
								label(for="eventNumOfRounds") Number of rounds in the event
								input(name="eventNumOfRounds" type="number" id="eventNumOfRounds" value=systemDefaults.numOfRounds required)
							div
								label(for="eventWaitListSize") Max number of players on wait list
								input(name="eventWaitListSize" type="number" id="eventWaitListSize" value=systemDefaults.waitListSize required)
							div
								label(for="eventNumOfPairings") Number of pairings per court
								input(name="eventNumOfPairings" type="number" id="eventNumOfPairings" value=systemDefaults.numOfPairingsPerCourt required)
							div(class="form-row")
								label(for="active" class="form__label active-label") Is event Active ?
								input(type="checkbox" id="active" name="active" class="active-checkbox")
							div(class="form-buttons")
								a(
  								class="btn btn--form"
  								id="createEventButton"
  								href="#"
  								onclick="document.getElementById('createEventForm').dispatchEvent(new Event('submit', {cancelable: true, bubbles: true})); return false;"
								) Create
								a(class="btn btn--form" id="cancelButton" href="/events/showall") Cancel
```

## views/createEvent.pug

*Size: 5740 bytes*

```pug
extends base

block content
  main.main
    section.section
      style.
        .crudContainer-2-cols {
          display: flex;
          flex-direction: row;
          gap: 8rem; /* increased gap to move calculator further right */
          align-items: flex-start;
          justify-content: flex-start;
        }
        .text-box {
          background: transparent;
          padding: 0;
          box-shadow: none;
          width: 100%;
          max-width: 600px;
        }
        .form-2-cols {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem 2rem;
          align-items: start;
        }
        .form-2-cols .form-col-left,
        .form-2-cols .form-col-right {
          display: flex;
          flex-direction: column;
        }
        .form-2-cols .form-col-left label,
        .form-2-cols .form-col-right label {
          font-size: 1.1em;
          font-weight: 500;
          color: #222;
          margin-bottom: 0.5em;
          margin-top: 0.5em;
          letter-spacing: 0.02em;
        }
        .form-2-cols input,
        .form-2-cols button,
        .form-2-cols .result {
          margin-bottom: 1rem;
        }
        .form-2-cols .form-col-right {
          border: 2px solid #222;
          border-radius: 12px;
          padding: 2rem 1.5rem 1.5rem 1.5rem;
          background: #fff8e1;
          min-width: 340px;
          max-width: 400px;
          margin-left: auto; /* push calculator to the right */
        }
        .form-col-right h2 {
          margin-top: 0;
          margin-bottom: 2.5rem;
          font-size: 1.7em;
          font-weight: bold;
          color: #222;
          text-align: left;
          min-height: 3.5rem;
          display: flex;
          align-items: center;
        }
        .form-col-right input[type="number"] {
          width: 4em;
          min-width: 4em;
          max-width: 4em;
          box-sizing: border-box;
          font-size: 1.2em;
          padding: 0.4em;
          border-radius: 6px;
          border: 1px solid #ccc;
          background: #fff;
        }
        .result {
          margin-top: 1rem;
          padding: 1rem;
          background: #fff8e1;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
        }
        .form-buttons {
          display: flex;
          justify-content: space-between;
          margin-top: 2rem;
        }
        .btn--form {
          background: #4e2e0e;
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 0.8em 2em;
          font-size: 1.2em;
          cursor: pointer;
          transition: background 0.2s;
        }
        .btn--form:hover {
          background: #7c4a17;
        }
        @media (max-width: 900px) {
          .crudContainer-2-cols {
            flex-direction: column;
            gap: 0;
          }
          .text-box {
            max-width: 100%;
          }
          .form-2-cols {
            grid-template-columns: 1fr;
          }
          .form-col-right {
            min-width: 0;
            max-width: 100%;
            margin-left: 0;
          }
        }
      div.container
        div.crudContainer-2-cols
          div.text-box
            h1.heading-secondary Create an Event
            form.form-2-cols#createEventForm
              // Left column: Event details
              div.form-col-left
                label(for="eventName") Event name
                input(name="eventName" type="text" id="eventName" required)
                label(for="eventLocation") Event location
                input(name="eventLocation" type="text" id="eventLocation" required)
                label(for="eventType") Event Type
                input(name="eventType" type="text" id="eventType")
                label(for="eventDate") Event date
                input(name="eventDate" type="date" id="eventDate" required)
                label(for="eventStartTime") Event start time
                input(name="eventStartTime" type="time" id="eventStartTime" required)
                label(for="eventOrganiser") Event organiser
                input(name="eventOrganiser" type="text" id="eventOrganiser" required)
                label(for="eventWaitListSize") Max number of players on wait list
                input(name="eventWaitListSize" type="number" id="eventWaitListSize" value=systemDefaults.waitListSize required)
                label(for="active" class="form__label active-label") Is event Active ?
                input(type="checkbox" id="active" name="active" class="active-checkbox")
              // Right column: Calculator fields
              div.form-col-right
                h2 Schedule Calculator
                label(for="numCourts") Number of courts available for event:
                input(type="number", id="numCourts", required=true)
                label(for="numPairings") Number of pairings per court:
                input(type="number", id="numPairings", required=true)
                label(for="restsPerPlayer") Rest rounds per player (event):
                input(type="number", id="restsPerPlayer", required=true)
                label(for="numRounds") Number of rounds:
                input(type="number", id="numRounds", min="1")
                button.btn--form(type="submit") Calculate
                div.result#result
                script(src="/js/scheduleCalculator.js")
        div.form-buttons
          a.btn.btn--form#createEventButton(
            href="#"
            onclick="document.getElementById('createEventForm').dispatchEvent(new Event('submit', {cancelable: true, bubbles: true})); return false;"
          ) Create
          a.btn.btn--form#cancelButton(href="/events/showall") Cancel
```

## views/createUser.pug

*Size: 1329 bytes*

```pug
extends base

block content

	main.main
		section(class="section")
			div(class="crudContainer-1-cols")
				div(class="text-box") 
					h1(class="heading-secondary") Create a user
					form(class="form-1-cols" id="createUserForm")
						div 
							label.form__label(for='name') Name 
							input(name="name" type="text" id="name" required) 
							label(for="email") Email
							input(name="email" type="email" placeholder='user@example.com' id="email" required)
							label(for="mobile") Mobile
							input(name="mobile" type="number" id="mobile" required) 
							label(for="password") Password
							input(name="password" type="password" id="password" required) 
							label(for="passwordConfirm") Re-Type Password
							input(name="passwordConfirm" type="password" id="passwordConfirm" required)
							div(class="form-row")
								label(for="active" style="margin: 0;") User is Active
								input(type="checkbox" id="active" name="active" checked)
						div(class="form-buttons")
							a(
  							class="btn btn--form"
  							id="CreateUserButton"
  							href="#"
  							onclick="document.getElementById('createUserForm').dispatchEvent(new Event('submit', {cancelable: true, bubbles: true})); return false;"
							) Create
							a(class="btn btn--outline" id="cancelButton" href="/users/showAll") Cancel
```

## views/editEvent.pug

*Size: 3035 bytes*

```pug
extends base

block content
	main.main
	section(class="section")
		section(class="container")
			div(class="crudContainer-2-cols")
				div(class="text-box") 
					h1(class="heading-secondary") Edit Event
					form(class="form-2-cols" id="saveEventForm")
						div
							label(for="eventName") Event name
							input(name="eventName" type="text" value=`${event.eventName}` id="eventName" required)
						div
							label(for="eventLocation") Event Location
							input(name="eventLocation" type="text" value=`${event.eventLocation}` id="eventLocation" required)
						div
							label(for="eventType") Event Type
							input(name="eventType" type="text" value=`${event.eventType}` id="eventType")
						div 
							- const year = event.eventDate.toLocaleString("default", { year: "numeric" });
							- const  month = event.eventDate.toLocaleString("default", { month: "2-digit" });
							- const day = event.eventDate.toLocaleString("default", { day: "2-digit" });
							- const formattedDate = year + "-" + month + "-" + day;
							label(for="eventDate") Event date
							input(name="eventDate" type="date" value=`${formattedDate}` id="eventDate" required)
						div 
							label(for="eventStartTime") Event start time
							input(name="eventStartTime" type="time" value=`${event.eventStartTime}` id="eventStartTime" required)
						div 
							label(for="eventOrganiser") Event Organiser
							input(name="eventOrganiser" type="text" value=`${event.eventOrganiser}` id="eventOrganiser" required)
						div 
							label(for="eventNumOfCourts") Number of courts available for event
							input(name="eventNumOfCourts" type="number" value=`${event.eventNumOfCourts}` id="eventNumOfCourts" required)
						div 
							label(for="numOfStandOutsPerRound") Number of players resting per round
							input(name="numOfStandOutsPerRound" type="number" value=`${event.numOfStandOutsPerRound}` id="numOfStandOutsPerRound" required)
						div 
							label(for="eventNumOfRounds") Number of rounds in the event
							input(name="eventNumOfRounds" type="number" value=`${event.eventNumOfRounds}` id="eventNumOfRounds" required)
						div 
							label(for="eventNumOfPairings") Number of pairings per court
							input(name="eventNumOfPairings" type="number" value=`${event.eventNumOfPairings}` id="eventNumOfPairings" required)
						div 
							label(for="eventWaitListSize") Max number of players on wait list
							input(name="eventWaitListSize" type="number" value=`${event.eventWaitListSize}` id="eventWaitListSize" required)
							input(id="eventId" class="hiddenField" value=event._id)
						div.form-row
							label(for="active" class="form__label active-label") Is event Active?
							input(
								type="checkbox"
								id="active"
								name="active"
								class="active-checkbox"
								checked=event.active
							)
						div(class="form-buttons")
							button(class="btn btn--form" id="saveEventButton" type="submit") Save 
							a(class="btn btn--form" id="cancelButton" href="/events/showall") Cancel
```

## views/editSystemSettings.pug

*Size: 3044 bytes*

```pug
extends base

block content
  main.main
    section.section
      div.container
        div.crudContainer-2-cols
          div.text-box
            h1.heading-secondary Manage System Settings

            // Tabs
            ul.tabs
              li.tab.active(data-tab="system-defaults") System Defaults
              li.tab(data-tab="features") Features

            // Tab Contents
            div.tab-content#system-defaults.active
              form.form-2-cols(id="saveSystemSettingsForm")
                div
                  label(for="numOfStandOuts") Default Number of players resting per round
                  input(name="numOfStandOuts" type="number" value=systemSettings.systemDefaults.numOfStandOuts id="numOfStandOuts" required)
                div
                  label(for="numOfRounds") Default Number of rounds in an event
                  input(name="numOfRounds" type="number" value=systemSettings.systemDefaults.numOfRounds id="numOfRounds" required)
                div
                  label(for="numOfCourts") Default Number of courts in an event
                  input(name="numOfCourts" type="number" value=systemSettings.systemDefaults.numOfCourts id="numOfCourts")
                div
                  label(for="numOfPairingsPerCourt") Default Number pairings per court
                  input(name="numOfPairingsPerCourt" type="number" value=systemSettings.systemDefaults.numOfPairingsPerCourt id="numOfPairingsPerCourt" required)
                div
                  label(for="waitListSize") Default waiting list size
                  input(name="waitListSize" type="number" value=systemSettings.systemDefaults.waitListSize id="waitListSize" required)
                div.form-buttons
                  a.btn.btn--form(
                    id="saveSystemSettingsButton"
                    href="#"
                    onclick="document.getElementById('saveSystemSettingsForm').dispatchEvent(new Event('submit', {cancelable: true, bubbles: true})); return false;"
                  ) Save
                  a.btn.btn--outline(id="cancelButton" href="/events/showall") Cancel

            div.tab-content#features
              form.form-2-cols(id="saveFeaturesForm")
                div.form-row
                  label(for="teamCanEditScore" class="form__label active-label") Can teams edit scores?
                  input(
                    type="checkbox"
                    id="teamCanEditScore"
                    name="features[teamCanEditScore]"
                    checked=systemSettings.features.teamCanEditScore
                    class="active-checkbox"
                  )
                div.form-buttons
                  a.btn.btn--form(
                    id="saveFeaturesButton"
                    href="#"
                    onclick="document.getElementById('saveFeaturesForm').dispatchEvent(new Event('submit', {cancelable: true, bubbles: true})); return false;"
                  ) Save
                  a.btn.btn--outline(id="cancelButton" href="/events/showall") Cancel
```

## views/editUser.pug

*Size: 1060 bytes*

```pug
extends base

block content
	main.main
	section(class="section")
		div(class="crudContainer-1-cols")
			div(class="text-box") 
				h1(class="heading-secondary") Edit User
				form(class="form-1-cols" id="editUserForm")
					div
						label(for='name') Name
						input(id="name" type='text' value=user.name,required name='name')
						label(for='email') Email address
						input(id="email" type='email' value=user.email required name='email')
						label(for='mobile') Mobile Phone number
						input(id="mobile" type='number' value=user.mobile required name='mobile')
						input(id="userId" class="hiddenField" value=user._id)
						div.form-row
							label(for="active" class="form__label active-label") Is user Active?
							input(
								type="checkbox"
								id="active"
								name="active"
								class="active-checkbox"
								checked=user.active
							)
					div(class="form-buttons")
						button(class="btn btn--form" id="editUserButton" type="submit") Save
						a(class="btn btn--outline" id="cancelButton" href="/users/showall") Cancel
```

## views/error.pug

*Size: 206 bytes*

```pug
extends base

block content

  main.main
    .error
    .error__title
      h2.heading-secondary.heading-secondary--error Uh oh! Something went wrong!   
      h2.error__emoji 😢 🤯
    .error__msg= msg
```

## views/homepage.pug

*Size: 456 bytes*

```pug
extends base

block content 

	main.main
		section(class="section")
			div(class="homepage")
				div(class="homepage-text-box") 
					h1(class="heading-primary") Let's play !!!
					p(class="homepage-description")
						a(href="/me/login" class="btn btn--form margin-right-sm") Login
						a(href="/me/signUp" class="btn btn--outline") Signup
				div( class="homepage-img-box")
					img(src="img/homepage.png" class="homepage-img" alt="PickleBall Picture")
```

## views/includes/_footer.pug

*Size: 17 bytes*

```pug
p a lovely footer
```

## views/includes/_header.pug

*Size: 316 bytes*

```pug
header.header
  a.logo(href="/")
    img(src="/img/logo.png", alt="Pickle Logo")
  if showNav !== false
    if userRole !== null
      case userRole
        when 'clubAdmin'
          include _navLoggedInAsAdmin
        when 'user'
          include _navLoggedInAsUser
        default
          // optionally nothing
```

## views/includes/_navLogOut.pug

*Size: 58 bytes*

```pug
a(class="main-nav-link" id="logOutButton" href="#") Logout
```

## views/includes/_navLoggedInAsAdmin.pug

*Size: 1491 bytes*

```pug
// Desktop Nav
nav.main-nav
	ul.main-nav-list
		li.left-nav
			a(class="main-nav-link user-display" href="#") Hi #{userName} !!
		li.center-nav
			ul.center-nav-list
				li
					a(class="main-nav-link" href="/users/showAll") Manage Users
				li
					a(class="main-nav-link" href="/events/showAll") Manage Events
				li
					a(class="main-nav-link" href="/events/showAllSchedules") Manage Schedules
				li
					a(class="main-nav-link" href="/settings/get") Manage Settings

		li.right-nav
			a(class="main-nav-link settings-toggle" href="#")
				ion-icon(name="settings-outline")
			ul.settings-dropdown
				li
					a(class="main-nav-link" href="/events/noShowForm") Manage no show
				li
					a(class="main-nav-link" href="/me/myAccountDetails") My Account Details
				li
					a(class="main-nav-link" href="/me/myPasswordUpdate") Update My Password
				li
					a(class="main-nav-link logOutButton" href="#") Logout

// Mobile Nav Header (greeting + menu button)
div.mobile-nav-header
	span.mobile-user-greeting.subheading Hi #{userName} !!
	button.btn-mobile-nav#mobileNavToggle(type="button" aria-label="Toggle navigation")
		ion-icon(name="menu-outline" class="icon-mobile-nav icon-menu")
		ion-icon(name="close-outline" class="icon-mobile-nav icon-close")

// Mobile Drawer (hidden by default, toggled by JS)
div.mobile-drawer
	ul.mobile-nav-list
		li
			a(class="main-nav-link" href="/events/noShowForm") Manage No show
		li
			a(class="main-nav-link logOutButton" href="/logout") Logout
```

## views/includes/_navLoggedInAsUser.pug

*Size: 1493 bytes*

```pug
// Desktop Nav
nav.main-nav
	ul.main-nav-list
		li.left-nav
			a(class="main-nav-link user-display" href="#") Hi #{userName} !!
		li.center-nav
			ul.center-nav-list
				li
					a(class="main-nav-link" href="/events/browseNew") Book an event
				li
					a(class="main-nav-link" href="/events/myBrowse") Browse My Events
		li.right-nav
			a(class="main-nav-link settings-toggle" href="#")
				ion-icon(name="settings-outline")
			ul.settings-dropdown
				li
					a(class="main-nav-link" href="/me/myAccountDetails") My Account Details
				li
					a(class="main-nav-link" href="/me/myPasswordUpdate") Update My Password
				li
					a(class="main-nav-link logOutButton" href="#") Logout

// Mobile Nav Header (greeting + menu button)
div.mobile-nav-header
	span.mobile-user-greeting.subheading Hi #{userName} !!
	button.btn-mobile-nav#mobileNavToggle(type="button" aria-label="Toggle navigation")
		ion-icon(name="menu-outline" class="icon-mobile-nav icon-menu")
		ion-icon(name="close-outline" class="icon-mobile-nav icon-close")

// Mobile Drawer (hidden by default, toggled by JS)
div.mobile-drawer
	ul.mobile-nav-list
		li
			a(class="main-nav-link" href="/events/browseNew") Book an event
		li
			a(class="main-nav-link" href="/events/myBrowse") Browse My Events
		li
			a(class="main-nav-link" href="/me/myAccountDetails") My Account Details
		li
			a(class="main-nav-link" href="/me/myPasswordUpdate") Update My Password
		li
			a(class="main-nav-link logOutButton" href="/logout") Logout

```

## views/includes/_pagination.pug

*Size: 412 bytes*

```pug
if totalPages > 1
  nav.pagination
    ul.pagination-list
      if currentPage > 1
        li
          a(href=`?page=${currentPage - 1}`) Previous
      - for (var pageNum = 1; pageNum <= totalPages; pageNum++)
        li(class=pageNum === currentPage ? 'active' : '')
          a(href=`?page=${pageNum}`) #{pageNum}
      if currentPage < totalPages
        li
          a(href=`?page=${currentPage + 1}`) Next
```

## views/includes/_usernameGreeting.pug

*Size: 56 bytes*

```pug
a(class="main-nav-link" id="userNameGreeting" href="#") 
```

## views/login.pug

*Size: 1097 bytes*

```pug
extends base

block content

	main.main
		section(class="section")
			div(class="crudContainer-1-cols")
				div(class="text-box") 
					h1(class="heading-secondary") Log into your account
					p(class="normal-text") The "go to" place to book all your pickle ball games
					form(class="form-1-cols" id="loginForm")
						div
							label(for="email") Email
							input(name="email" type="email" placeholder='you@example.com' id="email" required)
							label(for="password") Password
							input(name="password" type="password" id="password" required)
							button(type="button" id="togglePassword" class="show-password-link") Show Password
              
						div(class="form-buttons")
							a(
  							class="btn btn--form"
  							id="loginButton"
  							href="#"
  							onclick="document.getElementById('loginForm').dispatchEvent(new Event('submit', {cancelable: true, bubbles: true})); return false;"
							) Login
							a(id="forgotPasswordLink" class="text-link" href="/me/forgotPassword") Forgot Password?  
							a(class="btn btn--outline" id="cancelButton" href="/") Cancel
```

## views/myAccountDetails.pug

*Size: 1042 bytes*

```pug
extends base

block content

	main.main
		section(class="section")
			div(class="crudContainer-1-cols")
				div(class="text-box") 
					h1(class="heading-secondary") Account Details
					form(class="form-1-cols" id="acDetailsForm")
						div
							label(for="name") Name
							input(name="name" type="text" id="name" value=user.name required)
							label(for="email") Email
							input(name="email" type="email" placeholder='you@example.com' id="email"  value=user.email required)
							label(for="mobile") Mobile
							input(name="mobile" type="number" id="mobile" value=user.mobile required)
							input(type="hidden" id="userId" value=user._id)
              
						div(class="form-buttons")
							a(
  							class="btn btn--form"
  							id="saveAccountDetailsButton"
  							href="#"
  							onclick="document.getElementById('acDetailsForm').dispatchEvent(new Event('submit', {cancelable: true, bubbles: true})); return false;"
							) Save
							a(class="btn btn--outline" id="cancelButton" href="/events/myBrowse") Cancel
```

## views/myPasswordForgot.pug

*Size: 593 bytes*

```pug
extends base

block content

	main.main
		section(class="section")
			div(class="crudContainer-1-cols")
				div(class="text-box")
					div(class="acResetPassword-text-box") 
						h1(class="heading-secondary") Forgot Your Password
						form(class="form-1-cols" id="forgotPasswordForm")
							div
								label(for="email") Your Email
								input(name="email" type="email" id="email" required)

							div(class="form-buttons")
								button(class="btn btn--form" id="forgotPasswordButton" type="submit") Submit
								a(class="btn btn--outline" id="cancelButton" href="/me/login") Cancel
```

## views/myPasswordReset.pug

*Size: 996 bytes*

```pug
extends base

block content

	main.main
		section(class="section")
			div(class="crudContainer-1-cols")
				div(class="text-box")
					div(class="acResetPassword-text-box") 
						h1(class="heading-secondary") Reset Your Password
						form(class="form-1-cols" id="resetPasswordForm")
							label(for="newPassword") New Password
							input(name="newPassword" type="password" id="newPassword" required)
							button(type="button" id="togglePassword" class="show-password-link") Show Password
							label(for="newPasswordConfirm") New Password Confirm
							input(name="newPasswordConfirm" type="password" id="newPasswordConfirm" required)
							button(type="button" id="togglePassword" class="show-password-link") Show Password
							p(id="resetToken" class="hiddenField")=`${data.resetToken}`

							div(class="form-buttons")
								button(class="btn btn--form" id="resetPasswordButton" type="submit") Save Details
								a(class="btn btn--outline" id="cancelButton" href="/") Cancel


```

## views/myPasswordUpdate.pug

*Size: 1279 bytes*

```pug
extends base

block content

	main.main
		section(class="section")
			div(class="container")
				div(class="crudContainer-1-cols")
					div(class="text-box") 
						h1(class="heading-secondary") Update Your Password
						form(class="form-1-cols" id="updatePasswordForm")
							div
								label(for="currentPassword") Current Password
								input(name="currentPassword" type="password" id="currentPassword" required)
								label(for="newPassword") New Password
								input(name="newPassword" type="password" id="newPassword" required)
								button(type="button" id="togglePassword" class="show-password-link") Show Password
								label(for="newPasswordConfirm") New Password Confirm
								input(name="newPasswordConfirm" type="password" id="newPasswordConfirm" required)
								button(type="button" id="togglePassword" class="show-password-link") Show Password
							p(id="userId" class="hiddenField")=`${user._id}`

							div(class="form-buttons")
								a(class="btn btn--form" id="updatePasswordButton" href="#"
  								onclick="document.getElementById('updatePasswordForm').dispatchEvent(new Event('submit', {cancelable: true, bubbles: true})); return false;"
								) Update Password
								a(class="btn btn--outline" id="cancelButton" href="/") Cancel
```

## views/noShowEvent.pug

*Size: 1789 bytes*

```pug
extends base

block content
  main.main
    section.section
      div.container
        h2.heading-secondary Mark No Show
        form#noShowForm.form-1-cols(method="post" action="/api/v1/events/noShow")
          label(for="eventId") Select Event
          select#eventId(name="eventId" required)
            each event in events
              option(value=event._id)= event.eventName + ' (' + event.eventDate.toLocaleDateString() + ')'
          label(for="userId") Select No Show User
          select#userId(name="userId" required)
            //- This will be dynamically populated via JS after event selection
          button.btn.btn--form(type="submit") Mark as No Show

  script.
    document.addEventListener('DOMContentLoaded', async function() {
      const eventSelect = document.getElementById('eventId');
      const userSelect = document.getElementById('userId');
      async function populateUsers(eventId) {
        if (!eventId) {
          userSelect.innerHTML = '';
          return;
        }
        const res = await fetch(`/api/v1/events/${eventId}`);
        const event = await res.json();
        userSelect.innerHTML = '';
        if (event.data && event.data.event && event.data.event.eventBookings) {
          event.data.event.eventBookings.forEach(booking => {
            const opt = document.createElement('option');
            opt.value = booking.userId;
            opt.textContent = booking.userName;
            userSelect.appendChild(opt);
          });
        }
      }
      // Populate on page load for the first event
      if (eventSelect.value) {
        populateUsers(eventSelect.value);
      }
      // Populate on event change
      eventSelect.addEventListener('change', function() {
        populateUsers(this.value);
      });
    });
```

## views/scheduleCalculator.pug

*Size: 1243 bytes*

```pug
doctype html
html(lang="en")
  head
    meta(charset="UTF-8")
    title Pickle Event Schedule Calculator
    style.
      body {
        font-family: Arial, sans-serif;
        margin: 2em;
      }
      label {
        display: block;
        margin-top: 1em;
      }
      input[type="number"] {
        width: 60px;
      }
      .result {
        margin-top: 2em;
        padding: 1em;
        border: 1px solid #ccc;
        background: #f9f9f9;
      }
      .error {
        color: red;
      }
      .hidden {
        display: none;
      }
  body
    h2 Pickle Event Schedule Calculator
    form#scheduleForm
      label
        | Number of courts:
        input(type="number", id="numCourts", min="1", value="3", required=true)
      label
        | Pairings per court:
        input(type="number", id="numPairings", min="1", value="2", required=true)
      label
        | Rest rounds per player (event):
        input(type="number", id="restsPerPlayer", min="0", value="2", required=true)
      div#roundsInputContainer.hidden
        label
          | Number of rounds:
          input(type="number", id="numRounds", min="1")
      button(type="submit") Calculate
    div.result#result
    script(src="./js/scheduleCalculator.js")
```

## views/showAllEvents.pug

*Size: 1725 bytes*

```pug
extends base

block content

	main
		section.section-list
			div.container
				form(method="get" action="" class="filter-form")
					label(for="organiser") Filter by organiser:
					input#organiser(type="text", name="organiser", value=organiser placeholder="Enter organiser")

					label(for="date") Filter by date:
					input#date(type="date", name="date", value=date)

					label Filter by status:
					input(type="radio" id="all" name="active" value="" checked=(active === '' || !active))
					label(for="all") All
					input(type="radio" id="active" name="active" value="true" checked=(active === 'true'))
					label(for="active") Active
					input(type="radio" id="inactive" name="active" value="false" checked=(active === 'false'))
					label(for="inactive") Inactive

					button(type="submit") Filter

				div.events-table
					p.subheading Name
					p.subheading Organiser
					p.subheading Date
					p.subheading Time
					a(href="/events/create")
						ion-icon.subheading(name="add-outline")
					p.subheading

					each event in events
						div.table-row
							p.listItemText= event.eventName
							p.listItemText= event.eventOrganiser
							- const options = {weekday: "short", year: "numeric", month: "short", day: "numeric"}
							- const eventDate = event.eventDate.toLocaleDateString('en-GB',options)
							p.listItemText= eventDate
							p.listItemText= event.eventStartTime
							a.deleteEventButtons(href="#")
								p.eventId.hiddenField= event._id
								ion-icon.listItemText.actions-icon(name="trash-outline")
							a.editEventButtons(href="#")
								p.eventId.hiddenField= event._id
								ion-icon.listItemText.actions-icon(name="pencil-outline")

				include includes/_pagination.pug
```

## views/showAllSchedules copy.pug

*Size: 1210 bytes*

```pug
extends base

block content

	main
		section(class="section-list")
			div(class="container")
				div(class="events-table")
					p(class="subheading")="Event Name"
					p(class="subheading")="Organiser"
					p(class="subheading")="Date"
					p(class="subheading")="Time"
					a(href="/events/create")
						ion-icon(class="subheading" name="add-outline")
					p(class="subheading")=""
					
					each event in events
						div(class="table-row")
							p(class="listItemText")=`${event.eventName}`
							p(class="listItemText")=`${event.eventOrganiser}`
							- const options = {weekday: "short", year: "numeric", month: "short", day: "numeric"}
							- const eventDate = event.eventDate.toLocaleDateString('en-GB',options)
							p(class="listItemText")=`${eventDate}`
							p(class="listItemText")=`${event.eventStartTime}`
							a(href="#" class="deleteEventButtons")
								p(class="eventId hiddenField")=`${event._id}`
								ion-icon(class="listItemText actions-icon" name="trash-outline")
							a(href="#" class="editEventButtons")
								p(class="eventId hiddenField")=`${event._id}`
								ion-icon(class="listItemText actions-icon" name="pencil-outline")
			include includes/_pagination.pug

```

## views/showAllSchedules.pug

*Size: 1001 bytes*

```pug
extends base

block content

	main
		section.section-list
			div.container
				form(method="get" action="" class="filter-form")
					label(for="organiser") Filter by organiser:
					input#organiser(type="text", name="organiser", value=organiser placeholder="Enter organiser")
					label(for="date") Filter by date:
					input#date(type="date", name="date", value=date)
					button(type="submit") Filter

				div.schedule-table
					p.subheading Event Name
					p.subheading Organiser
					p.subheading Date
					p.subheading Time
					each event in events
						div.table-row
							p.listItemText
								a(href=`/events/viewMasterSchedule/${event._id}`)= event.eventName
							p.listItemText= event.eventOrganiser
							- const options = {weekday: "short", year: "numeric", month: "short", day: "numeric"}
							- const eventDate = event.eventDate.toLocaleDateString('en-GB',options)
							p.listItemText= eventDate
							p.listItemText= event.eventStartTime
			include includes/_pagination.pug
```

## views/showAllUsers.pug

*Size: 1899 bytes*

```pug
extends base

block content

  main
    section.section-list
      div.container
        //- Filter form
        form(method="get" action="" class="filter-form")
          label(for="username") Filter by username:
          input#username(type="text", name="username", value=username placeholder="Enter username")
          
          label(for="role") Filter by role:
          select#role(name="role")
            option(value="") All
            option(value="admin" selected=(role === 'admin')) Admin
            option(value="user" selected=(role === 'user')) User

          label Filter by status:
          div(style="display: flex; gap: 1rem; align-items: center;")
            input(type="radio" id="all" name="active" value="" checked=(active === '' || !active))
            label(for="all") All
            input(type="radio" id="active" name="active" value="true" checked=(active === 'true'))
            label(for="active") Active
            input(type="radio" id="inactive" name="active" value="false" checked=(active === 'false'))
            label(for="inactive") Inactive

          button(type="submit") Filter

        div.users-table
          p.subheading USERNAME
          p.subheading Email
          p.subheading ROLE
          a(href="/users/create")
            ion-icon.subheading(name="add-outline")
          p.subheading

          each user in users
            div.table-row
              p.listItemText= user.name
              p.listItemText= user.email
              p.listItemText= user.role
              a.deleteUserButtons(href="#")
                p.userId.hiddenField= user._id
                ion-icon.listItemText.actions-icon(name="trash-outline")
              a.editUserButtons(href="#")
                ion-icon.listItemText.actions-icon(name="pencil-outline")
                p.userId.hiddenField= user._id

        include includes/_pagination.pug
```

## views/signUp.pug

*Size: 1217 bytes*

```pug
extends base

block content

	main.main
		section(class="section")
			div(class="crudContainer-1-cols")
				div(class="text-box") 
					h1(class="heading-secondary") Sign Up
					p(class="normal-text") The "go to" place to book all your pickle ball games
					form(class="form-1-cols" id="signUpForm")
						div 
							label(for='name') Name 
							input(name="name" type="text" id="name" required) 
							label(for="email") Email
							input(name="email" type="email" placeholder='you@example.com' id="email" required)
							label(for="mobile") Mobile
							input(name="mobile" type="number" id="mobile" required) 
							label(for="password") Password
							input(name="password" type="password" id="password" required) 
							label(for="passwordConfirm") Re-Type Password
							input(name="passwordConfirm" type="password" id="passwordConfirm" required)
							
						div(class="form-buttons")
							a(
  							class="btn btn--form"
								id="signUpButton"
								href="#"
								onclick="document.getElementById('signUpForm').dispatchEvent(new Event('submit', {cancelable: true, bubbles: true})); return false;"
							) Sign Up
							a(class="btn btn--outline" id="cancelButton" href="/") Cancel

```

## views/viewMasterSchedule copy.pug

*Size: 2473 bytes*

```pug
extends base

block content
	main.main
		- const options = {weekday: "short", year: "numeric", month: "short", day: "numeric"};
		- const eventDate = event.eventDate.toLocaleDateString(undefined, options);
		- const nameDateTimeString = `${event.eventName}` + " on " + `${eventDate}` + " @ " + `${event.eventStartTime}` + " in " + `${event.eventLocation}`;
		p.subheading.center-text= nameDateTimeString

		section.section-list
			div.container
				div.mySchedule-table
					each matchData in paginatedMatches
						div.table-row
							div.row-pair
								span.label Round :
								span.value= matchData.roundIndex + 1
							div.row-pair
								span.label Court
								span.value= matchData.match.court +1
							div.row-pair
								span.label Team A :
								span.value
									each player in matchData.match.teamA
										span.listItemText= player.name + ' '
							div.row-pair
								span.label Team B :
								span.value
									each player in matchData.match.teamB
										span.listItemText= player.name + ' '
							// Score column (horizontal)
							div.row-pair
								span.label Score :
								span.value #{typeof matchData.match.teamAScore === "number" ? matchData.match.teamAScore : 0} / #{typeof matchData.match.teamBScore === "number" ? matchData.match.teamBScore : 0}
							div.row-pair.enter-score-column
								button.btn.score-button(
									type="button"
									data-round=matchData.round,
									data-matchindex=matchData.matchIndex,
									data-eventid=event._id,
									data-teama-score=matchData.match.teamAScore,
									data-teamb-score=matchData.match.teamBScore
								)
									if matchData.hasScore 
										| Edit Score
									else 
										| Enter Score

				// Popup Modal for entering scores (only one modal needed)
				div#scoreModal.modal
					div.modal-content
						span.close &times;
						p.subheading Enter Match Score
						form#scoreForm.form-2-cols
							input(type="hidden", name="eventId", id="eventId", value=event._id)
							input(type="hidden", name="roundIndex", id="roundIndex")
							input(type="hidden", name="matchIndex", id="matchIndex")
							div
								label(for="teamAScore") Team A Score:
								input(type="number", name="teamAScore", min="0", id="teamAScore")
							div
								label(for="teamBScore") Team B Score:
								input(type="number", name="teamBScore", min="0", id="teamBScore")
							div
								button(type="submit", class="btn btn--form") Submit Score
```

## views/viewMasterSchedule.pug

*Size: 3493 bytes*

```pug
extends base

block content
	main.main
		- const options = {weekday: "short", year: "numeric", month: "short", day: "numeric"};
		- const eventDate = event.eventDate.toLocaleDateString(undefined, options);
		- const nameDateTimeString = `${event.eventName}` + " on " + `${eventDate}` + " @ " + `${event.eventStartTime}` + " in " + `${event.eventLocation}`;
		p.subheading.center-text= nameDateTimeString

		section.section-list
			div.container
				form.filter-form(method="GET", action="")
					label(for="roundSelect") Filter by round:
					select#roundSelect(name="round")
						option(value="all" selected=(round == "all")) All Rounds
						- for (let i = 0; i < roundsCount; i++)
							option(value=i+1 selected=(round == (i+1).toString())) Round #{i+1}
					button(type="submit" class="btn btn--form") Filter
					
				div.mySchedule-table
					each matchData, idx in paginatedMatches
						div.table-row
							div.row-pair
								span.label Round :
								span.value= matchData.roundIndex + 1
							div.row-pair
								span.label Court
								span.value= matchData.match.court +1
							div.row-pair
								span.label Team A :
								span.value
									each player in matchData.match.teamA
										span.listItemText= player.name + ' '
							div.row-pair
								span.label Team B :
								span.value
									each player in matchData.match.teamB
										span.listItemText= player.name + ' '
							// Score column (horizontal)
							div.row-pair
								span.label Score :
								span.value #{typeof matchData.match.teamAScore === "number" ? matchData.match.teamAScore : 0} / #{typeof matchData.match.teamBScore === "number" ? matchData.match.teamBScore : 0}

							div.row-pair.enter-score-column
								button.btn.score-button(
									type="button"
									data-round=matchData.roundIndex,
									data-matchindex=matchData.matchIndex,
									data-eventid=event._id,
									data-teama-score=matchData.match.teamAScore,
									data-teamb-score=matchData.match.teamBScore
								)
									if matchData.hasScore 
										| Edit Score
									else 
										| Enter Score

						- const nextMatch = paginatedMatches[idx + 1]
						- const isLastMatchOfRound = !nextMatch || nextMatch.roundIndex !== matchData.roundIndex
						if isLastMatchOfRound
							div.table-row
								div.row-pair.resting-row(style="grid-column: 1 / -1")
									span.label Players Resting :
									span.value.resting-value
										- const standOuts = event.rounds[matchData.roundIndex].standOuts
										if standOuts && standOuts.length
											each player in standOuts
												span.listItemText= player.name + ', '
										else
											span.listItemText None
										
				// Popup Modal for entering scores (only one modal needed)
				div#scoreModal.modal
					div.modal-content
						span.close &times;
						p.subheading Enter Match Score
						form#scoreForm.form-2-cols
							input(type="hidden", name="eventId", id="eventId", value=event._id)
							input(type="hidden", name="roundIndex", id="roundIndex")
							input(type="hidden", name="matchIndex", id="matchIndex")
							div
								label(for="teamAScore") Team A Score:
								input(type="number", name="teamAScore", min="0", id="teamAScore")
							div
								label(for="teamBScore") Team B Score:
								input(type="number", name="teamBScore", min="0", id="teamBScore")
							div
								button(type="submit", class="btn btn--form") Submit Score

				include includes/_pagination.pug
```

## views/viewMySchedule copy.pug

*Size: 2932 bytes*

```pug
extends base

block content
	main.main
		- const options = {weekday: "short", year: "numeric", month: "short", day: "numeric"};
		- const eventDate = event.eventDate.toLocaleDateString(undefined, options);
		- const nameDateTimeString = `${event.eventName}` + " on " + `${eventDate}` + " @ " + `${event.eventStartTime}` + " in " + `${event.eventLocation}`;
		p.subheading.center-text= nameDateTimeString

		section.section-list
			div.container
				div.mySchedule-table
					each matchData in filteredMatches
						div.table-row
							div.row-pair
								span.label Round :
								span.value= matchData.round + 1
							div.row-pair
								span.label Court
								span.value= matchData.match.court+1
							div.row-pair
								span.label My Team :
								span.value
									each player in matchData.match[matchData.playerTeam]
										if typeof player.userId === 'string' || typeof player.userId === 'number'
											if player.userId.toString() === userId.toString()
												span.listItemText(style="font-weight:700; color:#e67e22")= player.name + ' '
										else
											span.listItemText= player.name + ' '
									else
										span.listItemText= player.name + ' '
							div.row-pair
								span.label Opposing Team :
								span.value
									- const opposingTeam = matchData.playerTeam === 'teamA' ? 'teamB' : 'teamA'
									each player in matchData.match[opposingTeam]
										span.listItemText= player.name + ' '

							// Score column (horizontal)
							div.row-pair
								span.label Score :
								span.value #{typeof matchData.match.teamAScore === "number" ? matchData.match.teamAScore : 0} / #{typeof matchData.match.teamBScore === "number" ? matchData.match.teamBScore : 0}
							div.row-pair.enter-score-column
								if features && features.teamCanEditScore
									button.btn.score-button(
										data-round=matchData.round,
										data-matchindex=matchData.matchIndex,
										data-eventid=event._id,
										data-teama-score=matchData.match.teamAScore,
										data-teamb-score=matchData.match.teamBScore
									)
										if matchData.hasScore 
											| Edit Score
										else 
											| Enter Score

				// Popup Modal for entering scores (only one modal needed)
				div#scoreModal.modal
					div.modal-content
						span.close &times;
						p.subheading Enter Match Score
						form#scoreForm.form-2-cols
							input(type="hidden", name="eventId", id="eventId", value=event._id)
							input(type="hidden", name="roundIndex", id="roundIndex")
							input(type="hidden", name="matchIndex", id="matchIndex")
							div
								label(for="teamAScore") Team A Score:
								input(type="number", name="teamAScore", min="0", id="teamAScore")
							div
								label(for="teamBScore") Team B Score:
								input(type="number", name="teamBScore", min="0", id="teamBScore")
							div
								button(type="submit", class="btn btn--form") Submit Score
```

## views/viewMySchedule.pug

*Size: 3141 bytes*

```pug
extends base

block content
	main.main
		- const showScoreButton = features && features.teamCanEditScore
		- const options = {weekday: "short", year: "numeric", month: "short", day: "numeric"};
		- const eventDate = event.eventDate.toLocaleDateString(undefined, options);
		- const nameDateTimeString = `${event.eventName}` + " on " + `${eventDate}` + " @ " + `${event.eventStartTime}` + " in " + `${event.eventLocation}`;
		p.subheading.center-text= nameDateTimeString

		section.section-list
			div.container
				// Resting info message
				if restingRounds && restingRounds.length
					div.resting-info.center-text
						| You will be resting in round(s):
						each roundNum, idx in restingRounds
							span.label= ' ' + roundNum + (idx < restingRounds.length - 1 ? ',' : '')
				else
					div.resting-info.center-text
						| You are playing in every round.

				div.mySchedule-table(style=`display:grid;grid-template-columns:${showScoreButton ? '1fr 1fr 4fr 4fr 3fr 2fr' : '1fr 1fr 4fr 4fr 2fr'};gap:1.2rem;`)
					each matchData in filteredMatches
						div.table-row
							div.row-pair
								span.label Round :
								span.value= matchData.round + 1
							div.row-pair
								span.label Court
								span.value= matchData.match.court+1
							div.row-pair
								span.label My Team :
								span.value
									each player in matchData.match[matchData.playerTeam]
										span.listItemText= player.name + ' '
							div.row-pair
								span.label Opposing Team :
								span.value
								- const opposingTeam = matchData.playerTeam === 'teamA' ? 'teamB' : 'teamA'
								each player in matchData.match[opposingTeam]
									span.listItemText= player.name + ' '
							// Score column (horizontal)
							div.row-pair
								span.label Score :
								span.value #{typeof matchData.match.teamAScore === "number" ? matchData.match.teamAScore : 0} / #{typeof matchData.match.teamBScore === "number" ? matchData.match.teamBScore : 0}
							if showScoreButton
								div.row-pair.enter-score-column
									button.btn.score-button(
										data-round=matchData.round,
										data-matchindex=matchData.matchIndex,
										data-eventid=event._id,
										data-teama-score=matchData.match.teamAScore,
										data-teamb-score=matchData.match.teamBScore
									)
										if matchData.hasScore 
											| Edit Score
										else 
											| Enter Score
				// Popup Modal for entering scores (only one modal needed)
				div#scoreModal.modal
					div.modal-content
						span.close &times;
						p.subheading Enter Match Score
						form#scoreForm.form-2-cols
							input(type="hidden", name="eventId", id="eventId", value=event._id)
							input(type="hidden", name="roundIndex", id="roundIndex")
							input(type="hidden", name="matchIndex", id="matchIndex")
							div
								label(for="teamAScore") Team A Score:
								input(type="number", name="teamAScore", min="0", id="teamAScore")
							div
								label(for="teamBScore") Team B Score:
								input(type="number", name="teamBScore", min="0", id="teamBScore")
							div
								button(type="submit", class="btn btn--form") Submit Score
```

## ~

*Size: 286 bytes*

```
Merge branch 'main' of https://github.com/gerohara99/pickle
# Please enter a commit message to explain why this merge is necessary,
# especially if it merges an updated upstream into a topic branch.
#
# Lines starting with '#' will be ignored, and an empty message aborts
# the commit.

```

