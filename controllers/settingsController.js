const Settings = require("../models/settingsModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const mongoose = require("mongoose");
const requestTimeout = require("../utils/requestTimeout");
const { renderSingleDocument } = require("../utils/serverControllerUtils");

exports.getSystemSettings = [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    await renderSingleDocument({
      req,
      res,
      next,
      Model: Settings,
      id: undefined, // For singleton settings, you may want to fetch the first document
      view: "settingsView", // Replace with your actual view name
      title: "System Settings",
      extraContext: {},
    });
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

// When rendering views, always use buildRenderContext(req, {...})
// When rendering views, always use buildRenderContext(req, {...})
