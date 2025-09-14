const crypto = require("crypto");
const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const sendEMail = require("../utils/email");
const mongoose = require("mongoose");
const {
  normalizeAndSaveSession,
  validateRequiredFields,
  withTransaction,
} = require("../utils/authUtils");

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
    req.session.features = {};

    // Normalize role case to match the enum values in the user model
    const normalizedRole = user.role ? user.role.toLowerCase() : null;

    req.session.user.userId = user._id.toString();
    req.session.user.userName = user.name;
    req.session.user.userRole = normalizedRole;
    req.session.user.role = normalizedRole; // Add role directly to match front-end expectations
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
  validateRequiredFields(
    req.body,
    ["email", "password", "passwordConfirm"],
    next
  );
  await withTransaction(async (session) => {
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
    await normalizeAndSaveSession(newUserArr[0], 201, req, res, next);
  }, next);
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

exports.logout = (req, res) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  // Destroy the session completely
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error("Session destroy error:", err);
        return res.status(500).json({
          status: "error",
          message: "Could not log out, please try again",
        });
      }

      res.clearCookie("connect.sid");

      return res.status(200).json({
        status: "success",
        message: "Logged out successfully",
      });
    });
  } else {
    // If no session exists, just return success
    return res.status(200).json({
      status: "success",
      message: "Logged out successfully",
    });
  }
};

exports.syncJWTWithSession = catchAsync(async (req, res, next) => {
  try {
    // Check if req.cookies exists before trying to access jwt
    if (req.cookies && req.cookies.jwt && req.cookies.jwt !== "loggedout") {
      try {
        // Verify the token
        const decoded = await promisify(jwt.verify)(
          req.cookies.jwt,
          process.env.JWT_SECRET
        );

        // Check if the user exists
        const currentUser = await User.findById(decoded.id);
        if (!currentUser) {
          console.log("User not found for JWT token");
          return next();
        }

        // Check if the password was changed after the token was issued
        if (currentUser.changedPasswordAfter(decoded.iat)) {
          console.log("Password changed after token was issued");
          return next();
        }

        // Store user object for downstream middleware
        req.user = currentUser;

        // Update or create the session with the user data
        if (!req.session) {
          console.log("No session object available");
          return next();
        }

        // Initialize user object if it doesn't exist
        if (!req.session.user) {
          req.session.user = {};
        }

        // Normalize role case to match the enum values in the user model
        const normalizedRole = currentUser.role
          ? currentUser.role.toLowerCase()
          : null;

        // Update session with user data
        req.session.user.userId = currentUser._id.toString();
        req.session.user.userName = currentUser.name;
        req.session.user.userRole = normalizedRole;
        req.session.user.role = normalizedRole; // Add role directly to match front-end expectations
        req.session.user.userMobile = currentUser.mobile || "";

        // Save the session
        await new Promise((resolve, reject) => {
          req.session.save((err) => {
            if (err) {
              console.error(
                "Failed to save session in syncJWTWithSession:",
                err
              );
              reject(err);
            } else {
              console.log("Session successfully updated with JWT data");
              resolve();
            }
          });
        });
      } catch (err) {
        console.log(`JWT verification failed: ${err.message}`);
        // Don't block the request on JWT verification failure
      }
    } else if (
      req.cookies &&
      req.cookies.jwt === "loggedout" &&
      req.session?.user
    ) {
      // If JWT is 'loggedout' but session still has user data, clear it
      console.log(
        "JWT is 'loggedout' but session has user data - clearing session"
      );
      req.session.user = undefined;
      await new Promise((resolve) => req.session.save(resolve));
    }
  } catch (err) {
    console.log("Error in syncJWTWithSession middleware:", err.message);
    // Don't block the request on errors
  }

  next();
});

exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies && req.cookies.jwt) {
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
    // Check for token in Authorization header or jwt cookie
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
      console.log("Using token from Authorization header");
    } else if (
      req.cookies &&
      req.cookies.jwt &&
      req.cookies.jwt !== "loggedout"
    ) {
      token = req.cookies.jwt;
      console.log("Using token from jwt cookie");
    }

    if (!token) {
      console.log("No token found - authentication required");
      return next(
        new AppError("You are not logged in! Please log in to get access", 401)
      );
    }

    // Verify the token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    console.log(`Token verified for user ID: ${decoded.id}`);

    // Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      console.log(`User not found for ID: ${decoded.id}`);
      return next(
        new AppError("The user belonging to this token no longer exists", 401)
      );
    }

    // Check if user changed password after token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      console.log("Password changed after token was issued");
      return next(
        new AppError("User recently changed password! Please log in again", 401)
      );
    }

    // Grant access - store user in request object
    req.user = currentUser;
    res.locals.user = currentUser;

    // Also update session data to ensure consistency
    if (req.session) {
      // Normalize role case to match the enum values in the user model
      const normalizedRole = currentUser.role
        ? currentUser.role.toLowerCase()
        : null;
      console.log(
        `Normalizing role from '${currentUser.role}' to '${normalizedRole}'`
      );

      req.session.user = {
        userId: currentUser._id.toString(),
        userName: currentUser.name,
        userRole: normalizedRole,
        role: normalizedRole,
        userMobile: currentUser.mobile || "",
      };

      // Save the session asynchronously - converted to promise pattern
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error("Failed to save session in protect middleware:", err);
            reject(err);
          } else {
            console.log("Session updated with authenticated user data");
            resolve();
          }
        });
      });
    } else {
      console.warn("Session object not available in protect middleware");
    }

    next();
  } catch (err) {
    console.error("Authentication error:", err.message);
    return next(
      new AppError("Authentication failed. Please log in again.", 401)
    );
  }
});

exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    try {
      // Try to get user role from multiple sources
      let userRole =
        req.session?.user?.userRole ||
        req.session?.user?.role ||
        req.user?.role ||
        null;

      // Convert userRole to lowercase for case-insensitive comparison
      const userRoleLowercase = userRole ? userRole.toLowerCase() : null;

      // Convert allowed roles to lowercase for comparison
      const allowedRolesLowercase = roles.map((role) => role.toLowerCase());

      // Log for debugging
      console.log(`[restrictTo] Access attempt for ${req.originalUrl}`);
      console.log(
        `[restrictTo] User role: ${userRole}, Required roles:`,
        roles
      );
      console.log("[restrictTo] Authentication sources:", {
        sessionExists: !!req.session,
        sessionUser: req.session?.user
          ? {
              userId: req.session.user.userId,
              role: req.session.user.role,
              userRole: req.session.user.userRole,
            }
          : null,
        reqUser: req.user
          ? {
              id: req.user._id,
              role: req.user.role,
            }
          : null,
        jwtExists: !!req.cookies?.jwt,
        jwtValue: req.cookies?.jwt
          ? req.cookies.jwt === "loggedout"
            ? "loggedout"
            : "valid token"
          : "no token",
      });

      // If no role is found or the role isn't allowed (case-insensitive comparison)
      if (
        !userRoleLowercase ||
        !allowedRolesLowercase.includes(userRoleLowercase)
      ) {
        console.log(
          `[restrictTo] Access denied: Role ${userRole} not in allowed roles:`,
          roles
        );
        return next(
          new AppError("You do not have permission to perform this action", 403)
        );
      }

      console.log(
        `[restrictTo] Access granted: Role ${userRole} authorized for ${req.originalUrl}`
      );
      next();
    } catch (err) {
      console.error("Error in restrictTo middleware:", err);
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

    const resetURL = `${req.protocol}://${req.get(
      "host"
    )}/me/myPasswordReset/${resetToken}`;
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
