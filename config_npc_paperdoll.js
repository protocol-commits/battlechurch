// Generated from dev/npc_paperdoll_sandbox.js
(function initNpcPaperdollConfig(global) {
  const FILE_DEFAULT = {
  "source": "npcs-pixel-line",
  "frameGrid": {
    "width": 34,
    "height": 36,
    "columns": 6
  },
  "directionRows": {
    "front": 0,
    "back": 1,
    "right": 2,
    "left": 2
  },
  "leftMirrorsRight": true,
  "randomGeneration": {
    "policy": "include-first-else-exclude",
    "previewCount": 10
  },
  "assetPool": {
    "base": {
      "mode": "exclude",
      "include": [],
      "exclude": []
    },
    "legs": {
      "mode": "exclude",
      "include": [],
      "exclude": []
    },
    "chest": {
      "mode": "exclude",
      "include": [],
      "exclude": []
    },
    "hair": {
      "mode": "exclude",
      "include": [],
      "exclude": []
    },
    "head": {
      "mode": "exclude",
      "include": [],
      "exclude": [
        "Clothes Male/Head/Base_character_Male_Spooky_Pumpkin.png",
        "Clothes Female/Head/Base_character_Female_Hat_Witch.png",
        "Clothes Female/Head/Base_character_Female_Spooky_Pumpkin.png"
      ]
    },
    "weapon": {
      "mode": "exclude",
      "include": [],
      "exclude": []
    }
  },
  "current": {
    "gender": "female",
    "skinTone": "pale",
    "animation": "idle",
    "direction": "front",
    "speed": 1,
    "loop": true,
    "frame": 0,
    "layers": {
      "base": {
        "visible": true,
        "asset": "Base_character_Itchio_all_Female_Pale.png"
      },
      "legs": {
        "visible": true,
        "asset": "none"
      },
      "chest": {
        "visible": true,
        "asset": "none"
      },
      "hair": {
        "visible": true,
        "asset": "none"
      },
      "head": {
        "visible": true,
        "asset": "Clothes Female/Head/Base_character_Female_Spooky_Pumpkin.png"
      },
      "weapon": {
        "visible": true,
        "asset": "none"
      }
    },
    "assetPool": {
      "base": {
        "mode": "exclude",
        "include": [],
        "exclude": []
      },
      "legs": {
        "mode": "exclude",
        "include": [],
        "exclude": []
      },
      "chest": {
        "mode": "exclude",
        "include": [],
        "exclude": []
      },
      "hair": {
        "mode": "exclude",
        "include": [],
        "exclude": []
      },
      "head": {
        "mode": "exclude",
        "include": [],
        "exclude": [
          "Clothes Male/Head/Base_character_Male_Spooky_Pumpkin.png",
          "Clothes Female/Head/Base_character_Female_Hat_Witch.png",
          "Clothes Female/Head/Base_character_Female_Spooky_Pumpkin.png"
        ]
      },
      "weapon": {
        "mode": "exclude",
        "include": [],
        "exclude": []
      }
    }
  },
  "presets": [
    {
      "slot": 1,
      "name": "Test1",
      "gender": "male",
      "skinTone": "pale",
      "animation": "idle",
      "direction": "front",
      "speed": 1,
      "loop": true,
      "layers": {
        "base": {
          "visible": true,
          "asset": "Base_character_Itchio_all_Male_Pale.png"
        },
        "legs": {
          "visible": true,
          "asset": "none"
        },
        "chest": {
          "visible": true,
          "asset": "none"
        },
        "hair": {
          "visible": true,
          "asset": "none"
        },
        "head": {
          "visible": true,
          "asset": "Clothes Male/Head/Base_character_Male_Spooky_Pumpkin.png"
        },
        "weapon": {
          "visible": true,
          "asset": "none"
        }
      },
      "assetPool": {
        "base": {
          "mode": "exclude",
          "include": [],
          "exclude": []
        },
        "legs": {
          "mode": "exclude",
          "include": [],
          "exclude": []
        },
        "chest": {
          "mode": "exclude",
          "include": [],
          "exclude": []
        },
        "hair": {
          "mode": "exclude",
          "include": [],
          "exclude": []
        },
        "head": {
          "mode": "exclude",
          "include": [],
          "exclude": [
            "Clothes Male/Head/Base_character_Male_Spooky_Pumpkin.png"
          ]
        },
        "weapon": {
          "mode": "exclude",
          "include": [],
          "exclude": []
        }
      }
    }
  ]
};
  global.BATTLECHURCH_NPC_PAPERDOLL = FILE_DEFAULT;
})(typeof window !== "undefined" ? window : globalThis);
