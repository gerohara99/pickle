// authService.js - Provides authentication and password-related utilities

/**
 * Toggles password visibility for password fields
 * @param {string} inputId - The ID of the password input field
 * @param {string} toggleBtnId - The ID of the toggle button
 */
export function togglePasswordVisibility(inputId, toggleBtnId) {
  const passwordInput = document.getElementById(inputId);
  const toggleBtn = document.getElementById(toggleBtnId);

  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Hide Password';
  } else {
    passwordInput.type = "password";
    toggleBtn.innerHTML = '<i class="fas fa-eye"></i> Show Password';
  }
}

/**
 * Validates password strength
 * @param {string} password - The password to validate
 * @returns {Object} - Validation results with strength score and feedback
 */
export function validatePasswordStrength(password) {
  let strength = 0;
  let feedback = "";

  // Check password length
  if (password.length >= 8) {
    strength += 1;
  } else {
    feedback = "Password should be at least 8 characters";
    return { strength, feedback };
  }

  // Check for uppercase and lowercase letters
  if (password.match(/[a-z]/) && password.match(/[A-Z]/)) {
    strength += 1;
  } else {
    feedback = "Add uppercase and lowercase letters";
    return { strength, feedback };
  }

  // Check for numbers or special characters
  if (password.match(/[0-9]/) || password.match(/[^a-zA-Z0-9]/)) {
    strength += 1;
  } else {
    feedback = "Add numbers or special characters";
    return { strength, feedback };
  }

  if (strength === 3) {
    feedback = "Strong password";
  } else if (strength === 2) {
    feedback = "Medium strength password";
  } else {
    feedback = "Weak password";
  }

  return { strength, feedback };
}
