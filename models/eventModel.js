const mongoose = require("mongoose");

const playerSchema = new mongoose.Schema({
  playerA: { type: mongoose.Schema.ObjectId, ref: "User" },
  playerB: { type: mongoose.Schema.ObjectId, ref: "User" },
});

const standOutSchema = new mongoose.Schema({
  standOuts: { type: mongoose.Schema.ObjectId, ref: "User" },
});

const scheduleSchema = new mongoose.Schema({
  round: { type: Number },
  pairings: [playerSchema],
  standOuts: [standOutSchema],
});

const eventSchema = new mongoose.Schema(
  {
    eventName: {
      type: String,
      required: [true, "Please enter the name of the event"],
    },
    eventLocation: {
      type: String,
      required: [true, "Please enter location of the event"],
    },
    eventZipCode: {
      type: String,
    },
    eventDate: {
      type: Date,
      required: [true, "Please enter a date for the event"],
    },
    eventStartTime: {
      type: String,
      required: [true, "Please enter a start time for the event"],
    },
    eventOrganiser: {
      type: String,
      //required: [true, "Please enter an organiser name for the event"],
    },
    eventNumOfPlayers: {
      type: Number,
      required: [true, "Please enter number of players for the event"],
    },
    eventNumOfStandOuts: {
      type: Number,
      required: [true, "Please enter number of standout players per round"],
    },
    eventNumOfRounds: {
      type: Number,
      required: [true, "Please enter number of rounds per event"],
    },
    eventNumOfPairings: {
      type: Number,
      required: [true, "Please enter number of player pairings per round"],
    },
    bookings: [{ type: mongoose.Schema.ObjectId, ref: "User" }],
    schedule: [scheduleSchema],
  },
  {
    // enable virtual fields
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

eventSchema.pre("save", function (next) {
  this.numOfRounds = this.eventDurationMins / this.gameDurationMins;
  next();
});

// Using virtual populate to populate location from locations schema
eventSchema.pre(/^find/, function (next) {
  this.populate({
    path: "bookings",
    select:
      "-__v -passwordChangedAt -role -active -email -mobile -password -passwordResetEaxpires -passwordResetToken -passwordChangedAt",
  });
  next();
});

/*standOutSchema.pre(/^find/, function (next) {
  this.populate({
    path: "standOuts",
    select:
      "-__v -passwordChangedAt -role -active -email -mobile -password -passwordResetEaxpires -passwordResetToken -passwordChangedAt",
  });
  next();
}); */

eventSchema.pre(/^find/, function (next) {
  this.populate({
    path: "schedule.standOuts.standOuts",
  });
  next();
});

const Event = mongoose.model("Event", eventSchema);

module.exports = Event;
