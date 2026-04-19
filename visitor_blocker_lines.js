(function(global) {
  const blockerLines = [
    "Look at my cat photos.",
    "Listen to my long story.",
    "Dream I gotta share!",
    "Check out this meme!",
    "Want to hear a pun?",
    "Here's all 1,000 of my vacation pics!",
    "Does this look infected?",
    "A story about someone you don't know.",
  ];

  const ns = global.BattlechurchVisitorBlocker || (global.BattlechurchVisitorBlocker = {});
  ns.blockerLines = blockerLines;
})(typeof window !== "undefined" ? window : globalThis);
