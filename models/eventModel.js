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
      required: [true, "Please enter an organiser name for the event"],
    },
    eventNumOfCourts: {
      type: Number,
      required: [
        true,
        "Please enter number of courts available for this event",
      ],
    },
    numOfStandOutsPerRound: {
      type: Number,
      required: [true, "Please enter number of players resting per round"],
    },
    eventNumOfRounds: {
      type: Number,
      required: [true, "Please enter number of rounds per event"],
    },
    eventWaitListSize: {
      type: Number,
      required: [
        true,
        "Please enter max number of players allowed on wait list",
      ],
    },
    eventNumOfPlayers: {
      type: Number,
    },
    eventWaitListSize: {
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
  this.eventNumOfPlayers =
    this.eventNumOfCourts * 4 + this.numOfStandOutsPerRound;
  next();
});

const Event = mongoose.model("Event", eventSchema);

module.exports = Event;
