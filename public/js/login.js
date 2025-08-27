/* eslint-disable */
// Import the loginApiAction from apiActions module
import { loginApiAction } from "./apiActions.js";

// Wait for DOM to be fully loaded before attaching event handlers
document.addEventListener("DOMContentLoaded", () => {
  // Get DOM elements
  const loginForm = document.getElementById("loginForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const loginButton = document.getElementById("loginButton");
  const togglePasswordButton = document.getElementById("togglePassword");

  // Toggle password visibility
  if (togglePasswordButton) {
    togglePasswordButton.addEventListener("click", () => {
      // Toggle the type attribute of password input
      const type =
        passwordInput.getAttribute("type") === "password" ? "text" : "password";
      passwordInput.setAttribute("type", type);

      // Toggle the eye icon
      const icon = togglePasswordButton.querySelector("i");
      if (type === "password") {
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
        togglePasswordButton.innerHTML =
          '<i class="fas fa-eye"></i> Show Password';
      } else {
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");
        togglePasswordButton.innerHTML =
          '<i class="fas fa-eye-slash"></i> Hide Password';
      }
    });
  }

  // Handle login button click
  if (loginButton) {
    loginButton.addEventListener("click", async (e) => {
      e.preventDefault();

      // Change button text to show loading
      loginButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      loginButton.disabled = true;

      const email = emailInput.value;
      const password = passwordInput.value;

      try {
        await loginApiAction(email, password);
        // Note: Redirect is handled in the apiActions.js loginApiAction function
      } catch (err) {
        console.error("Login failed:", err);
        // Reset button
        loginButton.innerHTML = '<i class="fas fa-sign-in-alt"></i>';
        loginButton.disabled = false;
      }
    });
  }

  // Allow form submission with Enter key
  if (loginForm) {
    loginForm.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        loginButton.click();
      }
    });
  }
});
