const aPlayers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
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
let nettPlayersPerRound = [];

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

// Calculate round robin
const DUMMY = -1;
// returns an array of round representations (array of player pairs).
// http://en.wikipedia.org/wiki/Round-robin_tournament#Scheduling_algorithm

const rs = []; // rs = round array
n = aPlayers.length;

if (n % 2 === 1) {
  aPlayers.push(DUMMY); // so we can match algorithm for even numbers
  n += 1;
}
for (let j = 0; j < n - 1; j += 1) {
  rs[j] = []; // create inner match array for round j
  for (let i = 0; i < n / 2; i += 1) {
    const o = n - 1 - i;
    if (aPlayers[i] !== DUMMY && aPlayers[o] !== DUMMY) {
      rs[j].push([aPlayers[o], aPlayers[i]]);
    }
  }
  console.log("aPlayers Before: ", aPlayers);
  aPlayers.splice(1, 0, aPlayers.pop()); // permutate for next round
  console.log("aPlayers Afterword: ", aPlayers);
}
