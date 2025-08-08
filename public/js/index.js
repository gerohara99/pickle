/* eslint-disable */
import "core-js/stable";
import "regenerator-runtime/runtime";
import axios from "./api";
axios.defaults.withCredentials = true;

import { login } from "./login";
import { logOut } from "./logout";
import { signUp } from "./signUp";
import { updateAc } from "./updateAc";

import {
  createEventPubJs,
  updateEventPubJs,
  deleteEventPubJs,
  eventCreateBookingPubJs,
  eventCancelBookingPubJs,
  eventUpdateMatchScorePubJs,
} from "./eventsPubJs";

import { createUserPubJs, editUserPubJs, deleteUserPubJs } from "./usersPubJs";
import { forgotPasswordPubJs } from "./forgotPasswordPubJs";
import { resetPasswordPubJs } from "./resetPasswordPubJs";

import {
  getSystemSettingsPubJs,
  manageSystemSettingsPubJs,
} from "./settingsPubJs";

document.addEventListener("DOMContentLoaded", () => {
  // Utility function for event delegation
  function delegate(parent, selector, eventType, handler) {
    parent.addEventListener(eventType, (event) => {
      const target = event.target.closest(selector);
      if (target && parent.contains(target)) {
        handler(event, target);
      }
    });
  }

  /*** Forms ***/

  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!loginForm.checkValidity()) {
        loginForm.reportValidity();
        return;
      }
      try {
        await login(
          document.getElementById("email").value,
          document.getElementById("password").value
        );
        await getSystemSettingsPubJs();
      } catch (err) {
        console.error("Login failed:", err);
      }
    });
  }

  const signUpForm = document.getElementById("signUpForm");
  if (signUpForm) {
    signUpForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!signUpForm.checkValidity()) {
        signUpForm.reportValidity();
        return;
      }
      try {
        await signUp(
          document.getElementById("name").value,
          document.getElementById("email").value,
          document.getElementById("mobile").value,
          document.getElementById("password").value,
          document.getElementById("passwordConfirm").value
        );
      } catch (err) {
        console.error("Sign Up failed:", err);
      }
    });
  }

  const acDetailsForm = document.getElementById("acDetailsForm");
  if (acDetailsForm) {
    acDetailsForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!acDetailsForm.checkValidity()) {
        acDetailsForm.reportValidity();
        return;
      }
      try {
        await updateAc(
          {
            name: document.getElementById("name").value,
            email: document.getElementById("email").value,
            mobile: document.getElementById("mobile").value,
            userId: document.getElementById("userId").value,
          },
          "account"
        );
        location.assign("/events/browseNew");
      } catch (err) {
        console.error("Update account failed:", err);
      }
    });
  }

  const updatePasswordForm = document.getElementById("updatePasswordForm");
  if (updatePasswordForm) {
    updatePasswordForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!updatePasswordForm.checkValidity()) {
        updatePasswordForm.reportValidity();
        return;
      }
      try {
        await updateAc(
          {
            currentPassword: document.getElementById("currentPassword").value,
            newPassword: document.getElementById("newPassword").value,
            newPasswordConfirm:
              document.getElementById("newPasswordConfirm").value,
            userId: document.getElementById("userId").textContent,
          },
          "password"
        );
        location.assign("/events/browseNew");
      } catch (err) {
        console.error("Update password failed:", err);
      }
    });
  }

  const forgotPasswordForm = document.getElementById("forgotPasswordForm");
  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        await forgotPasswordPubJs({
          email: document.getElementById("email").value,
        });
      } catch (err) {
        console.error("Forgot password failed:", err);
      }
    });
  }

  const resetPasswordForm = document.getElementById("resetPasswordForm");
  if (resetPasswordForm) {
    resetPasswordForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!resetPasswordForm.checkValidity()) {
        resetPasswordForm.reportValidity();
        return;
      }
      try {
        await resetPasswordPubJs({
          password: document.getElementById("newPassword").value,
          passwordConfirm: document.getElementById("newPasswordConfirm").value,
          resetToken: document.getElementById("resetToken").textContent,
        });
      } catch (err) {
        console.error("Reset password failed:", err);
      }
    });
  }

  const createUserForm = document.getElementById("createUserForm");
  if (createUserForm) {
    createUserForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!createUserForm.checkValidity()) {
        createUserForm.reportValidity();
        return;
      }
      try {
        await createUserPubJs(
          document.getElementById("name").value,
          document.getElementById("email").value,
          document.getElementById("mobile").value,
          document.getElementById("password").value,
          document.getElementById("passwordConfirm").value
        );
      } catch (err) {
        console.error("Create user failed:", err);
      }
    });
  }

  const editUserForm = document.getElementById("editUserForm");
  if (editUserForm) {
    editUserForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!editUserForm.checkValidity()) {
        editUserForm.reportValidity();
        return;
      }
      try {
        await editUserPubJs(
          document.getElementById("userId").value,
          document.getElementById("name").value,
          document.getElementById("email").value,
          document.getElementById("mobile").value
        );
      } catch (err) {
        console.error("Edit user failed:", err);
      }
    });
  }

  const createEventForm = document.getElementById("createEventForm");
  if (createEventForm) {
    createEventForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!createEventForm.checkValidity()) {
        createEventForm.reportValidity();
        return;
      }
      const data = {
        eventName: document.getElementById("eventName").value,
        eventLocation: document.getElementById("eventLocation").value,
        eventType: document.getElementById("eventType").value,
        eventDate: document.getElementById("eventDate").value,
        eventStartTime: document.getElementById("eventStartTime").value,
        eventOrganiser: document.getElementById("eventOrganiser").value,
        eventNumOfCourts: document.getElementById("eventNumOfCourts").value,
        numOfStandOutsPerRound: document.getElementById(
          "numOfStandOutsPerRound"
        ).value,
        eventNumOfRounds: document.getElementById("eventNumOfRounds").value,
        eventWaitListSize: document.getElementById("eventWaitListSize").value,
        eventNumOfPairings: document.getElementById("eventNumOfPairings").value,
      };
      try {
        await createEventPubJs(data);
      } catch (err) {
        console.error("Event creation failed:", err);
      }
    });
  }

  const saveEventForm = document.getElementById("saveEventForm");
  if (saveEventForm) {
    saveEventForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!saveEventForm.checkValidity()) {
        saveEventForm.reportValidity();
        return;
      }
      const data = {
        eventId: document.getElementById("eventId").value,
        eventName: document.getElementById("eventName").value,
        eventLocation: document.getElementById("eventLocation").value,
        eventType: document.getElementById("eventType").value,
        eventDate: document.getElementById("eventDate").value,
        eventStartTime: document.getElementById("eventStartTime").value,
        eventOrganiser: document.getElementById("eventOrganiser").value,
        eventNumOfCourts: document.getElementById("eventNumOfCourts").value,
        numOfStandOutsPerRound: document.getElementById(
          "numOfStandOutsPerRound"
        ).value,
        eventNumOfRounds: document.getElementById("eventNumOfRounds").value,
        eventWaitListSize: document.getElementById("eventWaitListSize").value,
        eventNumOfPairings: document.getElementById("eventNumOfPairings").value,
      };
      try {
        await updateEventPubJs(data);
      } catch (err) {
        console.error("Event update failed:", err);
      }
    });
  }

  /*** Button and link event delegation ***/
  delegate(document.body, "a.logOutButton", "click", async (e, target) => {
    e.preventDefault();
    try {
      await logOut();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  });

  // Edit User buttons (event delegation)
  delegate(document.body, "a.editUserButtons", "click", (e, target) => {
    e.preventDefault();
    const userIdElem = target.parentElement.querySelector(".userId");
    if (!userIdElem) return;
    const userId = userIdElem.textContent;
    location.assign(`/users/get/${userId}`);
  });

  // Delete User buttons
  delegate(document.body, "a.deleteUserButtons", "click", (e, target) => {
    e.preventDefault();
    const userIdElem = target.parentElement.querySelector(".userId");
    if (!userIdElem) return;
    deleteUserPubJs(userIdElem.textContent);
  });

  // Edit Event buttons
  delegate(document.body, "a.editEventButtons", "click", (e, target) => {
    e.preventDefault();
    const eventIdElem = target.parentElement.querySelector(".eventId");
    if (!eventIdElem) return;
    location.assign(`/events/get/${eventIdElem.textContent}`);
  });

  // Delete Event buttons
  delegate(document.body, "a.deleteEventButtons", "click", (e, target) => {
    e.preventDefault();
    const eventIdElem = target.parentElement.querySelector(".eventId");
    if (!eventIdElem) return;
    deleteEventPubJs(eventIdElem.textContent);
  });

  // Booking an event
  delegate(document.body, "a.bookEventButtons", "click", async (e, target) => {
    e.preventDefault();
    const eventIdElem = target.parentElement.querySelector(".eventId");
    if (!eventIdElem) return;
    try {
      await eventCreateBookingPubJs(eventIdElem.textContent);
    } catch (err) {
      console.error("Create booking failed:", err);
    }
  });

  // Cancel event booking
  delegate(
    document.body,
    "a.cancelEventButtons",
    "click",
    async (e, target) => {
      e.preventDefault();
      const eventIdElem = target.parentElement.querySelector(".eventId");
      if (!eventIdElem) return;
      try {
        await eventCancelBookingPubJs(eventIdElem.textContent);
      } catch (err) {
        console.error("Cancel booking failed:", err);
      }
    }
  );

  // View My Schedule buttons
  delegate(document.body, "a.viewMyScheduleButtons", "click", (e, target) => {
    e.preventDefault();
    const eventIdElem = target.parentElement.querySelector(".eventId");
    if (!eventIdElem) return;
    location.assign(`/events/viewMySchedule/${eventIdElem.textContent}`);
  });

  /*** Score modal logic ***/
  const modal = document.getElementById("scoreModal");
  const scoreForm = document.getElementById("scoreForm");
  const closeButton = modal ? modal.querySelector(".close") : null;
  const scoreButtons = document.querySelectorAll(".score-button");

  if (scoreButtons && modal) {
    scoreButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        modal.style.display = "block";
        const round = btn.dataset.round;
        const matchIndex = btn.dataset.matchindex;
        const eventId = btn.dataset.eventid;

        document.getElementById("roundIndex").value = round;
        document.getElementById("matchIndex").value = matchIndex;
        document.getElementById("eventId").value = eventId;
      });
    });
  }

  if (closeButton && modal) {
    closeButton.addEventListener("click", () => {
      modal.style.display = "none";
    });
  }

  if (scoreForm) {
    scoreForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        await eventUpdateMatchScorePubJs(
          document.getElementById("roundIndex").value,
          document.getElementById("matchIndex").value,
          document.getElementById("teamAScore").value,
          document.getElementById("teamBScore").value,
          document.getElementById("eventId").value
        );
        modal.style.display = "none";
      } catch (err) {
        console.error("Update match score failed:", err);
      }
    });
  }

  /*** Mobile drawer nav toggle ***/
  const mobileNavToggle = document.getElementById("mobileNavToggle");
  const mobileDrawer = document.querySelector("nav.mobile-drawer");

  if (mobileNavToggle && mobileDrawer) {
    mobileNavToggle.addEventListener("click", () => {
      mobileDrawer.classList.toggle("open");

      const iconMenu = mobileNavToggle.querySelector(".icon-menu");
      const iconClose = mobileNavToggle.querySelector(".icon-close");

      if (mobileDrawer.classList.contains("open")) {
        iconMenu.style.display = "none";
        iconClose.style.display = "inline-block";
      } else {
        iconMenu.style.display = "inline-block";
        iconClose.style.display = "none";
      }
    });
  }
});
