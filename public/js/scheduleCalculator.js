// Schedule Calculator - Dynamically generates court schedules based on player counts

// Render schedule preview using explicit roundsConfig
function renderSchedulePreview(cfg, players = []) {
  let html = `<h3>Schedule Preview</h3>
    <p><strong>Courts:</strong> ${cfg.courts} &nbsp; 
       <strong>Pairings/Court:</strong> ${cfg.pairings} &nbsp; 
       <strong>Players:</strong> ${cfg.players} &nbsp; 
       <strong>Rounds:</strong> ${cfg.rounds} &nbsp; 
       <strong>Games/Player:</strong> ${cfg.gamesPerPlayer ?? "?"} &nbsp; 
       <strong>Rests/Player:</strong> ${cfg.restsPerPlayer} &nbsp; 
       <strong>Rest %:</strong> ${(cfg.actualRestPercent * 100).toFixed(1)}%</p>
    <table class="schedule-table">
      <thead>
        <tr>
          <th>Round</th>
          <th>Resting</th>
          <th>Matches</th>
        </tr>
      </thead>
      <tbody>`;

  // Add rows for each round
  cfg.roundsConfig.forEach((round, idx) => {
    const restingNames = round.resting
      .map((num) =>
        players[num - 1]
          ? players[num - 1].userName || players[num - 1]
          : `Player ${num}`
      )
      .join(", ");

    let matchesHtml = "";
    round.matches.forEach((match, mIdx) => {
      const teamA = match.teamA
        .map((num) =>
          players[num - 1]
            ? players[num - 1].userName || players[num - 1]
            : `Player ${num}`
        )
        .join(", ");
      const teamB = match.teamB
        .map((num) =>
          players[num - 1]
            ? players[num - 1].userName || players[num - 1]
            : `Player ${num}`
        )
        .join(", ");
      matchesHtml += `Court ${mIdx + 1}: Team A (${teamA}) vs Team B (${teamB})<br>`;
    });

    html += `<tr>
      <td>${idx + 1}</td>
      <td>${restingNames}</td>
      <td>${matchesHtml}</td>
    </tr>`;
  });

  html += `</tbody></table>`;
  return html;
}

// Fetch schedule configurations from JSON
async function fetchScheduleConfigs() {
  const response = await fetch("/js/schedules.json");
  return await response.json();
}

// Utility: filter configs by courts
function filterConfigs(configs, selectedCourts) {
  return configs.filter((cfg) => cfg.courts == selectedCourts);
}

// Render courts dropdown
function renderCourtsDropdown(configs, select) {
  const courtsSet = new Set(configs.map((cfg) => cfg.courts));
  select.innerHTML =
    '<option value="" disabled selected>Choose courts</option>';
  Array.from(courtsSet)
    .sort((a, b) => a - b)
    .forEach((court) => {
      const opt = document.createElement("option");
      opt.value = court;
      opt.textContent = court;
      select.appendChild(opt);
    });
}

// Render schedule options table
function renderScheduleOptions(configs) {
  if (configs.length === 0)
    return "<p>No options available for this selection.</p>";
  return `
    <table class="schedule-options-table schedule-table">
      <thead>
        <tr>
          <th></th>
          <th>Players</th>
          <th>Rounds</th>
          <th>Games</th>
          <th>Rests</th>
          <th>Rest %</th>
        </tr>
      </thead>
      <tbody>
        ${configs
          .map(
            (cfg, idx) => `
          <tr>
            <td>
              <input type="radio" class="schedule-radio" name="scheduleOption" value="${idx}" style="width: 1.2em; height: 1.2em;">
            </td>
            <td>${cfg.players}</td>
            <td>${cfg.rounds}</td>
            <td>${cfg.gamesPerPlayer ?? "?"}</td>
            <td>${cfg.restsPerPlayer}</td>
            <td>${(cfg.actualRestPercent * 100).toFixed(1)}%</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

// Simulator: Generate player names for doubles
function generatePlayerNames(count) {
  const names = [];
  for (let i = 1; i <= count; i++) {
    names.push(`P${i}`);
  }
  return names;
}

// Initialize the schedule calculator
function initScheduleCalculator() {
  // Function to initialize when DOM is available
  const init = async () => {
    // Check if we're on a page that needs the schedule calculator
    const courtsSelect = document.getElementById("numCourts");

    // If the required elements don't exist, we're probably on a different page
    // so we'll just exit gracefully without errors
    if (!courtsSelect) {
      return;
    }

    const scheduleOptions = document.getElementById("scheduleOptions");
    const schedulePreview = document.getElementById("schedulePreview");
    const doublesToggle = document.getElementById("doublesToggle");
    const hiddenInput = document.getElementById("selectedScheduleConfig");

    // Fetch configuration data
    let configs = await fetchScheduleConfigs();

    // Render courts dropdown
    renderCourtsDropdown(configs, courtsSelect);

    // Filter and display options when courts selection changes
    async function updateOptions() {
      const selectedCourts = parseInt(courtsSelect.value, 10);
      const isDoubles = doublesToggle && doublesToggle.checked;

      if (isNaN(selectedCourts)) {
        return;
      }

      // Filter for singles or doubles
      let filteredConfigs = filterConfigs(configs, selectedCourts);
      filteredConfigs = filteredConfigs.filter(
        (cfg) =>
          (isDoubles && cfg.pairings === 2) ||
          (!isDoubles && cfg.pairings === 1)
      );

      // Sort by players count
      filteredConfigs.sort((a, b) => a.players - b.players);

      // Render options table if the element exists
      if (scheduleOptions) {
        scheduleOptions.innerHTML = renderScheduleOptions(filteredConfigs);

        // Add event listeners to radio buttons
        const radioButtons =
          scheduleOptions.querySelectorAll(".schedule-radio");

        radioButtons.forEach((radio) => {
          radio.addEventListener("change", () => {
            const idx = parseInt(radio.value, 10);
            const players = generatePlayerNames(filteredConfigs[idx].players);

            // Show preview for selected option if the element exists
            if (schedulePreview) {
              schedulePreview.innerHTML = renderSchedulePreview(
                filteredConfigs[idx],
                players
              );
            }

            // Update hidden input if it exists
            if (hiddenInput) {
              hiddenInput.value = JSON.stringify(filteredConfigs[idx]);
            }
          });
        });
      }

      // Clear preview initially if the element exists
      if (schedulePreview) {
        schedulePreview.innerHTML = "";
      }
    }

    // Add event listeners
    courtsSelect.addEventListener("change", updateOptions);
    if (doublesToggle) {
      doublesToggle.addEventListener("change", updateOptions);
    }
  };

  // Run immediately if document is already loaded, otherwise wait for DOM
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}

// Export for module usage
export { initScheduleCalculator };
