const AppError = require("../utils/appError");

const handleCastErrorDB = (err) => {
  try {
    const message = `Invalid ${err.path}: ${err.value}.`;
    return new AppError(message, 400);
  } catch (syncErr) {
    console.error("Synchronous error in handleCastErrorDB:", syncErr);
    return new AppError("Database cast error", 500);
  }
};

const handleDuplicateFieldsDB = (err) => {
  try {
    const duplicates = Object.values(err.keyValue);
    const message = `Duplicate value - ${duplicates}. Please enter a different value`;
    return new AppError(message, 400);
  } catch (syncErr) {
    console.error("Synchronous error in handleDuplicateFieldsDB:", syncErr);
    return new AppError("Database duplicate error", 500);
  }
};

const handleValidationErrorDB = (err) => {
  try {
    const errors = Object.values(err.errors).map((el) => el.message);
    const message = `Invalid input data ${errors.join(". ")}`;
    return new AppError(message, 400);
  } catch (syncErr) {
    console.error("Synchronous error in handleValidationErrorDB:", syncErr);
    return new AppError("Database validation error", 500);
  }
};

const handleJWTError = () => {
  try {
    return new AppError("Invalid token. Please log in again", 401);
  } catch (syncErr) {
    console.error("Synchronous error in handleJWTError:", syncErr);
    return new AppError("JWT error", 500);
  }
};

const handleTokenExpiredError = () => {
  try {
    return new AppError("Your login has expired.", 401);
  } catch (syncErr) {
    console.error("Synchronous error in handleTokenExpiredError:", syncErr);
    return new AppError("Token expired error", 500);
  }
};

const sendErrorDev = (err, req, res) => {
  try {
    // A) API
    if (req.originalUrl.startsWith("/api")) {
      return res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack,
      });
    }

    // B) RENDERED WEBSITE
    console.error("ERROR 💥", err);
    return res.status(err.statusCode).render("error", {
      title: "Something went wrong!",
      msg: err.message,
    });
  } catch (syncErr) {
    console.error("Synchronous error in sendErrorDev:", syncErr);
    return res.status(500).render("error", {
      title: "Something went wrong!",
      msg: "Please try again later.",
    });
  }
};

const sendErrorProd = (err, req, res) => {
  try {
    // A) API
    if (req.originalUrl.startsWith("/api")) {
      // A) Operational, trusted error: send message to client
      if (err.isOperational) {
        return res.status(err.statusCode).json({
          status: err.status,
          message: err.message,
        });
      }
      // B) Programming or other unknown error: don't leak error details
      // 1) Log error
      console.error("ERROR 💥", err);
      // 2) Send generic message
      return res.status(500).json({
        status: "error",
        message: "Something went very wrong!",
      });
    }

    // B) RENDERED WEBSITE
    // A) Operational, trusted error: send message to client
    if (err.isOperational) {
      return res.status(err.statusCode).render("error", {
        title: "Something went wrong!",
        msg: err.message,
      });
    }
    // B) Programming or other unknown error: don't leak error details
    // 1) Log error
    console.error("ERROR 💥", err);
    // 2) Send generic message
    return res.status(err.statusCode).render("error", {
      title: "Something went wrong!",
      msg: "Please try again later.",
    });
  } catch (syncErr) {
    console.error("Synchronous error in sendErrorProd:", syncErr);
    return res.status(500).render("error", {
      title: "Something went wrong!",
      msg: "Please try again later.",
    });
  }
};

module.exports = (err, req, res, next) => {
  try {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || "error";

    if (process.env.NODE_ENV === "development") {
      sendErrorDev(err, req, res);
    } else if (process.env.NODE_ENV === "production") {
      let error = { ...err };
      error.message = err.message;

      if (err.name === "CastError") error = handleCastErrorDB(error);
      if (err.code === 11000) error = handleDuplicateFieldsDB(error);
      if (err._message === "Tour validation failed")
        error = handleValidationErrorDB(error);
      if (error.name === "JsonWebTokenError") error = handleJWTError();
      if (error.name === "TokenExpiredError") error = handleTokenExpiredError();
      sendErrorProd(error, req, res);
    }
  } catch (syncErr) {
    console.error("Synchronous error in errorController middleware:", syncErr);
    res.status(500).render("error", {
      title: "Something went wrong!",
      msg: "Please try again later.",
    });
  }
};
