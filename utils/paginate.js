module.exports = async function paginate(
  queryOrModel,
  req,
  filter = {},
  options = {}
) {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  let query, countQuery;
  if (
    typeof queryOrModel.find === "function" &&
    typeof queryOrModel.exec !== "function"
  ) {
    // It's a Model
    query = queryOrModel.find(filter, null, options);
    countQuery = queryOrModel.countDocuments(filter);
  } else {
    // It's a Query
    query = queryOrModel.skip(skip).limit(limit);
    // For count, use the same filter as the query
    countQuery = query.model.countDocuments(query.getQuery());
  }

  const [results, totalDocs] = await Promise.all([query.exec(), countQuery]);

  return {
    results,
    currentPage: page,
    totalPages: Math.ceil(totalDocs / limit),
    limit,
    totalDocs,
  };
};
