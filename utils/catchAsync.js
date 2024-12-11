//Generic wrapper for all of our async functions.
// Removes the need for a catch block in each async function
module.exports = (fn) => (req, res, next) => {
  fn(req, res, next).catch(next);
};
