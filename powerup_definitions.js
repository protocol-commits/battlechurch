(function(global) {
  const DECOR_CONFIG = (typeof window !== "undefined" && window.WorldDecor) || {};
  const VALLEY_OBJECTS_PATH =
    DECOR_CONFIG.VALLEY_OBJECTS_PATH || "assets/sprites/cute-valley/Objects/";
  const DEFAULT_WORLD_SCALE = 1.0;
  const WORLD_SCALE =
    (typeof window !== "undefined" && window.__BATTLECHURCH_WORLD_SCALE !== undefined)
      ? Number(window.__BATTLECHURCH_WORLD_SCALE) || DEFAULT_WORLD_SCALE
      : DEFAULT_WORLD_SCALE;
  const HERO_MAX_HEALTH = 100;
  const HERO_BASE_HEARTS = 6;
  const HERO_HEALTH_PER_HEART = HERO_MAX_HEALTH / HERO_BASE_HEARTS;
  const CUTE_VALLEY_COLLECTIBLE_ROOT = "assets/sprites/cute-valley/Collectible/";
  const UTILITY_POWERUP_ROOT = "assets/sprites/dungeon-assets/items";
  const CONRAD_POWERUP_ROOT = "assets/sprites/conrad/powerups";

  const weaponDropDefs = {
    heal: {
      src: `${CUTE_VALLEY_COLLECTIBLE_ROOT}heart_1.png`,
      frameWidth: 16,
      frameHeight: 16,
      frameRate: 8,
      scale: 5.2 * WORLD_SCALE,
      radius: 24 * WORLD_SCALE,
      effect: "heal",
      healAmount: Math.round(3 * HERO_HEALTH_PER_HEART),
      speed: 0,
    },
    faith: {
      src: `${VALLEY_OBJECTS_PATH}torch.png`,
      frameWidth: 16,
      frameHeight: 16,
      frameRate: 8,
      effect: "cannonWeapon",
      duration: 9,
      scale: 5.4 * WORLD_SCALE,
      radius: 28 * WORLD_SCALE,
      damageMultiplier: 1.0,
      cooldownMultiplier: 0.65,
      speedMultiplier: 1.2,
      maxShots: 3,
      speed: 0,
      // Faith cannon weapon fires the torch-based projectile and now shares the flash hit effect meant
      // for wisdom/flash hits so the animation is tracked next to the fireball assets above.
    },
    scripture: {
      src: `${VALLEY_OBJECTS_PATH}book.png`,
      frameWidth: 16,
      frameHeight: 16,
      frameRate: 4,
      scale: 4.8 * WORLD_SCALE,
      radius: 24 * WORLD_SCALE,
      effect: "scriptureWeapon",
      duration: 10,
      damageMultiplier: 1.0,
      cooldownMultiplier: 0.95,
      speedMultiplier: 1.15,
      maxShots: 2,
      speed: 0,
    },
    wisdom: {
      frameSources: [
        `${UTILITY_POWERUP_ROOT}/coin/coin_1.png`,
        `${UTILITY_POWERUP_ROOT}/coin/coin_2.png`,
        `${UTILITY_POWERUP_ROOT}/coin/coin_3.png`,
        `${UTILITY_POWERUP_ROOT}/coin/coin_4.png`,
      ],
      frameRate: 8,
      effect: "wisdomWeapon",
      duration: 10,
      scale: 4.2 * WORLD_SCALE,
      radius: 26 * WORLD_SCALE,
      damageMultiplier: 1.0,
      cooldownMultiplier: 0.55,
      speedMultiplier: 1.4,
      maxShots: 2,
      speed: 0,
    },
    npcScripture: {
      src: `${CONRAD_POWERUP_ROOT}/bible.png`,
      effect: "npcScriptureWeapon",
      duration: 10,
      scale: 3.2 * WORLD_SCALE,
      radius: 20 * WORLD_SCALE,
      damageMultiplier: 1.0,
      cooldownMultiplier: 0.95,
      speedMultiplier: 1.0,
      maxShots: 2,
      speed: 0,
    },
    npcWisdom: {
      src: `${CONRAD_POWERUP_ROOT}/apple.png`,
      effect: "npcWisdomWeapon",
      duration: 10,
      scale: 3.0 * WORLD_SCALE,
      radius: 20 * WORLD_SCALE,
      damageMultiplier: 1.0,
      cooldownMultiplier: 0.55,
      speedMultiplier: 1.0,
      maxShots: 2,
      speed: 0,
    },
    npcFaith: {
      src: `${CONRAD_POWERUP_ROOT}/drink.png`,
      effect: "npcFaithWeapon",
      duration: 9,
      scale: 3.2 * WORLD_SCALE,
      radius: 22 * WORLD_SCALE,
      damageMultiplier: 1.0,
      cooldownMultiplier: 0.65,
      speedMultiplier: 1.0,
      maxShots: 2,
      speed: 0,
    },
  };

  const utilityPowerupDefs = {
    shield: {
      src: `${CONRAD_POWERUP_ROOT}/shield.png`,
      scale: 3.2 * WORLD_SCALE,
      radius: 30 * WORLD_SCALE,
      effect: "shield",
      duration: 9,
      label: "Shield of Faith",
      color: "#aef5ff",
    },
    haste: {
      src: `${CONRAD_POWERUP_ROOT}/speed.png`,
      scale: 3.0 * WORLD_SCALE,
      radius: 28 * WORLD_SCALE,
      effect: "haste",
      duration: 8,
      label: "Gospel of Peach",
      color: "#9bff86",
      speedMultiplier: 1.4,
    },
    extender: {
      src: `${CONRAD_POWERUP_ROOT}/sword.png`,
      scale: 2.8 * WORLD_SCALE,
      radius: 28 * WORLD_SCALE,
      effect: "extend",
      duration: 10,
      label: "Sword of the Spirit",
      color: "#ffd480",
      extendMultiplier: 1.5,
    },
    harmony: {
      src: `${CONRAD_POWERUP_ROOT}/harp.png`,
      scale: 3.0 * WORLD_SCALE,
      radius: 28 * WORLD_SCALE,
      effect: "harmony",
      duration: 10,
      label: "Harp of Consolation",
      color: "#d6b7ff",
    },
  };

  const ns =
    global.BattlechurchPowerupDefinitions ||
    (global.BattlechurchPowerupDefinitions = {});
  ns.weaponDropDefs = weaponDropDefs;
  ns.utilityPowerupDefs = utilityPowerupDefs;
})(typeof window !== "undefined" ? window : globalThis);
