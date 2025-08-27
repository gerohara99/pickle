const path = require("path");
const express = require("express");
const authController = require("../controllers/authController");
const directHtmlController = require("../controllers/directHtmlController");
const htmlErrorController = require("../controllers/htmlErrorController");
const Event = require("../models/eventModel");
const paginate = require("../utils/paginate");

const router = express.Router();

// Homepage
router.get(
  "/",
  directHtmlController.serveHtmlWithData("homepage", async (req) => {
    return {
      title: "Pickle Admin",
      userRole: null,
      showNav: false,
    };
  })
);

// Error page - direct access
router.get("/error.html", htmlErrorController.serveErrorPage);

// Individual users
router.get(
  "/me/login",
  directHtmlController.serveHtmlWithData("login", async (req) => {
    return {
      title: "Log into your account",
      userRole: null,
      showNav: false,
    };
  })
);

router.get(
  "/me/signup",
  directHtmlController.serveHtmlWithData("signup", async (req) => {
    return {
      title: "Create your account",
      userRole: null,
      showNav: false,
    };
  })
);

router.get(
  "/me/myAccountDetails",
  authController.protect,
  directHtmlController.serveHtmlWithData("myAccountDetails", async (req) => {
    return {
      title: "Account Details",
      user: req.session.user,
      userRole: req.session.user.userRole,
      userName: req.session.user.userName,
      showNav: true,
    };
  })
);

router.get(
  "/me/myPasswordUpdate",
  authController.protect,
  directHtmlController.serveHtmlWithData("myPasswordUpdate", async (req) => {
    return {
      title: "Update Password",
      user: req.session.user,
      userRole: req.session.user.userRole,
      userName: req.session.user.userName,
      showNav: true,
    };
  })
);

router.get(
  "/me/forgotPassword",
  directHtmlController.serveHtmlWithData("myPasswordForgot", async (req) => {
    return {
      title: "Forgot Password",
      userRole: null,
      showNav: false,
    };
  })
);

router.get(
  "/me/myPasswordReset/:resetToken",
  directHtmlController.serveHtmlWithData("myPasswordReset", async (req) => {
    return {
      title: "Reset Password",
      token: req.params.resetToken,
      userRole: null,
      showNav: false,
    };
  })
);

// Admin user functionality
router.get(
  "/users/showAll",
  authController.isLoggedIn,
  directHtmlController.serveHtmlWithData("showAllUsers", async (req) => {
    try {
      const query = User.find().sort({ userName: 1 });
      const pagination = await paginate(query, req);

      return {
        title: "All Users",
        users: pagination.results,
        userRole: req.session.user.userRole,
        userName: req.session.user.userName,
        showNav: true,
        pagination: {
          currentPage: pagination.currentPage,
          totalPages: pagination.totalPages,
          results: pagination.results.length,
          limit: pagination.limit,
        },
      };
    } catch (err) {
      console.error("Error rendering showAllUsers:", err);
      throw new Error("Failed to render all users");
    }
  })
);

router.get(
  "/users/create",
  authController.protect,
  directHtmlController.serveHtmlWithData("createUser", async (req) => {
    return {
      title: "Create User",
      userRole: req.session.user.userRole,
      userName: req.session.user.userName,
      showNav: true,
    };
  })
);

router.get(
  "/users/get/:id",
  authController.isLoggedIn,
  directHtmlController.serveHtmlWithData("editUser", async (req) => {
    try {
      const user = await User.findById(req.params.id);

      if (!user) {
        throw new Error("User not found");
      }

      return {
        title: "Edit User",
        user: user,
        userRole: req.session.user.userRole,
        userName: req.session.user.userName,
        showNav: true,
      };
    } catch (err) {
      console.error("Error rendering editUser:", err);
      throw new Error("Failed to render edit user");
    }
  })
);

// Events
router.get(
  "/events/showAll",
  authController.isLoggedIn,
  directHtmlController.serveHtmlWithData("showAllEvents", async (req) => {
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

      const query = Event.find(filter).sort({ eventDate: 1 });
      const pagination = await paginate(query, req);

      return {
        title: "All Events",
        events: pagination.results,
        userRole: req.session.user.userRole,
        userName: req.session.user.userName,
        showNav: true,
        pagination: {
          currentPage: pagination.currentPage,
          totalPages: pagination.totalPages,
          results: pagination.results.length,
          limit: pagination.limit,
        },
        filters: {
          organiser: req.query.organiser || "",
          date: req.query.date || "",
          active: req.query.active || "",
        },
      };
    } catch (err) {
      console.error("Error rendering showAllEvents:", err);
      throw new Error("Failed to render all events");
    }
  })
);

router.get(
  "/events/showAllSchedules",
  authController.isLoggedIn,
  directHtmlController.serveHtmlWithData("showAllSchedules", async (req) => {
    try {
      const events = await Event.find({ active: true }).sort({ eventDate: 1 });

      return {
        title: "All Schedules",
        events: events,
        userRole: req.session.user.userRole,
        userName: req.session.user.userName,
        showNav: true,
      };
    } catch (err) {
      console.error("Error rendering showAllSchedules:", err);
      throw new Error("Failed to render all schedules");
    }
  })
);

router.get(
  "/events/viewMasterSchedule/:id",
  authController.isLoggedIn,
  directHtmlController.serveHtmlWithData("viewMasterSchedule", async (req) => {
    try {
      const event = await Event.findById(req.params.id);

      if (!event) {
        throw new Error("Event not found");
      }

      return {
        title: "Master Schedule",
        event: event,
        userRole: req.session.user.userRole,
        userName: req.session.user.userName,
        showNav: true,
      };
    } catch (err) {
      console.error("Error rendering viewMasterSchedule:", err);
      throw new Error("Failed to render master schedule");
    }
  })
);

router.get(
  "/events/browseNew",
  authController.isLoggedIn,
  directHtmlController.serveHtmlWithData("browseNewEvents", async (req) => {
    try {
      const userId = req.session.user.userId;
      const events = await Event.find({
        "eventBookings.userId": { $nin: userId },
        active: true,
      }).sort({ eventDate: 1 });

      return {
        title: "Browse Events",
        events: events,
        userRole: req.session.user.userRole,
        userName: req.session.user.userName,
        showNav: true,
      };
    } catch (err) {
      console.error("Error rendering browseNewEvents:", err);
      throw new Error("Failed to render browse new events");
    }
  })
);

router.get(
  "/events/myBrowse",
  authController.isLoggedIn,
  directHtmlController.serveHtmlWithData("browseMyEvents", async (req) => {
    try {
      const userId = req.session.user.userId;
      const events = await Event.find({
        "eventBookings.userId": { $in: userId },
        active: true,
      }).sort({ eventDate: 1 });

      // Check if user is in rounds for each event
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

      return {
        title: "Browse Events",
        events: events,
        userRole: req.session.user.userRole,
        userName: req.session.user.userName,
        showNav: true,
      };
    } catch (err) {
      console.error("Error rendering browseMyEvents:", err);
      throw new Error("Failed to render browse my events");
    }
  })
);

router.get(
  "/events/create",
  authController.protect,
  directHtmlController.serveHtmlWithData("createEvent", async (req) => {
    return {
      title: "Events",
      userRole: req.session.user.userRole,
      userName: req.session.user.userName,
      systemDefaults: req.session.systemDefaults,
      showNav: true,
    };
  })
);

router.get(
  "/events/get/:id",
  authController.isLoggedIn,
  directHtmlController.serveHtmlWithData("editEvent", async (req) => {
    try {
      const event = await Event.findById(req.params.id);

      if (!event) {
        throw new Error("Event not found");
      }

      return {
        title: "Edit Event",
        event: event,
        userRole: req.session.user.userRole,
        userName: req.session.user.userName,
        showNav: true,
      };
    } catch (err) {
      console.error("Error rendering editEvent:", err);
      throw new Error("Failed to render edit event");
    }
  })
);

router.get(
  "/events/viewMySchedule/:id",
  authController.isLoggedIn,
  directHtmlController.serveHtmlWithData("viewMySchedule", async (req) => {
    try {
      const event = await Event.findById(req.params.id);
      const userId = req.session.user.userId;

      if (!event) {
        throw new Error("Event not found");
      }

      return {
        title: "My Schedule",
        event: event,
        userId: userId,
        userRole: req.session.user.userRole,
        userName: req.session.user.userName,
        showNav: true,
      };
    } catch (err) {
      console.error("Error rendering viewMySchedule:", err);
      throw new Error("Failed to render my schedule");
    }
  })
);

router.get(
  "/settings/get",
  authController.isLoggedIn,
  authController.restrictTo("clubAdmin", "pickleAdmin"),
  directHtmlController.serveHtmlWithData("editSystemSettings", async (req) => {
    try {
      const systemSettings = await settings.findOne();

      return {
        title: "System Settings",
        settings: systemSettings,
        userRole: req.session.user.userRole,
        userName: req.session.user.userName,
        showNav: true,
      };
    } catch (err) {
      console.error("Error rendering editSystemSettings:", err);
      throw new Error("Failed to render system settings");
    }
  })
);

router.get(
  "/events/noShowForm",
  authController.protect,
  authController.restrictTo("clubAdmin", "pickleAdmin"),
  directHtmlController.serveHtmlWithData("noShowEvent", async (req) => {
    return {
      title: "No Show Form",
      userRole: req.session.user.userRole,
      userName: req.session.user.userName,
      showNav: true,
    };
  })
);

// Direct HTML routes - examples of how to use the directHtmlController

// Example of a route with static HTML
router.get("/html/login", directHtmlController.serveHtmlFile("login"));

// Example of a route with data injection
router.get(
  "/html/editUser/:id",
  authController.protect,
  directHtmlController.serveHtmlWithData("editUser", async (req) => {
    // This is just a placeholder for data retrieval
    // In a real implementation, you would fetch the user data here
    return {
      userId: req.params.id,
      timestamp: Date.now(),
    };
  })
);

// JSON API for client-side rendering
router.get(
  "/api/html/userData/:id",
  authController.protect,
  (req, res, next) => {
    try {
      // This would normally fetch data from the database
      res.status(200).json({
        status: "success",
        data: {
          userId: req.params.id,
          timestamp: Date.now(),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// Test route for HTML serving
router.get("/test-html", directHtmlController.serveHtmlFile("test"));

module.exports = router;
