// accountDetails.js - Handles account details page functionality
import { showAlert } from "./alerts.js";

document.addEventListener("DOMContentLoaded", () => {
  const acDetailsForm = document.getElementById("acDetailsForm");

  // Form submission handler
  if (acDetailsForm) {
    acDetailsForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const userId = document.getElementById("userId").value;
      const name = document.getElementById("name").value;
      const email = document.getElementById("email").value;
      const mobile = document.getElementById("mobile").value;

      // Form validation
      if (!name || !email || !mobile) {
        showAlert("error", "Please fill in all required fields");
        return;
      }

      try {
        const response = await fetch(`/api/users/updateMyDetails/${userId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            email,
            mobile,
            userId,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          showAlert("success", "Account details updated successfully");
          setTimeout(() => {
            window.location.href = "/events/browseNew";
          }, 1500);
        } else {
          showAlert(
            "error",
            data.message || "Failed to update account details"
          );
        }
      } catch (err) {
        showAlert("error", "Something went wrong. Please try again.");
      }
    });
  }
});
