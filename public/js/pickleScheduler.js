const { filter } = require("compression");

exports.const = generateStandOutsPubJs = (
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

exports.const = generateAvailablePairingsPubJs = (playersList) => {
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

exports.const = generateSchedulePubJs = (
  availablePairings,
  standOuts,
  numOfRounds
) => {
  for (let i = 0; i < standOuts.length - 1; i++) {
    let schedule = availablePairings.filter(
      (element) =>
        !standOuts[i].includes(element.playerA) &&
        !standOuts[i].includes(element.playerB) &&
        element.pairingUsed === false
    );
    console.log(standOuts, schedule);
  }
};

const playersList = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const numStandOuts = 3;
const numOfRounds = 11;
let standOuts = [];

standOuts = generateStandOutsPubJs(playersList, numOfRounds, numStandOuts);
availablePairings = generateAvailablePairingsPubJs(playersList);
schedule = generateSchedulePubJs(availablePairings, standOuts, numOfRounds);
