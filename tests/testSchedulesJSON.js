const fs = require("fs");
const path = require("path");
const validateScheduleConfig = require("./validateScheduleConfig");

// Load schedules.json
const schedulesPath = path.join(__dirname, "../public/js/schedules.json");
const schedules = JSON.parse(fs.readFileSync(schedulesPath, "utf-8"));

let allValid = true;

schedules.forEach((config, idx) => {
  // Assume player numbers are 1...N
  const playerNumbers = Array.from({ length: config.players }, (_, i) => i + 1);
  const result = validateScheduleConfig(config.roundsConfig, playerNumbers);

  if (!result.valid) {
    allValid = false;
    console.log(
      `❌ Schedule #${idx + 1} (Players: ${config.players}, Courts: ${config.courts}) is INVALID:`
    );
    result.errors.forEach((e) => console.log("  - " + e));
  } else {
    console.log(
      `✅ Schedule #${idx + 1} (Players: ${config.players}, Courts: ${config.courts}) is valid.`
    );
  }
});

if (allValid) {
  console.log("\n🎉 All schedules in schedules.json are valid!");
} else {
  console.log(
    "\n⚠️ Some schedules in schedules.json are invalid. Please review the errors above."
  );
}
