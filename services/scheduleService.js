const AppError = require("../utils/appError");

/**
 * Helper to distribute rest periods as evenly and spread out as possible
 */
function distributeRests(players, numRounds, numResting) {
  const restSchedule = {};
  const totalRests = numRounds * numResting;
  const baseRests = Math.floor(totalRests / players.length);
  const extraRests = totalRests % players.length;

  players.forEach((p, i) => {
    restSchedule[p.userId] = [];
    const numPlayerRests = baseRests + (i < extraRests ? 1 : 0);
    for (let r = 0; r < numPlayerRests; r++) {
      const roundIdx =
        Math.round(((r + 1) * numRounds) / (numPlayerRests + 1)) - 1;
      restSchedule[p.userId].push(roundIdx);
    }
  });
  return restSchedule;
}

/**
 * Backtracking pairing algorithm to avoid repeat partnerships
 */
function generateRoundMatchesBT(activePlayers, numCourts, usedPairs) {
  const matches = [];
  const n = activePlayers.length;
  const maxMatches = Math.min(numCourts, Math.floor(n / 4));

  function backtrack(startIdx, currMatches, currUsedPlayers, currUsedPairs) {
    if (currMatches.length === maxMatches) {
      return currMatches;
    }
    for (let i = 0; i < n - 3; i++) {
      if (currUsedPlayers.has(i)) continue;
      for (let j = i + 1; j < n - 2; j++) {
        if (currUsedPlayers.has(j)) continue;
        for (let k = j + 1; k < n - 1; k++) {
          if (currUsedPlayers.has(k)) continue;
          for (let l = k + 1; l < n; l++) {
            if (currUsedPlayers.has(l)) continue;
            const combos = [
              [
                [i, j],
                [k, l],
              ],
              [
                [i, k],
                [j, l],
              ],
              [
                [i, l],
                [j, k],
              ],
            ];
            for (const [teamAIdx, teamBIdx] of combos) {
              const teamA = [
                activePlayers[teamAIdx[0]],
                activePlayers[teamAIdx[1]],
              ];
              const teamB = [
                activePlayers[teamBIdx[0]],
                activePlayers[teamBIdx[1]],
              ];
              const pairA = [teamA[0].userId, teamA[1].userId].sort().join("-");
              const pairB = [teamB[0].userId, teamB[1].userId].sort().join("-");
              if (currUsedPairs.has(pairA) || currUsedPairs.has(pairB))
                continue;
              currUsedPlayers.add(teamAIdx[0]);
              currUsedPlayers.add(teamAIdx[1]);
              currUsedPlayers.add(teamBIdx[0]);
              currUsedPlayers.add(teamBIdx[1]);
              currUsedPairs.add(pairA);
              currUsedPairs.add(pairB);
              currMatches.push({
                teamA: teamA.map((p) => ({
                  userId: String(p.userId),
                  name: p.userName,
                })),
                teamB: teamB.map((p) => ({
                  userId: String(p.userId),
                  name: p.userName,
                })),
                court: currMatches.length,
              });
              const result = backtrack(
                i + 1,
                currMatches,
                currUsedPlayers,
                currUsedPairs
              );
              if (result) return result;
              currMatches.pop();
              currUsedPlayers.delete(teamAIdx[0]);
              currUsedPlayers.delete(teamAIdx[1]);
              currUsedPlayers.delete(teamBIdx[0]);
              currUsedPlayers.delete(teamBIdx[1]);
              currUsedPairs.delete(pairA);
              currUsedPairs.delete(pairB);
            }
          }
        }
      }
    }
    return currMatches.length === maxMatches ? currMatches : null;
  }

  const result = backtrack(0, [], new Set(), new Set(usedPairs));
  return result || [];
}

class ScheduleService {
  /**
   * Main function to generate complete schedule for an event
   */
  generateCompleteSchedule(playersList, numOfRounds, numOfCourts, numResting) {
    if (
      !playersList ||
      playersList.length < 4 ||
      numOfRounds < 1 ||
      numOfCourts < 1
    ) {
      throw new AppError("Invalid schedule parameters", 400);
    }

    // Distribute rest periods
    const restSchedule = distributeRests(playersList, numOfRounds, numResting);

    // Track all partnerships used so far
    const usedPairs = new Set();
    const rounds = [];

    for (let round = 0; round < numOfRounds; round++) {
      // Find players resting this round
      const standOuts = playersList.filter((p) =>
        restSchedule[String(p.userId)].includes(round)
      );

      // Active players for this round
      const activePlayers = playersList.filter(
        (p) => !restSchedule[String(p.userId)].includes(round)
      );

      // Generate matches for this round using backtracking
      const matches = generateRoundMatchesBT(
        activePlayers,
        numOfCourts,
        usedPairs
      );

      // Add new partnerships to usedPairs
      matches.forEach((m) => {
        const pairA = [m.teamA[0].userId, m.teamA[1].userId].sort().join("-");
        const pairB = [m.teamB[0].userId, m.teamB[1].userId].sort().join("-");
        usedPairs.add(pairA);
        usedPairs.add(pairB);
      });

      // Ensure all players are accounted for: if not in matches, must be in standOuts
      const accountedIds = new Set([
        ...standOuts.map((p) => String(p.userId)),
        ...matches.flatMap((m) => [
          String(m.teamA[0].userId),
          String(m.teamA[1].userId),
          String(m.teamB[0].userId),
          String(m.teamB[1].userId),
        ]),
      ]);
      // If any player is missing, add them to standOuts for this round
      playersList.forEach((p) => {
        if (!accountedIds.has(String(p.userId))) {
          standOuts.push({
            userId: String(p.userId),
            name: p.userName,
          });
        }
      });

      rounds.push({
        matches,
        standOuts: standOuts.map((p) => ({
          userId: String(p.userId),
          name: p.userName,
        })),
      });
    }

    // Validate and summarize
    const validationResults = this.validateScheduleEnhanced(
      rounds,
      playersList
    );

    // Summary logging only
    if (validationResults.isValid) {
      console.log(`✅ Schedule validation passed`);
    } else {
      console.error(`❌ Schedule validation failed`);
      const partnershipViolations = validationResults.errors.filter((e) =>
        e.startsWith("Partnership violation")
      );
      console.error(
        `Total partnership violations: ${partnershipViolations.length}`
      );
      if (partnershipViolations.length > 0) {
        console.error(`First violation: ${partnershipViolations[0]}`);
      }
    }

    if (validationResults.warnings.length > 0) {
      console.warn(
        `⚠️ Warnings: ${validationResults.warnings.length} (e.g. ${validationResults.warnings[0]})`
      );
    }

    if (validationResults.stats) {
      console.log(
        `Rest distribution: min=${validationResults.stats.minRests}, max=${validationResults.stats.maxRests}, avg=${validationResults.stats.averageRests.toFixed(1)}`
      );
      console.log(
        `Play distribution: min=${validationResults.stats.minPlays}, max=${validationResults.stats.maxPlays}, avg=${validationResults.stats.averagePlays.toFixed(1)}`
      );
    }

    if (!validationResults.isValid) {
      throw new AppError(
        `Schedule validation failed: ${validationResults.errors.join(", ")}`,
        500
      );
    }

    return rounds;
  }

  /**
   * Enhanced validation with summary reporting
   */
  validateScheduleEnhanced(schedule, playersList) {
    const validationResults = {
      isValid: true,
      errors: [],
      warnings: [],
      stats: {},
    };

    try {
      const partnershipCheck = new Map();
      const restCount = new Map();
      const playCount = new Map();

      // Initialize tracking
      playersList.forEach((player) => {
        partnershipCheck.set(player.userId, new Set());
        restCount.set(player.userId, 0);
        playCount.set(player.userId, 0);
      });

      // Validate each round
      for (let roundIndex = 0; roundIndex < schedule.length; roundIndex++) {
        const round = schedule[roundIndex];
        const playingPlayers = new Set();
        const restingPlayers = new Set();

        // Track resting players
        round.standOuts.forEach((player) => {
          restingPlayers.add(player.userId);
          restCount.set(player.userId, (restCount.get(player.userId) || 0) + 1);
        });

        // Validate matches
        for (const match of round.matches) {
          const allMatchPlayers = [
            ...match.teamA.map((p) => p.userId),
            ...match.teamB.map((p) => p.userId),
          ];

          // Check for duplicate players in same match
          if (new Set(allMatchPlayers).size !== allMatchPlayers.length) {
            validationResults.errors.push(
              `Duplicate player in match in round ${roundIndex + 1}`
            );
            validationResults.isValid = false;
          }

          // Check no player is both playing and resting
          for (const playerId of allMatchPlayers) {
            if (restingPlayers.has(playerId)) {
              validationResults.errors.push(
                `Player ${playerId} is both playing and resting in round ${roundIndex + 1}`
              );
              validationResults.isValid = false;
            }
            if (playingPlayers.has(playerId)) {
              validationResults.errors.push(
                `Player ${playerId} appears in multiple matches in round ${roundIndex + 1}`
              );
              validationResults.isValid = false;
            }
            playingPlayers.add(playerId);
            playCount.set(playerId, (playCount.get(playerId) || 0) + 1);
          }

          // Check team composition (exactly 2 players per team)
          if (match.teamA.length !== 2 || match.teamB.length !== 2) {
            validationResults.errors.push(
              `Invalid team size in round ${roundIndex + 1}, court ${match.court}`
            );
            validationResults.isValid = false;
          }

          // Check partnerships
          const teamAPair = [match.teamA[0].userId, match.teamA[1].userId];
          const teamBPair = [match.teamB[0].userId, match.teamB[1].userId];

          for (const pair of [teamAPair, teamBPair]) {
            const [player1, player2] = pair;
            if (partnershipCheck.get(player1)?.has(player2)) {
              validationResults.errors.push(
                `Partnership violation: ${player1} and ${player2} play together again in round ${roundIndex + 1}`
              );
              validationResults.isValid = false;
            }
            partnershipCheck.get(player1)?.add(player2);
            partnershipCheck.get(player2)?.add(player1);
          }
        }

        // Check all eligible players are accounted for
        const totalAccountedPlayers = playingPlayers.size + restingPlayers.size;
        if (totalAccountedPlayers !== playersList.length) {
          validationResults.warnings.push(
            `Round ${roundIndex + 1}: ${totalAccountedPlayers} players accounted for, expected ${playersList.length}`
          );
        }
      }

      // Check rest distribution fairness
      const restCounts = Array.from(restCount.values());
      const minRests = Math.min(...restCounts);
      const maxRests = Math.max(...restCounts);

      if (maxRests - minRests > 1) {
        validationResults.warnings.push(
          `Uneven rest distribution: min=${minRests}, max=${maxRests}`
        );
      }

      // Check minimum play requirements
      const playCounts = Array.from(playCount.values());
      const minPlays = Math.min(...playCounts);

      if (minPlays === 0) {
        validationResults.warnings.push(
          `Some players never play during the event`
        );
      }

      // Compile statistics
      validationResults.stats = {
        totalRounds: schedule.length,
        totalPlayers: playersList.length,
        restDistribution: Object.fromEntries(restCount),
        playDistribution: Object.fromEntries(playCount),
        restVariance: maxRests - minRests,
        averageRests: restCounts.reduce((a, b) => a + b, 0) / restCounts.length,
        averagePlays: playCounts.reduce((a, b) => a + b, 0) / playCounts.length,
        minRests,
        maxRests,
        minPlays,
        maxPlays: Math.max(...playCounts),
      };

      return validationResults;
    } catch (err) {
      console.error("Error in validateScheduleEnhanced:", err);
      return {
        isValid: false,
        errors: [`Validation error: ${err.message}`],
        warnings: [],
        stats: {},
      };
    }
  }

  validateSchedule(schedule, playersList) {
    const results = this.validateScheduleEnhanced(schedule, playersList);
    return results.isValid;
  }

  analyzeSchedule(schedule, playersList) {
    const validationResults = this.validateScheduleEnhanced(
      schedule,
      playersList
    );
    return {
      isValid: validationResults.isValid,
      summary: validationResults.stats,
      issues: {
        errors: validationResults.errors,
        warnings: validationResults.warnings,
      },
      detailed: {
        restDistribution: validationResults.stats.restDistribution,
        playDistribution: validationResults.stats.playDistribution,
      },
    };
  }
}

module.exports = ScheduleService;
