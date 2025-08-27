import { initFormListeners } from "./formListeners.js";
import { initButtonDelegates } from "./buttonDelegates.js";
import { initScoreModal } from "./modal.js";
import { initMobileNavToggle } from "./navToggle.js";
import { initTabs } from "./tabs.js";
import { initRoleDetection } from "./roleDetection.js";
import {
  createUserApiAction,
  editUserApiAction,
  deleteUserApiAction,
  createEventApiAction,
  updateEventApiAction,
  deleteEventApiAction,
  eventUpdateMatchScoreApiAction,
  loginApiAction,
  logOutApiAction,
  signUpApiAction,
  updateAcApiAction,
  forgotPasswordApiAction,
  resetPasswordApiAction,
  getSystemSettingsApiAction,
  manageSystemSettingsApiAction,
  markNoShowApiAction,
  eventCreateBookingApiAction,
  eventCancelBookingApiAction,
} from "./apiActions.js";

import { initScheduleCalculator } from "./scheduleCalculator.js";

// Dependency check helper
function validateDeps(deps, requiredKeys, context) {
  let missing = [];
  requiredKeys.forEach((key) => {
    if (typeof deps[key] !== "function") {
      missing.push(key);
    }
  });
  if (missing.length) {
    console.warn(`Missing dependencies for ${context}: ${missing.join(", ")}`);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  try {
    // Forms
    const formDeps = {
      createUserApiAction,
      editUserApiAction,
      deleteUserApiAction,
      createEventApiAction,
      updateEventApiAction,
      deleteEventApiAction,
      eventUpdateMatchScoreApiAction,
      loginApiAction,
      logOutApiAction,
      signUpApiAction,
      updateAcApiAction,
      forgotPasswordApiAction,
      resetPasswordApiAction,
      getSystemSettingsApiAction,
      manageSystemSettingsApiAction,
      markNoShowApiAction,
      eventCreateBookingApiAction,
      eventCancelBookingApiAction,
    };
    validateDeps(
      formDeps,
      [
        "createUserApiAction",
        "editUserApiAction",
        "deleteUserApiAction",
        "createEventApiAction",
        "updateEventApiAction",
        "deleteEventApiAction",
        "eventUpdateMatchScoreApiAction",
        "loginApiAction",
        "logOutApiAction",
        "signUpApiAction",
        "updateAcApiAction",
        "forgotPasswordApiAction",
        "resetPasswordApiAction",
        "getSystemSettingsApiAction",
        "manageSystemSettingsApiAction",
        "markNoShowApiAction",
        "eventCreateBookingApiAction",
        "eventCancelBookingApiAction",
      ],
      "initFormListeners"
    );
    initFormListeners(formDeps);

    // Score modal
    if (typeof eventUpdateMatchScoreApiAction !== "function") {
      console.warn(
        "Missing dependency for initScoreModal: eventUpdateMatchScoreApiAction"
      );
    }
    initScoreModal(eventUpdateMatchScoreApiAction);

    // Mobile nav toggle
    if (document.getElementById("mobileNavToggle")) {
      initMobileNavToggle();
    }

    // Tabs
    if (document.querySelector(".tab")) {
      initTabs();
    }

    // Role detection for UI visibility
    initRoleDetection();

    // Button and link event delegation
    const buttonDeps = {
      logOutApiAction,
      deleteUserApiAction,
      eventCreateBookingApiAction,
      eventCancelBookingApiAction,
      deleteEventApiAction,
      markNoShowApiAction,
    };
    validateDeps(
      buttonDeps,
      [
        "logOutApiAction",
        "deleteUserApiAction",
        "eventCreateBookingApiAction",
        "eventCancelBookingApiAction",
        "deleteEventApiAction",
        "markNoShowApiAction",
      ],
      "initButtonDelegates"
    );
    initButtonDelegates(buttonDeps);

    // Schedule Calculator: Only initialize on event creation page
    if (document.getElementById("createEventForm")) {
      initScheduleCalculator();
    }

    console.log("App initialized successfully.");
  } catch (err) {
    console.error("Error during app initialization:", err);
    // Optionally, show a user-friendly error message to the user here
  }
});
