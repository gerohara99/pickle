const express = require("express");
const eventController = require("../controllers/eventController");
const authController = require("../controllers/authController");

const router = express.Router();

/// User functions
router
  .route("/updateMatchScore")
  .patch(authController.protect, eventController.updateMatchScore);

router
  .route("/booking/create/")
  .patch(eventController.createBooking, eventController.checkSchedule);

router
  .route("/booking/cancel/")
  .patch(eventController.cancelBooking, eventController.checkSchedule);

// Admin functions
router
  .route("/")
  .get(eventController.getAllEvents)
  .post(
    authController.protect,
    authController.restrictTo("clubAdmin", "pickleAdmin"),
    eventController.createEvent
  );

router
  .route("/:id")
  .get(eventController.getEvent)
  .patch(
    authController.protect,
    authController.restrictTo("clubAdmin", "pickleAdmin"),
    eventController.updateEvent
  )
  .delete(
    authController.protect,
    authController.restrictTo("clubAdmin", "pickleAdmin"),
    eventController.deleteEvent
  );

module.exports = router;
