const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const factory = require("./handlerFactory");

exports.getMe = (req, res, next) => {
  req.params.id = req.session.user.userId;
  next();
};

exports.updateAcDetails = catchAsync(async (req, res, next) => {
  const updatedUser = await User.findByIdAndUpdate(
    req.body.userId,
    {
      name: req.body.name,
      email: req.body.email,
      mobile: req.body.mobile,
    },
    { runValidators: true }
  );

  res.status(200).json({ status: "success", data: { user: updatedUser } });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: "success",
    data: null,
  });
});

exports.createUser = catchAsync(async (req, res, next) => {
  // Robust boolean handling for 'active'
  let activeValue = false;
  if (typeof req.body.active !== "undefined") {
    if (typeof req.body.active === "string") {
      activeValue = req.body.active === "true" || req.body.active === "on";
    } else {
      activeValue = !!req.body.active;
    }
  }

  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    mobile: req.body.mobile,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    active: activeValue,
  });
  res.status(201).json({
    status: "success",
    data: { user: newUser },
  });
});

exports.updateUser = catchAsync(async (req, res, next) => {
  // Ensure active is a boolean if present in the request
  let activeValue = undefined;
  if (typeof req.body.active !== "undefined") {
    if (typeof req.body.active === "string") {
      activeValue = req.body.active === "true" || req.body.active === "on";
    } else {
      activeValue = !!req.body.active;
    }
  }

  // Build update object
  const updateObj = {
    name: req.body.name,
    email: req.body.email,
    mobile: req.body.mobile,
  };
  if (typeof activeValue !== "undefined") updateObj.active = activeValue;

  const updatedUser = await User.findByIdAndUpdate(req.params.id, updateObj, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: "success",
    data: { user: updatedUser },
  });
});

exports.deleteUser = factory.deleteOne(User);
exports.getUser = factory.getOne(User);
exports.getAllUsers = factory.getAll(User);
