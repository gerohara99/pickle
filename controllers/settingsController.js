const Settings = require("../models/settingsModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const mongoose = require("mongoose");

const requestTimeout = (req, res, next) => {
  try {
    res.setTimeout(15000, () => {
      console.warn(`Settings request timed out: ${req.originalUrl}`);
      res.status(503).send("Request timed out");
    });
    next();
  } catch (err) {
    console.error("Synchronous error in requestTimeout:", err);
    next(err);
  }
};

exports.getSystemSettings = [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    try {
      if (!req.session) throw new AppError("Session not available", 500);
    } catch (err) {
      console.error("Synchronous error in getSystemSettings:", err);
      return next(err);
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const settings = await Settings.findOne({}).session(session);
      if (!settings) {
        await session.abortTransaction();
        session.endSession();
        return next(new AppError("No system settings found", 404));
      }

      req.session.systemDefaults = settings.systemDefaults;
      req.session.features = settings.features;

      req.session.save((err) => {
        if (err) {
          session.abortTransaction();
          session.endSession();
          console.error("Session save error:", err);
          return next(err);
        }

        session.commitTransaction();
        session.endSession();

        res.status(200).json({
          status: "success",
          message: "System settings retrieved successfully",
          data: {
            systemDefaults: req.session.systemDefaults,
            features: req.session.features,
          },
        });
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error("Error retrieving system settings:", error);
      next(new AppError("Failed to retrieve system settings", 500));
    }
  }),
];

exports.saveSettings = [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    try {
      if (!req.session) throw new AppError("Session not available", 500);
      if (!req.body) throw new AppError("Request body is required", 400);
    } catch (err) {
      console.error("Synchronous error in saveSettings:", err);
      return next(err);
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const updateObj = {};
      if (req.body.systemDefaults)
        updateObj.systemDefaults = req.body.systemDefaults;
      if (req.body.features) updateObj.features = req.body.features;

      await Settings.findOneAndUpdate({}, { $set: updateObj }, { session });

      if (req.body.systemDefaults)
        req.session.systemDefaults = req.body.systemDefaults;
      if (req.body.features) req.session.features = req.body.features;

      req.session.save((err) => {
        if (err) {
          session.abortTransaction();
          session.endSession();
          console.error("Session save error:", err);
          return next(err);
        }

        session.commitTransaction();
        session.endSession();

        res.status(200).json({
          status: "success",
          message: "System settings saved successfully",
          data: {
            systemDefaults: req.session.systemDefaults,
            features: req.session.features,
          },
        });
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error("Error saving system settings:", error);
      next(new AppError("Failed to save system settings", 500));
    }
  }),
];
