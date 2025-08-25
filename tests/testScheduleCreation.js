require("dotenv").config({
  path: require("path").resolve(__dirname, "../config.env"),
});

const mongoose = require("mongoose");
const User = require("../models/userModel");
const Event = require("../models/eventModel");
const { createBooking } = require("../controllers/eventController");

const MONGO_URI = process.env.DEV_DATABASE;
const EVENT_ID = "68ab277190736277baa6e48d";

async function assignUsersToEvent() {
  await mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  // Get first 8 users with userType "user"
  const users = await User.find({ role: "user" }).limit(8);

  if (users.length < 8) {
    console.error("Not enough users found.");
    process.exit(1);
  }

  for (const user of users) {
    // Simulate a booking request object
    const req = {
      body: {
        eventId: EVENT_ID,
        userId: user._id,
        userName: user.userName || user.name,
      },
    };
    const res = {
      status: () => ({
        json: (data) => console.log("Booking response:", data),
      }),
    };
    await new Promise((resolve) => {
      createBooking(req, res, (err) => {
        if (err) console.error("Booking error:", err);
        resolve();
      });
    });
  }

  console.log("Assigned 8 users to event:", EVENT_ID);
  mongoose.disconnect();
}

assignUsersToEvent();
