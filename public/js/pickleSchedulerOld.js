const { filter } = require("compression");

exports.const = generateStandOuts = (
  playersList,
  numOfRounds,
  numStandOuts
) => {
  // Calculate Standouts
  let roundsFilled = false;
  let i = 0;
  let startSlice = 0;
  let playersLeft;
  let standOutsPerRound = [];

  do {
    playersLeft = playersList.length - startSlice;

    if (playersLeft <= numStandOuts) {
      playersFromNext = numStandOuts - playersLeft;
      standOutsPerRound[i] = [].concat(
        playersList.slice(-playersLeft),
        playersList.slice(0, playersFromNext)
      );
      startSlice = playersFromNext;
    } else {
      standOutsPerRound[i] = playersList.slice(
        startSlice,
        startSlice + numStandOuts
      );
      startSlice += numStandOuts;
    }
    i === numOfRounds - 1 ? (roundsFilled = true) : i++;
  } while (!roundsFilled);
  return standOutsPerRound;
};

exports.const = generateAvailablePairings = (playersList) => {
  // Declare variables
  const DUMMY = -1;
  let avaibalePairings = [];

  if (!playersList) return -1;

  if (playersList.length % 2 === 1) {
    playersList.push(DUMMY); // so we can match algorithm for even numbers
  }
  for (let j = 0; j < playersList.length - 1; j += 1) {
    for (let i = 0; i < playersList.length / 2; i += 1) {
      const o = playersList.length - 1 - i;
      if (playersList[i] !== DUMMY && playersList[o] !== DUMMY) {
        avaibalePairings.push({
          playerA: playersList[o],
          playerB: playersList[i],
          pairingUsed: false,
        });
      }
    }
    playersList.splice(1, 0, playersList.pop()); // permutate for next round
  }
  return avaibalePairings;
};

exports.const = generateSchedule = (
  availablePairings,
  standOuts,
  numOfRounds,
  numOfCourts,
  numOfPairingsPerCourt
) => {
  let schedule = [];
  // Generate schedule for each round
  for (let roundCounter = 0; roundCounter < numOfRounds; roundCounter++) {
    schedule.push({
      round: roundCounter,
      standOuts: standOuts[roundCounter],
    });

    // Assign Players to each court
    for (let courtCounter = 0; courtCounter < numOfCourts; courtCounter++) {
      // Only select players that are not assinged stand outs for this round
      schedule[roundCounter].courts[courtCounter].courtNumber = courtCounter;
      schedule[roundCounter].courts.pairings = availablePairings
        .filter(
          (element) =>
            !standOuts[roundCounter].includes(element.playerA) &&
            !standOuts[roundCounter].includes(element.playerB) &&
            element.pairingUsed === false
        )
        .slice(0, numOfPairingsPerCourt);
    }
  }
};

const playersList = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
let standOuts = [];
const numStandOuts = 3;
const numOfRounds = 11;
const numOfCourts = 2;
const numOfPairingsPerCourt = 2;
standOuts = generateStandOuts(playersList, numOfRounds, numStandOuts);
availablePairings = generateAvailablePairings(playersList);
schedule = generateSchedule(
  availablePairings,
  standOuts,
  numOfRounds,
  numOfCourts,
  numOfPairingsPerCourt
);
