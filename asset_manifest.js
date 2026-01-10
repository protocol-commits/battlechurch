(function(global) {
  function createEnemyManifest(enemyDefinitions, characterRoot) {
    const manifest = {};
    for (const [key, config] of Object.entries(enemyDefinitions || {})) {
      const folder = config.assetFolder || config.folder;
      const baseName = config.assetBaseName || config.baseName || config.displayName || folder;
      const basePath = `${characterRoot}/${folder}/${baseName}/`;
      const defaults = {
        idle: "Idle",
        walk: "Walk",
        attack: "Attack01",
        hurt: "Hurt",
        death: "Death",
      };
      const stateMeta = {
        idle: { frameRate: 6, loop: true },
        walk: { frameRate: 10, loop: true },
        attack: { frameRate: 12, loop: false },
        hurt: { frameRate: 10, loop: false },
        death: { frameRate: 10, loop: false },
      };

      const files = config.assetFiles || config.files || {};
      const entry = {};
      for (const state of Object.keys(defaults)) {
        const suffix = files[state] ?? defaults[state];
        entry[state] = {
          src: `${basePath}${baseName}-${suffix}.png`,
          frameWidth: 100,
          frameHeight: 100,
          frameRate: stateMeta[state].frameRate,
          loop: stateMeta[state].loop,
        };
      }
      manifest[key] = entry;
    }
    return manifest;
  }

  function build(config = {}) {
    const {
      playerSpritePath = "assets/sprites/conrad/characters/",
      projectilePath = "assets/sprites/rpg-sprites/",
      magicPackRoot = "assets/sprites/magic-pack/sprites",
      heartProjectileSrc = "assets/sprites/pixel-art-pack/Weapons/W43_Recurve_Bow.png",
      characterRoot = "assets/sprites/rpg-sprites/Characters(100x100)",
      enemyDefinitions = {},
    } = config;
    return {
      player: {
        idle: {
          src: `${playerSpritePath}pastor1-idle.png`,
          frameWidth: 271,
          frameHeight: 320,
          frameRate: 0,
          loop: false,
          frameMap: [0],
          renderScale: 100 / 320,
        },
        walk: {
          src: `${playerSpritePath}pastor1-walk-animation.png`,
          frameWidth: 271,
          frameHeight: 320,
          frameRate: 10,
          loop: true,
          frameMap: [0, 1, 2, 3],
          renderScale: 100 / 320,
        },
        attackArrow: {
          src: `${playerSpritePath}pastor1-sword-slash-animation.png`,
          frameWidth: 320,
          frameHeight: 320,
          frameRate: 12,
          loop: false,
          frameMap: [0, 1, 2, 3],
          renderScale: 100 / 320,
        },
        attackMelee: {
          src: `${playerSpritePath}pastor1-sword-slash.png`,
          frameWidth: 339,
          frameHeight: 328,
          frameRate: 12,
          loop: false,
          frameMap: [0, 1, 2, 3],
          renderScale: 100 / 328,
        },
        attackMagic: {
          src: `${playerSpritePath}pastor1-sword-slash-animation.png`,
          frameWidth: 320,
          frameHeight: 320,
          frameRate: 12,
          loop: false,
          frameMap: [0, 1, 2, 3],
          renderScale: 100 / 320,
        },
        hurt: {
          src: `${playerSpritePath}pastor-hurt-1-sheet.png`,
          frameWidth: 64,
          frameHeight: 64,
          frameRate: 10,
          loop: false,
          renderScale: 100 / 64,
          frameMap: [0, 1, 2, 3],
        },
        death: {
          src: `${playerSpritePath}pastor-death-1-sheet.png`,
          frameWidth: 64,
          frameHeight: 64,
          frameRate: 10,
          loop: false,
          renderScale: 100 / 64,
          frameMap: [0, 1, 2, 3, 4, 5],
        },
      },
      projectiles: {
        arrow: {
          src: `assets/sprites/MiniFolksWeapons/minifireball.png`,
          frameWidth: 20,
          frameHeight: 16,
          frameRate: 12,
          loop: true,
          frameMap: [5, 6, 7],
        },
        heart: {
          src: heartProjectileSrc,
          frameWidth: 16,
          frameHeight: 16,
          frameRate: 0,
          loop: false,
        },
        weaponMiniLichSpell: {
          src: `assets/sprites/MiniFolksWeapons/minilichspell.png`,
          frameWidth: 0,
          frameHeight: 0,
          frameRate: 12,
          loop: true,
        },
        weaponMiniTrident: {
          src: `assets/sprites/MiniFolksWeapons/minitrident.png`,
          frameWidth: 0,
          frameHeight: 0,
          frameRate: 12,
          loop: true,
        },
        wisdom_missle: {
          src: `${projectilePath}Magic(Projectile)/Wizard-Attack01_Effect.png`,
          frameWidth: 100,
          frameHeight: 100,
          frameRate: 0,
          loop: false,
        },
        faith_cannon: {
          src: `${projectilePath}Magic(Projectile)/Wizard-Attack02_Effect.png`,
          frameWidth: 100,
          frameHeight: 100,
          frameRate: 12,
          loop: true,
        },
        miniTrident: {
          src: "assets/sprites/MinifolksDemons/Without outline/MiniTrident.png",
          frameWidth: 24,
          frameHeight: 24,
          frameRate: 0,
          loop: false,
        },
        fire: {
          src: `${magicPackRoot}/fire-missile/sprites/fire-missile1.png`,
          frameWidth: 32,
          frameHeight: 32,
          frameRate: 0,
          loop: false,
        },
      },
      enemies: createEnemyManifest(enemyDefinitions, characterRoot),
    };
  }
  const ns = global.BattlechurchAssetManifest || (global.BattlechurchAssetManifest = {});
  ns.build = build;
})(typeof window !== "undefined" ? window : globalThis);
