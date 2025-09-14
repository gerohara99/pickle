class APIFeatures {
  constructor(query, queryString) {
    if (!query || typeof query.find !== "function") {
      console.warn("APIFeatures: Invalid query object provided.");
      throw new Error("Invalid query object for APIFeatures.");
    }
    if (!queryString || typeof queryString !== "object") {
      console.warn("APIFeatures: Invalid queryString provided.");
      throw new Error("Invalid queryString for APIFeatures.");
    }
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    try {
      console.log(
        "[APIFeatures.filter] Initial queryString:",
        this.queryString
      );

      const queryObj = { ...this.queryString };
      const excludedFields = ["page", "sort", "limit", "fields"];
      excludedFields.forEach((el) => delete queryObj[el]);

      console.log(
        "[APIFeatures.filter] After removing pagination fields:",
        queryObj
      );

      // Special handling for regex fields
      // Convert fields with [$regex] and [$options] into proper MongoDB regex
      Object.keys(queryObj).forEach((key) => {
        if (key.endsWith("[$regex]")) {
          const fieldName = key.replace("[$regex]", "");
          const options = queryObj[`${fieldName}[$options]`] || "";

          // Create regex object
          queryObj[fieldName] = {
            $regex: queryObj[key],
            $options: options,
          };

          // Remove the original keys
          delete queryObj[key];
          delete queryObj[`${fieldName}[$options]`];
        }
      });

      console.log("[APIFeatures.filter] After regex processing:", queryObj);

      let queryStr = JSON.stringify(queryObj);
      queryStr = queryStr.replace(
        /\b(gte|gt|lte|lt)\b/g,
        (match) => `$${match}`
      );

      const parsedQuery = JSON.parse(queryStr);
      console.log("[APIFeatures.filter] Final MongoDB query:", parsedQuery);

      this.query = this.query.find(parsedQuery);
    } catch (err) {
      console.error("APIFeatures.filter error:", err);
      this.query = this.query.find({});
    }
    return this;
  }

  sort() {
    try {
      if (this.queryString.sort) {
        const sortBy = this.queryString.sort.split(",").join(" ");
        this.query = this.query.sort(sortBy);
      } else {
        this.query = this.query.sort("-createdAt");
      }
    } catch (err) {
      console.error("APIFeatures.sort error:", err);
      // fallback: no sort
    }
    return this;
  }

  limitFields() {
    try {
      if (this.queryString.fields) {
        const fields = this.queryString.fields.split(",").join(" ");
        this.query = this.query.select(fields);
      } else {
        this.query = this.query.select("-__v");
      }
    } catch (err) {
      console.error("APIFeatures.limitFields error:", err);
      // fallback: no field limiting
    }
    return this;
  }

  paginate() {
    try {
      const page = Number(this.queryString.page) || 1;
      const limit = Number(this.queryString.limit) || 100;
      const skip = (page - 1) * limit;

      this.query = this.query.skip(skip).limit(limit);
    } catch (err) {
      console.error("APIFeatures.paginate error:", err);
      // fallback: no pagination
    }
    return this;
  }
}

module.exports = APIFeatures;
