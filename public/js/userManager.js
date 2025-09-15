/**
 * userManager.js - Handle user management functionality
 * For admin operations on users
 */

import { showAlert } from "./alerts.js";
import { apiRequest } from "./apiActions.js";
import {
  setRadioButtonState,
  goToPage,
} from "../public/js/utils/clientSharedLogic.js";
import { renderPagination } from "./utils/clientPagination.js";
import { setupCommonEventListeners } from "../public/js/utils/eventListeners.js";
import { applyFilters, resetFilters } from "../public/js/utils/filterUtils.js";

class UserManager {
  constructor() {
    // DOM elements
    this.usersTableBody = document.getElementById("usersTableBody");
    this.paginationContainer = document.getElementById("pagination");
    this.emptyState = document.getElementById("emptyState");
    this.deleteModal = document.getElementById("deleteModal");
    this.userRowTemplate = document.getElementById("userRowTemplate");

    // State
    this.users = [];
    this.currentPage = 1;
    this.totalPages = 1;
    this.filters = {
      username: "",
      role: "",
      active: "",
    };
    this.userToDelete = null;

    // Initialize
    this.init();
  }

  init() {
    // Get URL parameters for filters
    const urlParams = new URLSearchParams(window.location.search);
    this.filters.username = urlParams.get("username") || "";
    this.filters.role = urlParams.get("role") || "";
    this.filters.active = urlParams.get("active") || "";
    this.currentPage = parseInt(urlParams.get("page") || "1", 10);

    // Set form values from URL parameters
    document.getElementById("username").value = this.filters.username;

    // Set select value
    const roleSelect = document.getElementById("role");
    if (roleSelect) {
      for (let i = 0; i < roleSelect.options.length; i++) {
        if (roleSelect.options[i].value === this.filters.role) {
          roleSelect.selectedIndex = i;
          break;
        }
      }
    }

    // Set radio button state
    setRadioButtonState(this.filters.active);

    // Set up event listeners
    this.setupEventListeners();

    // Load users
    this.loadUsers();
  }

  setupEventListeners() {
    setupCommonEventListeners({
      filterForm: document.querySelector(".filter-form"),
      onFilterSubmit: () =>
        applyFilters({
          filterConfig: [
            { id: "username", type: "input" },
            { id: "role", type: "select" },
            { id: "active", type: "radio" },
          ],
          filterState: this.filters,
          reloadCallback: () => this.loadUsers(),
          baseUrl: "/users/showAll",
        }),
      onFilterReset: () =>
        resetFilters({
          filterConfig: [
            { id: "username", type: "input" },
            { id: "role", type: "select" },
            { id: "active", type: "radio" },
          ],
          filterState: this.filters,
          reloadCallback: () => this.loadUsers(),
          baseUrl: "/users/showAll",
        }),
      deleteModal: this.deleteModal,
      onConfirmDelete: () => this.deleteUser(),
      onCancelDelete: () => this.closeDeleteModal(),
      onCloseModal: () => this.closeDeleteModal(),
      tableBody: this.usersTableBody,
      rowActionHandler: (button, row) => {
        const userId = row.dataset.userId;
        if (button.classList.contains("edit-user")) {
          this.editUser(userId);
        } else if (button.classList.contains("reset-password")) {
          this.resetPassword(userId);
        } else if (button.classList.contains("delete-user")) {
          this.showDeleteConfirmation(userId);
        }
      },
    });
  }

  async loadUsers() {
    try {
      // Construct query string
      const queryParams = new URLSearchParams();
      if (this.filters.username)
        queryParams.set("username", this.filters.username);
      if (this.filters.role) queryParams.set("role", this.filters.role);
      if (this.filters.active) queryParams.set("active", this.filters.active);
      queryParams.set("page", this.currentPage.toString());
      queryParams.set("limit", "10"); // Show 10 users per page

      const queryString = queryParams.toString();
      const url = `/api/v1/users?${queryString}`;

      const response = await apiRequest(url, "GET");

      if (!response || !response.data || !response.data.users) {
        showAlert("error", "Failed to load users");
        return;
      }

      this.users = response.data.users;
      this.totalPages = response.totalPages || 1;

      // Render users and pagination
      this.renderUsers();
      renderPagination(
        this.paginationContainer,
        this.currentPage,
        this.totalPages,
        (page) => this.goToPage(page)
      );
    } catch (err) {
      console.error("Error loading users:", err);
      showAlert("error", "An error occurred while loading users");
    }
  }

  renderUsers() {
    // Clear container
    this.usersTableBody.innerHTML = "";

    if (this.users.length === 0) {
      this.usersTableBody.style.display = "none";
      this.emptyState.style.display = "block";
      return;
    }

    this.usersTableBody.style.display = "block";
    this.emptyState.style.display = "none";

    // Create user rows
    this.users.forEach((user) => {
      const userRow = this.createUserRow(user);
      this.usersTableBody.appendChild(userRow);
    });
  }

  createUserRow(user) {
    // Clone template
    const template = this.userRowTemplate.content.cloneNode(true);
    const row = template.querySelector(".table-row");

    // Set user ID
    row.dataset.userId = user._id;

    // Set user details
    row.querySelector(".user-name").textContent = user.name;
    row.querySelector(".user-email").textContent = user.email;

    // Set role badge
    const roleBadge = row.querySelector(".role-badge");
    roleBadge.textContent = user.role;

    if (user.role === "admin") {
      roleBadge.className = "role-badge role-badge--admin";
    } else if (user.role === "guide") {
      roleBadge.className = "role-badge role-badge--guide";
    } else {
      roleBadge.className = "role-badge role-badge--user";
    }

    // Set status badge
    const statusBadge = row.querySelector(".status-badge");
    if (user.active) {
      statusBadge.textContent = "Active";
      statusBadge.className = "status-badge status-badge--open";
    } else {
      statusBadge.textContent = "Inactive";
      statusBadge.className = "status-badge status-badge--full";
    }

    return row;
  }

  goToPage(page) {
    this.currentPage = page;
    goToPage(page, () => this.loadUsers());
  }

  editUser(userId) {
    window.location.href = `/users/get/${userId}`;
  }

  async resetPassword(userId) {
    try {
      const response = await apiRequest(
        `/api/v1/users/${userId}/resetPassword`,
        "POST"
      );

      if (response && response.status === "success") {
        showAlert("success", "Password reset email sent successfully");
      } else {
        showAlert("error", response.message || "Failed to reset password");
      }
    } catch (err) {
      console.error("Error resetting password:", err);
      showAlert("error", "An error occurred while resetting password");
    }
  }

  showDeleteConfirmation(userId) {
    this.userToDelete = userId;
    this.deleteModal.style.display = "block";
  }

  closeDeleteModal() {
    this.deleteModal.style.display = "none";
    this.userToDelete = null;
  }

  async deleteUser() {
    if (!this.userToDelete) return;

    try {
      const response = await apiRequest(
        `/api/v1/users/${this.userToDelete}`,
        "DELETE"
      );

      if (response && response.status === "success") {
        showAlert("success", "User deleted successfully");
        this.closeDeleteModal();

        // Reload users
        this.loadUsers();
      } else {
        showAlert("error", response.message || "Failed to delete user");
      }
    } catch (err) {
      console.error("Error deleting user:", err);
      showAlert("error", "An error occurred while deleting the user");
    }
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  // Only initialize on the admin users page
  if (window.location.pathname === "/users/showAll") {
    new UserManager();
  }
});

export { UserManager };
