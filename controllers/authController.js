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
      expires: new Date(
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
    console.error("Error in createSendToken:", err);
    next(err);
  }
};

exports.signup = catchAsync(async (req, res, next) => {
  // Basic validation
  if (!req.body.email || !req.body.password || !req.body.passwordConfirm) {
    return next(new AppError("Please provide email, password and password confirmation", 400));
  }

  try {
    // Create user without transaction for simplicity
    const newUser = await User.create({
      name: req.body.name,
      email: req.body.email,
      mobile: req.body.mobile,
      password: req.body.password,
      passwordConfirm: req.body.passwordConfirm,
      passwordChangedAt: req.body.passwordChangedAt,
      role: req.body.role,
      active: true,
    });
    
    // Send token
    createSendToken(newUser, 201, req, res, next);
  } catch (err) {
    console.error("Signup error:", err);
    next(new AppError("Failed to sign up user", 500));
  }
});

exports.create = catchAsync(async (req, res, next) => {
  // Basic validation
  if (!req.body.email || !req.body.password || !req.body.passwordConfirm) {
    return next(new AppError("Please provide email, password and password confirmation", 400));
  }

  try {
    // Create user without transaction for simplicity
    const newUser = await User.create({
      name: req.body.name,
      email: req.body.email,
      mobile: req.body.mobile,
      password: req.body.password,
      passwordConfirm: req.body.passwordConfirm,
      passwordChangedAt: req.body.passwordChangedAt,
      role: req.body.role,
    });
    
    // Send token
    createSendToken(newUser, 201, req, res, next);
  } catch (err) {
    console.error("User creation error:", err);
    next(new AppError("Failed to create user", 500));
  }
});

exports.login = catchAsync(async (req, res, next) => {
  // Basic validation
  if (!req.body.email || !req.body.password) {
    return next(new AppError("Please provide email and password", 400));
  }

  const { email, password } = req.body;

  try {
    // Find user
    const user = await User.findOne({ email }).select("+password");
    
    // Check if user exists and password is correct
    if (!user || !(await user.correctPassword(password, user.password))) {
      return next(new AppError("Incorrect email or password", 401));
    }
    
    createSendToken(user, 200, req, res, next);
  } catch (error) {
    console.error("Error during login process:", error);
    return next(new AppError("Login process failed", 500));
  }
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
  if (!req.body.email) {
    return next(new AppError("Please provide your email", 400));
  }

  try {
    // Find user
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return next(new AppError("No user found with that email address", 404));
    }

    // Generate reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // Send email with reset URL
    const resetURL = `${req.protocol}://${req.get("host")}/me/myPasswordReset/${resetToken}`;
    const message = `Forgot your password? Submit a PATCH request with your new password and password confirm to: ${resetURL}. \nIf you didn't forget your password, please ignore this email`;

    try {
      await sendEMail({
        email: user.email,
        subject: "Your password reset token (valid only for 10 minutes)",
        message,
      });

      res.status(200).json({
        status: "success",
        message: "Token sent to email"
      });
    } catch (err) {
      // Reset the token fields and save
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });

      console.error("Error sending email:", err);
      return next(new AppError("There was an error sending the email. Try again later!", 500));
    }
  } catch (err) {
    console.error("Password reset error:", err);
    return next(new AppError("Error processing password reset", 500));
  }
});

exports.passwordReset = catchAsync(async (req, res, next) => {
  if (!req.body.resetToken || !req.body.password || !req.body.passwordConfirm) {
    return next(new AppError("Please provide token, password and password confirmation", 400));
  }

  try {
    // Hash the token from the URL parameter
    const hashedToken = crypto
      .createHash("sha256")
      .update(req.body.resetToken)
      .digest("hex");

    // Find user with valid token
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    // Check if user exists and token is valid
    if (!user) {
      return next(new AppError("Token is invalid or has expired", 400));
    }

    // Update password
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Log the user in
    createSendToken(user, 200, req, res, next);
  } catch (err) {
    console.error("Password reset error:", err);
    next(new AppError("Error resetting password", 500));
  }
});

exports.updateMyPassword = catchAsync(async (req, res, next) => {
  // Validate inputs
  if (!req.body.userId || !req.body.currentPassword || !req.body.newPassword || !req.body.newPasswordConfirm) {
    return next(new AppError("Please provide userId, current password, new password, and password confirmation", 400));
  }

  try {
    // Find current user
    const user = await User.findById(req.body.userId).select("+password");
    
    // Check if user exists
    if (!user) {
      return next(new AppError("No user found", 404));
    }

    // Check if current password is correct
    if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
      return next(new AppError("Your current password is incorrect", 401));
    }

    // Check if new passwords match
    if (req.body.newPassword !== req.body.newPasswordConfirm) {
      return next(new AppError("New passwords do not match", 400));
    }

    // Update password
    user.password = req.body.newPassword;
    user.passwordConfirm = req.body.newPasswordConfirm;
    await user.save();

    // Log user in with new password
    createSendToken(user, 200, req, res, next);
  } catch (err) {
    console.error("Password update error:", err);
    next(new AppError("Error updating password", 500));
  }
});
