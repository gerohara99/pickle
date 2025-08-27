/**
 * userManager.js - Handle user management functionality
 * For admin operations on users
 */

import { showAlert } from "./alerts.js";
import { apiRequest } from "./apiActions.js";

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
    const radioButtons = document.querySelectorAll('input[name="active"]');
    radioButtons.forEach((radio) => {
      if (radio.value === this.filters.active) {
        radio.checked = true;
      }
    });

    // Set up event listeners
    this.setupEventListeners();

    // Load users
    this.loadUsers();
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
      this.deleteUser();
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
    if (this.usersTableBody) {
      this.usersTableBody.addEventListener("click", (e) => {
        const button = e.target.closest("button");
        if (!button) return;

        const row = button.closest(".table-row");
        const userId = row.dataset.userId;

        if (button.classList.contains("edit-user")) {
          this.editUser(userId);
        } else if (button.classList.contains("reset-password")) {
          this.resetPassword(userId);
        } else if (button.classList.contains("delete-user")) {
          this.showDeleteConfirmation(userId);
        }
      });
    }
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
      this.renderPagination();
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

    this.loadUsers();
  }

  applyFilters() {
    // Get filter values
    this.filters.username = document.getElementById("username").value;
    this.filters.role = document.getElementById("role").value;

    const activeRadio = document.querySelector('input[name="active"]:checked');
    this.filters.active = activeRadio ? activeRadio.value : "";

    // Reset to first page
    this.currentPage = 1;

    // Update URL with filters
    const url = new URL(window.location);
    url.searchParams.set("username", this.filters.username);
    url.searchParams.set("role", this.filters.role);
    url.searchParams.set("active", this.filters.active);
    url.searchParams.set("page", "1");
    window.history.pushState({}, "", url);

    this.loadUsers();
  }

  resetFilters() {
    // Clear filters
    this.filters.username = "";
    this.filters.role = "";
    this.filters.active = "";
    this.currentPage = 1;

    // Update URL
    const url = new URL(window.location);
    url.search = "";
    window.history.pushState({}, "", url);

    this.loadUsers();
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
