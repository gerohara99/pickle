// browseEvents.js - Handles event browsing and booking functionality
import { showAlert } from "./alerts.js";

class EventBrowser {
  constructor() {
    // DOM Elements
    this.eventContainer = document.getElementById("event-container");
    this.noEventsMessage = document.getElementById("no-events-message");
    this.template = document.getElementById("event-card-template");
    this.searchInput = document.getElementById("eventSearch");
    this.searchButton = document.getElementById("searchButton");
    this.filterUpcoming = document.getElementById("filterUpcoming");
    this.filterAvailable = document.getElementById("filterAvailable");

    // Events data
    this.events = window.templateData?.events || [];

    this.init();
  }

  init() {
    // Show/hide appropriate elements based on events
    if (this.events.length === 0) {
      this.noEventsMessage.classList.remove("hidden");
      return;
    }

    // Render all events initially
    this.renderEvents(this.events);

    // Set up search and filters
    this.searchButton.addEventListener("click", () => this.filterEvents());
    this.searchInput.addEventListener("keyup", (e) => {
      if (e.key === "Enter") this.filterEvents();
    });
    this.filterUpcoming.addEventListener("change", () => this.filterEvents());
    this.filterAvailable.addEventListener("change", () => this.filterEvents());
  }

  filterEvents() {
    const searchTerm = this.searchInput.value.toLowerCase();
    const showUpcoming = this.filterUpcoming.checked;
    const showOnlyAvailable = this.filterAvailable.checked;

    const now = new Date();

    const filteredEvents = this.events.filter((event) => {
      // Search term filter
      const eventDate = new Date(event.eventDate);
      const options = {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      };
      const dateString = eventDate.toLocaleDateString(undefined, options);
      const textToSearch =
        `${event.eventName || ""} ${event.eventLocation} ${dateString}`.toLowerCase();
      const matchesSearch = !searchTerm || textToSearch.includes(searchTerm);

      // Upcoming filter
      const isUpcoming = !showUpcoming || eventDate >= now;

      // Available spots filter
      const hasSpots =
        !showOnlyAvailable ||
        event.eventBookings.length < event.scheduleConfiguration.players;

      return matchesSearch && isUpcoming && hasSpots;
    });

    // Clear and render filtered events
    this.eventContainer.innerHTML = "";
    if (filteredEvents.length === 0) {
      this.noEventsMessage.classList.remove("hidden");
    } else {
      this.noEventsMessage.classList.add("hidden");
      this.renderEvents(filteredEvents);
    }
  }

  renderEvents(eventsToRender) {
    eventsToRender.forEach((event) => {
      const clone = document.importNode(this.template.content, true);

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

      // Set event details
      clone.querySelector(".event-date-text").textContent = eventDate;
      clone.querySelector(".event-time-text").textContent =
        event.eventStartTime;
      clone.querySelector(".event-location-text").textContent =
        event.eventLocation;
      clone.querySelector(".event-id").textContent = event._id;

      // Add players
      const playersList = clone.querySelector(".player-list");
      const waitList = clone.querySelector(".waitlist-list");
      const playersLimit = event.scheduleConfiguration.players;

      event.eventBookings.forEach((booking, index) => {
        const listItem = document.createElement(
          index < playersLimit ? "li" : "li"
        );
        listItem.textContent = booking.userName;

        if (index < playersLimit) {
          playersList.appendChild(listItem);
        } else {
          if (index === playersLimit) {
            // Show waitlist section when we hit the first waitlisted player
            clone.querySelector(".event-waitlist").classList.remove("hidden");
          }
          waitList.appendChild(listItem);
        }
      });

      // Update status badge
      const isWaitList = event.eventBookings.length >= playersLimit;
      const statusText = clone.querySelector(".status-text");
      const statusBadge = clone.querySelector(".status-badge");
      const bookBtnText = clone.querySelector(".book-btn-text");

      if (isWaitList) {
        statusText.textContent = "Wait list only";
        statusBadge.classList.remove("available");
        statusBadge.classList.add("waitlist");
        bookBtnText.textContent = "Join Wait List";
      } else {
        const spotsLeft = playersLimit - event.eventBookings.length;
        statusText.textContent = `${spotsLeft} spot${spotsLeft !== 1 ? "s" : ""} available`;
        bookBtnText.textContent = "Book Event";
      }

      this.eventContainer.appendChild(clone);
    });

    // Add event listeners for booking
    this.addBookingListeners();
  }

  addBookingListeners() {
    document.querySelectorAll(".book-event-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const eventId = e.target
          .closest(".event-card")
          .querySelector(".event-id").textContent;
        await this.bookEvent(eventId);
      });
    });
  }

  async bookEvent(eventId) {
    try {
      const response = await fetch("/api/events/book", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ eventId }),
      });

      const data = await response.json();

      if (response.ok) {
        showAlert("success", "Event booked successfully!");
        // Refresh the page after a short delay to show the updated booking
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        showAlert("error", data.message || "Could not book event");
      }
    } catch (err) {
      showAlert("error", "Something went wrong. Please try again.");
    }
  }
}

// Initialize the event browser when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new EventBrowser();
});
