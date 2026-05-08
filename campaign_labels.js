(function setupCampaignLabels(window) {
  if (!window) return;

  window.BattlechurchCampaignLabels = Object.freeze({
    // ── Campaign phase names (p1 / p2 / p3) ──────────────────────────────
    phases: Object.freeze({
      p1: "Invasion",
      p2: "Occupation",
      p3: "Fortification",
    }),

    // ── Per-phase mission names (battle 1 / 2 / 3 within a town) ─────────
    missions: Object.freeze({
      p1: Object.freeze({ 1: "Assault",   2: "Repel",   3: "Breakthrough" }),
      p2: Object.freeze({ 1: "Sweep",     2: "Hold",    3: "Secure"       }),
      p3: Object.freeze({ 1: "Reinforce", 2: "Defend",  3: "Entrench"     }),
    }),

    // ── Chapter-break act titles (shown on the between-battle screen) ─────
    // Format: "Mission I: {label}"  — built at runtime from missions above,
    // but override here if you need a longer descriptive form.
    missionIntroTitles: Object.freeze({
      p1: Object.freeze({
        1: "Battlefield I: Assault",
        2: "Battlefield II: Repel",
        3: "Battlefield III: Breakthrough",
      }),
      p2: Object.freeze({
        1: "Battlefield I: Sweep",
        2: "Battlefield II: Hold",
        3: "Battlefield III: Secure",
      }),
      p3: Object.freeze({
        1: "Battlefield I: Reinforce",
        2: "Battlefield II: Defend",
        3: "Battlefield III: Entrench",
      }),
    }),

    // ── Chapter-break subtitle descriptions ───────────────────────────────
    missionIntroDescriptions: Object.freeze({
      p1: Object.freeze({
        1: "Hold the line through 3 waves",
        2: "Hold the line through 3 waves",
        3: "Hold the line through 3 waves",
      }),
      p2: Object.freeze({
        1: "Hold the line through 3 waves",
        2: "Hold the line through 3 waves",
        3: "Hold the line through 3 waves",
      }),
      p3: Object.freeze({
        1: "Hold the line through 3 waves",
        2: "Hold the line through 3 waves",
        3: "Hold the line through 3 waves",
      }),
    }),
  });
})(typeof window !== "undefined" ? window : null);
