const mongoose = require("mongoose");
const slugify = require("slugify");

const eventSchema = new mongoose.Schema(
  {
    eventName: {
      type: String,
      required: [true, "Please enter the name of the event"],
    },
    eventLocation: {
      type: String,
      required: [true, "Please enter the location of the event"],
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
    slug: String,
    numCourts: {
      type: Number,
      //required: [true, "Please enter a value for number of A courts available"],
      default: 2,
    },
    courtCapacity: {
      type: Number,
      /*required: [
      true,
      "Please enter a value for number of players on an A court",
    ], */
      default: 4,
    },
    eventDurationMins: {
      type: Number,
      /* required: [
      true,
      "Please enter a value for duration of an event in minutes",
    ], */
      default: 60,
    },
    gameDurationMins: {
      type: Number,
      //required: [true, "Please enter a value for duration of a game in minutes"],
      default: 10,
    },
    numOfRounds: {
      type: Number,
    },
    bookings: [],
  },
  {
    // enable virtual fields
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

eventSchema.index({ slug: 1 });

eventSchema.pre("save", function (next) {
  this.numOfRounds = this.eventDurationMins / this.gameDurationMins;
  next();
});

eventSchema.pre("save", function (next) {
  this.slug = slugify(this.eventName, { lower: true });
  next();
});

const Event = mongoose.model("Event", eventSchema);

module.exports = Event;
