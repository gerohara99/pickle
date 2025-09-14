// utils/filterUtils.js

export function applyFilters({ filterConfig, filterState, reloadCallback }) {
  filterConfig.forEach(({ id, type }) => {
    if (type === "input" || type === "select") {
      filterState[id] = document.getElementById(id).value;
    } else if (type === "radio") {
      const radio = document.querySelector(`input[name="${id}"]:checked`);
      filterState[id] = radio ? radio.value : "";
    }
  });
  filterState.page = 1;
  const url = new URL(window.location);
  filterConfig.forEach(({ id }) => {
    url.searchParams.set(id, filterState[id]);
  });
  url.searchParams.set("page", "1");
  window.history.pushState({}, "", url);
  if (typeof reloadCallback === "function") reloadCallback();
}

export function resetFilters({ filterConfig, filterState, reloadCallback }) {
  filterConfig.forEach(({ id }) => {
    filterState[id] = "";
  });
  filterState.page = 1;
  const url = new URL(window.location);
  url.search = "";
  window.history.pushState({}, "", url);
  if (typeof reloadCallback === "function") reloadCallback();
}
