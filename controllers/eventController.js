const Event = require("../models/eventModel");
const factory = require("./handlerFactory");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const { sendWhatsAppMessage } = require("../utils/twilioClient");
const ScheduleService = require("../services/scheduleService");

exports.createBooking = catchAsync(async (req, res, next) => {
  try {
    if (!req.body.eventId) {
      throw new AppError("Event ID is required", 400);
    }
  } catch (err) {
    console.error("Synchronous error in createBooking:", err);
    return next(err);
  }

  try {
    const event = await Event.findById(req.body.eventId);

    if (!event) {
      return next(new AppError("No event found with that ID", 404));
    }

    if (
      event.eventBookings.length ===
      event.eventNumOfPlayers + event.eventWaitListSize
    ) {
      return next(new AppError("There are no spaces left for this event", 400));
    }

    // Update event with booking
    let newBookings = event.eventBookings;
    let newBooking = {
      userId: req.session.user.userId,
      userName: req.session.user.userName,
    };
    newBookings.push(newBooking);

    try {
      await Event.findByIdAndUpdate(req.body.eventId, {
        eventBookings: newBookings,
        runValidators: false,
      });
    } catch (dbErr) {
      console.error("Failed to update event bookings:", dbErr);
      return next(new AppError("Failed to update event bookings", 500));
    }

    try {
      await checkAndUpdateSchedule(req.body.eventId, next);
    } catch (scheduleErr) {
      console.error("Failed to update event schedule:", scheduleErr);
      return next(new AppError("Failed to update event schedule", 500));
    }

    try {
      await sendWhatsAppMessage(
        req.session.user.userMobile,
        `Your booking for event ${event.eventName} is confirmed!`
      );
    } catch (waErr) {
      // Log error but don't block booking creation
      console.error("WhatsApp message failed:", waErr);
    }

    res.status(200).json({
      status: "success",
      message: "Booking successfully created",
    });
  } catch (err) {
    console.error("Unexpected error during booking:", err);
    next(new AppError("Unexpected error during booking", 500));
  }
});

exports.cancelBooking = catchAsync(async (req, res, next) => {
  try {
    if (!req.session.user || !req.session.user.userId) {
      throw new AppError("User not authenticated", 401);
    }
    if (!req.body.eventId) {
      throw new AppError("Event ID is required", 400);
    }
  } catch (err) {
    console.error("Synchronous error in cancelBooking:", err);
    return next(err);
  }

  try {
    const userId = req.session.user.userId;
    const eventId = req.body.eventId;

    const event = await Event.findById(eventId);
    if (!event) {
      return next(new AppError("No event found with that ID", 404));
    }

    let newBookings = event.eventBookings.filter((val) => val.userId != userId);

    try {
      await Event.findByIdAndUpdate(eventId, {
        eventBookings: newBookings,
        rounds: [],
        runValidators: false,
      });
    } catch (dbErr) {
      console.error(
        "Failed to update event bookings during cancellation:",
        dbErr
      );
      return next(
        new AppError("Failed to update event bookings during cancellation", 500)
      );
    }

    try {
      await checkAndUpdateSchedule(eventId, next);
    } catch (scheduleErr) {
      console.error(
        "Failed to update event schedule after cancellation:",
        scheduleErr
      );
      return next(
        new AppError("Failed to update event schedule after cancellation", 500)
      );
    }

    try {
      await sendWhatsAppMessage(
        req.session.user.userMobile,
        `Your booking for event ${event.eventName} has been cancelled.`
      );
    } catch (waErr) {
      // Log error but don't block cancellation
      console.error("WhatsApp message failed:", waErr);
    }

    res.status(200).json({
      status: "success",
      message: "Booking successfully cancelled",
      data: { eventBooking: userId },
    });
  } catch (err) {
    console.error("Unexpected error during booking cancellation:", err);
    next(new AppError("Unexpected error during booking cancellation", 500));
  }
});

exports.eventTimeout = (req, res, next) => {
  try {
    res.setTimeout(15000, () => {
      console.warn(`Request timed out: ${req.originalUrl}`);
      res.status(503).send("Request timed out");
    });
    next();
  } catch (err) {
    console.error("Error in eventTimeout middleware:", err);
    next(err);
  }
};

async function checkAndUpdateSchedule(eventId, next) {
  try {
    const event = await Event.findById(eventId);
    if (!event) return;

    let playerslist = event.eventBookings.slice(0, event.eventNumOfPlayers);

    if (event.eventBookings.length >= event.eventNumOfPlayers) {
      const scheduleService = new ScheduleService();
      
      const numStandouts = event.numOfStandOutsPerRound || 
        scheduleService.calculateOptimalStandouts(playerslist.length, event.eventNumOfCourts);
      
      const schedule = scheduleService.generateCompleteSchedule(
        playerslist,
        event.eventNumOfRounds,
        event.eventNumOfCourts,
        numStandouts
      );
      
      if (schedule) {
        event.rounds = schedule;
        await event.save();
        console.log(`Schedule generated successfully for event ${eventId}`);
      } else {
        throw new AppError("Failed to generate valid schedule", 500);
      }
    }
  } catch (err) {
    console.error("Error in checkAndUpdateSchedule:", err);
    if (next) next(err);
  }
}

exports.updateMatchScore = catchAsync(async (req, res, next) => {
  try {
    if (!req.body.eventId) throw new AppError("Event ID is required", 400);
    if (typeof req.body.roundIndex === "undefined")
      throw new AppError("Round index is required", 400);
    if (typeof req.body.matchIndex === "undefined")
      throw new AppError("Match index is required", 400);
    if (isNaN(req.body.teamAScore) || isNaN(req.body.teamBScore))
      throw new AppError("Scores must be valid numbers", 400);
  } catch (err) {
    console.error("Synchronous error in updateMatchScore:", err);
    return next(err);
  }

  const { eventId, roundIndex, matchIndex, teamAScore, teamBScore } = req.body;

  const roundIdx = Number(roundIndex);
  const matchIdx = Number(matchIndex);

  const event = await Event.findById(eventId);
  if (!event) {
    return next(new AppError("No event found with that ID", 404));
  }

  if (
    !event.rounds ||
    !event.rounds[roundIdx] ||
    !event.rounds[roundIdx].matches ||
    !event.rounds[roundIdx].matches[matchIdx]
  ) {
    return next(new AppError("Match or Round not found", 400));
  }

  event.rounds[roundIdx].matches[matchIdx].teamAScore = teamAScore;
  event.rounds[roundIdx].matches[matchIdx].teamBScore = teamBScore;

  try {
    await event.save();
    res.status(200).json({
      status: "success",
      message: "Match score updated successfully",
    });
  } catch (error) {
    console.error("Error saving event:", error);
    next(new AppError("Failed to update match score", 500));
  }
});

exports.createEvent = catchAsync(async (req, res, next) => {
  try {
    if (!req.body.eventName) throw new AppError("Event name is required", 400);
    if (!req.body.eventDate) throw new AppError("Event date is required", 400);
  } catch (err) {
    console.error("Synchronous error in createEvent:", err);
    return next(err);
  }

  let activeValue = false;
  if (typeof req.body.active !== "undefined") {
    if (typeof req.body.active === "string") {
      activeValue = req.body.active === "true" || req.body.active === "on";
    } else {
      activeValue = !!req.body.active;
    }
  }

  try {
    const newEvent = await Event.create({
      eventName: req.body.eventName,
      eventLocation: req.body.eventLocation,
      eventType: req.body.eventType,
      eventDate: req.body.eventDate,
      eventStartTime: req.body.eventStartTime,
      eventOrganiser: req.body.eventOrganiser,
      eventNumOfCourts: req.body.eventNumOfCourts,
      numOfStandOutsPerRound: req.body.numOfStandOutsPerRound,
      eventNumOfRounds: req.body.eventNumOfRounds,
      eventWaitListSize: req.body.eventWaitListSize,
      eventNumOfPairings: req.body.eventNumOfPairings,
      active: activeValue,
    });
    res.status(201).json({
      status: "success",
      data: { event: newEvent },
    });
  } catch (err) {
    console.error("Error creating event:", err);
    next(new AppError("Failed to create event", 500));
  }
});

exports.updateEvent = catchAsync(async (req, res, next) => {
  try {
    if (!req.body.eventId) throw new AppError("Event ID is required", 400);
  } catch (err) {
    console.error("Synchronous error in updateEvent:", err);
    return next(err);
  }

  let activeValue = undefined;
  if (typeof req.body.active !== "undefined") {
    if (typeof req.body.active === "string") {
      activeValue = req.body.active === "true" || req.body.active === "on";
    } else {
      activeValue = !!req.body.active;
    }
  }

  const updateObj = {
    eventName: req.body.eventName,
    eventLocation: req.body.eventLocation,
    eventType: req.body.eventType,
    eventDate: req.body.eventDate,
    eventStartTime: req.body.eventStartTime,
    eventOrganiser: req.body.eventOrganiser,
    eventNumOfCourts: req.body.eventNumOfCourts,
    numOfStandOutsPerRound: req.body.numOfStandOutsPerRound,
    eventNumOfRounds: req.body.eventNumOfRounds,
    eventWaitListSize: req.body.eventWaitListSize,
    eventNumOfPairings: req.body.eventNumOfPairings,
  };
  if (typeof activeValue !== "undefined") updateObj.active = activeValue;

  try {
    const updatedEvent = await Event.findByIdAndUpdate(
      req.body.eventId,
      updateObj,
      {
        new: true,
        runValidators: true,
      }
    );
    res.status(200).json({
      status: "success",
      data: { event: updatedEvent },
    });
  } catch (err) {
    console.error("Error updating event:", err);
    next(new AppError("Failed to update event", 500));
  }
});

exports.handleNoShow = catchAsync(async (req, res, next) => {
  try {
    if (!req.body.eventId) throw new AppError("Event ID is required", 400);
    if (!req.body.userId) throw new AppError("User ID is required", 400);
  } catch (err) {
    console.error("Synchronous error in handleNoShow:", err);
    return next(err);
  }

  const { eventId, userId } = req.body;

  const event = await Event.findById(eventId);
  if (!event) return next(new AppError("No event found with that ID", 404));

  event.eventBookings = event.eventBookings.filter(
    (booking) => booking.userId.toString() !== userId.toString()
  );

  event.numOfStandOutsPerRound = Math.max(
    (event.numOfStandOutsPerRound || 1) - 1,
    1
  );

  event.rounds = [];
  try {
    await event.save();
    await checkAndUpdateSchedule(eventId, next);
    res.status(200).json({
      status: "success",
      message: "No show processed and schedule recalculated",
      data: { event },
    });
  } catch (err) {
    console.error("Error handling no-show:", err);
    next(new AppError("Failed to process no-show", 500));
  }
});

exports.getEvent = factory.getOne(Event);
exports.getAllEvents = factory.getAll(Event);
exports.deleteEvent = factory.deleteOne(Event);
