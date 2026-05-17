(function setupBattlechurchClasses(global) {
  if (!global) return;

  const DEFAULT_CLASS_ID = "class1";

  const classes = [
  // ── TOP-LEVEL TRADITIONS (shown at character creation) ──────────────────
  {
    "id": "class1",
    "classTitle": "Independent",
    "classDescription": "Adaptability, mission clarity, rapid mobilization",
    "classFlavor": "Live with watchfulness, mission, and hopeful endurance.",
    "isTopLevel": true,
    "tuning": {
      "player": {
        "meleeDamageMultiplier": 1,
        "projectileDamageMultiplier": 1,
        "cooldownMultiplier": 1,
        "moveSpeedMultiplier": 1,
        "prayerGainMultiplier": 1,
        "smiteChargeRateMultiplier": 1,
        "smiteDamageMultiplier": 1
      },
      "npc": { "rofMultiplier": 1, "damageMultiplier": 1, "faithGainMultiplier": 1 },
      "powerups": {
        "wisdomWeightMultiplier": 1, "scriptureWeightMultiplier": 1,
        "faithWeightMultiplier": 1, "perseveranceWeightMultiplier": 1
      },
      "churchUpgrades": { "costMultiplier": 1, "effectMultiplier": 1 },
      "economy": { "graceGainMultiplier": 1 }
    }
  },
  {
    "id": "class2",
    "classTitle": "Protestant",
    "classDescription": "Scripture, faith, reform — choose your tradition after District 1",
    "classFlavor": "Stand on the Word alone. Your denomination will reveal itself in battle.",
    "isTopLevel": true,
    "isProtestant": true,
    "tuning": {
      "player": {
        "meleeDamageMultiplier": 1,
        "projectileDamageMultiplier": 1,
        "cooldownMultiplier": 1,
        "moveSpeedMultiplier": 1,
        "prayerGainMultiplier": 1,
        "smiteChargeRateMultiplier": 1,
        "smiteDamageMultiplier": 1
      },
      "npc": { "rofMultiplier": 1, "damageMultiplier": 1, "faithGainMultiplier": 1 },
      "powerups": {
        "wisdomWeightMultiplier": 1, "scriptureWeightMultiplier": 1,
        "faithWeightMultiplier": 1, "perseveranceWeightMultiplier": 1
      },
      "churchUpgrades": { "costMultiplier": 1, "effectMultiplier": 1 },
      "economy": { "graceGainMultiplier": 1 }
    }
  },
  {
    "id": "class3",
    "classTitle": "Catholic",
    "classDescription": "Institutional strength, sacramental depth, unity",
    "classFlavor": "Hold the line through sacrament, mercy, and enduring unity.",
    "isTopLevel": true,
    "tuning": {
      "player": {
        "meleeDamageMultiplier": 1,
        "projectileDamageMultiplier": 1,
        "cooldownMultiplier": 1,
        "moveSpeedMultiplier": 1,
        "prayerGainMultiplier": 1,
        "smiteChargeRateMultiplier": 1,
        "smiteDamageMultiplier": 1
      },
      "npc": { "rofMultiplier": 1, "damageMultiplier": 1, "faithGainMultiplier": 1 },
      "powerups": {
        "wisdomWeightMultiplier": 1, "scriptureWeightMultiplier": 1,
        "faithWeightMultiplier": 1, "perseveranceWeightMultiplier": 1
      },
      "churchUpgrades": { "costMultiplier": 1, "effectMultiplier": 1 },
      "economy": { "graceGainMultiplier": 1 }
    }
  },

  // ── PROTESTANT SUB-DENOMINATIONS (unlocked after District 1) ────────────
  {
    "id": "class_nondenominational",
    "classTitle": "Non-Denominational",
    "classDescription": "Gospel-centered, locally governed, no creedal ties",
    "classFlavor": "Build the church on the Word alone, free from institutional walls.",
    "isProtestantSub": true,
    "tuning": {
      "player": {
        "meleeDamageMultiplier": 1, "projectileDamageMultiplier": 1,
        "cooldownMultiplier": 1, "moveSpeedMultiplier": 1,
        "prayerGainMultiplier": 1, "smiteChargeRateMultiplier": 1, "smiteDamageMultiplier": 1
      },
      "npc": { "rofMultiplier": 1, "damageMultiplier": 1, "faithGainMultiplier": 1 },
      "powerups": {
        "wisdomWeightMultiplier": 1, "scriptureWeightMultiplier": 1,
        "faithWeightMultiplier": 1, "perseveranceWeightMultiplier": 1
      },
      "churchUpgrades": { "costMultiplier": 1, "effectMultiplier": 1 },
      "economy": { "graceGainMultiplier": 1 }
    }
  },
  {
    "id": "class_baptist",
    "classTitle": "Baptist",
    "classDescription": "Personal conviction, biblical fidelity, independence",
    "classFlavor": "Build a faithful church one committed soul at a time.",
    "isProtestantSub": true,
    "tuning": {
      "player": {
        "meleeDamageMultiplier": 1, "projectileDamageMultiplier": 1,
        "cooldownMultiplier": 1, "moveSpeedMultiplier": 1,
        "prayerGainMultiplier": 1, "smiteChargeRateMultiplier": 1, "smiteDamageMultiplier": 1
      },
      "npc": { "rofMultiplier": 1, "damageMultiplier": 1, "faithGainMultiplier": 1 },
      "powerups": {
        "wisdomWeightMultiplier": 1, "scriptureWeightMultiplier": 1,
        "faithWeightMultiplier": 1, "perseveranceWeightMultiplier": 1
      },
      "churchUpgrades": { "costMultiplier": 1, "effectMultiplier": 1 },
      "economy": { "graceGainMultiplier": 1 }
    }
  },
  {
    "id": "class_methodist",
    "classTitle": "Methodist",
    "classDescription": "Outreach, social reform, disciplined community",
    "classFlavor": "Strengthen the weary through compassion, discipline, and service.",
    "isProtestantSub": true,
    "tuning": {
      "player": {
        "meleeDamageMultiplier": 1, "projectileDamageMultiplier": 1,
        "cooldownMultiplier": 1, "moveSpeedMultiplier": 1,
        "prayerGainMultiplier": 1, "smiteChargeRateMultiplier": 1, "smiteDamageMultiplier": 1
      },
      "npc": { "rofMultiplier": 1, "damageMultiplier": 1, "faithGainMultiplier": 1 },
      "powerups": {
        "wisdomWeightMultiplier": 1, "scriptureWeightMultiplier": 1,
        "faithWeightMultiplier": 1, "perseveranceWeightMultiplier": 1
      },
      "churchUpgrades": { "costMultiplier": 1, "effectMultiplier": 1 },
      "economy": { "graceGainMultiplier": 1 }
    }
  },
  {
    "id": "class_liturgical",
    "classTitle": "Liturgical",
    "classDescription": "Sacred order, ancient rhythm, structural endurance",
    "classFlavor": "Preserve sacred order against the collapse of the world.",
    "isProtestantSub": true,
    "tuning": {
      "player": {
        "meleeDamageMultiplier": 1, "projectileDamageMultiplier": 1,
        "cooldownMultiplier": 1, "moveSpeedMultiplier": 1,
        "prayerGainMultiplier": 1, "smiteChargeRateMultiplier": 1, "smiteDamageMultiplier": 1
      },
      "npc": { "rofMultiplier": 1, "damageMultiplier": 1, "faithGainMultiplier": 1 },
      "powerups": {
        "wisdomWeightMultiplier": 1, "scriptureWeightMultiplier": 1,
        "faithWeightMultiplier": 1, "perseveranceWeightMultiplier": 1
      },
      "churchUpgrades": { "costMultiplier": 1, "effectMultiplier": 1 },
      "economy": { "graceGainMultiplier": 1 }
    }
  },
  {
    "id": "class_lutheran",
    "classTitle": "Lutheran",
    "classDescription": "Grace alone, Word and Sacrament, doctrinal steadiness",
    "classFlavor": "Stand on grace alone, word alone, faith alone.",
    "isProtestantSub": true,
    "tuning": {
      "player": {
        "meleeDamageMultiplier": 1, "projectileDamageMultiplier": 1,
        "cooldownMultiplier": 1, "moveSpeedMultiplier": 1,
        "prayerGainMultiplier": 1, "smiteChargeRateMultiplier": 1, "smiteDamageMultiplier": 1
      },
      "npc": { "rofMultiplier": 1, "damageMultiplier": 1, "faithGainMultiplier": 1 },
      "powerups": {
        "wisdomWeightMultiplier": 1, "scriptureWeightMultiplier": 1,
        "faithWeightMultiplier": 1, "perseveranceWeightMultiplier": 1
      },
      "churchUpgrades": { "costMultiplier": 1, "effectMultiplier": 1 },
      "economy": { "graceGainMultiplier": 1 }
    }
  },
  {
    "id": "class_reformed",
    "classTitle": "Reformed",
    "classDescription": "Theological rigor, sovereignty, long-term resilience",
    "classFlavor": "Stand firm through truth, discipline, and spiritual endurance.",
    "isProtestantSub": true,
    "tuning": {
      "player": {
        "meleeDamageMultiplier": 1, "projectileDamageMultiplier": 1,
        "cooldownMultiplier": 1, "moveSpeedMultiplier": 1,
        "prayerGainMultiplier": 1, "smiteChargeRateMultiplier": 1, "smiteDamageMultiplier": 1
      },
      "npc": { "rofMultiplier": 1, "damageMultiplier": 1, "faithGainMultiplier": 1 },
      "powerups": {
        "wisdomWeightMultiplier": 1, "scriptureWeightMultiplier": 1,
        "faithWeightMultiplier": 1, "perseveranceWeightMultiplier": 1
      },
      "churchUpgrades": { "costMultiplier": 1, "effectMultiplier": 1 },
      "economy": { "graceGainMultiplier": 1 }
    }
  },
  {
    "id": "class_charismatic",
    "classTitle": "Charismatic",
    "classDescription": "Spirit-empowered, direct revelation, prophetic faith",
    "classFlavor": "Expect God to move powerfully in the middle of chaos.",
    "isProtestantSub": true,
    "tuning": {
      "player": {
        "meleeDamageMultiplier": 1, "projectileDamageMultiplier": 1,
        "cooldownMultiplier": 1, "moveSpeedMultiplier": 1,
        "prayerGainMultiplier": 1, "smiteChargeRateMultiplier": 1, "smiteDamageMultiplier": 1
      },
      "npc": { "rofMultiplier": 1, "damageMultiplier": 1, "faithGainMultiplier": 1 },
      "powerups": {
        "wisdomWeightMultiplier": 1, "scriptureWeightMultiplier": 1,
        "faithWeightMultiplier": 1, "perseveranceWeightMultiplier": 1
      },
      "churchUpgrades": { "costMultiplier": 1, "effectMultiplier": 1 },
      "economy": { "graceGainMultiplier": 1 }
    }
  },
  {
    "id": "class_evangelical",
    "classTitle": "Evangelical",
    "classDescription": "Evangelism, personal conversion, urgency",
    "classFlavor": "Bring the lost home before the darkness takes them.",
    "isProtestantSub": true,
    "tuning": {
      "player": {
        "meleeDamageMultiplier": 1, "projectileDamageMultiplier": 1,
        "cooldownMultiplier": 1, "moveSpeedMultiplier": 1,
        "prayerGainMultiplier": 1, "smiteChargeRateMultiplier": 1, "smiteDamageMultiplier": 1
      },
      "npc": { "rofMultiplier": 1, "damageMultiplier": 1, "faithGainMultiplier": 1 },
      "powerups": {
        "wisdomWeightMultiplier": 1, "scriptureWeightMultiplier": 1,
        "faithWeightMultiplier": 1, "perseveranceWeightMultiplier": 1
      },
      "churchUpgrades": { "costMultiplier": 1, "effectMultiplier": 1 },
      "economy": { "graceGainMultiplier": 1 }
    }
  },
];

  const byId = Object.freeze(
    classes.reduce((acc, entry) => {
      if (!entry || !entry.id) return acc;
      acc[entry.id] = Object.freeze(entry);
      return acc;
    }, {}),
  );

  const legacyIdMap = Object.freeze({
    // Top-level
    "independent":        "class1",
    "nondenominational":  "class1",
    "protestant":         "class2",
    "catholic":           "class3",
    // Protestant subs (old numeric IDs)
    "class4":             "class_reformed",
    "class5":             "class_evangelical",
    // Legacy string keys
    "nondenominational":  "class_nondenominational",
    "baptist":            "class_baptist",
    "methodist":          "class_methodist",
    "liturgical":         "class_liturgical",
    "lutheran":           "class_lutheran",
    "reformed":           "class_reformed",
    "presbyterian":       "class_reformed",
    "charismatic":        "class_charismatic",
    "pentecostal":        "class_charismatic",
    "evangelical":        "class_evangelical",
  });

  const topLevelClasses   = Object.freeze(classes.filter((c) => c.isTopLevel));
  const protestantSubDenoms = Object.freeze(classes.filter((c) => c.isProtestantSub));

  global.BattlechurchClassConfig = Object.freeze({
    defaultClassId: DEFAULT_CLASS_ID,
    classes: Object.freeze(classes.map((entry) => byId[entry.id])),
    topLevelClasses,
    protestantSubDenoms,
    byId,
    legacyIdMap,
  });
})(typeof window !== "undefined" ? window : null);
