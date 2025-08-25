const mongoose = require("mongoose");

const playerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.ObjectId },
  name: { type: String },
});

const matchSchema = new mongoose.Schema({
  teamA: { type: [playerSchema] },
  teamB: { type: [playerSchema] },
  court: { type: Number },
  teamAScore: { type: Number, default: 0 },
  teamBScore: { type: Number, default: 0 },
});

const roundSchema = new mongoose.Schema({
  matches: { type: [matchSchema] },
  standOuts: [
    {
      userId: { type: String },
      name: { type: String },
    },
  ],
});

// New roundConfig schema for explicit pairings
const roundConfigSchema = new mongoose.Schema(
  {
    resting: [{ type: Number }],
    matches: [
      {
        teamA: [{ type: Number }],
        teamB: [{ type: Number }],
      },
    ],
  },
  { _id: false }
);

const playerRoundSchema = new mongoose.Schema(
  {
    played: [{ type: Number }],
    resting: [{ type: Number }],
  },
  { _id: false }
);

const scheduleConfigurationSchema = new mongoose.Schema(
  {
    courts: { type: Number, required: true },
    pairings: { type: Number, required: true },
    players: { type: Number, required: true },
    rounds: { type: Number, required: true },
    gamesPerPlayer: { type: Number, required: true },
    restsPerPlayer: { type: Number, required: true },
    playerRounds: { type: [playerRoundSchema], required: false },
    roundsConfig: { type: [roundConfigSchema], required: false },
  },
  { _id: false }
);

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
    eventWaitListSize: {
      type: Number,
      required: [
        true,
        "Please enter max number of players allowed on wait list",
      ],
    },
    eventBookings: [
      {
        userId: { type: mongoose.Schema.ObjectId },
        userName: { type: String },
      },
    ],
    rounds: { type: [roundSchema] },
    active: {
      type: Boolean,
      default: true,
    },
    doubles: {
      type: Boolean,
      default: true,
    },
    scheduleConfiguration: {
      type: scheduleConfigurationSchema,
      required: true,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Event = mongoose.model("Event", eventSchema);

module.exports = Event;
