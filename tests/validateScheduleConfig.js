/**
 * Validates a schedule configuration for:
 * - No repeat partnerships
 * - Balanced rests
 * - Balanced games
 * - Each player is either resting or playing in every round (no duplicates/missing)
 * - Rests are as evenly spread as possible
 * - Each player plays more than zero games and has more than zero rests
 * Returns { valid: true } if OK, or { valid: false, errors: [...] }
 */
function validateScheduleConfig(roundsConfig, playerNumbers) {
  const partnershipSet = new Set();
  const restCounts = {};
  const gameCounts = {};
  const restRounds = {};

  playerNumbers.forEach((p) => {
    restCounts[p] = 0;
    gameCounts[p] = 0;
    restRounds[p] = [];
  });

  let errors = [];

  roundsConfig.forEach((round, roundIdx) => {
    // Track rests
    round.resting.forEach((p) => {
      restCounts[p]++;
      restRounds[p].push(roundIdx + 1);
    });

    // Track games and partnerships
    round.matches.forEach((match) => {
      match.teamA.forEach((a) => gameCounts[a]++);
      match.teamB.forEach((b) => gameCounts[b]++);

      // Check partnerships in teamA
      for (let i = 0; i < match.teamA.length; i++) {
        for (let j = i + 1; j < match.teamA.length; j++) {
          const key = [match.teamA[i], match.teamA[j]].sort().join("-");
          if (partnershipSet.has(key)) {
            errors.push(
              `Players ${match.teamA[i]} and ${match.teamA[j]} are partners more than once (repeat partnership)`
            );
          }
          partnershipSet.add(key);
        }
      }
      // Check partnerships in teamB
      for (let i = 0; i < match.teamB.length; i++) {
        for (let j = i + 1; j < match.teamB.length; j++) {
          const key = [match.teamB[i], match.teamB[j]].sort().join("-");
          if (partnershipSet.has(key)) {
            errors.push(
              `Players ${match.teamB[i]} and ${match.teamB[j]} are partners more than once (repeat partnership)`
            );
          }
          partnershipSet.add(key);
        }
      }
    });

    // Check that every player appears exactly once per round
    const allPlayersThisRound = new Set();
    round.resting.forEach((p) => allPlayersThisRound.add(p));
    round.matches.forEach((match) => {
      match.teamA.forEach((p) => allPlayersThisRound.add(p));
      match.teamB.forEach((p) => allPlayersThisRound.add(p));
    });
    if (allPlayersThisRound.size !== playerNumbers.length) {
      errors.push(
        `Round ${roundIdx + 1} does not include all players exactly once.`
      );
    }
  });

  // Check balanced rests/games
  const restVals = Object.values(restCounts);
  const gameVals = Object.values(gameCounts);
  const minRest = Math.min(...restVals);
  const maxRest = Math.max(...restVals);
  const minGame = Math.min(...gameVals);
  const maxGame = Math.max(...gameVals);

  if (minRest !== maxRest) {
    errors.push(
      `Players do not have balanced rests: ${JSON.stringify(restCounts)}`
    );
  }
  if (minGame !== maxGame) {
    errors.push(
      `Players do not have balanced games: ${JSON.stringify(gameCounts)}`
    );
  }

  // Check that each player plays >0 games and has >0 rests
  playerNumbers.forEach((p) => {
    if (gameCounts[p] === 0) {
      errors.push(`Player ${p} does not play any games.`);
    }
    if (restCounts[p] === 0) {
      errors.push(`Player ${p} does not have any rests.`);
    }
  });

  // Check even spread of rests (difference between consecutive rest rounds should be as small as possible)
  playerNumbers.forEach((p) => {
    const rounds = restRounds[p];
    if (rounds.length > 1) {
      for (let i = 1; i < rounds.length; i++) {
        const diff = rounds[i] - rounds[i - 1];
        if (diff < 1 || diff > Math.ceil(roundsConfig.length / restCounts[p])) {
          errors.push(
            `Player ${p} has rests that are not evenly spread: ${rounds}`
          );
          break;
        }
      }
    }
  });

  return errors.length === 0 ? { valid: true } : { valid: false, errors };
}

module.exports = validateScheduleConfig;
