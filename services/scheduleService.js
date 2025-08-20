const AppError = require("../utils/appError");

class ScheduleService {
  constructor() {
    this.partnershipTracker = new Map();
    this.restTracker = new Map();
  }

  /**
   * Main function to generate complete schedule for an event
   */
  generateCompleteSchedule(playersList, numOfRounds, numOfCourts, numStandouts) {
    try {
      if (!this.validateInputs(playersList, numOfRounds, numOfCourts)) {
        return null;
      }

      this.initializeTrackers(playersList);
      const schedule = [];

      for (let round = 0; round < numOfRounds; round++) {
        const roundSchedule = this.generateRoundSchedule(
          playersList,
          numOfCourts,
          numStandouts,
          round
        );
        
        if (!roundSchedule) {
          throw new AppError(`Failed to generate schedule for round ${round}`, 500);
        }
        
        schedule.push(roundSchedule);
      }

      // Use enhanced validation
      const validationResults = this.validateScheduleEnhanced(schedule, playersList);
      
      if (!validationResults.isValid) {
        throw new AppError(`Schedule validation failed: ${validationResults.errors.join(', ')}`, 500);
      }

      return schedule;
    } catch (err) {
      console.error("Error in generateCompleteSchedule:", err);
      throw err;
    }
  }

  /**
   * Calculate optimal number of standouts based on courts and players
   */
  calculateOptimalStandouts(totalPlayers, numCourts) {
    const playersPerMatch = 4; // 2 vs 2
    const maxPlayingPlayers = numCourts * playersPerMatch;
    return Math.max(0, totalPlayers - maxPlayingPlayers);
  }

  /**
   * Validate inputs for schedule generation
   */
  validateInputs(playersList, numOfRounds, numOfCourts) {
    if (!playersList || playersList.length < 4) {
      console.error("Need at least 4 players to generate schedule");
      return false;
    }
    if (numOfRounds < 1 || numOfCourts < 1) {
      console.error("Invalid number of rounds or courts");
      return false;
    }
    return true;
  }

  /**
   * Initialize tracking maps for partnerships and rest counts
   */
  initializeTrackers(playersList) {
    this.partnershipTracker.clear();
    this.restTracker.clear();
    
    playersList.forEach(player => {
      this.partnershipTracker.set(player.userId, new Set());
      this.restTracker.set(player.userId, 0);
    });
  }

  /**
   * Generate schedule for a single round
   */
  generateRoundSchedule(playersList, numOfCourts, numStandouts, roundNumber) {
    try {
      // Select players to rest this round
      const standoutPlayers = this.selectStandoutPlayers(playersList, numStandouts);
      
      // Get playing players
      const playingPlayers = playersList.filter(
        player => !standoutPlayers.some(standout => standout.userId === player.userId)
      );

      // Generate matches for this round
      const matches = this.generateRoundMatches(playingPlayers, numOfCourts);
      
      if (!matches) {
        return null;
      }

      // Update tracking
      this.updatePartnershipTracker(matches);
      this.updateRestTracker(standoutPlayers);

      return {
        matches: matches,
        standOuts: standoutPlayers.map(player => ({
          userId: String(player.userId),
          name: player.userName
        }))
      };
    } catch (err) {
      console.error("Error in generateRoundSchedule:", err);
      return null;
    }
  }

  /**
   * Select players to rest, prioritizing fair distribution
   */
  selectStandoutPlayers(playersList, numStandouts) {
    if (numStandouts === 0) return [];
    
    // Sort players by rest count (ascending) for fair distribution
    const sortedPlayers = [...playersList].sort((a, b) => {
      const restDiff = this.restTracker.get(a.userId) - this.restTracker.get(b.userId);
      if (restDiff !== 0) return restDiff;
      // If equal rest, use player order for consistent round-robin
      return playersList.indexOf(a) - playersList.indexOf(b);
    });

    return sortedPlayers.slice(0, numStandouts);
  }

  /**
   * Generate matches for playing players in a round
   */
  generateRoundMatches(playingPlayers, numOfCourts) {
    try {
      if (playingPlayers.length < 4) {
        return []; // Not enough players for any matches
      }

      const matches = [];
      const usedPlayers = new Set();
      const maxMatches = Math.min(numOfCourts, Math.floor(playingPlayers.length / 4));

      for (let court = 0; court < maxMatches; court++) {
        const match = this.findBestMatch(playingPlayers, usedPlayers);
        
        if (!match) {
          break; // Can't create more valid matches
        }

        matches.push({
          teamA: [
            { userId: match.teamA[0].userId, name: match.teamA[0].userName },
            { userId: match.teamA[1].userId, name: match.teamA[1].userName }
          ],
          teamB: [
            { userId: match.teamB[0].userId, name: match.teamB[0].userName },
            { userId: match.teamB[1].userId, name: match.teamB[1].userName }
          ],
          court: court,
          teamAScore: 0,
          teamBScore: 0
        });

        // Mark players as used
        match.teamA.forEach(player => usedPlayers.add(player.userId));
        match.teamB.forEach(player => usedPlayers.add(player.userId));
      }

      return matches;
    } catch (err) {
      console.error("Error in generateRoundMatches:", err);
      return null;
    }
  }

  /**
   * Find the best match combination with no repeated partnerships
   */
  findBestMatch(playingPlayers, usedPlayers) {
    const availablePlayers = playingPlayers.filter(
      player => !usedPlayers.has(player.userId)
    );

    if (availablePlayers.length < 4) return null;

    // Try to find the best combination with no repeated partnerships
    for (let i = 0; i < availablePlayers.length - 3; i++) {
      for (let j = i + 1; j < availablePlayers.length - 2; j++) {
        for (let k = j + 1; k < availablePlayers.length - 1; k++) {
          for (let l = k + 1; l < availablePlayers.length; l++) {
            const players = [
              availablePlayers[i],
              availablePlayers[j],
              availablePlayers[k],
              availablePlayers[l]
            ];

            // Try different team combinations
            const combinations = [
              { teamA: [players[0], players[1]], teamB: [players[2], players[3]] },
              { teamA: [players[0], players[2]], teamB: [players[1], players[3]] },
              { teamA: [players[0], players[3]], teamB: [players[1], players[2]] }
            ];

            for (const combo of combinations) {
              if (this.isValidMatch(combo)) {
                return combo;
              }
            }
          }
        }
      }
    }

    // If no perfect match found, return the first available combination
    // (fallback to ensure schedule generation doesn't fail)
    if (availablePlayers.length >= 4) {
      return {
        teamA: [availablePlayers[0], availablePlayers[1]],
        teamB: [availablePlayers[2], availablePlayers[3]]
      };
    }

    return null;
  }

  /**
   * Check if a match is valid (no repeated partnerships)
   */
  isValidMatch(match) {
    // Check if any players in teamA have played together before
    const teamAPlayer1 = match.teamA[0].userId;
    const teamAPlayer2 = match.teamA[1].userId;
    if (this.partnershipTracker.get(teamAPlayer1).has(teamAPlayer2)) {
      return false;
    }

    // Check if any players in teamB have played together before
    const teamBPlayer1 = match.teamB[0].userId;
    const teamBPlayer2 = match.teamB[1].userId;
    if (this.partnershipTracker.get(teamBPlayer1).has(teamBPlayer2)) {
      return false;
    }

    return true;
  }

  /**
   * Update partnership tracking after matches are created
   */
  updatePartnershipTracker(matches) {
    matches.forEach(match => {
      // Record teamA partnership
      const teamAPlayer1 = match.teamA[0].userId;
      const teamAPlayer2 = match.teamA[1].userId;
      this.partnershipTracker.get(teamAPlayer1).add(teamAPlayer2);
      this.partnershipTracker.get(teamAPlayer2).add(teamAPlayer1);

      // Record teamB partnership
      const teamBPlayer1 = match.teamB[0].userId;
      const teamBPlayer2 = match.teamB[1].userId;
      this.partnershipTracker.get(teamBPlayer1).add(teamBPlayer2);
      this.partnershipTracker.get(teamBPlayer2).add(teamBPlayer1);
    });
  }

  /**
   * Update rest tracking for standout players
   */
  updateRestTracker(standoutPlayers) {
    standoutPlayers.forEach(player => {
      const currentRests = this.restTracker.get(player.userId) || 0;
      this.restTracker.set(player.userId, currentRests + 1);
    });
  }

  /**
   * Enhanced validation with detailed reporting
   */
  validateScheduleEnhanced(schedule, playersList) {
    const validationResults = {
      isValid: true,
      errors: [],
      warnings: [],
      stats: {}
    };

    try {
      const partnershipCheck = new Map();
      const restCount = new Map();
      const playCount = new Map();
      
      // Initialize tracking
      playersList.forEach(player => {
        partnershipCheck.set(player.userId, new Set());
        restCount.set(player.userId, 0);
        playCount.set(player.userId, 0);
      });

      // TEST 1: Validate each round
      for (let roundIndex = 0; roundIndex < schedule.length; roundIndex++) {
        const round = schedule[roundIndex];
        const playingPlayers = new Set();
        const restingPlayers = new Set();

        // Track resting players
        round.standOuts.forEach(player => {
          if (restingPlayers.has(player.userId)) {
            validationResults.errors.push(`Duplicate rest entry for player ${player.userId} in round ${roundIndex}`);
            validationResults.isValid = false;
          }
          restingPlayers.add(player.userId);
          restCount.set(player.userId, (restCount.get(player.userId) || 0) + 1);
        });

        // Validate matches
        for (const match of round.matches) {
          const allMatchPlayers = [
            ...match.teamA.map(p => p.userId),
            ...match.teamB.map(p => p.userId)
          ];

          // TEST 2: Check for duplicate players in same match
          if (new Set(allMatchPlayers).size !== allMatchPlayers.length) {
            validationResults.errors.push(`Duplicate player in match in round ${roundIndex}`);
            validationResults.isValid = false;
          }

          // TEST 3: Check no player is both playing and resting
          for (const playerId of allMatchPlayers) {
            if (restingPlayers.has(playerId)) {
              validationResults.errors.push(`Player ${playerId} is both playing and resting in round ${roundIndex}`);
              validationResults.isValid = false;
            }
            if (playingPlayers.has(playerId)) {
              validationResults.errors.push(`Player ${playerId} appears in multiple matches in round ${roundIndex}`);
              validationResults.isValid = false;
            }
            playingPlayers.add(playerId);
            playCount.set(playerId, (playCount.get(playerId) || 0) + 1);
          }

          // TEST 4: Check team composition (exactly 2 players per team)
          if (match.teamA.length !== 2 || match.teamB.length !== 2) {
            validationResults.errors.push(`Invalid team size in round ${roundIndex}, court ${match.court}`);
            validationResults.isValid = false;
          }

          // TEST 5: Check partnerships
          const teamAPair = [match.teamA[0].userId, match.teamA[1].userId];
          const teamBPair = [match.teamB[0].userId, match.teamB[1].userId];

          for (const pair of [teamAPair, teamBPair]) {
            const [player1, player2] = pair;
            if (partnershipCheck.get(player1)?.has(player2)) {
              validationResults.errors.push(`Partnership violation: ${player1} and ${player2} play together again in round ${roundIndex}`);
              validationResults.isValid = false;
            }
            partnershipCheck.get(player1)?.add(player2);
            partnershipCheck.get(player2)?.add(player1);
          }
        }

        // TEST 6: Check all eligible players are accounted for
        const totalAccountedPlayers = playingPlayers.size + restingPlayers.size;
        if (totalAccountedPlayers !== playersList.length) {
          validationResults.warnings.push(`Round ${roundIndex}: ${totalAccountedPlayers} players accounted for, expected ${playersList.length}`);
        }
      }

      // TEST 7: Check rest distribution fairness
      const restCounts = Array.from(restCount.values());
      const minRests = Math.min(...restCounts);
      const maxRests = Math.max(...restCounts);
      
      if (maxRests - minRests > 1) {
        validationResults.warnings.push(`Uneven rest distribution: min=${minRests}, max=${maxRests}`);
      }

      // TEST 8: Check minimum play requirements
      const playCounts = Array.from(playCount.values());
      const minPlays = Math.min(...playCounts);
      
      if (minPlays === 0) {
        validationResults.warnings.push(`Some players never play during the event`);
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
        maxPlays: Math.max(...playCounts)
      };

      // Log results
      if (validationResults.isValid) {
        console.log("✅ Schedule validation passed");
        console.log("📊 Schedule Statistics:");
        console.log(`   - Total rounds: ${validationResults.stats.totalRounds}`);
        console.log(`   - Total players: ${validationResults.stats.totalPlayers}`);
        console.log(`   - Rest distribution: min=${minRests}, max=${maxRests}, avg=${validationResults.stats.averageRests.toFixed(1)}`);
        console.log(`   - Play distribution: min=${validationResults.stats.minPlays}, max=${validationResults.stats.maxPlays}, avg=${validationResults.stats.averagePlays.toFixed(1)}`);
        console.log(`   - Rest variance: ${validationResults.stats.restVariance}`);
      } else {
        console.error("❌ Schedule validation failed");
        console.error("Errors:", validationResults.errors);
      }
      
      if (validationResults.warnings.length > 0) {
        console.warn("⚠️ Warnings:", validationResults.warnings);
      }

      return validationResults;
    } catch (err) {
      console.error("Error in validateScheduleEnhanced:", err);
      return {
        isValid: false,
        errors: [`Validation error: ${err.message}`],
        warnings: [],
        stats: {}
      };
    }
  }

  /**
   * Basic validation function (kept for backwards compatibility)
   */
  validateSchedule(schedule, playersList) {
    const results = this.validateScheduleEnhanced(schedule, playersList);
    return results.isValid;
  }

  /**
   * Get detailed schedule analysis for debugging
   */
  analyzeSchedule(schedule, playersList) {
    const validationResults = this.validateScheduleEnhanced(schedule, playersList);
    return {
      isValid: validationResults.isValid,
      summary: validationResults.stats,
      issues: {
        errors: validationResults.errors,
        warnings: validationResults.warnings
      },
      detailed: {
        restDistribution: validationResults.stats.restDistribution,
        playDistribution: validationResults.stats.playDistribution
      }
    };
  }
}

module.exports = ScheduleService;