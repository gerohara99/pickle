const Settings = require("../models/settingsModel");
const factory = require("./handlerFactory");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

exports.getSystemSettings = catchAsync(async (req, res, next) => {
  try {
    const settings = await Settings.findOne({});
    if (!settings) {
      return next(new AppError("No system settings found", 404));
    }

    req.session.systemDefaults = settings.systemDefaults;
    req.session.features = settings.features;

    req.session.save((err) => {
      if (err) return next(err);

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
    console.error("Error retrieving system settings:", error);
    next(new AppError("Failed to retrieve system settings", 500));
  }
});

exports.saveSettings = catchAsync(async (req, res, next) => {
  try {
    const updateObj = {};
    if (req.body.systemDefaults)
      updateObj.systemDefaults = req.body.systemDefaults;
    if (req.body.features) updateObj.features = req.body.features;

    await Settings.findOneAndUpdate({}, { $set: updateObj });

    if (req.body.systemDefaults)
      req.session.systemDefaults = req.body.systemDefaults;
    if (req.body.features) req.session.features = req.body.features;

    req.session.save((err) => {
      if (err) return next(err);

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
    console.error("Error saving system settings:", error);
    next(new AppError("Failed to save system settings", 500));
  }
});
