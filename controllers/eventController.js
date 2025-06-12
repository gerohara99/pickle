const Event = require("../models/eventModel");
const factory = require("./handlerFactory");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const mongoose = require("mongoose");

exports.createBooking = catchAsync(async (req, res, next) => {
  const userId = req.session.userId;
  let event = await Event.findById(req.body.eventId);
  if (!event) {
    return next(new AppError("No event found with that ID", 404));
  }

  // 1) CONDUCT VALIDATIONS

  // Check if there are still spaces available
  if (event.bookings.length > process.env.NUM_OF_PLAYERS) {
    return next(new AppError("There are no spaces left for this event", 400));
  }
  // UPDATE EVENT WITH BOOKING
  let newBookings = event.bookings;
  newBookings.push(new mongoose.Types.ObjectId(userId));
  await Event.findByIdAndUpdate(req.body.eventId, {
    bookings: newBookings,
    runValidators: false,
  });

  next();
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
    schedule: [],
    runValidators: false,
  });

  res.status(200).json({
    status: "Booking successfully cancelled",
    data: { booking: req.body.userId },
  });
});

exports.checkSchedule = catchAsync(async (req, res, next) => {
  // If this booking fills up the event then it's time to schedule it

  const event = await Event.findById(req.body.eventId);
  if (!event) {
    return next(new AppError("No event found with that ID", 404));
  }

  if (event.bookings.length == process.env.NUM_OF_PLAYERS) {
    const standOuts = generateStandOutsPubJs(
      event.bookings,
      event.eventNumOfRounds,
      event.eventNumOfStandOuts
    );

    const availablePairings = generateAvailablePairingsPubJs(event.bookings);

    const schedule = generateSchedulePubJs(
      availablePairings,
      standOuts,
      event.eventNumOfPairings
    );

    await Event.findByIdAndUpdate(req.body.eventId, {
      schedule: schedule.rounds,
      runValidators: false,
    });
  }

  res.status(200).json({
    status: "Booking successfully created",
    data: { booking: req.body.userId },
  });
});

exports.const = generateStandOutsPubJs = (
  playersList,
  numOfRounds,
  numStandOuts
) => {
  // Calculate Standouts
  let roundsFilled = false;
  let i = 0;
  let startSlice = 0;
  let playersLeft;
  let standOutsPerRound = [];

  do {
    playersLeft = playersList.length - startSlice;

    if (playersLeft <= numStandOuts) {
      playersFromNext = numStandOuts - playersLeft;
      standOutsPerRound[i] = [].concat(
        playersList.slice(-playersLeft),
        playersList.slice(0, playersFromNext)
      );
      startSlice = playersFromNext;
    } else {
      standOutsPerRound[i] = playersList.slice(
        startSlice,
        startSlice + numStandOuts
      );
      startSlice += numStandOuts;
    }
    i === numOfRounds - 1 ? (roundsFilled = true) : i++;
  } while (!roundsFilled);

  return standOutsPerRound;
};

exports.const = generateAvailablePairingsPubJs = (playersList) => {
  // Declare variables
  const DUMMY = -1;
  let avaibalePairings = [];

  if (!playersList) return -1;

  if (playersList.length % 2 === 1) {
    playersList.push(DUMMY); // so we can match algorithm for even numbers
  }
  for (let j = 0; j < playersList.length - 1; j += 1) {
    for (let i = 0; i < playersList.length / 2; i += 1) {
      const o = playersList.length - 1 - i;
      if (playersList[i] !== DUMMY && playersList[o] !== DUMMY) {
        avaibalePairings.push({
          playerA: playersList[o],
          playerB: playersList[i],
          pairingUsed: false,
        });
      }
    }
    playersList.splice(1, 0, playersList.pop()); // permutate for next round
  }
  return avaibalePairings;
};

exports.const = generateSchedulePubJs = (
  availablePairings,
  standOuts,
  eventNumOfPairings
) => {
  let schedule = { rounds: [] };
  let availablePairing = availablePairings;

  for (let i = 0; i < standOuts.length; i++) {
    let pairingsUsed = 0;
    let pairings = [];
    for (let j = 0; j < availablePairing.length; j++) {
      if (
        !standOuts[i].includes(availablePairing[j].playerA) &&
        !standOuts[i].includes(availablePairing[j].playerB) &&
        availablePairing[j].pairingUsed === false
      ) {
        if (pairingsUsed < eventNumOfPairings) {
          pairings.push({
            playerA: availablePairing[j].playerA,
            playerB: availablePairing[j].playerB,
          });
          availablePairing[j].pairingUsed = true;
          pairingsUsed++;
        } else {
          schedule.rounds.push({
            round: i,
            pairings: pairings,
            standOuts: standOuts[i],
          });
          j = 99;
        }
      }
    }
  }
  return schedule;
};

exports.getEvent = factory.getOne(Event);
exports.getAllEvents = factory.getAll(Event);
exports.createEvent = factory.createOne(Event);
exports.updateEvent = factory.updateOne(Event);
exports.deleteEvent = factory.deleteOne(Event);
