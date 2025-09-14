/**
 * eventManager.js - Handle event management functionality
 * For admin and organizer operations on events
 */

import { showAlert } from "./alerts.js";
import { apiRequest } from "./apiActions.js";
import { setRadioButtonState } from "./utils/clientSharedLogic.js";
import { renderPagination } from "./utils/paginate.js";
import { applyFilters, resetFilters } from "./utils/filterUtils.js";
import { setupCommonEventListeners } from "./utils/eventListeners.js";

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

    // Modal is hidden by default via CSS

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
      // Add a loading indicator before making the request
      this.eventsTableBody.innerHTML =
        '<tr><td colspan="6" class="text-center">Loading events...</td></tr>';

      // Construct query string
      const queryParams = new URLSearchParams();

      // Add search filters - use regex for partial matching
      if (this.filters.organiser) {
        // Add case-insensitive search by adding a special regex filter
        // This will match organiser names that contain the search term (partial match)
        queryParams.set("eventOrganiser[$regex]", this.filters.organiser);
        queryParams.set("eventOrganiser[$options]", "i"); // i for case-insensitive
      }

      if (this.filters.date) queryParams.set("eventDate", this.filters.date);
      if (this.filters.active) queryParams.set("active", this.filters.active);
      queryParams.set("page", this.currentPage.toString());
      queryParams.set("limit", "10"); // Show 10 events per page

      const queryString = queryParams.toString();

      // Force cache busting by adding a timestamp
      const cacheBuster = `&_cb=${Date.now()}`;
      const url = `/api/v1/events?${queryString}${cacheBuster}`;

      console.log("Fetching events with URL:", url);

      const response = await apiRequest({
        method: "GET",
        url: url,
      });

      console.log("Events API response:", response);

      if (
        !response ||
        !response.data ||
        !response.data.data ||
        !response.data.data.doc
      ) {
        console.error("Invalid response structure:", response);
        showAlert("error", "Failed to load events");
        return;
      }

      this.events = response.data.data.doc;
      this.totalPages = Math.ceil(response.data.results / 10) || 1;

      // Render events and pagination
      this.renderEvents();
      renderPagination(
        this.paginationContainer,
        this.currentPage,
        this.totalPages,
        (page) => this.goToPage(page)
      );

      // Log success
      console.log(`Loaded ${this.events.length} events successfully`);
    } catch (err) {
      console.error("Error loading events:", err);

      // Show a more descriptive error message based on the error type
      let errorMessage = "An error occurred while loading events";

      if (err.message && err.message.includes("Network")) {
        errorMessage = "Network error: Please check your internet connection";
      } else if (err.response) {
        // Server responded with an error status
        const status = err.response.status || "unknown";
        const message = err.response.data?.message || "Failed to load events";
        errorMessage = `Server error (${status}): ${message}`;
      }

      showAlert("error", errorMessage);

      // Show empty state in case of error
      this.eventsTableBody.innerHTML = "";
      this.events = [];
      this.renderEvents(); // This will show the empty state
    }
  }

  renderEvents() {
    // Clear container
    this.eventsTableBody.innerHTML = "";

    if (this.events.length === 0) {
      this.eventsTableBody.style.display = "none";
      this.emptyState.style.display = "block";
      return;
    }

    this.eventsTableBody.style.display = "block";
    this.emptyState.style.display = "none";

    // Create event rows
    this.events.forEach((event) => {
      const eventRow = this.createEventRow(event);
      this.eventsTableBody.appendChild(eventRow);
    });
  }

  createEventRow(event) {
    // Clone template
    const template = this.eventRowTemplate.content.cloneNode(true);
    const row = template.querySelector(".table-row");

    // Set event ID
    row.dataset.eventId = event._id;

    // Set event details
    row.querySelector(".event-name").textContent = event.eventName;
    row.querySelector(".event-organiser").textContent = event.eventOrganiser;

    // Format date
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
    row.querySelector(".event-date").textContent = eventDate;

    row.querySelector(".event-time").textContent = event.eventStartTime;

    // Set status badge
    const statusBadge = row.querySelector(".status-badge");
    if (event.active) {
      statusBadge.textContent = "Active";
      statusBadge.className = "status-badge status-badge--open";
    } else {
      statusBadge.textContent = "Inactive";
      statusBadge.className = "status-badge status-badge--full";
    }

    // Show/hide view schedule icon based on whether a schedule exists
    const viewScheduleBtn = row.querySelector(".view-schedule");
    if (viewScheduleBtn) {
      // Check if event has rounds (schedule)
      const hasSchedule = event.rounds && event.rounds.length > 0;
      viewScheduleBtn.style.display = hasSchedule ? "inline-block" : "none";
    }

    return row;
  }

  renderPagination() {
    // Clear container
    this.paginationContainer.innerHTML = "";

    if (this.totalPages <= 1) {
      return;
    }

    const paginationList = document.createElement("ul");
    paginationList.className = "pagination-list";

    // Previous button
    const prevItem = document.createElement("li");
    const prevLink = document.createElement("a");
    prevLink.href = "#";
    prevLink.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevLink.className = "pagination-link";
    if (this.currentPage === 1) {
      prevItem.className = "pagination-item disabled";
    } else {
      prevItem.className = "pagination-item";
      prevLink.addEventListener("click", (e) => {
        e.preventDefault();
        this.goToPage(this.currentPage - 1);
      });
    }
    prevItem.appendChild(prevLink);
    paginationList.appendChild(prevItem);

    // Page numbers
    const startPage = Math.max(1, this.currentPage - 2);
    const endPage = Math.min(this.totalPages, startPage + 4);

    for (let i = startPage; i <= endPage; i++) {
      const pageItem = document.createElement("li");
      pageItem.className = "pagination-item";

      const pageLink = document.createElement("a");
      pageLink.href = "#";
      pageLink.textContent = i.toString();
      pageLink.className = "pagination-link";

      if (i === this.currentPage) {
        pageLink.className += " active";
      } else {
        pageLink.addEventListener("click", (e) => {
          e.preventDefault();
          this.goToPage(i);
        });
      }

      pageItem.appendChild(pageLink);
      paginationList.appendChild(pageItem);
    }

    // Next button
    const nextItem = document.createElement("li");
    const nextLink = document.createElement("a");
    nextLink.href = "#";
    nextLink.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextLink.className = "pagination-link";
    if (this.currentPage === this.totalPages) {
      nextItem.className = "pagination-item disabled";
    } else {
      nextItem.className = "pagination-item";
      nextLink.addEventListener("click", (e) => {
        e.preventDefault();
        this.goToPage(this.currentPage + 1);
      });
    }
    nextItem.appendChild(nextLink);
    paginationList.appendChild(nextItem);

    this.paginationContainer.appendChild(paginationList);
  }

  goToPage(page) {
    this.currentPage = page;

    // Update URL with new page
    const url = new URL(window.location);
    url.searchParams.set("page", page.toString());
    window.history.pushState({}, "", url);

    this.loadEvents();
  }

  applyFilters() {
    // Get filter values
    this.filters.organiser = document.getElementById("organiser").value;
    this.filters.date = document.getElementById("date").value;

    const activeRadio = document.querySelector('input[name="active"]:checked');
    this.filters.active = activeRadio ? activeRadio.value : "";

    // Reset to first page
    this.currentPage = 1;

    // Update URL with filters
    const url = new URL(window.location);
    url.searchParams.set("organiser", this.filters.organiser);
    url.searchParams.set("date", this.filters.date);
    url.searchParams.set("active", this.filters.active);
    url.searchParams.set("page", "1");
    window.history.pushState({}, "", url);

    this.loadEvents();
  }

  resetFilters() {
    // Clear filters
    this.filters.organiser = "";
    this.filters.date = "";
    this.filters.active = "";
    this.currentPage = 1;

    // Update URL
    const url = new URL(window.location);
    url.search = "";
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
    if (!this.eventToDelete) {
      console.error("No event ID provided for deletion");
      showAlert("error", "Missing event ID. Please try again.");
      return;
    }

    // Validate the event ID before attempting to delete
    if (
      !this.eventToDelete ||
      this.eventToDelete === "null" ||
      this.eventToDelete === null
    ) {
      console.error(
        "Invalid event ID provided for deletion:",
        this.eventToDelete
      );
      showAlert("error", "Invalid event ID. Please try again.");
      this.closeDeleteModal();
      return;
    }

    try {
      // Close the modal immediately to prevent additional clicks
      this.closeDeleteModal();

      console.log("Deleting event with ID:", this.eventToDelete);

      // Make the API request using fetch for more control
      const response = await fetch(`/api/events/${this.eventToDelete}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        showAlert("success", "Event deleted successfully");

        // Wait a moment before reloading to allow the alert to be seen
        setTimeout(() => {
          // Reload events
          this.loadEvents();
        }, 1000);
      } else {
        // Try to get error details
        let errorMessage = "Error deleting event.";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          console.error("Delete response error details:", errorData);
        } catch (e) {
          // If we can't parse the JSON, use the status text
          errorMessage = `Delete failed: ${response.status} ${response.statusText}`;
          console.error("Could not parse error response:", e);
        }
        console.error("Delete response error:", errorMessage);
        showAlert("error", errorMessage);
      }
    } catch (err) {
      console.error("Error deleting event:", err);
      showAlert("error", "Error deleting event. Please try again.");
    }
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  // Only initialize on the admin events page
  if (window.location.pathname === "/events/showAll") {
    new EventManager();
  }
});

export { EventManager };
