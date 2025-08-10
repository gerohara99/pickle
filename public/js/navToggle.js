export function initMobileNavToggle() {
  const mobileNavToggle = document.getElementById("mobileNavToggle");
  const mobileDrawer = document.querySelector("nav.mobile-drawer");

  if (mobileNavToggle && mobileDrawer) {
    mobileNavToggle.addEventListener("click", () => {
      mobileDrawer.classList.toggle("open");

      const iconMenu = mobileNavToggle.querySelector(".icon-menu");
      const iconClose = mobileNavToggle.querySelector(".icon-close");

      if (mobileDrawer.classList.contains("open")) {
        iconMenu.style.display = "none";
        iconClose.style.display = "inline-block";
      } else {
        iconMenu.style.display = "inline-block";
        iconClose.style.display = "none";
      }
    });
  }
}
