export function initButtonDelegates(deps) {
  const {
    logOutApiAction,
    deleteUserApiAction,
    eventCreateBookingApiAction,
    eventCancelBookingApiAction,
    deleteEventApiAction,
  } = deps;

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
    try {
      await logOutApiAction();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  });

  delegate(document.body, "a.editUserButtons", "click", (e, target) => {
    e.preventDefault();
    const userIdElem = target.parentElement.querySelector(".userId");
    if (!userIdElem) return;
    const userId = userIdElem.textContent;
    location.assign(`/users/get/${userId}`);
  });

  delegate(document.body, "a.deleteUserButtons", "click", (e, target) => {
    e.preventDefault();
    const userIdElem = target.parentElement.querySelector(".userId");
    if (!userIdElem) return;
    deleteUserApiAction(userIdElem.textContent);
  });

  delegate(document.body, "a.editEventButtons", "click", (e, target) => {
    e.preventDefault();
    const eventIdElem = target.parentElement.querySelector(".eventId");
    if (!eventIdElem) return;
    location.assign(`/events/get/${eventIdElem.textContent}`);
  });

  delegate(document.body, "a.deleteEventButtons", "click", (e, target) => {
    e.preventDefault();
    const eventIdElem = target.parentElement.querySelector(".eventId");
    if (!eventIdElem) return;
    deleteEventApiAction(eventIdElem.textContent);
  });

  delegate(document.body, "a.bookEventButtons", "click", async (e, target) => {
    e.preventDefault();
    const eventIdElem = target.parentElement.querySelector(".eventId");
    if (!eventIdElem) return;
    try {
      await eventCreateBookingApiAction(eventIdElem.textContent);
    } catch (err) {
      console.error("Create booking failed:", err);
    }
  });

  delegate(
    document.body,
    "a.cancelEventButtons",
    "click",
    async (e, target) => {
      e.preventDefault();
      const eventIdElem = target.parentElement.querySelector(".eventId");
      if (!eventIdElem) return;
      try {
        await eventCancelBookingApiAction(eventIdElem.textContent);
      } catch (err) {
        console.error("Cancel booking failed:", err);
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
