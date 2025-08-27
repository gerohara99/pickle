/**
 * Role Detection Module
 * Detects user roles and applies appropriate UI visibility
 */

/**
 * Initialize role-based visibility in the UI
 * Applies data-role attribute to body based on user's role
 */
export function initRoleDetection() {
  // Check if user data is available in localStorage
  const userData = localStorage.getItem("userData");

  if (userData) {
    try {
      const user = JSON.parse(userData);

      if (user && user.role) {
        // Set role as data attribute on body
        document.body.setAttribute("data-role", user.role);
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
    }
  } else {
    // Alternatively, try to get role from API
    fetch("/api/v1/users/me")
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "success" && data.data && data.data.user) {
          const userRole = data.data.user.role;

          // Set role as data attribute on body
          document.body.setAttribute("data-role", userRole);

          // Store in localStorage for future use
          localStorage.setItem("userData", JSON.stringify(data.data.user));
        }
      })
      .catch((err) => {
        console.error("Error fetching user role:", err);
      });
  }
}

/**
 * Check if the current user has admin privileges
 * @returns {boolean} True if user is an admin
 */
export function isAdmin() {
  const role = document.body.getAttribute("data-role");
  return role === "admin" || role === "clubAdmin" || role === "pickleAdmin";
}

/**
 * Toggle visibility of admin-only elements
 * @param {boolean} show - Whether to show or hide admin elements
 */
export function toggleAdminElements(show) {
  const adminElements = document.querySelectorAll(".admin-only");

  adminElements.forEach((element) => {
    if (show) {
      element.style.display = element.tagName === "A" ? "flex" : "block";
    } else {
      element.style.display = "none";
    }
  });
}
