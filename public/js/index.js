/*eslint-disable*/
import "@babel/polyfill";
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
} from "./eventsPubJs";
import {
  createUserPubJs,
  updateUserPubJs,
  deleteUserPubJs,
} from "./usersPubJs";
import { forgotPasswordPubJs } from "./forgotPasswordPubJs";
import { resetPasswordPubJs } from "./resetPasswordPubJs";

// DOM ELements

//Auth Elements -- note all these functions are in public/js folder NOT auth routes
const logInButton = document.getElementById("logInButton");
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
const saveAcDetailsButton = document.getElementById("saveAcDetailsButton");
const updatePasswordButton = document.getElementById("updatePasswordButton");
const forgotPasswordLink = document.getElementById("forgotPasswordLink");
const resetPasswordButton = document.getElementById("resetPasswordButton");
const bookEventButtons = document.querySelectorAll("a.bookEventButtons");
const cancelEventButtons = document.querySelectorAll("a.cancelEventButtons");
const viewScheduleButtons = document.querySelectorAll("a.viewScheduleButtons");

//******************** Authorization functions
if (logInButton)
  logInButton.addEventListener("click", (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    login(email, password);
  });

if (signUpButton)
  signUpButton.addEventListener("click", (e) => {
    e.preventDefault();
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const mobile = document.getElementById("mobile").value;
    const password = document.getElementById("password").value;
    const passwordConfirm = document.getElementById("passwordConfirm").value;
    signUp(name, email, mobile, password, passwordConfirm);
  });

if (logOutButton)
  logOutButton.addEventListener("click", (e) => {
    e.preventDefault();
    logOut();
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
    updateEventPubJs(data);
  });

/******** User functions    ************************/
if (saveAcDetailsButton)
  saveAcDetailsButton.addEventListener("click", (e) => {
    e.preventDefault();
    let data = {};
    data.name = document.getElementById("name").value;
    data.email = document.getElementById("email").value;
    data.mobile = document.getElementById("mobile").value;
    data.userId = document.getElementById("userId").textContent;
    const type = "account";
    updateAc(data, type);
    location.assign("/events/browseNew");
  });

if (updatePasswordButton)
  updatePasswordButton.addEventListener("click", (e) => {
    e.preventDefault();
    let data = {};
    data.currentPassword = document.getElementById("currentPassword").value;
    data.newPassword = document.getElementById("newPassword").value;
    data.newPasswordConfirm =
      document.getElementById("newPasswordConfirm").value;
    data.userId = document.getElementById("userId").textContent;
    const type = "password";
    updateAc(data, type);
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

if (viewScheduleButtons)
  viewScheduleButtons.forEach((item) =>
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const eventId = e.target.parentElement.querySelector(".eventId");
      const locationPath = "/events/viewSchedule/" + eventId.textContent;
      location.assign(locationPath);
    })
  );
