const express = require("express");
const authController = require("../controllers/authController");
const settingsController = require("../controllers/settingsController");

const router = express.Router();

// User functions
router.route("/get").get(settingsController.getSystemSettings);

// Admin functions
router
  .route("/update")
  .patch(
    authController.protect,
    authController.restrictTo("clubAdmin", "pickleAdmin"),
    settingsController.saveSettings
  );

module.exports = router;
