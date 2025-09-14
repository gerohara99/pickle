module.exports = async function paginate(
  queryOrModel,
  req,
  filter = {},
  options = {}
) {
  let page = Number(req.query.page);
  let limit = Number(req.query.limit);

  if (!Number.isInteger(page) || page < 1) page = 1;
  if (!Number.isInteger(limit) || limit < 1) limit = 10;
  const skip = (page - 1) * limit;

  let query, countQuery;
  try {
    if (
      typeof queryOrModel.find === "function" &&
      typeof queryOrModel.exec !== "function"
    ) {
      query = queryOrModel.find(filter, null, options).skip(skip).limit(limit);
      countQuery = queryOrModel.countDocuments(filter);
    } else if (
      typeof queryOrModel.skip === "function" &&
      typeof queryOrModel.limit === "function"
    ) {
      query = queryOrModel.skip(skip).limit(limit);
      countQuery = query.model.countDocuments(query.getQuery());
    } else {
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
    throw err;
  }
};
