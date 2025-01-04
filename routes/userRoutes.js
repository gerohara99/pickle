const express = require("express");
const userController = require("../controllers/userController");
const authController = require("../controllers/authController");

const router = express.Router();

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.get("/logout", authController.logout);

router.post("/forgotPassword", authController.forgotPassword);
router.patch("/resetPassword/:token", authController.resetPassword);
router.patch(
  "/updateMyPassword",
  authController.protect,
  authController.updatePassword
);

//From here on user needs to be verified
router.use(authController.protect);

router.get("/me", userController.getMe, userController.getUser);
router.patch(
  "/updateMe",
  //  userController.uploadUserPhoto,
  //  userController.reSizeUserPhoto,
  userController.updateMe
);
router.delete("/deleteMe", userController.deleteMe);

// From here on only admin can perform these functions
router.use(authController.restrictTo("clubAdmin", "pickleAdmin"));

router
  .route("/")
  .get(userController.getAllUsers)
  .post(userController.createUser);
router
  .route("/:id")
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
