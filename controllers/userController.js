const {
  renderPaginatedList,
  renderSingleDocument,
} = require("../utils/serverControllerUtils");
const requestTimeout = require("../utils/requestTimeout");
const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const mongoose = require("mongoose");

exports.getMe = (req, res, next) => {
  try {
    if (!req.session || !req.session.user || !req.session.user.userId) {
      throw new AppError("Session user ID not available", 401);
    }
    req.params.id = req.session.user.userId;
    next();
  } catch (err) {
    console.error("Synchronous error in getMe:", err);
    next(err);
  }
};

exports.updateAcDetails = [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const updatedUser = await User.findByIdAndUpdate(
        req.body.userId,
        { name: req.body.name, email: req.body.email },
        { runValidators: true, session }
      ).lean();

      await session.commitTransaction();
      res.status(200).json({ status: "success", data: { user: updatedUser } });
    } catch (err) {
      await session.abortTransaction();
      console.error("Error updating account details:", err);
      next(new AppError("Failed to update account details", 500));
    } finally {
      session.endSession();
    }
  }),
];

exports.deleteMe = [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await User.findByIdAndUpdate(req.user.id, { active: false }, { session });
      await session.commitTransaction();
      res.status(204).json({ status: "success", data: null });
    } catch (err) {
      await session.abortTransaction();
      console.error("Error deleting user:", err);
      next(new AppError("Failed to delete user", 500));
    } finally {
      session.endSession();
    }
  }),
];

exports.createUser = [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    try {
      if (
        !req.body.name ||
        !req.body.email ||
        !req.body.password ||
        !req.body.passwordConfirm
      ) {
        throw new AppError("Required fields are missing", 400);
      }
    } catch (err) {
      console.error("Synchronous error in createUser:", err);
      return next(err);
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const newUser = await User.create(
        [
          {
            name: req.body.name,
            email: req.body.email,
            password: req.body.password,
            passwordConfirm: req.body.passwordConfirm,
          },
        ],
        { session }
      );

      await session.commitTransaction();
      res.status(201).json({ status: "success", data: { user: newUser } });
    } catch (err) {
      await session.abortTransaction();
      console.error("Error creating user:", err);
      next(new AppError("Failed to create user", 500));
    } finally {
      session.endSession();
    }
  }),
];

exports.updateUser = [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    try {
      if (!req.params.id) throw new AppError("User ID param is required", 400);
      if (!req.body.name) throw new AppError("Name is required", 400);
      if (!req.body.email) throw new AppError("Email is required", 400);
      if (!req.body.mobile) throw new AppError("Mobile is required", 400);
    } catch (err) {
      console.error("Synchronous error in updateUser:", err);
      return next(err);
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      let activeValue = undefined;
      if (typeof req.body.active !== "undefined") {
        if (typeof req.body.active === "string") {
          activeValue = req.body.active === "true" || req.body.active === "on";
        } else {
          activeValue = !!req.body.active;
        }
      }

      const updateObj = {
        name: req.body.name,
        email: req.body.email,
        mobile: req.body.mobile,
      };
      if (typeof activeValue !== "undefined") updateObj.active = activeValue;

      const updatedUser = await User.findByIdAndUpdate(
        req.params.id,
        updateObj,
        {
          new: true,
          runValidators: true,
          session,
        }
      );

      if (!updatedUser) {
        await session.abortTransaction();
        session.endSession();
        return next(new AppError("No user found with that ID", 404));
      }

      await session.commitTransaction();
      session.endSession();
      res.status(200).json({
        status: "success",
        data: { user: updatedUser },
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      console.error("Error updating user:", err);
      next(new AppError("Failed to update user", 500));
    }
  }),
];

exports.deleteUser = [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    try {
      if (!req.params.id) throw new AppError("User ID param is required", 400);
    } catch (err) {
      console.error("Synchronous error in deleteUser:", err);
      return next(err);
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const deletedUser = await User.findByIdAndDelete(req.params.id, {
        session,
      });
      if (!deletedUser) {
        await session.abortTransaction();
        session.endSession();
        return next(new AppError("No user found with that ID", 404));
      }
      await session.commitTransaction();
      session.endSession();
      res.status(204).json({
        status: "success",
        data: null,
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      console.error("Error deleting user:", err);
      next(new AppError("Failed to delete user", 500));
    }
  }),
];

exports.getUser = [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    await renderSingleDocument({
      req,
      res,
      next,
      Model: User,
      id: req.params.id,
      view: "userDetailView", // Replace with your actual view name
      title: "User Details",
      extraContext: {},
    });
  }),
];

exports.getAllUsers = [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    await renderPaginatedList({
      req,
      res,
      next,
      Model: User,
      filter: {}, // Add filter logic if needed
      sort: {}, // Add sort logic if needed
      view: "userListView", // Replace with your actual view name
      title: "All Users",
      extraContext: {},
    });
  }),
];

// When rendering views, always use buildRenderContext(req, {...})
