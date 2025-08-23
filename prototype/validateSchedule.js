import fs from "fs";
import {
  generateDummyPlayers,
  findScheduleConfig,
} from "../utils/scheduleUtils.js";

// Parse command line arguments
const args = process.argv.slice(2);
const numCourts = parseInt(args[0], 10) || 5;
const numPairings = parseInt(args[1], 10) || 2;
const numRounds = parseInt(args[2], 10) || 10;

// Load precomputed schedules
const configs = JSON.parse(
  fs.readFileSync("./public/js/schedules.json", "utf8")
);
const config = findScheduleConfig(configs, numCourts, numPairings, numRounds);

if (!config) {
  console.error("No matching schedule config found.");
  process.exit(1);
}

const players = generateDummyPlayers(config.players);
const playerRounds = config.playerRounds;

// Validation function
function validateSchedule(config, players, playerRounds) {
  let valid = true;
  let errors = [];
  const numPlayers = players.length;
  const numRounds = config.rounds;

  // 1. For any given round, a player is either resting or playing (no duplicate or missing players per round)
  for (let round = 1; round <= numRounds; round++) {
    let playing = [];
    let resting = [];
    for (let i = 0; i < numPlayers; i++) {
      if (playerRounds[i].played.includes(round)) playing.push(i);
      if (playerRounds[i].resting.includes(round)) resting.push(i);
    }
    // No player should be both playing and resting
    const overlap = playing.filter((idx) => resting.includes(idx));
    if (overlap.length > 0) {
      valid = false;
      errors.push(
        `Player(s) ${overlap.map((i) => `Player${i + 1}`).join(", ")} both playing and resting in round ${round}`
      );
    }
    // No missing or duplicate players
    if (playing.length + resting.length !== numPlayers) {
      valid = false;
      errors.push(`Missing or duplicate players in round ${round}`);
    }
  }

  // 2. Rests are as evenly spread as possible (no consecutive rests, gaps between rests are maximized)
  for (let i = 0; i < numPlayers; i++) {
    const rests = playerRounds[i].resting;
    if (rests.length < 2) continue;
    const gaps = [];
    for (let j = 1; j < rests.length; j++) {
      gaps.push(rests[j] - rests[j - 1]);
    }
    // Wrap-around gap (between last and first rest)
    gaps.push(numRounds - rests[rests.length - 1] + rests[0]);
    const minGap = Math.min(...gaps);
    const maxGap = Math.max(...gaps);
    const idealGap = Math.floor(numRounds / rests.length);
    // Flag if any gap is 1 (consecutive rests) or gaps vary by more than 1 from ideal
    if (minGap < idealGap || maxGap > idealGap + 1) {
      valid = false;
      errors.push(
        `Player${i + 1} has rests that are not evenly spread: rounds ${rests.join(", ")}`
      );
    }
  }

  // 3. Each player has the same number of rests
  const restsCounts = playerRounds.map((pr) => pr.resting.length);
  if (!restsCounts.every((count) => count === restsCounts[0])) {
    valid = false;
    errors.push("Not all players have the same number of rests");
  }

  // 4. Each player has the same number of games played
  const gamesCounts = playerRounds.map((pr) => pr.played.length);
  if (!gamesCounts.every((count) => count === gamesCounts[0])) {
    valid = false;
    errors.push("Not all players have the same number of games played");
  }

  // 5. Each player plays more than zero games and has more than zero rests
  if (gamesCounts.some((count) => count === 0)) {
    valid = false;
    errors.push("Some players have zero games played");
  }
  if (restsCounts.some((count) => count === 0)) {
    valid = false;
    errors.push("Some players have zero rests");
  }

  // Output results
  if (valid) {
    console.log("✅ Schedule is valid!");
  } else {
    console.log("❌ Schedule is NOT valid!");
    errors.forEach((e) => console.log("  - " + e));
  }

  // List rounds each player rests in
  console.log("\nRounds resting for each player:");
  players.forEach((p, i) => {
    console.log(`${p.userName}: ${playerRounds[i].resting.join(", ")}`);
  });
}

validateSchedule(config, players, playerRounds);
