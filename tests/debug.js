const express = require("express");
const Event = require("../models/eventModel");
const User = require("../models/userModel");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const { promisify } = require("util");

const router = express.Router();

// Debug tools page - HTML UI for accessing debug functions
router.get("/tools", (req, res) => {
  const filePath = path.join(__dirname, "../public/html/debug.html");
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error("Error serving debug tools page:", err);
      res.status(err.status || 500).send("Error loading debug tools page");
    } else {
      console.log("Debug tools page served successfully");
    }
  });
});

// Debug route to check if events exist in the database
router.get("/events", async (req, res) => {
  try {
    const events = await Event.find();
    res.status(200).json({
      status: "success",
      results: events.length,
      data: {
        events: events.map((event) => ({
          id: event._id,
          name: event.eventName,
          date: event.eventDate,
          organiser: event.eventOrganiser,
        })),
      },
    });
  } catch (err) {
    console.error("Debug route error:", err);
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve events",
    });
  }
});

// Debug route to check if users exist in the database
router.get("/users", async (req, res) => {
  try {
    const User = require("../models/userModel");
    const users = await User.find().select("name email role");
    res.status(200).json({
      status: "success",
      results: users.length,
      data: {
        users: users.map((user) => ({
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        })),
      },
    });
  } catch (err) {
    console.error("Debug users route error:", err);
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve users",
    });
  }
});

// Debug route to check session information
router.get("/session", (req, res) => {
  try {
    // Return a sanitized version of the session
    const sessionInfo = req.session
      ? {
          userId: req.session.user?.userId,
          userName: req.session.user?.userName,
          userRole: req.session.user?.userRole,
          role: req.session.user?.role,
          isAuthenticated: !!req.session.user,
          sessionId: req.session.id,
          cookie: req.session.cookie
            ? {
                maxAge: req.session.cookie.maxAge,
                expires: req.session.cookie.expires,
                httpOnly: req.session.cookie.httpOnly,
                secure: req.session.cookie.secure,
              }
            : null,
        }
      : { session: "No session found" };

    res.status(200).json({
      status: "success",
      data: {
        session: sessionInfo,
        hasJwtCookie: !!req.cookies.jwt,
        connectSidCookie: !!req.cookies["connect.sid"],
      },
    });
  } catch (err) {
    console.error("Debug session error:", err);
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve session info",
    });
  }
});

// Debug route to check authentication status
router.get("/auth-check", (req, res) => {
  try {
    const isAuthenticated = !!req.session?.user;
    const userRole = req.session?.user?.role || "none";

    res.status(200).json({
      status: "success",
      data: {
        isAuthenticated,
        userRole,
        cookies: req.cookies,
      },
    });
  } catch (err) {
    console.error("Debug auth check error:", err);
    res.status(500).json({
      status: "error",
      message: "Failed to check authentication",
    });
  }
});

// Debug route to check JWT token
router.get("/jwt-check", async (req, res) => {
  try {
    const token = req.cookies.jwt;

    if (!token || token === "loggedout") {
      return res.status(200).json({
        status: "success",
        data: {
          hasToken: false,
          message: "No valid JWT token found in cookies",
        },
      });
    }

    try {
      const decoded = await promisify(jwt.verify)(
        token,
        process.env.JWT_SECRET
      );

      return res.status(200).json({
        status: "success",
        data: {
          hasToken: true,
          isValid: true,
          decoded,
          expiresAt: new Date(decoded.exp * 1000).toISOString(),
        },
      });
    } catch (jwtError) {
      return res.status(200).json({
        status: "success",
        data: {
          hasToken: true,
          isValid: false,
          error: jwtError.message,
        },
      });
    }
  } catch (err) {
    console.error("Debug JWT check error:", err);
    res.status(500).json({
      status: "error",
      message: "Failed to check JWT token",
    });
  }
});

// Route to save debug output to a file
router.post("/save-output", (req, res) => {
  try {
    if (!req.body || !req.body.output) {
      return res.status(400).json({
        status: "error",
        message: "No debug output provided",
      });
    }

    const timestamp = new Date().toISOString().replace(/:/g, "-");
    const fileName = `debug-output-${timestamp}.txt`;
    const filePath = path.join(__dirname, "..", "debug-logs", fileName);

    // Make sure the directory exists
    const dirPath = path.join(__dirname, "..", "debug-logs");
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Write the file
    fs.writeFileSync(filePath, req.body.output);

    res.status(200).json({
      status: "success",
      message: "Debug output saved successfully",
      filePath: `/debug-logs/${fileName}`,
    });
  } catch (err) {
    console.error("Error saving debug output:", err);
    res.status(500).json({
      status: "error",
      message: "Failed to save debug output",
    });
  }
});

// JWT verification route
router.get("/jwt-check", async (req, res) => {
  try {
    // Check if JWT exists
    if (!req.cookies.jwt || req.cookies.jwt === "loggedout") {
      return res.status(200).json({
        status: "info",
        message: "No JWT token found in cookies or logged out",
        hasToken: false,
      });
    }

    try {
      // Verify the token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      // Find the user
      const currentUser = await User.findById(decoded.id);

      if (!currentUser) {
        return res.status(200).json({
          status: "warning",
          message: "JWT valid but user not found",
          hasToken: true,
          isValid: true,
          userId: decoded.id,
          userExists: false,
        });
      }

      // Check if user changed password after token was issued
      const passwordChanged = currentUser.changedPasswordAfter(decoded.iat);

      return res.status(200).json({
        status: "success",
        message: "JWT token is valid",
        hasToken: true,
        isValid: true,
        user: {
          id: currentUser._id,
          email: currentUser.email,
          name: currentUser.name,
          role: currentUser.role,
        },
        passwordChanged,
        tokenIssued: new Date(decoded.iat * 1000).toISOString(),
        tokenExpires: new Date(decoded.exp * 1000).toISOString(),
      });
    } catch (err) {
      return res.status(200).json({
        status: "error",
        message: `JWT validation error: ${err.message}`,
        hasToken: true,
        isValid: false,
        error: err.message,
      });
    }
  } catch (err) {
    console.error("JWT check error:", err);
    res.status(500).json({
      status: "error",
      message: "Error checking JWT token",
    });
  }
});

module.exports = router;
