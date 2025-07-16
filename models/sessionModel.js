const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema({
  user: {
    userId: { type: mongoose.Schema.ObjectId },
    userName: { type: String },
    userRole: { type: String },
  },
});

const Session = mongoose.model("Session", sessionSchema);

module.exports = Session;
