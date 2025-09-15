// utils/filterUtils.js

export function applyFilters({
  filterConfig,
  filterState,
  reloadCallback,
  baseUrl,
}) {
  // Get filter values from form
  filterConfig.forEach((config) => {
    if (config.type === "input") {
      const element = document.getElementById(config.id);
      if (element) {
        filterState[config.id] = element.value;
      }
    } else if (config.type === "radio") {
      const selectedRadio = document.querySelector(
        `input[name="${config.id}"]:checked`
      );
      filterState[config.id] = selectedRadio ? selectedRadio.value : "";
    }
  });

  // Reset to first page
  filterState.currentPage = 1;

  // Update URL with filters
  const url = new URL(window.location);
  Object.keys(filterState).forEach((key) => {
    if (filterState[key]) {
      url.searchParams.set(key, filterState[key]);
    } else {
      url.searchParams.delete(key);
    }
  });
  url.searchParams.set("page", "1");
  window.history.pushState({}, "", url);

  // Trigger reload
  if (reloadCallback) {
    reloadCallback();
  }
}

export function resetFilters({
  filterConfig,
  filterState,
  reloadCallback,
  baseUrl,
}) {
  // Clear filter state
  filterConfig.forEach((config) => {
    filterState[config.id] = "";
  });
  filterState.currentPage = 1;

  // Clear form fields
  filterConfig.forEach((config) => {
    if (config.type === "input") {
      const element = document.getElementById(config.id);
      if (element) {
        element.value = "";
      }
    } else if (config.type === "radio") {
      const defaultRadio = document.querySelector(
        `input[name="${config.id}"][value=""]`
      );
      if (defaultRadio) {
        defaultRadio.checked = true;
      }
    }
  });

  // Update URL
  const url = new URL(window.location);
  url.search = "";
  window.history.pushState({}, "", url);

  // Trigger reload
  if (reloadCallback) {
    reloadCallback();
  }
}
