/**
 * Template Data Utility
 *
 * This utility provides helper functions for working with the templateData
 * injected by the server into HTML pages.
 */

/**
 * Get the template data injected by the server
 * @returns {Object} The template data object
 */
export function getTemplateData() {
  return window.templateData || {};
}

/**
 * Get a specific value from the template data
 * @param {string} key - The key to retrieve
 * @param {*} defaultValue - Default value if the key doesn't exist
 * @returns {*} The value or default value
 */
export function getTemplateValue(key, defaultValue = null) {
  const data = getTemplateData();
  return data[key] !== undefined ? data[key] : defaultValue;
}

/**
 * Get the current user from template data
 * @returns {Object|null} The user object or null
 */
export function getCurrentUser() {
  return getTemplateValue("user", null);
}

/**
 * Get the user role from template data
 * @returns {string|null} The user role or null
 */
export function getUserRole() {
  return getTemplateValue("userRole", null);
}

/**
 * Check if the current user has a specific role
 * @param {string|Array} roles - Role or array of roles to check
 * @returns {boolean} True if the user has any of the specified roles
 */
export function hasRole(roles) {
  const userRole = getUserRole();
  if (!userRole) return false;

  if (Array.isArray(roles)) {
    return roles.includes(userRole);
  }

  return userRole === roles;
}

/**
 * Check if a user is logged in
 * @returns {boolean} True if a user is logged in
 */
export function isLoggedIn() {
  return !!getCurrentUser();
}

/**
 * Get pagination data from template data
 * @returns {Object|null} The pagination object or null
 */
export function getPagination() {
  return getTemplateValue("pagination", null);
}

/**
 * Get filters from template data
 * @returns {Object|null} The filters object or null
 */
export function getFilters() {
  return getTemplateValue("filters", {});
}

/**
 * Apply filters to a URL
 * @param {string} baseUrl - The base URL
 * @param {Object} filters - The filters to apply
 * @returns {string} URL with filters as query parameters
 */
export function applyFiltersToUrl(baseUrl, filters = null) {
  const filtersToUse = filters || getFilters();
  if (!filtersToUse || Object.keys(filtersToUse).length === 0) {
    return baseUrl;
  }

  const url = new URL(baseUrl, window.location.origin);

  Object.entries(filtersToUse).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
}

export default {
  getTemplateData,
  getTemplateValue,
  getCurrentUser,
  getUserRole,
  hasRole,
  isLoggedIn,
  getPagination,
  getFilters,
  applyFiltersToUrl,
};
