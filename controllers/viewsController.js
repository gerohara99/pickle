const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

exports.getOverview = catchAsync(async (req, res, next) => {
  res.status(200).render("overview", {
    title: "Pickle Admin !!!",
  });
});

exports.getLoginForm = (req, res) => {
  res.status(200).render("login", {
    title: "log into your account",
  });
};

exports.getsignupForm = (req, res) => {
  res.status(200).render("signup", {
    title: "create your account",
  });
};

exports.getAccount = (req, res) => {
  res.status(200).render("account", {
    title: "Your account",
  });
};
