/**
 * schedules.js - Handle schedule-related functionality
 * Manages master schedules and individual player schedules
 */

import { showAlert } from "./alerts.js";
import { apiRequest } from "./apiActions.js";

class ScheduleHandler {
  constructor() {
    this.eventId = null;
    this.roundsCount = 0;
    this.matches = [];
    this.filteredMatches = [];
    this.currentRound = "all";

    // DOM elements
    this.eventTitle = document.getElementById("eventTitle");
    this.eventDetails = document.getElementById("eventDetails");
    this.roundSelect = document.getElementById("roundSelect");
    this.matchesContainer = document.getElementById("matchesContainer");
    this.scoreModal = document.getElementById("scoreModal");
    this.scoreForm = document.getElementById("scoreForm");
    this.matchCardTemplate = document.getElementById("matchCardTemplate");

    // Initialize
    this.init();
  }

  init() {
    // Get event ID from URL path
    const pathParts = window.location.pathname.split("/");
    this.eventId = pathParts[pathParts.length - 1];

    if (!this.eventId) {
      showAlert("error", "Event ID not found in URL");
      return;
    }

    // Set up event listeners
    this.setupEventListeners();

    // Load event data
    this.loadEventData();
  }

  setupEventListeners() {
    // Filter form submission
    const filterForm = document.querySelector(".filter-form");
    if (filterForm) {
      filterForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.currentRound = this.roundSelect.value;
        this.filterMatches();
        this.renderMatches();
      });
    }

    // Score form submission
    if (this.scoreForm) {
      this.scoreForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.saveScore();
      });
    }

    // Close modal
    const closeBtn = document.querySelector(".modal-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        this.scoreModal.style.display = "none";
      });
    }

    // Click outside modal to close
    window.addEventListener("click", (e) => {
      if (e.target === this.scoreModal) {
        this.scoreModal.style.display = "none";
      }
    });

    // Delegate for score buttons (added dynamically)
    if (this.matchesContainer) {
      this.matchesContainer.addEventListener("click", (e) => {
        if (e.target.classList.contains("score-button")) {
          this.openScoreModal(e.target);
        }
      });
    }
  }

  async loadEventData() {
    try {
      // Fetch event details
      const eventData = await apiRequest(
        `/api/v1/events/${this.eventId}`,
        "GET"
      );

      if (!eventData || !eventData.data || !eventData.data.event) {
        showAlert("error", "Failed to load event data");
        return;
      }

      const event = eventData.data.event;

      // Set event details
      this.displayEventDetails(event);

      // Fetch matches data
      const schedulesData = await apiRequest(
        `/api/v1/events/${this.eventId}/schedules`,
        "GET"
      );

      if (
        !schedulesData ||
        !schedulesData.data ||
        !schedulesData.data.schedules
      ) {
        showAlert("error", "Failed to load schedules data");
        return;
      }

      // Process matches data
      this.processMatchesData(schedulesData.data.schedules);

      // Populate round selector
      this.populateRoundSelector();

      // Filter and display matches
      this.filterMatches();
      this.renderMatches();
    } catch (err) {
      console.error("Error loading event data:", err);
      showAlert("error", "An error occurred while loading the event data");
    }
  }

  displayEventDetails(event) {
    // Format date
    const options = {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    };
    const eventDate = new Date(event.eventDate).toLocaleDateString(
      undefined,
      options
    );

    // Set event title
    this.eventTitle.textContent = event.eventName;

    // Set event details
    const detailsText = `${eventDate} @ ${event.eventStartTime} in ${event.eventLocation}`;
    this.eventDetails.textContent = detailsText;
  }

  processMatchesData(schedulesData) {
    if (!schedulesData || !schedulesData.rounds) return;

    this.roundsCount = schedulesData.rounds.length;
    this.matches = [];

    // Process each round
    schedulesData.rounds.forEach((round, roundIndex) => {
      // Process each match in this round
      round.matches.forEach((match, matchIndex) => {
        this.matches.push({
          roundIndex,
          matchIndex,
          match,
        });
      });
    });
  }

  populateRoundSelector() {
    // Clear existing options except 'All Rounds'
    while (this.roundSelect.options.length > 1) {
      this.roundSelect.remove(1);
    }

    // Add options for each round
    for (let i = 0; i < this.roundsCount; i++) {
      const option = document.createElement("option");
      option.value = (i + 1).toString();
      option.textContent = `Round ${i + 1}`;
      this.roundSelect.appendChild(option);
    }
  }

  filterMatches() {
    if (this.currentRound === "all") {
      this.filteredMatches = [...this.matches];
    } else {
      const roundIndex = parseInt(this.currentRound, 10) - 1;
      this.filteredMatches = this.matches.filter(
        (match) => match.roundIndex === roundIndex
      );
    }
  }

  renderMatches() {
    // Clear container
    this.matchesContainer.innerHTML = "";

    if (this.filteredMatches.length === 0) {
      const noMatches = document.createElement("p");
      noMatches.className = "text-center";
      noMatches.textContent = "No matches found for this round.";
      this.matchesContainer.appendChild(noMatches);
      return;
    }

    // Create match cards
    this.filteredMatches.forEach((matchData) => {
      const matchCard = this.createMatchCard(matchData);
      this.matchesContainer.appendChild(matchCard);
    });
  }

  createMatchCard(matchData) {
    // Clone template
    const template = this.matchCardTemplate.content.cloneNode(true);
    const card = template.querySelector(".match-card");

    // Set round and court
    card.querySelector(".round-badge").textContent =
      `Round ${matchData.roundIndex + 1}`;
    card.querySelector(".court-badge").textContent =
      `Court ${matchData.match.court + 1}`;

    // Set team players
    const teamAPlayers = card.querySelector(".team-a-players");
    const teamBPlayers = card.querySelector(".team-b-players");

    matchData.match.teamA.forEach((player) => {
      const playerSpan = document.createElement("span");
      playerSpan.className = "player-name";
      playerSpan.textContent = player.name;
      teamAPlayers.appendChild(playerSpan);
    });

    matchData.match.teamB.forEach((player) => {
      const playerSpan = document.createElement("span");
      playerSpan.className = "player-name";
      playerSpan.textContent = player.name;
      teamBPlayers.appendChild(playerSpan);
    });

    // Set score
    const scoreDisplay = card.querySelector(".score-display");
    const teamAScore =
      typeof matchData.match.teamAScore === "number"
        ? matchData.match.teamAScore
        : 0;
    const teamBScore =
      typeof matchData.match.teamBScore === "number"
        ? matchData.match.teamBScore
        : 0;
    scoreDisplay.textContent = `${teamAScore} / ${teamBScore}`;

    // Set data attributes for score button
    const scoreButton = card.querySelector(".score-button");
    scoreButton.dataset.round = matchData.roundIndex;
    scoreButton.dataset.matchIndex = matchData.matchIndex;
    scoreButton.dataset.eventId = this.eventId;
    scoreButton.dataset.teamAScore = teamAScore;
    scoreButton.dataset.teamBScore = teamBScore;

    return card;
  }

  openScoreModal(button) {
    // Get data from button
    const { round, matchIndex, eventId, teamAScore, teamBScore } =
      button.dataset;

    // Find match data
    const matchData = this.matches.find(
      (m) =>
        m.roundIndex === parseInt(round, 10) &&
        m.matchIndex === parseInt(matchIndex, 10)
    );

    if (!matchData) {
      showAlert("error", "Match data not found");
      return;
    }

    // Set form values
    document.getElementById("roundIndex").value = round;
    document.getElementById("matchIndex").value = matchIndex;
    document.getElementById("eventId").value = eventId;
    document.getElementById("teamAScore").value = teamAScore;
    document.getElementById("teamBScore").value = teamBScore;

    // Display team players
    const teamAPlayersEl = document.getElementById("teamAPlayers");
    const teamBPlayersEl = document.getElementById("teamBPlayers");

    teamAPlayersEl.innerHTML = "";
    teamBPlayersEl.innerHTML = "";

    matchData.match.teamA.forEach((player) => {
      const playerDiv = document.createElement("div");
      playerDiv.className = "player-item";
      playerDiv.textContent = player.name;
      teamAPlayersEl.appendChild(playerDiv);
    });

    matchData.match.teamB.forEach((player) => {
      const playerDiv = document.createElement("div");
      playerDiv.className = "player-item";
      playerDiv.textContent = player.name;
      teamBPlayersEl.appendChild(playerDiv);
    });

    // Show modal
    this.scoreModal.style.display = "block";
  }

  async saveScore() {
    const roundIndex = document.getElementById("roundIndex").value;
    const matchIndex = document.getElementById("matchIndex").value;
    const eventId = document.getElementById("eventId").value;
    const teamAScore = document.getElementById("teamAScore").value;
    const teamBScore = document.getElementById("teamBScore").value;

    try {
      const response = await apiRequest(
        `/api/v1/events/${eventId}/scores`,
        "PATCH",
        {
          roundIndex,
          matchIndex,
          teamAScore: parseInt(teamAScore, 10),
          teamBScore: parseInt(teamBScore, 10),
        }
      );

      if (response && response.status === "success") {
        showAlert("success", "Score updated successfully");
        this.scoreModal.style.display = "none";

        // Refresh data
        this.loadEventData();
      } else {
        showAlert("error", response.message || "Failed to update score");
      }
    } catch (err) {
      console.error("Error saving score:", err);
      showAlert("error", "An error occurred while saving the score");
    }
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  // Only initialize on schedule pages
  if (
    window.location.pathname.includes("/events/viewMasterSchedule/") ||
    window.location.pathname.includes("/events/viewMySchedule/")
  ) {
    new ScheduleHandler();
  }
});

export { ScheduleHandler };
