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
