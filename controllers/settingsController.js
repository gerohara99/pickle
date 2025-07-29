const Settings = require("../models/settingsModel");
const factory = require("./handlerFactory");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

exports.getSystemSettings = catchAsync(async (req, res, next) => {
  try {
    req.session.systemDefaults = {};
    const settings = await Settings.findOne({});
    req.session.systemDefaults = settings.systemDefaults;
  } catch (error) {
    console.error("Error retrieving system settings:", error);
  }
});

exports.saveSettings = catchAsync(async (req, res, next) => {
  try {
    await Settings.findOneAndUpdate({}, { $set: { systemDefaults: req.body } });
    req.session.systemDefaults = req.body;
    res.status(200).json({
      status: "success",
      message: "System settings updated successfully",
    });
  } catch (error) {
    console.error("Error saving sysetm settings:", error);
    next(new AppError("Failed to save system settingse", 500));
  }
});
