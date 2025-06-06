const generateStandOutsPubJs = (playersList, numOfRounds, numStandOuts) => {
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

exports.const = generateSchedulePubJs = (availablePairings, standOuts) => {
  let schedule = { rounds: [] };
  let availablePairing = availablePairings;

  for (let i = 0; i < standOuts.length; i++) {
    let pairingsUsed = 0;
    let pairings = [];
    for (let j = 0; j < availablePairing.length; j++) {
      if (
        !standOuts[i].includes(availablePairing[j].playerA) &&
        !standOuts[i].includes(availablePairing[j].playerB) &&
        availablePairing[j].pairingUsed === false
      ) {
        if (pairingsUsed < numPairings) {
          pairings.push({
            playerA: availablePairing[j].playerA,
            playerB: availablePairing[j].playerB,
          });
          availablePairing[j].pairingUsed = true;
          pairingsUsed++;
        } else {
          schedule.rounds.push({
            round: i,
            players: pairings,
            standouts: standOuts[i],
          });
          j = 99;
        }
      }
    }
  }
  return schedule;
};

exports.const = main = (event) => {
  const playersList = event.bookings;
  let standOuts = [];
  const numStandOuts = process.env.NUM_STANDOUTS;
  const numOfRounds = process.env.NUM_OF_ROUNDS;
  const numPairings = process.env.NUM_PAIRINGS;

  console.log("Inside scheduler !!!!!");
  console.log("Event:", event);
  console.log(playersList);
  console.log(numStandOuts, numOfRounds, numPairings);

  //const playersList = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  //standOuts = generateStandOutsPubJs(playersList, numOfRounds, numStandOuts);
  //availablePairings = generateAvailablePairingsPubJs(playersList);
  //schedule = generateSchedulePubJs(availablePairings, standOuts, numPairings);

  return schedule;
};
