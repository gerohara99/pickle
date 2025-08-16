export function initMobileNavToggle() {
  const mobileNavToggle = document.getElementById("mobileNavToggle");
  const mobileDrawer = document.querySelector(".mobile-drawer");
  const iconMenu = document.querySelector(".icon-menu");
  const iconClose = document.querySelector(".icon-close");

  if (mobileNavToggle && mobileDrawer) {
    mobileNavToggle.addEventListener("click", () => {
      mobileDrawer.classList.toggle("open");
      // Toggle icons
      if (mobileDrawer.classList.contains("open")) {
        iconMenu.style.display = "none";
        iconClose.style.display = "inline";
      } else {
        iconMenu.style.display = "inline";
        iconClose.style.display = "none";
      }
    });
  }
}
