class AppError extends Error {
  constructor(message = "An error occurred", statusCode = 500) {
    // Type checking for parameters
    if (typeof message !== "string") {
      console.warn("AppError: message should be a string.");
      message = String(message);
    }
    if (
      typeof statusCode !== "number" ||
      statusCode < 100 ||
      statusCode > 599
    ) {
      console.warn("AppError: statusCode should be a valid HTTP status code.");
      statusCode = 500;
    }
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;

    // Stack trace robustness
    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, this.constructor);
    }

    // Optional: log error in development
    if (process.env.NODE_ENV === "development") {
      console.error(`AppError created: ${message} (${statusCode})`);
    }
  }
}

module.exports = AppError;
