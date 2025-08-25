const fs = require("fs");
const path = require("path");
const validateScheduleConfig = require("../tests/validateScheduleConfig");

// CONFIGURATION
const COURT_OPTIONS = [3, 4, 5];
const PAIRINGS = 2; // Doubles
const TARGET_ROUNDS = 9;
const REST_PERCENT_OPTIONS = [0.25, 0.3, 0.33, 0.35];
const PLAYER_COUNTS_PER_COURT = 5; // Try 5 player counts per court for simplicity

function getPlayerNumbers(n) {
  return Array.from({ length: n }, (_, i) => i + 1);
}

// Helper: Evenly spread rests for all players
function getRestingPlayers(playerNumbers, restCounts, restingPerRound) {
  return [...playerNumbers]
    .sort((a, b) => restCounts[a] - restCounts[b])
    .slice(0, restingPerRound);
}

// Helper: Backtracking unique pairing for a round
function backtrackPairs(
  playing,
  partnershipTracker,
  pairs = [],
  used = new Set()
) {
  if (pairs.length === playing.length / 2) return pairs;
  for (let i = 0; i < playing.length; i++) {
    if (used.has(playing[i])) continue;
    for (let j = i + 1; j < playing.length; j++) {
      if (used.has(playing[j])) continue;
      if (!partnershipTracker[playing[i]].has(playing[j])) {
        used.add(playing[i]);
        used.add(playing[j]);
        pairs.push([playing[i], playing[j]]);
        const result = backtrackPairs(playing, partnershipTracker, pairs, used);
        if (result) return result;
        pairs.pop();
        used.delete(playing[i]);
        used.delete(playing[j]);
      }
    }
    break; // Only try first available i to reduce branching
  }
  return null;
}

// MAIN SCHEDULE GENERATOR
function generateScheduleConfig(courts, players, rounds, restPercent) {
  const playersPerCourt = PAIRINGS * 2;
  const playingPerRound = courts * playersPerCourt;
  const restingPerRound = players - playingPerRound;
  if (restingPerRound < 0 || playingPerRound <= 0) return null;

  const playerNumbers = getPlayerNumbers(players);
  let restCounts = {};
  playerNumbers.forEach((p) => (restCounts[p] = 0));
  let partnershipTracker = {};
  playerNumbers.forEach((p) => (partnershipTracker[p] = new Set()));

  let roundsConfig = [];
  let valid = true;

  for (let roundIdx = 0; roundIdx < rounds; roundIdx++) {
    // Spread rests as evenly as possible
    const resting = getRestingPlayers(
      playerNumbers,
      restCounts,
      restingPerRound
    );
    resting.forEach((p) => restCounts[p]++);

    const playing = playerNumbers.filter((p) => !resting.includes(p));

    // Backtracking for unique pairs
    let pairs = backtrackPairs(playing, partnershipTracker);
    if (!pairs || pairs.length !== courts * 2) {
      valid = false;
      break;
    }

    // Assign pairs to courts (2 pairs per court)
    let matches = [];
    for (let c = 0; c < courts; c++) {
      let idx = c * 2;
      matches.push({
        teamA: pairs[idx],
        teamB: pairs[idx + 1],
      });
      // Track partnerships for uniqueness
      partnershipTracker[pairs[idx][0]].add(pairs[idx][1]);
      partnershipTracker[pairs[idx][1]].add(pairs[idx][0]);
      partnershipTracker[pairs[idx + 1][0]].add(pairs[idx + 1][1]);
      partnershipTracker[pairs[idx + 1][1]].add(pairs[idx + 1][0]);
    }

    roundsConfig.push({ resting, matches });
  }

  if (!valid) return null;

  // Calculate actual rest percent and games per player
  const restsPerPlayer = Math.max(...playerNumbers.map((p) => restCounts[p]));
  const gamesPerPlayer = rounds - restsPerPlayer;
  const actualRestPercent = restsPerPlayer / rounds;

  // BASIC VALIDATION
  if (gamesPerPlayer <= 0 || restsPerPlayer <= 0) return null;

  // Check all players have same number of rests/games
  const minRests = Math.min(...playerNumbers.map((p) => restCounts[p]));
  const maxRests = Math.max(...playerNumbers.map((p) => restCounts[p]));
  if (minRests !== maxRests) return null;

  return {
    courts,
    pairings: PAIRINGS,
    players,
    rounds,
    restsPerPlayer,
    actualRestPercent,
    gamesPerPlayer,
    roundsConfig,
  };
}

// GENERATE CONFIGS
const configs = [];
for (const courts of COURT_OPTIONS) {
  const minPlayers = courts * 4 + 1;
  const maxPlayers = minPlayers + PLAYER_COUNTS_PER_COURT - 1;
  for (let players = minPlayers; players <= maxPlayers; players++) {
    for (const restPercent of REST_PERCENT_OPTIONS) {
      for (
        let rounds = TARGET_ROUNDS - 2;
        rounds <= TARGET_ROUNDS + 2;
        rounds++
      ) {
        const config = generateScheduleConfig(
          courts,
          players,
          rounds,
          restPercent
        );
        if (config) configs.push(config);
      }
    }
  }
}

// POST-PROCESSING: Filter only valid configs
const validConfigs = configs.filter((cfg) => {
  const playerNumbers = Array.from({ length: cfg.players }, (_, i) => i + 1);
  const validation = validateScheduleConfig(cfg.roundsConfig, playerNumbers);
  return validation.valid;
});

// Remove duplicate configs (by courts, players, rounds, restsPerPlayer, and matches hash)
function configKey(cfg) {
  return `${cfg.courts}-${cfg.players}-${cfg.rounds}-${cfg.restsPerPlayer}-${JSON.stringify(cfg.roundsConfig)}`;
}

const uniqueConfigs = [];
const seenKeys = new Set();

for (const cfg of validConfigs) {
  const key = configKey(cfg);
  if (!seenKeys.has(key)) {
    uniqueConfigs.push(cfg);
    seenKeys.add(key);
  }
}

// WRITE OUTPUT
const outputPath = path.join(__dirname, "../public/js/schedules.json");
fs.mkdirSync(path.dirname(outputPath), { recursive: true }); // Ensure directory exists
fs.writeFileSync(outputPath, JSON.stringify(uniqueConfigs, null, 2), "utf-8");

console.log(
  `✅ schedules.json generated with ${uniqueConfigs.length} unique valid configs.`
);
