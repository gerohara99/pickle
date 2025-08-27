// myEvents.js - Handles my events page functionality
import { showAlert } from "./alerts.js";

class MyEvents {
  constructor() {
    // DOM Elements
    this.eventContainer = document.getElementById("event-container");
    this.noEventsMessage = document.getElementById("no-events-message");
    this.template = document.getElementById("event-card-template");

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

    // Render all events
    this.renderEvents();

    // Add event listeners
    this.addEventListeners();
  }

  renderEvents() {
    this.events.forEach((event) => {
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
        const listItem = document.createElement("li");
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

      // Show view schedule button if user is in rounds
      if (event.userInRounds) {
        clone.querySelector(".view-schedule-btn").classList.remove("hidden");
      }

      this.eventContainer.appendChild(clone);
    });
  }

  addEventListeners() {
    // View schedule buttons
    document.querySelectorAll(".view-schedule-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        // Find the event card containing this button
        const eventCard = btn.closest(".event-card");
        // Get the event ID from the hidden span
        const eventId = eventCard.querySelector(".event-id").textContent;

        if (!eventId) {
          console.error("Event ID not found");
          showAlert("error", "Error: Could not find event ID");
          return;
        }

        // Store the event ID in localStorage before navigating
        localStorage.setItem("currentEventId", eventId);

        console.log("Viewing schedule for event:", eventId);
        window.location.href = `/events/viewMasterSchedule/${eventId}`;
      });
    });

    // Cancel booking buttons
    document.querySelectorAll(".cancel-booking-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const eventId = e.target
          .closest(".event-card")
          .querySelector(".event-id").textContent;
        await this.cancelBooking(eventId);
      });
    });
  }

  async cancelBooking(eventId) {
    try {
      const response = await fetch("/api/events/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ eventId }),
      });

      const data = await response.json();

      if (response.ok) {
        showAlert("success", "Booking cancelled successfully!");
        // Refresh the page after a short delay to show the updated bookings
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        showAlert("error", data.message || "Could not cancel booking");
      }
    } catch (err) {
      showAlert("error", "Something went wrong. Please try again.");
    }
  }
}

// Initialize the my events page when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new MyEvents();
});
