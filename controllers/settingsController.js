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
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const settings = await Settings.findOne({}).session(session).lean();
      if (!settings) {
        await session.abortTransaction();
        return next(new AppError("No system settings found", 404));
      }

      req.session.systemDefaults = settings.systemDefaults;
      req.session.features = settings.features;

      await session.commitTransaction();
      if (res.headersSent) return;
      res.status(200).json({
        status: "success",
        data: {
          systemDefaults: req.session.systemDefaults,
          features: req.session.features,
        },
      });
    } catch (err) {
      await session.abortTransaction();
      console.error("Error in getSystemSettings transaction:", err);
      next(new AppError("Failed to retrieve system settings", 500));
    } finally {
      session.endSession();
    }
  }),
];

exports.saveSettings = [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const updateObj = {};
      if (req.body.systemDefaults)
        updateObj.systemDefaults = req.body.systemDefaults;
      if (req.body.features) updateObj.features = req.body.features;

      await Settings.findOneAndUpdate(
        {},
        { $set: updateObj },
        { session }
      ).lean();

      req.session.systemDefaults = req.body.systemDefaults;
      req.session.features = req.body.features;

      await session.commitTransaction();
      if (res.headersSent) return;
      res.status(200).json({
        status: "success",
        message: "System settings saved successfully",
        data: {
          systemDefaults: req.session.systemDefaults,
          features: req.session.features,
        },
      });
    } catch (err) {
      await session.abortTransaction();
      console.error("Error saving system settings:", err);
      next(new AppError("Failed to save system settings", 500));
    } finally {
      session.endSession();
    }
  }),
];
