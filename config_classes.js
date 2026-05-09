(function setupBattlechurchClasses(global) {
  if (!global) return;

  const DEFAULT_CLASS_ID = "class1";

  // Balance schema for denomination classes.
  // All multipliers are intentionally neutral (1.0) as a safe baseline.
  const classes = [
    {
      id: "class1",
      classTitle: "Baptist",
      classDescription: "Build a faithful church one committed soul at a time.",
    },
    {
      id: "class2",
      classTitle: "Catholic",
      classDescription: "Hold the line through sacrament, mercy, and enduring unity.",
    },
    {
      id: "class3",
      classTitle: "Methodist",
      classDescription: "Strengthen the weary through compassion, discipline, and service.",
    },
    {
      id: "class4",
      classTitle: "Reformed",
      classDescription: "Stand firm through truth, discipline, and spiritual endurance.",
    },
    {
      id: "class5",
      classTitle: "Liturgical",
      classDescription: "Preserve sacred order against the collapse of the world.",
    },
    {
      id: "class6",
      classTitle: "Other",
      classDescription: "Other description.",
    },
    {
      id: "class7",
      classTitle: "Charismatic",
      classDescription: "Expect God to move powerfully in the middle of chaos.",
    },
    {
      id: "class8",
      classTitle: "Orthodox",
      classDescription: "Become holy through endurance, mystery, and ancient faith.",
    },
    {
      id: "class9",
      classTitle: "Non-Denominational",
      classDescription: "Live with watchfulness, mission, and hopeful endurance.",
    },
    {
      id: "class10",
      classTitle: "Evangelical",
      classDescription: "Bring the lost home before the darkness takes them.",
    },
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
