// browseEvents.js - Handles event browsing and booking functionality
import { renderEventBookings } from "../utils/eventCardUtils.js";
import { handleEventBooking } from "../utils/eventBookingUtils.js";
import { renderPagination } from "./utils/clientPagination.js";

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

      // Enhance search to include event organizer
      const searchFields = [
        event.eventName || "",
        event.eventLocation || "",
        event.eventOrganiser || "",
        dateString,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !searchTerm || searchFields.includes(searchTerm);

      // Upcoming filter
      const isUpcoming = !showUpcoming || eventDate >= now;

      // Available spots filter - ensure we check if event has scheduleConfiguration
      let totalSpots = 0;
      if (event.scheduleConfiguration && event.scheduleConfiguration.players) {
        totalSpots = event.scheduleConfiguration.players;
      } else if (event.doubles) {
        totalSpots = 4; // Default for doubles
      } else {
        totalSpots = 2; // Default for singles
      }

      // Check waitlist too if it exists
      let waitlistSize = event.eventWaitListSize || 0;

      // Check current bookings
      const currentBookings = Array.isArray(event.eventBookings)
        ? event.eventBookings.length
        : 0;

      // There are spots available if bookings are less than total spots + waitlist
      const hasSpots =
        !showOnlyAvailable || currentBookings < totalSpots + waitlistSize;

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
      renderEventBookings({ event, clone });
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
    await handleEventBooking({
      endpoint: "/api/events/book",
      eventId,
      successMsg: "Event booked successfully!",
      errorMsg: "Could not book event",
      reloadDelay: 1500,
    });
  }
}

// Initialize the event browser when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new EventBrowser();
});
