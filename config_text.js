/**
 * Central text source for canvas/UI labels.
 * Edit copy here first; legacy BattlechurchUIText is derived from this object.
 */
(function(global) {
  const GameText = {
    screens: {
      title: {
        body: [
          "Wage war against the powers of darkness as they attack your flock with temptation, lies, and despair.",
          "You have one campaign to plant churches in these towns... and drive back the darkness.",
        ].join(" "),
      },
      pause: {
        body: [
          "Game paused. Take a breather, then press Continue or Space to resume.",
          "Your congregation will hold its place while you choose to keep fighting.",
        ].join(" "),
      },
      gameOver: {
        body: "You have no strength to continue the battle.\nThe church plant and the town are lost to darkness.",
      },
      howToPlay: {
        title: "How to Play",
      },
      movesList: {
        title: "Moves List",
        hint: "Press Escape or Back to close",
        colSword: "Sword (A)",
        colDash: "Dash (B)",
        colPrayer: "Prayer (C)",
      },
    },

    hud: {
      congregation: "CONGREGATION",
      health: "Health",
      maxChain: "Max Chain:",
      bossStageTitle: "Personal Struggles",
      defaultMissionTitle: "the crisis",
    },

    weapons: {
      modes: {
        wisdom_missle: "Apply Wisdom",
        faith_cannon: "Act in Faith",
        fire: "Quote Scripture",
        heart: "Heart Charm",
        arrow: "",
      },
    },

    // Names shown in HUD meters/chips for church weapon effects.
    skills: {
      spreadGun: "Tracer",
      halo: "Halo",
      spear: "Lance",
      sentry: "Sentry",
    },

    buttons: {
      continue: "Continue",
      restart: "Press Space to Restart",
    },
  };

  global.GameText = GameText;

  // Legacy compat path used by existing pause/title/game-over consumers.
  const legacyNs = global.BattlechurchUIText || (global.BattlechurchUIText = {});
  legacyNs.titleBody = GameText.screens.title.body;
  legacyNs.pauseBody = GameText.screens.pause.body;
  legacyNs.gameOverBody = GameText.screens.gameOver.body;
})(typeof window !== "undefined" ? window : globalThis);
