const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    eventName: {
      type: String,
      required: [true, "Please enter the name of the event"],
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
    bookings: [{ type: mongoose.Schema.ObjectId, ref: "User" }],
    location: { type: mongoose.Schema.ObjectId, ref: "Location" },
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

// Using virtual populate to join event bookings and users but don't bring over _v, password changed or role fields
eventSchema.pre(/^find/, function (next) {
  this.populate({
    path: "bookings",
    select: "-__v -passwordChangedAt -role",
  });
  next();
});

// Using virtual populate to populate location from locations schema
eventSchema.pre(/^find/, function (next) {
  this.populate({
    path: "location",
    select: "-__v",
  });
  next();
});

const Event = mongoose.model("Event", eventSchema);

module.exports = Event;
