/**
 * eventManager.js - Handle event management functionality
 * For admin and organizer operations on events
 */

import { showAlert } from "./alerts.js";
import { apiRequest } from "./apiActions.js";

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
    const radioButtons = document.querySelectorAll('input[name="active"]');
    radioButtons.forEach((radio) => {
      if (radio.value === this.filters.active) {
        radio.checked = true;
      }
    });

    // Set up event listeners
    this.setupEventListeners();

    // Load events
    this.loadEvents();
  }

  setupEventListeners() {
    // Filter form submission
    const filterForm = document.querySelector(".filter-form");
    if (filterForm) {
      filterForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.applyFilters();
      });
    }

    // Filter form reset
    if (filterForm) {
      filterForm.addEventListener("reset", () => {
        setTimeout(() => {
          this.resetFilters();
        }, 0);
      });
    }

    // Delete modal
    document.getElementById("confirmDelete").addEventListener("click", () => {
      this.deleteEvent();
    });

    document.getElementById("cancelDelete").addEventListener("click", () => {
      this.closeDeleteModal();
    });

    const closeBtn = document.querySelector(".modal-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        this.closeDeleteModal();
      });
    }

    // Click outside modal to close
    window.addEventListener("click", (e) => {
      if (e.target === this.deleteModal) {
        this.closeDeleteModal();
      }
    });

    // Table row actions - delegate
    if (this.eventsTableBody) {
      this.eventsTableBody.addEventListener("click", (e) => {
        const button = e.target.closest("button");
        if (!button) return;

        const row = button.closest(".table-row");
        const eventId = row.dataset.eventId;

        if (button.classList.contains("edit-event")) {
          this.editEvent(eventId);
        } else if (button.classList.contains("view-schedule")) {
          this.viewSchedule(eventId);
        } else if (button.classList.contains("delete-event")) {
          this.showDeleteConfirmation(eventId);
        }
      });
    }
  }

  async loadEvents() {
    try {
      // Construct query string
      const queryParams = new URLSearchParams();
      if (this.filters.organiser)
        queryParams.set("organiser", this.filters.organiser);
      if (this.filters.date) queryParams.set("date", this.filters.date);
      if (this.filters.active) queryParams.set("active", this.filters.active);
      queryParams.set("page", this.currentPage.toString());
      queryParams.set("limit", "10"); // Show 10 events per page

      const queryString = queryParams.toString();
      const url = `/api/v1/events?${queryString}`;

      const response = await apiRequest({
        method: "GET",
        url: url,
      });

      if (
        !response ||
        !response.data ||
        !response.data.data ||
        !response.data.data.doc
      ) {
        showAlert("error", "Failed to load events");
        return;
      }

      this.events = response.data.data.doc;
      this.totalPages = Math.ceil(response.data.results / 10) || 1;

      // Render events and pagination
      this.renderEvents();
      this.renderPagination();
    } catch (err) {
      console.error("Error loading events:", err);
      showAlert("error", "An error occurred while loading events");
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
    if (!this.eventToDelete) return;

    try {
      const response = await apiRequest({
        method: "DELETE",
        url: `/api/v1/events/${this.eventToDelete}`,
      });

      if (response && response.status === "success") {
        showAlert("success", "Event deleted successfully");
        this.closeDeleteModal();

        // Reload events
        this.loadEvents();
      } else {
        showAlert("error", response.message || "Failed to delete event");
      }
    } catch (err) {
      console.error("Error deleting event:", err);
      showAlert("error", "An error occurred while deleting the event");
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
