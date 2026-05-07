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
      "exclude": [
        "Clothes Female/Legs/Base_character_Female_Pants_Villager.png"
      ]
    },
    "chest": {
      "mode": "exclude",
      "include": [],
      "exclude": [
        "Clothes Male/Chest/Base_character_Male_Steel_Armor_Chest.png",
        "Clothes Female/Chest/Base_character_Female_Black_Cape.png",
        "Clothes Female/Chest/Base_character_Female_Green_Ranger_Cape.png",
        "Clothes Male/Chest/Base_character_Male_Knight_Cape.png",
        "Clothes Male/Chest/Base_character_Male_Cape_Black.png",
        "Clothes Male/Chest/Base_character_Male_Fur_Armor.png",
        "Clothes Male/Chest/Base_character_Male_King_Cloak.png"
      ]
    },
    "hair": {
      "mode": "exclude",
      "include": [],
      "exclude": [
        "Hair Male/Base_character_Male_Long_Hair_Black_Unisex.png"
      ]
    },
    "head": {
      "mode": "exclude",
      "include": [],
      "exclude": [
        "Clothes Female/Head/Base_character_Female_Spooky_Pumpkin.png",
        "Clothes Female/Head/Base_character_Female_Hat_Witch.png",
        "Clothes Male/Head/Base_character_Male_Hat_Adventurer.png",
        "Clothes Male/Head/Base_character_Male_Hat_Wizard.png",
        "Clothes Male/Head/Base_character_Male_Helmet_Knight_Closed.png",
        "Clothes Male/Head/Base_character_Male_King_Crown.png",
        "Clothes Male/Head/Base_character_Male_Spooky_Pumpkin.png",
        "Clothes Female/Head/Base_character_Female_Crown.png",
        "Clothes Female/Head/Base_character_Female_Hat_Adventurer.png"
      ]
    },
    "weapon": {
      "mode": "exclude",
      "include": [],
      "exclude": []
    }
  },
  "current": {
    "gender": "male",
    "skinTone": "pale",
    "animation": "walk",
    "direction": "back",
    "speed": 1,
    "loop": true,
    "frame": 0,
    "layers": {
      "base": {
        "visible": true,
        "asset": "Base_character_Itchio_all_Male_Pale.png"
      },
      "legs": {
        "visible": true,
        "asset": "Clothes Male/Pants/Base_character_Male_Pants_Villager.png"
      },
      "chest": {
        "visible": true,
        "asset": "Clothes Male/Chest/Base_character_Male_Knight_Cape.png"
      },
      "hair": {
        "visible": true,
        "asset": "Hair Male/Base_character_Male_Long_Hair_Black_Unisex.png"
      },
      "head": {
        "visible": true,
        "asset": "none"
      },
      "weapon": {
        "visible": true,
        "asset": "Tools and Weapons/Weapons/Base_character_Male_Swing_Sword.png"
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
        "exclude": [
          "Clothes Female/Legs/Base_character_Female_Pants_Villager.png"
        ]
      },
      "chest": {
        "mode": "exclude",
        "include": [],
        "exclude": [
          "Clothes Male/Chest/Base_character_Male_Steel_Armor_Chest.png",
          "Clothes Female/Chest/Base_character_Female_Black_Cape.png",
          "Clothes Female/Chest/Base_character_Female_Green_Ranger_Cape.png",
          "Clothes Male/Chest/Base_character_Male_Knight_Cape.png",
          "Clothes Male/Chest/Base_character_Male_Cape_Black.png",
          "Clothes Male/Chest/Base_character_Male_Fur_Armor.png",
          "Clothes Male/Chest/Base_character_Male_King_Cloak.png"
        ]
      },
      "hair": {
        "mode": "exclude",
        "include": [],
        "exclude": [
          "Hair Male/Base_character_Male_Long_Hair_Black_Unisex.png"
        ]
      },
      "head": {
        "mode": "exclude",
        "include": [],
        "exclude": [
          "Clothes Female/Head/Base_character_Female_Spooky_Pumpkin.png",
          "Clothes Female/Head/Base_character_Female_Hat_Witch.png",
          "Clothes Male/Head/Base_character_Male_Hat_Adventurer.png",
          "Clothes Male/Head/Base_character_Male_Hat_Wizard.png",
          "Clothes Male/Head/Base_character_Male_Helmet_Knight_Closed.png",
          "Clothes Male/Head/Base_character_Male_King_Crown.png",
          "Clothes Male/Head/Base_character_Male_Spooky_Pumpkin.png",
          "Clothes Female/Head/Base_character_Female_Crown.png",
          "Clothes Female/Head/Base_character_Female_Hat_Adventurer.png"
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
