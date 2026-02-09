(function(global) {
  const DEFAULT_WORLD_SCALE = 1.0;
  const WORLD_SCALE =
    (typeof window !== "undefined" && window.__BATTLECHURCH_WORLD_SCALE !== undefined)
      ? Number(window.__BATTLECHURCH_WORLD_SCALE) || DEFAULT_WORLD_SCALE
      : DEFAULT_WORLD_SCALE;
  const HERO_MAX_HEALTH = 100;
  const HERO_BASE_HEARTS = 6;
  const HERO_HEALTH_PER_HEART = HERO_MAX_HEALTH / HERO_BASE_HEARTS;
  const UTILITY_POWERUP_ROOT = "assets/sprites/pixel-art-pack/Items";

  const weaponDropDefs = {
    faith: {
      src: "assets/sprites/pixel-art-pack/Items/I41_Candle.png",
      frameWidth: 16,
      frameHeight: 16,
      frameRate: 8,
      effect: "cannonWeapon",
      duration: 9,
      scale: 6.48 * WORLD_SCALE,
      radius: 28 * WORLD_SCALE,
      label: "Act in Faith",
      iconSrc: "assets/sprites/pixel-art-pack/Items/I41_Candle.png",
      damageMultiplier: 1.0,
      cooldownMultiplier: 0.65,
      speedMultiplier: 1.2,
      maxShots: 3,
      speed: 0,
      // Faith cannon weapon fires the torch-based projectile and now shares the flash hit effect meant
      // for wisdom/flash hits so the animation is tracked next to the fireball assets above.
    },
    scripture: {
      src: "assets/sprites/pixel-art-pack/Items/I25_Book.png",
      frameWidth: 16,
      frameHeight: 16,
      frameRate: 4,
      scale: 5.76 * WORLD_SCALE,
      radius: 24 * WORLD_SCALE,
      effect: "scriptureWeapon",
      duration: 10,
      label: "Quote Scripture",
      iconSrc: "assets/sprites/pixel-art-pack/Items/I25_Book.png",
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
      iconSrc: "assets/sprites/pixel-art-pack/Items/I23_Scroll.png",
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
      iconSrc: "assets/sprites/pixel-art-pack/Items/I25_Book.png",
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
      iconSrc: "assets/sprites/pixel-art-pack/Items/I23_Scroll.png",
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
      iconSrc: "assets/sprites/pixel-art-pack/Items/I41_Candle.png",
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
      iconSrc: "assets/sprites/pixel-art-pack/Armour/A29_Iron_Shield.png",
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
      iconSrc: "assets/sprites/pixel-art-pack/Armour/A39_Grieves.png",
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
      iconSrc: "assets/sprites/pixel-art-pack/Weapons/W14_Sword.png",
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
      label: "Unify Them",
      iconSrc: "assets/sprites/pixel-art-pack/Items/I10_Flower.png",
      color: "#5FE3C0",
      hudTitle: "Unify Them",
      description: "Boosts NPC harmony briefly.",
    },
  };

  const ns =
    global.BattlechurchPowerupDefinitions ||
    (global.BattlechurchPowerupDefinitions = {});
  ns.weaponDropDefs = weaponDropDefs;
  ns.utilityPowerupDefs = utilityPowerupDefs;
})(typeof window !== "undefined" ? window : globalThis);
