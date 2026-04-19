/**
 * text_content.js
 * ===============
 * Centralized text content for Battlechurch.
 *
 * FOR WRITERS & DESIGNERS:
 * - Edit text here without touching game logic
 * - All in-game text, labels, and messages live in this file
 *
 * FOR DEVELOPERS:
 * - Access via window.GameText.* (e.g., GameText.screens.title.body)
 * - Add new text categories as needed
 */
(function(global) {
  const GameText = {
    // =====================
    // SCREEN TEXT
    // =====================
    screens: {
      title: {
        body: [
          "Wage war against the powers of darkness as they attack your flock with temptation, lies, and despair.",
          "You have one campaign to save the church... and the town.",
        ].join(" "),
      },
      pause: {
        body: [
          "Game paused. Take a breather, then press Continue or Space to resume.",
          "Your congregation will hold its place while you choose to keep fighting.",
        ].join(" "),
      },
      gameOver: {
        body: "You have no strength to continue the battle.\nThe church and the town are lost to darkness.",
      },
      map: {
        tagline: "",
        altTagline: "Smite the hordes, save your flock, grow your church, save the town.",
      },
    },

    // =====================
    // MISSION TEXT
    // =====================
    battleActs: {
      1: "Mission I: Foothold",
      2: "Mission II: Repel",
      3: "Mission III: Breakthrough",
    },
    actVillainText: {
      1: "Win 3 battles to secure a foothold",
      2: "Repel 3 enemy counterattacks",
      3: "Win 3 battles to break through enemy lines",
    },

    // =====================
    // HUD LABELS
    // =====================
    hud: {
      // Section headers
      player: "PLAYER",
      congregation: "CONGREGATION",
      health: "Health",
      mission: "Battle",

      // Meters
      prayerMeterLabels: ["Prayer", "2", "3"],
      dash: "DASH",
      maxCombo: "Max Combo:",

      // Boss stage fallback
      bossStageTitle: "Personal Struggles",
      defaultMissionTitle: "the crisis",
    },

    // =====================
    // WEAPONS
    // =====================
    weapons: {
      // Player weapon modes
      modes: {
        wisdom_missle: "Apply Wisdom",
        faith_cannon: "Act in Faith",
        fire: "Quote Scripture",
        heart: "Heart Charm",
        arrow: "", // Default, no label
      },
    },

    // =====================
    // SKILLS/UPGRADES
    // =====================
    skills: {
      spreadGun: "Spread Gun",
      halo: "Halo",
      spear: "Spear",
      sentry: "Sentry",
      shieldOfFaith: "Shield of Faith",
      haste: "Quicken",
      swordOfTheSpirit: "Perseverance (extends weapons)",
      encourageOneAnother: "Encourage One Another",
    },

    // =====================
    // BUTTONS
    // =====================
    buttons: {
      continue: "Continue",
      undo: "Undo",
      restart: "Press Space to Restart",
    },

    // =====================
    // VISITATION HOUR
    // =====================
    visitation: {
      title: "Visitation Hour",
      timesUp: "Time's Up! Welcome new members!",
      noNewMembers: "No new members this round.",
    },

    // =====================
    // CONGREGATION OVERLAY
    // =====================
    congregation: {
      title: "CONGREGATION",
      count: "COUNT",
      countLabel: "COUNT:",
    },

    // =====================
    // MULTIPLIER TAGS
    // =====================
    multiplierTags: {
      damage: "DMG",
      cooldown: "CD",
      speed: "SPD",
    },

    // =====================
    // CHURCH POWERUP SKILL NAMES (HUD meters)
    // =====================
    skills: {
      spreadGun: "Small Groups",
      halo: "Prayer Team",
      spear: "Care Team",
      sentry: "Leadership Team",
    },
  };

  // Export to global namespace
  global.GameText = GameText;

  // Backwards compatibility with existing BattlechurchUIText
  const legacyNs = global.BattlechurchUIText || (global.BattlechurchUIText = {});
  legacyNs.titleBody = GameText.screens.title.body;
  legacyNs.pauseBody = GameText.screens.pause.body;
  legacyNs.gameOverBody = GameText.screens.gameOver.body;

})(typeof window !== "undefined" ? window : globalThis);
