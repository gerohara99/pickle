import fs from "fs";
import {
  filterConfigs,
  generateDummyPlayers,
  findScheduleConfig,
} from "../utils/scheduleUtils.js";

// Load precomputed schedules
const configs = JSON.parse(
  fs.readFileSync("./public/js/schedules.json", "utf8")
);

// Example usage:
const courts = 3;
const pairings = 2;
const rounds = 6;

// Find a matching config
const config = findScheduleConfig(configs, courts, pairings, rounds);

if (config) {
  const players = generateDummyPlayers(config.players);
  console.log("Config found:", config);
  console.log("Players:", players);
  // ...rest of your backend logic...
} else {
  console.log("No matching schedule config found.");
}
