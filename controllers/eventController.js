const Event = require("../models/eventModel");
const factory = require("./handlerFactory");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const mongoose = require("mongoose");

exports.createBooking = catchAsync(async (req, res, next) => {
  let event = await Event.findById(req.body.eventId);
  if (!event) {
    return next(new AppError("No event found with that ID ", 404));
  }

  // 1) CONDUCT VALIDATIONS
  // Check if there are still spaces available
  if (event.eventBookings.length == event.eventNumOfPlayers) {
    return next(new AppError("There are no spaces left for this event", 400));
  }

  // UPDATE EVENT WITH BOOKING
  let newBookings = event.eventBookings;
  let newBooking = {
    userId: req.session.userId,
    userName: req.session.userName,
  };

  newBookings.push(newBooking);

  await Event.findByIdAndUpdate(req.body.eventId, {
    eventBookings: newBookings,
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

  let newBookings = event.eventBookings.filter((val) => val.userId != userId);

  await Event.findByIdAndUpdate(req.body.eventId, {
    eventBookings: newBookings,
    schedule: [],
    runValidators: false,
  });

  res.status(200).json({
    status: "Booking successfully cancelled",
    data: { eventBooking: req.body.userId },
  });
});

exports.checkSchedule = catchAsync(async (req, res, next) => {
  // If this booking fills up the event then it's time to schedule it

  const event = await Event.findById(req.body.eventId);
  if (!event) {
    return next(new AppError("No event found with that ID", 404));
  }

  if (event.eventBookings.length == event.eventNumOfPlayers) {
    const standOuts = generateStandOutsPubJs(
      event.eventBookings,
      event.eventNumOfRounds,
      event.numOfStandOutsPerRound
    );

    const availablePairings = generateAvailablePairingsPubJs(
      event.eventBookings
    );

    const schedule = generateSchedulePubJs(
      availablePairings,
      standOuts,
      event.numOfPairingsPerRound
    );

    await Event.findByIdAndUpdate(req.body.eventId, {
      eventSchedule: schedule.rounds,
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
  let availablePairings = [];

  if (!playersList) return -1;

  if (playersList.length % 2 === 1) {
    playersList.push({ userName: "DUMMY" }); // so we can match algorithm for even numbers
  }

  for (let j = 0; j < playersList.length - 1; j += 1) {
    for (let i = 0; i < playersList.length / 2; i += 1) {
      const o = playersList.length - 1 - i;
      if (
        playersList[i].userName !== "DUMMY" &&
        playersList[o].userName !== "DUMMY"
      ) {
        availablePairings.push({
          playerA: playersList[o],
          playerB: playersList[i],
          pairingUsed: false,
        });
      }
    }
    playersList.splice(1, 0, playersList.pop()); // permutate for next round
  }
  return availablePairings;
};

exports.const = generateSchedulePubJs = (
  availablePairings,
  standOuts,
  numOfPairingsPerRound
) => {
  let schedule = { rounds: [] };
  let availablePairing = availablePairings;

  for (let i = 0; i < standOuts.length; i++) {
    let pairingsUsed = 0;
    let pairings = [];
    for (let j = 0; j < availablePairing.length; j++) {
      if (
        standOuts[i].find(
          (element) => element.userId !== availablePairing[j].playerA.userId
        ) &&
        standOuts[i].find(
          (element) => element.userId !== availablePairing[j].playerB.userId
        ) &&
        availablePairing[j].pairingUsed === false
      ) {
        if (pairingsUsed < numOfPairingsPerRound) {
          pairings.push({
            playerA: availablePairing[j].playerA,
            playerB: availablePairing[j].playerB,
          });
          availablePairing[j].pairingUsed = true;
          pairingsUsed++;
        } else {
          schedule.rounds.push({
            round: i,
            eventPairings: pairings,
            eventStandOuts: standOuts[i],
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
