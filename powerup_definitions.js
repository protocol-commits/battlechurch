(function(global) {
  const DEFAULT_WORLD_SCALE = 1.0;
  const WORLD_SCALE =
    (typeof window !== "undefined" && window.__BATTLECHURCH_WORLD_SCALE !== undefined)
      ? Number(window.__BATTLECHURCH_WORLD_SCALE) || DEFAULT_WORLD_SCALE
      : DEFAULT_WORLD_SCALE;
  const HERO_MAX_HEALTH = 100;
  const HERO_BASE_HEARTS = 6;
  const HERO_HEALTH_PER_HEART = HERO_MAX_HEALTH / HERO_BASE_HEARTS;
  const UTILITY_POWERUP_ROOT = "assets/sprites/items/icons";
  const CHURCH_POWERUP_ROOT = "assets/sprites/items/Weapons";

  const weaponDropDefs = {
    faith: {
      src: "assets/sprites/items/icons/I41_Candle.png",
      frameWidth: 16,
      frameHeight: 16,
      frameRate: 8,
      effect: "cannonWeapon",
      duration: 9,
      scale: 6.48 * WORLD_SCALE,
      radius: 28 * WORLD_SCALE,
      label: "Act in Faith",
      iconSrc: "assets/sprites/items/icons/I41_Candle.png",
      description: "High-pressure barrage fire",
      damageMultiplier: 1.0,
      cooldownMultiplier: 0.65,
      speedMultiplier: 1.2,
      maxShots: 3,
      speed: 0,
      // Faith cannon weapon fires the torch-based projectile and now shares the flash hit effect meant
      // for wisdom/flash hits so the animation is tracked next to the fireball assets above.
    },
    scripture: {
      src: "assets/sprites/items/icons/I25_Book.png",
      frameWidth: 16,
      frameHeight: 16,
      frameRate: 4,
      scale: 5.76 * WORLD_SCALE,
      radius: 24 * WORLD_SCALE,
      effect: "scriptureWeapon",
      duration: 10,
      label: "Trust Scripture",
      iconSrc: "assets/sprites/items/icons/I25_Book.png",
      description: "Fast piercing flames",
      damageMultiplier: 1.0,
      cooldownMultiplier: 0.95,
      speedMultiplier: 1.15,
      maxShots: 2,
      speed: 0,
    },
    wisdom: {
      description: "Powerful methodical cannon",
      frameSources: [
        `${UTILITY_POWERUP_ROOT}/I57_Coin.png`,
        `${UTILITY_POWERUP_ROOT}/I57_Coin.png`,
        `${UTILITY_POWERUP_ROOT}/I57_Coin.png`,
        `${UTILITY_POWERUP_ROOT}/I57_Coin.png`,
      ],
      frameRate: 8,
      effect: "wisdomWeapon",
      duration: 10,
      scale: 5.04 * WORLD_SCALE,
      radius: 26 * WORLD_SCALE,
      label: "Apply Wisdom",
      iconSrc: "assets/sprites/items/icons/I23_Scroll.png",
      damageMultiplier: 1.0,
      cooldownMultiplier: 0.55,
      speedMultiplier: 1.4,
      maxShots: 2,
      speed: 0,
    },
    npcScripture: {
      src: `${UTILITY_POWERUP_ROOT}/I25_Book.png`,
      effect: "npcScriptureWeapon",
      duration: 10,
      scale: 0.24 * WORLD_SCALE,
      radius: 26 * WORLD_SCALE,
      label: "Trust Scripture",
      iconSrc: "assets/sprites/items/icons/I25_Book.png",
      damageMultiplier: 1.0,
      cooldownMultiplier: 0.95,
      speedMultiplier: 1.0,
      maxShots: 2,
      speed: 0,
    },
    npcWisdom: {
      src: `${UTILITY_POWERUP_ROOT}/I07_Apple.png`,
      effect: "npcWisdomWeapon",
      duration: 10,
      scale: 0.24 * WORLD_SCALE,
      radius: 26 * WORLD_SCALE,
      label: "Apply Wisdom",
      iconSrc: "assets/sprites/items/icons/I23_Scroll.png",
      damageMultiplier: 1.0,
      cooldownMultiplier: 0.55,
      speedMultiplier: 1.0,
      maxShots: 2,
      speed: 0,
    },
    npcFaith: {
      src: `${UTILITY_POWERUP_ROOT}/I02_HP_Potion_M.png`,
      effect: "npcFaithWeapon",
      duration: 9,
      scale: 0.26 * WORLD_SCALE,
      radius: 28 * WORLD_SCALE,
      label: "Act in Faith",
      iconSrc: "assets/sprites/items/icons/I41_Candle.png",
      damageMultiplier: 1.0,
      cooldownMultiplier: 0.65,
      speedMultiplier: 1.0,
      maxShots: 2,
      speed: 0,
    },
  };

  const utilityPowerupDefs = {
    shield: {
      src: `${UTILITY_POWERUP_ROOT}/I28_Idol.png`,
      scale: 3.2 * WORLD_SCALE,
      radius: 30 * WORLD_SCALE,
      effect: "shield",
      duration: 7,
      label: "Shield of Faith",
      spokenName: "Shield of Faith",
      iconSrc: "assets/sprites/items/Armour/A29_Iron_Shield.png",
      color: "#9BD9FF",
      hudTitle: "Shield of Faith",
      description: "Blocks damage",
    },
    haste: {
      src: `${UTILITY_POWERUP_ROOT}/I27_Rune.png`,
      scale: 3.0 * WORLD_SCALE,
      radius: 28 * WORLD_SCALE,
      effect: "haste",
      duration: 8,
      label: "Speed Boost",
      spokenName: "Quicken",
      iconSrc: "assets/sprites/items/Armour/A39_Grieves.png",
      color: "#5FE3C0",
      speedMultiplier: 1.4,
      hudTitle: "Speed Boost",
      description: "Move faster",
    },
    extender: {
      src: `${UTILITY_POWERUP_ROOT}/I36_Hammer.png`,
      scale: 2.8 * WORLD_SCALE,
      radius: 28 * WORLD_SCALE,
      effect: "extend",
      duration: 10,
      label: "Perseverance",
      spokenName: "Perseverance",
      iconSrc: "assets/sprites/items/Weapons/W14_Sword.png",
      color: "#FFC86A",
      extendMultiplier: 1.5,
      hudTitle: "Perseverance",
      description: "Extends your current weapon power",
    },
    harmony: {
      src: `${UTILITY_POWERUP_ROOT}/I10_Flower.png`,
      scale: 3.0 * WORLD_SCALE,
      radius: 28 * WORLD_SCALE,
      effect: "harmony",
      duration: 10,
      label: "Encouragement",
      spokenName: "Encouragement",
      iconSrc: "assets/sprites/items/icons/I10_Flower.png",
      color: "#5FE3C0",
      hudTitle: "Encouragement",
      description: "Congregants fight harder together",
    },
    smiteBomb: {
      src: `${UTILITY_POWERUP_ROOT}/I02_HP_Potion_M.png`,
      scale: 3.0 * WORLD_SCALE,
      radius: 28 * WORLD_SCALE,
      effect: "smiteBomb",
      damage: 200,
      label: "Judgment Bomb",
      spokenName: "Purify",
      iconSrc: "assets/sprites/items/icons/I02_HP_Potion_M.png",
      color: "#FF9D5C",
      hudTitle: "Purify",
      description: "Damages all enemies",
    },
  };

  // Per-level purchase costs for church powerups.
  // All levels use the same flat purchase cost.
  const CHURCH_LEVEL_COSTS = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100];

  const churchPowerupDefs = {
    spreadGun: {
      src: `${CHURCH_POWERUP_ROOT}/Spread.png`,
      scale: 4.4 * WORLD_SCALE,
      radius: 26 * WORLD_SCALE,
      effect: "spreadGun",
      duration: 10,
      label: "Tracer",
      weaponName: "Spread Gun",
      iconSrc: `${CHURCH_POWERUP_ROOT}/Spread.png`,
      shopDescription: "Multiply ministry through small groups.",
      levelCosts: CHURCH_LEVEL_COSTS,
      tuning: {
        damage: 30,                  // damage per tracer shot (overrides arrow damage)
        cooldown: 0.08,               // seconds between tracer bursts (lower = faster)
        spreadStep: 0.15,            // radians between each tracer pair
        tracerSpeedMultiplier: 3.0,  // tracer speed multiplier vs base arrow speed
        splashRadius: 80,            // splash radius in game pixels (world scale applied at runtime)
        splashDamageRatio: 0.5,      // splash damage as fraction of direct hit damage
      },
    },
    halo: {
      src: `${CHURCH_POWERUP_ROOT}/Dagger.png`,
      scale: 3.8 * WORLD_SCALE,
      radius: 26 * WORLD_SCALE,
      effect: "halo",
      duration: 12,
      label: "Halo",
      weaponName: "Orbiting Blades",
      iconSrc: "assets/sprites/items/icons/A13_Headband.png",
      shopDescription: "Establish a prayer chain",
      levelCosts: CHURCH_LEVEL_COSTS,
      tuning: {
        damage: 20,
        orbitRadius: 388,   // game pixels (world scale applied at runtime)
        rotationSpeed: 5.6, // radians/sec
        hitCooldown: 0.25,  // seconds between hits on the same target
      },
    },
    spear: {
      src: `${CHURCH_POWERUP_ROOT}/Spear.png`,
      scale: 4.2 * WORLD_SCALE,
      radius: 26 * WORLD_SCALE,
      effect: "spear",
      duration: 10,
      label: "Lance",
      weaponName: "Homing Spear",
      iconSrc: `${CHURCH_POWERUP_ROOT}/Spear.png`,
      shopDescription: "Mobilize a Care Ministry.",
      levelCosts: CHURCH_LEVEL_COSTS,
      tuning: {
        damage: 10,
        speed: 1000,           // pixels/sec (world scale applied at runtime)
        hitCooldown: 0.15,     // seconds between hits on the same target
        pauseDuration: 0.04,   // seconds the spear pauses at its target before retargeting
        searchSpinSpeed: 1.2,  // radians/sec spin speed while searching for a target
      },
    },
    sentry: {
      src: `${CHURCH_POWERUP_ROOT}/Lantern.png`,
      scale: 3.6 * WORLD_SCALE,
      radius: 26 * WORLD_SCALE,
      effect: "sentry",
      duration: 12,
      label: "Sentry",
      weaponName: "Targeting Laser",
      iconSrc: `${CHURCH_POWERUP_ROOT}/Lantern.png`,
      shopDescription: "Grow leaders to take initiative.",
      levelCosts: CHURCH_LEVEL_COSTS,
      tuning: {
        damage: 30,
        hitInterval: 0.1,       // seconds between damage ticks (lower = more DPS)
        beamCooldown: 0.6,      // gap between beam pulses
        beamPulseDuration: 0.34, // how long each beam pulse lasts
        sweepStep: 0.349,        // radians rotated per target scan step (~20deg, Math.PI/9)
        pulseSweepAmount: 0.15, // arc swept across locked target per pulse (~18deg, Math.PI/10)
        pulseSweepSpeed: 0.4,    // radians/sec sweep speed during pulse
      },
    },
  };

  const ns =
    global.BattlechurchPowerupDefinitions ||
    (global.BattlechurchPowerupDefinitions = {});
  ns.weaponDropDefs = weaponDropDefs;
  ns.utilityPowerupDefs = utilityPowerupDefs;
  ns.churchPowerupDefs = churchPowerupDefs;
})(typeof window !== "undefined" ? window : globalThis);
