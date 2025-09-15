/**
 * eventManager.js - Handle event management functionality
 * For admin and organizer operations on events
 */

import { showAlert } from "./alerts.js";
import { apiRequest } from "./apiActions.js";
import { setRadioButtonState } from "./utils/clientSharedLogic.js";
import { renderPagination } from "./utils/clientPagination.js";
import { applyFilters, resetFilters } from "./utils/filterUtils.js";
import { setupCommonEventListeners } from "./utils/eventListeners.js";
import { formatEventDate } from "./utils/dateUtils.js";
import { createLoadingState } from "./utils/errorHandler.js";
import { validateEventId } from "./utils/formValidation.js";

class EventManager {
  constructor() {
    // DOM elements
    this.eventsTableBody = document.getElementById("eventsTableBody");
    this.paginationContainer = document.getElementById("pagination");
    this.emptyState = document.getElementById("emptyState");
    this.deleteModal = document.getElementById("deleteModal");
    this.eventRowTemplate = document.getElementById("eventRowTemplate");

    // State
    this.events = [];
    this.currentPage = 1;
    this.totalPages = 1;
    this.filters = {
      organiser: "",
      date: "",
      active: "",
    };
    this.eventToDelete = null;

    // Initialize
    this.init();
  }

  init() {
    // Get URL parameters for filters
    const urlParams = new URLSearchParams(window.location.search);
    this.filters.organiser = urlParams.get("organiser") || "";
    this.filters.date = urlParams.get("date") || "";
    this.filters.active = urlParams.get("active") || "";
    this.currentPage = parseInt(urlParams.get("page") || "1", 10);

    // Set form values from URL parameters
    document.getElementById("organiser").value = this.filters.organiser;
    document.getElementById("date").value = this.filters.date;

    // Set radio button state
    setRadioButtonState(this.filters.active);

    // Set up event listeners
    this.setupEventListeners();

    // Load events
    this.loadEvents();
  }

  setupEventListeners() {
    setupCommonEventListeners({
      filterForm: document.querySelector(".filter-form"),
      onFilterSubmit: () =>
        applyFilters({
          filterConfig: [
            { id: "organiser", type: "input" },
            { id: "date", type: "input" },
            { id: "active", type: "radio" },
          ],
          filterState: this.filters,
          reloadCallback: () => this.loadEvents(),
          baseUrl: "/events/showAll",
        }),
      onFilterReset: () =>
        resetFilters({
          filterConfig: [
            { id: "organiser", type: "input" },
            { id: "date", type: "input" },
            { id: "active", type: "radio" },
          ],
          filterState: this.filters,
          reloadCallback: () => this.loadEvents(),
          baseUrl: "/events/showAll",
        }),
      deleteModal: this.deleteModal,
      onConfirmDelete: () => this.deleteEvent(),
      onCancelDelete: () => this.closeDeleteModal(),
      onCloseModal: () => this.closeDeleteModal(),
      tableBody: this.eventsTableBody,
      rowActionHandler: (button, row) => {
        const eventId = row.dataset.eventId;
        if (button.classList.contains("edit-event")) {
          this.editEvent(eventId);
        } else if (button.classList.contains("view-schedule")) {
          this.viewSchedule(eventId);
        } else if (button.classList.contains("delete-event")) {
          this.showDeleteConfirmation(eventId);
        }
      },
    });
  }

  async loadEvents() {
    try {
      // Use centralized loading state
      createLoadingState(this.eventsTableBody);

      // Construct query string
      const queryParams = new URLSearchParams();

      if (this.filters.organiser) {
        queryParams.set("eventOrganiser[$regex]", this.filters.organiser);
        queryParams.set("eventOrganiser[$options]", "i");
      }

      if (this.filters.date) queryParams.set("eventDate", this.filters.date);
      if (this.filters.active) queryParams.set("active", this.filters.active);
      queryParams.set("page", this.currentPage.toString());
      queryParams.set("limit", "10");

      const queryString = queryParams.toString();
      const cacheBuster = `&_cb=${Date.now()}`;
      const url = `/api/v1/events?${queryString}${cacheBuster}`;

      const response = await apiRequest({
        method: "GET",
        url: url,
      });

      if (!response?.data?.data?.doc) {
        console.error("Invalid response structure:", response);
        showAlert("error", "Failed to load events");
        return;
      }

      this.events = response.data.data.doc;
      this.totalPages = Math.ceil(response.data.results / 10) || 1;

      this.renderEvents();
      renderPagination(
        this.paginationContainer,
        this.currentPage,
        this.totalPages,
        (page) => this.goToPage(page)
      );
    } catch (err) {
      console.error("Error loading events:", err);
      showAlert("error", "An error occurred while loading events");
      this.eventsTableBody.innerHTML = "";
      this.events = [];
      this.renderEvents();
    }
  }

  renderEvents() {
    this.eventsTableBody.innerHTML = "";

    if (this.events.length === 0) {
      this.eventsTableBody.style.display = "none";
      this.emptyState.style.display = "block";
      return;
    }

    this.eventsTableBody.style.display = "block";
    this.emptyState.style.display = "none";

    this.events.forEach((event) => {
      const eventRow = this.createEventRow(event);
      this.eventsTableBody.appendChild(eventRow);
    });
  }

  createEventRow(event) {
    const template = this.eventRowTemplate.content.cloneNode(true);
    const row = template.querySelector(".table-row");

    row.dataset.eventId = event._id;
    row.querySelector(".event-name").textContent = event.eventName;
    row.querySelector(".event-organiser").textContent = event.eventOrganiser;
    row.querySelector(".event-date").textContent = formatEventDate(
      event.eventDate
    );
    row.querySelector(".event-time").textContent = event.eventStartTime;

    const statusBadge = row.querySelector(".status-badge");
    if (event.active) {
      statusBadge.textContent = "Active";
      statusBadge.className = "status-badge status-badge--open";
    } else {
      statusBadge.textContent = "Inactive";
      statusBadge.className = "status-badge status-badge--full";
    }

    const viewScheduleBtn = row.querySelector(".view-schedule");
    if (viewScheduleBtn) {
      const hasSchedule = event.rounds && event.rounds.length > 0;
      viewScheduleBtn.style.display = hasSchedule ? "inline-block" : "none";
    }

    return row;
  }

  goToPage(page) {
    this.currentPage = page;
    const url = new URL(window.location);
    url.searchParams.set("page", page.toString());
    window.history.pushState({}, "", url);
    this.loadEvents();
  }

  editEvent(eventId) {
    window.location.href = `/events/get/${eventId}`;
  }

  viewSchedule(eventId) {
    window.location.href = `/events/viewMasterSchedule/${eventId}`;
  }

  showDeleteConfirmation(eventId) {
    this.eventToDelete = eventId;
    this.deleteModal.classList.add("show");
  }

  closeDeleteModal() {
    this.deleteModal.classList.remove("show");
    this.eventToDelete = null;
  }

  async deleteEvent() {
    if (!validateEventId(this.eventToDelete, "deletion")) {
      showAlert("error", "Invalid event ID. Please try again.");
      this.closeDeleteModal();
      return;
    }

    try {
      this.closeDeleteModal();

      await apiRequest({
        method: "DELETE",
        url: `/api/v1/events/${this.eventToDelete}`,
        successMessage: "Event deleted successfully",
      });

      setTimeout(() => {
        this.loadEvents();
      }, 1000);
    } catch (err) {
      console.error("Error deleting event:", err);
      showAlert("error", "Error deleting event. Please try again.");
    }
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  if (window.location.pathname === "/events/showAll") {
    new EventManager();
  }
});

export { EventManager };
