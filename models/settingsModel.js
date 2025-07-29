const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema({
  systemDefaults: {
    numOfStandOuts: { type: Number, default: 0 },
    numOfRounds: { type: Number, default: 0 },
    numOfCourts: { type: Number, default: 0 },
    numOfPairingsPerCourt: { type: Number, default: 0 },
    waitListSize: { type: Number, default: 0 },
  },
});

const Settings = mongoose.model("Settings", settingsSchema);

module.exports = Settings;
