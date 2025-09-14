/**
 * Add click event listeners to buttons.
 * Supports both single selector/handler and config object.
 * @param {string|Object} selectorOrConfig - CSS selector or config object
 * @param {Function} [handler] - Click event handler (if using selector)
 */
export function buttonDelegateLogic(selectorOrConfig, handler) {
  if (
    typeof selectorOrConfig === "object" &&
    selectorOrConfig !== null &&
    !Array.isArray(selectorOrConfig)
  ) {
    // Config object: { selector: handler, ... }
    Object.entries(selectorOrConfig).forEach(([selector, fn]) => {
      document.querySelectorAll(selector).forEach((btn) => {
        btn.addEventListener("click", fn);
      });
    });
  } else if (
    typeof selectorOrConfig === "string" &&
    typeof handler === "function"
  ) {
    // Single selector/handler
    document.querySelectorAll(selectorOrConfig).forEach((btn) => {
      btn.addEventListener("click", handler);
    });
  } else {
    throw new Error("Invalid arguments for buttonDelegateLogic");
  }
}

/**
 * Enable or disable a button.
 * @param {HTMLElement} button - The button element
 * @param {boolean} enabled - True to enable, false to disable
 */
export function setButtonEnabled(button, enabled) {
  if (enabled) {
    button.removeAttribute("disabled");
    button.classList.remove("disabled");
  } else {
    button.setAttribute("disabled", "disabled");
    button.classList.add("disabled");
  }
}

/**
 * Set button loading state.
 * @param {HTMLElement} button - The button element
 * @param {boolean} loading - True to show loading, false to hide
 * @param {string} [loadingText="Loading..."] - Optional loading text
 */
export function setButtonLoading(button, loading, loadingText = "Loading...") {
  if (loading) {
    button.dataset.originalText = button.textContent;
    button.textContent = loadingText;
    button.setAttribute("disabled", "disabled");
    button.classList.add("loading");
  } else {
    if (button.dataset.originalText) {
      button.textContent = button.dataset.originalText;
      delete button.dataset.originalText;
    }
    button.removeAttribute("disabled");
    button.classList.remove("loading");
  }
}
