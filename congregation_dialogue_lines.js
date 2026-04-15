(function(global) {
  const lines = [
    "Things have been hopeless for years. We're glad you're here.",
    'To use the Prayer Bomb, hold down "C".',
    'To create a Hedge of Protection, hold down "B".',
    'To cast Divine Shot, hold down "A".',
    "To punish counter, evade a melee attack and strike back with a combo.",
    "To combo, chain sword attacks together.",
    "Your congregation grows when you protect visitors.",
    "Lost members can be won back. Stay close and keep fighting.",
    "Dash through danger, then turn and punish.",
  ];

  const ns = global.BattlechurchCongregationDialogue || (global.BattlechurchCongregationDialogue = {});
  ns.lines = lines;
})(typeof window !== "undefined" ? window : globalThis);
