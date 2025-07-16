const mongoose = require("mongoose");

const eventPairingSchema = new mongoose.Schema([
  {
    playerA: {
      userId: { type: mongoose.Schema.ObjectId },
      userName: { type: String },
    },
    playerB: {
      userId: { type: mongoose.Schema.ObjectId },
      userName: { type: String },
    },
  },
]);

const eventStandoutSchema = new mongoose.Schema([
  {
    userId: { type: mongoose.Schema.ObjectId },
    userName: { type: String },
  },
]);

const eventScheduleSchema = new mongoose.Schema({
  round: { type: Number },
  eventPairings: [eventPairingSchema],
  eventStandOuts: [eventStandoutSchema],
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
    eventType: {
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
    numOfPairingsPerRound: {
      type: Number,
      required: [true, "Please enter number of player pairings per round"],
    },
    numOfStandOutsPerRound: {
      type: Number,
      required: [true, "Please enter number of standout players per round"],
    },
    eventNumOfRounds: {
      type: Number,
      required: [true, "Please enter number of rounds per event"],
    },
    eventNumOfPlayers: {
      type: Number,
    },
    eventBookings: [
      {
        userId: { type: mongoose.Schema.ObjectId },
        userName: { type: String },
      },
    ],
    eventSchedule: [eventScheduleSchema],
  },
  {
    // enable virtual fields
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

eventSchema.pre("save", function (next) {
  this.eventNumOfPlayers = this.numOfPairingsPerRound * 2;
  next();
});

const Event = mongoose.model("Event", eventSchema);

module.exports = Event;
