const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const User = require("../models/userModel");
const Event = require("../models/eventModel");
const { filter } = require("compression");
const settings = require("../models/settingsModel");

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
    showNav: true,
  });
};

exports.myPasswordUpdate = (req, res) => {
  res.status(200).render("myPasswordUpdate", {
    title: "Update Password",
    userRole: req.session.user.userRole,
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
    showNav,
  });
};

//ADMIN USER FUNCTIONALITY (viewing all users / editing details / deleting users)
exports.showAllUsers = catchAsync(async (req, res, next) => {
  // 1) Get event data from collection
  const users = await User.find();
  // 2) Render template using tour data
  res.status(200).render("showAllUsers", {
    title: "All Users",
    users: users,
    userRole: req.session.user.userRole,
    showNav: true,
  });
});

exports.createUser = (req, res) => {
  res.status(200).render("createUser", {
    title: "Events",
    userRole: req.session.user.userRole,
    showNav: true,
  });
};

exports.editUser = catchAsync(async (req, res, next) => {
  // 1) Get event data from collection

  const user = await User.findOne({ _id: req.params.id });

  if (!user) {
    return next(new AppError("There is no user with that name", 404));
  }

  // 3) Render edit user form
  res.status(200).render("editUser", {
    title: `${user.name} Name`,
    user,
    userRole: req.session.user.userRole,
    showNav: true,
  });
});

// EVENTS FUNCTIONALITY
exports.createEvent = (req, res) => {
  res.status(200).render("createEvent", {
    title: "Events",
    userRole: req.session.user.userRole,
    systemDefaults: req.session.systemDefaults,
    showNav: true,
  });
};

exports.showAllEvents = catchAsync(async (req, res, next) => {
  // 1) Get event data from collection
  const events = await Event.find();
  // 2) Render template using tour data
  res.status(200).render("showAllEvents", {
    title: "All Events",
    events: events,
    userRole: req.session.user.userRole,
    showNav: true,
  });
});

exports.showAllSchedules = catchAsync(async (req, res, next) => {
  // 1) Get event data from collection
  const events = await Event.find({ "rounds.0": { $exists: true } });
  // 2) Render template using tour data
  res.status(200).render("showAllSchedules", {
    title: "All Schedules",
    events: events,
    userRole: req.session.user.userRole,
    showNav: true,
  });
});

exports.browseMyEvents = catchAsync(async (req, res, next) => {
  // 1) Get event data from collection
  const userId = req.session.user.userId;

  const events = await Event.find({
    "eventBookings.userId": { $in: userId },
  });

  // 2) Render template using tour data
  res.status(200).render("browseMyEvents", {
    title: "Browse Events",
    events: events,
    userRole: req.session.user.userRole,
    showNav: true,
  });
});

exports.browseNewEvents = catchAsync(async (req, res, next) => {
  // 1) Get event data from collection
  const userId = req.session.user.userId;
  const events = await Event.find({
    "eventBookings.userId": { $nin: userId },
  });
  // 2) Render template using tour data
  res.status(200).render("browseNewEvents", {
    title: "Browse Events",
    events: events,
    userRole: req.session.user.userRole,
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
    event,
    userRole: req.session.user.userRole,
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
    showNav: true,
  });
});

exports.getSettings = catchAsync(async (req, res, next) => {
  systemSettings = await settings.findOne();

  if (!systemSettings) {
    return next(new AppError("There are no system settings in place", 404));
  }
  res.status(200).render("editSystemSettings", {
    title: "System Settings",
    systemSettings: systemSettings,
    userRole: req.session.user.userRole,
    showNav: true,
  });
});
