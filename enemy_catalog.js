(function(global) {
  const ENEMY_CATALOG = {
  "armoredSkeleton": {
    "displayName": "Armored Skeleton",
    "assetFolder": "armored_skeleton",
    "assetBaseName": "Greatsword Skeleton",
    "assetPath": "assets/enemies/armored_skeleton",
    "assetFiles": {
      "idle": "Walk"
    },
    "health": 1000,
    "maxHealth": 780,
    "damage": 15,
    "speed": 50,
    "baseRadius": 15,
    "scale": 4,
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
      "armored",
      "closestAny"
    ],
    "damageClass": "armored",
    "hitbox": {
      "width": 20,
      "height": 20,
      "offsetX": 0,
      "offsetY": -2
    },
    "attackHitFrame": 6,
    "attackHitDamage": 17,
    "weaponHitbox": {
      "width": 34,
      "height": 24,
      "offsetX": 24,
      "offsetY": 3
    },
    "contactDamage": 0
  },
  "orc": {
    "displayName": "Orc",
    "assetFolder": "orc",
    "assetBaseName": "Orc",
    "assetPath": "assets/enemies/orc",
    "assetFiles": {
      "idle": "Walk",
      "attack": "Attack02"
    },
    "health": 10,
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
      "orc",
      "swarmable",
      "closestAny"
    ],
    "hitbox": {
      "width": 14,
      "height": 14,
      "offsetX": 0,
      "offsetY": 0
    }
  },
  "armoredOrc": {
    "displayName": "Armored Orc",
    "assetFolder": "armored_orc",
    "assetBaseName": "Armored Orc",
    "assetPath": "assets/enemies/armored_orc",
    "assetFiles": {
      "idle": "Walk"
    },
    "health": 400,
    "maxHealth": 745,
    "damage": 5,
    "speed": 50,
    "baseRadius": 17,
    "scale": 4,
    "attackBonus": 36,
    "cooldown": 0.5,
    "score": 280,
    "ranged": false,
    "projectileType": null,
    "preferEdges": false,
    "desiredRange": 110,
    "projectileCooldown": 2,
    "bossTier": 1,
    "preferredTarget": "player",
    "specialBehavior": [
      "armored",
      "closestAny"
    ],
    "damageClass": "armored",
    "hitbox": {
      "width": 20,
      "height": 24,
      "offsetX": 0,
      "offsetY": 0
    },
    "attackHitFrame": 5,
    "attackHitDamage": 11,
    "weaponHitbox": {
      "width": 18,
      "height": 24,
      "offsetX": 20,
      "offsetY": 0
    },
    "contactDamage": 0
  },
  "armoredAxeman": {
    "displayName": "Armored Axeman",
    "assetFolder": "armored_axeman",
    "assetBaseName": "Armored Axeman",
    "assetPath": "assets/enemies/armored_axeman",
    "assetFiles": {
      "idle": "Walk",
      "attack": "Attack02"
    },
    "health": 315,
    "maxHealth": 315,
    "damage": 5,
    "speed": 50,
    "baseRadius": 18,
    "scale": 4.2,
    "attackBonus": 38,
    "cooldown": 1,
    "score": 320,
    "ranged": false,
    "projectileType": null,
    "preferEdges": false,
    "desiredRange": 110,
    "projectileCooldown": 2.1,
    "bossTier": 1,
    "preferredTarget": "player",
    "specialBehavior": [],
    "damageClass": "armored",
    "attackHitFrame": 5,
    "attackHitDamage": 26,
    "hitbox": {
      "width": 24,
      "height": 24,
      "offsetX": 0,
      "offsetY": 0
    },
    "weaponHitbox": {
      "width": 24,
      "height": 24,
      "offsetX": 20,
      "offsetY": 0
    },
    "contactDamage": 0
  },
  "miniImp": {
    "displayName": "Imp",
    "spriteSrc": "assets/sprites/MinifolksDemons/Without outline/MiniImp.png",
    "assetFolder": "Mini Imp",
    "assetBaseName": "Mini Imp",
    "health": 10,
    "maxHealth": 10,
    "damage": 5,
    "speed": 70,
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
      "closestAny",
      "swarmable"
    ],
    "swarmSpacing": 0.1,
    "hitbox": {
      "width": 16,
      "height": 16,
      "offsetX": 0,
      "offsetY": 9
    }
  },
  "miniImpLevel2": {
    "displayName": "Imp Lieutenant",
    "spriteSrc": "assets/sprites/MinifolksDemons/Without outline/MiniImpLevel2.png",
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
      "closestAny",
      "swarmable"
    ],
    "tintColor": "#7ec6ff",
    "tintIntensity": 0.75,
    "swarmSpacing": 0.1,
    "hitbox": {
      "width": 14,
      "height": 14,
      "offsetX": 0,
      "offsetY": 8
    }
  },
  "miniFireImp": {
    "displayName": "Fire Imp",
    "spriteSrc": "assets/sprites/MinifolksDemons/Without outline/MiniFireImp.png",
    "assetFolder": "Mini Fire Imp",
    "assetBaseName": "Mini Fire Imp",
    "health": 20,
    "maxHealth": 45,
    "damage": 5,
    "speed": 70,
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
      "width": 12,
      "height": 14,
      "offsetX": 0,
      "offsetY": 8
    }
  },
  "miniDemoness": {
    "displayName": "Demoness",
    "spriteSrc": "assets/sprites/MinifolksDemons/Without outline/MiniDemoness.png",
    "assetFolder": "Mini Demoness",
    "assetBaseName": "Mini Demoness",
    "health": 100,
    "maxHealth": 45,
    "damage": 8,
    "speed": 70,
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
      "closestAny"
    ],
    "hitbox": {
      "width": 18,
      "height": 20,
      "offsetX": -1,
      "offsetY": 6
    }
  },
  "miniClawedDemon": {
    "displayName": "Clawed Demon",
    "spriteSrc": "assets/sprites/MinifolksDemons/Without outline/MiniClawedDemon.png",
    "assetFolder": "Mini Clawed Demon",
    "assetBaseName": "Mini Clawed Demon",
    "health": 30,
    "maxHealth": 45,
    "damage": 5,
    "speed": 50,
    "baseRadius": 12,
    "scale": 4,
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
    "swarmSpacing": 1,
    "damageClass": "tank",
    "hitbox": {
      "width": 20,
      "height": 20,
      "offsetX": 0,
      "offsetY": 7
    }
  },
  "miniHighDemon": {
    "displayName": "High Demon",
    "spriteSrc": "assets/sprites/MinifolksDemons/Without outline/MiniHighDemon.png",
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
      "boss",
      "closestAny"
    ],
    "damageClass": "tank",
    "hitbox": {
      "width": 18,
      "height": 24,
      "offsetX": 0,
      "offsetY": 9
    },
    "attackHitFrame": 4,
    "attackHitDamage": 15,
    "weaponHitbox": {
      "width": 15,
      "height": 24,
      "offsetX": 15,
      "offsetY": 0
    }
  },
  "miniDemonTormentor": {
    "displayName": "Demon Tormentor",
    "spriteSrc": "assets/sprites/MinifolksDemons/Without outline/MiniDemonTormentor.png",
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
    "ranged": true,
    "projectileType": null,
    "preferEdges": true,
    "desiredRange": 360,
    "projectileCooldown": 1.8,
    "bossTier": 2,
    "preferredTarget": "player",
    "specialBehavior": [
      "boss",
      "closestAny",
      "swarmable",
      "ranged",
      "preferEdges"
    ],
    "swarmSpacing": 1,
    "hitbox": {
      "width": 18,
      "height": 20,
      "offsetX": -2,
      "offsetY": 6
    }
  },
  "miniDemonLord": {
    "displayName": "Demon Lord",
    "spriteSrc": "assets/sprites/MinifolksDemons/Without outline/MiniDemonLord.png",
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
    "ranged": true,
    "projectileType": "fire",
    "preferEdges": true,
    "desiredRange": 360,
    "projectileCooldown": 1.5,
    "bossTier": 3,
    "preferredTarget": "player",
    "specialBehavior": [
      "boss",
      "heavy",
      "closestAny",
      "ranged"
    ],
    "damageClass": "tank",
    "hitbox": {
      "width": 18,
      "height": 24,
      "offsetX": -1,
      "offsetY": 9
    },
    "attackHitFrame": 7,
    "attackHitDamage": 20,
    "weaponHitbox": {
      "width": 18,
      "height": 24,
      "offsetX": 14,
      "offsetY": 0
    }
  },
  "miniDemonFireThrower": {
    "displayName": "Demon Fire Thrower",
    "spriteSrc": "assets/sprites/MinifolksDemons/Without outline/MiniDemonFireThrower.png",
    "assetFolder": "Mini Demon Fire Thrower",
    "assetBaseName": "Mini Demon Fire Thrower",
    "health": 45,
    "maxHealth": 45,
    "damage": 5,
    "speed": 70,
    "baseRadius": 12,
    "scale": 4.8,
    "attackBonus": 24,
    "cooldown": 1.9,
    "score": 65,
    "ranged": true,
    "projectileType": "miniTrident",
    "preferEdges": true,
    "desiredRange": 420,
    "projectileCooldown": 2,
    "bossTier": 1,
    "preferredTarget": "player",
    "specialBehavior": [
      "mini",
      "closestAny",
      "ranged"
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
    "spriteSrc": "assets/sprites/MinifolksDemons/Without outline/MiniDemonFireKeeper.png",
    "assetFolder": "Mini Demon Fire Keeper",
    "assetBaseName": "Mini Demon Fire Keeper",
    "health": 40,
    "maxHealth": 45,
    "damage": 10,
    "speed": 70,
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
      "width": 18,
      "height": 18,
      "offsetX": 0,
      "offsetY": 7
    }
  },
  "miniSuccubus": {
    "displayName": "Succubus",
    "spriteSrc": "assets/sprites/MinifolksDemons/Without outline/MiniSuccubus.png",
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
      "width": 10,
      "height": 14,
      "offsetX": 0,
      "offsetY": 7
    }
  },
  "miniImpLevel3": {
    "displayName": "Imp Commander",
    "spriteSrc": "assets/sprites/MinifolksDemons/Without outline/MiniImpLevel3.png",
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
      "closestAny",
      "swarmable"
    ],
    "swarmSpacing": 0.1,
    "hitbox": {
      "width": 13,
      "height": 13,
      "offsetX": 0,
      "offsetY": 8
    }
  },
  "bat": {
    "displayName": "Bat",
    "spriteSrc": "assets/sprites/enemies/bat.png",
    "assetFolder": "Bat",
    "assetBaseName": "Bat",
    "health": 40,
    "maxHealth": 40,
    "damage": 5,
    "speed": 80,
    "baseRadius": 8,
    "scale": 3.2,
    "attackBonus": 20,
    "cooldown": 0.6,
    "score": 22,
    "ranged": false,
    "projectileType": null,
    "preferEdges": false,
    "desiredRange": 36,
    "projectileCooldown": 0.6,
    "bossTier": 0,
    "preferredTarget": "player",
    "specialBehavior": [
      "mini",
      "closestAny",
      "swarmable"
    ],
    "swarmSpacing": 0.05,
    "hitbox": {
      "width": 16,
      "height": 12,
      "offsetX": 0,
      "offsetY": 6
    }
  },
  "tormentorFlame": {
    "displayName": "Tormentor Flame",
    "spriteSrc": "assets/sprites/fire/Group-4-1.png",
    "assetFolder": "Tormentor Flame",
    "assetBaseName": "Tormentor Flame",
    "health": 90,
    "maxHealth": 90,
    "damage": 5,
    "speed": 72,
    "baseRadius": 8,
    "scale": 1.4,
    "alpha": 0.85,
    "blur": 0.8,
    "attackBonus": 16,
    "cooldown": 0.9,
    "score": 18,
    "ranged": false,
    "projectileType": null,
    "preferEdges": false,
    "desiredRange": 30,
    "projectileCooldown": 0.9,
    "bossTier": 0,
    "preferredTarget": "player",
    "specialBehavior": [
      "mini",
      "closestAny",
      "swarmable",
      "tormentorFlame"
    ],
    "swarmSpacing": 0.2,
    "hitbox": {
      "width": 16,
      "height": 18,
      "offsetX": 0,
      "offsetY": 6
    }
  },
  "armoredEliteOrc": {
    "displayName": "Armored Elite Orc",
    "assetFolder": "armored_elite_orc",
    "assetBaseName": "Elite Orc",
    "assetPath": "assets/enemies/armored_elite_orc",
    "assetFiles": {
      "idle": "Walk",
      "attack": "Attack03"
    },
    "health": 400,
    "maxHealth": 410,
    "damage": 5,
    "speed": 50,
    "baseRadius": 16,
    "scale": 4.5,
    "attackBonus": 36,
    "cooldown": 1,
    "score": 260,
    "ranged": false,
    "projectileType": null,
    "preferEdges": false,
    "desiredRange": 105,
    "projectileCooldown": 2,
    "bossTier": 1,
    "preferredTarget": "player",
    "specialBehavior": [
      "armored"
    ],
    "damageClass": "armored",
    "hitbox": {
      "width": 20,
      "height": 24,
      "offsetX": 0,
      "offsetY": -5
    },
    "attackHitFrame": 5,
    "weaponHitbox": {
      "width": 24,
      "height": 24,
      "offsetX": 22,
      "offsetY": 0
    },
    "attackHitDamage": 13,
    "contactDamage": 0
  }
};
  const ns = global.BattlechurchEnemyCatalog || (global.BattlechurchEnemyCatalog = {});
  ns.catalog = ENEMY_CATALOG;
  const defs = global.BattlechurchEnemyDefinitions || (global.BattlechurchEnemyDefinitions = {});
  Object.assign(defs, ENEMY_CATALOG);
})(typeof window !== "undefined" ? window : globalThis);
