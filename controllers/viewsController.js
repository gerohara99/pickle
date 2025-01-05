const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const User = require("../models/userModel");
const Event = require("../models/eventModel");

// Display home page
exports.getHomePage = catchAsync(async (req, res, next) => {
  res.status(200).render("homepage", {
    title: "Pickle Admin !!!",
  });
});

// Individual user functionlaity (signup / logging in, viewing / changing own details / logging out)
exports.getLoginForm = (req, res) => {
  res.status(200).render("login", {
    title: "log into your account",
  });
};

exports.getsignupForm = (req, res) => {
  res.status(200).render("signup", {
    title: "create your account",
  });
};

exports.getMyAccount = (req, res) => {
  res.status(200).render("myaccount", {
    title: "Your account",
  });
};

//Admin user functionality (viewing all users / editing details / deleting users)
exports.showAllUsers = catchAsync(async (req, res, next) => {
  // 1) Get event data from collection
  const users = await User.find();
  // 2) Render template using tour data
  res.status(200).render("showAllUsers", {
    title: "All Users",
    users: users,
  });
});

exports.createUser = (req, res) => {
  res.status(200).render("createUser", {
    title: "Events",
  });
};

exports.editUser = catchAsync(async (req, res, next) => {
  // 1) Get event data from collection
  const user = await User.findOne({ id: req.params._id });

  if (!user) {
    return next(new AppError("There is no user with that name", 404));
  }

  // 3) Render template using tour data
  res.status(200).render("editUser", {
    title: `${user.name} Name`,
    user,
  });
});

// Events functionality
exports.createEvent = (req, res) => {
  res.status(200).render("createEvent", {
    title: "Events",
  });
};

exports.showAllEvents = catchAsync(async (req, res, next) => {
  // 1) Get event data from collection
  const events = await Event.find();
  // 2) Render template using tour data
  res.status(200).render("showAllEvents", {
    title: "All Events",
    events: events,
  });
});

exports.editEvent = catchAsync(async (req, res, next) => {
  // 1) Get event data from collection
  const event = await Event.findOne({ id: req.params._id });

  if (!event) {
    return next(new AppError("There is no event with that name", 404));
  }

  // 3) Render template using tour data
  res.status(200).render("editEvent", {
    title: `${event.eventName} Event`,
    event,
  });
});
