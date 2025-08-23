/**
 * Filter schedule configs by courts and pairings.
 * If courts is undefined, returns all configs for the given pairings.
 */
export function filterConfigs(configs, courts, pairings) {
  return configs.filter(
    (cfg) =>
      (courts === undefined || cfg.courts == courts) && cfg.pairings == pairings
  );
}

/**
 * Generate dummy players for display/validation.
 */
export function generateDummyPlayers(numPlayers) {
  return Array.from({ length: numPlayers }, (_, i) => ({
    userName: `Player${i + 1}`,
    id: i + 1,
  }));
}

/**
 * Find a schedule config by courts, pairings, and rounds.
 */
export function findScheduleConfig(configs, courts, pairings, rounds) {
  return configs.find(
    (cfg) =>
      cfg.courts == courts && cfg.pairings == pairings && cfg.rounds == rounds
  );
}
