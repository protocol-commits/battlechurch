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
    getEnemyCatalog: () => (typeof window !== "undefined" ? window.BattlechurchEnemyCatalog?.catalog || {} : {}),
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
    getCameraOffsetX: () => 0,
  };

  let miniSpawnedThisLevel = false;
  let oneEnemySpawnedLevel1 = false;
  let pendingPortalSpawns = 0;
  let spawnSequenceCounter = 0;
  const MINI_IMP_MAX_PACK_SIZE = 100;
  const MINI_IMP_INTER_PACK_STAGGER_MS = 80;
  const MINI_IMP_INTRA_PACK_STAGGER_MS = 0;
  const SPAWN_CAP_RETRY_DELAY_MS = 120;
  const SPAWN_CAP_RETRY_MAX_ATTEMPTS = 1200;
  const GROUP_ANCHOR_ZONES = [
    "upper_left",
    "upper_right",
    "lower_left",
    "lower_right",
    "bottom_left",
    "bottom_right",
  ];

  function getEnemyCatalog() {
    try {
      return typeof deps.getEnemyCatalog === "function" ? deps.getEnemyCatalog() || {} : {};
    } catch (error) {
      return {};
    }
  }

  function getEnemyGroupSpawnConfig(type, totalCount = 0) {
    const enemyTypes = resolveEnemyTypes() || {};
    const catalog = getEnemyCatalog();
    const src = catalog?.[type] || enemyTypes?.[type] || {};
    const isMiniImpType = type === "miniImp" || type === "miniImpLevel2" || type === "miniImpLevel3";
    const configuredMax = Math.floor(Number(src?.maxGroupSize) || 0);
    const defaultMax = isMiniImpType ? MINI_IMP_MAX_PACK_SIZE : Math.max(0, totalCount);
    const maxGroupSize = Math.max(1, configuredMax > 0 ? configuredMax : defaultMax || totalCount || 1);
    const configuredInter = Number(src?.interGroupDelayMs);
    const configuredIntra = Number(src?.intraGroupDelayMs);
    const interGroupDelayMs = Number.isFinite(configuredInter)
      ? Math.max(0, configuredInter)
      : (isMiniImpType ? MINI_IMP_INTER_PACK_STAGGER_MS : 0);
    const intraGroupDelayMs = Number.isFinite(configuredIntra)
      ? Math.max(0, configuredIntra)
      : (isMiniImpType ? MINI_IMP_INTRA_PACK_STAGGER_MS : Math.max(0, deps.enemySpawnStaggerMs || 0));
    return {
      maxGroupSize,
      interGroupDelayMs,
      intraGroupDelayMs,
    };
  }

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

  function getViewportXBounds() {
    const { width } = getCanvasSize();
    // Keep spawn ingress anchored to world/arena coordinates, not camera offset.
    const offsetX = 0;
    return {
      minX: offsetX,
      maxX: offsetX + width,
      width,
    };
  }

  function getSpawnIngressBounds(radius = 0) {
    const { width, height } = getCanvasSize();
    const viewport = getViewportXBounds();
    const hud = typeof HUD_HEIGHT !== "undefined" ? HUD_HEIGHT : 0;
    const playHeight = height - hud;
    const sideOffscreenX = Math.max(radius + 140, Math.floor(width * 0.24), 320);
    const sideRadiusPadding = Math.max(8, radius);
    const playableMinX = viewport.minX + radius + 24;
    const playableMaxX = viewport.maxX - radius - 24;
    const playableSpan = Math.max(0, playableMaxX - playableMinX);
    const bottomCenterGap = Math.min(playableSpan * 0.62, Math.max(320, Math.floor(width * 0.32)));
    const centerX = (playableMinX + playableMaxX) * 0.5;
    const bottomLeftMaxX = Math.max(playableMinX, centerX - bottomCenterGap * 0.5);
    const bottomRightMinX = Math.min(playableMaxX, centerX + bottomCenterGap * 0.5);
    return {
      width,
      height,
      hud,
      // Side lanes stay outside the visible viewport so enemies walk in.
      // Include radius padding so the full body starts outside the side guide.
      leftMaxX: viewport.minX - sideOffscreenX - sideRadiusPadding,
      rightMinX: viewport.maxX + sideOffscreenX + sideRadiusPadding,
      bottomMinY: height - Math.max(radius + 36, Math.floor(playHeight * 0.18)),
      // Allow side-edge spawns over most of the arena height to avoid a hard cutoff line.
      sideMinY: hud + Math.max(radius + 20, Math.floor(playHeight * 0.08)),
      sideMaxY: height - Math.max(radius + 24, Math.floor(height * 0.1)),
      viewportMinX: viewport.minX,
      viewportMaxX: viewport.maxX,
      bottomLeftMinX: playableMinX,
      bottomLeftMaxX,
      bottomRightMinX,
      bottomRightMaxX: playableMaxX,
    };
  }

  function pickBottomSideLaneX(bounds, laneCount = 3, jitter = 42, preferredSide = null) {
    const leftMin = Number.isFinite(bounds?.bottomLeftMinX) ? bounds.bottomLeftMinX : 0;
    const leftMax = Number.isFinite(bounds?.bottomLeftMaxX) ? bounds.bottomLeftMaxX : leftMin;
    const rightMin = Number.isFinite(bounds?.bottomRightMinX) ? bounds.bottomRightMinX : leftMax;
    const rightMax = Number.isFinite(bounds?.bottomRightMaxX) ? bounds.bottomRightMaxX : rightMin;
    const canLeft = leftMax > leftMin;
    const canRight = rightMax > rightMin;
    if (!canLeft && !canRight) {
      return Math.max(leftMin, Math.min(rightMax, (leftMin + rightMax) * 0.5));
    }
    const preferLeft = preferredSide === "left";
    const preferRight = preferredSide === "right";
    const useLeft = canLeft && (
      !canRight ||
      preferLeft ||
      (!preferRight && Math.random() < 0.5)
    );
    return useLeft
      ? pickSpawnLane(leftMin, leftMax, laneCount, jitter)
      : pickSpawnLane(rightMin, rightMax, laneCount, jitter);
  }

  function pickSpawnLane(min, max, laneCount = 4, jitter = 0) {
    if (!Number.isFinite(min) || !Number.isFinite(max)) return min || 0;
    if (max <= min) return min;
    const count = Math.max(1, Math.round(laneCount));
    if (count === 1) return (min + max) * 0.5;
    const step = (max - min) / (count - 1);
    const laneIndex = Math.floor(Math.random() * count);
    const center = min + step * laneIndex;
    return Math.max(min, Math.min(max, center + defaultRandomInRange(-jitter, jitter)));
  }

  function inferSpawnEdge(position) {
    if (!position) return "bottom";
    if (position.__spawnEdge === "left" || position.__spawnEdge === "right" || position.__spawnEdge === "bottom") {
      return position.__spawnEdge;
    }
    const { height } = getCanvasSize();
    const { minX, maxX } = getViewportXBounds();
    if (position.x <= minX) return "left";
    if (position.x >= maxX) return "right";
    if (position.y >= height) return "bottom";
    const leftDist = Math.abs(position.x - minX);
    const rightDist = Math.abs(maxX - position.x);
    const bottomDist = Math.abs(height - position.y);
    if (leftDist <= rightDist && leftDist <= bottomDist) return "left";
    if (rightDist <= leftDist && rightDist <= bottomDist) return "right";
    return "bottom";
  }

  function clampSpawnPositionToIngressBand(position, radius = 0) {
    const edge = inferSpawnEdge(position);
    const bounds = getSpawnIngressBounds(radius);
    const clamped = {
      x: Number.isFinite(position?.x) ? position.x : 0,
      y: Number.isFinite(position?.y) ? position.y : 0,
      __spawnEdge: edge,
    };
    if (edge === "left") {
      clamped.x = Math.min(clamped.x, bounds.leftMaxX);
      clamped.y = Math.max(bounds.sideMinY, Math.min(bounds.sideMaxY, clamped.y));
    } else if (edge === "right") {
      clamped.x = Math.max(clamped.x, bounds.rightMinX);
      clamped.y = Math.max(bounds.sideMinY, Math.min(bounds.sideMaxY, clamped.y));
    } else {
      clamped.y = Math.max(clamped.y, bounds.bottomMinY);
      const leftMin = bounds.bottomLeftMinX;
      const leftMax = bounds.bottomLeftMaxX;
      const rightMin = bounds.bottomRightMinX;
      const rightMax = bounds.bottomRightMaxX;
      const canLeft = leftMax > leftMin;
      const canRight = rightMax > rightMin;
      if (canLeft || canRight) {
        const distToLeft = Math.abs(clamped.x - leftMax);
        const distToRight = Math.abs(clamped.x - rightMin);
        const chooseLeft = canLeft && (!canRight || distToLeft <= distToRight);
        if (chooseLeft) {
          clamped.x = Math.max(leftMin, Math.min(leftMax, clamped.x));
        } else {
          clamped.x = Math.max(rightMin, Math.min(rightMax, clamped.x));
        }
      } else {
        clamped.x = Math.max(
          bounds.viewportMinX + radius + 24,
          Math.min(bounds.viewportMaxX - radius - 24, clamped.x),
        );
      }
    }
    return clamped;
  }

  function randomOffscreenPosition(radius = 0, extraMargin = 0) {
    const { width, height } = getCanvasSize();
    const { minX, maxX } = getViewportXBounds();
    const marginX = Math.max(320, Math.floor(width * 0.24)) + radius + extraMargin;
    const bottomExtraMargin = Math.min(120, Math.max(0, extraMargin * 0.25));
    const marginY = Math.max(40, Math.floor(height * 0.06)) + Math.min(radius, 20) + bottomExtraMargin;
    const bounds = getSpawnIngressBounds(radius);
    const edge = ["left", "right", "bottom"][Math.floor(Math.random() * 3)];
    if (edge === "left" || edge === "right") {
      return {
        x: edge === "left" ? minX - marginX : maxX + marginX,
        y: pickSpawnLane(bounds.sideMinY, bounds.sideMaxY, 4, 42),
        __spawnEdge: edge,
      };
    }
    return {
      x: pickBottomSideLaneX(bounds, 3, 42),
      y: height + marginY,
      __spawnEdge: "bottom",
    };
  }

  function randomOffscreenPositionForZone(zone = "bottom", radius = 0, extraMargin = 0) {
    const { width, height } = getCanvasSize();
    const { minX, maxX } = getViewportXBounds();
    const marginX = Math.max(320, Math.floor(width * 0.24)) + radius + extraMargin;
    const bottomExtraMargin = Math.min(120, Math.max(0, extraMargin * 0.25));
    const marginY = Math.max(40, Math.floor(height * 0.06)) + Math.min(radius, 20) + bottomExtraMargin;
    const bounds = getSpawnIngressBounds(radius);
    const upperSideMaxY = Math.max(bounds.sideMinY, bounds.hud + Math.floor((height - bounds.hud) * 0.45));
    const lowerSideMinY = Math.min(bounds.sideMaxY, bounds.hud + Math.floor((height - bounds.hud) * 0.45));
    if (zone === "upper_left" || zone === "side_upper_left") {
      return {
        x: minX - marginX,
        y: pickSpawnLane(bounds.sideMinY, upperSideMaxY, 3, 32),
        __spawnEdge: "left",
      };
    }
    if (zone === "upper_right" || zone === "side_upper_right") {
      return {
        x: maxX + marginX,
        y: pickSpawnLane(bounds.sideMinY, upperSideMaxY, 3, 32),
        __spawnEdge: "right",
      };
    }
    if (zone === "lower_left" || zone === "side_lower_left") {
      return {
        x: minX - marginX,
        y: pickSpawnLane(lowerSideMinY, bounds.sideMaxY, 3, 32),
        __spawnEdge: "left",
      };
    }
    if (zone === "lower_right" || zone === "side_lower_right") {
      return {
        x: maxX + marginX,
        y: pickSpawnLane(lowerSideMinY, bounds.sideMaxY, 3, 32),
        __spawnEdge: "right",
      };
    }
    if (zone === "left" || zone === "side_left") {
      return {
        x: minX - marginX,
        y: pickSpawnLane(bounds.sideMinY, bounds.sideMaxY, 4, 42),
        __spawnEdge: "left",
      };
    }
    if (zone === "right" || zone === "side_right") {
      return {
        x: maxX + marginX,
        y: pickSpawnLane(bounds.sideMinY, bounds.sideMaxY, 4, 42),
        __spawnEdge: "right",
      };
    }
    if (zone === "bottom_left") {
      return {
        x: pickBottomSideLaneX(bounds, 3, 42, "left"),
        y: height + marginY,
        __spawnEdge: "bottom",
      };
    }
    if (zone === "bottom_right") {
      return {
        x: pickBottomSideLaneX(bounds, 3, 42, "right"),
        y: height + marginY,
        __spawnEdge: "bottom",
      };
    }
    return randomOffscreenPosition(radius, extraMargin);
  }

  function findNonOverlappingSpawn(basePos, radius = 20, attempts = 6, spacing = 1) {
    const enemies = deps.enemies || [];
    let pos = clampSpawnPositionToIngressBand(basePos, radius);
    const safeRadius = Math.max(8, radius * spacing * 1.25);
    const edge = inferSpawnEdge(pos);
    for (let i = 0; i < attempts; i += 1) {
      const overlapping = enemies.some((enemy) => {
        if (!enemy || enemy.dead || enemy.state === "death") return false;
        const dist = Math.hypot((enemy.x || 0) - pos.x, (enemy.y || 0) - pos.y);
        const rSum = (enemy.radius || enemy.config?.hitRadius || 20) + safeRadius;
        return dist < rSum;
      });
      if (!overlapping) return pos;
      const step = safeRadius * 1.2;
      if (edge === "left" || edge === "right") {
        pos = {
          x: pos.x + (edge === "left" ? defaultRandomInRange(-step * 0.35, step * 0.25) : defaultRandomInRange(-step * 0.25, step * 0.35)),
          y: pos.y + defaultRandomInRange(-step * 1.4, step * 1.4),
          __spawnEdge: edge,
        };
      } else {
        pos = {
          x: pos.x + defaultRandomInRange(-step * 1.6, step * 1.6),
          y: pos.y + defaultRandomInRange(-step * 0.25, step * 0.35),
          __spawnEdge: edge,
        };
      }
      pos = clampSpawnPositionToIngressBand(pos, radius);
    }
    return clampSpawnPositionToIngressBand(pos, radius);
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
      const fallbackDisplayName =
        String(type || "")
          .replace(/^mini(?=[A-Z])/, "")
          .replace(/([A-Z])/g, " $1")
          .trim() || type;
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
        displayName: fallbackDisplayName,
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
    if (type === "bat") {
      instanceConfig.scale = 1.5;
    }
    // Apply health multiplier for armored/tank enemies in higher campaigns
    if (Number.isFinite(options.healthMultiplier) && options.healthMultiplier !== 1.0) {
      const baseHp = instanceConfig.maxHealth ?? instanceConfig.health ?? 100;
      const scaledHp = Math.max(1, Math.round(baseHp * options.healthMultiplier));
      instanceConfig.maxHealth = scaledHp;
      instanceConfig.health = scaledHp;
    }

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
    enemy.spawnSequence = ++spawnSequenceCounter;

    deps.enemies.push(enemy);
    const skipSpawnEffects = options.skipSpawnEffects === true;
    if (!skipSpawnEffects) {
      try {
        const puffRadius = (enemy.config?.hitRadius || enemy.radius || 32) * 2;
        deps.spawnPuffEffect(spawnPos.x, spawnPos.y, puffRadius);
      } catch (error) {
        console.debug?.("Spawner.spawnEnemyOfType: puff effect failed", error);
      }
      if (typeof deps.playEnemySpawnSfx === "function") {
        deps.playEnemySpawnSfx(0.55, {
          maxHealth: Number.isFinite(instanceConfig?.maxHealth)
            ? instanceConfig.maxHealth
            : instanceConfig?.health,
        });
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
    let capRetryAttempts = 0;
    const markComplete = () => {
      if (completed) return;
      completed = true;
      pendingPortalSpawns = Math.max(0, pendingPortalSpawns - 1);
    };
    const task = () => {
      if (!ignoreCap && deps.enemies.length >= deps.maxActiveEnemies) {
        capRetryAttempts += 1;
        if (capRetryAttempts <= SPAWN_CAP_RETRY_MAX_ATTEMPTS && typeof setTimeout === "function") {
          setTimeout(task, SPAWN_CAP_RETRY_DELAY_MS);
          return;
        }
        markComplete();
        return;
      }
      const spawned = spawnEnemyOfType(type, spawnPos, options);
      if (!spawned && !ignoreCap && deps.enemies.length >= deps.maxActiveEnemies) {
        capRetryAttempts += 1;
        if (capRetryAttempts <= SPAWN_CAP_RETRY_MAX_ATTEMPTS && typeof setTimeout === "function") {
          setTimeout(task, SPAWN_CAP_RETRY_DELAY_MS);
          return;
        }
      }
      markComplete();
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
    const totalCount = Math.max(0, Math.floor(Number(count) || 0));
    if (totalCount <= 0) return;
    const groupCfg = getEnemyGroupSpawnConfig(type, totalCount);
    const avgRadius = deps.enemyTypes?.[type]?.hitRadius || 20;
    const spacing = computeSwarmSpacing(deps.enemyTypes?.[type]?.swarmSpacing);
    const groupExtra = Math.min(1200, 40 * Math.sqrt(Math.max(1, totalCount))) * spacing;
    const perPackExtraMargin = Math.min(240, groupExtra);
    const spreadBase = Number.isFinite(deps.miniImpSpread) ? deps.miniImpSpread : 70;
    const rotateStart = Math.floor(Math.random() * GROUP_ANCHOR_ZONES.length);
    let spawnedSoFar = 0;
    const useAnchorRotation = totalCount > groupCfg.maxGroupSize;

    while (spawnedSoFar < totalCount) {
      const packIndex = Math.floor(spawnedSoFar / groupCfg.maxGroupSize);
      const packSize = Math.min(groupCfg.maxGroupSize, totalCount - spawnedSoFar);
      const base = useAnchorRotation
        ? randomOffscreenPositionForZone(
            GROUP_ANCHOR_ZONES[(rotateStart + packIndex) % GROUP_ANCHOR_ZONES.length],
            avgRadius,
            perPackExtraMargin,
          )
        : (position || randomOffscreenPosition(avgRadius, groupExtra));
      const rawPackSpread = (spreadBase * (1 + Math.max(0, packSize - 1) * 0.06)) / spacing;
      const packSpread = Math.min(280, rawPackSpread);
      for (let i = 0; i < packSize; i += 1) {
        const offsetX = deps.randomInRange(-packSpread * 0.6, packSpread * 0.6);
        const offsetY = deps.randomInRange(-packSpread * 0.6, packSpread * 0.6);
        const spawnPos = { x: base.x + offsetX, y: base.y + offsetY };
        const spawnOptions = {
          ...(options || {}),
          applyCameraShake: spawnedSoFar === 0 && i === 0,
          extraMargin: useAnchorRotation ? perPackExtraMargin : groupExtra,
        };
        const delayMs =
          packIndex * groupCfg.interGroupDelayMs +
          i * groupCfg.intraGroupDelayMs;
        schedulePortalSpawn(
          typeof type === "string" && type ? type : "miniImp",
          spawnPos,
          delayMs,
          spawnOptions,
        );
      }
      spawnedSoFar += packSize;
    }
  }

  function spawnEnemyGroup(count, position = null, options = {}, type = "skeleton") {
    const enemyType = typeof type === "string" && type ? type : "skeleton";
    if (enemyType === "miniImp" || enemyType === "miniImpLevel2" || enemyType === "miniImpLevel3") {
      spawnMiniImpGroup(count, position, options, enemyType);
      return;
    }
    const totalCount = Math.max(0, Math.floor(Number(count) || 0));
    if (totalCount <= 0) return;
    const groupCfg = getEnemyGroupSpawnConfig(enemyType, totalCount);
    const enemyTypes = resolveEnemyTypes() || {};
    const avgRadius = enemyTypes?.[enemyType]?.hitRadius || 20;
    const rotateStart = Math.floor(Math.random() * GROUP_ANCHOR_ZONES.length);
    const useAnchorRotation = totalCount > groupCfg.maxGroupSize;
    let spawnedSoFar = 0;
    while (spawnedSoFar < totalCount) {
      const packIndex = Math.floor(spawnedSoFar / groupCfg.maxGroupSize);
      const packSize = Math.min(groupCfg.maxGroupSize, totalCount - spawnedSoFar);
      const base = useAnchorRotation
        ? randomOffscreenPositionForZone(
            GROUP_ANCHOR_ZONES[(rotateStart + packIndex) % GROUP_ANCHOR_ZONES.length],
            avgRadius,
            0,
          )
        : (position || randomOffscreenPosition(avgRadius, 0));
      const spread = Math.max(14, Math.min(120, 14 + packSize * 1.2));
      for (let i = 0; i < packSize; i += 1) {
        const spawnPos = {
          x: base.x + deps.randomInRange(-spread, spread),
          y: base.y + deps.randomInRange(-spread * 0.8, spread * 0.8),
        };
        const delayMs =
          packIndex * groupCfg.interGroupDelayMs +
          i * groupCfg.intraGroupDelayMs;
        schedulePortalSpawn(enemyType, spawnPos, delayMs, options || {});
      }
      spawnedSoFar += packSize;
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
    const waveNumber = Math.max(
      1,
      (currentStatus && currentStatus.wave) ||
        (levelManager && typeof levelManager.getStatus === "function"
          ? levelManager.getStatus()?.wave || 1
          : 1),
    );

    const baseGroups =
      deps.miniImpMinGroupsPerHorde +
      Math.max(0, Math.floor((levelNumber - 1) / 2)) +
      Math.max(0, Math.floor((battleNumber - 1) / 2));
    const targetGroups = Math.min(6, baseGroups + Math.max(0, Math.floor((waveNumber - 1) / 2)));
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
    spawnEnemyGroup,
    schedulePortalSpawn,
    spawnEnemy,
    maintainSkeletonHorde,
    maintainMiniImpHorde,
    resetLevelFlags,
    resetAllFlags,
    getPendingPortalSpawnCount,
    getEnemyGroupSpawnConfig,
  });
})(typeof window !== "undefined" ? window : null);
