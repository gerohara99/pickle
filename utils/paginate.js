module.exports = async function paginate(
  queryOrModel,
  req,
  filter = {},
  options = {}
) {
  let page = Number(req.query.page);
  let limit = Number(req.query.limit);

  // Input validation and defaults
  if (!Number.isInteger(page) || page < 1) page = 1;
  if (!Number.isInteger(limit) || limit < 1) limit = 10;
  const skip = (page - 1) * limit;

  let query, countQuery;
  try {
    // Type checking for queryOrModel
    if (
      typeof queryOrModel.find === "function" &&
      typeof queryOrModel.exec !== "function"
    ) {
      // It's a Model
      query = queryOrModel.find(filter, null, options).skip(skip).limit(limit);
      countQuery = queryOrModel.countDocuments(filter);
    } else if (
      typeof queryOrModel.skip === "function" &&
      typeof queryOrModel.limit === "function"
    ) {
      // It's a Query
      query = queryOrModel.skip(skip).limit(limit);
      countQuery = query.model.countDocuments(query.getQuery());
    } else {
      console.warn("paginate: queryOrModel must be a Mongoose Model or Query.");
      throw new Error("paginate: Invalid queryOrModel argument.");
    }

    const [results, totalDocs] = await Promise.all([query.exec(), countQuery]);
    const totalPages = totalDocs > 0 ? Math.ceil(totalDocs / limit) : 1;

    return {
      results,
      currentPage: page,
      totalPages,
      limit,
      totalDocs,
    };
  } catch (err) {
    console.error("paginate error:", err);
    throw err;
  }
};
