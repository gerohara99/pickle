////////////////////////////////////////////////////////////
// Sticky navigation

const sectionEl = document.querySelector(".section-list");

const obs = new IntersectionObserver(
  function (entries) {
    const ent = entries[0];
    if (!ent.isIntersecting) {
      document.body.classList.add("sticky");
    }

    if (ent.isIntersecting) {
      document.body.classList.remove("sticky");
    }
  },
  {
    // in the viewport
    root: null,
    threshold: 1, //Trigger when 0% of hero section is in the viewport
    rootMargin: "-80px", // Header height is 80px. Adjusting margin is to account for this when adding in nav
  }
);
obs.observe(sectionEl);
