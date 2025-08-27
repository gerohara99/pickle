// passwordUpdate.js - Handles password update page functionality
import { togglePasswordVisibility } from "../services/authService.js";
import { showAlert } from "./alerts.js";

document.addEventListener("DOMContentLoaded", () => {
  const updatePasswordForm = document.getElementById("updatePasswordForm");
  const newPasswordInput = document.getElementById("newPassword");
  const confirmPasswordInput = document.getElementById("newPasswordConfirm");
  const toggleNewPasswordBtn = document.getElementById("toggleNewPassword");
  const toggleConfirmPasswordBtn = document.getElementById(
    "togglePasswordConfirm"
  );
  const strengthMeter = document.getElementById("strengthMeter");
  const passwordFeedback = document.getElementById("passwordFeedback");

  // Password toggle functionality
  if (toggleNewPasswordBtn) {
    toggleNewPasswordBtn.addEventListener("click", () => {
      togglePasswordVisibility("newPassword", "toggleNewPassword");
    });
  }

  if (toggleConfirmPasswordBtn) {
    toggleConfirmPasswordBtn.addEventListener("click", () => {
      togglePasswordVisibility("newPasswordConfirm", "togglePasswordConfirm");
    });
  }

  // Password strength meter
  if (newPasswordInput) {
    newPasswordInput.addEventListener("input", updatePasswordStrength);
  }

  // Password match validation
  if (confirmPasswordInput) {
    confirmPasswordInput.addEventListener("input", validatePasswordMatch);
  }

  // Form submission
  if (updatePasswordForm) {
    updatePasswordForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      // Validate passwords match
      if (newPasswordInput.value !== confirmPasswordInput.value) {
        showAlert("error", "Passwords do not match");
        return;
      }

      // Get user ID
      const userId = document.getElementById("userId").value;

      try {
        const response = await fetch(`/api/users/updateMyPassword/${userId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            currentPassword: document.getElementById("currentPassword").value,
            newPassword: newPasswordInput.value,
            newPasswordConfirm: confirmPasswordInput.value,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          showAlert("success", "Password updated successfully");
          setTimeout(() => {
            window.location.href = "/me/account";
          }, 1500);
        } else {
          showAlert("error", data.message || "Failed to update password");
        }
      } catch (err) {
        showAlert("error", "Something went wrong. Please try again.");
      }
    });
  }

  function updatePasswordStrength() {
    const password = newPasswordInput.value;
    let strength = 0;
    let feedback = "";

    // Length check
    if (password.length >= 8) {
      strength += 1;
    } else {
      feedback = "Password should be at least 8 characters";
    }

    // Complexity checks
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) {
      strength += 1;
    } else if (strength > 0) {
      feedback = "Add uppercase and lowercase letters";
    }

    if (password.match(/[0-9]/) || password.match(/[^a-zA-Z0-9]/)) {
      strength += 1;
    } else if (strength > 0) {
      feedback = "Add numbers or special characters";
    }

    // Update the UI
    strengthMeter.className = "";
    if (password.length === 0) {
      strengthMeter.style.width = "0";
      passwordFeedback.textContent = "Password should be at least 8 characters";
    } else if (strength === 1) {
      strengthMeter.classList.add("strength-weak");
      passwordFeedback.textContent = feedback || "Weak password";
    } else if (strength === 2) {
      strengthMeter.classList.add("strength-medium");
      passwordFeedback.textContent = feedback || "Medium strength password";
    } else {
      strengthMeter.classList.add("strength-strong");
      passwordFeedback.textContent = "Strong password";
    }
  }

  function validatePasswordMatch() {
    if (newPasswordInput.value && confirmPasswordInput.value) {
      if (newPasswordInput.value !== confirmPasswordInput.value) {
        confirmPasswordInput.setCustomValidity("Passwords do not match");
        showAlert("error", "Passwords do not match");
      } else {
        confirmPasswordInput.setCustomValidity("");
      }
    }
  }
});
