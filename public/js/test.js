let schedule = [];

schedule.push({
  round: 0,
  courts: [
    {
      players: 1,
    },
  ],
});

schedule[0].courts[0] = 1;
console.log(schedule.courts[0].players);
