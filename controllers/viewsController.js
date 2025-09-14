const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const User = require("../models/userModel");
const Event = require("../models/eventModel");
const settings = require("../models/settingsModel");
const mongoose = require("mongoose");
const requestTimeout = require("../utils/requestTimeout");
const {
  buildRenderContext,
  renderPaginatedList,
  renderSingleDocument,
  renderSimpleView,
  renderEventList,
} = require("../utils/serverControllerUtils");

exports.getHomePage = [
  requestTimeout,
  catchAsync(async (req, res) => {
    res.status(200).render(
      "homepage",
      buildRenderContext(req, {
        title: "Pickle Admin !!!",
        showNav: false,
      })
    );
  }),
];

// INDIVIDUAL USER FUNCTIONALITY
exports.getLoginForm = [
  requestTimeout,
  (req, res) =>
    renderSimpleView(
      res,
      "login",
      buildRenderContext(req, {
        title: "log into your account",
        showNav: false,
      })
    ),
];

exports.getsignupForm = [
  requestTimeout,
  (req, res) =>
    renderSimpleView(
      res,
      "signUp",
      buildRenderContext(req, { title: "create your account", showNav: false })
    ),
];

exports.getMyAccountDetails = [
  requestTimeout,
  (req, res) =>
    renderSimpleView(
      res,
      "myAccountDetails",
      buildRenderContext(req, { title: "Your account" })
    ),
];

exports.myPasswordUpdate = [
  requestTimeout,
  (req, res) =>
    renderSimpleView(
      res,
      "myPasswordUpdate",
      buildRenderContext(req, { title: "Update Password" })
    ),
];

exports.forgotPassword = [
  requestTimeout,
  (req, res) =>
    renderSimpleView(
      res,
      "myPasswordForgot",
      buildRenderContext(req, { title: "Forgot Password", showNav: false })
    ),
];

exports.myPasswordReset = [
  requestTimeout,
  (req, res) => {
    const resetToken = req.params.resetToken;
    renderSimpleView(
      res,
      "myPasswordReset",
      buildRenderContext(req, {
        title: "Reset Password",
        resetToken,
        showNav: false,
      })
    );
  },
];

// ADMIN USER FUNCTIONALITY
exports.showAllUsers = [
  requestTimeout,
  catchAsync((req, res, next) => {
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
    renderPaginatedList({
      req,
      res,
      next,
      Model: User,
      filter,
      sort: { name: 1 },
      view: "showAllUsers",
      title: "All Users",
      extraContext: buildRenderContext(req, {
        username: req.query.username || "",
        role: req.query.role || "",
        active: typeof req.query.active !== "undefined" ? req.query.active : "",
      }),
    });
  }),
];

exports.createUser = [
  requestTimeout,
  (req, res) =>
    renderSimpleView(
      res,
      "createUser",
      buildRenderContext(req, { title: "Create User" })
    ),
];

exports.editUser = [
  requestTimeout,
  catchAsync((req, res, next) => {
    renderSingleDocument({
      req,
      res,
      next,
      Model: User,
      id: req.params.id,
      view: "editUser",
      title: "Edit User",
    });
  }),
];

// EVENTS FUNCTIONALITY
exports.createEvent = [
  requestTimeout,
  (req, res) =>
    renderSimpleView(
      res,
      "createEvent",
      buildRenderContext(req, {
        title: "Events",
        systemDefaults: req.session.systemDefaults,
      })
    ),
];

exports.showAllEvents = [
  requestTimeout,
  catchAsync((req, res, next) => {
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
    renderPaginatedList({
      req,
      res,
      next,
      Model: Event,
      filter,
      sort: { eventDate: 1 },
      view: "showAllEvents",
      title: "All Events",
      extraContext: {
        organiser: req.query.organiser || "",
        date: req.query.date || "",
      },
    });
  }),
];

exports.showAllSchedules = [
  requestTimeout,
  catchAsync((req, res, next) => {
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
    renderPaginatedList({
      req,
      res,
      next,
      Model: Event,
      filter,
      sort: { eventDate: 1 },
      view: "showAllSchedules",
      title: "All Schedules",
      extraContext: {
        organiser: req.query.organiser || "",
        date: req.query.date || "",
      },
    });
  }),
];

exports.browseMyEvents = [
  requestTimeout,
  catchAsync((req, res, next) => {
    const userId = req.session.user.userId;
    renderEventList({
      req,
      res,
      next,
      filter: { "eventBookings.userId": { $in: userId }, active: true },
      sort: { eventDate: 1 },
      view: "browseMyEvents",
      title: "Browse Events",
    });
  }),
];

exports.browseNewEvents = [
  requestTimeout,
  catchAsync((req, res, next) => {
    const userId = req.session.user.userId;
    renderEventList({
      req,
      res,
      next,
      filter: { "eventBookings.userId": { $nin: userId }, active: true },
      sort: { eventDate: 1 },
      view: "browseNewEvents",
      title: "Browse Events",
    });
  }),
];

exports.editEvent = [
  requestTimeout,
  catchAsync((req, res, next) => {
    renderSingleDocument({
      req,
      res,
      next,
      Model: Event,
      id: req.params.id,
      view: "editEvent",
      title: "Edit Event",
    });
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
