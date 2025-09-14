const AppError = require("./appError");

/**
 * Normalize user session and save it, then send response.
 */
async function normalizeAndSaveSession(user, statusCode, req, res, next) {
  try {
    if (!req.session) {
      throw new AppError("Session is not initialized.", 500);
    }
    req.session.user = {};
    req.session.systemDefaults = {};
    req.session.features = {};

    const normalizedRole = user.role ? user.role.toLowerCase() : null;
    req.session.user.userId = user._id.toString();
    req.session.user.userName = user.name;
    req.session.user.userRole = normalizedRole;
    req.session.user.role = normalizedRole;
    req.session.user.userMobile = user.mobile;
    user.password = undefined;

    await new Promise((resolve, reject) => {
      req.session.save((err) => (err ? reject(err) : resolve()));
    });

    if (!res.headersSent) {
      res.status(statusCode).json({
        status: "success",
        user,
      });
    }
  } catch (err) {
    next(err);
  }
}

/**
 * Validate required fields in an object.
 */
function validateRequiredFields(obj, fields, next) {
  for (const field of fields) {
    if (!obj[field]) {
      next(new AppError(`Missing required field: ${field}`, 400));
      return;
    }
  }
}

/**
 * Run a function in a mongoose transaction.
 */
async function withTransaction(fn, next) {
  const mongoose = require("mongoose");
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    await fn(session);
    await session.commitTransaction();
    session.endSession();
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
}

module.exports = {
  normalizeAndSaveSession,
  validateRequiredFields,
  withTransaction,
};
