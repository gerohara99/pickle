const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const APIFeatures = require("../utils/apiFeatures");
const mongoose = require("mongoose");

const requestTimeout = (req, res, next) => {
  try {
    res.setTimeout(15000, () => {
      console.warn(`Request timed out: ${req.originalUrl}`);
      res.status(503).send("Request timed out");
    });
    next();
  } catch (err) {
    console.error("Synchronous error in requestTimeout:", err);
    next(err);
  }
};

exports.deleteOne = (Model) => [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    try {
      if (!req.params.id) throw new AppError("ID is required", 400);
    } catch (err) {
      console.error("Synchronous error in deleteOne:", err);
      return next(err);
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const doc = await Model.findByIdAndDelete(
        req.params.id,
        req.body
      ).session(session);

      if (!doc) {
        await session.abortTransaction();
        session.endSession();
        return next(new AppError("No document found with that ID", 404));
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
      console.error("Delete operation error:", err);
      next(new AppError("Failed to delete document", 500));
    }
  }),
];

exports.updateOne = (Model) => [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    try {
      if (!req.params.id) throw new AppError("ID is required", 400);
    } catch (err) {
      console.error("Synchronous error in updateOne:", err);
      return next(err);
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
        session,
      });

      if (!doc) {
        await session.abortTransaction();
        session.endSession();
        return next(new AppError("No document found with that ID", 404));
      }
      await session.commitTransaction();
      session.endSession();
      res.status(200).json({
        status: "success",
        data: { data: doc },
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      console.error("Update operation error:", err);
      next(new AppError("Failed to update document", 500));
    }
  }),
];

exports.createOne = (Model) => [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    try {
      if (!req.body) throw new AppError("Request body is required", 400);
    } catch (err) {
      console.error("Synchronous error in createOne:", err);
      return next(err);
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const docArr = await Model.create([req.body], { session });
      const doc = docArr[0];

      if (!doc) {
        await session.abortTransaction();
        session.endSession();
        return next(new AppError("No document created", 404));
      }
      await session.commitTransaction();
      session.endSession();
      res.status(201).json({
        status: "success",
        data: { data: doc },
      });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      console.error("Create operation error:", err);
      next(new AppError("Failed to create document", 500));
    }
  }),
];

exports.getOne = (Model, popOptions) => [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    try {
      if (!req.params.id) throw new AppError("ID is required", 400);
    } catch (err) {
      console.error("Synchronous error in getOne:", err);
      return next(err);
    }

    try {
      let query = Model.findById(req.params.id);
      if (popOptions) query = query.populate(popOptions);
      const doc = await query;

      if (!doc) {
        return next(new AppError("No document found with that ID", 404));
      }
      res.status(200).json({
        status: "success",
        data: { data: doc },
      });
    } catch (err) {
      console.error("Get one operation error:", err);
      next(new AppError("Failed to get document", 500));
    }
  }),
];

exports.getAll = (Model) => [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    try {
      let filter = {};
      if (req.params.tourId) filter = { tour: req.params.tourId };

      const features = new APIFeatures(Model.find(filter), req.query)
        .filter()
        .sort()
        .limitFields()
        .paginate();

      const doc = await features.query;

      if (!doc) {
        return next(new AppError("No documents found", 404));
      }
      res.status(200).json({
        status: "success",
        results: doc.length,
        data: { doc },
      });
    } catch (err) {
      console.error("Get all operation error:", err);
      next(new AppError("Failed to get documents", 500));
    }
  }),
];
