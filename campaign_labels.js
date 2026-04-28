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
    actTitles: Object.freeze({
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
    actDescriptions: Object.freeze({
      p1: Object.freeze({
        1: "Win 3 battles to establish a foothold.",
        2: "Repel 3 enemy counterattacks.",
        3: "Break through and seize the town.",
      }),
      p2: Object.freeze({
        1: "Sweep the area clear in 3 battles.",
        2: "Hold your position through 3 assaults.",
        3: "Secure complete control in 3 battles.",
      }),
      p3: Object.freeze({
        1: "Reinforce the position in 3 battles.",
        2: "Defend against 3 waves of enemy forces.",
        3: "Entrench and hold in 3 final battles.",
      }),
    }),
  });
})(typeof window !== "undefined" ? window : null);
