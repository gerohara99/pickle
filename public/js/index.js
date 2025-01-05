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

// DOM ELements
const loginForm = document.querySelector(".form--login");
const signupForm = document.querySelector(".form--signup");
const logOutBtn = document.querySelector(".nav__el--logout");
const userDataForm = document.querySelector(".form-user-data");
const eventDataForm = document.querySelector(".form-event-data");
const userPasswordForm = document.querySelector(".form-user-password");
const updateEventDataForm = document.querySelector(
  ".form__group.right.updateEventButton"
);
const deleteEventButton = document.querySelector(
  ".form__group.right.deleteEventButton"
);

//DELEGATION

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
    console.log("got here");
    const eventId = document.getElementById("eventId").value;
    deleteEventPubJs(eventId);
  });
