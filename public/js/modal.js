export function initScoreModal(eventUpdateMatchScorePubJs) {
  const modal = document.getElementById("scoreModal");
  const scoreForm = document.getElementById("scoreForm");
  const closeButton = modal ? modal.querySelector(".close") : null;
  const scoreButtons = document.querySelectorAll(".score-button");

  if (scoreButtons && modal) {
    scoreButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        modal.style.display = "block";
        const round = btn.dataset.round;
        const matchIndex = btn.dataset.matchindex;
        const eventId = btn.dataset.eventid;

        document.getElementById("roundIndex").value = round;
        document.getElementById("matchIndex").value = matchIndex;
        document.getElementById("eventId").value = eventId;
      });
    });
  }

  if (closeButton && modal) {
    closeButton.addEventListener("click", () => {
      modal.style.display = "none";
    });
  }

  if (scoreForm) {
    scoreForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        await eventUpdateMatchScorePubJs(
          document.getElementById("roundIndex").value,
          document.getElementById("matchIndex").value,
          document.getElementById("teamAScore").value,
          document.getElementById("teamBScore").value,
          document.getElementById("eventId").value
        );
        modal.style.display = "none";
      } catch (err) {
        console.error("Update match score failed:", err);
      }
    });
  }
}
