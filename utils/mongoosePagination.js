// Renamed from viewControllerUtils.js to controllerUtils.js
const mongoose = require("mongoose");
const Event = require("../models/eventModel");
const AppError = require("../utils/appError");
const paginate = require("./mongoosePagination");

/**
 * Build a standardized context object for rendering views.
 * Includes user/session info and merges any extra context.
 */
function buildRenderContext(req, extra = {}) {
  const user = req.session?.user || {};
  return {
    userId: user.userId || null,
    userName: user.userName || null,
    userRole: user.userRole || user.role || null,
    features: req.session?.features || {},
    systemDefaults: req.session?.systemDefaults || {},
    showNav: typeof extra.showNav !== "undefined" ? extra.showNav : true,
    ...extra,
  };
}

exports.buildRenderContext = buildRenderContext;

exports.renderPaginatedList = async ({
  req,
  res,
  next,
  Model,
  filter,
  sort,
  view,
  title,
  extraContext = {},
}) => {
  const session = await Model.startSession();
  try {
    await session.startTransaction();
    const query = Model.find(filter).sort(sort).session(session);
    const pagination = await paginate(query, req);
    await session.commitTransaction();
    session.endSession();

    // Ensure response structure matches frontend expectations
    const responseData = {
      status: "success",
      data: {
        data: {
          doc: pagination.results,
        },
        results: pagination.results.length,
      },
    };

    res.status(200).json(responseData);
    // If you want to render a view instead, use:
    // res.status(200).render(view, {
    //   title,
    //   [view === "showAllUsers" ? "users" : "events"]: pagination.results,
    //   ...exports.buildRenderContext(req, {
    //     currentPage: pagination.currentPage,
    //     totalPages: pagination.totalPages,
    //     results: pagination.results.length,
    //     limit: pagination.limit,
    //     ...extraContext,
    //   }),
    // });
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    next(new AppError(`Failed to render ${view}`, 500));
  }
};

exports.renderSingleDocument = async ({
  req,
  res,
  next,
  Model,
  id,
  view,
  title,
  extraContext = {},
}) => {
  const session = await Model.startSession();
  try {
    await session.startTransaction();
    const doc = await Model.findOne({ _id: id }).session(session);
    if (!doc) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError(`No document found with that ID`, 404));
    }
    await session.commitTransaction();
    session.endSession();
    res.status(200).render(view, {
      title,
      [view.includes("User") ? "user" : "event"]: doc,
      ...exports.buildRenderContext(req, extraContext),
    });
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    next(new AppError(`Failed to render ${view}`, 500));
  }
};

exports.renderSimpleView = (res, view, context) => {
  res.status(200).render(view, context);
};

exports.renderEventList = async ({
  req,
  res,
  next,
  filter,
  sort,
  view,
  title,
  extraContext = {},
}) => {
  const session = await mongoose.startSession();
  try {
    await session.startTransaction();
    const query = Event.find(filter).sort(sort).session(session);
    const events = await query;
    await session.commitTransaction();
    session.endSession();
    res.status(200).render(view, {
      title,
      events,
      userRole: req.session.user?.userRole,
      userName: req.session.user?.userName,
      showNav: true,
      ...extraContext,
    });
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    console.error(`Error rendering ${view}:`, err);
    next(new AppError(`Failed to render ${view}`, 500));
  }
};

// mongoosePagination.js
const catchAsync = require("./catchAsync");

/**
 * Mongoose pagination utility for server-side paginated queries
 * @param {Query} query - Mongoose query object
 * @param {Object} req - Express request object
 * @returns {Object} Pagination result with docs, totalDocs, currentPage, totalPages, etc.
 */
const mongoosePaginate = catchAsync(async (query, req) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  // Get total count for pagination
  const totalDocs = await query.model.countDocuments(query.getFilter());

  // Execute query with pagination
  const docs = await query.skip(skip).limit(limit);

  const totalPages = Math.ceil(totalDocs / limit);

  return {
    results: docs,
    totalDocs,
    currentPage: page,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    nextPage: page < totalPages ? page + 1 : null,
    prevPage: page > 1 ? page - 1 : null,
    limit,
  };
});

module.exports = mongoosePaginate;
