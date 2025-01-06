/*eslint-disable*/
import "@babel/polyfill";
import { login, logout } from "./login";
import { signup } from "./signUp";
import { updateSettings } from "./updateSettings";
import {
  createEventPubJs,
  updateEventPubJs,
  deleteEventPubJs,
} from "./eventsPubJs";
import {
  createUserPubJs,
  updateUserPubJs,
  deleteUserPubJs,
} from "./usersPubJs";
import {
  createLocationPubJs,
  updateLocationPubJs,
  deleteLocationPubJs,
} from "./locationsPubJs";

// DOM ELements

//Auth Elements
const loginForm = document.querySelector(".form--login");
const signupForm = document.querySelector(".form--signup");
const logOutBtn = document.querySelector(".nav__el--logout");

//Individual User Elements
const userDataForm = document.querySelector(".form-user-data");
const userPasswordForm = document.querySelector(".form-user-password");

// Admin user elements
const userEditForm = document.querySelector(".form-edit-user-data");
const deleteUserButton = document.querySelector(
  "form__group.right.deleteUserButton"
);

//Events
const eventDataForm = document.querySelector(".form-event-data");
const updateEventDataForm = document.querySelector(
  ".form__group.right.updateEventButton"
);
const deleteEventButton = document.querySelector(
  ".form__group.right.deleteEventButton"
);

//Locations
const locationDataForm = document.querySelector(".form-location-data");
const updateLocationDataForm = document.querySelector(
  ".form__group.right.updateLocationButton"
);
const deleteLocationButton = document.querySelector(
  ".form__group.right.deleteLocationButton"
);

// AUTH FORMS
if (loginForm)
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    login(email, password);
  });

if (signupForm)
  signupForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const passwordConfirm = document.getElementById("passwordConfirm").value;
    signup(name, email, password, passwordConfirm);
  });

//INDIVIUAL USER FORMS
if (logOutBtn) logOutBtn.addEventListener("click", logout);

if (userDataForm)
  userDataForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const form = new FormData();
    form.append("name", document.getElementById("name").value);
    form.append("email", document.getElementById("email").value);
    updateSettings(form, "data");
  });

if (userPasswordForm)
  userPasswordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const passwordCurrent = document.getElementById("password-current").value;
    const password = document.getElementById("password").value;
    const passwordConfirm = document.getElementById("password-confirm").value;

    await updateSettings(
      { passwordCurrent, password, passwordConfirm },
      "password"
    );

    document.getElementById("password-current").value = "";
    document.getElementById("password").value = "";
    document.getElementById("password-confirm").value = "";
  });

//ADMIN RELATED USER FORMS
if (userEditForm)
  userEditForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const mobile = document.getElementById("mobile").value;
    const userId = document.getElementById("userId").value;
    console.log(userId);
    updateUserPubJs(userId, name, email, mobile);
  });

if (deleteUserButton)
  deleteUserButton.addEventListener("click", (e) => {
    e.preventDefault();
    const userId = document.getElementById("userId").value;
    deleteUserPubJs(userId);
  });

// EVENT FORMS
if (eventDataForm)
  eventDataForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const eventName = document.getElementById("eventName").value;
    const eventDate = document.getElementById("eventDate").value;
    const eventStartTime = document.getElementById("eventStartTime").value;
    const eventLocation = document.getElementById("eventLocation").value;
    createEventPubJs(eventName, eventDate, eventStartTime, eventLocation);
  });

if (updateEventDataForm)
  updateEventDataForm.addEventListener("click", (e) => {
    e.preventDefault();
    const eventName = document.getElementById("eventName").value;
    const eventDate = document.getElementById("eventDate").value;
    const eventStartTime = document.getElementById("eventStartTime").value;
    const eventLocation = document.getElementById("eventLocation").value;
    const eventId = document.getElementById("eventId").value;
    updateEventPubJs(
      eventId,
      eventName,
      eventDate,
      eventStartTime,
      eventLocation
    );
  });

if (deleteEventButton)
  deleteEventButton.addEventListener("click", (e) => {
    e.preventDefault();
    const eventId = document.getElementById("eventId").value;
    deleteEventPubJs(eventId);
  });

// LOCATION FORMS
if (locationDataForm)
  locationDataForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const locationName = document.getElementById("locationName").value;
    const locationNumCourts = document.getElementById(
      "locationNumOfCourts"
    ).value;
    const locationCourtCapacity = document.getElementById(
      "locationCourtCapacity"
    ).value;
    createLocationPubJs(locationName, locationNumCourts, locationCourtCapacity);
  });

if (updateLocationDataForm)
  updateLocationDataForm.addEventListener("click", (e) => {
    e.preventDefault();
    const locationName = document.getElementById("locationName").value;
    const locationNumCourts =
      document.getElementById("locationNumCourts").value;
    const locationCourtCapacity = document.getElementById(
      "locationCourtCapacity"
    ).value;
    const locationId = document.getElementById("locationId").value;
    updateEventPubJs(
      locationId,
      locationName,
      locationNumCourts,
      locationCourtCapacity
    );
  });

if (deleteLocationButton)
  deleteLocationButton.addEventListener("click", (e) => {
    e.preventDefault();
    const locationId = document.getElementById("locationId").value;
    deleteLocationPubJs(locationId);
  });
