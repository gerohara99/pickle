/**
 * Role Detection Module - Simplified
 * Detects user roles and sets the appropriate data attributes
 */

/**
 * Initialize role detection - sets data-role attribute on body
 */
export function initRoleDetection() {
  // Try to get role from three possible sources in order of priority
  const role =
    getRoleFromTemplate() || getRoleFromLocalStorage() || getRoleFromAPI();

  // If we got a role synchronously, apply it now
  if (role) {
    applyRole(role);
  }
}

/**
 * Try to get role from template
 * @returns {string|null} Normalized role or null
 */
function getRoleFromTemplate() {
  const templateRole = document.getElementById("templateUserRole");
  if (templateRole && templateRole.value) {
    return templateRole.value.toLowerCase();
  }
  return null;
}

/**
 * Try to get role from localStorage
 * @returns {string|null} Normalized role or null
 */
function getRoleFromLocalStorage() {
  try {
    const userData = localStorage.getItem("userData");
    if (userData) {
      const user = JSON.parse(userData);
      if (user && user.role) {
        return user.role.toLowerCase();
      }
    }
  } catch (error) {
    console.error("Error reading localStorage:", error);
  }
  return null;
}

/**
 * Try to get role from API (asynchronous)
 * @returns {null} Always returns null (role is applied asynchronously)
 */
function getRoleFromAPI() {
  fetch("/api/v1/users/me")
    .then((response) => response.json())
    .then((data) => {
      if (data.status === "success" && data.data && data.data.user) {
        const role = data.data.user.role.toLowerCase();

        // Store in localStorage for future visits
        try {
          const userData = localStorage.getItem("userData");
          const userObj = userData ? JSON.parse(userData) : {};
          userObj.role = role;
          localStorage.setItem("userData", JSON.stringify(userObj));
        } catch (error) {
          console.error("Error updating localStorage:", error);
        }

        // Apply the role
        applyRole(role);
      }
    })
    .catch((err) => {
      console.error("Error fetching user role:", err);
    });

  return null;
}

/**
 * Apply role to document and trigger navigation loading
 * @param {string} role - The normalized role
 */
function applyRole(role) {
  // Set role attributes on body
  document.body.setAttribute("data-role", role);
  document.body.setAttribute("data-user-role", role);
  document.body.setAttribute(
    "data-is-admin",
    isAdminRole(role) ? "true" : "false"
  );

  // Add role classes
  document.body.classList.remove("role-user", "role-admin", "role-clubadmin");

  if (isAdminRole(role)) {
    document.body.classList.add("role-admin");
    if (role === "clubadmin") {
      document.body.classList.add("role-clubadmin");
    }
  } else if (role === "user") {
    document.body.classList.add("role-user");
  }

  // Trigger navigation loading
  loadNavigationForRole(role);
}

/**
 * Check if a role is an admin role
 * @param {string} role - The role to check
 * @returns {boolean} True if admin role
 */
function isAdminRole(role) {
  const result =
    role === "admin" ||
    role === "clubadmin" ||
    role === "pickleadmin" ||
    role.includes("admin");

  return result;
}

/**
 * Load the appropriate navigation for a role
 * @param {string} role - The user role
 */
function loadNavigationForRole(role) {
  const navContainer = document.querySelector("nav");
  if (!navContainer) {
    console.error("No navigation container found!");
    return;
  }

  let navFile = "/includes/navLoggedOut.html"; // Default

  if (role && role !== "guest") {
    if (isAdminRole(role)) {
      navFile = "/includes/navLoggedInAsAdmin.html";
    } else {
      navFile = "/includes/navLoggedInAsUser.html";
    }
  }

  // Load the appropriate navigation
  fetch(navFile)
    .then((response) => {
      if (!response.ok) {
        console.error(
          `Navigation fetch failed with status: ${response.status}`
        );
        throw new Error(`Failed to load navigation: ${response.status}`);
      }
      return response.text();
    })
    .then((html) => {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = html;

      const newNav = tempDiv.querySelector("nav");
      if (!newNav) {
        console.error("No nav element found in loaded navigation file!");
        return;
      }

      // Replace navigation content
      navContainer.innerHTML = newNav.innerHTML;

      // Setup event handlers
      setupNavigationHandlers();
    })
    .catch((error) => {
      console.error("Error loading navigation:", error);
    });
}

/**
 * Set up event handlers for navigation elements
 */
function setupNavigationHandlers() {
  // Set up logout button
  const logoutButton = document.querySelector("#logoutButton");
  if (logoutButton) {
    logoutButton.addEventListener("click", function (e) {
      e.preventDefault();
      fetch("/api/v1/users/logout", { method: "GET" })
        .then(() => {
          window.location.href = "/";
        })
        .catch((err) => {
          console.error("Logout error:", err);
        });
    });
  }

  // Set up settings toggle
  const settingsToggle = document.querySelector(".settings-toggle");
  const settingsDropdown = document.querySelector(".settings-dropdown");
  if (settingsToggle && settingsDropdown) {
    settingsToggle.addEventListener("click", function (e) {
      e.preventDefault();
      settingsDropdown.style.display =
        settingsDropdown.style.display === "block" ? "none" : "block";
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", function (e) {
      if (
        settingsToggle &&
        !settingsToggle.contains(e.target) &&
        settingsDropdown &&
        !settingsDropdown.contains(e.target)
      ) {
        settingsDropdown.style.display = "none";
      }
    });
  }
}

/**
 * Check if the current user has admin privileges
 * @returns {boolean} True if user is an admin
 */
export function isAdmin() {
  const role = document.body.getAttribute("data-role");
  if (!role) return false;
  return isAdminRole(role);
}

/**
 * Clean up any duplicate navigation elements
 */
function cleanupDuplicateNavigation() {
  // First, identify if we have multiple navigation sections
  const navElements = document.querySelectorAll("nav");

  if (navElements.length <= 1) {
    // No duplicates, no need to clean up
    return;
  }

  // Keep only the first navigation element, remove others
  for (let i = 1; i < navElements.length; i++) {
    navElements[i].remove();
  }

  // Also check for duplicate mobile elements
  const mobileHeaders = document.querySelectorAll(".mobile-nav-header");
  const mobileDrawers = document.querySelectorAll(".mobile-drawer");

  for (let i = 1; i < mobileHeaders.length; i++) {
    mobileHeaders[i].remove();
  }

  for (let i = 1; i < mobileDrawers.length; i++) {
    mobileDrawers[i].remove();
  }
}

/**
 * Add global diagnostic function
 * Can be called from console for debugging
 */
export function debugRoleDetection() {
  // Check for duplicate navigation
  const navElements = document.querySelectorAll("nav");
  if (navElements.length > 1) {
    console.warn(`Warning: Found ${navElements.length} nav elements!`);
    cleanupDuplicateNavigation();
  }

  console.groupEnd();
  return "Debug completed. Check console for results.";
}

// Make functions available globally for console access
if (typeof window !== "undefined") {
  window.isAdmin = isAdmin;
  window.debugRoleDetection = debugRoleDetection;

  // Add listener for DOM loaded to handle cases where the page might load after our script
  window.addEventListener("DOMContentLoaded", () => {
    // Check if we already have a role but navigation hasn't been loaded
    const role = document.body.getAttribute("data-role");
    if (role) {
      loadNavigationForRole(role);
    }
  });

  // Add load event to check for duplicate nav elements
  window.addEventListener("load", () => {
    setTimeout(() => {
      const navElements = document.querySelectorAll("nav");
      if (navElements.length > 1) {
        console.warn(
          `Found ${navElements.length} nav elements after load, cleaning up`
        );
        cleanupDuplicateNavigation();
      }

      // Ensure admin visibility
      const role = document.body.getAttribute("data-role");
      if (role && isAdminRole(role)) {
        document.querySelectorAll(".admin-only").forEach((el) => {
          el.style.display = el.tagName === "A" ? "inline-block" : "block";
        });
      }
    }, 500);
  });
}

// Export for use in other modules
export default {
  initRoleDetection,
  isAdmin,
  debugRoleDetection,
};
