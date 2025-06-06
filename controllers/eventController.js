const Event = require("../models/eventModel");
const factory = require("./handlerFactory");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const mongoose = require("mongoose");
const pickleScheduler = require("../public/js/pickleScheduler");

exports.createBooking = catchAsync(async (req, res, next) => {
  const userId = req.session.userId;
  const eventId = req.body.eventId;

  let event = await Event.findById(eventId);
  if (!event) {
    return next(new AppError("No event found with that ID", 404));
  }

  // 1) CONDUCT VALIDATIONS

  // Check if there are still spaces available
  if (event.bookings.length > process.env.NUM_PLAYERS) {
    return next(new AppError("There are no spaces left for this event", 400));
  }
  // UPDATE EVENT WITH BOOKING
  let newBookings = event.bookings;
  newBookings.push(new mongoose.Types.ObjectId(userId));
  await Event.findByIdAndUpdate(req.body.eventId, {
    bookings: newBookings,
    runValidators: false,
  });

  // If this booking fills up the event then it's time to schedule it
  event = await Event.findById(eventId);
  if (event.bookings.length == process.env.NUM_PLAYERS) {
    scheduleEvent(event, 201, req, res);
  }

  res.status(200).json({
    status: "Booking successfully created",
    data: { booking: eventId },
  });
});

exports.cancelBooking = catchAsync(async (req, res, next) => {
  const userId = req.session.userId;
  const eventId = req.body.eventId;

  const event = await Event.findById(eventId);

  if (!event) {
    return next(new AppError("No event found with that ID", 404));
  }

  let newBookings = event.bookings.filter((val) => val._id != userId);

  await Event.findByIdAndUpdate(req.body.eventId, {
    bookings: newBookings,
    runValidators: false,
  });

  res.status(200).json({
    status: "Booking successfully cancelled",
    data: { booking: req.body.userId },
  });
});

exports.scheduleEvent = catchAsync(
  async (event, statusCode, req, res, next) => {
    res.status(statusCode).json({
      status: "success",
      token,
      data: { event },
    });
  }
);

exports.getEvent = factory.getOne(Event);
exports.getAllEvents = factory.getAll(Event);
exports.createEvent = factory.createOne(Event);
exports.updateEvent = factory.updateOne(Event);
exports.deleteEvent = factory.deleteOne(Event);
