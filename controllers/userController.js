const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const factory = require("./handlerFactory");
const mongoose = require("mongoose");

const requestTimeout = (req, res, next) => {
  try {
    res.setTimeout(15000, () => {
      console.warn(`User request timed out: ${req.originalUrl}`);
      res.status(503).send("Request timed out");
    });
    next();
  } catch (err) {
    console.error("Synchronous error in requestTimeout:", err);
    next(err);
  }
};

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
    try {
      if (!req.body.userId) throw new AppError("User ID is required", 400);
      if (!req.body.name) throw new AppError("Name is required", 400);
      if (!req.body.email) throw new AppError("Email is required", 400);
      if (!req.body.mobile) throw new AppError("Mobile is required", 400);
    } catch (err) {
      console.error("Synchronous error in updateAcDetails:", err);
      return next(err);
    }

    try {
      // Removed transaction for simplicity and to avoid conflicts with session handling
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
    } catch (err) {
      console.error("Error updating account details:", err);
      next(new AppError("Failed to update account details", 500));
    }
  }),
];

exports.deleteMe = [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    try {
      if (!req.user || !req.user.id)
        throw new AppError("User not authenticated", 401);
    } catch (err) {
      console.error("Synchronous error in deleteMe:", err);
      return next(err);
    }

    try {
      // Removed transaction for simplicity and to avoid conflicts with session handling
      await User.findByIdAndUpdate(req.user.id, { active: false });
      res.status(204).json({
        status: "success",
        data: null,
      });
    } catch (err) {
      console.error("Error deleting user:", err);
      next(new AppError("Failed to delete user", 500));
    }
  }),
];

exports.createUser = [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    try {
      if (!req.body.name) throw new AppError("Name is required", 400);
      if (!req.body.email) throw new AppError("Email is required", 400);
      if (!req.body.mobile) throw new AppError("Mobile is required", 400);
      if (!req.body.password) throw new AppError("Password is required", 400);
      if (!req.body.passwordConfirm)
        throw new AppError("Password confirmation is required", 400);
    } catch (err) {
      console.error("Synchronous error in createUser:", err);
      return next(err);
    }

    try {
      // Removed transaction for simplicity and to avoid conflicts with session handling
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
    } catch (err) {
      console.error("Error creating user:", err);
      next(new AppError("Failed to create user", 500));
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

    try {
      // Removed transaction for simplicity and to avoid conflicts with session handling
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
        }
      );

      if (!updatedUser) {
        return next(new AppError("No user found with that ID", 404));
      }

      res.status(200).json({
        status: "success",
        data: { user: updatedUser },
      });
    } catch (err) {
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

    try {
      // Removed transaction for simplicity and to avoid conflicts with session handling
      const deletedUser = await User.findByIdAndDelete(req.params.id);
      if (!deletedUser) {
        return next(new AppError("No user found with that ID", 404));
      }
      
      res.status(204).json({
        status: "success",
        data: null,
      });
    } catch (err) {
      console.error("Error deleting user:", err);
      next(new AppError("Failed to delete user", 500));
    }
  }),
];

exports.getUser = [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    try {
      if (!req.params.id) throw new AppError("User ID param is required", 400);
    } catch (err) {
      console.error("Synchronous error in getUser:", err);
      return next(err);
    }

    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return next(new AppError("No user found with that ID", 404));
      }
      res.status(200).json({
        status: "success",
        data: { user },
      });
    } catch (err) {
      console.error("Error fetching user:", err);
      next(new AppError("Failed to fetch user", 500));
    }
  }),
];

exports.getAllUsers = [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    try {
      const users = await User.find();
      res.status(200).json({
        status: "success",
        results: users.length,
        data: { users },
      });
    } catch (err) {
      console.error("Error fetching users:", err);
      next(new AppError("Failed to fetch users", 500));
    }
  }),
];
