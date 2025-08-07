const express = require("express");
const userController = require("../controllers/userController");
const authController = require("../controllers/authController");

const router = express.Router();

router.post("/signup", authController.signup);
router.post("/create", authController.create);
router.post("/login", authController.login);
router.get("/logout", authController.logout);

router.post("/forgotPassword", authController.forgotPassword); // route to send email with reset link
router.patch("/passwordReset", authController.passwordReset);

router.patch(
  "/updateMyPassword",
  authController.protect,
  authController.updateMyPassword
);

router.use(authController.protect);

router.get("/me", userController.getMe, userController.getUser);
router.patch("/updateAcDetails", userController.updateAcDetails);
router.delete("/deleteMe", userController.deleteMe);

router
  .route("/")
  .get(
    authController.restrictTo("clubAdmin", "pickleAdmin"),
    userController.getAllUsers
  )
  .post(
    authController.restrictTo("clubAdmin", "pickleAdmin"),
    userController.createUser
  );

router
  .route("/:id")
  .get(
    authController.restrictTo("clubAdmin", "pickleAdmin"),
    userController.getUser
  )
  .patch(
    authController.restrictTo("clubAdmin", "pickleAdmin"),
    userController.updateUser
  )
  .delete(
    authController.restrictTo("clubAdmin", "pickleAdmin"),
    userController.deleteUser
  );

module.exports = router;
