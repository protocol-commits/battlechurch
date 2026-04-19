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
      label: "Quote Scripture",
      iconSrc: "assets/sprites/items/icons/I25_Book.png",
      damageMultiplier: 1.0,
      cooldownMultiplier: 0.95,
      speedMultiplier: 1.15,
      maxShots: 2,
      speed: 0,
    },
    wisdom: {
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
      label: "Quote Scripture",
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
      duration: 9,
      label: "Shield of Faith",
      spokenName: "Shield of Faith",
      iconSrc: "assets/sprites/items/Armour/A29_Iron_Shield.png",
      color: "#9BD9FF",
      hudTitle: "Shield of Faith",
      description: "Blocks damage for a short time.",
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
      description: "Move faster for a short time.",
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
      description: "Extends your current weapon power.",
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
      description: "Encourages NPCs to fight harder briefly.",
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
      hudTitle: "Judgment Bomb",
      description: "Deals 200 damage to every enemy on screen.",
    },
  };

  // Per-level purchase costs for church powerups.
  // Levels 1-5 (single instance building to full duration): base cost.
  // Levels 6-10 (second instance building to full duration): slightly higher.
  const CHURCH_LEVEL_COSTS = [40, 40, 40, 40, 40, 50, 50, 50, 50, 50];

  const churchPowerupDefs = {
    spreadGun: {
      src: `${CHURCH_POWERUP_ROOT}/Spread.png`,
      scale: 4.4 * WORLD_SCALE,
      radius: 26 * WORLD_SCALE,
      effect: "spreadGun",
      duration: 10,
      label: "Small Groups",
      iconSrc: `${CHURCH_POWERUP_ROOT}/Spread.png`,
      description: "Multiply ministry through home-based small groups.",
      levelCosts: CHURCH_LEVEL_COSTS,
    },
    halo: {
      src: `${CHURCH_POWERUP_ROOT}/Dagger.png`,
      scale: 3.8 * WORLD_SCALE,
      radius: 26 * WORLD_SCALE,
      effect: "halo",
      duration: 12,
      label: "Prayer Team",
      iconSrc: "assets/sprites/items/icons/A13_Headband.png",
      description: "Protect your congregation through focused prayer.",
      levelCosts: CHURCH_LEVEL_COSTS,
    },
    spear: {
      src: `${CHURCH_POWERUP_ROOT}/Spear.png`,
      scale: 4.2 * WORLD_SCALE,
      radius: 26 * WORLD_SCALE,
      effect: "spear",
      duration: 10,
      label: "Care Team",
      iconSrc: `${CHURCH_POWERUP_ROOT}/Spear.png`,
      description: "Target specific needs in your congregation.",
      levelCosts: CHURCH_LEVEL_COSTS,
    },
    sentry: {
      src: `${CHURCH_POWERUP_ROOT}/Lantern.png`,
      scale: 3.6 * WORLD_SCALE,
      radius: 26 * WORLD_SCALE,
      effect: "sentry",
      duration: 12,
      label: "Leadership Team",
      iconSrc: `${CHURCH_POWERUP_ROOT}/Lantern.png`,
      description: "Equip others to take initiative.",
      levelCosts: CHURCH_LEVEL_COSTS,
    },
  };

  const ns =
    global.BattlechurchPowerupDefinitions ||
    (global.BattlechurchPowerupDefinitions = {});
  ns.weaponDropDefs = weaponDropDefs;
  ns.utilityPowerupDefs = utilityPowerupDefs;
  ns.churchPowerupDefs = churchPowerupDefs;
})(typeof window !== "undefined" ? window : globalThis);
