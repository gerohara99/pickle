/**
 * passwordValidator.js - Handles password validation and strength indicators
 */

class PasswordValidator {
  constructor() {
    // Password input elements
    this.passwordInputs = document.querySelectorAll('input[type="password"]');
    this.passwordField = document.getElementById("password");
    this.confirmField = document.getElementById("passwordConfirm");

    // Strength indicator elements
    this.strengthBar = document.querySelector(".strength-bar");
    this.feedbackElement = document.querySelector(".password-feedback");
    this.matchMessage = document.querySelector(".password-match-message");

    // Toggle buttons
    this.toggleButtons = document.querySelectorAll(".password-toggle");

    // Initialize if elements exist
    if (this.passwordField) {
      this.init();
    }
  }

  init() {
    // Set up event listeners
    this.setupPasswordToggle();
    this.setupPasswordStrengthMeter();
    this.setupPasswordMatch();
  }

  setupPasswordToggle() {
    this.toggleButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        const passwordInput = e.target
          .closest(".password-input-wrapper")
          .querySelector("input");
        const icon = e.target.closest(".password-toggle").querySelector("i");

        if (passwordInput.type === "password") {
          passwordInput.type = "text";
          icon.classList.remove("fa-eye");
          icon.classList.add("fa-eye-slash");
        } else {
          passwordInput.type = "password";
          icon.classList.remove("fa-eye-slash");
          icon.classList.add("fa-eye");
        }
      });
    });
  }

  setupPasswordStrengthMeter() {
    if (!this.passwordField || !this.strengthBar || !this.feedbackElement)
      return;

    this.passwordField.addEventListener("input", () => {
      const password = this.passwordField.value;
      const strength = this.calculatePasswordStrength(password);

      // Update strength bar
      this.strengthBar.style.width = `${strength.score * 25}%`;
      this.strengthBar.className = "strength-bar";
      this.strengthBar.classList.add(`strength-${strength.level}`);

      // Update feedback message
      this.feedbackElement.textContent = strength.message;
      this.feedbackElement.className = "password-feedback";
      this.feedbackElement.classList.add(`feedback-${strength.level}`);

      // If confirm field has value, check match
      if (this.confirmField && this.confirmField.value) {
        this.checkPasswordMatch();
      }
    });
  }

  setupPasswordMatch() {
    if (!this.passwordField || !this.confirmField || !this.matchMessage) return;

    this.confirmField.addEventListener("input", () => {
      this.checkPasswordMatch();
    });
  }

  checkPasswordMatch() {
    const password = this.passwordField.value;
    const confirm = this.confirmField.value;

    if (!confirm) {
      this.matchMessage.textContent = "";
      this.matchMessage.className = "password-match-message";
      return;
    }

    if (password === confirm) {
      this.matchMessage.textContent = "Passwords match";
      this.matchMessage.className = "password-match-message match-success";
    } else {
      this.matchMessage.textContent = "Passwords do not match";
      this.matchMessage.className = "password-match-message match-error";
    }
  }

  calculatePasswordStrength(password) {
    // Default strength object
    const strength = {
      score: 0,
      level: "weak",
      message: "Password is too weak",
    };

    if (!password) {
      return strength;
    }

    // Basic checks
    const hasLowercase = /[a-z]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasSpecialChars = /[^a-zA-Z0-9]/.test(password);
    const length = password.length;

    // Calculate score (0-4)
    let score = 0;

    // Length check
    if (length >= 8) score += 1;
    if (length >= 12) score += 1;

    // Character variety
    const varieties = [
      hasLowercase,
      hasUppercase,
      hasNumbers,
      hasSpecialChars,
    ].filter(Boolean).length;
    score += Math.min(varieties - 1, 2); // Max 2 points for variety

    // Common password patterns (negative points)
    const commonPatterns = [
      /^123456/,
      /password/i,
      /qwerty/i,
      /abc123/i,
      /admin/i,
      /welcome/i,
    ];

    if (commonPatterns.some((pattern) => pattern.test(password))) {
      score = Math.max(0, score - 1);
    }

    // Determine level and message
    if (score === 0) {
      strength.level = "weak";
      strength.message = "Password is too weak";
    } else if (score === 1) {
      strength.level = "weak";
      strength.message = "Password is weak";
    } else if (score === 2) {
      strength.level = "medium";
      strength.message = "Password is medium strength";
    } else if (score === 3) {
      strength.level = "strong";
      strength.message = "Password is strong";
    } else {
      strength.level = "very-strong";
      strength.message = "Password is very strong";
    }

    strength.score = score;
    return strength;
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  new PasswordValidator();
});

export { PasswordValidator };
