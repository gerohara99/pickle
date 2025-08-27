// createEvent.js - Handles event creation page functionality
import { showAlert } from "./alerts.js";
import { initScheduleCalculator } from "./scheduleCalculator.js";

class EventCreator {
  constructor() {
    // DOM Elements
    this.form = document.getElementById("createEventForm");
    this.eventWaitListSizeInput = document.getElementById("eventWaitListSize");

    // Initialize with default values from templateData
    this.init();
  }

  init() {
    // Set default wait list size from system defaults
    if (window.templateData?.systemDefaults?.waitListSize) {
      this.eventWaitListSizeInput.value =
        window.templateData.systemDefaults.waitListSize;
    }

    // Add form submission handler
    this.form.addEventListener("submit", this.handleSubmit.bind(this));

    // Initialize schedule calculator
    document.addEventListener("DOMContentLoaded", () => {
      // Use the existing schedule calculator initialization
      // The initScheduleCalculator function is imported from scheduleCalculator.js
    });
  }

  async handleSubmit(e) {
    e.preventDefault();

    // Validate form
    if (!this.validateForm()) {
      return;
    }

    // Get form data
    const formData = new FormData(this.form);
    const eventData = {};

    // Convert FormData to object
    for (const [key, value] of formData.entries()) {
      if (key === "active" || key === "doublesToggle") {
        eventData[key] = true; // Checkbox is checked
      } else if (key === "selectedScheduleConfig" && value) {
        try {
          eventData[key] = JSON.parse(value);
        } catch (err) {
          showAlert(
            "error",
            "Invalid schedule configuration. Please select a valid schedule."
          );
          return;
        }
      } else {
        eventData[key] = value;
      }
    }

    // Handle unchecked checkboxes
    if (!formData.has("active")) {
      eventData.active = false;
    }

    if (!formData.has("doublesToggle")) {
      eventData.doublesToggle = false;
    }

    // Submit the form
    try {
      const response = await fetch("/api/v1/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventData),
      });

      const data = await response.json();

      if (response.ok) {
        showAlert("success", "Event created successfully!");
        setTimeout(() => {
          window.location.href = "/events/showall";
        }, 1500);
      } else {
        showAlert("error", data.message || "Failed to create event");
      }
    } catch (err) {
      console.error("Error creating event:", err);
      showAlert("error", "An error occurred while creating the event");
    }
  }

  validateForm() {
    // Check if a schedule configuration has been selected
    const selectedScheduleConfig = document.getElementById(
      "selectedScheduleConfig"
    ).value;
    if (!selectedScheduleConfig) {
      showAlert("error", "Please select a schedule configuration");
      return false;
    }

    return true;
  }
}

// Initialize the event creator when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new EventCreator();
});
