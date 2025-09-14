// signup.js
import { togglePasswordVisibility } from "../services/authService.js";

document.addEventListener("DOMContentLoaded", () => {
  const togglePasswordBtn = document.getElementById("togglePassword");
  const togglePasswordConfirmBtn = document.getElementById(
    "togglePasswordConfirm"
  );

  // Password toggle functionality
  if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener("click", () => {
      togglePasswordVisibility("password", "togglePassword");
    });
  }

  if (togglePasswordConfirmBtn) {
    togglePasswordConfirmBtn.addEventListener("click", () => {
      togglePasswordVisibility("passwordConfirm", "togglePasswordConfirm");
    });
  }

  // Form submission is handled by formListeners.js
  // This file just adds additional functionality specific to the signup page

  // Password match validation
  const passwordInput = document.getElementById("password");
  const passwordConfirmInput = document.getElementById("passwordConfirm");

  if (passwordConfirmInput) {
    passwordConfirmInput.addEventListener("input", validatePasswordMatch);
  }

  if (passwordInput) {
    passwordInput.addEventListener("input", validatePasswordMatch);
  }

  function validatePasswordMatch() {
    if (passwordInput.value && passwordConfirmInput.value) {
      if (passwordInput.value !== passwordConfirmInput.value) {
        passwordConfirmInput.setCustomValidity("Passwords do not match");
      } else {
        passwordConfirmInput.setCustomValidity("");
      }
    }
  }
});
