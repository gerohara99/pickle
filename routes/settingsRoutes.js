const express = require("express");
const { body } = require("express-validator");
const authController = require("../controllers/authController");
const settingsController = require("../controllers/settingsController");

const router = express.Router();

// Input validation for settings update
const validateSettingsFields = [
  body("systemDefaults")
    .optional()
    .isObject()
    .withMessage("systemDefaults must be an object"),
  body("features")
    .optional()
    .isObject()
    .withMessage("features must be an object"),
];

// User functions
router.route("/get").get(...settingsController.getSystemSettings);

// Admin functions
router
  .route("/update")
  .patch(
    authController.protect,
    authController.restrictTo("clubAdmin", "pickleAdmin"),
    ...settingsController.saveSettings,
    validateSettingsFields
  );

module.exports = router;
