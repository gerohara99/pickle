export function initMobileNavToggle() {
  const mobileNavToggle = document.getElementById("mobileNavToggle");
  const mobileDrawer = document.querySelector(".mobile-drawer");
  const iconMenu = document.querySelector(".icon-menu");
  const iconClose = document.querySelector(".icon-close");

  // Error handling for missing DOM elements
  if (!mobileNavToggle) {
    console.warn("Mobile nav toggle button not found.");
    return;
  }
  if (!mobileDrawer) {
    console.warn("Mobile drawer element not found.");
    return;
  }
  if (!iconMenu) {
    console.warn("Menu icon not found.");
  }
  if (!iconClose) {
    console.warn("Close icon not found.");
  }

  mobileNavToggle.addEventListener("click", () => {
    mobileDrawer.classList.toggle("open");
    // Toggle icons
    if (iconMenu && iconClose) {
      if (mobileDrawer.classList.contains("open")) {
        iconMenu.style.display = "none";
        iconClose.style.display = "inline";
      } else {
        iconMenu.style.display = "inline";
        iconClose.style.display = "none";
      }
    }
  });
}
