(function(global) {
  const DEFAULT_WORLD_SCALE = 1.0;
  const WORLD_SCALE =
    (typeof window !== "undefined" && window.__BATTLECHURCH_WORLD_SCALE !== undefined)
      ? Number(window.__BATTLECHURCH_WORLD_SCALE) || DEFAULT_WORLD_SCALE
      : DEFAULT_WORLD_SCALE;
  const PROJECTILE_PATH = "assets/sprites/projectiles/";
  const MAGIC_PACK_ROOT = "assets/sprites/projectiles";
  const FAITH_CANNON_PROJECTILE_COOLDOWN = 0.22;

  const PROJECTILE_CONFIG = {
    arrow: {
      displayName: "Arrow Shot",
      speed: 540 * WORLD_SCALE,
      damage: 10,
      life: 1.2,
      radius: 20 * WORLD_SCALE,
      scale: 4 * WORLD_SCALE,
      pierce: false,
    },
    wisdom_missle: {
      displayName: "Wisdom Missile",
      speed: 580 * WORLD_SCALE,
      damage: 75,
      radius: 36 * WORLD_SCALE,
      scale: 1.3 * WORLD_SCALE,
      pierce: false,
      cooldownAfterFire: 1.0,
    },
    faith_cannon: {
      displayName: "Faith Cannon",
      speed: 520 * WORLD_SCALE,
      damage: 50,
      radius: 40 * WORLD_SCALE,
      scale: 2.7 * WORLD_SCALE,
      pierce: false,
      cooldownAfterFire: FAITH_CANNON_PROJECTILE_COOLDOWN,
    },
    fire: {
      displayName: "Fire Missile",
      speed: 740 * WORLD_SCALE,
      damage: 50,
      radius: 28 * WORLD_SCALE,
      scale: 2.4 * WORLD_SCALE,
      pierce: true,
      cooldownAfterFire: 0.6,
      maxBossHits: 5,
      bossHitCooldown: 0.1,
    },
    fireOrb: {
      displayName: "Fire Orb",
      speed: 740 * WORLD_SCALE,
      damage: 50,
      radius: 28 * WORLD_SCALE,
      scale: 2.4 * WORLD_SCALE,
      pierce: true,
      cooldownAfterFire: 0.6,
    },
    miniTrident: {
      displayName: "Trident",
      speed: 205 * WORLD_SCALE,
      damage: 8,
      radius: 18 * WORLD_SCALE,
      scale: 4.0 * WORLD_SCALE,
      pierce: false,
      cooldownAfterFire: 1.4,
    },
    miniFireball: {
      displayName: "Mini Fireball",
      speed: 240 * WORLD_SCALE,
      damage: 5,
      life: 2.4,
      radius: 18 * WORLD_SCALE,
      scale: 3.6 * WORLD_SCALE,
      pierce: false,
    },
    divine_shot: {
      displayName: "Blast",
      speed: 690 * WORLD_SCALE,
      damage: 1000,
      life: 3.0,
      radius: 85 * WORLD_SCALE,
      scale: 2.5,
      pierce: true,
      priority: 100,
      isDivineShot: true,
    },
    word_of_god: {
      displayName: "Word of God",
      speed: 720 * WORLD_SCALE,
      damage: 100,
      life: 0.6,
      radius: 28 * WORLD_SCALE,
      scale: 4.8 * WORLD_SCALE,
      pierce: true,
      cooldownAfterFire: 0.4,
    },
    lichBolt: {
      displayName: "Lich Bolt",
      speed: 480 * WORLD_SCALE,
      damage: 10,
      life: 1.4,
      radius: 20 * WORLD_SCALE,
      scale: 3.5 * WORLD_SCALE,
      pierce: false,
      cooldownAfterFire: 1.0,
    },
    lichOrb: {
      displayName: "Lich Orb",
      speed: 300 * WORLD_SCALE,
      damage: 15,
      life: 2.0,
      radius: 22 * WORLD_SCALE,
      scale: 3.5 * WORLD_SCALE,
      pierce: false,
      cooldownAfterFire: 1.4,
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
  ns.config = PROJECTILE_CONFIG;
  ns.projectilePath = PROJECTILE_PATH;
  ns.magicPackRoot = MAGIC_PACK_ROOT;
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
      text: "Apply Wisdom",
      textColor: "#9bf0ff",
      hudTitle: "Apply Wisdom",
      spokenName: "Wisdom",
      description: "Powerful methodical cannon",
      hudDuration: 2.6,
      iconSrc: "assets/sprites/items/icons/I23_Scroll.png",
    },
    cannonWeapon: {
      duration: 8,
      maxShots: 2,
      cooldownMultiplier: 0.7,
      speedMultiplier: 1.1,
      damageMultiplier: 1,
      text: "Act in Faith",
      textColor: "#ff9bf7",
      hudTitle: "Act in Faith",
      spokenName: "Faith",
      description: "High-pressure barrage fire",
      hudDuration: 2.6,
      iconSrc: "assets/sprites/items/icons/I41_Candle.png",
    },
    scriptureWeapon: {
      duration: 8,
      maxShots: 2,
      cooldownMultiplier: 0.7,
      speedMultiplier: 1.1,
      damageMultiplier: 1,
      text: "Trust Scripture",
      textColor: "#ffa45a",
      hudTitle: "Trust Scripture",
      spokenName: "Scripture",
      description: "Fast piercing flames",
      hudDuration: 2.6,
      iconSrc: "assets/sprites/items/icons/I25_Book.png",
    },
    spreadGun: {
      duration: 10,
      text: "Tracer",
      textColor: "#ffd978",
      hudTitle: "Tracer",
      spokenName: "Tracer",
      description: "Coordinated the outreach ministry",
      hudDuration: 2.6,
      iconSrc: "assets/sprites/items/Weapons/Spread.png",
    },
    halo: {
      duration: 12,
      text: "Halo",
      textColor: "#ffd978",
      hudTitle: "Halo",
      spokenName: "Halo",
      description: "Focused the prayer chain",
      hudDuration: 2.6,
      iconSrc: "assets/sprites/items/icons/A13_Headband.png",
    },
    spear: {
      duration: 10,
      text: "Lance",
      textColor: "#ffd978",
      hudTitle: "Lance",
      spokenName: "Lance",
      description: "Mobilized the Care Ministry",
      hudDuration: 2.6,
      iconSrc: "assets/sprites/items/Weapons/Spear.png",
    },
    sentry: {
      duration: 12,
      text: "Sentry",
      textColor: "#ffd978",
      hudTitle: "Sentry",
      spokenName: "Sentry",
      description: "Empowered leaders",
      hudDuration: 2.6,
      iconSrc: "assets/sprites/items/Weapons/Lantern.png",
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
