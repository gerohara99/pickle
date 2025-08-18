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
  const filter = { "rounds.0": { $exists: true } };

  // Filter by organiser (case-insensitive substring match)
  if (req.query.organiser) {
    filter.eventOrganiser = { $regex: req.query.organiser, $options: "i" };
  }

  // Filter by date (exact match, expects yyyy-mm-dd from input[type="date"])
  if (req.query.date) {
    const date = new Date(req.query.date);
    const nextDate = new Date(date);
    nextDate.setDate(date.getDate() + 1);
    filter.eventDate = { $gte: date, $lt: nextDate };
  }

  const query = Event.find(filter).sort({ eventDate: 1 });
  const pagination = await paginate(query, req);

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
});

exports.browseMyEvents = catchAsync(async (req, res, next) => {
  // 1) Get event data from collection
  const userId = req.session.user.userId;

  const events = await Event.find({
    "eventBookings.userId": { $in: userId },
    active: true,
  }).sort({ eventDate: 1 });

  events.forEach((event) => {
    event.userInRounds =
      event.rounds &&
      event.rounds.some((round) =>
        round.matches.some(
          (match) =>
            match.teamA.some(
              (player) => player.userId.toString() === req.session.user.userId
            ) ||
            match.teamB.some(
              (player) => player.userId.toString() === req.session.user.userId
            )
        )
      );
  });

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
  const event = await Event.findOne({ _id: req.params.id });

  if (!event) {
    return next(new AppError("There is no event with that name", 404));
  }

  const userId = req.session.user.userId.toString();

  // Calculate restingRounds ONCE for the user
  let restingRounds = [];
  event.rounds.forEach((round, roundIndex) => {
    if (
      round.standOuts &&
      round.standOuts.some(
        (player) => player.userId && player.userId.toString() === userId
      )
    ) {
      restingRounds.push(roundIndex + 1); // 1-based for display
    }
  });

  // Build filteredMatches: matches where user is playing
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
});
exports.viewMasterSchedule = catchAsync(async (req, res, next) => {
  // 1) Get event data from collection
  const event = await Event.findOne({ _id: req.params.id });

  if (!event) {
    return next(new AppError("There is no event with that name", 404));
  }

  // 2) Determine round filter from query
  let filteredRounds = event.rounds;
  let round = req.query.round || "";
  let roundsCount = event.rounds ? event.rounds.length : 0;

  if (round && !isNaN(round) && round > 0 && round <= roundsCount) {
    // Only show the selected round (round is 1-based for user, 0-based for array)
    filteredRounds = [event.rounds[round - 1]];
  }

  // 3) Flatten all matches in filteredRounds
  let allMatches = [];

  filteredRounds.forEach((roundObj, roundIndex) => {
    roundObj.matches.forEach((match, matchIndex) => {
      const hasScore =
        (typeof match.teamAScore === "number" && match.teamAScore > 0) ||
        (typeof match.teamBScore === "number" && match.teamBScore > 0);
      allMatches.push({ match, roundIndex, matchIndex, hasScore });
    });
  });

  // 4) Pagination logic
  const page = parseInt(req.query.page) || 1;
  const limit = 10; // matches per page
  const totalMatches = allMatches.length;
  const totalPages = Math.ceil(totalMatches / limit);
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginatedMatches = allMatches.slice(start, end);

  res.status(200).render("viewMasterSchedule", {
    title: `${event.eventName} Event`,
    event: event,
    filteredRounds: filteredRounds, // still available if needed
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

exports.showNoShowForm = catchAsync(async (req, res, next) => {
  // Only show events that are active and have eventDate of today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const events = await Event.find({
    active: true,
    //eventDate: { $gte: today, $lt: tomorrow },
  });

  res.status(200).render("noShowEvent", {
    title: "Mark No Show",
    events,
    userRole: req.session.user.userRole,
    userName: req.session.user.userName,
    showNav: true,
  });
});
