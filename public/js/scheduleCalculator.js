document.addEventListener("DOMContentLoaded", function () {
  if (document.getElementById("createEventForm")) {
    initScheduleCalculator();
  }
});

// Fetch schedule configs from schedules.json
async function fetchScheduleConfigs() {
  const response = await fetch("/js/schedules.json");
  return await response.json();
}

// Utility: filter configs by courts
function filterConfigs(configs, selectedCourts) {
  return configs.filter((cfg) => cfg.courts == selectedCourts);
}

// Render courts dropdown
function renderCourtsDropdown(configs) {
  const courtsSet = new Set(configs.map((cfg) => cfg.courts));
  const select = document.getElementById("numCourts");
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
    <table class="schedule-options-table">
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
    <table class="modal-schedule-table">
      <thead>
        <tr>
          <th>Round</th>
          <th>Resting</th>
          <th>Matches</th>
        </tr>
      </thead>
      <tbody>`;

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

// Main initialization function
function initScheduleCalculator() {
  // Create UI container if not present
  let calculatorBox = document.querySelector(".calculator-box");
  if (!calculatorBox) {
    calculatorBox = document.createElement("div");
    calculatorBox.className = "calculator-box";
    document.body.prepend(calculatorBox);
  }

  // Add controls (only courts dropdown)
  calculatorBox.innerHTML = `
    <h2 style="font-family:inherit;font-size:2rem;margin-bottom:0.5em;">Schedule Calculator</h2>
    <div class="calc-row" style="margin-bottom:1em;">
      <label for="doublesToggle" class="form__label active-label">Doubles</label>
      <input type="checkbox" id="doublesToggle" name="doublesToggle" class="active-checkbox" checked style="margin-right:2em;" disabled>
      <label for="numCourts" style="font-size:1.1rem;font-weight:500;margin-right:1em;">Number of courts</label>
      <select id="numCourts" style="width:6em;"></select>
    </div>
    <div id="scheduleOptions"></div>
    <div id="schedulePreview" style="margin-top:2em;"></div>
    <input type="hidden" id="selectedScheduleConfig" name="selectedScheduleConfig">
  `;

  const optionsDiv = document.getElementById("scheduleOptions");
  const previewDiv = document.getElementById("schedulePreview");
  const courtsSelect = document.getElementById("numCourts");
  const hiddenInput = document.getElementById("selectedScheduleConfig");

  let configs = [];
  let filteredConfigs = [];
  let selectedIdx = null;

  fetchScheduleConfigs().then((loadedConfigs) => {
    configs = loadedConfigs;
    renderCourtsDropdown(configs);

    function updateOptions() {
      const selectedCourts = courtsSelect.value;
      filteredConfigs = filterConfigs(configs, selectedCourts);
      optionsDiv.innerHTML = renderScheduleOptions(filteredConfigs);
      previewDiv.innerHTML = "";

      // Add event listener for radio buttons
      optionsDiv
        .querySelectorAll('input[name="scheduleOption"]')
        .forEach((radio, idx) => {
          radio.addEventListener("change", function () {
            selectedIdx = idx;
            // For preview, use dummy player names if not available
            const players = Array.from(
              { length: filteredConfigs[idx].players },
              (_, i) => `Player ${i + 1}`
            );
            previewDiv.innerHTML = renderSchedulePreview(
              filteredConfigs[idx],
              players
            );
            hiddenInput.value = JSON.stringify(filteredConfigs[idx]);
          });
        });
    }

    courtsSelect.addEventListener("change", updateOptions);
  });
}

// Auto-init on DOMContentLoaded
document.addEventListener("DOMContentLoaded", function () {
  initScheduleCalculator();

  // Optional: Prevent form submission if no schedule selected
  const eventForm = document.getElementById("createEventForm");
  if (eventForm) {
    eventForm.addEventListener("submit", function (e) {
      const hiddenInput = document.getElementById("selectedScheduleConfig");
      if (!hiddenInput || !hiddenInput.value) {
        e.preventDefault();
        alert("Please select a schedule before saving the event.");
      }
    });
  }
});

// Export for module usage
export { initScheduleCalculator };
