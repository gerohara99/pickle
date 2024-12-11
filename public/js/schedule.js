// Declare variables
const aPlayers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
const numAcourts = 1;
const capacityAcourts = 8; // Number of players on an A court per round
const eventDurationMins = 150;
const gameDurationMins = 10;
const numOfRounds = Math.floor(eventDurationMins / gameDurationMins);
const aNumStandOuts = aPlayers.length - capacityAcourts;
let standOutsPerRound = [];

// Calculate Standouts
let roundsFilled = false;
let i = 0;
let startSlice = 0;
let playersLeft;
let diff;

do {
  playersLeft = aPlayers.length - startSlice;

  if (playersLeft <= aNumStandOuts) {
    playersFromNext = aNumStandOuts - playersLeft;
    standOutsPerRound[i] = [].concat(
      aPlayers.slice(-playersLeft),
      aPlayers.slice(0, playersFromNext)
    );
    startSlice = playersFromNext;
  } else {
    standOutsPerRound[i] = aPlayers.slice(
      startSlice,
      startSlice + aNumStandOuts
    );
    startSlice += aNumStandOuts;
  }
  if (i === numOfRounds) roundsFilled = true;
  i++;
} while (!roundsFilled);

//Calcualte roud robin
