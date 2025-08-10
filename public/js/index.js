/* eslint-disable */
import "core-js/stable";
import "regenerator-runtime/runtime";
import axios from "./api";
axios.defaults.withCredentials = true;

import {
  createUserApiAction,
  editUserApiAction,
  deleteUserApiAction,
  createEventApiAction,
  updateEventApiAction,
  deleteEventApiAction,
  eventCreateBookingApiAction,
  eventCancelBookingApiAction,
  eventUpdateMatchScoreApiAction,
  loginApiAction,
  logOutApiAction,
  signUpApiAction,
  updateAcApiAction,
  forgotPasswordApiAction,
  resetPasswordApiAction,
  getSystemSettingsApiAction,
  manageSystemSettingsApiAction,
} from "./apiActions";

import { initFormListeners } from "./formListeners";
import { initScoreModal } from "./modal";
import { initMobileNavToggle } from "./navToggle";
import { initButtonDelegates } from "./buttonDelegates";

document.addEventListener("DOMContentLoaded", () => {
  // Forms
  initFormListeners({
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
  });

  // Score modal
  initScoreModal(eventUpdateMatchScoreApiAction);

  // Mobile nav toggle
  initMobileNavToggle();

  // Button and link event delegation
  initButtonDelegates({
    logOutApiAction,
    deleteUserApiAction,
    eventCreateBookingApiAction,
    eventCancelBookingApiAction,
    deleteEventApiAction,
  });
});
