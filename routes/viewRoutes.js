const express = require("express");
const viewsController = require("../controllers/viewsController");
const authController = require("../controllers/authController");

const router = express.Router();

router.get("/", authController.isLoggedIn, viewsController.getAccount);
router.get("/login", authController.isLoggedIn, viewsController.getLoginForm);
router.get("/signup", viewsController.getsignupForm);
router.get("/me", authController.protect, viewsController.getAccount);

module.exports = router;
