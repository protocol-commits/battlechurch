// Generated from dev/paperdoll_sandbox.js
(function initPastorPaperdollConfig(global) {
  const FILE_DEFAULT = {
  "renderStyle": {
    "shadowCrush": 0,
    "shadowThreshold": 0.75
  },
  "customFace": {
    "enabled": false,
    "front": null,
    "side": null,
    "back": null,
    "frontName": "",
    "sideName": "",
    "backName": "",
    "offsetX": 0,
    "offsetXNorthSouth": 0,
    "offsetXEastWest": 0,
    "offsetY": -12,
    "width": 22,
    "height": 20,
    "cropX": 0,
    "cropY": 0,
    "cropW": 100,
    "cropH": 100,
    "flipSideForEast": true,
    "invertSideDirections": false,
    "northFaceMode": "back"
  },
  "source": "mana-seed",
  "page": "pONE1",
  "facing": "east",
  "animation": "knockdown",
  "playbackSpeed": 1,
  "loop": true,
  "behavior": {
    "key": "melee_thrust",
    "melee_style": "thrust",
    "projectile_style": "none",
    "movement_set": "combat"
  },
  "layers": {
    "0bas": {
      "label": "Body",
      "asset": "humn_v00",
      "visible": true
    },
    "1out": {
      "label": "Outfit",
      "asset": "fstr_v02",
      "visible": true
    },
    "4har": {
      "label": "Hair",
      "asset": "dap1_v03",
      "visible": true
    },
    "5hat": {
      "label": "Hat",
      "asset": "none",
      "visible": true
    },
    "6tla": {
      "label": "Main Hand",
      "asset": "none",
      "visible": true
    },
    "7tlb": {
      "label": "Off Hand",
      "asset": "none",
      "visible": true
    }
  },
  "presets": [
    {
      "slot": 1,
      "name": "idle",
      "page": "pONE2",
      "facing": "east",
      "animation": "combat_idle",
      "behavior": "melee_slash",
      "playbackSpeed": 1,
      "loop": true,
      "layers": {
        "0bas": {
          "label": "Body",
          "asset": "humn_v00",
          "visible": true
        },
        "1out": {
          "label": "Outfit",
          "asset": "fstr_v02",
          "visible": true
        },
        "4har": {
          "label": "Hair",
          "asset": "dap1_v03",
          "visible": true
        },
        "5hat": {
          "label": "Hat",
          "asset": "none",
          "visible": true
        },
        "6tla": {
          "label": "Main Hand",
          "asset": "none",
          "visible": true
        },
        "7tlb": {
          "label": "Off Hand",
          "asset": "none",
          "visible": true
        }
      }
    },
    {
      "slot": 2,
      "name": "Smash",
      "page": "pONE3",
      "facing": "east",
      "animation": "thrust",
      "behavior": "melee_thrust",
      "playbackSpeed": 1,
      "loop": true,
      "layers": {
        "0bas": {
          "label": "Body",
          "asset": "humn_v00",
          "visible": true
        },
        "1out": {
          "label": "Outfit",
          "asset": "fstr_v02",
          "visible": true
        },
        "4har": {
          "label": "Hair",
          "asset": "dap1_v03",
          "visible": true
        },
        "5hat": {
          "label": "Hat",
          "asset": "none",
          "visible": true
        },
        "6tla": {
          "label": "Main Hand",
          "asset": "sw01_v05",
          "visible": true
        },
        "7tlb": {
          "label": "Off Hand",
          "asset": "sh02_v01",
          "visible": true
        }
      }
    },
    {
      "slot": 3,
      "name": "SlashBash",
      "page": "pONE1",
      "facing": "east",
      "animation": "draw_sheath",
      "behavior": "melee_slash",
      "playbackSpeed": 0.9,
      "loop": true,
      "layers": {
        "0bas": {
          "label": "Body",
          "asset": "humn_v00",
          "visible": true
        },
        "1out": {
          "label": "Outfit",
          "asset": "fstr_v02",
          "visible": true
        },
        "4har": {
          "label": "Hair",
          "asset": "dap1_v03",
          "visible": true
        },
        "5hat": {
          "label": "Hat",
          "asset": "none",
          "visible": true
        },
        "6tla": {
          "label": "Main Hand",
          "asset": "sw01_v05",
          "visible": true
        },
        "7tlb": {
          "label": "Off Hand",
          "asset": "sh01_v03",
          "visible": false
        }
      }
    },
    {
      "slot": 4,
      "name": "SlashUp",
      "page": "pONE3",
      "facing": "east",
      "animation": "slash_1",
      "behavior": "projectile_cast",
      "playbackSpeed": 1,
      "loop": true,
      "layers": {
        "0bas": {
          "label": "Body",
          "asset": "humn_v00",
          "visible": true
        },
        "1out": {
          "label": "Outfit",
          "asset": "fstr_v02",
          "visible": true
        },
        "4har": {
          "label": "Hair",
          "asset": "dap1_v03",
          "visible": true
        },
        "5hat": {
          "label": "Hat",
          "asset": "none",
          "visible": true
        },
        "6tla": {
          "label": "Main Hand",
          "asset": "sw01_v05",
          "visible": true
        },
        "7tlb": {
          "label": "Off Hand",
          "asset": "none",
          "visible": true
        }
      }
    },
    {
      "slot": 5,
      "name": "Run",
      "page": "p1",
      "facing": "east",
      "animation": "run",
      "behavior": "melee_slash",
      "playbackSpeed": 1,
      "loop": true,
      "layers": {
        "0bas": {
          "label": "Body",
          "asset": "humn_v00",
          "visible": true
        },
        "1out": {
          "label": "Outfit",
          "asset": "fstr_v02",
          "visible": true
        },
        "4har": {
          "label": "Hair",
          "asset": "dap1_v03",
          "visible": true
        },
        "5hat": {
          "label": "Hat",
          "asset": "none",
          "visible": true
        },
        "6tla": {
          "label": "Main Hand",
          "asset": "sw01_v05",
          "visible": true
        },
        "7tlb": {
          "label": "Off Hand",
          "asset": "sh01_v03",
          "visible": true
        }
      }
    },
    {
      "slot": 6,
      "name": "SlashDown",
      "page": "pONE3",
      "facing": "east",
      "animation": "slash_2",
      "behavior": "projectile_cast",
      "playbackSpeed": 1,
      "loop": true,
      "layers": {
        "0bas": {
          "label": "Body",
          "asset": "humn_v00",
          "visible": true
        },
        "1out": {
          "label": "Outfit",
          "asset": "fstr_v02",
          "visible": true
        },
        "4har": {
          "label": "Hair",
          "asset": "dap1_v03",
          "visible": true
        },
        "5hat": {
          "label": "Hat",
          "asset": "none",
          "visible": true
        },
        "6tla": {
          "label": "Main Hand",
          "asset": "sw01_v05",
          "visible": true
        },
        "7tlb": {
          "label": "Off Hand",
          "asset": "none",
          "visible": true
        }
      }
    },
    {
      "slot": 7,
      "name": "ShieldBash",
      "page": "pONE3",
      "facing": "east",
      "animation": "shield_bash",
      "behavior": "melee_slash",
      "playbackSpeed": 1,
      "loop": true,
      "layers": {
        "0bas": {
          "label": "Body",
          "asset": "humn_v00",
          "visible": true
        },
        "1out": {
          "label": "Outfit",
          "asset": "fstr_v02",
          "visible": true
        },
        "4har": {
          "label": "Hair",
          "asset": "dap1_v03",
          "visible": true
        },
        "5hat": {
          "label": "Hat",
          "asset": "none",
          "visible": true
        },
        "6tla": {
          "label": "Main Hand",
          "asset": "sw01_v05",
          "visible": true
        },
        "7tlb": {
          "label": "Off Hand",
          "asset": "sh01_v03",
          "visible": true
        }
      }
    },
    {
      "slot": 8,
      "name": "walk",
      "page": "p1",
      "facing": "east",
      "animation": "walk",
      "behavior": "melee_slash",
      "playbackSpeed": 1,
      "loop": true,
      "layers": {
        "0bas": {
          "label": "Body",
          "asset": "humn_v00",
          "visible": true
        },
        "1out": {
          "label": "Outfit",
          "asset": "fstr_v02",
          "visible": true
        },
        "4har": {
          "label": "Hair",
          "asset": "dap1_v03",
          "visible": true
        },
        "5hat": {
          "label": "Hat",
          "asset": "none",
          "visible": true
        },
        "6tla": {
          "label": "Main Hand",
          "asset": "sw01_v05",
          "visible": true
        },
        "7tlb": {
          "label": "Off Hand",
          "asset": "sh02_v01",
          "visible": true
        }
      }
    },
    {
      "slot": 9,
      "name": "ProjectileWand",
      "page": "pONE1",
      "facing": "east",
      "animation": "draw_sheath",
      "behavior": "melee_slash",
      "playbackSpeed": 1,
      "loop": true,
      "layers": {
        "0bas": {
          "label": "Body",
          "asset": "humn_v00",
          "visible": true
        },
        "1out": {
          "label": "Outfit",
          "asset": "fstr_v02",
          "visible": true
        },
        "4har": {
          "label": "Hair",
          "asset": "dap1_v03",
          "visible": true
        },
        "5hat": {
          "label": "Hat",
          "asset": "none",
          "visible": true
        },
        "6tla": {
          "label": "Main Hand",
          "asset": "mc01_v05",
          "visible": true
        },
        "7tlb": {
          "label": "Off Hand",
          "asset": "sh01_v03",
          "visible": true
        }
      }
    },
    {
      "slot": 10,
      "name": "ProjectileEmpty",
      "page": "pONE1",
      "facing": "east",
      "animation": "draw_sheath",
      "behavior": "melee_slash",
      "playbackSpeed": 1,
      "loop": true,
      "layers": {
        "0bas": {
          "label": "Body",
          "asset": "humn_v00",
          "visible": true
        },
        "1out": {
          "label": "Outfit",
          "asset": "fstr_v02",
          "visible": true
        },
        "4har": {
          "label": "Hair",
          "asset": "dap1_v03",
          "visible": true
        },
        "5hat": {
          "label": "Hat",
          "asset": "none",
          "visible": true
        },
        "6tla": {
          "label": "Main Hand",
          "asset": "none",
          "visible": true
        },
        "7tlb": {
          "label": "Off Hand",
          "asset": "sh01_v03",
          "visible": true
        }
      }
    },
    {
      "slot": 11,
      "name": "ProjectileWandFast",
      "page": "pONE1",
      "facing": "east",
      "animation": "draw_sheath",
      "behavior": "melee_slash",
      "playbackSpeed": 2.000000000000001,
      "loop": true,
      "layers": {
        "0bas": {
          "label": "Body",
          "asset": "humn_v00",
          "visible": true
        },
        "1out": {
          "label": "Outfit",
          "asset": "fstr_v02",
          "visible": true
        },
        "4har": {
          "label": "Hair",
          "asset": "dap1_v03",
          "visible": true
        },
        "5hat": {
          "label": "Hat",
          "asset": "none",
          "visible": true
        },
        "6tla": {
          "label": "Main Hand",
          "asset": "mc01_v05",
          "visible": true
        },
        "7tlb": {
          "label": "Off Hand",
          "asset": "sh01_v03",
          "visible": true
        }
      }
    },
    {
      "slot": 12,
      "name": "thrust",
      "page": "pONE3",
      "facing": "east",
      "animation": "thrust",
      "behavior": "melee_thrust",
      "playbackSpeed": 1,
      "loop": true,
      "layers": {
        "0bas": {
          "label": "Body",
          "asset": "humn_v00",
          "visible": true
        },
        "1out": {
          "label": "Outfit",
          "asset": "fstr_v02",
          "visible": true
        },
        "4har": {
          "label": "Hair",
          "asset": "dap1_v03",
          "visible": true
        },
        "5hat": {
          "label": "Hat",
          "asset": "none",
          "visible": true
        },
        "6tla": {
          "label": "Main Hand",
          "asset": "sw01_v05",
          "visible": true
        },
        "7tlb": {
          "label": "Off Hand",
          "asset": "sh02_v01",
          "visible": true
        }
      }
    },
    {
      "slot": 13,
      "name": "projectiledown",
      "page": "pONE3",
      "facing": "east",
      "animation": "slash_2",
      "behavior": "melee_slash",
      "playbackSpeed": 1,
      "loop": true,
      "layers": {
        "0bas": {
          "label": "Body",
          "asset": "humn_v00",
          "visible": true
        },
        "1out": {
          "label": "Outfit",
          "asset": "fstr_v02",
          "visible": true
        },
        "4har": {
          "label": "Hair",
          "asset": "dap1_v03",
          "visible": true
        },
        "5hat": {
          "label": "Hat",
          "asset": "none",
          "visible": true
        },
        "6tla": {
          "label": "Main Hand",
          "asset": "mc01_v05",
          "visible": true
        },
        "7tlb": {
          "label": "Off Hand",
          "asset": "none",
          "visible": true
        }
      }
    },
    {
      "slot": 14,
      "name": "projectileup",
      "page": "pONE3",
      "facing": "east",
      "animation": "slash_1",
      "behavior": "melee_slash",
      "playbackSpeed": 1,
      "loop": true,
      "layers": {
        "0bas": {
          "label": "Body",
          "asset": "humn_v00",
          "visible": true
        },
        "1out": {
          "label": "Outfit",
          "asset": "fstr_v02",
          "visible": true
        },
        "4har": {
          "label": "Hair",
          "asset": "dap1_v03",
          "visible": true
        },
        "5hat": {
          "label": "Hat",
          "asset": "none",
          "visible": true
        },
        "6tla": {
          "label": "Main Hand",
          "asset": "mc01_v05",
          "visible": true
        },
        "7tlb": {
          "label": "Off Hand",
          "asset": "none",
          "visible": true
        }
      }
    },
    {
      "slot": 15,
      "name": "Blast",
      "page": "pONE1",
      "facing": "east",
      "animation": "draw_sheath",
      "behavior": "melee_slash",
      "playbackSpeed": 0.9,
      "loop": true,
      "layers": {
        "0bas": {
          "label": "Body",
          "asset": "humn_v00",
          "visible": true
        },
        "1out": {
          "label": "Outfit",
          "asset": "fstr_v02",
          "visible": true
        },
        "4har": {
          "label": "Hair",
          "asset": "dap1_v03",
          "visible": true
        },
        "5hat": {
          "label": "Hat",
          "asset": "none",
          "visible": true
        },
        "6tla": {
          "label": "Main Hand",
          "asset": "sw01_v05",
          "visible": true
        },
        "7tlb": {
          "label": "Off Hand",
          "asset": "sh01_v03",
          "visible": false
        }
      }
    },
    {
      "slot": 16,
      "name": "readytofire",
      "page": "pONE2",
      "facing": "south",
      "animation": "combat_move",
      "behavior": "melee_slash",
      "playbackSpeed": 0.9,
      "loop": true,
      "layers": {
        "0bas": {
          "label": "Body",
          "asset": "humn_v00",
          "visible": true
        },
        "1out": {
          "label": "Outfit",
          "asset": "fstr_v02",
          "visible": true
        },
        "4har": {
          "label": "Hair",
          "asset": "dap1_v03",
          "visible": true
        },
        "5hat": {
          "label": "Hat",
          "asset": "none",
          "visible": true
        },
        "6tla": {
          "label": "Main Hand",
          "asset": "mc01_v05",
          "visible": true
        },
        "7tlb": {
          "label": "Off Hand",
          "asset": "sh01_v03",
          "visible": false
        }
      }
    },
    {
      "slot": 17,
      "name": "thrustmagic",
      "page": "pONE3",
      "facing": "east",
      "animation": "thrust",
      "behavior": "melee_thrust",
      "playbackSpeed": 1,
      "loop": true,
      "layers": {
        "0bas": {
          "label": "Body",
          "asset": "humn_v00",
          "visible": true
        },
        "1out": {
          "label": "Outfit",
          "asset": "fstr_v02",
          "visible": true
        },
        "4har": {
          "label": "Hair",
          "asset": "dap1_v03",
          "visible": true
        },
        "5hat": {
          "label": "Hat",
          "asset": "none",
          "visible": true
        },
        "6tla": {
          "label": "Main Hand",
          "asset": "mc01_v05",
          "visible": true
        },
        "7tlb": {
          "label": "Off Hand",
          "asset": "sh02_v01",
          "visible": true
        }
      }
    },
    {
      "slot": 18,
      "name": "death",
      "page": "pONE1",
      "facing": "east",
      "animation": "knockdown",
      "behavior": "melee_thrust",
      "playbackSpeed": 1,
      "loop": true,
      "layers": {
        "0bas": {
          "label": "Body",
          "asset": "humn_v00",
          "visible": true
        },
        "1out": {
          "label": "Outfit",
          "asset": "fstr_v02",
          "visible": true
        },
        "4har": {
          "label": "Hair",
          "asset": "dap1_v03",
          "visible": true
        },
        "5hat": {
          "label": "Hat",
          "asset": "none",
          "visible": true
        },
        "6tla": {
          "label": "Main Hand",
          "asset": "none",
          "visible": true
        },
        "7tlb": {
          "label": "Off Hand",
          "asset": "none",
          "visible": true
        }
      }
    }
  ],
  "animationPresetMap": {},
  "powerupPresetMap": {},
  "appearanceLayers": {
    "0bas": "humn_v00",
    "1out": "fstr_v02",
    "4har": "dap1_v03",
    "5hat": "none"
  }
};
  global.BATTLECHURCH_PASTOR_PAPERDOLL = FILE_DEFAULT;
})(typeof window !== "undefined" ? window : globalThis);
