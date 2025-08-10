module.exports = async function paginate(Model, req, query = {}, options = {}) {
  const page = Number(req.query.page) || 1;
  const limit = Number(process.env.PAGINATION_LIMIT) || 20;
  const skip = (page - 1) * limit;

  // Allow for custom query, sort, and populate options
  let dbQuery = Model.find(query);
  if (options.sort) dbQuery = dbQuery.sort(options.sort);
  if (options.populate) dbQuery = dbQuery.populate(options.populate);

  const [results, total] = await Promise.all([
    dbQuery.skip(skip).limit(limit),
    Model.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    results,
    total,
    totalPages,
    currentPage: page,
    limit,
  };
};
