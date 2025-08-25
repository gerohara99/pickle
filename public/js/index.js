import { initFormListeners } from "./formListeners";
import { initButtonDelegates } from "./buttonDelegates";
import { initScoreModal } from "./modal";
import { initMobileNavToggle } from "./navToggle";
import { initTabs } from "./tabs";
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
} from "./apiActions";

import { initScheduleCalculator } from "./scheduleCalculator";

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
    initMobileNavToggle();

    // Tabs
    initTabs();

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
