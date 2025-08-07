const path = require("path");
const express = require("express");
const viewsController = require("../controllers/viewsController");
const authController = require("../controllers/authController");

const router = express.Router();

//Homepage
router.get("/", viewsController.getHomePage);

//Indivdiual users
router.get("/me/login", viewsController.getLoginForm);
router.get("/me/signup", viewsController.getsignupForm);
router.get(
  "/me/myAccountDetails",
  authController.protect,
  viewsController.getMyAccountDetails
);

router.get(
  "/me/myPasswordUpdate",
  authController.protect,
  viewsController.myPasswordUpdate
);

router.get("/me/forgotPassword", viewsController.forgotPassword);

router.get("/me/myPasswordReset/:resetToken", viewsController.myPasswordReset);

//Admin user functionality
router.get(
  "/users/showAll",
  authController.isLoggedIn,
  viewsController.showAllUsers
);

router.get("/users/create", authController.protect, viewsController.createUser);

router.get(
  "/users/get/:id",
  authController.isLoggedIn,
  viewsController.editUser
);

//Events
router.get(
  "/events/showAll",
  authController.isLoggedIn,
  viewsController.showAllEvents
);

router.get(
  "/events/showAllSchedules",
  authController.isLoggedIn,
  viewsController.showAllSchedules
);

router.get(
  "/events/browseNew",
  authController.isLoggedIn,
  viewsController.browseNewEvents
);

router.get(
  "/events/myBrowse",
  authController.isLoggedIn,
  viewsController.browseMyEvents
);

router.get(
  "/events/create",
  authController.protect,
  viewsController.createEvent
);
router.get(
  "/events/get/:id",
  authController.isLoggedIn,
  viewsController.editEvent
);

router.get(
  "/events/viewMySchedule/:id",
  authController.isLoggedIn,
  viewsController.viewMySchedule
);

router.get(
  "/settings/get",
  authController.isLoggedIn,
  authController.restrictTo("clubAdmin", "pickleAdmin"),
  viewsController.getSettings
);

module.exports = router;
