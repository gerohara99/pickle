/**
 * navigation.js - Handles navigation-related functionality
 */

/**
 * Initialize back button functionality
 */
export function initBackButtons() {
  const backButtons = document.querySelectorAll(
    '.btn-back, [data-action="back"]'
  );

  backButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      e.preventDefault();

      // If there's history, go back
      if (window.history.length > 1) {
        window.history.back();
      } else {
        // Fallback to homepage
        window.location.href = "/";
      }
    });
  });
}

/**
 * Initialize all navigation functionality
 */
export function initNavigation() {
  initBackButtons();

  // Add more navigation initialization functions here
}

// Initialize when the DOM is loaded
document.addEventListener("DOMContentLoaded", initNavigation);
