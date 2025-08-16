export function initTabs() {
  const tabs = document.querySelectorAll(".tab");
  const tabContents = document.querySelectorAll(".tab-content");
  if (tabs.length && tabContents.length) {
    tabs.forEach((tab) => {
      tab.addEventListener("click", function () {
        tabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        tabContents.forEach((tc) => tc.classList.remove("active"));
        const targetId = tab.getAttribute("data-tab");
        const targetContent = document.getElementById(targetId);
        if (targetContent) targetContent.classList.add("active");
      });
    });
  }
}
