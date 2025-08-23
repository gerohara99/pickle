const Event = require("../models/eventModel");
const factory = require("./handlerFactory");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const { sendWhatsAppMessage } = require("../utils/twilioClient");

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
      event.scheduleConfiguration.players + event.eventWaitListSize
    ) {
      return next(new AppError("There are no spaces left for this event", 400));
    }

    // Update event with booking
    let newBookings = [...event.eventBookings];
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

    /* try {
      await sendWhatsAppMessage(
        req.session.user.userMobile,
        `Your booking for event ${event.eventName} is confirmed!`
      );
    } catch (waErr) {
      // Log error but don't block booking creation
      console.error("WhatsApp message failed:", waErr);
    } */

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

    /*try {
      await sendWhatsAppMessage(
        req.session.user.userMobile,
        `Your booking for event ${event.eventName} has been cancelled.`
      );
    } catch (waErr) {
      // Log error but don't block cancellation
      console.error("WhatsApp message failed:", waErr);
    } */

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
    if (!event) return next(new AppError("No event found with that ID", 404));

    let playerslist = event.eventBookings.slice(
      0,
      event.scheduleConfiguration.players
    );

    if (event.eventBookings.length >= event.scheduleConfiguration.players) {
      const standOuts = generateStandOutsPubJs(
        playerslist,
        event.scheduleConfiguration.rounds,
        event.scheduleConfiguration.restsPerPlayer // or another field if needed
      );
      const availablePairings = generateAvailablePairingsPubJs(playerslist);
      const schedule = generateSchedulePubJs(
        availablePairings,
        standOuts,
        event.scheduleConfiguration.courts,
        event.scheduleConfiguration.pairings
      );
      await Event.findByIdAndUpdate(
        eventId,
        { $set: { rounds: schedule } },
        { new: true, runValidators: false }
      );
    }
  } catch (err) {
    console.error("Error in checkAndUpdateSchedule:", err);
    next(err);
  }
}

function generateStandOutsPubJs(playersList, numOfRounds, numStandOuts) {
  // Calculate total rests needed
  const totalRests = numOfRounds * numStandOuts;
  const baseRests = Math.floor(totalRests / playersList.length);
  const extraRests = totalRests % playersList.length;

  // Assign rest counts per player
  const restCounts = Array(playersList.length).fill(baseRests);
  for (let i = 0; i < extraRests; i++) {
    restCounts[i]++;
  }

  // Track which rounds each player rests in
  const playerRestRounds = Array(playersList.length)
    .fill(0)
    .map(() => []);

  // For each round, pick the numStandOuts players who have the most remaining rests to assign,
  // and who did NOT rest in the previous round
  const restSchedule = Array(numOfRounds)
    .fill(0)
    .map(() => []);
  for (let round = 0; round < numOfRounds; round++) {
    // Build candidate list: players who still need rests, and didn't rest last round
    let candidates = [];
    for (let pIdx = 0; pIdx < playersList.length; pIdx++) {
      if (
        restCounts[pIdx] > 0 &&
        (playerRestRounds[pIdx].length === 0 ||
          playerRestRounds[pIdx][playerRestRounds[pIdx].length - 1] !==
            round - 1)
      ) {
        candidates.push({ idx: pIdx, remaining: restCounts[pIdx] });
      }
    }
    // Sort candidates by most remaining rests, then by least recent rest
    candidates.sort((a, b) => b.remaining - a.remaining);

    // Pick up to numStandOuts
    for (let i = 0; i < numStandOuts && i < candidates.length; i++) {
      const pIdx = candidates[i].idx;
      restSchedule[round].push(playersList[pIdx]);
      restCounts[pIdx]--;
      playerRestRounds[pIdx].push(round);
    }
  }

  // If any rests remain unassigned, fill them in remaining rounds (fallback)
  for (let pIdx = 0; pIdx < playersList.length; pIdx++) {
    while (restCounts[pIdx] > 0) {
      // Find a round where this player is not already resting and not consecutive
      let found = false;
      for (let round = 0; round < numOfRounds; round++) {
        if (
          !restSchedule[round].some(
            (p) => p.userId === playersList[pIdx].userId
          ) &&
          (playerRestRounds[pIdx].length === 0 ||
            !playerRestRounds[pIdx].includes(round - 1))
        ) {
          restSchedule[round].push(playersList[pIdx]);
          restCounts[pIdx]--;
          playerRestRounds[pIdx].push(round);
          found = true;
          break;
        }
      }
      if (!found) break; // Can't assign without consecutive rests
    }
  }

  // Ensure each round has at most numStandOuts
  for (let round = 0; round < numOfRounds; round++) {
    while (restSchedule[round].length > numStandOuts) {
      restSchedule[round].pop();
    }
  }

  return restSchedule;
}
function generateAvailablePairingsPubJs(playersList) {
  try {
    const DUMMY = -1;
    let availablePairings = [];

    if (!playersList) throw new AppError("Players list missing", 400);

    if (playersList.length % 2 === 1) {
      playersList.push({ userName: "DUMMY" });
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
      playersList.splice(1, 0, playersList.pop());
    }
    return availablePairings;
  } catch (err) {
    console.error("Error in generateAvailablePairingsPubJs:", err);
    throw err;
  }
}

function generateSchedulePubJs(
  availablePairings,
  standOuts,
  numOfCourts,
  numOfPairings
) {
  try {
    let schedule = [];

    // Initialize schedule rounds and standOuts
    for (let round = 0; round < standOuts.length; round++) {
      schedule[round] = { matches: [], standOuts: [] };
      schedule[round].standOuts = standOuts[round].map((player) => ({
        userId: String(player.userId),
        name: player.userName,
      }));
    }

    // For each round, only assign matches to players NOT in standOuts for that round
    for (let i = 0; i < standOuts.length; i++) {
      const restingIds = new Set(standOuts[i].map((p) => String(p.userId)));
      let assignedPlayers = new Set();
      let roundPairings = availablePairings.filter(
        (pair) =>
          !restingIds.has(String(pair.playerA.userId)) &&
          !restingIds.has(String(pair.playerB.userId)) &&
          pair.pairingUsed === false
      );

      let courtsAssigned = 0;

      // For each court, find two pairings with four unique, unassigned players
      for (let k = 0; k < numOfCourts; k++) {
        let found = false;
        for (let idxA = 0; idxA < roundPairings.length; idxA++) {
          const pA1 = String(roundPairings[idxA].playerA.userId);
          const pB1 = String(roundPairings[idxA].playerB.userId);
          if (assignedPlayers.has(pA1) || assignedPlayers.has(pB1)) continue;
          for (let idxB = idxA + 1; idxB < roundPairings.length; idxB++) {
            const pA2 = String(roundPairings[idxB].playerA.userId);
            const pB2 = String(roundPairings[idxB].playerB.userId);
            if (
              assignedPlayers.has(pA2) ||
              assignedPlayers.has(pB2) ||
              [pA1, pB1].includes(pA2) ||
              [pA1, pB1].includes(pB2)
            )
              continue;

            // Found two valid pairings for this court
            roundPairings[idxA].pairingUsed = true;
            roundPairings[idxB].pairingUsed = true;
            assignedPlayers.add(pA1);
            assignedPlayers.add(pB1);
            assignedPlayers.add(pA2);
            assignedPlayers.add(pB2);

            let teamA = {
              playerA: roundPairings[idxA].playerA,
              playerB: roundPairings[idxA].playerB,
            };
            let teamB = {
              playerA: roundPairings[idxB].playerA,
              playerB: roundPairings[idxB].playerB,
            };

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
            found = true;
            break;
          }
          if (found) break;
        }
      }

      // --- FIX: Ensure all players are accounted for in this round ---
      // Gather all assigned player IDs (playing or resting)
      const allAssigned = new Set([
        ...schedule[i].standOuts.map((p) => String(p.userId)),
        ...schedule[i].matches.flatMap((m) => [
          String(m.teamA[0].userId),
          String(m.teamA[1].userId),
          String(m.teamB[0].userId),
          String(m.teamB[1].userId),
        ]),
      ]);

      // Get all player IDs from availablePairings
      const allPlayerIds = new Set(
        availablePairings.flatMap((pair) => [
          String(pair.playerA.userId),
          String(pair.playerB.userId),
        ])
      );

      // Add any missing players to standOuts for this round
      for (const pid of allPlayerIds) {
        if (!allAssigned.has(pid)) {
          // Find player object from pairings
          const playerObj =
            availablePairings.find(
              (pair) => String(pair.playerA.userId) === pid
            )?.playerA ||
            availablePairings.find(
              (pair) => String(pair.playerB.userId) === pid
            )?.playerB;
          if (playerObj) {
            schedule[i].standOuts.push({
              userId: String(playerObj.userId),
              name: playerObj.userName,
            });
          }
        }
      }
      // --- END FIX ---
    }
    return schedule;
  } catch (err) {
    console.error("Error in generateSchedulePubJs:", err);
    throw err;
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
      eventWaitListSize: req.body.eventWaitListSize,
      active: activeValue,
      doubles: req.body.doubles,
      scheduleConfiguration: req.body.scheduleConfiguration,
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
    eventWaitListSize: req.body.eventWaitListSize,
    doubles: req.body.doubles,
    scheduleConfiguration: req.body.scheduleConfiguration,
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
