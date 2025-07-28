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

exports.createUser = factory.createOne(User);
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
exports.getUser = factory.getOne(User);
exports.getAllUsers = factory.getAll(User);
