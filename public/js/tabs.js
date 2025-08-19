export function initTabs() {
  const tabs = document.querySelectorAll(".tab");
  const tabContents = document.querySelectorAll(".tab-content");

  if (!tabs.length) {
    console.warn("No tab elements found.");
    return;
  }
  if (!tabContents.length) {
    console.warn("No tab-content elements found.");
    return;
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", function () {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      tabContents.forEach((tc) => tc.classList.remove("active"));
      const targetId = tab.getAttribute("data-tab");
      const targetContent = document.getElementById(targetId);
      if (!targetContent) {
        console.warn(`Tab content element with id "${targetId}" not found.`);
        return;
      }
      targetContent.classList.add("active");
    });
  });
}
