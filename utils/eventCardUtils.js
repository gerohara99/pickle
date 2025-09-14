// utils/eventCardUtils.js

export function renderEventBookings({ event, clone }) {
  // Format the date
  const options = {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  };
  const eventDate = new Date(event.eventDate).toLocaleDateString(
    undefined,
    options
  );
  clone.querySelector(".event-date-text").textContent = eventDate;
  clone.querySelector(".event-time-text").textContent = event.eventStartTime;
  clone.querySelector(".event-location-text").textContent = event.eventLocation;
  clone.querySelector(".event-id").textContent = event._id;

  // Add players
  const playersList = clone.querySelector(".player-list");
  const waitList = clone.querySelector(".waitlist-list");

  // Determine player limit
  let playersLimit = 2;
  if (event.scheduleConfiguration && event.scheduleConfiguration.players) {
    playersLimit = event.scheduleConfiguration.players;
  } else if (event.doubles) {
    playersLimit = 4;
  }

  const eventBookings = Array.isArray(event.eventBookings)
    ? event.eventBookings
    : [];

  eventBookings.forEach((booking, index) => {
    const listItem = document.createElement("li");
    listItem.textContent = booking.userName || booking.name || "Player";
    if (index < playersLimit) {
      playersList.appendChild(listItem);
    } else {
      if (index === playersLimit) {
        clone.querySelector(".event-waitlist").classList.remove("hidden");
      }
      waitList.appendChild(listItem);
    }
  });

  // Update status badge
  const isWaitList = eventBookings.length >= playersLimit;
  const statusText = clone.querySelector(".status-text");
  const statusBadge = clone.querySelector(".status-badge");
  const bookBtnText = clone.querySelector(".book-btn-text");

  if (isWaitList) {
    statusText.textContent = "Wait list only";
    statusBadge.classList.remove("available");
    statusBadge.classList.add("waitlist");
    if (bookBtnText) bookBtnText.textContent = "Join Wait List";
  } else {
    const spotsLeft = playersLimit - eventBookings.length;
    statusText.textContent = `${spotsLeft} spot${spotsLeft !== 1 ? "s" : ""} available`;
    if (bookBtnText) bookBtnText.textContent = "Book Event";
  }
}
