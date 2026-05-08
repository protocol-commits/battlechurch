(function setupCampaignLabels(window) {
  if (!window) return;

  window.BattlechurchCampaignLabels = Object.freeze({
    // ── Campaign phase names (p1 / p2 / p3) ──────────────────────────────
    phases: Object.freeze({
      p1: "Invasion",
      p2: "Occupation",
      p3: "Fortification",
    }),

  });
})(typeof window !== "undefined" ? window : null);
