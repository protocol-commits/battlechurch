(function setupBattlechurchClasses(global) {
  if (!global) return;

  const DEFAULT_CLASS_ID = "class1";

  // Balance schema for denomination classes.
  // All multipliers are intentionally neutral (1.0) as a safe baseline.
  const classes = [
    { id: "class1", denominationLabel: "Baptist", displayName: "Baptist", tags: ["evangelical"] },
    { id: "class2", denominationLabel: "Catholic", displayName: "Catholic", tags: ["liturgical"] },
    { id: "class3", denominationLabel: "Methodist", displayName: "Methodist", tags: ["wesleyan"] },
    { id: "class4", denominationLabel: "Presbyterian", displayName: "Presbyterian", tags: ["reformed"] },
    { id: "class5", denominationLabel: "Lutheran", displayName: "Lutheran", tags: ["liturgical"] },
    { id: "class6", denominationLabel: "Anglican", displayName: "Anglican", tags: ["liturgical"] },
    { id: "class7", denominationLabel: "Pentecostal", displayName: "Pentecostal", tags: ["charismatic"] },
    { id: "class8", denominationLabel: "Orthodox", displayName: "Orthodox", tags: ["eastern"] },
    { id: "class9", denominationLabel: "Adventist", displayName: "Adventist", tags: ["restorationist"] },
    { id: "class10", denominationLabel: "Non-Denominational", displayName: "Non-Denominational", tags: ["modern"] },
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

  const legacyIdMap = Object.freeze({
    baptist: "class1",
    catholic: "class2",
    methodist: "class3",
    presbyterian: "class4",
    lutheran: "class5",
    anglican: "class6",
    pentecostal: "class7",
    orthodox: "class8",
    adventist: "class9",
    nondenominational: "class10",
  });

  global.BattlechurchClassConfig = Object.freeze({
    defaultClassId: DEFAULT_CLASS_ID,
    classes: Object.freeze(classes.map((entry) => byId[entry.id])),
    byId,
    legacyIdMap,
  });
})(typeof window !== "undefined" ? window : null);
