(function setupBattlechurchClasses(global) {
  if (!global) return;

  const DEFAULT_CLASS_ID = "baptist";

  // Balance schema for denomination classes.
  // All multipliers are intentionally neutral (1.0) as a safe baseline.
  const classes = [
    { id: "baptist", denominationLabel: "Baptist", displayName: "Baptist", tags: ["evangelical"] },
    { id: "catholic", denominationLabel: "Catholic", displayName: "Catholic", tags: ["liturgical"] },
    { id: "methodist", denominationLabel: "Methodist", displayName: "Methodist", tags: ["wesleyan"] },
    { id: "presbyterian", denominationLabel: "Presbyterian", displayName: "Presbyterian", tags: ["reformed"] },
    { id: "lutheran", denominationLabel: "Lutheran", displayName: "Lutheran", tags: ["liturgical"] },
    { id: "anglican", denominationLabel: "Anglican", displayName: "Anglican", tags: ["liturgical"] },
    { id: "pentecostal", denominationLabel: "Pentecostal", displayName: "Pentecostal", tags: ["charismatic"] },
    { id: "orthodox", denominationLabel: "Orthodox", displayName: "Orthodox", tags: ["eastern"] },
    { id: "adventist", denominationLabel: "Adventist", displayName: "Adventist", tags: ["restorationist"] },
    { id: "nondenominational", denominationLabel: "Non-Denominational", displayName: "Non-Denominational", tags: ["modern"] },
  ].map((entry) => ({
    ...entry,
    tuning: {
      player: {
        meleeDamageMultiplier: 1.0,
        projectileDamageMultiplier: 1.0,
        cooldownMultiplier: 1.0,
        moveSpeedMultiplier: 1.0,
        prayerGainMultiplier: 1.0,
        smiteChargeRateMultiplier: 1.0,
        smiteDamageMultiplier: 1.0,
      },
      npc: {
        rofMultiplier: 1.0,
        damageMultiplier: 1.0,
        faithGainMultiplier: 1.0,
      },
      powerups: {
        wisdomWeightMultiplier: 1.0,
        scriptureWeightMultiplier: 1.0,
        faithWeightMultiplier: 1.0,
        perseveranceWeightMultiplier: 1.0,
      },
      churchUpgrades: {
        costMultiplier: 1.0,
        effectMultiplier: 1.0,
      },
      economy: {
        graceGainMultiplier: 1.0,
      },
    },
  }));

  const byId = Object.freeze(
    classes.reduce((acc, entry) => {
      if (!entry || !entry.id) return acc;
      acc[entry.id] = Object.freeze(entry);
      return acc;
    }, {}),
  );

  global.BattlechurchClassConfig = Object.freeze({
    defaultClassId: DEFAULT_CLASS_ID,
    classes: Object.freeze(classes.map((entry) => byId[entry.id])),
    byId,
  });
})(typeof window !== "undefined" ? window : null);

