const Event = require("../models/eventModel");
const factory = require("./handlerFactory");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

exports.createBooking = catchAsync(async (req, res, next) => {
  let event = await Event.findById(req.body.eventId);

  if (!event) {
    return next(new AppError("No event found with that ID ", 404));
  }

  // 1) CONDUCT VALIDATIONS
  // Check if there are still spaces available
  if (
    event.eventBookings.length ===
    event.eventNumOfPlayers + event.eventWaitListSize
  ) {
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
    rounds: [],
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

  let playerslist = event.eventBookings.slice(0, event.eventNumOfPlayers);

  if (event.eventBookings.length >= event.eventNumOfPlayers) {
    const standOuts = generateStandOutsPubJs(
      playerslist,
      event.eventNumOfRounds,
      event.numOfStandOutsPerRound
    );

    const availablePairings = generateAvailablePairingsPubJs(playerslist);

    const schedule = generateSchedulePubJs(
      availablePairings,
      standOuts,
      event.eventNumOfCourts
    );

    await Event.findByIdAndUpdate(
      req.body.eventId,
      { $set: { rounds: schedule } },
      { new: true, runValidators: false }
    );
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
        playersList[o].userName !== "DUMMY" &&
        playersList[o].userId !== playersList[i].userId
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
  numOfCourts
) => {
  let schedule = [];
  let teamA = {};
  let teamB = {};

  // Initialize each round as an empty array to hold matches
  for (let round = 0; round < standOuts.length; round++) {
    schedule[round] = { matches: [] };
  }

  for (let i = 0; i < standOuts.length; i++) {
    for (let k = 0; k < numOfCourts; k++) {
      for (let x = 0; x < process.env.NUM_OF_PAIRINGS_PER_COURT; x++) {
        for (let j = 0; j < availablePairings.length; j++) {
          if (
            standOuts[i].find(
              (element) =>
                element.userId !== availablePairings[j].playerA.userId
            ) &&
            standOuts[i].find(
              (element) =>
                element.userId !== availablePairings[j].playerB.userId
            ) &&
            availablePairings[j].pairingUsed === false
          ) {
            availablePairings[j].pairingUsed = true;
            if (x % 2 === 0) {
              (teamA.playerA = availablePairings[j].playerA),
                (teamA.playerB = availablePairings[j].playerB);
            } else {
              (teamB.playerA = availablePairings[j].playerA),
                (teamB.playerB = availablePairings[j].playerB);
            }
            //j = availablePairings.length;
            break;
          }
        }
      }

      let newMatch = {
        teamA: [
          { userId: teamA.playerA.userId, name: teamA.playerA.userName },
          { userId: teamA.playerB.userId, name: teamA.playerB.userName },
        ],
        teamB: [
          { userId: teamB.playerA.userId, name: teamB.playerA.userName },
          { userId: teamB.playerB.userId, name: teamB.playerB.userName },
        ],
        court: k,
      };
      schedule[i].matches.push(newMatch);
    }
  }

  return schedule;
};

exports.updateMatchScore = catchAsync(async (req, res, next) => {
  const { eventId, roundIndex, matchIndex, teamAScore, teamBScore } = req.body;

  // Validate that the scores are valid numbers
  if (isNaN(teamAScore) || isNaN(teamBScore)) {
    return next(new AppError("Scores must be valid numbers", 400));
  }

  // Find the event by its ID
  const event = await Event.findById(eventId);
  if (!event) {
    return next(new AppError("No event found with that ID", 404));
  }

  // Ensure the round and match exist
  const round = event.rounds[roundIndex];
  const match = round.matches[matchIndex];

  if (!round || !match) {
    return next(new AppError("Match or Round not found", 400));
  }

  event.rounds[roundIndex].matches[matchIndex].teamAScore = teamAScore;
  event.rounds[roundIndex].matches[matchIndex].teamBScore = teamBScore;

  // Save the event with the updated scores
  try {
    await event.save(); // Wait for the document to be saved
    res.status(200).json({
      status: "success",
      message: "Match score updated successfully",
    });
  } catch (error) {
    console.error("Error saving event:", error);
    next(new AppError("Failed to update match score", 500));
  }
});

exports.getEvent = factory.getOne(Event);
exports.getAllEvents = factory.getAll(Event);
exports.createEvent = factory.createOne(Event);
exports.updateEvent = factory.updateOne(Event);
exports.deleteEvent = factory.deleteOne(Event);
