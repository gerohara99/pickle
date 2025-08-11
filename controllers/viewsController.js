const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const User = require("../models/userModel");
const Event = require("../models/eventModel");
const { filter } = require("compression");
const settings = require("../models/settingsModel");
const paginate = require("../utils/paginate");

// Display HOMEPAGE
exports.getHomePage = catchAsync(async (req, res, next) => {
  res.status(200).render("homepage", {
    title: "Pickle Admin !!!",
    userRole: null,
    showNav: false,
  });
});

// INDIVIDAL USER FUNCTIONALITY (signup / logging in, viewing / changing own details / logging out)
exports.getLoginForm = (req, res) => {
  res.status(200).render("login", {
    title: "log into your account",
    userRole: null,
    showNav: false,
  });
};

exports.getsignupForm = (req, res) => {
  res.status(200).render("signUp", {
    title: "create your account",
    userRole: null,
    showNav: false,
  });
};

exports.getMyAccountDetails = (req, res) => {
  res.status(200).render("myAccountDetails", {
    title: "Your account",
    userRole: req.session.user.userRole,
    userName: req.session.user.userName,
    showNav: true,
  });
};

exports.myPasswordUpdate = (req, res) => {
  res.status(200).render("myPasswordUpdate", {
    title: "Update Password",
    userRole: req.session.user.userRole,
    userName: req.session.user.userName,
    showNav: true,
  });
};

exports.forgotPassword = (req, res) => {
  res.status(200).render("myPasswordForgot", {
    title: "Forgot Password",
    userRole: req.session.user.userRole,
    showNav: false,
  });
};

exports.myPasswordReset = (req, res) => {
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
};

//ADMIN USER FUNCTIONALITY (viewing all users / editing details / deleting users)

exports.showAllUsers = catchAsync(async (req, res, next) => {
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
    // If empty string, do not filter by active
  }

  const query = User.find(filter).sort({ name: 1 });
  const pagination = await paginate(query, req);

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
});

exports.createUser = (req, res) => {
  res.status(200).render("createUser", {
    title: "Create User",
    userRole: req.session.user.userRole,
    userName: req.session.user.userName,
    showNav: true,
  });
};

exports.editUser = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ _id: req.params.id });

  if (!user) {
    return next(new AppError("There is no user with that name", 404));
  }

  // Ensure active is a boolean for correct checkbox rendering
  res.status(200).render("editUser", {
    title: `${user.name} Name`,
    user: {
      ...user.toObject(),
      active: user.active === true || user.active === "true", // force boolean
    },
    userRole: req.session.user.userRole,
    userName: req.session.user.userName,
    showNav: true,
  });
});

// EVENTS FUNCTIONALITY
exports.createEvent = (req, res) => {
  res.status(200).render("createEvent", {
    title: "Events",
    userRole: req.session.user.userRole,
    userName: req.session.user.userName,
    systemDefaults: req.session.systemDefaults,
    showNav: true,
  });
};

exports.showAllEvents = catchAsync(async (req, res, next) => {
  const filter = {};

  // Filter by organiser (case-insensitive substring match)
  if (req.query.organiser) {
    filter.eventOrganiser = { $regex: req.query.organiser, $options: "i" };
  }

  // Filter by date (exact match, expects yyyy-mm-dd from input[type="date"])
  if (req.query.date) {
    // Convert to start and end of the day for matching
    const date = new Date(req.query.date);
    const nextDate = new Date(date);
    nextDate.setDate(date.getDate() + 1);
    filter.eventDate = { $gte: date, $lt: nextDate };
  }

  if (typeof req.query.active !== "undefined" && req.query.active !== "") {
    if (req.query.active === "true") filter.active = true;
    else if (req.query.active === "false") filter.active = false;
    // If empty string, do not filter by active
  }

  const query = Event.find(filter).sort({ eventDate: 1 });
  const pagination = await paginate(query, req);

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
});

exports.showAllSchedules = catchAsync(async (req, res, next) => {
  // Only events with at least one round
  const pagination = await paginate(Event, req, {
    "rounds.0": { $exists: true },
  });

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
  });
});

exports.browseMyEvents = catchAsync(async (req, res, next) => {
  // 1) Get event data from collection
  const userId = req.session.user.userId;

  const events = await Event.find({
    "eventBookings.userId": { $in: userId },
    active: true,
  }).sort({ eventDate: 1 });

  // 2) Render template using tour data
  res.status(200).render("browseMyEvents", {
    title: "Browse Events",
    events: events,
    userRole: req.session.user.userRole,
    userName: req.session.user.userName,
    showNav: true,
  });
});

exports.browseNewEvents = catchAsync(async (req, res, next) => {
  // 1) Get event data from collection
  const userId = req.session.user.userId;
  const events = await Event.find({
    "eventBookings.userId": { $nin: userId },
    active: true, // Only show active events
  }).sort({ eventDate: 1 });

  // 2) Render template using tour data
  res.status(200).render("browseNewEvents", {
    title: "Browse Events",
    events: events,
    userRole: req.session.user.userRole,
    userName: req.session.user.userName,
    showNav: true,
  });
});

exports.editEvent = catchAsync(async (req, res, next) => {
  // 1) Get event data from collection

  const event = await Event.findOne({ _id: req.params.id });

  if (!event) {
    return next(new AppError("There is no event with that name", 404));
  }

  // 3) Render template using tour data
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
});

exports.viewMySchedule = catchAsync(async (req, res, next) => {
  // 1) Get event data from collection
  const event = await Event.findOne({ _id: req.params.id });

  if (!event) {
    return next(new AppError("There is no event with that name", 404));
  }

  let filteredMatches = [];

  // Loop through each round in the schedule
  event.rounds.forEach((round, roundIndex) => {
    round.matches.forEach((match, matchIndex) => {
      // Check if the player is part of teamA or teamB
      let playerInMatch =
        match.teamA.some(
          (player) =>
            player.userId.toString() === req.session.user.userId.toString()
        ) ||
        match.teamB.some(
          (player) =>
            player.userId.toString() === req.session.user.userId.toString()
        );

      if (playerInMatch) {
        // Determine which team the player is in
        let playerTeam = match.teamA.some(
          (player) =>
            player.userId.toString() === req.session.user.userId.toString()
        )
          ? "teamA"
          : "teamB";
        // Push match to filteredMatches, along with the player's team info
        filteredMatches.push({
          round: roundIndex,
          match,
          playerTeam,
          matchIndex,
        });
      }
    });
  });
  res.status(200).render("viewMySchedule", {
    title: `${event.eventName} Event`,
    event: event,
    filteredMatches: filteredMatches,
    userRole: req.session.user.userRole,
    userName: req.session.user.userName,
    showNav: true,
  });
});

exports.viewMasterSchedule = catchAsync(async (req, res, next) => {
  // 1) Get event data from collection
  const event = await Event.findOne({ _id: req.params.id });

  if (!event) {
    return next(new AppError("There is no event with that name", 404));
  }

  res.status(200).render("viewMasterSchedule", {
    title: `${event.eventName} Event`,
    event: event,
    userRole: req.session.user.userRole,
    userName: req.session.user.userName,
    showNav: true,
  });
});

exports.getSettings = catchAsync(async (req, res, next) => {
  const systemSettings = await settings.findOne();

  if (!systemSettings) {
    return next(new AppError("There are no system settings in place", 404));
  }
  res.status(200).render("editSystemSettings", {
    title: "System Settings",
    systemSettings: systemSettings,
    userRole: req.session.user.userRole,
    userName: req.session.user.userName,
    showNav: true,
  });
});
