function generateDynamicSchedule(selectedBookings, config) {
  const numPlayers = selectedBookings.length;
  const courts = config.courts;
  const pairings = 2;
  const playersPerCourt = pairings * 2;
  const playersPerRound = courts * playersPerCourt;
  const totalRounds = numPlayers; // Each player rests once

  const playerIds = selectedBookings.map((p) => p.userId);

  // Helper to get player object by userId
  const getPlayer = (userId) =>
    selectedBookings.find((p) => p.userId === userId);

  // Partnership tracker

  // Backtracking function
  function backtrack(roundIdx, rounds, partnershipTracker, restsCount) {
    if (roundIdx === totalRounds) return rounds;

    // Generate possible resting combinations (spread rests)
    const numResting = numPlayers - playersPerRound;
    const allRestCombos = getRestCombos(playerIds, numResting, restsCount);

    for (const resting of allRestCombos) {
      const playing = playerIds.filter((id) => !resting.includes(id));
      const matches = getValidMatches(playing, courts, partnershipTracker);

      if (!matches) continue; // No valid matches for this rest combo

      // Update partnershipTracker and restsCount
      const newPartnershipTracker = { ...partnershipTracker };
      matches.forEach((match) => {
        const keyA = [match.teamA[0], match.teamA[1]].sort().join("-");
        const keyB = [match.teamB[0], match.teamB[1]].sort().join("-");
        newPartnershipTracker[keyA] = true;
        newPartnershipTracker[keyB] = true;
      });
      const newRestsCount = { ...restsCount };
      resting.forEach(
        (id) => (newRestsCount[id] = (newRestsCount[id] || 0) + 1)
      );

      const nextRounds = [
        ...rounds,
        {
          matches: matches.map((m, court) => ({
            teamA: m.teamA.map(getPlayer),
            teamB: m.teamB.map(getPlayer),
            court,
          })),
          standOuts: resting.map(getPlayer),
        },
      ];

      const result = backtrack(
        roundIdx + 1,
        nextRounds,
        newPartnershipTracker,
        newRestsCount
      );
      if (result) return result;
    }
    return null; // No valid schedule found
  }

  // Start backtracking
  const initialRestsCount = {};
  playerIds.forEach((id) => (initialRestsCount[id] = 0));
  const result = backtrack(0, [], {}, initialRestsCount);

  if (!result) throw new Error("No valid schedule found for these parameters.");
  return result;
}

// Helper: Generate all possible rest combinations (spread evenly)
function getRestCombos(playerIds, numResting) {
  // For simplicity, just rotate rests for now (can be improved for even spread)
  const combos = [];
  for (let i = 0; i < playerIds.length; i++) {
    combos.push(playerIds.slice(i, i + numResting));
    if (combos.length >= playerIds.length) break;
  }
  return combos;
}

// Helper: Get valid matches for playing players, given partnershipTracker
function getValidMatches(playing, courts, partnershipTracker) {
  // Generate all possible pairs
  const pairs = [];
  for (let i = 0; i < playing.length; i++) {
    for (let j = i + 1; j < playing.length; j++) {
      const key = [playing[i], playing[j]].sort().join("-");
      if (!partnershipTracker[key]) {
        pairs.push([playing[i], playing[j]]);
      }
    }
  }

  // Try to select pairs for all courts without overlap
  function selectPairs(pairs, used, result) {
    if (result.length === courts) return result;
    for (let i = 0; i < pairs.length; i++) {
      const [a, b] = pairs[i];
      if (used.has(a) || used.has(b)) continue;
      used.add(a);
      used.add(b);
      const next = selectPairs(pairs, used, [...result, [a, b]]);
      if (next) return next;
      used.delete(a);
      used.delete(b);
    }
    return null;
  }

  const selectedPairs = selectPairs(pairs, new Set(), []);
  if (!selectedPairs || selectedPairs.length !== courts * 2) return null;

  // Group pairs into matches (2 pairs per court)
  const matches = [];
  for (let i = 0; i < selectedPairs.length; i += 2) {
    matches.push({
      teamA: selectedPairs[i],
      teamB: selectedPairs[i + 1],
    });
  }
  return matches;
}

module.exports = generateDynamicSchedule;
