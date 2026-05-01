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
        1: "Mission I: Assault",
        2: "Mission II: Repel",
        3: "Mission III: Breakthrough",
      }),
      p2: Object.freeze({
        1: "Mission I: Sweep",
        2: "Mission II: Hold",
        3: "Mission III: Secure",
      }),
      p3: Object.freeze({
        1: "Mission I: Reinforce",
        2: "Mission II: Defend",
        3: "Mission III: Entrench",
      }),
    }),

    // ── Chapter-break subtitle descriptions ───────────────────────────────
    missionIntroDescriptions: Object.freeze({
      p1: Object.freeze({
        1: "Win 3 battles",
        2: "Win 3 battles",
        3: "Win 3 battles",
      }),
      p2: Object.freeze({
        1: "Win 3 battles to complete the mission.",
        2: "Win 3 battles to complete the mission.",
        3: "Win 3 battles to complete the mission.",
      }),
      p3: Object.freeze({
        1: "Win 3 battles to complete the mission.",
        2: "Win 3 battles to complete the mission.",
        3: "Win 3 battles to complete the mission.",
      }),
    }),
  });
})(typeof window !== "undefined" ? window : null);
