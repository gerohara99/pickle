/**
 * Generate a perfect schedule using precomputed configurations.
 * Only allows configurations that guarantee unique partners every round,
 * evenly distributed rests, and equal games/rests per player.
 * Compatible with scheduleCalculator.js and schedules.json.
 */

const fs = require("fs");
const path = require("path");

// Load precomputed schedules from JSON file
function loadPrecomputedSchedules() {
  const filePath = path.join(__dirname, "../public/js/schedules.json");
  const data = fs.readFileSync(filePath, "utf8");
  return JSON.parse(data);
}

// Find the matching schedule config
function findScheduleConfig(numCourts, numPairings, numRounds) {
  const configs = loadPrecomputedSchedules();
  return configs.find(
    (cfg) =>
      cfg.courts === numCourts &&
      cfg.pairings === numPairings &&
      cfg.rounds === numRounds
  );
}

// Generate dummy players
function generateDummyPlayers(num) {
  return Array.from({ length: num }, (_, i) => ({
    userId: `user${i + 1}`,
    userName: `Player${i + 1}`,
  }));
}

// Build schedule from precomputed config
function buildUniquePartnerSchedule(numCourts, numPairings, numRounds) {
  const config = findScheduleConfig(numCourts, numPairings, numRounds);
  if (!config) {
    throw new Error(
      "No valid schedule found for this configuration. Please select a valid option in the calculator."
    );
  }
  const players = generateDummyPlayers(config.players);
  // The config.playerRounds contains played/resting rounds for each player
  // You can expand this to include actual match pairings if needed
  return {
    config,
    players,
    playerRounds: config.playerRounds,
  };
}

// Export for validator and other modules
module.exports = {
  buildUniquePartnerSchedule,
  generateDummyPlayers,
  findScheduleConfig,
};
