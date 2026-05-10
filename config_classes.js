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
          "Slash": 1.0,
          "Cleave": 1.0,
          "Smash": 1.0,
          "Crash": 1.0,
          "Blast": 1.0,
          "Thrash": 1.0,
          "Clash": 1.0,
          "Reap": 1.0,
          "Hedge": 1.0,
          "Flash": 1.0,
          "Unity Strike": 1.0,
          "Pastor Protect": 1.0,
          "Smite Bomb": 1.0,
          "Purge": 1.0
        }
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
        "smiteDamageMultiplier": 1,
        "moves": {
          "Slash": 1.0,
          "Cleave": 1.0,
          "Smash": 1.0,
          "Crash": 1.0,
          "Blast": 1.0,
          "Thrash": 1.0,
          "Clash": 1.0,
          "Reap": 1.0,
          "Hedge": 1.25,
          "Flash": 1.0,
          "Unity Strike": 1.0,
          "Pastor Protect": 1.3,
          "Smite Bomb": 1.0,
          "Purge": 1.0
        }
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
        "smiteDamageMultiplier": 1,
        "moves": {
          "Slash": 1.0,
          "Cleave": 1.2,
          "Smash": 1.0,
          "Crash": 1.0,
          "Blast": 1.0,
          "Thrash": 1.0,
          "Clash": 1.0,
          "Reap": 1.2,
          "Hedge": 1.0,
          "Flash": 1.0,
          "Unity Strike": 1.0,
          "Pastor Protect": 1.0,
          "Smite Bomb": 1.0,
          "Purge": 1.0
        }
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
          "Slash": 1.2,
          "Cleave": 1.0,
          "Smash": 1.25,
          "Crash": 1.0,
          "Blast": 1.2,
          "Thrash": 1.0,
          "Clash": 1.0,
          "Reap": 1.0,
          "Hedge": 1.0,
          "Flash": 1.0,
          "Unity Strike": 1.0,
          "Pastor Protect": 1.0,
          "Smite Bomb": 1.0,
          "Purge": 1.0
        }
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
        "smiteDamageMultiplier": 1,
        "moves": {
          "Slash": 1.0,
          "Cleave": 1.0,
          "Smash": 1.0,
          "Crash": 1.0,
          "Blast": 1.0,
          "Thrash": 1.0,
          "Clash": 1.0,
          "Reap": 1.0,
          "Hedge": 1.2,
          "Flash": 1.0,
          "Unity Strike": 1.0,
          "Pastor Protect": 1.2,
          "Smite Bomb": 1.2,
          "Purge": 1.2
        }
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
        "smiteDamageMultiplier": 1,
        "moves": {
          "Slash": 1.0,
          "Cleave": 1.0,
          "Smash": 1.0,
          "Crash": 1.0,
          "Blast": 1.3,
          "Thrash": 1.0,
          "Clash": 1.0,
          "Reap": 1.0,
          "Hedge": 1.0,
          "Flash": 1.0,
          "Unity Strike": 1.0,
          "Pastor Protect": 1.0,
          "Smite Bomb": 1.2,
          "Purge": 1.0
        }
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
        "smiteDamageMultiplier": 1,
        "moves": {
          "Slash": 1.0,
          "Cleave": 1.0,
          "Smash": 1.0,
          "Crash": 1.0,
          "Blast": 1.0,
          "Thrash": 1.25,
          "Clash": 1.3,
          "Reap": 1.0,
          "Hedge": 1.0,
          "Flash": 1.25,
          "Unity Strike": 1.0,
          "Pastor Protect": 1.0,
          "Smite Bomb": 1.0,
          "Purge": 1.0
        }
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
        "smiteDamageMultiplier": 1,
        "moves": {
          "Slash": 1.0,
          "Cleave": 1.0,
          "Smash": 1.0,
          "Crash": 1.0,
          "Blast": 1.0,
          "Thrash": 1.0,
          "Clash": 1.0,
          "Reap": 1.3,
          "Hedge": 1.3,
          "Flash": 1.0,
          "Unity Strike": 1.2,
          "Pastor Protect": 1.0,
          "Smite Bomb": 1.0,
          "Purge": 1.3
        }
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
        "smiteDamageMultiplier": 1,
        "moves": {
          "Slash": 1.0,
          "Cleave": 1.0,
          "Smash": 1.15,
          "Crash": 1.15,
          "Blast": 1.0,
          "Thrash": 1.15,
          "Clash": 1.0,
          "Reap": 1.0,
          "Hedge": 1.0,
          "Flash": 1.0,
          "Unity Strike": 1.0,
          "Pastor Protect": 1.0,
          "Smite Bomb": 1.0,
          "Purge": 1.0
        }
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
        "smiteDamageMultiplier": 1,
        "moves": {
          "Slash": 1.0,
          "Cleave": 1.0,
          "Smash": 1.0,
          "Crash": 1.2,
          "Blast": 1.0,
          "Thrash": 1.0,
          "Clash": 1.2,
          "Reap": 1.0,
          "Hedge": 1.0,
          "Flash": 1.2,
          "Unity Strike": 1.2,
          "Pastor Protect": 1.0,
          "Smite Bomb": 1.0,
          "Purge": 1.0
        }
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
