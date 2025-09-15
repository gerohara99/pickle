import { buttonDelegateLogic } from "./utils/buttonUtils.js";

export function initButtonDelegates(deps) {
  const {
    logOutApiAction,
    deleteUserApiAction,
    eventCreateBookingApiAction,
    eventCancelBookingApiAction,
    deleteEventApiAction,
  } = deps;

  function safeApiCall(fn, ...args) {
    if (typeof fn !== "function") {
      alert("This action is currently unavailable.");
      return Promise.reject(new Error("Missing dependency"));
    }
    return fn(...args);
  }

  buttonDelegateLogic({
    ".logout-btn": () => safeApiCall(logOutApiAction),
    ".delete-user-btn": () => safeApiCall(deleteUserApiAction),
    ".create-booking-btn": () => safeApiCall(eventCreateBookingApiAction),
    ".cancel-booking-btn": () => safeApiCall(eventCancelBookingApiAction),
    ".delete-event-btn": () => safeApiCall(deleteEventApiAction),
    // Add more selectors and handlers as needed
  });
}

// Cog/settings dropdown logic (NO delegate needed)
const settingsToggle = document.querySelector(".settings-toggle");
const settingsDropdown = document.querySelector(".settings-dropdown");
if (settingsToggle && settingsDropdown) {
  settingsToggle.addEventListener("click", function (e) {
    e.preventDefault();
    settingsDropdown.classList.toggle("open");
  });
  document.addEventListener("click", function (e) {
    if (
      !settingsDropdown.contains(e.target) &&
      !settingsToggle.contains(e.target)
    ) {
      settingsDropdown.classList.remove("open");
    }
  });
}
