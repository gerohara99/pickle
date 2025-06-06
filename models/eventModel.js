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
    eventSchedule: [
      {
        round: { type: Number },
        players: [
          {
            playerA: { type: mongoose.Schema.ObjectId },
            playerB: { type: mongoose.Schema.ObjectId },
          },
        ],
        standouts: [{ standOut: { type: mongoose.Schema.ObjectId } }],
      },
    ],
    bookings: [{ type: mongoose.Schema.ObjectId, ref: "User" }],
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

const Event = mongoose.model("Event", eventSchema);

module.exports = Event;
