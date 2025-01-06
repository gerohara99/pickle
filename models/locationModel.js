const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema(
  {
    locationName: {
      type: String,
      required: [true, "Please enter the name of the location"],
    },
    locationNumCourts: {
      type: Number,
      required: [true, "Please enter a value for number courts available"],
      default: 2,
    },
    locationCourtCapacity: {
      type: Number,
      required: [
        true,
        "Please enter a value for the player capacity of each court",
      ],
      default: 4,
    },
  },
  {
    // enable virtual fields
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Location = mongoose.model("Location", locationSchema);

module.exports = Location;
