export function initButtonDelegates(deps) {
  const {
    logOutApiAction,
    deleteUserApiAction,
    eventCreateBookingApiAction,
    eventCancelBookingApiAction,
    deleteEventApiAction,
  } = deps;

  // Graceful Degradation: Check for missing dependencies
  function safeApiCall(fn, ...args) {
    if (typeof fn !== "function") {
      alert("This action is currently unavailable.");
      return Promise.reject(new Error("Missing dependency"));
    }
    return fn(...args);
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

  function delegate(parent, selector, eventType, handler) {
    parent.addEventListener(eventType, (event) => {
      const target = event.target.closest(selector);
      if (target && parent.contains(target)) {
        handler(event, target);
      }
    });
  }

  delegate(document.body, "a.logOutButton", "click", async (e, target) => {
    e.preventDefault();
    target.disabled = true;
    try {
      await retryAsync(() => safeApiCall(logOutApiAction), [], 2, 500);
    } catch (err) {
      alert("Logout failed. Please try again.");
      console.error("Logout failed:", err);
    } finally {
      target.disabled = false;
    }
  });

  delegate(document.body, "a.editUserButtons", "click", (e, target) => {
    e.preventDefault();
    const userIdElem = target.parentElement.querySelector(".userId");
    if (!userIdElem) return;
    const userId = userIdElem.textContent;
    location.assign(`/users/get/${userId}`);
  });

  delegate(document.body, "a.deleteUserButtons", "click", async (e, target) => {
    e.preventDefault();
    target.disabled = true;
    const userIdElem = target.parentElement.querySelector(".userId");
    if (!userIdElem) {
      target.disabled = false;
      return;
    }
    try {
      await retryAsync(
        () => safeApiCall(deleteUserApiAction, userIdElem.textContent),
        [],
        2,
        500
      );
    } catch (err) {
      alert("Delete user failed. Please try again.");
      console.error("Delete user failed:", err);
    } finally {
      target.disabled = false;
    }
  });

  delegate(document.body, "a.editEventButtons", "click", (e, target) => {
    e.preventDefault();
    const eventIdElem = target.parentElement.querySelector(".eventId");
    if (!eventIdElem) return;
    location.assign(`/events/get/${eventIdElem.textContent}`);
  });

  delegate(
    document.body,
    "a.deleteEventButtons",
    "click",
    async (e, target) => {
      e.preventDefault();
      target.disabled = true;
      const eventIdElem = target.parentElement.querySelector(".eventId");
      if (!eventIdElem) {
        target.disabled = false;
        return;
      }
      try {
        await retryAsync(
          () => safeApiCall(deleteEventApiAction, eventIdElem.textContent),
          [],
          2,
          500
        );
      } catch (err) {
        alert("Delete event failed. Please try again.");
        console.error("Delete event failed:", err);
      } finally {
        target.disabled = false;
      }
    }
  );

  delegate(document.body, "a.bookEventButtons", "click", async (e, target) => {
    e.preventDefault();
    target.disabled = true;
    const eventIdElem = target.parentElement.querySelector(".eventId");
    if (!eventIdElem) {
      target.disabled = false;
      return;
    }
    try {
      await retryAsync(
        () => safeApiCall(eventCreateBookingApiAction, eventIdElem.textContent),
        [],
        2,
        500
      );
    } catch (err) {
      alert("Booking failed. Please try again.");
      console.error("Create booking failed:", err);
    } finally {
      target.disabled = false;
    }
  });

  delegate(
    document.body,
    "a.cancelEventButtons",
    "click",
    async (e, target) => {
      e.preventDefault();
      target.disabled = true;
      const eventIdElem = target.parentElement.querySelector(".eventId");
      if (!eventIdElem) {
        target.disabled = false;
        return;
      }
      try {
        await retryAsync(
          () =>
            safeApiCall(eventCancelBookingApiAction, eventIdElem.textContent),
          [],
          2,
          500
        );
      } catch (err) {
        alert("Cancel booking failed. Please try again.");
        console.error("Cancel booking failed:", err);
      } finally {
        target.disabled = false;
      }
    }
  );

  delegate(document.body, "a.viewMyScheduleButtons", "click", (e, target) => {
    e.preventDefault();
    const eventIdElem = target.parentElement.querySelector(".eventId");
    if (!eventIdElem) return;
    location.assign(`/events/viewMySchedule/${eventIdElem.textContent}`);
  });
}

// Cog/settings dropdown logic (NO delegate needed)
const settingsToggle = document.querySelector(".settings-toggle");
const settingsDropdown = document.querySelector(".settings-dropdown");
if (settingsToggle && settingsDropdown) {
  settingsToggle.addEventListener("click", function (e) {
    e.preventDefault();
    console.log("Cog clicked");
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
