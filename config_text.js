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
      map: {
        tagline: "Spiritual Warfare Map",
        altTagline: "Smite the hordes, gather your flock, plant churches, save the towns.",
      },
    },

    // =====================
    // MISSION TEXT
    // =====================

    // =====================
    // HUD LABELS
    // =====================
    hud: {
      // Section headers
      player: "PLAYER",
      congregation: "CONGREGATION",
      health: "Health",
      mission: "Mission",

      // Meters
      prayerMeterLabels: ["Prayer", "2", "3"],
      dash: "DASH",
      maxChain: "Max Chain:",

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
      spreadGun: "Tracer",
      halo: "Halo",
      spear: "Lance",
      sentry: "Sentry",
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
