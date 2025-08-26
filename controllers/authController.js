const crypto = require("crypto");
const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const Settings = require("../models/settingsModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const sendEMail = require("../utils/email");
const mongoose = require("mongoose");

exports.authTimeout = (req, res, next) => {
  try {
    res.setTimeout(15000, () => {
      console.warn(`Auth request timed out: ${req.originalUrl}`);
      res.status(503).send("Request timed out");
    });
    next();
  } catch (err) {
    console.error("Error in authTimeout middleware:", err);
    next(err);
  }
};

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createSendToken = (user, statusCode, req, res, next) => {
  try {
    const token = signToken(user._id);

    res.cookie("jwt", token, {
      expiresIn: new Date(
        Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
      secure: req.secure || req.headers["x-forwarded-proto"] === "https",
    });

    // Ensure req.session is defined before assigning properties
    if (!req.session) {
      console.error(
        "Session is undefined. Ensure session middleware is properly configured."
      );
      return next(new Error("Session is not initialized."));
    }

    req.session.user = {};
    req.session.systemDefaults = {};

    req.session.user.userId = user._id.toString();
    req.session.user.userName = user.name;
    req.session.user.userRole = user.role;
    req.session.user.userMobile = user.mobile;
    user.password = undefined;

    // Replace callback-based req.session.save() with Promise-based approach
    new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) return reject(err);
        resolve();
      });
    })
      .then(() => {
        if (res.headersSent) return;
        res.status(statusCode).json({
          status: "success",
          token,
          user: user,
        });
      })
      .catch((error) => {
        if (res.headersSent) return;
        console.error("Session save error:", error);
        return next(error);
      });
  } catch (err) {
    console.error("Synchronous error in createSendToken:", err);
    next(err);
  }
};

exports.signup = catchAsync(async (req, res, next) => {
  try {
    if (!req.body.email) throw new AppError("Email is required", 400);
    if (!req.body.password) throw new AppError("Password is required", 400);
    if (!req.body.passwordConfirm)
      throw new AppError("Password confirmation is required", 400);
  } catch (err) {
    console.error("Synchronous error in signup:", err);
    return next(err);
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const newUserArr = await User.create(
      [
        {
          name: req.body.name,
          email: req.body.email,
          mobile: req.body.mobile,
          password: req.body.password,
          passwordConfirm: req.body.passwordConfirm,
          passwordChangedAt: req.body.passwordChangedAt,
          role: req.body.role,
          active: true,
        },
      ],
      { session }
    );
    await session.commitTransaction();
    session.endSession();
    createSendToken(newUserArr[0], 201, req, res, next);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("Signup transaction error:", err);
    next(new AppError("Failed to sign up user", 500));
  }
});

exports.create = catchAsync(async (req, res, next) => {
  try {
    if (!req.body.email) throw new AppError("Email is required", 400);
    if (!req.body.password) throw new AppError("Password is required", 400);
    if (!req.body.passwordConfirm)
      throw new AppError("Password confirmation is required", 400);
  } catch (err) {
    console.error("Synchronous error in create:", err);
    return next(err);
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const newUserArr = await User.create(
      [
        {
          name: req.body.name,
          email: req.body.email,
          mobile: req.body.mobile,
          password: req.body.password,
          passwordConfirm: req.body.passwordConfirm,
          passwordChangedAt: req.body.passwordChangedAt,
          role: req.body.role,
        },
      ],
      { session }
    );
    await session.commitTransaction();
    session.endSession();
    createSendToken(newUserArr[0], 201, req, res, next);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("User creation transaction error:", err);
    next(new AppError("Failed to create user", 500));
  }
});

exports.login = catchAsync(async (req, res, next) => {
  try {
    if (!req.body.email) {
      throw new AppError("Please provide email", 400);
    }
    if (!req.body.password) {
      throw new AppError("Please provide password", 400);
    }
  } catch (err) {
    return next(err);
  }

  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect email or password", 401));
  }

  createSendToken(user, 200, req, res, next);
});

exports.logout = (req, res, next) => {
  try {
    res.cookie("jwt", "loggedout", {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });
    res.locals.user = undefined;
    res.status(200).json({ status: "success" });
  } catch (err) {
    console.error("Synchronous error in logout:", err);
    next(err);
  }
};

exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      res.locals.user = currentUser;
    } catch (err) {
      console.error("Authentication issue:", err);
      return next(new AppError("Issue with Authentication", 401));
    }
  }
  next();
};

exports.protect = catchAsync(async (req, res, next) => {
  let token;

  try {
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      throw new AppError("You are not logged in", 401);
    }
  } catch (err) {
    console.error("Synchronous error in protect:", err);
    return next(err);
  }

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError("The user belonging to the token no longer exists", 401)
    );
  }

  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("User recently changed password please log in again", 401)
    );
  }

  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    try {
      if (!roles.includes(req.session.user.userRole)) {
        throw new AppError(
          "You do not have permission to perform this action",
          403
        );
      }
      next();
    } catch (err) {
      console.error("Synchronous error in restrictTo:", err);
      next(err);
    }
  };

exports.forgotPassword = catchAsync(async (req, res, next) => {
  try {
    if (!req.body.email) throw new AppError("Email is required", 400);
  } catch (err) {
    console.error("Synchronous error in forgotPassword:", err);
    return next(err);
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user = await User.findOne({ email: req.body.email }).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return next(
        new AppError("User does not exist with that email address", 404)
      );
    }
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false, session });

    const resetURL = `${req.protocol}://${req.get("host")}/me/myPasswordReset/${resetToken}`;
    const message = `Forgot your password? Submit a PATCH request with your new password and password confirm to: ${resetURL}. \nIf you didn't forget your password, please ignore this email`;

    try {
      await sendEMail({
        email: req.body.email,
        subject: "Your password reset token (valid only for 10 minutes)",
        message,
      });

      await session.commitTransaction();
      session.endSession();

      res.status(200).json({
        status: "success",
        message: "Token sent to email",
      });
    } catch (err) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false, session });
      await session.abortTransaction();
      session.endSession();

      console.error("Error sending password reset email:", err);
      return next(
        new AppError("There was an error sending password reset email", 500)
      );
    }
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("Forgot password transaction error:", err);
    next(new AppError("Unexpected error during password reset", 500));
  }
});

exports.passwordReset = catchAsync(async (req, res, next) => {
  try {
    if (!req.body.resetToken)
      throw new AppError("Reset token is required", 400);
    if (!req.body.password) throw new AppError("Password is required", 400);
    if (!req.body.passwordConfirm)
      throw new AppError("Password confirmation is required", 400);
  } catch (err) {
    console.error("Synchronous error in passwordReset:", err);
    return next(err);
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const hashedToken = crypto
      .createHash("sha256")
      .update(req.body.resetToken)
      .digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    }).session(session);

    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError("Token is invalid or has expired", 400));
    }

    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ session });

    await session.commitTransaction();
    session.endSession();

    createSendToken(user, 200, req, res, next);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("Password reset transaction error:", err);
    next(new AppError("Unexpected error during password reset", 500));
  }
});

exports.updateMyPassword = catchAsync(async (req, res, next) => {
  try {
    if (!req.body.userId) throw new AppError("User ID is required", 400);
    if (!req.body.currentPassword)
      throw new AppError("Current password is required", 400);
    if (!req.body.newPassword)
      throw new AppError("New password is required", 400);
    if (!req.body.newPasswordConfirm)
      throw new AppError("New password confirmation is required", 400);
  } catch (err) {
    console.error("Synchronous error in updateMyPassword:", err);
    return next(err);
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const user = await User.findById(req.body.userId)
      .select("+password")
      .session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError("No match for logged in user in database", 404));
    }

    if (
      !(await user.correctPassword(req.body.currentPassword, user.password))
    ) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError("Your current password is wrong", 401));
    }

    if (req.body.newPassword !== req.body.newPasswordConfirm) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError("Passwords are not the same", 400));
    }

    user.password = req.body.newPassword;
    user.passwordConfirm = req.body.newPasswordConfirm;
    await user.save({ session });

    await session.commitTransaction();
    session.endSession();

    createSendToken(user, 200, req, res, next);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("Update password transaction error:", err);
    next(new AppError("Unexpected error during password update", 500));
  }
});
