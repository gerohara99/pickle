export function initFormListeners(deps) {
  // Graceful Degradation: Check for missing dependencies
  function depCheck(fn, name) {
    if (typeof fn !== "function") {
      return async () => {
        showError(`Required API action "${name}" is not available.`);
        throw new Error(`Missing dependency: ${name}`);
      };
    }
    return fn;
  }

  // User-friendly error display
  function showError(message) {
    alert(message); // Replace with custom UI if desired
  }

  // Network Reliability: Retry wrapper for transient errors
  async function retryAsync(fn, args = [], retries = 2, delay = 500) {
    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn(...args);
      } catch (err) {
        lastErr = err;
        // Only retry for network errors (can be customized)
        if (
          err instanceof TypeError ||
          (err.message && err.message.includes("Network"))
        ) {
          await new Promise((res) => setTimeout(res, delay));
        } else {
          break;
        }
      }
    }
    throw lastErr;
  }

  // Dependency checks
  const loginApiAction = depCheck(deps.loginApiAction, "loginApiAction");
  const getSystemSettingsApiAction = depCheck(
    deps.getSystemSettingsApiAction,
    "getSystemSettingsApiAction"
  );
  const manageSystemSettingsApiAction = depCheck(
    deps.manageSystemSettingsApiAction,
    "manageSystemSettingsApiAction"
  );
  const signUpApiAction = depCheck(deps.signUpApiAction, "signUpApiAction");
  const updateAcApiAction = depCheck(
    deps.updateAcApiAction,
    "updateAcApiAction"
  );
  const forgotPasswordApiAction = depCheck(
    deps.forgotPasswordApiAction,
    "forgotPasswordApiAction"
  );
  const resetPasswordApiAction = depCheck(
    deps.resetPasswordApiAction,
    "resetPasswordApiAction"
  );
  const createUserApiAction = depCheck(
    deps.createUserApiAction,
    "createUserApiAction"
  );
  const editUserApiAction = depCheck(
    deps.editUserApiAction,
    "editUserApiAction"
  );
  const createEventApiAction = depCheck(
    deps.createEventApiAction,
    "createEventApiAction"
  );
  const updateEventApiAction = depCheck(
    deps.updateEventApiAction,
    "updateEventApiAction"
  );
  const markNoShowApiAction = depCheck(
    deps.markNoShowApiAction,
    "markNoShowApiAction"
  );

  function handleFormSubmit(form, asyncFn, getArgs = () => [], successCb) {
    if (!form) return;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      const submitBtn = form.querySelector("button[type='submit']");
      if (submitBtn) submitBtn.disabled = true;
      try {
        await retryAsync(asyncFn, getArgs(), 2, 500);
        if (typeof successCb === "function") successCb();
      } catch (err) {
        console.error("Form submission failed:", err);
        showError("An error occurred. Please try again.");
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  handleFormSubmit(
    document.getElementById("loginForm"),
    async (...args) => {
      await loginApiAction(...args);
      await getSystemSettingsApiAction();
    },
    () => [
      document.getElementById("email").value,
      document.getElementById("password").value,
    ]
  );

  handleFormSubmit(
    document.getElementById("saveSystemSettingsForm"),
    manageSystemSettingsApiAction,
    () => [
      {
        systemDefaults: {
          numOfStandOuts: document.getElementById("numOfStandOuts").value,
          numOfRounds: document.getElementById("numOfRounds").value,
          numOfCourts: document.getElementById("numOfCourts").value,
          numOfPairingsPerCourt: document.getElementById(
            "numOfPairingsPerCourt"
          ).value,
          waitListSize: document.getElementById("waitListSize").value,
        },
      },
    ]
  );

  handleFormSubmit(
    document.getElementById("signUpForm"),
    signUpApiAction,
    () => [
      document.getElementById("name").value,
      document.getElementById("email").value,
      document.getElementById("mobile").value,
      document.getElementById("password").value,
      document.getElementById("passwordConfirm").value,
    ]
  );

  handleFormSubmit(
    document.getElementById("acDetailsForm"),
    async (data) => {
      await updateAcApiAction(data, "account");
      location.assign("/events/browseNew");
    },
    () => [
      {
        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        mobile: document.getElementById("mobile").value,
        userId: document.getElementById("userId").value,
      },
    ]
  );

  handleFormSubmit(
    document.getElementById("updatePasswordForm"),
    async (data) => {
      await updateAcApiAction(data, "password");
      location.assign("/events/browseNew");
    },
    () => [
      {
        currentPassword: document.getElementById("currentPassword").value,
        newPassword: document.getElementById("newPassword").value,
        newPasswordConfirm: document.getElementById("newPasswordConfirm").value,
        userId: document.getElementById("userId").textContent,
      },
    ]
  );

  handleFormSubmit(
    document.getElementById("forgotPasswordForm"),
    forgotPasswordApiAction,
    () => [{ email: document.getElementById("email").value }]
  );

  handleFormSubmit(
    document.getElementById("resetPasswordForm"),
    resetPasswordApiAction,
    () => [
      {
        password: document.getElementById("newPassword").value,
        passwordConfirm: document.getElementById("newPasswordConfirm").value,
        resetToken: document.getElementById("resetToken").textContent,
      },
    ]
  );

  handleFormSubmit(
    document.getElementById("createUserForm"),
    createUserApiAction,
    () => [
      document.getElementById("name").value,
      document.getElementById("email").value,
      document.getElementById("mobile").value,
      document.getElementById("password").value,
      document.getElementById("passwordConfirm").value,
      document.getElementById("active").checked,
    ]
  );

  handleFormSubmit(
    document.getElementById("editUserForm"),
    editUserApiAction,
    () => [
      document.getElementById("userId").value,
      document.getElementById("name").value,
      document.getElementById("email").value,
      document.getElementById("mobile").value,
      document.getElementById("active").checked,
    ]
  );

  handleFormSubmit(
    document.getElementById("createEventForm"),
    createEventApiAction,
    () => [
      {
        eventName: document.getElementById("eventName").value,
        eventLocation: document.getElementById("eventLocation").value,
        eventType: document.getElementById("eventType").value,
        eventDate: document.getElementById("eventDate").value,
        eventStartTime: document.getElementById("eventStartTime").value,
        eventOrganiser: document.getElementById("eventOrganiser").value,
        eventWaitListSize: document.getElementById("eventWaitListSize").value,
        active: document.getElementById("active").checked,
        doubles: document.getElementById("doublesToggle").checked,
        scheduleConfiguration: JSON.parse(
          document.getElementById("selectedScheduleConfig").value
        ),
      },
    ]
  );

  handleFormSubmit(
    document.getElementById("saveEventForm"),
    updateEventApiAction,
    () => [
      {
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
        active: document.getElementById("active").checked,
      },
    ]
  );

  // No Show Form
  handleFormSubmit(
    document.getElementById("noShowForm"),
    async (eventId, userId) => {
      await markNoShowApiAction(eventId, userId);
    },
    () => [
      document.getElementById("eventId").value,
      document.getElementById("userId").value,
    ]
  );

  handleFormSubmit(
    document.getElementById("saveFeaturesForm"),
    manageSystemSettingsApiAction,
    () => [
      {
        features: {
          teamCanEditScore: document.getElementById("teamCanEditScore").checked,
        },
      },
    ]
  );

  document.addEventListener("DOMContentLoaded", function () {
    const toggle = document.getElementById("togglePassword");
    const pwd = document.getElementById("password");
    if (toggle && pwd) {
      toggle.addEventListener("click", function () {
        if (pwd.type === "password") {
          pwd.type = "text";
          toggle.textContent = "Hide";
        } else {
          pwd.type = "password";
          toggle.textContent = "Show";
        }
      });
    }
  });
}
