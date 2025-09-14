const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema({
  user: {
    userId: { type: mongoose.Schema.ObjectId },
    userName: { type: String },
    userRole: { type: String },
    userMobile: { type: Number, default: 0 },
  },
  systemDefaults: {
    numOfStandOuts: { type: Number, default: 0 },
    numOfRounds: { type: Number, default: 0 },
    numOfCourts: { type: Number, default: 0 },
    numOfPairingsPerCourt: { type: Number, default: 0 },
    waitListSize: { type: Number, default: 0 },
  },
});

const Session = mongoose.model("Session", sessionSchema);

module.exports = Session;
