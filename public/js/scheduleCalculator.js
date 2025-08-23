async function fetchScheduleConfigs() {
  const response = await fetch("/js/schedules.json");
  return await response.json();
}

function renderCourtsDropdown(configs, pairings) {
  const courtsSet = new Set(
    configs.filter((cfg) => cfg.pairings == pairings).map((cfg) => cfg.courts)
  );
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

function renderScheduleOptions(configs, selectedCourts, pairings) {
  const filtered = configs.filter(
    (cfg) => cfg.courts == selectedCourts && cfg.pairings == pairings
  );
  if (filtered.length === 0)
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
        </tr>
      </thead>
      <tbody>
        ${filtered
          .map(
            (cfg, idx) => `
          <tr>
            <td>
              <input type="radio" class="schedule-radio" name="scheduleOption" value="${idx}">
            </td>
            <td>${cfg.players}</td>
            <td>${cfg.rounds}</td>
            <td>${cfg.gamesPerPlayer}</td>
            <td>${cfg.restsPerPlayer}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderSchedulePreview(cfg) {
  let html = `<h3>Schedule Preview</h3>
    <p><strong>Courts:</strong> ${cfg.courts} &nbsp; 
       <strong>Pairings/Court:</strong> ${cfg.pairings} &nbsp; 
       <strong>Players:</strong> ${cfg.players} &nbsp; 
       <strong>Rounds:</strong> ${cfg.rounds} &nbsp; 
       <strong>Games/Player:</strong> ${cfg.gamesPerPlayer} &nbsp; 
       <strong>Rests/Player:</strong> ${cfg.restsPerPlayer}</p>
    <table class="modal-schedule-table">
      <thead>
        <tr>
          <th>Player</th>
          <th>Rounds Played</th>
          <th>Rounds Resting</th>
        </tr>
      </thead>
      <tbody>`;
  for (let i = 0; i < cfg.players; i++) {
    html += `<tr>
      <td class="player-name">Player ${i + 1}</td>
      <td class="games-played">${cfg.playerRounds[i].played.join(", ") || "-"}</td>
      <td class="rests">${cfg.playerRounds[i].resting.join(", ") || "-"}</td>
    </tr>`;
  }
  html += `</tbody></table>`;
  return html;
}

export async function initScheduleCalculator() {
  const optionsDiv = document.getElementById("scheduleOptions");
  const previewDiv = document.getElementById("schedulePreview");
  const confirmBtn = document.getElementById("confirmScheduleBtn");
  const courtsSelect = document.getElementById("numCourts");
  const doublesToggle = document.getElementById("doublesToggle");

  const configs = await fetchScheduleConfigs();

  let pairings = 2; // Default to doubles
  renderCourtsDropdown(configs, pairings);

  let filteredConfigs = [];
  let selectedIdx = null;

  function updateOptions() {
    const selectedCourts = courtsSelect.value;
    optionsDiv.innerHTML = renderScheduleOptions(
      configs,
      selectedCourts,
      pairings
    );
    previewDiv.innerHTML = "";
    confirmBtn.disabled = true;
    filteredConfigs = configs.filter(
      (cfg) => cfg.courts == selectedCourts && cfg.pairings == pairings
    );

    // Add event listener for radio buttons
    optionsDiv
      .querySelectorAll('input[name="scheduleOption"]')
      .forEach((radio, idx) => {
        radio.addEventListener("change", function () {
          selectedIdx = idx;
          previewDiv.innerHTML = renderSchedulePreview(filteredConfigs[idx]);
          confirmBtn.disabled = false;
        });
      });
  }

  courtsSelect.addEventListener("change", updateOptions);

  doublesToggle.addEventListener("change", function () {
    pairings = doublesToggle.checked ? 2 : 1;
    renderCourtsDropdown(configs, pairings);
    optionsDiv.innerHTML = "";
    previewDiv.innerHTML = "";
    confirmBtn.disabled = true;
  });

  confirmBtn.addEventListener("click", function () {
    if (selectedIdx !== null && filteredConfigs[selectedIdx]) {
      const cfg = filteredConfigs[selectedIdx];
      alert(
        `Schedule confirmed!\nCourts: ${cfg.courts}\nPairings/Court: ${cfg.pairings}\nPlayers: ${cfg.players}\nRounds: ${cfg.rounds}`
      );
      // Further logic here
    }
  });

  confirmBtn.disabled = true;
}

document.addEventListener("DOMContentLoaded", () => {
  initScheduleCalculator();
});
