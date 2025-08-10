export function initFormListeners(deps) {
  const {
    loginApiAction,
    getSystemSettingsApiAction,
    manageSystemSettingsApiAction,
    signUpApiAction,
    updateAcApiAction,
    forgotPasswordApiAction,
    resetPasswordApiAction,
    createUserApiAction,
    editUserApiAction,
    createEventApiAction,
    updateEventApiAction,
  } = deps;

  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!loginForm.checkValidity()) {
        loginForm.reportValidity();
        return;
      }
      try {
        await loginApiAction(
          document.getElementById("email").value,
          document.getElementById("password").value
        );
        await getSystemSettingsApiAction();
      } catch (err) {
        console.error("Login failed:", err);
      }
    });
  }

  const saveSystemSettingsForm = document.getElementById(
    "saveSystemSettingsForm"
  );
  if (saveSystemSettingsForm) {
    saveSystemSettingsForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!saveSystemSettingsForm.checkValidity()) {
        saveSystemSettingsForm.reportValidity();
        return;
      }
      try {
        await manageSystemSettingsApiAction({
          numOfStandOuts: document.getElementById("numOfStandOuts").value,
          numOfRounds: document.getElementById("numOfRounds").value,
          numOfCourts: document.getElementById("numOfCourts").value,
          numOfPairingsPerCourt: document.getElementById(
            "numOfPairingsPerCourt"
          ).value,
          waitListSize: document.getElementById("waitListSize").value,
        });
      } catch (err) {
        console.error("Save system settings failed:", err);
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
        await signUpApiAction(
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
        await updateAcApiAction(
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
        await updateAcApiAction(
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
        await forgotPasswordApiAction({
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
        await resetPasswordApiAction({
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
        await createUserApiAction(
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
        await editUserApiAction(
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
        await createEventApiAction(data);
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
        await updateEventApiAction(data);
      } catch (err) {
        console.error("Event update failed:", err);
      }
    });
  }
}
