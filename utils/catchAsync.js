module.exports = (fn) => (req, res, next) => {
  if (typeof fn !== "function") {
    const err = new Error("catchAsync: Wrapped value is not a function");
    if (process.env.NODE_ENV === "development") {
      console.error(err);
    }
    return next(err);
  }
  try {
    const maybePromise = fn(req, res, next);
    if (maybePromise && typeof maybePromise.catch === "function") {
      maybePromise.catch((err) => {
        if (process.env.NODE_ENV === "development") {
          console.error("Async error caught:", err);
        }
        next(err);
      });
    } else {
      // If not a promise, just return
      return maybePromise;
    }
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("Sync error caught:", err);
    }
    next(err);
  }
};
