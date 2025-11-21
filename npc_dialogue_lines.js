(function(global) {
  const struggleLines = [
    "I've messed up too much.",
    "It's too late for me.",
    "Nobody would forgive me.",
    "I can't change.",
    "I'm not worth saving.",
    "I don't deserve peace.",
    "This is just who I am.",
    "I'll deal with it later.",
    "No one cares anyway.",
    "I'm alone in this.",
    "I don't need help.",
    "I've already gone too far.",
    "I'll never be free of this.",
    "It's easier to just give in.",
    "I'll never measure up.",
    "I'm fooling myself.",
    "There's no point in trying.",
    "I'm too broken.",
  ];

  const returnLines = [
    "I'll give it another shot.",
    "Alright... I'm staying.",
    "Okay, I'm back.",
    "Guess I'm not done yet.",
    "Fine. One more try.",
    "Alright, I'll come back.",
    "Maybe there's hope still.",
    "I'm not quitting yet.",
    "Okay... I'll stay.",
    "Let's try again.",
    "You're right. I belong here.",
    "I've missed this place.",
    "Alright, you win.",
    "I'm in. For now.",
    "Okay, I'll show up Sunday.",
    "Maybe God's not done.",
    "I'll stick around.",
    "Fine, I'll try again.",
    "Okay. I'm not leaving.",
  ];

  const ns = global.BattlechurchNpcDialogue || (global.BattlechurchNpcDialogue = {});
  ns.struggleLines = struggleLines;
  ns.returnLines = returnLines;
})(typeof window !== "undefined" ? window : globalThis);
