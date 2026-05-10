(function setupBattlechurchClasses(global) {
  if (!global) return;

  const DEFAULT_CLASS_ID = "class1";

  const classes = [
  {
    "id": "class1",
    "classTitle": "Baptist",
    "classDescription": "Personal conviction, biblical fidelity, independence",
    "classFlavor": "Build a faithful church one committed soul at a time.",
    "tuning": {
      "player": {
        "meleeDamageMultiplier": 1,
        "projectileDamageMultiplier": 1,
        "cooldownMultiplier": 1,
        "moveSpeedMultiplier": 1,
        "prayerGainMultiplier": 1,
        "smiteChargeRateMultiplier": 1,
        "smiteDamageMultiplier": 1,
        "moves": {
          "Slash": 1,
          "Cleave": 1,
          "Smash": 1,
          "Crash": 1,
          "Blast": 1,
          "Thrash": 1,
          "Clash": 1,
          "Reap": 1,
          "Hedge": 1,
          "Flash": 1,
          "Unity Strike": 1,
          "Pastor Protect": 1,
          "Smite Bomb": 1,
          "Purge": 1
        }
      },
      "npc": {
        "rofMultiplier": 1,
        "damageMultiplier": 1,
        "faithGainMultiplier": 1,
        "npcWisdomWeightMultiplier": 1,
        "npcWisdomRofMultiplier": 1,
        "npcScriptureWeightMultiplier": 1,
        "npcScriptureRofMultiplier": 1,
        "npcFaithWeightMultiplier": 1,
        "npcFaithRofMultiplier": 1,
        "npcWisdomDamageMultiplier": 1,
        "npcScriptureDamageMultiplier": 1,
        "npcFaithDamageMultiplier": 1
      },
      "powerups": {
        "wisdomWeightMultiplier": 1,
        "scriptureWeightMultiplier": 1,
        "faithWeightMultiplier": 1,
        "perseveranceWeightMultiplier": 1,
        "wisdomRofMultiplier": 1,
        "scriptureRofMultiplier": 1,
        "faithRofMultiplier": 1,
        "wisdomDamageMultiplier": 1,
        "scriptureDamageMultiplier": 1,
        "faithDamageMultiplier": 1,
        "wisdomMaxShotsMultiplier": 1,
        "scriptureMaxShotsMultiplier": 1,
        "faithMaxShotsMultiplier": 1
      },
      "churchUpgrades": {
        "costMultiplier": 1,
        "effectMultiplier": 1
      },
      "economy": {
        "graceGainMultiplier": 1
      }
    }
  },
  {
    "id": "class2",
    "classTitle": "Catholic",
    "classDescription": "Institutional strength, sacramental depth, unity",
    "classFlavor": "Hold the line through sacrament, mercy, and enduring unity.",
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
      "npc": {
        "rofMultiplier": 1,
        "damageMultiplier": 1,
        "faithGainMultiplier": 1
      },
      "powerups": {
        "wisdomWeightMultiplier": 1,
        "scriptureWeightMultiplier": 1,
        "faithWeightMultiplier": 1,
        "perseveranceWeightMultiplier": 1
      },
      "churchUpgrades": {
        "costMultiplier": 1,
        "effectMultiplier": 1
      },
      "economy": {
        "graceGainMultiplier": 1
      }
    }
  },
  {
    "id": "class3",
    "classTitle": "Methodist",
    "classDescription": "Outreach, social reform, disciplined community",
    "classFlavor": "Strengthen the weary through compassion, discipline, and service.",
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
      "npc": {
        "rofMultiplier": 1,
        "damageMultiplier": 1,
        "faithGainMultiplier": 1
      },
      "powerups": {
        "wisdomWeightMultiplier": 1,
        "scriptureWeightMultiplier": 1,
        "faithWeightMultiplier": 1,
        "perseveranceWeightMultiplier": 1
      },
      "churchUpgrades": {
        "costMultiplier": 1,
        "effectMultiplier": 1
      },
      "economy": {
        "graceGainMultiplier": 1
      }
    }
  },
  {
    "id": "class4",
    "classTitle": "Reformed",
    "classDescription": "Theological rigor, sovereignty, long-term resilience",
    "classFlavor": "Stand firm through truth, discipline, and spiritual endurance.",
    "tuning": {
      "player": {
        "meleeDamageMultiplier": 1.1,
        "projectileDamageMultiplier": 1.1,
        "cooldownMultiplier": 1,
        "moveSpeedMultiplier": 1.2,
        "prayerGainMultiplier": 1,
        "smiteChargeRateMultiplier": 1,
        "smiteDamageMultiplier": 1,
        "moves": {
          "Slash": 1,
          "Cleave": 1,
          "Smash": 1,
          "Crash": 1,
          "Blast": 1,
          "Thrash": 1,
          "Clash": 1,
          "Reap": 1,
          "Hedge": 1,
          "Flash": 1,
          "Unity Strike": 1,
          "Pastor Protect": 1,
          "Smite Bomb": 1,
          "Purge": 1
        }
      },
      "npc": {
        "rofMultiplier": 1,
        "damageMultiplier": 1,
        "faithGainMultiplier": 1,
        "npcWisdomWeightMultiplier": 1,
        "npcWisdomRofMultiplier": 5,
        "npcScriptureWeightMultiplier": 1,
        "npcScriptureRofMultiplier": 5,
        "npcFaithWeightMultiplier": 1,
        "npcFaithRofMultiplier": 5,
        "npcWisdomDamageMultiplier": 3,
        "npcScriptureDamageMultiplier": 3,
        "npcFaithDamageMultiplier": 3
      },
      "powerups": {
        "wisdomWeightMultiplier": 1,
        "scriptureWeightMultiplier": 1,
        "faithWeightMultiplier": 1,
        "perseveranceWeightMultiplier": 1,
        "wisdomRofMultiplier": 4,
        "scriptureRofMultiplier": 4,
        "faithRofMultiplier": 4,
        "wisdomDamageMultiplier": 2,
        "scriptureDamageMultiplier": 2,
        "faithDamageMultiplier": 2,
        "wisdomMaxShotsMultiplier": 1,
        "scriptureMaxShotsMultiplier": 1,
        "faithMaxShotsMultiplier": 1
      },
      "churchUpgrades": {
        "costMultiplier": 1,
        "effectMultiplier": 1
      },
      "economy": {
        "graceGainMultiplier": 10
      }
    }
  },
  {
    "id": "class5",
    "classTitle": "Liturgical",
    "classDescription": "Sacred order, ancient rhythm, structural endurance",
    "classFlavor": "Preserve sacred order against the collapse of the world.",
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
      "npc": {
        "rofMultiplier": 1,
        "damageMultiplier": 1,
        "faithGainMultiplier": 1
      },
      "powerups": {
        "wisdomWeightMultiplier": 1,
        "scriptureWeightMultiplier": 1,
        "faithWeightMultiplier": 1,
        "perseveranceWeightMultiplier": 1
      },
      "churchUpgrades": {
        "costMultiplier": 1,
        "effectMultiplier": 1
      },
      "economy": {
        "graceGainMultiplier": 1
      }
    }
  },
  {
    "id": "class6",
    "classTitle": "Lutheran",
    "classDescription": "Grace alone, Word and Sacrament, doctrinal steadiness",
    "classFlavor": "Stand on grace alone, word alone, faith alone.",
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
      "npc": {
        "rofMultiplier": 1,
        "damageMultiplier": 1,
        "faithGainMultiplier": 1
      },
      "powerups": {
        "wisdomWeightMultiplier": 1,
        "scriptureWeightMultiplier": 1,
        "faithWeightMultiplier": 1,
        "perseveranceWeightMultiplier": 1
      },
      "churchUpgrades": {
        "costMultiplier": 1,
        "effectMultiplier": 1
      },
      "economy": {
        "graceGainMultiplier": 1
      }
    }
  },
  {
    "id": "class7",
    "classTitle": "Charismatic",
    "classDescription": "Spirit-empowered, direct revelation, prophetic faith",
    "classFlavor": "Expect God to move powerfully in the middle of chaos.",
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
      "npc": {
        "rofMultiplier": 1,
        "damageMultiplier": 1,
        "faithGainMultiplier": 1
      },
      "powerups": {
        "wisdomWeightMultiplier": 1,
        "scriptureWeightMultiplier": 1,
        "faithWeightMultiplier": 1,
        "perseveranceWeightMultiplier": 1
      },
      "churchUpgrades": {
        "costMultiplier": 1,
        "effectMultiplier": 1
      },
      "economy": {
        "graceGainMultiplier": 1
      }
    }
  },
  {
    "id": "class8",
    "classTitle": "Orthodox",
    "classDescription": "Ancient tradition, contemplative depth, transformation",
    "classFlavor": "Become holy through endurance, mystery, and ancient faith.",
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
      "npc": {
        "rofMultiplier": 1,
        "damageMultiplier": 1,
        "faithGainMultiplier": 1
      },
      "powerups": {
        "wisdomWeightMultiplier": 1,
        "scriptureWeightMultiplier": 1,
        "faithWeightMultiplier": 1,
        "perseveranceWeightMultiplier": 1
      },
      "churchUpgrades": {
        "costMultiplier": 1,
        "effectMultiplier": 1
      },
      "economy": {
        "graceGainMultiplier": 1
      }
    }
  },
  {
    "id": "class9",
    "classTitle": "Non-Denominational",
    "classDescription": "Adaptability, mission clarity, rapid mobilization",
    "classFlavor": "Live with watchfulness, mission, and hopeful endurance.",
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
      "npc": {
        "rofMultiplier": 1,
        "damageMultiplier": 1,
        "faithGainMultiplier": 1
      },
      "powerups": {
        "wisdomWeightMultiplier": 1,
        "scriptureWeightMultiplier": 1,
        "faithWeightMultiplier": 1,
        "perseveranceWeightMultiplier": 1
      },
      "churchUpgrades": {
        "costMultiplier": 1,
        "effectMultiplier": 1
      },
      "economy": {
        "graceGainMultiplier": 1
      }
    }
  },
  {
    "id": "class10",
    "classTitle": "Evangelical",
    "classDescription": "Evangelism, personal conversion, urgency",
    "classFlavor": "Bring the lost home before the darkness takes them.",
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
      "npc": {
        "rofMultiplier": 1,
        "damageMultiplier": 1,
        "faithGainMultiplier": 1
      },
      "powerups": {
        "wisdomWeightMultiplier": 1,
        "scriptureWeightMultiplier": 1,
        "faithWeightMultiplier": 1,
        "perseveranceWeightMultiplier": 1
      },
      "churchUpgrades": {
        "costMultiplier": 1,
        "effectMultiplier": 1
      },
      "economy": {
        "graceGainMultiplier": 1
      }
    }
  }
];

  const byId = Object.freeze(
    classes.reduce((acc, entry) => {
      if (!entry || !entry.id) return acc;
      acc[entry.id] = Object.freeze(entry);
      return acc;
    }, {}),
  );

  const legacyIdMap = Object.freeze({
  "baptist": "class1",
  "catholic": "class2",
  "methodist": "class3",
  "presbyterian": "class4",
  "lutheran": "class5",
  "anglican": "class6",
  "pentecostal": "class7",
  "orthodox": "class8",
  "adventist": "class9",
  "nondenominational": "class10"
});

  global.BattlechurchClassConfig = Object.freeze({
    defaultClassId: DEFAULT_CLASS_ID,
    classes: Object.freeze(classes.map((entry) => byId[entry.id])),
    byId,
    legacyIdMap,
  });
})(typeof window !== "undefined" ? window : null);
