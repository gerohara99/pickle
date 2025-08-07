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

    // Save session to ensure persistence before response
    req.session.save((err) => {
      if (err) return next(err);

      res.status(200).json({
        status: "success",
        message: "System settings retrieved successfully",
        data: { systemDefaults: req.session.systemDefaults },
      });
    });
  } catch (error) {
    console.error("Error retrieving system settings:", error);
    next(new AppError("Failed to retrieve system settings", 500));
  }
});

exports.saveSettings = catchAsync(async (req, res, next) => {
  try {
    await Settings.findOneAndUpdate({}, { $set: { systemDefaults: req.body } });
    req.session.systemDefaults = req.body;
    req.session.save((err) => {
      if (err) return next(err);

      res.status(200).json({
        status: "success",
        message: "System settings saved successfully",
        data: { systemDefaults: req.session.systemDefaults },
      });
    });
  } catch (error) {
    console.error("Error saving sysetm settings:", error);
    next(new AppError("Failed to save system settingse", 500));
  }
});
