/* Enemy spawning utilities for Battlechurch */
(function setupSpawnerModule(window) {
  if (!window) return;

  const noop = () => {};
  const defaultRandomChoice = (list) =>
    Array.isArray(list) && list.length ? list[Math.floor(Math.random() * list.length)] : null;
  const defaultRandomInRange = (min, max) => min + Math.random() * (max - min);

  const deps = {
    enemies: [],
    npcs: [],
    getAssets: () => null,
    enemyTypes: {},
    createEnemyInstance: null,
    randomSpawnPosition: () => ({ x: 0, y: 0 }),
    spawnPuffEffect: noop,
    applyCameraShake: noop,
    spawnCameraShakeDuration: 0,
    spawnCameraShakeMagnitude: 0,
    randomChoice: defaultRandomChoice,
    randomInRange: defaultRandomInRange,
    getLevelManager: () => null,
    miniFolks: [],
    maxActiveEnemies: Number.POSITIVE_INFINITY,
    skeletonMinCount: 4,
    skeletonPackSize: 4,
    miniImpBaseGroupSize: 48,
    miniImpMaxGroupSize: 120,
    miniImpMinGroupsPerHorde: 1,
    enemySpawnStaggerMs: 80,
    worldScale: 1,
    miniImpSpread: 10, /* How tight a miniimp formation is */
  };

  let miniSpawnedThisLevel = false;
  let oneEnemySpawnedLevel1 = false;
  let pendingPortalSpawns = 0;

  function getCanvasSize() {
    try {
      const canvas = typeof window !== "undefined" ? window.canvas : null;
      return {
        width: canvas?.width || 1280,
        height: canvas?.height || 720,
      };
    } catch (e) {
      return { width: 1280, height: 720 };
    }
  }

  function randomOffscreenPosition(radius = 0, extraMargin = 0) {
    const { width, height } = getCanvasSize();
    const marginX = Math.max(140, Math.floor(width * 0.14)) + radius + extraMargin;
    const marginY = Math.max(120, Math.floor(height * 0.12)) + radius + extraMargin;
    const hud = typeof HUD_HEIGHT !== "undefined" ? HUD_HEIGHT : 0;
    const playHeight = height - hud;
    const jitter = 120;
    const portals = [
      // Left/right roughly 1/3 down the playfield, offscreen on X
      { x: -marginX, y: hud + playHeight * (1 / 3) },
      { x: width + marginX, y: hud + playHeight * (1 / 3) },
      // Bottom middle offscreen with generous spread
      { x: width / 2, y: height + marginY, jitterX: 320, jitterY: 180 },
    ];
    const base = portals[Math.floor(Math.random() * portals.length)];
    if (base.jitterX || base.jitterY) {
      const jitterX = base.jitterX ?? jitter;
      const jitterY = base.jitterY ?? jitter;
      return {
        x: base.x + (Math.random() * 2 - 1) * jitterX,
        y: base.y + (Math.random() * 2 - 1) * jitterY,
      };
    } else {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * jitter;
      return {
        x: base.x + Math.cos(angle) * dist,
        y: base.y + Math.sin(angle) * dist,
      };
    }
  }

  function findNonOverlappingSpawn(basePos, radius = 20, attempts = 6, spacing = 1) {
    const enemies = deps.enemies || [];
    let pos = { x: basePos.x, y: basePos.y };
    const safeRadius = Math.max(8, radius * spacing * 1.25);
    for (let i = 0; i < attempts; i += 1) {
      const overlapping = enemies.some((enemy) => {
        if (!enemy || enemy.dead || enemy.state === "death") return false;
        const dist = Math.hypot((enemy.x || 0) - pos.x, (enemy.y || 0) - pos.y);
        const rSum = (enemy.radius || enemy.config?.hitRadius || 20) + safeRadius;
        return dist < rSum;
      });
      if (!overlapping) return pos;
      const angle = Math.random() * Math.PI * 2;
      const step = safeRadius * 1.4;
      pos = { x: pos.x + Math.cos(angle) * step, y: pos.y + Math.sin(angle) * step };
    }
    return pos;
  }

  function resolveEnemyTypes() {
    return typeof deps.enemyTypes === "function" ? deps.enemyTypes() : deps.enemyTypes;
  }

  function resolveAssets() {
    try {
      return deps.getAssets ? deps.getAssets() : null;
    } catch (error) {
      console.warn("Spawner.resolveAssets: failed to resolve assets", error);
      return null;
    }
  }

  function resolveLevelManager() {
    try {
      return typeof deps.getLevelManager === "function" ? deps.getLevelManager() : null;
    } catch (error) {
      console.warn("Spawner.resolveLevelManager: failed to resolve level manager", error);
      return null;
    }
  }

  function initialize(options = {}) {
    Object.assign(deps, options || {});
  }

  function resetLevelFlags(levelNumber = null) {
    miniSpawnedThisLevel = false;
    if (levelNumber === null || levelNumber !== 1) {
      oneEnemySpawnedLevel1 = false;
    }
  }

  function resetAllFlags() {
    miniSpawnedThisLevel = false;
    oneEnemySpawnedLevel1 = false;
  }

  function spawnEnemyOfType(type, position, options = {}) {
    const enemyTypes = resolveEnemyTypes();
    const assets = resolveAssets();
    if (!assets?.enemies?.[type] || !deps.createEnemyInstance) return null;

    const existingCount = deps.enemies.length;
    if (existingCount >= deps.maxActiveEnemies) return null;

    let config = enemyTypes?.[type] || null;
    const clips = assets.enemies[type];

    if (!config) {
      const sampleClip = clips.idle || Object.values(clips)[0];
      const frameW = sampleClip?.frameWidth || 32;
      const frameH = sampleClip?.frameHeight || 32;
      const maxSide = Math.max(frameW, frameH);
      const scale =
        Math.max(1.0, Math.min(4.0, 48 / Math.max(1, maxSide))) *
        (Number.isFinite(deps.worldScale) && deps.worldScale > 0 ? deps.worldScale : 1);
      const hitRadius = Math.max(10, Math.floor(maxSide * 0.18)) * scale;
      config = {
        speed: 120,
        health: 45,
        maxHealth: 45,
        damage: 1,
        attackRange: hitRadius + 18,
        hitRadius,
        attackCooldown: 1.4,
        scale,
        score: 75,
        displayName: type,
        ranged: false,
        projectileType: null,
        preferEdges: false,
        desiredRange: hitRadius + 18,
        projectileCooldown: 1.4,
      };
    }

    const spawnRadius = config.hitRadius || 24;
    const spacing = computeSwarmSpacing(config.swarmSpacing);
    const initialPos = position || randomOffscreenPosition(spawnRadius, 0);
    const spawnPos = findNonOverlappingSpawn(initialPos, spawnRadius, 6, spacing);
    try {
      console.debug &&
        console.debug("Enemy spawn", {
          type,
          spawnX: spawnPos.x,
          spawnY: spawnPos.y,
          fromPosition: Boolean(position),
        });
    } catch (error) {}
    const instanceConfig = { ...config };

    const enemy = deps.createEnemyInstance(
      type,
      instanceConfig,
      clips,
      spawnPos.x,
      spawnPos.y,
    );
    if (!enemy) return null;
    enemy.spawnOffscreenTimer = 0.6;
    enemy.ignoreWorldBounds = true;
    enemy.initialSpawnX = spawnPos.x;
    enemy.initialSpawnY = spawnPos.y;

    deps.enemies.push(enemy);
    try {
      const puffRadius = (enemy.config?.hitRadius || enemy.radius || 32) * 2;
      deps.spawnPuffEffect(spawnPos.x, spawnPos.y, puffRadius);
    } catch (error) {
      console.debug?.("Spawner.spawnEnemyOfType: puff effect failed", error);
    }
    if (
      options.applyCameraShake !== false &&
      typeof deps.applyCameraShake === "function" &&
      deps.spawnCameraShakeMagnitude > 0 &&
      deps.spawnCameraShakeDuration > 0
    ) {
      deps.applyCameraShake(
        deps.spawnCameraShakeDuration,
        deps.spawnCameraShakeMagnitude,
      );
    }
    if (type === "miniImp" || type === "miniImpLevel2" || type === "miniImpLevel3") enemy.isPopcorn = true;
    return enemy;
  }

  function schedulePortalSpawn(type, position, delayMs = 0, options = {}) {
    const { ignoreCap = false, extraMargin = 0 } = options || {};
    pendingPortalSpawns += 1;
    const spawnPos =
      position && typeof position.x === "number" && typeof position.y === "number"
        ? { x: position.x, y: position.y }
        : randomOffscreenPosition(0, extraMargin);
    let completed = false;
    const markComplete = () => {
      if (completed) return;
      completed = true;
      pendingPortalSpawns = Math.max(0, pendingPortalSpawns - 1);
    };
    const task = () => {
      markComplete();
      if (!ignoreCap && deps.enemies.length >= deps.maxActiveEnemies) return;
      spawnEnemyOfType(type, spawnPos, options);
    };
    if (delayMs > 0 && typeof setTimeout === "function") {
      setTimeout(task, delayMs);
    } else {
      task();
    }
  }

  function getPendingPortalSpawnCount() {
    return pendingPortalSpawns;
  }

  function spawnSkeletonGroup(position, count = deps.skeletonPackSize, options = {}) {
    const base = position || randomOffscreenPosition();
    for (let i = 0; i < count; i += 1) {
      const offsetX = (Math.random() - 0.5) * 90;
      const offsetY = (Math.random() - 0.5) * 60;
      const spawnPos = { x: base.x + offsetX, y: base.y + offsetY };
      schedulePortalSpawn(
        "skeleton",
        spawnPos,
        i * (deps.enemySpawnStaggerMs || 0),
        options,
      );
    }
  }

  function spawnMiniImpGroup(count, position = null, options = {}, type = "miniImp") {
    const avgRadius = deps.enemyTypes?.[type]?.hitRadius || 20;
    const spacing = computeSwarmSpacing(deps.enemyTypes?.[type]?.swarmSpacing);
    const groupExtra = Math.min(1200, 40 * Math.sqrt(Math.max(1, count))) * spacing;
    const base = position || randomOffscreenPosition(avgRadius, groupExtra);
    const spreadBase = Number.isFinite(deps.miniImpSpread) ? deps.miniImpSpread : 70;
    const spread = (spreadBase * (1 + Math.max(0, count - 1) * 0.06)) / spacing;
    for (let i = 0; i < count; i += 1) {
      const offsetX = deps.randomInRange(-spread * 0.6, spread * 0.6);
      const offsetY = deps.randomInRange(-spread * 0.6, spread * 0.6);
      const spawnPos = { x: base.x + offsetX, y: base.y + offsetY };
      const spawnOptions = {
        ...(options || {}),
        applyCameraShake: i === 0,
        extraMargin: groupExtra,
      };
      schedulePortalSpawn(
        typeof type === "string" && type ? type : "miniImp",
        spawnPos,
        i * (deps.enemySpawnStaggerMs || 0),
        spawnOptions,
      );
    }
  }

  function spawnMiniSkeletonGroup(count, position = null, options = {}) {
    const avgRadius = deps.enemyTypes?.miniSkeleton?.hitRadius || 20;
    const spacing = computeSwarmSpacing(deps.enemyTypes?.miniSkeleton?.swarmSpacing);
    const groupExtra = Math.min(1200, 40 * Math.sqrt(Math.max(1, count))) * spacing;
    const base = position || randomOffscreenPosition(avgRadius, groupExtra);
    const spreadBase = Number.isFinite(deps.miniImpSpread) ? deps.miniImpSpread : 70;
    const spread = (spreadBase * (1 + Math.max(0, count - 1) * 0.06)) / spacing;
    for (let i = 0; i < count; i += 1) {
      const offsetX = deps.randomInRange(-spread * 0.55, spread * 0.55);
      const offsetY = deps.randomInRange(-spread * 0.55, spread * 0.55);
      const spawnPos = { x: base.x + offsetX, y: base.y + offsetY };
      const spawnOptions = {
        ...(options || {}),
        applyCameraShake: i === 0,
        extraMargin: groupExtra,
      };
      schedulePortalSpawn(
        "miniSkeleton",
        spawnPos,
        i * (deps.enemySpawnStaggerMs || 0),
        spawnOptions,
      );
    }
  }

  function spawnEnemy() {
    if (deps.enemies.length >= deps.maxActiveEnemies) return;
    const levelManager = resolveLevelManager();
    const currentLevel =
      (levelManager && typeof levelManager.getLevelNumber === "function"
        ? levelManager.getLevelNumber()
        : 1) || 1;
    if (currentLevel === 1 && oneEnemySpawnedLevel1) return;

    const assets = resolveAssets();
    if (!assets?.enemies) return;

    if (currentLevel === 1) {
      const miniKeys = (deps.miniFolks || [])
        .map((entry) => entry?.key)
        .filter((key) => key && assets.enemies[key]);
      if (!miniKeys.length) return;
      if (!miniSpawnedThisLevel) {
        const selected = deps.randomChoice(miniKeys);
        if (selected) {
          spawnEnemyOfType(selected, deps.randomSpawnPosition());
          miniSpawnedThisLevel = true;
          oneEnemySpawnedLevel1 = true;
        }
      }
      return;
    }

    const enemyTypes = Object.keys(resolveEnemyTypes() || {});
    if (!enemyTypes.length) return;

    const weightedPool = enemyTypes.flatMap((name) => {
      if (name === "skeleton") return Array(6).fill(name);
      if (name === "archer") return Array(5).fill(name);
      if (name === "skeletonArcher") return Array(4).fill(name);
      if (name === "vampire") {
        const availableNpcs = (deps.npcs || []).some((npc) => !npc?.departed);
        if (!availableNpcs) return [];
        return Array(Math.max(2, (deps.npcs || []).length * 2)).fill(name);
      }
      return [name];
    });

    const selection = deps.randomChoice(weightedPool) || "skeleton";
    const position = deps.randomSpawnPosition();
    if (selection === "skeleton") spawnSkeletonGroup(position, deps.skeletonPackSize);
    else spawnEnemyOfType(selection, position);
  }

  function computeSwarmSpacing(val) {
    if (Number.isFinite(val) && val > 0) {
      if (val <= 1) return Math.max(0.1, val * 0.4);
      return Math.max(0.25, Math.min(2, val));
    }
    return 0.4;
  }

  function maintainSkeletonHorde() {
    if (deps.enemies.length >= deps.maxActiveEnemies) return;
    const skeletonCount = deps.enemies.filter(
      (enemy) => enemy?.type === "skeleton" && !enemy.dead && enemy.state !== "death",
    ).length;
    if (skeletonCount >= deps.skeletonMinCount) return;
    const needed = deps.skeletonMinCount - skeletonCount;
    const packs = Math.ceil(needed / Math.max(1, deps.skeletonPackSize));
    for (let i = 0; i < packs; i += 1) {
      if (deps.enemies.length >= deps.maxActiveEnemies) break;
      spawnSkeletonGroup();
    }
  }

  function maintainMiniImpHorde(levelStatus = null) {
    if (deps.enemies.length >= deps.maxActiveEnemies) return;
    const levelManager = resolveLevelManager();
    const currentStatus =
      levelStatus ||
      (levelManager && typeof levelManager.getStatus === "function"
        ? levelManager.getStatus()
        : null);
    const levelNumber =
      (currentStatus && currentStatus.level) ||
      (levelManager && typeof levelManager.getLevelNumber === "function"
        ? levelManager.getLevelNumber()
        : 1) ||
      1;
    const battleNumber = Math.max(
      1,
      (currentStatus && currentStatus.battle) ||
        (levelManager && typeof levelManager.getStatus === "function"
          ? levelManager.getStatus()?.battle || 1
          : 1),
    );
    const hordeNumber = Math.max(
      1,
      (currentStatus && currentStatus.horde) ||
        (levelManager && typeof levelManager.getStatus === "function"
          ? levelManager.getStatus()?.horde || 1
          : 1),
    );

    const baseGroups =
      deps.miniImpMinGroupsPerHorde +
      Math.max(0, Math.floor((levelNumber - 1) / 2)) +
      Math.max(0, Math.floor((battleNumber - 1) / 2));
    const targetGroups = Math.min(6, baseGroups + Math.max(0, Math.floor((hordeNumber - 1) / 2)));
    let targetGroupSize =
      deps.miniImpBaseGroupSize +
      Math.floor(levelNumber * 1.1) +
      Math.floor(battleNumber * 0.5);
    targetGroupSize = Math.max(
      deps.miniImpBaseGroupSize,
      Math.min(deps.miniImpMaxGroupSize, targetGroupSize),
    );

    const desiredCount = targetGroups * targetGroupSize;
    const currentCount = deps.enemies.filter((enemy) => {
      if (!enemy) return false;
      const type = typeof enemy.type === "string" ? enemy.type : "";
      if (type !== "miniImp" && type !== "miniImpLevel2" && type !== "miniImpLevel3") return false;
      if (enemy.dead || enemy.state === "death") return false;
      return true;
    }).length;

    let toSpawn = Math.max(0, desiredCount - currentCount);
    while (toSpawn > 0 && deps.enemies.length < deps.maxActiveEnemies) {
      spawnEnemyOfType("miniImp");
      toSpawn -= 1;
    }
  }

  window.Spawner = Object.assign(window.Spawner || {}, {
    initialize,
    spawnEnemyOfType,
    spawnSkeletonGroup,
    spawnMiniImpGroup,
    spawnMiniSkeletonGroup,
    schedulePortalSpawn,
    spawnEnemy,
    maintainSkeletonHorde,
    maintainMiniImpHorde,
    resetLevelFlags,
    resetAllFlags,
    getPendingPortalSpawnCount,
  });
})(typeof window !== "undefined" ? window : null);
