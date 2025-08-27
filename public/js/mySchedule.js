/**
 * mySchedule.js - Handle player-specific schedule functionality
 * Extends the base schedule functionality for a player's personal schedule
 */

import { showAlert } from "./alerts.js";
import { apiRequest } from "./apiActions.js";
import { ScheduleHandler } from "./schedules.js";

class MyScheduleHandler extends ScheduleHandler {
  constructor() {
    super();

    // Additional properties
    this.userId = null;
    this.restingRounds = [];
    this.playerTeam = null;

    // Additional DOM elements
    this.restingInfo = document.getElementById("restingInfo");
    this.myMatchesContainer = document.getElementById("myMatchesContainer");
    this.noMatchesMessage = document.getElementById("noMatchesMessage");
    this.myMatchCardTemplate = document.getElementById("myMatchCardTemplate");

    // Get user ID
    this.getUserId();
  }

  async getUserId() {
    try {
      const userData = await apiRequest("/api/v1/users/me", "GET");
      if (userData && userData.data && userData.data.user) {
        this.userId = userData.data.user._id;
      } else {
        showAlert("error", "Failed to get user data");
      }
    } catch (err) {
      console.error("Error getting user data:", err);
      showAlert("error", "An error occurred while getting user data");
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

      // Fetch player's schedule
      const myScheduleData = await apiRequest(
        `/api/v1/events/${this.eventId}/mySchedule`,
        "GET"
      );

      if (!myScheduleData || !myScheduleData.data) {
        showAlert("error", "Failed to load your schedule data");
        return;
      }

      // Process player's schedule data
      this.processMyScheduleData(myScheduleData.data);

      // Display resting info
      this.displayRestingInfo();

      // Render player's matches
      this.renderMyMatches();
    } catch (err) {
      console.error("Error loading schedule data:", err);
      showAlert("error", "An error occurred while loading your schedule data");
    }
  }

  processMyScheduleData(scheduleData) {
    // Reset data
    this.matches = [];
    this.restingRounds = scheduleData.restingRounds || [];

    // Process matches
    if (scheduleData.matches && scheduleData.matches.length > 0) {
      scheduleData.matches.forEach((matchData) => {
        this.matches.push({
          roundIndex: matchData.round,
          matchIndex: matchData.matchIndex,
          match: matchData.match,
          playerTeam: matchData.playerTeam,
        });
      });
    }
  }

  displayRestingInfo() {
    if (this.restingRounds && this.restingRounds.length > 0) {
      // Display resting rounds info
      this.restingInfo.innerHTML = `
        You will be resting in round(s): 
        <span class="resting-rounds">${this.restingRounds.map((r) => r + 1).join(", ")}</span>
      `;
    } else {
      // Player plays in all rounds
      this.restingInfo.textContent = "You are playing in every round.";
    }
  }

  renderMyMatches() {
    // Clear container
    this.myMatchesContainer.innerHTML = "";

    if (this.matches.length === 0) {
      // Show no matches message
      this.noMatchesMessage.style.display = "block";
      return;
    }

    // Hide no matches message
    this.noMatchesMessage.style.display = "none";

    // Sort matches by round
    const sortedMatches = [...this.matches].sort(
      (a, b) => a.roundIndex - b.roundIndex
    );

    // Create match cards
    sortedMatches.forEach((matchData) => {
      const matchCard = this.createMyMatchCard(matchData);
      this.myMatchesContainer.appendChild(matchCard);
    });
  }

  createMyMatchCard(matchData) {
    // Clone template
    const template = this.myMatchCardTemplate.content.cloneNode(true);
    const card = template.querySelector(".match-card");

    // Set round and court
    card.querySelector(".round-badge").textContent =
      `Round ${matchData.roundIndex + 1}`;
    card.querySelector(".court-badge").textContent =
      `Court ${matchData.match.court + 1}`;

    // Determine teams
    const myTeam = matchData.playerTeam;
    const opposingTeam = myTeam === "teamA" ? "teamB" : "teamA";

    // Set team players
    const myTeamPlayers = card.querySelector(".my-team-players");
    const opposingTeamPlayers = card.querySelector(".opposing-team-players");

    matchData.match[myTeam].forEach((player) => {
      const playerSpan = document.createElement("span");
      playerSpan.className = "player-name";
      playerSpan.textContent = player.name;
      myTeamPlayers.appendChild(playerSpan);
    });

    matchData.match[opposingTeam].forEach((player) => {
      const playerSpan = document.createElement("span");
      playerSpan.className = "player-name";
      playerSpan.textContent = player.name;
      opposingTeamPlayers.appendChild(playerSpan);
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

    // Display score in the correct order based on player's team
    if (myTeam === "teamA") {
      scoreDisplay.textContent = `${teamAScore} / ${teamBScore}`;
    } else {
      scoreDisplay.textContent = `${teamBScore} / ${teamAScore}`;
    }

    // Set data attributes for score button
    const scoreButton = card.querySelector(".score-button");
    scoreButton.dataset.round = matchData.roundIndex;
    scoreButton.dataset.matchIndex = matchData.matchIndex;
    scoreButton.dataset.eventId = this.eventId;
    scoreButton.dataset.myTeam = myTeam;
    scoreButton.dataset.myTeamScore =
      myTeam === "teamA" ? teamAScore : teamBScore;
    scoreButton.dataset.opposingTeamScore =
      myTeam === "teamA" ? teamBScore : teamAScore;

    // Hide score button if feature is disabled
    const features = window.appFeatures || {};
    if (!features.teamCanEditScore) {
      scoreButton.style.display = "none";
    }

    return card;
  }

  openScoreModal(button) {
    // Get data from button
    const {
      round,
      matchIndex,
      eventId,
      myTeam,
      myTeamScore,
      opposingTeamScore,
    } = button.dataset;

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

    // Determine opposing team
    const opposingTeam = myTeam === "teamA" ? "teamB" : "teamA";

    // Set form values
    document.getElementById("roundIndex").value = round;
    document.getElementById("matchIndex").value = matchIndex;
    document.getElementById("eventId").value = eventId;
    document.getElementById("myTeam").value = myTeam;
    document.getElementById("myTeamScore").value = myTeamScore;
    document.getElementById("opposingTeamScore").value = opposingTeamScore;

    // Display team players
    const myTeamPlayersEl = document.getElementById("myTeamPlayers");
    const opposingTeamPlayersEl = document.getElementById(
      "opposingTeamPlayers"
    );

    myTeamPlayersEl.innerHTML = "";
    opposingTeamPlayersEl.innerHTML = "";

    matchData.match[myTeam].forEach((player) => {
      const playerDiv = document.createElement("div");
      playerDiv.className = "player-item";
      playerDiv.textContent = player.name;
      myTeamPlayersEl.appendChild(playerDiv);
    });

    matchData.match[opposingTeam].forEach((player) => {
      const playerDiv = document.createElement("div");
      playerDiv.className = "player-item";
      playerDiv.textContent = player.name;
      opposingTeamPlayersEl.appendChild(playerDiv);
    });

    // Show modal
    this.scoreModal.style.display = "block";
  }

  async saveScore() {
    const roundIndex = document.getElementById("roundIndex").value;
    const matchIndex = document.getElementById("matchIndex").value;
    const eventId = document.getElementById("eventId").value;
    const myTeam = document.getElementById("myTeam").value;
    const myTeamScore = document.getElementById("myTeamScore").value;
    const opposingTeamScore =
      document.getElementById("opposingTeamScore").value;

    // Map scores to API format
    const teamAScore =
      myTeam === "teamA"
        ? parseInt(myTeamScore, 10)
        : parseInt(opposingTeamScore, 10);
    const teamBScore =
      myTeam === "teamA"
        ? parseInt(opposingTeamScore, 10)
        : parseInt(myTeamScore, 10);

    try {
      const response = await apiRequest(
        `/api/v1/events/${eventId}/scores`,
        "PATCH",
        {
          roundIndex,
          matchIndex,
          teamAScore,
          teamBScore,
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
  // Only initialize on my schedule page
  if (window.location.pathname.includes("/events/viewMySchedule/")) {
    new MyScheduleHandler();
  }
});

export { MyScheduleHandler };
