const express = require("express");
const userController = require("../controllers/userController");
const authController = require("../controllers/authController");

const router = express.Router();

router.post("/signup", authController.signup);
router.post("/create", authController.create);
router.post("/login", authController.login);
router.get("/logout", authController.logout);

router.post("/forgotPassword", authController.forgotPassword);
router.patch("/passwordReset", authController.passwordReset);

router.patch(
  "/updateMyPassword",
  authController.protect,
  authController.updateMyPassword
);

router.get("/me", userController.getMe, userController.getUser);
router.patch(
  "/updateAcDetails",
  authController.protect,
  userController.updateAcDetails
);
/* router.patch("/myPasswordReset", authController.myPasswordReset); */
router.delete("/deleteMe", authController.protect, userController.deleteMe);

router
  .route("/")
  .get(
    authController.protect,
    authController.restrictTo("clubAdmin", "pickleAdmin"),
    userController.getAllUsers
  )
  .post(
    authController.protect,
    authController.restrictTo("clubAdmin", "pickleAdmin"),
    userController.createUser
  );
router
  .route("/:id")
  .get(
    authController.protect,
    authController.restrictTo("clubAdmin", "pickleAdmin"),
    userController.getUser
  )
  .patch(
    authController.protect,
    authController.restrictTo("clubAdmin", "pickleAdmin"),
    userController.updateUser
  )
  .delete(
    authController.protect,
    authController.restrictTo("clubAdmin", "pickleAdmin"),
    userController.deleteUser
  );

module.exports = router;
