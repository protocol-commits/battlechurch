(function(global) {
  const TITLE_OVERLAY_BODY = [
    "Wage war against the powers of darkness as they attack your flock with temptation, lies, and despair.",
    "You have one campaign to save the church... and the town.",
  ].join(" ");

  const PAUSE_BODY = [
    "Game paused. Take a breather, then press Continue or Space to resume.",
    "Your congregation will hold its place while you choose to keep fighting.",
  ].join(" ");

  const GAME_OVER_BODY =
    "You have no strength to continue the battle.\nThe church and the town are lost to darkness.";

  const ns = global.BattlechurchUIText || (global.BattlechurchUIText = {});
  ns.titleBody = TITLE_OVERLAY_BODY;
  ns.pauseBody = PAUSE_BODY;
  ns.gameOverBody = GAME_OVER_BODY;
})(typeof window !== "undefined" ? window : globalThis);
