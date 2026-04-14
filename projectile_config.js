(function(global) {
  const DEFAULT_WORLD_SCALE = 1.0;
  const WORLD_SCALE =
    (typeof window !== "undefined" && window.__BATTLECHURCH_WORLD_SCALE !== undefined)
      ? Number(window.__BATTLECHURCH_WORLD_SCALE) || DEFAULT_WORLD_SCALE
      : DEFAULT_WORLD_SCALE;
  const PROJECTILE_PATH = "assets/sprites/projectiles/";
  const MAGIC_PACK_ROOT = "assets/sprites/projectiles";
  const HEART_PROJECTILE_SRC = "assets/sprites/items/Weapons/W43_Recurve_Bow.png";
  const FAITH_CANNON_PROJECTILE_COOLDOWN = 0.22;
  const COIN_COOLDOWN = 0.4;

  const PROJECTILE_CONFIG = {
    arrow: {
      speed: 540 * WORLD_SCALE,
      damage: 10,
      life: 1.2,
      radius: 20 * WORLD_SCALE,
      scale: 4 * WORLD_SCALE,
      pierce: false,
    },
    heart: {
      speed: 520,
      damage: 0,
      life: 1.4,
      radius: 20 * WORLD_SCALE,
      scale: 5.2 * WORLD_SCALE,
      pierce: false,
    },
    wisdom_missle: {
      speed: 580 * WORLD_SCALE,
      damage: 75,
      radius: 36 * WORLD_SCALE,
      scale: 1.3 * WORLD_SCALE,
      pierce: false,
      cooldownAfterFire: 1.0,
    },
    faith_cannon: {
      speed: 520 * WORLD_SCALE,
      damage: 50,
      radius: 40 * WORLD_SCALE,
      scale: 2.7 * WORLD_SCALE,
      pierce: false,
      cooldownAfterFire: FAITH_CANNON_PROJECTILE_COOLDOWN,
    },
    fire: {
      speed: 740 * WORLD_SCALE,
      damage: 50,
      radius: 28 * WORLD_SCALE,
      scale: 2.4 * WORLD_SCALE,
      pierce: true,
      cooldownAfterFire: 0.6,
    },
    miniTrident: {
      speed: 205 * WORLD_SCALE,
      damage: 8,
      radius: 18 * WORLD_SCALE,
      scale: 4.0 * WORLD_SCALE,
      pierce: false,
      cooldownAfterFire: 1.4,
    },
    miniFireball: {
      speed: 240 * WORLD_SCALE,
      damage: 5,
      life: 2.4,
      radius: 18 * WORLD_SCALE,
      scale: 3.6 * WORLD_SCALE,
      pierce: false,
    },
    divine_shot: {
      speed: 690 * WORLD_SCALE,
      damage: 1000,
      life: 3.0,
      radius: 60 * WORLD_SCALE,
      scale: 2.5,
      pierce: true,
      priority: 100,
      isDivineShot: true,
    },
    word_of_god: {
      speed: 720 * WORLD_SCALE,
      damage: 100,
      life: 0.6,
      radius: 28 * WORLD_SCALE,
      scale: 4.8 * WORLD_SCALE,
      pierce: true,
      cooldownAfterFire: 0.4,
    },
    coin: {
      speed: 460 * WORLD_SCALE,
      damage: 0,
      life: 1.3,
      radius: 22 * WORLD_SCALE,
      scale: 2.2 * WORLD_SCALE,
      pierce: false,
      cooldownAfterFire: COIN_COOLDOWN,
    },
  };

  Object.values(PROJECTILE_CONFIG).forEach((entry) => {
    if (entry.priority === undefined) {
      entry.priority = 0;
    }
  });

  const ns =
    global.BattlechurchProjectileConfig ||
    (global.BattlechurchProjectileConfig = {});
  ns.worldScale = WORLD_SCALE;
  ns.faithCannonCooldown = FAITH_CANNON_PROJECTILE_COOLDOWN;
  ns.magicSplashRadius = 180 * WORLD_SCALE;
  ns.magicSplashDamageMultiplier = 1;
  ns.faithCannonSplashRadius = 120 * WORLD_SCALE;
  ns.faithCannonSplashDamageMultiplier = 1;
  ns.faithCannonProjectileRange = 660 * WORLD_SCALE;
  ns.coinCooldown = COIN_COOLDOWN;
  ns.config = PROJECTILE_CONFIG;
  ns.projectilePath = PROJECTILE_PATH;
  ns.magicPackRoot = MAGIC_PACK_ROOT;
  ns.heartProjectileSrc = HEART_PROJECTILE_SRC;
  ns.weaponPowerups = {
    arrowBuff: {
      duration: 8,
      damageMultiplier: 1.5,
      text: "Arrow Power Up!",
      textColor: "#ffd35c",
    },
    wisdomWeapon: {
      duration: 8,
      maxShots: 2,
      cooldownMultiplier: 0.7,
      speedMultiplier: 1.3,
      damageMultiplier: 1,
      text: "Wield Wisdom",
      textColor: "#9bf0ff",
      hudTitle: "Wisdom Weapon",
      description: "Fires wisdom missiles with faster shots and speed.",
      hudDuration: 2.6,
    },
    cannonWeapon: {
      duration: 8,
      maxShots: 2,
      cooldownMultiplier: 0.7,
      speedMultiplier: 1.1,
      damageMultiplier: 1,
      text: "Unleash Faith",
      textColor: "#ff9bf7",
      hudTitle: "Faith Cannon",
      description: "Cannon blasts with splash damage and faster fire rate.",
      hudDuration: 2.6,
    },
    scriptureWeapon: {
      duration: 8,
      maxShots: 2,
      cooldownMultiplier: 0.7,
      speedMultiplier: 1.1,
      damageMultiplier: 1,
      text: "Quote Scripture",
      textColor: "#ffa45a",
      hudTitle: "Scripture Fire",
      description: "Piercing fire shots with higher speed.",
      hudDuration: 2.6,
    },
    spreadGun: {
      duration: 10,
      text: "Spread Gun",
      textColor: "#ffd978",
      hudTitle: "Spread Gun",
      description: "Adds two extra basic shots at slight angles.",
      hudDuration: 2.6,
    },
    halo: {
      duration: 12,
      text: "Halo",
      textColor: "#ffd978",
      hudTitle: "Halo",
      description: "An orbiting blade that shreds nearby enemies.",
      hudDuration: 2.6,
    },
    spear: {
      duration: 10,
      text: "Spear",
      textColor: "#ffd978",
      hudTitle: "Spear",
      description: "Seeks nearby enemies and strikes in sequence.",
      hudDuration: 2.6,
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
