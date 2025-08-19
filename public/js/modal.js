export function initScoreModal(eventUpdateMatchScorePubJs) {
  const modal = document.getElementById("scoreModal");
  const scoreForm = document.getElementById("scoreForm");
  const closeButton = modal ? modal.querySelector(".close") : null;
  const scoreButtons = document.querySelectorAll(".score-button");

  // Helper to show user-friendly error
  function showError(message) {
    alert(message); // Replace with custom UI if desired
  }

  if (scoreButtons && modal) {
    scoreButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        modal.style.display = "block";
        const round = btn.dataset.round;
        const matchIndex = btn.dataset.matchindex;
        const eventId = btn.dataset.eventid;
        const teamAScore = btn.dataset.teamaScore;
        const teamBScore = btn.dataset.teambScore;

        document.getElementById("roundIndex").value = Number(round);
        document.getElementById("matchIndex").value = Number(matchIndex);
        document.getElementById("eventId").value = eventId;
        document.getElementById("teamAScore").value =
          teamAScore && teamAScore !== "undefined" ? teamAScore : "";
        document.getElementById("teamBScore").value =
          teamBScore && teamBScore !== "undefined" ? teamBScore : "";
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
      const submitBtn = scoreForm.querySelector("button[type='submit']");
      if (submitBtn) submitBtn.disabled = true;
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
        showError("Failed to update score. Please try again.");
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }
}
