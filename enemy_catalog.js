(function(global) {
  const ENEMY_CATALOG = {
  "slime": {
    "displayName": "Slime",
    "assetFolder": "Slime",
    "assetBaseName": "Slime",
    "health": 40,
    "maxHealth": 40,
    "damage": 5,
    "speed": 150,
    "baseRadius": 11,
    "scale": 2.3,
    "attackBonus": 20,
    "cooldown": 1.2,
    "score": 60,
    "ranged": false,
    "projectileType": null,
    "preferEdges": false,
    "desiredRange": 60,
    "projectileCooldown": 1.2,
    "bossTier": 0,
    "preferredTarget": "player",
    "specialBehavior": [],
    "hitbox": {
      "width": 22,
      "height": 22,
      "offsetX": 0,
      "offsetY": 0
    }
  },
  "archer": {
    "displayName": "Archer",
    "assetFolder": "Archer",
    "assetBaseName": "Archer",
    "health": 55,
    "maxHealth": 55,
    "damage": 5,
    "speed": 170,
    "baseRadius": 12,
    "scale": 4.6,
    "attackBonus": 26,
    "cooldown": 1.4,
    "score": 85,
    "ranged": true,
    "projectileType": "arrow",
    "preferEdges": true,
    "desiredRange": 420,
    "projectileCooldown": 2.1,
    "bossTier": 0,
    "preferredTarget": "player",
    "specialBehavior": [
      "ranged"
    ],
    "hitbox": {
      "width": 24,
      "height": 24,
      "offsetX": 0,
      "offsetY": 0
    }
  },
  "skeleton": {
    "displayName": "Skeleton",
    "assetFolder": "Skeleton",
    "assetBaseName": "Skeleton",
    "health": 35,
    "maxHealth": 35,
    "damage": 5,
    "speed": 145,
    "baseRadius": 13,
    "scale": 3,
    "attackBonus": 28,
    "cooldown": 1.6,
    "score": 110,
    "ranged": false,
    "projectileType": null,
    "preferEdges": false,
    "desiredRange": 70,
    "projectileCooldown": 1.6,
    "bossTier": 0,
    "preferredTarget": "player",
    "specialBehavior": [],
    "hitbox": {
      "width": 26,
      "height": 26,
      "offsetX": 0,
      "offsetY": 0
    }
  },
  "skeletonArcher": {
    "displayName": "Skeleton Archer",
    "assetFiles": {
      "attack": "Attack"
    },
    "assetFolder": "Skeleton Archer",
    "assetBaseName": "Skeleton Archer",
    "health": 70,
    "maxHealth": 70,
    "damage": 5,
    "speed": 150,
    "baseRadius": 13,
    "scale": 3.05,
    "attackBonus": 32,
    "cooldown": 1.6,
    "score": 135,
    "ranged": true,
    "projectileType": "arrow",
    "preferEdges": true,
    "desiredRange": 460,
    "projectileCooldown": 1.8,
    "bossTier": 0,
    "preferredTarget": "player",
    "specialBehavior": [
      "ranged"
    ],
    "hitbox": {
      "width": 26,
      "height": 26,
      "offsetX": 0,
      "offsetY": 0
    }
  },
  "swordsman": {
    "displayName": "Swordsman",
    "assetFolder": "Swordsman",
    "assetBaseName": "Swordsman",
    "health": 105,
    "maxHealth": 105,
    "damage": 5,
    "speed": 135,
    "baseRadius": 14,
    "scale": 3.2,
    "attackBonus": 34,
    "cooldown": 1.6,
    "score": 160,
    "ranged": false,
    "projectileType": null,
    "preferEdges": false,
    "desiredRange": 85,
    "projectileCooldown": 1.6,
    "bossTier": 0,
    "preferredTarget": "player",
    "specialBehavior": [],
    "hitbox": {
      "width": 28,
      "height": 28,
      "offsetX": 0,
      "offsetY": 0
    }
  },
  "lancer": {
    "displayName": "Lancer",
    "assetFiles": {
      "walk": "Walk01"
    },
    "assetFolder": "Lancer",
    "assetBaseName": "Lancer",
    "health": 140,
    "maxHealth": 140,
    "damage": 5,
    "speed": 140,
    "baseRadius": 14,
    "scale": 3.3,
    "attackBonus": 42,
    "cooldown": 1.7,
    "score": 180,
    "ranged": false,
    "projectileType": null,
    "preferEdges": false,
    "desiredRange": 90,
    "projectileCooldown": 1.7,
    "bossTier": 1,
    "preferredTarget": "player",
    "specialBehavior": [
      "charge"
    ],
    "hitbox": {
      "width": 28,
      "height": 28,
      "offsetX": 0,
      "offsetY": 0
    }
  },
  "priest": {
    "displayName": "Priest",
    "assetFiles": {
      "attack": "Attack"
    },
    "assetFolder": "Priest",
    "assetBaseName": "Priest",
    "health": 140,
    "maxHealth": 140,
    "damage": 5,
    "speed": 130,
    "baseRadius": 13,
    "scale": 3.1,
    "attackBonus": 34,
    "cooldown": 1.5,
    "score": 170,
    "ranged": false,
    "projectileType": null,
    "preferEdges": false,
    "desiredRange": 75,
    "projectileCooldown": 1.5,
    "bossTier": 1,
    "preferredTarget": "player",
    "specialBehavior": [
      "support"
    ],
    "hitbox": {
      "width": 26,
      "height": 26,
      "offsetX": 0,
      "offsetY": 0
    }
  },
  "wizard": {
    "displayName": "Wizard",
    "assetFiles": {
      "death": "DEATH"
    },
    "assetFolder": "Wizard",
    "assetBaseName": "Wizard",
    "health": 175,
    "maxHealth": 175,
    "damage": 5,
    "speed": 130,
    "baseRadius": 13,
    "scale": 3.2,
    "attackBonus": 36,
    "cooldown": 1.7,
    "score": 190,
    "ranged": true,
    "projectileType": "fire",
    "preferEdges": true,
    "desiredRange": 440,
    "projectileCooldown": 1.7,
    "bossTier": 1,
    "preferredTarget": "player",
    "specialBehavior": [
      "ranged",
      "mage"
    ],
    "hitbox": {
      "width": 26,
      "height": 26,
      "offsetX": 0,
      "offsetY": 0
    }
  },
  "knight": {
    "displayName": "Knight",
    "assetFolder": "Knight",
    "assetBaseName": "Knight",
    "health": 210,
    "maxHealth": 210,
    "damage": 5,
    "speed": 130,
    "baseRadius": 15,
    "scale": 3.5,
    "attackBonus": 34,
    "cooldown": 1.8,
    "score": 210,
    "ranged": false,
    "projectileType": null,
    "preferEdges": false,
    "desiredRange": 95,
    "projectileCooldown": 1.8,
    "bossTier": 1,
    "preferredTarget": "player",
    "specialBehavior": [
      "tank"
    ],
    "hitbox": {
      "width": 30,
      "height": 30,
      "offsetX": 0,
      "offsetY": 0
    }
  },
  "knightTemplar": {
    "displayName": "Knight Templar",
    "assetFiles": {
      "walk": "Walk01"
    },
    "assetFolder": "Knight Templar",
    "assetBaseName": "Knight Templar",
    "health": 345,
    "maxHealth": 345,
    "damage": 5,
    "speed": 125,
    "baseRadius": 15,
    "scale": 6,
    "attackBonus": 36,
    "cooldown": 1.8,
    "score": 230,
    "ranged": false,
    "projectileType": null,
    "preferEdges": false,
    "desiredRange": 100,
    "projectileCooldown": 1.8,
    "bossTier": 2,
    "preferredTarget": "player",
    "specialBehavior": [
      "boss",
      "heavy"
    ],
    "hitbox": {
      "width": 30,
      "height": 30,
      "offsetX": 0,
      "offsetY": 0
    }
  },
  "armoredSkeleton": {
    "displayName": "Armored Skeleton",
    "assetFolder": "Armored Skeleton",
    "assetBaseName": "Armored Skeleton",
    "health": 780,
    "maxHealth": 780,
    "damage": 15,
    "speed": 125,
    "baseRadius": 15,
    "scale": 5,
    "attackBonus": 34,
    "cooldown": 1.9,
    "score": 240,
    "ranged": false,
    "projectileType": null,
    "preferEdges": false,
    "desiredRange": 110,
    "projectileCooldown": 1.9,
    "bossTier": 1,
    "preferredTarget": "player",
    "specialBehavior": [
      "armored"
    ],
    "hitbox": {
      "width": 30,
      "height": 30,
      "offsetX": 0,
      "offsetY": 0
    }
  },
  "greatswordSkeleton": {
    "displayName": "Greatsword Skeleton",
    "assetFolder": "Greatsword Skeleton",
    "assetBaseName": "Greatsword Skeleton",
    "health": 900,
    "maxHealth": 900,
    "damage": 5,
    "speed": 100,
    "baseRadius": 16,
    "scale": 6,
    "attackBonus": 40,
    "cooldown": 1.9,
    "score": 255,
    "ranged": false,
    "projectileType": null,
    "preferEdges": false,
    "desiredRange": 120,
    "projectileCooldown": 1.9,
    "bossTier": 2,
    "preferredTarget": "player",
    "specialBehavior": [
      "heavy"
    ],
    "hitbox": {
      "width": 32,
      "height": 32,
      "offsetX": 0,
      "offsetY": 0
    }
  },
  "orc": {
    "displayName": "Orc",
    "assetFolder": "Orc",
    "assetBaseName": "Orc",
    "health": 220,
    "maxHealth": 220,
    "damage": 5,
    "speed": 125,
    "baseRadius": 15,
    "scale": 3.4,
    "attackBonus": 34,
    "cooldown": 1.8,
    "score": 200,
    "ranged": false,
    "projectileType": null,
    "preferEdges": false,
    "desiredRange": 100,
    "projectileCooldown": 1.8,
    "bossTier": 1,
    "preferredTarget": "player",
    "specialBehavior": [
      "orc"
    ],
    "hitbox": {
      "width": 30,
      "height": 30,
      "offsetX": 0,
      "offsetY": 0
    }
  },
  "eliteOrc": {
    "displayName": "Elite Orc",
    "assetFolder": "Elite Orc",
    "assetBaseName": "Elite Orc",
    "health": 410,
    "maxHealth": 410,
    "damage": 5,
    "speed": 120,
    "baseRadius": 16,
    "scale": 4.5,
    "attackBonus": 36,
    "cooldown": 2,
    "score": 260,
    "ranged": false,
    "projectileType": null,
    "preferEdges": false,
    "desiredRange": 105,
    "projectileCooldown": 2,
    "bossTier": 1,
    "preferredTarget": "player",
    "specialBehavior": [
      "elite"
    ],
    "hitbox": {
      "width": 32,
      "height": 32,
      "offsetX": 0,
      "offsetY": 0
    }
  },
  "armoredOrc": {
    "displayName": "Armored Orc",
    "assetFolder": "Armored Orc",
    "assetBaseName": "Armored Orc",
    "health": 745,
    "maxHealth": 745,
    "damage": 5,
    "speed": 115,
    "baseRadius": 17,
    "scale": 6,
    "attackBonus": 36,
    "cooldown": 2,
    "score": 280,
    "ranged": false,
    "projectileType": null,
    "preferEdges": false,
    "desiredRange": 110,
    "projectileCooldown": 2,
    "bossTier": 1,
    "preferredTarget": "player",
    "specialBehavior": [
      "armored"
    ],
    "hitbox": {
      "width": 34,
      "height": 34,
      "offsetX": 0,
      "offsetY": 0
    }
  },
  "orcRider": {
    "displayName": "Orc Rider",
    "assetFolder": "Orc Rider",
    "assetBaseName": "Orc Rider",
    "health": 280,
    "maxHealth": 280,
    "damage": 5,
    "speed": 140,
    "baseRadius": 18,
    "scale": 5,
    "attackBonus": 40,
    "cooldown": 1.9,
    "score": 300,
    "ranged": false,
    "projectileType": null,
    "preferEdges": true,
    "desiredRange": 120,
    "projectileCooldown": 1.9,
    "bossTier": 1,
    "preferredTarget": "player",
    "specialBehavior": [
      "mounted"
    ],
    "hitbox": {
      "width": 36,
      "height": 36,
      "offsetX": 0,
      "offsetY": 0
    }
  },
  "armoredAxeman": {
    "displayName": "Armored Axeman",
    "assetFolder": "Armored Axeman",
    "assetBaseName": "Armored Axeman",
    "health": 315,
    "maxHealth": 315,
    "damage": 5,
    "speed": 115,
    "baseRadius": 18,
    "scale": 4.2,
    "attackBonus": 38,
    "cooldown": 2.1,
    "score": 320,
    "ranged": false,
    "projectileType": null,
    "preferEdges": false,
    "desiredRange": 110,
    "projectileCooldown": 2.1,
    "bossTier": 1,
    "preferredTarget": "player",
    "specialBehavior": [
      "axe"
    ],
    "hitbox": {
      "width": 36,
      "height": 36,
      "offsetX": 0,
      "offsetY": 0
    }
  },
  "werewolf": {
    "displayName": "Werewolf",
    "assetFolder": "Werewolf",
    "assetBaseName": "Werewolf",
    "health": 210,
    "maxHealth": 210,
    "damage": 5,
    "speed": 155,
    "baseRadius": 17,
    "scale": 4,
    "attackBonus": 36,
    "cooldown": 1.7,
    "score": 305,
    "ranged": false,
    "projectileType": null,
    "preferEdges": false,
    "desiredRange": 100,
    "projectileCooldown": 1.7,
    "bossTier": 1,
    "preferredTarget": "player",
    "specialBehavior": [
      "beast"
    ],
    "hitbox": {
      "width": 34,
      "height": 34,
      "offsetX": 0,
      "offsetY": 0
    }
  },
  "werebear": {
    "displayName": "Werebear",
    "assetFolder": "Werebear",
    "assetBaseName": "Werebear",
    "health": 350,
    "maxHealth": 350,
    "damage": 5,
    "speed": 110,
    "baseRadius": 19,
    "scale": 4.3,
    "attackBonus": 38,
    "cooldown": 2.2,
    "score": 340,
    "ranged": false,
    "projectileType": null,
    "preferEdges": false,
    "desiredRange": 120,
    "projectileCooldown": 2.2,
    "bossTier": 2,
    "preferredTarget": "player",
    "specialBehavior": [
      "heavy",
      "beast"
    ],
    "hitbox": {
      "width": 38,
      "height": 38,
      "offsetX": 0,
      "offsetY": 0
    }
  },
  "miniImp": {
    "displayName": "Imp",
    "assetFolder": "Mini Imp",
    "assetBaseName": "Mini Imp",
    "health": 10,
    "maxHealth": 10,
    "damage": 5,
    "speed": 120,
    "baseRadius": 8,
    "scale": 4,
    "attackBonus": 18,
    "cooldown": 0.9,
    "score": 18,
    "ranged": false,
    "projectileType": null,
    "preferEdges": false,
    "desiredRange": 32,
    "projectileCooldown": 0.9,
    "bossTier": 0,
    "preferredTarget": "player",
    "specialBehavior": [
      "mini",
      "popcorn",
      "closestAny",
      "swarmable"
    ],
    "swarmSpacing": 0.1,
    "hitbox": {
      "width": 16,
      "height": 16,
      "offsetX": 0,
      "offsetY": 7
    }
  },
  "miniImpLevel2": {
    "displayName": "Imp Lieutenant",
    "assetFolder": "Mini Imp",
    "assetBaseName": "Mini Imp",
    "health": 20,
    "maxHealth": 20,
    "damage": 10,
    "speed": 100,
    "baseRadius": 10,
    "scale": 4.5,
    "attackBonus": 20,
    "cooldown": 0.9,
    "score": 36,
    "ranged": false,
    "projectileType": null,
    "preferEdges": false,
    "desiredRange": 36,
    "projectileCooldown": 0.9,
    "bossTier": 0,
    "preferredTarget": "player",
    "specialBehavior": [
      "mini",
      "elite",
      "closestAny",
      "swarmable",
      "popcorn"
    ],
    "tintColor": "#7ec6ff",
    "tintIntensity": 0.75,
    "swarmSpacing": 0.1,
    "hitbox": {
      "width": 16,
      "height": 16,
      "offsetX": 0,
      "offsetY": 8
    }
  },
  "miniFireImp": {
    "displayName": "Fire Imp",
    "assetFolder": "Mini Fire Imp",
    "assetBaseName": "Mini Fire Imp",
    "health": 20,
    "maxHealth": 45,
    "damage": 5,
    "speed": 100,
    "baseRadius": 12,
    "scale": 5,
    "attackBonus": 20,
    "cooldown": 1,
    "score": 45,
    "ranged": true,
    "projectileType": "miniTrident",
    "preferEdges": true,
    "desiredRange": 360,
    "projectileCooldown": 1.6,
    "bossTier": 0,
    "preferredTarget": "player",
    "specialBehavior": [
      "mini",
      "projectile",
      "closestAny"
    ],
    "hitbox": {
      "width": 14,
      "height": 16,
      "offsetX": 0,
      "offsetY": 8
    }
  },
  "miniDemoness": {
    "displayName": "Demoness",
    "assetFolder": "Mini Demoness",
    "assetBaseName": "Mini Demoness",
    "health": 100,
    "maxHealth": 45,
    "damage": 8,
    "speed": 100,
    "baseRadius": 12,
    "scale": 5.8,
    "attackBonus": 24,
    "cooldown": 1.2,
    "score": 52,
    "ranged": false,
    "projectileType": null,
    "preferEdges": false,
    "desiredRange": 60,
    "projectileCooldown": 1.2,
    "bossTier": 0,
    "preferredTarget": "player",
    "specialBehavior": [
      "mini",
      "closestAny"
    ],
    "hitbox": {
      "width": 20,
      "height": 20,
      "offsetX": 0,
      "offsetY": 7
    }
  },
  "miniClawedDemon": {
    "displayName": "Clawed Demon",
    "assetFolder": "Mini Clawed Demon",
    "assetBaseName": "Mini Clawed Demon",
    "health": 30,
    "maxHealth": 45,
    "damage": 5,
    "speed": 100,
    "baseRadius": 12,
    "scale": 3.5,
    "attackBonus": 24,
    "cooldown": 1.3,
    "score": 55,
    "ranged": false,
    "projectileType": null,
    "preferEdges": false,
    "desiredRange": 70,
    "projectileCooldown": 1.3,
    "bossTier": 0,
    "preferredTarget": "player",
    "specialBehavior": [
      "mini",
      "closestAny",
      "swarmable"
    ],
    "swarmSpacing": 0.5,
    "hitbox": {
      "width": 20,
      "height": 20,
      "offsetX": 0,
      "offsetY": 7
    }
  },
  "miniHighDemon": {
    "displayName": "High Demon",
    "assetFolder": "Mini High Demon",
    "assetBaseName": "Mini High Demon",
    "health": 400,
    "maxHealth": 450,
    "damage": 10,
    "speed": 40,
    "baseRadius": 14,
    "scale": 5.6,
    "attackBonus": 36,
    "cooldown": 1.8,
    "score": 180,
    "ranged": false,
    "projectileType": null,
    "preferEdges": false,
    "desiredRange": 110,
    "projectileCooldown": 1.8,
    "bossTier": 2,
    "preferredTarget": "player",
    "specialBehavior": [
      "mini",
      "boss",
      "closestAny"
    ],
    "hitbox": {
      "width": 24,
      "height": 24,
      "offsetX": 3,
      "offsetY": 8
    }
  },
  "miniDemonTormentor": {
    "displayName": "Demon Tormentor",
    "assetFolder": "Mini Demon Tormentor",
    "assetBaseName": "Mini Demon Tormentor",
    "health": 300,
    "maxHealth": 450,
    "damage": 10,
    "speed": 50,
    "baseRadius": 14,
    "scale": 7,
    "attackBonus": 34,
    "cooldown": 1.8,
    "score": 240,
    "ranged": false,
    "projectileType": null,
    "preferEdges": false,
    "desiredRange": 130,
    "projectileCooldown": 1.8,
    "bossTier": 2,
    "preferredTarget": "player",
    "specialBehavior": [
      "mini",
      "boss",
      "closestAny",
      "swarmable"
    ],
    "swarmSpacing": 1,
    "hitbox": {
      "width": 24,
      "height": 20,
      "offsetX": 0,
      "offsetY": 6
    }
  },
  "miniDemonLord": {
    "displayName": "Demon Lord",
    "assetFolder": "Mini Demon Lord",
    "assetBaseName": "Mini Demon Lord",
    "health": 500,
    "maxHealth": 600,
    "damage": 20,
    "speed": 35,
    "baseRadius": 16,
    "scale": 6.8,
    "attackBonus": 40,
    "cooldown": 1.5,
    "score": 320,
    "ranged": false,
    "projectileType": null,
    "preferEdges": false,
    "desiredRange": 140,
    "projectileCooldown": 1.5,
    "bossTier": 3,
    "preferredTarget": "player",
    "specialBehavior": [
      "mini",
      "boss",
      "heavy",
      "closestAny"
    ],
    "hitbox": {
      "width": 24,
      "height": 24,
      "offsetX": 0,
      "offsetY": 8
    }
  },
  "miniDemonFireThrower": {
    "displayName": "Demon Fire Thrower",
    "assetFolder": "Mini Demon Fire Thrower",
    "assetBaseName": "Mini Demon Fire Thrower",
    "health": 45,
    "maxHealth": 45,
    "damage": 5,
    "speed": 100,
    "baseRadius": 12,
    "scale": 4.8,
    "attackBonus": 24,
    "cooldown": 1.9,
    "score": 65,
    "ranged": false,
    "projectileType": "miniTrident",
    "preferEdges": true,
    "desiredRange": 420,
    "projectileCooldown": 2,
    "bossTier": 1,
    "preferredTarget": "player",
    "specialBehavior": [
      "mini",
      "closestAny",
      "swarmable"
    ],
    "swarmSpacing": 1,
    "hitbox": {
      "width": 16,
      "height": 16,
      "offsetX": 0,
      "offsetY": 8
    }
  },
  "miniDemonFireKeeper": {
    "displayName": "Demon Fire Keeper",
    "assetFolder": "Mini Demon Fire Keeper",
    "assetBaseName": "Mini Demon Fire Keeper",
    "health": 40,
    "maxHealth": 45,
    "damage": 10,
    "speed": 100,
    "baseRadius": 12,
    "scale": 4,
    "attackBonus": 24,
    "cooldown": 1.6,
    "score": 70,
    "ranged": false,
    "projectileType": "miniTrident",
    "preferEdges": true,
    "desiredRange": 420,
    "projectileCooldown": 2.4,
    "bossTier": 1,
    "preferredTarget": "player",
    "specialBehavior": [
      "mini",
      "closestAny"
    ],
    "swarmSpacing": 0.1,
    "hitbox": {
      "width": 16,
      "height": 18,
      "offsetX": 0,
      "offsetY": 7
    }
  },
  "miniSuccubus": {
    "displayName": "Succubus",
    "assetFolder": "Mini Succubus",
    "assetBaseName": "Mini Succubus",
    "health": 30,
    "maxHealth": 45,
    "damage": 6,
    "speed": 125,
    "baseRadius": 12,
    "scale": 4.8,
    "attackBonus": 26,
    "cooldown": 1.3,
    "score": 75,
    "ranged": true,
    "projectileType": "arrow",
    "preferEdges": true,
    "desiredRange": 360,
    "projectileCooldown": 1.8,
    "bossTier": 1,
    "preferredTarget": "player",
    "specialBehavior": [
      "mini",
      "ranged",
      "closestAny"
    ],
    "hitbox": {
      "width": 15,
      "height": 20,
      "offsetX": 0,
      "offsetY": 7
    }
  },
  "miniImpLevel3": {
    "displayName": "Imp Commander",
    "assetFolder": "Mini Imp",
    "assetBaseName": "Mini Imp",
    "health": 30,
    "maxHealth": 30,
    "damage": 15,
    "speed": 80,
    "baseRadius": 10,
    "scale": 5,
    "attackBonus": 30,
    "cooldown": 0.85,
    "score": 36,
    "ranged": false,
    "projectileType": null,
    "preferEdges": false,
    "desiredRange": 36,
    "projectileCooldown": 0.85,
    "bossTier": 0,
    "preferredTarget": "player",
    "specialBehavior": [
      "mini",
      "popcorn",
      "closestAny",
      "swarmable"
    ],
    "swarmSpacing": 0.1,
    "hitbox": {
      "width": 16,
      "height": 17,
      "offsetX": 0,
      "offsetY": 8
    }
  }
};
  const ns = global.BattlechurchEnemyCatalog || (global.BattlechurchEnemyCatalog = {});
  ns.catalog = ENEMY_CATALOG;
  const defs = global.BattlechurchEnemyDefinitions || (global.BattlechurchEnemyDefinitions = {});
  Object.assign(defs, ENEMY_CATALOG);
})(typeof window !== "undefined" ? window : globalThis);
