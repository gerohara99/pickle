// Renamed from viewControllerUtils.js to controllerUtils.js
const mongoose = require("mongoose");
const Event = require("../models/eventModel");
const AppError = require("../utils/appError");
const mongoosePaginate = require("./mongoosePagination");

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
    const pagination = await mongoosePaginate(query, req);
    await session.commitTransaction();
    session.endSession();

    // Ensure response structure matches frontend expectations
    const responseData = {
      status: "success",
      data: {
        data: {
          doc: pagination.results,
        },
        results: pagination.totalDocs,
      },
    };

    res.status(200).json(responseData);
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
