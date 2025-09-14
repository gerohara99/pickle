const express = require("express");
const { body } = require("express-validator");
const userController = require("../controllers/userController");
const authController = require("../controllers/authController");

const router = express.Router();

// Input validation for critical user fields
const validateUserFields = [
  body("name").notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("mobile").notEmpty().withMessage("Mobile is required"),
];

// --- Auth routes ---
router.post("/signup", authController.signup);
router.post("/create", authController.create);
router.post("/login", authController.login);
router.get("/logout", authController.logout);

// Auth status route - returns the current authentication state
router.get("/auth-status", (req, res) => {
  try {
    // Get authentication status from multiple sources
    const isAuthenticated = !!(
      req.cookies.jwt &&
      req.cookies.jwt !== "loggedout" &&
      req.session?.user?.userId
    );

    // Return user info if authenticated
    const userInfo =
      isAuthenticated && req.session?.user
        ? {
            userId: req.session.user.userId,
            userName: req.session.user.userName,
            role: req.session.user.role || req.session.user.userRole,
          }
        : null;

    res.status(200).json({
      status: "success",
      isAuthenticated,
      user: userInfo,
      auth: {
        hasJWT: !!req.cookies.jwt && req.cookies.jwt !== "loggedout",
        hasSession: !!req.session,
        hasSessionUser: !!req.session?.user,
      },
    });
  } catch (err) {
    console.error("Auth status error:", err);
    res.status(500).json({
      status: "error",
      message: "Failed to determine auth status",
    });
  }
});

router.post("/forgotPassword", authController.forgotPassword);
router.patch("/passwordReset", authController.passwordReset);

router.patch(
  "/updateMyPassword",
  authController.protect,
  authController.updateMyPassword
);

// --- Protect all subsequent routes ---
router.use(authController.protect);

// --- User routes with requestTimeout and validation ---
router.get("/me", userController.getMe, ...userController.getUser);

router.patch(
  "/updateAcDetails",
  ...userController.updateAcDetails,
  validateUserFields
);

router.delete("/deleteMe", ...userController.deleteMe);

router
  .route("/")
  .get(
    authController.restrictTo("clubAdmin", "pickleAdmin"),
    ...userController.getAllUsers
  )
  .post(
    authController.restrictTo("clubAdmin", "pickleAdmin"),
    ...userController.createUser,
    validateUserFields
  );

router
  .route("/:id")
  .get(
    authController.restrictTo("clubAdmin", "pickleAdmin"),
    ...userController.getUser
  )
  .patch(
    authController.restrictTo("clubAdmin", "pickleAdmin"),
    ...userController.updateUser,
    validateUserFields
  )
  .delete(
    authController.restrictTo("clubAdmin", "pickleAdmin"),
    ...userController.deleteUser
  );

module.exports = router;
