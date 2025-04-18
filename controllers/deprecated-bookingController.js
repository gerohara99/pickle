const Event = require("../models/eventModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const mongoose = require("mongoose");

exports.createBooking = catchAsync(async (req, res, next) => {
  // 1) CONDUCT VALIDATIONS
  // Check for Duplicate Booking
  if (req.body.bookings.includes(req.userId)) {
    return next(
      new AppError("You have already made a booking for this event.", 400)
    );
  }
  // Check if there are still spaces available
  if (req.body.bookings.length > req.body.numPlayers) {
    return next(new AppError("There are no spaces left for this event", 400));
  }

  // UPDATE EVENT WITH BOOKING
  let newBookings = req.body.bookings;
  newBookings.push(new mongoose.Types.ObjectId(req.body.userId));
  await Event.findByIdAndUpdate(req.body.eventId, {
    bookings: newBookings,
    runValidators: false,
  });

  res.status(200).json({
    status: "Booking successfully created",
    data: { booking: req.body.event },
  });
});

exports.cancelBooking = catchAsync(async (req, res, next) => {
  // Check booking exists
  if (!req.body.bookings.includes(req.body.userId)) {
    return next(new AppError("You don't have this booking", 400));
  }

  let newBookings = req.body.bookings.filter((val) => val !== req.body.userId);

  await Event.findByIdAndUpdate(req.body.eventId, {
    bookings: newBookings,
    runValidators: false,
  });

  res.status(200).json({
    status: "Booking successfully cancelled",
    data: { booking: req.body.userId },
  });
});
