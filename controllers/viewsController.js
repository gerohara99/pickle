const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const Event = require("../models/eventModel");

exports.getOverview = catchAsync(async (req, res, next) => {
  res.status(200).render("overview", {
    title: "Pickle Admin !!!",
  });
});

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

exports.getAccount = (req, res) => {
  res.status(200).render("account", {
    title: "Your account",
  });
};

exports.createEvent = (req, res) => {
  res.status(200).render("createEvent", {
    title: "Events",
  });
};

exports.getAllEvents = catchAsync(async (req, res, next) => {
  // 1) Get event data from collection
  const events = await Event.find();
  // 2) Render template using tour data
  res.status(200).render("getAllEvents", {
    title: "All Events",
    events: events,
  });
});

exports.getEvent = catchAsync(async (req, res, next) => {
  // 1) Get event data from collection
  const event = await Event.findOne({ id: req.params._id });

  if (!event) {
    return next(new AppError("There is no event with that name", 404));
  }
  // 2) Build template

  // 3) Render template using tour data
  res.status(200).render("event", {
    title: `${event.eventName} Event`,
    event,
  });
});
