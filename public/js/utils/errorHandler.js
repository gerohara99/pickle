import { showAlert } from "../alerts.js";

// Global variable to track the last error message time
let lastErrorTime = 0;

export function handleApiError(err, context = "operation") {
  // Log detailed error information
  console.error(`[API Error - ${context}]`, err);
  if (err.response) {
    console.error("Error Response:", {
      status: err.response.status,
      statusText: err.response.statusText,
      data: err.response.data,
    });
  }

  // Only show one error every 3 seconds to prevent spam
  const now = Date.now();
  if (now - lastErrorTime < 3000) {
    console.log("Suppressing duplicate error message");
    return;
  }

  lastErrorTime = now;

  // Remove any existing alerts
  const existingAlerts = document.querySelectorAll(".alert");
  existingAlerts.forEach((alert) => alert.remove());

  // Show appropriate error message
  let errorMessage = `An error occurred during ${context}`;

  if (err.message && err.message.includes("Network")) {
    errorMessage = "Network error: Please check your internet connection";
  } else if (err.response?.data?.message) {
    errorMessage = err.response.data.message;
  } else if (err.message) {
    errorMessage = err.message;
  }

  showAlert("error", errorMessage);
}

export function createLoadingState(container, colspan = 6) {
  container.innerHTML = `<tr><td colspan="${colspan}" class="text-center">Loading...</td></tr>`;
}

export function createEmptyState(container, message = "No data found") {
  container.innerHTML = `<tr><td colspan="6" class="text-center">${message}</td></tr>`;
}
