const express = require("express");
const bookingController = require("../controllers/bookingController");

const router = express.Router();

router.route("/create/").patch(bookingController.createBooking);
router.route("/cancel/").patch(bookingController.cancelBooking);

module.exports = router;
