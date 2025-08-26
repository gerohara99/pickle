const express = require("express");
const { body } = require("express-validator");
const eventController = require("../controllers/eventController");
const authController = require("../controllers/authController");
const rateLimit = require("express-rate-limit");

const router = express.Router();

// Rate limiting middleware for booking
const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.BOOKING_LIMIT || 10, // Limit each IP to N requests per windowMs
  message: "Too many booking attempts from this IP, please try again later.",
});

const updateMatchScoreLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.UPDATE_SCORE_LIMIT || 5, // Limit each IP to N requests per windowMs
  message:
    "Too many score update attempts from this IP, please try again later.",
});

const handleNoShowLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NO_SHOW_LIMIT || 5, // Limit each IP to N requests per windowMs
  message: "Too many no-show reports from this IP, please try again later.",
});

// Input validation for critical event fields
const validateEventFields = [
  body("eventName").notEmpty().withMessage("Event name is required"),
  body("eventDate").notEmpty().withMessage("Event date is required"),
];

const validateBookingFields = [
  body("eventId").notEmpty().withMessage("Event ID is required"),
];

const validateCancelBookingFields = [
  body("eventId").notEmpty().withMessage("Event ID is required"),
];

const validateNoShowFields = [
  body("eventId").notEmpty().withMessage("Event ID is required"),
  body("userId").notEmpty().withMessage("User ID is required"),
];

// User functions
router
  .route("/updateMatchScore")
  .patch(
    eventController.eventTimeout,
    authController.protect,
    updateMatchScoreLimiter,
    eventController.updateMatchScore
  );

router
  .route("/booking/create/")
  .patch(
    eventController.eventTimeout,
    validateBookingFields,
    eventController.createBooking
  );

router
  .route("/booking/cancel/")
  .patch(
    eventController.eventTimeout,
    validateCancelBookingFields,
    eventController.cancelBooking
  );

// Admin functions
router
  .route("/")
  .get(eventController.eventTimeout, eventController.getAllEvents)
  .post(
    eventController.eventTimeout,
    authController.protect,
    authController.restrictTo("clubAdmin", "pickleAdmin"),
    validateEventFields,
    eventController.createEvent
  );

router
  .route("/:id")
  .get(eventController.eventTimeout, eventController.getEvent)
  .patch(
    eventController.eventTimeout,
    authController.protect,
    authController.restrictTo("clubAdmin", "pickleAdmin"),
    validateEventFields,
    eventController.updateEvent
  )
  .delete(
    eventController.eventTimeout,
    authController.protect,
    authController.restrictTo("clubAdmin", "pickleAdmin"),
    eventController.deleteEvent
  );

router.post(
  "/noShow",
  eventController.eventTimeout,
  authController.protect,
  authController.restrictTo("clubAdmin", "pickleAdmin"),
  validateNoShowFields,
  handleNoShowLimiter,
  eventController.handleNoShow
);

router.post("/book", bookingLimiter, eventController.createBooking);

module.exports = router;
