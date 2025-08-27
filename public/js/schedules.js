/**
 * schedules.js - Handle schedule-related functionality
 * Manages master schedules and individual player schedules
 */

import { showAlert } from "./alerts.js";
import { apiRequest } from "./apiActions.js";

// Store initialized flag to prevent double initialization
let hasInitialized = false;

class ScheduleHandler {
  constructor() {
    // Prevent double initialization but still return the instance
    if (hasInitialized) {
      console.log(
        "ScheduleHandler already initialized, returning existing instance"
      );
      return window.scheduleHandler;
    }

    // Store this instance globally for access
    window.scheduleHandler = this;

    this.eventId = null;
    this.roundsCount = 0;
    this.matches = [];
    this.filteredMatches = [];
    this.currentRound = "all";

    // DOM elements with better error handling
    this.eventTitle = document.getElementById("eventTitle");
    console.log("eventTitle element found:", !!this.eventTitle);

    this.eventDetails = document.getElementById("eventDetails");
    console.log("eventDetails element found:", !!this.eventDetails);

    this.roundSelect = document.getElementById("roundSelect");
    this.matchesContainer = document.getElementById("matchesContainer");
    this.scoreModal = document.getElementById("scoreModal");
    this.scoreForm = document.getElementById("scoreForm");
    this.matchCardTemplate = document.getElementById("matchCardTemplate");

    // Initialize
    this.init();

    // Mark as initialized
    hasInitialized = true;
  }

  init() {
    // Log full URL for debugging
    console.log("Current URL:", window.location.href);
    console.log("Current pathname:", window.location.pathname);

    // Get event ID from URL path
    const pathParts = window.location.pathname.split("/");
    console.log("Path parts:", pathParts);

    // Extract the eventId making sure we have a valid ID
    this.eventId = pathParts[pathParts.length - 1];

    // Replace "undefined" with actual ID if we have it in localStorage
    if (this.eventId === "undefined" || !this.eventId) {
      const savedEventId = localStorage.getItem("currentEventId");
      if (savedEventId) {
        console.log("Using saved event ID from localStorage:", savedEventId);
        this.eventId = savedEventId;

        // Update URL without reloading the page
        if (window.history && window.history.replaceState) {
          const newPath = pathParts.slice(0, -1).join("/") + "/" + this.eventId;
          window.history.replaceState(null, "", newPath);
          console.log("Updated URL with correct event ID");
        }
      }
    } else {
      // Save this valid ID for future use
      localStorage.setItem("currentEventId", this.eventId);
    }

    console.log("Final event ID:", this.eventId);

    // Check for valid event ID (not undefined or empty)
    if (!this.eventId || this.eventId === "undefined") {
      console.error("Invalid event ID in URL:", this.eventId);
      showAlert(
        "error",
        "Event ID not found in URL. Please go back and try again."
      );
      return;
    }

    console.log("Loading schedule for event:", this.eventId);

    // Set up event listeners
    this.setupEventListeners();

    // Make sure DOM elements are available (might have changed since constructor)
    this.eventTitle = document.getElementById("eventTitle");
    this.eventDetails = document.getElementById("eventDetails");

    // Log whether we found the elements
    console.log("Event title element found (in init):", !!this.eventTitle);
    console.log("Event details element found (in init):", !!this.eventDetails);

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
      console.log(`Fetching data for event ID: ${this.eventId}`);

      // Double check that we have a valid event ID
      if (!this.eventId || this.eventId === "undefined") {
        console.error("Cannot load data: Invalid event ID");
        showAlert(
          "error",
          "Could not find event ID. Please return to My Events and try again."
        );
        return;
      }

      // Fetch event details
      console.log("Making API request for event details");
      const eventData = await apiRequest({
        method: "GET",
        url: `/api/v1/events/${this.eventId}`,
      });

      console.log("API response for event details:", eventData);

      // Log the entire event data for debugging
      console.log(
        "Checking event data structure:",
        JSON.stringify(eventData, null, 2)
      );

      // Extract the event object correctly from the API response
      let event = null;

      // First try to get the complete response structure
      try {
        // DIRECT APPROACH: Try to extract and immediately display the event data
        // This is a new approach to make sure the header gets updated regardless of structure
        let directEventData = null;
        let directEventFound = false;

        if (
          eventData &&
          eventData.data &&
          eventData.data.data &&
          eventData.data.data.data
        ) {
          directEventData = eventData.data.data.data;
          directEventFound = true;
          console.log("Direct approach: Found event in data.data.data.data");
        } else if (eventData && eventData.data && eventData.data.data) {
          directEventData = eventData.data.data;
          directEventFound = true;
          console.log("Direct approach: Found event in data.data.data");
        } else if (eventData && eventData.data) {
          directEventData = eventData.data;
          directEventFound = true;
          console.log("Direct approach: Found event in data.data");
        }

        // If we found event data directly, update the header immediately
        if (directEventFound && directEventData) {
          const name =
            directEventData.eventName || directEventData.name || "Event";
          let dateStr = "Date not available";
          if (directEventData.eventDate) {
            try {
              const options = {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
              };
              dateStr = new Date(directEventData.eventDate).toLocaleDateString(
                undefined,
                options
              );
            } catch (e) {
              console.error("Error parsing date:", e);
            }
          }
          const time =
            directEventData.eventStartTime ||
            directEventData.startTime ||
            "TBD";
          const location =
            directEventData.eventLocation || directEventData.location || "TBD";

          // Directly update DOM elements
          const titleEl = document.getElementById("eventTitle");
          const detailsEl = document.getElementById("eventDetails");

          if (titleEl) {
            titleEl.textContent = name;
            console.log("Direct update: Event title set to", name);
          }

          if (detailsEl) {
            detailsEl.textContent = `${dateStr} @ ${time} in ${location}`;
            console.log(
              "Direct update: Event details set to",
              detailsEl.textContent
            );
          }
        }

        // ALSO USE THE ORIGINAL APPROACH AS A BACKUP
        // Based on the screenshot, we have a deeply nested structure
        if (
          eventData &&
          eventData.data &&
          eventData.data.status === "success" &&
          eventData.data.data &&
          eventData.data.data.data
        ) {
          // This is the format seen in the screenshot: data.data.data contains the event
          event = eventData.data.data.data;
          console.log(
            "Found event in deeply nested structure (data.data.data)"
          );
        } else if (
          eventData &&
          eventData.data &&
          eventData.data.status === "success"
        ) {
          // This is the standard format from your API
          if (eventData.data.data) {
            event = eventData.data.data;
            console.log("Found event data in standard API response format");
          }
        } else if (eventData && eventData.data) {
          // Alternative format
          event = eventData.data;
          console.log("Found event data in alternate format");
        } else if (eventData && eventData.status === "success") {
          // Another possible format
          event = eventData.data;
          console.log("Found event data directly in response");
        } else if (eventData) {
          // Last resort
          event = eventData;
          console.log("Using raw response as event data");
        }

        // Print the event data we found for debugging
        if (event) {
          console.log("Extracted event details:", {
            name: event.eventName,
            location: event.eventLocation,
            date: event.eventDate,
            time: event.eventStartTime,
          });
        }
      } catch (err) {
        console.error("Error extracting event data:", err);
      }

      console.log("Extracted event object:", event);

      if (!event) {
        console.error("Failed to extract event data from response:", eventData);
        showAlert("error", "Failed to load event data. Please try again.");
        return;
      }

      // Look deeper in the nested structure if needed
      if (
        !event.eventName &&
        eventData &&
        eventData.data &&
        eventData.data.data &&
        eventData.data.data.data
      ) {
        console.log("Event doesn't have eventName, trying nested data");
        event = eventData.data.data.data;
        console.log("Trying deeper nested event object:", event);
      }

      // Try to directly update the DOM with event data if we see it in the response
      if (
        eventData &&
        eventData.data &&
        eventData.data.data &&
        eventData.data.data.data
      ) {
        const nestedData = eventData.data.data.data;
        if (nestedData.eventName) {
          // Force update the title element
          const titleEl = document.getElementById("eventTitle");
          if (titleEl) {
            titleEl.textContent = nestedData.eventName;
            console.log("Directly updated title with:", nestedData.eventName);
          }

          // Format date
          let dateStr = "Date not available";
          if (nestedData.eventDate) {
            try {
              dateStr = new Date(nestedData.eventDate).toLocaleDateString();
            } catch (e) {
              console.error("Error parsing date:", e);
            }
          }

          // Force update the details element
          const detailsEl = document.getElementById("eventDetails");
          if (detailsEl) {
            detailsEl.textContent = `${dateStr} @ ${nestedData.eventStartTime || "TBD"} in ${nestedData.eventLocation || "TBD"}`;
            console.log(
              "Directly updated details with:",
              detailsEl.textContent
            );
          }
        }
      }

      // Set event details through the usual method
      this.displayEventDetails(event);

      // The schedules/rounds are part of the event object
      console.log("Checking for rounds data in event:", event);

      // Log all keys in the event object to help debugging
      console.log("Event object keys:", Object.keys(event));

      // Look for rounds data with more detailed debugging
      let roundsData = null;

      if (event.rounds) {
        console.log("Found rounds array directly in event object");
        roundsData = event.rounds;
      } else if (event.data && event.data.rounds) {
        console.log("Found rounds array in event.data");
        roundsData = event.data.rounds;
      } else if (event.schedule && event.schedule.rounds) {
        console.log("Found rounds array in event.schedule");
        roundsData = event.schedule.rounds;
      } else if (event.schedule) {
        console.log("Found schedule object, trying to use as rounds");
        roundsData = event.schedule;
      }

      // Log rounds data details
      if (roundsData) {
        console.log("Rounds data type:", typeof roundsData);
        console.log("Is Array?", Array.isArray(roundsData));
        console.log(
          "Rounds data length:",
          Array.isArray(roundsData) ? roundsData.length : "N/A"
        );

        // Inspect the first round if available
        if (Array.isArray(roundsData) && roundsData.length > 0) {
          console.log("First round:", roundsData[0]);
          if (roundsData[0].matches) {
            console.log("First round matches:", roundsData[0].matches);
          }
        }
      } else {
        console.error("No rounds property found in event object");
      }

      if (!roundsData) {
        console.error("No rounds data found in event:", event);
        showAlert("error", "No schedule data available for this event");
        return;
      }

      // Process matches data - use the rounds data
      console.log("Processing rounds data:", roundsData);
      this.processMatchesData(roundsData);

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
    console.log("Displaying event details:", event);

    if (!event) {
      console.error("No event data provided to displayEventDetails");
      return;
    }

    // Make sure DOM elements are available (might have changed since constructor)
    if (!this.eventTitle) {
      this.eventTitle = document.getElementById("eventTitle");
      console.log("Re-fetched event title element:", !!this.eventTitle);
    }

    if (!this.eventDetails) {
      this.eventDetails = document.getElementById("eventDetails");
      console.log("Re-fetched event details element:", !!this.eventDetails);
    }

    // Log all properties in the event object to help debug
    console.log("All event properties:", Object.getOwnPropertyNames(event));

    // Check if we have a nested data structure
    if (event.data) {
      console.log("Event has nested data property, checking it");
      if (typeof event.data === "object") {
        console.log(
          "Event.data properties:",
          Object.getOwnPropertyNames(event.data)
        );

        // If the important properties are in the data object, use that instead
        if (event.data.eventName || event.data.eventDate) {
          console.log("Using event.data as event object");
          event = event.data;
        }
      }
    }

    try {
      // Log event keys to debug
      console.log("Event keys available:", Object.keys(event));

      // Format date with better error handling
      const options = {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      };

      // Store the processed event data for possible use by forceUpdateEventHeader
      window.lastEventData = event;

      let eventDate = "Date not available";
      if (event.eventDate) {
        try {
          eventDate = new Date(event.eventDate).toLocaleDateString(
            undefined,
            options
          );
          console.log("Parsed event date:", eventDate, "from", event.eventDate);
        } catch (e) {
          console.error("Error parsing date:", e);
        }
      }

      // Handle different possible property names
      const eventName =
        event.eventName ||
        event.name ||
        event.title ||
        "Event Name Not Available";
      console.log("Event name extracted:", eventName);

      // Format time nicely if it has a colon
      let eventTime =
        event.eventStartTime || event.startTime || event.time || "TBD";

      // Try to format the time if it contains a colon
      if (typeof eventTime === "string" && eventTime.includes(":")) {
        try {
          const [hours, minutes] = eventTime.split(":");
          const date = new Date();
          date.setHours(parseInt(hours, 10));
          date.setMinutes(parseInt(minutes, 10));
          eventTime = date.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
          console.log(
            "Formatted time:",
            eventTime,
            "from",
            event.eventStartTime || event.startTime
          );
        } catch (e) {
          console.error("Error formatting time:", e);
        }
      }
      console.log("Event time extracted:", eventTime);

      const eventLocation =
        event.eventLocation || event.location || event.venue || "TBD";
      console.log("Event location extracted:", eventLocation);

      // Extract organizer information
      const eventOrganizer =
        event.organizer ||
        event.creator ||
        event.host ||
        event.createdBy ||
        (event.user ? event.user.name : null);
      console.log("Event organizer extracted:", eventOrganizer);

      // Try multiple approaches to update the event title
      const titleElement =
        this.eventTitle ||
        document.getElementById("eventTitle") ||
        document.querySelector(".event-title") ||
        document.querySelector("h1.event-title") ||
        document.querySelector("h2.event-title");

      if (titleElement) {
        titleElement.textContent = eventName;
        console.log("Updated event title to:", eventName);
      } else {
        // Last resort - try to find by class directly
        const titleByClass = document.querySelector("h2.event-title");
        if (titleByClass) {
          titleByClass.textContent = eventName;
          console.log("Updated event title (by class) to:", eventName);
        } else {
          console.error("Event title element not found by any method");
          // Add debug info to console
          console.log("All h2 elements:", document.querySelectorAll("h2"));
        }
      }

      // Set event details with similar fallback approach
      const detailsText = `${eventDate} @ ${eventTime} in ${eventLocation}`;
      const detailsElement =
        this.eventDetails ||
        document.getElementById("eventDetails") ||
        document.querySelector(".event-details") ||
        document.querySelector("p.event-details");

      if (detailsElement) {
        detailsElement.textContent = detailsText;
        console.log("Updated event details to:", detailsText);
      } else {
        // Last resort - try to find by class directly
        const detailsByClass = document.querySelector("p.event-details");
        if (detailsByClass) {
          detailsByClass.textContent = detailsText;
          console.log("Updated event details (by class) to:", detailsText);
        } else {
          console.error("Event details element not found by any method");
          // Add debug info to console
          console.log("All p elements:", document.querySelectorAll("p"));
        }
      }

      // Also update our global event header in case this is more current
      window.updateEventHeader(
        eventName,
        eventDate,
        eventTime,
        eventLocation,
        eventOrganizer
      );
    } catch (err) {
      console.error("Error displaying event details:", err);
    }
  }

  processMatchesData(rounds) {
    console.log("processMatchesData called with:", rounds);

    if (!rounds) {
      console.error("Rounds data is null or undefined");
      return;
    }

    if (!Array.isArray(rounds)) {
      console.error("Rounds data is not an array, type:", typeof rounds);
      // Try to convert to array if it's an object with numeric keys
      if (typeof rounds === "object") {
        try {
          const roundsArray = Object.keys(rounds)
            .filter((key) => !isNaN(parseInt(key)))
            .map((key) => rounds[key]);

          if (roundsArray.length > 0) {
            console.log("Converted rounds object to array:", roundsArray);
            rounds = roundsArray;
          } else {
            console.error("Failed to convert rounds object to array");
            return;
          }
        } catch (err) {
          console.error("Error converting rounds to array:", err);
          return;
        }
      } else {
        console.error("Rounds is not an object or array, cannot process");
        return;
      }
    }

    console.log("Processing rounds array of length:", rounds.length);
    this.roundsCount = rounds.length;
    this.matches = [];
    this.standouts = []; // Array to store standouts for each round

    // Process each round
    rounds.forEach((round, roundIndex) => {
      console.log(`Processing round ${roundIndex}:`, round);

      // Skip if round is null or undefined
      if (!round) {
        console.error(`Round ${roundIndex} is null or undefined`);
        return;
      }

      // Process standouts (players who are resting in this round)
      // Check for different casing variations of the standouts property
      const standouts =
        round.standOuts ||
        round.standouts ||
        round.StandOuts ||
        round.Standouts;

      if (standouts && Array.isArray(standouts)) {
        console.log(
          `Round ${roundIndex} has ${standouts.length} standouts:`,
          standouts
        );

        // Log the structure of the first standout for debugging
        if (standouts.length > 0) {
          console.log("First standout object structure:", standouts[0]);
          console.log("First standout object keys:", Object.keys(standouts[0]));
        }

        // Store standouts with round number for easy display
        this.standouts.push({
          roundNumber: roundIndex + 1,
          players: standouts,
        });
      } else {
        console.log(`No standouts found in round ${roundIndex}`);
      }

      // Process each match in this round
      if (round.matches && Array.isArray(round.matches)) {
        console.log(`Round ${roundIndex} has ${round.matches.length} matches`);

        round.matches.forEach((match, matchIndex) => {
          console.log(
            `Processing match ${matchIndex} in round ${roundIndex}:`,
            match
          );

          if (!match) {
            console.error(
              `Match ${matchIndex} in round ${roundIndex} is null or undefined`
            );
            return;
          }

          try {
            // Verify match has the expected structure
            if (!match.teamA || !match.teamB) {
              console.warn(
                `Match ${matchIndex} in round ${roundIndex} is missing team data:`,
                match
              );
              // Don't return, still try to process what we have
            }

            this.matches.push({
              roundIndex,
              matchIndex,
              match,
              roundNumber: roundIndex + 1, // Add human-readable round number
            });
          } catch (err) {
            console.error(
              `Error processing match ${matchIndex} in round ${roundIndex}:`,
              err
            );
          }
        });
      } else {
        console.warn(
          `No matches found in round ${roundIndex} or matches is not an array:`,
          round
        );

        // Try to find matches in a different location
        if (round.schedules && Array.isArray(round.schedules)) {
          console.log(
            `Found alternative matches in round.schedules, length: ${round.schedules.length}`
          );

          round.schedules.forEach((match, matchIndex) => {
            try {
              this.matches.push({
                roundIndex,
                matchIndex,
                match,
                roundNumber: roundIndex + 1,
              });
            } catch (err) {
              console.error(
                `Error processing alternative match ${matchIndex} in round ${roundIndex}:`,
                err
              );
            }
          });
        }
      }
    });

    console.log("Total matches processed:", this.matches.length);
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
    // Clear any existing standouts container when changing filters
    const existingStandouts = document.querySelector(
      ".all-standouts-container"
    );
    if (existingStandouts) {
      existingStandouts.remove();
    }

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

    // Create round header if filtering by a specific round
    if (this.currentRound !== "all") {
      const roundNumber = parseInt(this.currentRound, 10);
      this.renderStandouts(roundNumber);
    }

    // Create match cards
    this.filteredMatches.forEach((matchData) => {
      const matchCard = this.createMatchCard(matchData);
      this.matchesContainer.appendChild(matchCard);
    });

    // If showing all rounds, display standouts for each round
    if (this.currentRound === "all") {
      this.renderAllStandouts();
    }
  }

  renderStandouts(roundNumber) {
    // Find standouts for this round
    const roundStandouts = this.standouts.find(
      (s) => s.roundNumber === roundNumber
    );

    // Create standouts section
    const standoutsSection = document.createElement("div");
    standoutsSection.className = "standouts-section";

    // Create header
    const header = document.createElement("h3");
    header.className = "standouts-header";
    header.textContent = `Players Resting in Round ${roundNumber}:`;
    standoutsSection.appendChild(header);

    // Check if we have any standouts for this round
    if (
      roundStandouts &&
      roundStandouts.players &&
      roundStandouts.players.length > 0
    ) {
      // Create player list
      const playersList = document.createElement("ul");
      playersList.className = "standouts-list";

      // Log the full standouts data to help debugging
      console.log(
        `Rendering standouts for round ${roundNumber}:`,
        roundStandouts.players
      );

      roundStandouts.players.forEach((player, index) => {
        const playerItem = document.createElement("li");

        // Extract name from player object - fallback to ID if name not available
        if (typeof player === "object" && player !== null) {
          // Log each player object for debugging
          console.log(`Player ${index} in round ${roundNumber}:`, player);

          // Try to extract the name in several different ways
          if (player.name) {
            playerItem.textContent = player.name; // This is seen in your screenshot
            console.log(`Found name property: ${player.name}`);
          } else if (player.userName) {
            playerItem.textContent = player.userName;
          } else if (player.testuser) {
            // Special case for test users
            playerItem.textContent = player.testuser;
          } else if (player.userId) {
            playerItem.textContent = `User ${player.userId.substring(0, 6)}...`;
          } else if (player._id) {
            playerItem.textContent = `Player ${player._id.substring(0, 6)}...`;
          } else if (player.id) {
            playerItem.textContent = `Player ${player.id.substring(0, 6)}...`;
          } else {
            playerItem.textContent = `Player ${index + 1}`;
          }
        } else if (player) {
          // Handle if it's a string or other non-object
          playerItem.textContent = String(player);
        } else {
          // Fallback for null/undefined
          playerItem.textContent = `Player ${index + 1} (Unknown)`;
        }

        playersList.appendChild(playerItem);
      });

      standoutsSection.appendChild(playersList);
    } else {
      // No standouts for this round
      const noPlayers = document.createElement("p");
      noPlayers.textContent = "No players are resting in this round.";
      standoutsSection.appendChild(noPlayers);
    }

    // Add to container before matches
    this.matchesContainer.appendChild(standoutsSection);
  }

  renderAllStandouts() {
    // Create container for all standouts sections
    const allStandoutsContainer = document.createElement("div");
    allStandoutsContainer.className = "all-standouts-container";

    // Add header
    const header = document.createElement("h3");
    header.className = "all-standouts-header";
    header.textContent = "Players Resting by Round";
    allStandoutsContainer.appendChild(header);

    // Check if we have any standouts data
    if (!this.standouts || this.standouts.length === 0) {
      const noData = document.createElement("p");
      noData.className = "text-center";
      noData.textContent = "No standout players information available.";
      allStandoutsContainer.appendChild(noData);
      document.querySelector(".container").appendChild(allStandoutsContainer);
      return;
    }

    // Sort standouts by round number
    const sortedStandouts = [...this.standouts].sort(
      (a, b) => a.roundNumber - b.roundNumber
    );

    // Flag to track if we found any standouts
    let foundAnyStandouts = false;

    // Create a section for each round
    sortedStandouts.forEach((roundStandouts) => {
      if (roundStandouts.players && roundStandouts.players.length > 0) {
        foundAnyStandouts = true;
        const roundSection = document.createElement("div");
        roundSection.className = "round-standouts";

        // Round header
        const roundHeader = document.createElement("h4");
        roundHeader.textContent = `Round ${roundStandouts.roundNumber}:`;
        roundSection.appendChild(roundHeader);

        // Player list
        const playersList = document.createElement("ul");
        roundStandouts.players.forEach((player, index) => {
          const playerItem = document.createElement("li");

          // Extract name from player object - fallback to ID if name not available
          if (typeof player === "object" && player !== null) {
            // Try to extract the name in several different ways
            if (player.name) {
              playerItem.textContent = player.name; // This is seen in your screenshot
              console.log(
                `Found name property in all rounds view: ${player.name}`
              );
            } else if (player.userName) {
              playerItem.textContent = player.userName;
            } else if (player.testuser) {
              // Special case for test users
              playerItem.textContent = player.testuser;
            } else if (player.userId) {
              playerItem.textContent = `User ${player.userId.substring(0, 6)}...`;
            } else if (player._id) {
              playerItem.textContent = `Player ${player._id.substring(0, 6)}...`;
            } else if (player.id) {
              playerItem.textContent = `Player ${player.id.substring(0, 6)}...`;
            } else {
              playerItem.textContent = `Player ${index + 1}`;
            }
          } else if (player) {
            // Handle if it's a string or other non-object
            playerItem.textContent = String(player);
          } else {
            // Fallback for null/undefined
            playerItem.textContent = `Player ${index + 1} (Unknown)`;
          }

          playersList.appendChild(playerItem);
        });

        roundSection.appendChild(playersList);
        allStandoutsContainer.appendChild(roundSection);
      }
    });

    // If we didn't find any standouts, show a message
    if (!foundAnyStandouts) {
      const noStandouts = document.createElement("p");
      noStandouts.className = "text-center";
      noStandouts.textContent = "No players are resting in any round.";
      allStandoutsContainer.appendChild(noStandouts);
    }

    // Add to the main container after the matches
    document.querySelector(".container").appendChild(allStandoutsContainer);
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
      const response = await apiRequest({
        method: "PATCH",
        url: `/api/v1/events/${eventId}/scores`,
        data: {
          roundIndex,
          matchIndex,
          teamAScore: parseInt(teamAScore, 10),
          teamBScore: parseInt(teamBScore, 10),
        },
      });

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
    console.log("Initializing ScheduleHandler on DOMContentLoaded");
    new ScheduleHandler();
  }
});

// Fallback if the DOM elements weren't ready yet
window.addEventListener("load", () => {
  // Only run on schedule pages
  if (
    window.location.pathname.includes("/events/viewMasterSchedule/") ||
    window.location.pathname.includes("/events/viewMySchedule/")
  ) {
    console.log(
      "Window fully loaded - ensuring event header is properly populated"
    );

    // Check if the header elements need updating
    const title =
      document.getElementById("eventTitle") ||
      document.querySelector(".event-title");
    const details =
      document.getElementById("eventDetails") ||
      document.querySelector(".event-details");

    // Always try to update with our direct method after a short delay
    // This gives time for any async operations to complete
    setTimeout(() => {
      console.log("Attempting direct event header update");
      if (window.forceUpdateEventHeader) {
        window.forceUpdateEventHeader();
      } else {
        console.error("forceUpdateEventHeader function not available");
      }
    }, 500);

    // If title is empty or showing loading, try to reinitialize
    if (
      !title ||
      !details ||
      (title &&
        (title.textContent === "" ||
          title.textContent === "Loading event..." ||
          title.textContent === "Event Name Not Available"))
    ) {
      console.log("Event header needs refresh - trying multiple approaches");

      // Try to reinitialize or refresh the data
      if (window.scheduleHandler || hasInitialized) {
        console.log("Refreshing existing ScheduleHandler instance");
        // Force a refresh of the event data
        window.scheduleHandler =
          window.scheduleHandler || new ScheduleHandler();
        window.scheduleHandler.loadEventData();
      } else {
        console.log("Creating new ScheduleHandler instance on window load");
        window.scheduleHandler = new ScheduleHandler();
      }

      // If we have event data in lastEventData, use it
      if (window.lastEventData) {
        console.log("Using cached event data to update header");
        try {
          const event = window.lastEventData;
          const name = event.eventName || event.name || "Event";
          const dateStr = event.eventDate
            ? new Date(event.eventDate).toLocaleDateString()
            : "Date not available";
          const time = event.eventStartTime || event.startTime || "TBD";
          const location = event.eventLocation || event.location || "TBD";

          window.updateEventHeader(name, dateStr, time, location);
        } catch (e) {
          console.error("Error using cached event data:", e);
        }
      }
    }
  }
});

// Add a global helper function to force updating header elements
window.updateEventHeader = function (name, date, time, location, organizer) {
  console.log("Manual header update requested with:", {
    name,
    date,
    time,
    location,
    organizer,
  });

  // Try multiple approaches to find the title element
  const titleElement =
    document.getElementById("eventTitle") ||
    document.querySelector(".event-title") ||
    document.querySelector("h1.event-title") ||
    document.querySelector("h2.event-title");

  if (titleElement) {
    titleElement.textContent = name || "Event Name";
    console.log("Manually updated event title to:", name);
  } else {
    console.error("Event title element not found for manual update");
    console.log(
      "Available heading elements:",
      Array.from(document.querySelectorAll("h1,h2,h3")).map((el) => ({
        tagName: el.tagName,
        id: el.id,
        className: el.className,
        text: el.textContent.substring(0, 20) + "...",
      }))
    );
  }

  // Similar approach for details element
  const detailsElement =
    document.getElementById("eventDetails") ||
    document.querySelector(".event-details") ||
    document.querySelector("p.event-details");

  if (detailsElement) {
    // Clear previous content
    detailsElement.innerHTML = "";

    // Create date element with icon
    const dateItem = document.createElement("span");
    dateItem.className = "event-detail-item";
    dateItem.innerHTML = `<i class="far fa-calendar-alt"></i>${date || "Date not available"}`;

    // Create time element with icon
    const timeItem = document.createElement("span");
    timeItem.className = "event-detail-item";
    timeItem.innerHTML = `<i class="far fa-clock"></i>${time || "TBD"}`;

    // Create location element with icon
    const locationItem = document.createElement("span");
    locationItem.className = "event-detail-item";
    locationItem.innerHTML = `<i class="fas fa-map-marker-alt"></i>${location || "TBD"}`;

    // Add all elements to the details container
    detailsElement.appendChild(dateItem);
    detailsElement.appendChild(timeItem);
    detailsElement.appendChild(locationItem);

    console.log("Manually updated event details with icons");

    // Add organizer information if available
    if (organizer) {
      // Check if organizer element already exists, if not create it
      let organizerElement = document.querySelector(".event-organizer");
      if (!organizerElement) {
        organizerElement = document.createElement("p");
        organizerElement.className = "event-organizer";
        // Insert after details element
        detailsElement.parentNode.insertBefore(
          organizerElement,
          detailsElement.nextSibling
        );
      }

      organizerElement.innerHTML = `<i class="fas fa-user-tie"></i>Organized by: ${organizer}`;
      console.log("Added organizer information:", organizer);
    }
  } else {
    console.error("Event details element not found for manual update");
    console.log(
      "Available paragraph elements:",
      Array.from(document.querySelectorAll("p")).map((el) => ({
        id: el.id,
        className: el.className,
        text: el.textContent.substring(0, 20) + "...",
      }))
    );
  }
};

// Helper function to deeply extract event data from the response
function extractEventDataFromResponse(response) {
  console.log("Extracting event data from response:", response);

  // Initialize with empty object to avoid null reference errors
  let eventData = {};

  // Try to navigate various possible response structures
  if (response && response.data) {
    if (response.data.data) {
      console.log("Found nested data.data structure");
      eventData = response.data.data;
    } else {
      console.log("Found data structure");
      eventData = response.data;
    }
  } else if (response && response.event) {
    console.log("Found event structure");
    eventData = response.event;
  } else if (response && typeof response === "object") {
    console.log("Using root response object");
    eventData = response;
  }

  // Debug log all found fields that might be relevant
  console.log(
    "Event name field:",
    eventData.eventName || eventData.name || "Not found"
  );
  console.log("Event date field:", eventData.eventDate || "Not found");
  console.log(
    "Event time field:",
    eventData.eventStartTime || eventData.startTime || "Not found"
  );
  console.log(
    "Event location field:",
    eventData.eventLocation || eventData.location || "Not found"
  );
  console.log(
    "Event organizer field:",
    eventData.organizer || eventData.creator || eventData.host || "Not found"
  );

  return eventData;
}

// Add a function to directly extract and display event data from the API response
window.forceUpdateEventHeader = function () {
  console.log("Attempting to force update event header from API response...");

  // Get the current event ID
  const eventId = localStorage.getItem("currentEventId");
  if (!eventId) {
    console.error("No event ID found in localStorage");
    return;
  }

  // Make a direct API request
  fetch(`/api/v1/events/${eventId}`)
    .then((response) => {
      console.log("API response status:", response.status);
      return response.json();
    })
    .then((data) => {
      console.log("API response:", data);

      // Use our helper function to extract the event data
      const eventData = extractEventDataFromResponse(data);

      // Extra debug for data structure
      console.log("All available fields:", Object.keys(eventData));

      if (eventData) {
        // Update the header elements with better formatting
        const name = eventData.eventName || eventData.name || "Event";

        // Format date more nicely with fallbacks
        let dateStr = "Date not available";
        if (eventData.eventDate) {
          try {
            const options = {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
            };
            dateStr = new Date(eventData.eventDate).toLocaleDateString(
              undefined,
              options
            );
            console.log(
              "Formatted date:",
              dateStr,
              "from raw date:",
              eventData.eventDate
            );
          } catch (e) {
            console.error("Error parsing date:", e);
          }
        }

        // Format time nicely
        let timeStr = "TBD";
        if (eventData.eventStartTime || eventData.startTime) {
          const rawTime = eventData.eventStartTime || eventData.startTime;
          if (rawTime.includes(":")) {
            // Try to format as proper time if it contains a colon
            try {
              const [hours, minutes] = rawTime.split(":");
              const date = new Date();
              date.setHours(parseInt(hours, 10));
              date.setMinutes(parseInt(minutes, 10));
              timeStr = date.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });
              console.log(
                "Formatted time:",
                timeStr,
                "from raw time:",
                rawTime
              );
            } catch (e) {
              console.error("Error formatting time:", e);
              timeStr = rawTime; // Fallback to raw time
            }
          } else {
            timeStr = rawTime;
          }
        }

        const location = eventData.eventLocation || eventData.location || "TBD";

        // Extract organizer information
        const organizer =
          eventData.organizer ||
          eventData.creator ||
          eventData.host ||
          eventData.createdBy ||
          (eventData.user ? eventData.user.name : null);

        // Store this data globally for debugging
        window.lastEventData = eventData;

        // Update the header
        window.updateEventHeader(name, dateStr, timeStr, location, organizer);

        // Debug log the final values used
        console.log("Final values used for header update:", {
          name,
          dateStr,
          timeStr,
          location,
          organizer,
        });
      }
    })
    .catch((err) => {
      console.error("Error making API request:", err);
    });
};

// Add debug function to dump event data to console
window.dumpEventData = function () {
  if (window.lastEventData) {
    console.log("CURRENT EVENT DATA:", window.lastEventData);
    return window.lastEventData;
  } else {
    console.log(
      "No event data available. Try running forceUpdateEventHeader() first."
    );
    return null;
  }
};

// Add function to manually force extraction and update
window.manuallyUpdateEventHeader = function (eventId) {
  // Use provided event ID or try to get from localStorage or URL
  const id = eventId || localStorage.getItem("currentEventId");

  if (!id) {
    console.error("No event ID provided or found in localStorage");
    return;
  }

  console.log("Manually updating event header for event ID:", id);

  // Make a direct API request
  fetch(`/api/v1/events/${id}`)
    .then((response) => {
      console.log("API response status:", response.status);
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      console.log("API raw response for debugging:", data);

      // Log the structure of the response
      console.log(
        "Response structure:",
        Object.keys(data).map((key) => {
          const value = data[key];
          return {
            key,
            type: typeof value,
            isArray: Array.isArray(value),
            subKeys:
              typeof value === "object" && value !== null
                ? Object.keys(value)
                : null,
          };
        })
      );

      // Use our helper function to extract the event data
      const eventData = extractEventDataFromResponse(data);

      // Store for debugging
      window.lastEventData = eventData;
      window.lastApiResponse = data;

      // Format and display
      let dateStr = "Date not available";
      if (eventData.eventDate) {
        try {
          const options = {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
          };
          dateStr = new Date(eventData.eventDate).toLocaleDateString(
            undefined,
            options
          );
        } catch (e) {
          console.error("Error parsing date:", e);
        }
      }

      const name = eventData.eventName || eventData.name || "Event";
      const time = eventData.eventStartTime || eventData.startTime || "TBD";
      const location = eventData.eventLocation || eventData.location || "TBD";
      const organizer =
        eventData.organizer ||
        eventData.creator ||
        eventData.host ||
        eventData.createdBy ||
        (eventData.user ? eventData.user.name : null);

      console.log("Final values for manual update:", {
        name,
        dateStr,
        time,
        location,
        organizer,
      });
      window.updateEventHeader(name, dateStr, time, location, organizer);

      return { name, date: dateStr, time, location, organizer };
    })
    .catch((err) => {
      console.error("Error in manual update:", err);
    });
};

export { ScheduleHandler };
