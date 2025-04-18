const crypto = require("crypto");
const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");

// name, email, mobile, password, passwordConfirm

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please tell us your name"],
  },
  email: {
    type: String,
    required: [true, "please enter your email address"],
    unique: [true, "This email is already taken"],
    lowercase: true,
    validate: [validator.isEmail, "Incorrect email format"],
  },
  mobile: {
    type: Number,
    required: [true, "please enter your mobile phone number"],
    unique: [true, "This mobile phone number is already taken"],
  },
  role: {
    type: String,
    enum: ["user", "clubAdmin", "pickleAdmin"],
    default: "user",
  },
  PasswordChangedAt: {
    type: Date,
  },
  password: {
    type: String,
    required: [true, "please proivide a password"],
    minLength: 8,
    select: false, // setting to enusre value is never displayed
  },
  passwordConfirm: {
    type: String,
    required: [true, "please proivide a password confirmation"],
    validate: {
      // This only works on create and save
      validator: function (el) {
        return el === this.password;
      },
      message: "passwords are not the same",
    },
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: { type: Boolean, default: true, select: false },
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  // .hash is async version which is what we want in order not to block event loop
  this.password = await bcrypt.hash(this.password, 12); // 12 is cpu usage for crypto

  this.passwordConfirm = undefined; // Only need this at data entry stage
  next();
});

userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000; // Allow for db latency
  next();
});

userSchema.pre(/^find/, function (next) {
  // this points to the current query
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    // eslint-disable-next-line radix
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    // If password changed after token issued then return true otherwise false
    return JWTTimestamp < changedTimestamp;
  }
  // False means password not changed
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
