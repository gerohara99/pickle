const express = require("express");
const viewsController = require("../controllers/viewsController");
const authController = require("../controllers/authController");

const router = express.Router();

//Homepage
router.get("/", viewsController.getHomePage);

//Indivdiual users
router.get(
  "/me/login",
  authController.isLoggedIn,
  viewsController.getLoginForm
);
router.get("/me/signup", viewsController.getsignupForm);
router.get("/me/account", authController.protect, viewsController.getMyAccount);

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
  "/events/create",
  authController.protect,
  viewsController.createEvent
);
router.get(
  "/events/get/:id",
  authController.isLoggedIn,
  viewsController.editEvent
);

module.exports = router;
