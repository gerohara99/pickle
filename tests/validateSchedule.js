require("dotenv").config({ path: "./config.env" });
const mongoose = require("mongoose");
const Event = require("../models/eventModel");

const mongoUri = process.env.DEV_DATABASE || "mongodb://localhost:27017/pickle";

// Helper to get user name from userId
function getUserNameById(players, userId) {
  const player = players.find((p) => p.userId === userId);
  return player ? player.userName : userId;
}

async function validateEventSchedule(event) {
  const rounds = event.rounds || [];
  if (!rounds.length) {
    // Skip events with empty rounds
    return;
  }
  const players = event.eventBookings.map((b) => ({
    userId: String(b.userId),
    userName: b.userName,
  }));

  // Track partnerships: { userId: Set of userIds they've partnered with }
  const partnerships = {};
  players.forEach((p) => (partnerships[p.userId] = new Set()));

  // Track rest/play counts and rounds
  const restCounts = {};
  const playCounts = {};
  const restRounds = {};
  players.forEach((p) => {
    restCounts[p.userId] = 0;
    playCounts[p.userId] = 0;
    restRounds[p.userId] = [];
  });

  let errors = [];
  let warnings = [];

  rounds.forEach((round, roundIdx) => {
    const resting = new Set(round.standOuts.map((p) => String(p.userId)));
    const playing = new Set();

    // Check matches
    round.matches.forEach((match, matchIdx) => {
      // Team size
      if (match.teamA.length !== 2 || match.teamB.length !== 2) {
        errors.push(
          `Round ${roundIdx + 1}, Match ${matchIdx + 1}: Invalid team size`
        );
      }

      // No duplicate players in a match
      const allPlayers = [
        ...match.teamA.map((p) => String(p.userId)),
        ...match.teamB.map((p) => String(p.userId)),
      ];
      if (new Set(allPlayers).size !== allPlayers.length) {
        errors.push(
          `Round ${roundIdx + 1}, Match ${matchIdx + 1}: Duplicate player in match`
        );
      }

      // No player both resting and playing
      allPlayers.forEach((pid) => {
        if (resting.has(pid)) {
          errors.push(
            `Round ${roundIdx + 1}: Player ${getUserNameById(players, pid)} is both resting and playing`
          );
        }
        playing.add(pid);
        playCounts[pid] = (playCounts[pid] || 0) + 1;
      });

      // Partnership check
      [
        [match.teamA[0], match.teamA[1]],
        [match.teamB[0], match.teamB[1]],
      ].forEach(([p1, p2]) => {
        const id1 = String(p1.userId);
        const id2 = String(p2.userId);
        if (partnerships[id1].has(id2)) {
          errors.push(
            `Players ${getUserNameById(players, id1)} and ${getUserNameById(players, id2)} are partners more than once (repeat partnership)`
          );
        }
        partnerships[id1].add(id2);
        partnerships[id2].add(id1);
      });
    });

    // Track rests
    round.standOuts.forEach((p) => {
      const pid = String(p.userId);
      restCounts[pid] = (restCounts[pid] || 0) + 1;
      restRounds[pid].push(roundIdx + 1);
    });

    // Check all players accounted for
    const accounted = new Set([...resting, ...playing]);
    if (accounted.size !== players.length) {
      warnings.push(
        `Round ${roundIdx + 1}: ${accounted.size} players accounted for, expected ${players.length}`
      );
    }
  });

  // Best effort checks
  const restVals = Object.values(restCounts);
  const minRest = Math.min(...restVals);
  const maxRest = Math.max(...restVals);
  if (maxRest - minRest > 1) {
    warnings.push(`Uneven rest distribution: min=${minRest}, max=${maxRest}`);
  }

  // Distribution check
  Object.entries(restRounds).forEach(([pid, rounds]) => {
    if (rounds.length > 1) {
      for (let i = 1; i < rounds.length; i++) {
        if (rounds[i] - rounds[i - 1] === 1) {
          warnings.push(
            `Player ${getUserNameById(players, pid)} has consecutive rests in rounds ${rounds[i - 1]} and ${rounds[i]}`
          );
        }
      }
    }
  });

  // --- SUMMARY DATA AT TOP ---
  const avgGames =
    Object.values(playCounts).reduce((a, b) => a + b, 0) / players.length;
  const avgRests =
    Object.values(restCounts).reduce((a, b) => a + b, 0) / players.length;

  console.log(
    `=== Schedule Validation Results for Event: ${event._id} (${event.eventName || ""}) ===`
  );
  console.log(`Average number of games per player: ${avgGames.toFixed(2)}`);
  console.log(`Average number of rests per player: ${avgRests.toFixed(2)}`);
  // --- END SUMMARY DATA ---

  if (errors.length === 0) {
    console.log("✅ No mandatory rule violations found.");
  } else {
    console.error("❌ Errors:");
    errors.forEach((e) => console.error("  - " + e));
  }
  if (warnings.length > 0) {
    console.warn("⚠️ Warnings:");
    warnings.forEach((w) => console.warn("  - " + w));
  }

  // Summary stats (show user names)
  console.log(
    "Rest counts per player:",
    Object.fromEntries(
      Object.entries(restCounts).map(([pid, count]) => [
        getUserNameById(players, pid),
        count,
      ])
    )
  );
  console.log(
    "Play counts per player:",
    Object.fromEntries(
      Object.entries(playCounts).map(([pid, count]) => [
        getUserNameById(players, pid),
        count,
      ])
    )
  );
  console.log(
    "Rest rounds per player:",
    Object.fromEntries(
      Object.entries(restRounds).map(([pid, rounds]) => [
        getUserNameById(players, pid),
        rounds,
      ])
    )
  );
  console.log("\n");
}

async function main() {
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  const events = await Event.find({});
  if (!events.length) {
    console.log("No events found.");
    process.exit(0);
  }
  for (const event of events) {
    await validateEventSchedule(event);
  }
  await mongoose.disconnect();
}

main();
