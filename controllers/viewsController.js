const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const User = require("../models/userModel");
const Event = require("../models/eventModel");
const Location = require("../models/locationModel");

// Display HOMEPAGE
exports.getHomePage = catchAsync(async (req, res, next) => {
  res.status(200).render("homepage", {
    title: "Pickle Admin !!!",
  });
});

// INDIVIDAL USER FUNCTIONALITY (signup / logging in, viewing / changing own details / logging out)
exports.getLoginForm = (req, res) => {
  res.status(200).render("login", {
    title: "log into your account",
  });
};

exports.getsignupForm = (req, res) => {
  res.status(200).render("signUp", {
    title: "create your account",
  });
};

exports.getMyAccountDetails = (req, res) => {
  res.status(200).render("myAccountDetails", {
    title: "Your account",
  });
};

exports.myPasswordUpdate = (req, res) => {
  res.status(200).render("myPasswordUpdate", {
    title: "Update Password",
  });
};

exports.myPasswordReset = (req, res) => {
  const resetToken = req.params.resetToken;
  let data = {};
  data.resetToken = resetToken;
  res.status(200).render("myPasswordReset", {
    title: "Reset Password",
    data,
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
  });
});

exports.createUser = (req, res) => {
  res.status(200).render("createUser", {
    title: "Events",
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
  });
});

// EVENTS FUNCTIONALITY
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

  const event = await Event.findOne({ _id: req.params.id });

  if (!event) {
    return next(new AppError("There is no event with that name", 404));
  }

  // 3) Render template using tour data
  res.status(200).render("editEvent", {
    title: `${event.eventName} Event`,
    event,
  });
});

// LOCATION FUNCTIONALITY
exports.createLocation = (req, res) => {
  res.status(200).render("createLocation", {
    title: "Location",
  });
};

exports.showAllLocations = catchAsync(async (req, res, next) => {
  // 1) Get data from collection
  const locations = await Location.find();
  // 2) Render template using tour data
  res.status(200).render("showAllLocations", {
    title: "All Locations",
    locations: locations,
  });
});

exports.editLocation = catchAsync(async (req, res, next) => {
  // 1) Get data from collection
  const location = await Location.findOne({ id: req.params._id });

  if (!location) {
    return next(new AppError("There is no location with that name", 404));
  }

  // 3) Render template using tour data
  res.status(200).render("editLocation", {
    title: `${location.locationName} Location`,
    location,
  });
});
