const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const mongoose = require("mongoose");
const {
  renderPaginatedList,
  renderSingleDocument,
} = require("../utils/serverControllerUtils");
const requestTimeout = require("../utils/requestTimeout");

exports.deleteOne = (Model) => [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    try {
      if (
        !req.params.id ||
        req.params.id === "null" ||
        req.params.id === "undefined"
      ) {
        return next(
          new AppError("ID is required and cannot be null or undefined", 400)
        );
      }

      // Check if ID is a valid ObjectId to prevent Mongoose errors
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        console.error(`Invalid ObjectId format: ${req.params.id}`);
        return next(new AppError("Invalid ID format", 400));
      }
    } catch (err) {
      console.error("Synchronous error in deleteOne:", err);
      return next(err);
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const doc = await Model.findByIdAndDelete(req.params.id).session(session);

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
      console.error("Error in deleteOne transaction:", err);
      await session.abortTransaction();
      session.endSession();
      return next(new AppError("Failed to delete document", 500));
    }
  }),
];

exports.updateOne = (Model) => [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    try {
      if (!req.params.id) throw new AppError("ID param is required", 400);
      if (!req.body) throw new AppError("Request body is required", 400);
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
      console.error("Error in updateOne transaction:", err);
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

exports.getOne = (Model) => [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    await renderSingleDocument({
      req,
      res,
      next,
      Model,
      id: req.params.id,
      view: "detailView", // Replace with your actual view name
      title: `${Model.modelName} Details`,
      extraContext: {},
    });
  }),
];

exports.getAll = (Model) => [
  requestTimeout,
  catchAsync(async (req, res, next) => {
    await renderPaginatedList({
      req,
      res,
      next,
      Model,
      filter: {}, // Add filter logic if needed
      sort: {}, // Add sort logic if needed
      view: "listView", // Replace with your actual view name
      title: `All ${Model.modelName}s`,
      extraContext: {},
    });
  }),
];
