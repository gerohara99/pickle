/*eslint-disable*/
import "core-js/stable";
import "regenerator-runtime/runtime";
import axios from "./api";
axios.defaults.withCredentials = true;
import { login } from "./login";
import { logOut } from "./logout";
import { signUp } from "./signUp";
import { adminCreateUser } from "./_deprecated_adminCreateUser";
import { updateAc } from "./updateAc";
import {
  createEventPubJs,
  updateEventPubJs,
  deleteEventPubJs,
  eventCreateBookingPubJs,
  eventCancelBookingPubJs,
  eventUpdateMatchScorePubJs,
} from "./eventsPubJs";
import {
  createUserPubJs,
  updateUserPubJs,
  deleteUserPubJs,
} from "./usersPubJs";
import { forgotPasswordPubJs } from "./forgotPasswordPubJs";
import { resetPasswordPubJs } from "./resetPasswordPubJs";
import {
  getSystemSettingsPubJs,
  manageSystemSettingsPubJs,
} from "./settingsPubJs";

// DOM ELements

//Auth Elements -- note all these functions are in public/js folder NOT auth routes
const signUpButton = document.getElementById("signUpButton");
const logOutButton = document.getElementById("logOutButton");

// Admin elements for creating, updating, deleteing Users and Events
const createUserButton = document.getElementById("createUserButton");
const saveUserButton = document.getElementById("saveUserButton");
const deleteUserButtons = document.querySelectorAll("a.deleteUserButtons");
const editUserButtons = document.querySelectorAll("a.editUserButtons");

const createEventButton = document.getElementById("createEventButton");
const saveEventButton = document.getElementById("saveEventButton");
const deleteEventButtons = document.querySelectorAll("a.deleteEventButtons");
const editEventButtons = document.querySelectorAll("a.editEventButtons");

// User Elements for editing profile, booking and cencelling events
const saveAccountDetailsForm = document.getElementById(
  "saveAccountDetailsForm"
);
const updatePasswordButton = document.getElementById("updatePasswordButton");
const forgotPasswordLink = document.getElementById("forgotPasswordLink");
const resetPasswordButton = document.getElementById("resetPasswordButton");
const bookEventButtons = document.querySelectorAll("a.bookEventButtons");
const cancelEventButtons = document.querySelectorAll("a.cancelEventButtons");
const viewMyScheduleButtons = document.querySelectorAll(
  "a.viewMyScheduleButtons"
);

const modal = document.getElementById("scoreModal");
const closeButton = document.querySelector(".close");
const scoreButtons = document.querySelectorAll(".score-button");
const scoreForm = document.getElementById("scoreForm");

const saveSystemSettingsButton = document.getElementById(
  "saveSystemSettingsButton"
);

//******************** Authorization functions
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!loginForm.checkValidity()) {
        loginForm.reportValidity();
        return;
      }

      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;

      try {
        await login(email, password);
      } catch (err) {
        console.error("Login failed:", err);
      }

      try {
        getSystemSettingsPubJs();
      } catch (err) {
        console.error("Failed to retrieve system settings", err);
      }
    });
  }
});

if (signUpButton)
  signUpButton.addEventListener("click", async (e) => {
    e.preventDefault();
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const mobile = document.getElementById("mobile").value;
    const password = document.getElementById("password").value;
    const passwordConfirm = document.getElementById("passwordConfirm").value;
    await signUp(name, email, mobile, password, passwordConfirm);
  });

if (logOutButton)
  logOutButton.addEventListener("click", async (e) => {
    e.preventDefault();
    await logOut();
  });

// ******************   Admin functions for creating, updating, deleteing Users and Events

// *************************** Users ***************************************
if (createUserButton)
  createUserButton.addEventListener("click", (e) => {
    e.preventDefault();
    const userName = document.getElementById("name").value;
    const userEmail = document.getElementById("email").value;
    const userMobile = document.getElementById("mobile").value;
    const userPassword = document.getElementById("password").value;
    const userPasswordConfirm =
      document.getElementById("passwordConfirm").value;
    createUserPubJs(
      userName,
      userEmail,
      userMobile,
      userPassword,
      userPasswordConfirm
    );
  });

if (editUserButtons)
  editUserButtons.forEach((item) =>
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const userId = e.target.parentElement.querySelector(".userId");
      const locationPath = "/users/get/" + userId.textContent;
      location.assign(locationPath);
    })
  );

if (deleteUserButtons)
  deleteUserButtons.forEach((item) =>
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const userId = e.target.parentElement.querySelector(".userId");
      deleteUserPubJs(userId.textContent);
    })
  );

if (saveUserButton)
  saveUserButton.addEventListener("click", (e) => {
    e.preventDefault();
    const userName = document.getElementById("name").value;
    const userEmail = document.getElementById("email").value;
    const userMobile = document.getElementById("mobile").value;
    const userId = document.getElementById("userId").textContent;
    updateUserPubJs(userId, userName, userEmail, userMobile);
  });

if (createUserButton)
  createUserButton.addEventListener("click", (e) => {
    e.preventDefault();
    const userName = document.getElementById("name").value;
    const userEmail = document.getElementById("email").value;
    const userMobile = document.getElementById("mobile").value;
    const userPassword = document.getElementById("password").value;
    const userPasswordConfirm =
      document.getElementById("passwordConfirm").value;
    adminCreateUser(
      userName,
      userEmail,
      userMobile,
      userPassword,
      userPasswordConfirm
    );
  });

// ***************************** Events **************************

if (createEventButton)
  createEventButton.addEventListener("click", (e) => {
    e.preventDefault();
    let data = {};
    data.eventName = document.getElementById("eventName").value;
    data.eventLocation = document.getElementById("eventLocation").value;
    data.eventType = document.getElementById("eventType").value;
    data.eventDate = document.getElementById("eventDate").value;
    data.eventStartTime = document.getElementById("eventStartTime").value;
    data.eventOrganiser = document.getElementById("eventOrganiser").value;
    data.eventNumOfCourts = document.getElementById("eventNumOfCourts").value;
    data.numOfStandOutsPerRound = document.getElementById(
      "numOfStandOutsPerRound"
    ).value;
    data.eventNumOfRounds = document.getElementById("eventNumOfRounds").value;
    data.eventWaitListSize = document.getElementById("eventWaitListSize").value;
    data.eventNumOfPairings =
      document.getElementById("eventNumOfPairings").value;
    createEventPubJs(data);
  });

if (editEventButtons)
  editEventButtons.forEach((item) =>
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const eventId = e.target.parentElement.querySelector(".eventId");
      const locationPath = "/events/get/" + eventId.textContent;
      location.assign(locationPath);
    })
  );

if (deleteEventButtons)
  deleteEventButtons.forEach((item) =>
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const eventId = e.target.parentElement.querySelector(".eventId");
      deleteEventPubJs(eventId.textContent);
    })
  );

if (saveEventButton)
  saveEventButton.addEventListener("click", (e) => {
    let data = {};
    e.preventDefault();
    data.eventId = document.getElementById("eventId").textContent;
    data.eventName = document.getElementById("eventName").value;
    data.eventLocation = document.getElementById("eventLocation").value;
    data.eventType = document.getElementById("eventType").value;
    data.eventDate = document.getElementById("eventDate").value;
    data.eventStartTime = document.getElementById("eventStartTime").value;
    data.eventOrganiser = document.getElementById("eventOrganiser").value;
    data.eventNumOfCourts = document.getElementById("eventNumOfCourts").value;
    data.numOfStandOutsPerRound = document.getElementById(
      "numOfStandOutsPerRound"
    ).value;
    data.eventNumOfRounds = document.getElementById("eventNumOfRounds").value;
    data.eventWaitListSize = document.getElementById("eventWaitListSize").value;
    data.eventNumOfPairings =
      document.getElementById("eventNumOfPairings").value;
    updateEventPubJs(data);
  });

/******** User functions    ************************/

document.addEventListener("DOMContentLoaded", () => {
  const acDetailsForm = document.getElementById("acDetailsForm");
  if (acDetailsForm) {
    acDetailsForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!acDetailsForm.checkValidity()) {
        acDetailsForm.reportValidity();
        return;
      }

      let data = {
        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        mobile: document.getElementById("mobile").value,
        userId: document.getElementById("userId").value,
      };
      const type = "account";
      try {
        await updateAc(data, type);
        location.assign("/events/browseNew");
      } catch (err) {
        console.error("Update failed:", err);
      }
    });
  }
});

if (updatePasswordButton)
  updatePasswordButton.addEventListener("click", async (e) => {
    e.preventDefault();
    let data = {
      currentPassword: document.getElementById("currentPassword").value,
      newPassword: document.getElementById("newPassword").value,
      newPasswordConfirm: document.getElementById("newPasswordConfirm").value,
      userId: document.getElementById("userId").textContent,
    };
    const type = "password";
    await updateAc(data, type);
    location.assign("/events/browseNew");
  });

if (forgotPasswordLink)
  forgotPasswordLink.addEventListener("click", (e) => {
    e.preventDefault();
    let data = {};
    data.email = document.getElementById("email").value;
    forgotPasswordPubJs(data);
  });

if (resetPasswordButton)
  resetPasswordButton.addEventListener("click", (e) => {
    e.preventDefault();
    let data = {};
    data.password = document.getElementById("newPassword").value;
    data.passwordConfirm = document.getElementById("newPasswordConfirm").value;
    data.resetToken = document.getElementById("resetToken").textContent;
    resetPasswordPubJs(data);
  });

if (bookEventButtons)
  bookEventButtons.forEach((item) =>
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const eventId = e.target.parentElement.querySelector(".eventId");
      eventCreateBookingPubJs(eventId.textContent);
    })
  );

if (cancelEventButtons)
  cancelEventButtons.forEach((item) =>
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const eventId = e.target.parentElement.querySelector(".eventId");
      eventCancelBookingPubJs(eventId.textContent);
    })
  );

if (viewMyScheduleButtons)
  viewMyScheduleButtons.forEach((item) =>
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const eventId = e.target.parentElement.querySelector(".eventId");
      const locationPath = "/events/viewMySchedule/" + eventId.textContent;
      location.assign(locationPath);
    })
  );
// Get the buttons to trigger the popup
// Loop through all score buttons and add click event to trigger the modal
if (scoreButtons)
  scoreButtons.forEach((item) =>
    item.addEventListener("click", (e) => {
      e.preventDefault(); // Prevent default behavior

      // Extract data attributes from the button
      const round = item.getAttribute("data-round");
      const matchIndex = item.getAttribute("data-matchindex");
      const eventId = item.getAttribute("data-eventid"); // Extract eventId

      // Set hidden input values (roundIndex, matchIndex, eventId)
      document.getElementById("roundIndex").value = round;
      document.getElementById("matchIndex").value = matchIndex;
      document.getElementById("eventId").value = eventId; // Set eventId in the form

      // Show the modal
      modal.style.display = "block";
    })
  );

// When the user clicks on <span> (x), close the modal
if (closeButton)
  closeButton.addEventListener("click", (e) => {
    e.preventDefault();
    modal.style.display = "none"; // Close the modal
  });

// When the user clicks anywhere outside the modal, close it
window.onclick = function (e) {
  if (e.target == modal) {
    modal.style.display = "none"; // Close the modal
  }
};

// Handle form submission for the score
if (scoreForm) {
  scoreForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // Prevent default form submission

    const formData = new FormData(scoreForm);
    const data = {};
    formData.forEach((value, key) => {
      data[key] = value;
    });

    eventUpdateMatchScorePubJs(data);
    modal.style.display = "none"; // Close the modal

    //Navigate to the schedule page after submitting scores
    const eventId = document.getElementById("eventId").value;
    const locationPath = "/events/viewMySchedule/" + eventId;
    location.assign(locationPath); // Navigate to the schedule page
  });
}

if (saveSystemSettingsButton)
  saveSystemSettingsButton.addEventListener("click", (e) => {
    e.preventDefault();
    let data = {};
    data.numOfStandOuts = document.getElementById("numOfStandOuts").value;
    data.numOfRounds = document.getElementById("numOfRounds").value;
    data.numOfCourts = document.getElementById("numOfCourts").value;
    data.numOfPairingsPerCourt = document.getElementById(
      "numOfPairingsPerCourt"
    ).value;
    data.waitListSize = document.getElementById("waitListSize").value;
    manageSystemSettingsPubJs(data);
  });
