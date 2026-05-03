/* Entity helpers for Battlechurch */
(function setupEntitiesModule(window) {
  if (!window) return;

  const Entities = {};
  const projectileSettings =
    (typeof window !== "undefined" && window.BattlechurchProjectileConfig) || {};
  const PROJECTILE_CONFIG = projectileSettings.config || {};

  const defaults = {
    WORLD_SCALE: 1,
    PLAYER_BASE_SCALE: 3.28,
    HERO_MAX_HEALTH: 100,
    PRAYER_BOMB_CHARGE_REQUIRED: 6000,
    CONGREGATION_COMMAND_CHARGE_TIME: 12,
    DAMAGE_FLASH_INTENSITY: 1,
    ARROW_DAMAGE: 10,
  };

  const isMovementLocked = () =>
    Boolean(
      typeof window !== "undefined" &&
        window.Battlechurch &&
        typeof window.Battlechurch.isPlayerMovementLocked === "function" &&
        window.Battlechurch.isPlayerMovementLocked(),
    );
  const isBossStageActive = () => {
    try {
      if (
        typeof window !== "undefined" &&
        window.Battlechurch &&
        typeof window.Battlechurch.isBossStageActive === "function"
      ) {
        return Boolean(window.Battlechurch.isBossStageActive());
      }
    } catch (e) {}
    return false;
  };
  const isDevMeleeArenaActive = () =>
    Boolean(typeof window !== "undefined" && window.__battlechurchDevMeleeArenaMode === true);

  const circleIntersectsRect = (cx, cy, radius, rect) => {
    const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.width));
    const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.height));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return dx * dx + dy * dy <= radius * radius;
  };

  const rectIntersectsRect = (a, b) => {
    if (!a || !b) return false;
    return !(
      a.x + a.width < b.x ||
      b.x + b.width < a.x ||
      a.y + a.height < b.y ||
      b.y + b.height < a.y
    );
  };

  const getTargetHitboxRect = (target) => {
    const hitbox = target?.config?.hitbox || null;
    if (!hitbox || !Number.isFinite(hitbox.width) || !Number.isFinite(hitbox.height)) return null;
    if (hitbox.width <= 0 || hitbox.height <= 0) return null;
    const facingSign =
      target?.isPlayer && target?.facing === "left"
        ? -1
        : 1;
    const offsetX = Number.isFinite(hitbox.offsetX) ? hitbox.offsetX * facingSign : 0;
    const offsetY = Number.isFinite(hitbox.offsetY) ? hitbox.offsetY : 0;
    return {
      x: (target?.x || 0) + offsetX - hitbox.width / 2,
      y: (target?.y || 0) + offsetY - hitbox.height / 2,
      width: hitbox.width,
      height: hitbox.height,
    };
  };

  const applyWeaponKnockback = (target, sourceX, sourceY, sourceEnemy = null) => {
    if (!target || typeof target.x !== "number" || typeof target.y !== "number") return;
    const dx = target.x - sourceX;
    const dy = target.y - sourceY;
    const distance = Math.hypot(dx, dy);
    if (!distance) return;
    const normX = dx / distance;
    const normY = dy / distance;
    const scale = settings.WORLD_SCALE || 1;
    const strength = (target.isPlayer ? 240 : 200) * scale;
    let duration = 0.12;
    const damageClass = String(sourceEnemy?.config?.damageClass || sourceEnemy?.damageClass || "").toLowerCase();
    if (target.isPlayer && damageClass === "armored") {
      duration = 0.18;
    }
    target.knockbackVx = normX * strength;
    target.knockbackVy = normY * strength;
    target.knockbackTimer = Math.max(target.knockbackTimer || 0, duration);
    if (target.isPlayer) {
      target.knockbackDuration = Math.max(target.knockbackDuration || 0, duration);
    }
    if (target.isPlayer) {
      if (damageClass === "armored") {
        target.knockbackLift = Math.max(target.knockbackLift || 0, 32);
      } else {
        target.knockbackLift = 0;
      }
    }
  };

  const getWeaponHitboxRect = (enemy) => {
    const weapon = enemy?.config?.weaponHitbox || null;
    if (!weapon) return null;
    const width = Number(weapon.width);
    const height = Number(weapon.height);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
    const hitbox = enemy?.config?.hitbox || null;
    const baseX = enemy.x + (hitbox && Number.isFinite(hitbox.offsetX) ? hitbox.offsetX : 0);
    const baseY = enemy.y + (hitbox && Number.isFinite(hitbox.offsetY) ? hitbox.offsetY : 0);
    const facingSign = enemy?.facing === "left" ? -1 : 1;
    const offsetX = Number.isFinite(weapon.offsetX) ? weapon.offsetX * facingSign : 0;
    const offsetY = Number.isFinite(weapon.offsetY) ? weapon.offsetY : 0;
    return {
      x: baseX + offsetX - width / 2,
      y: baseY + offsetY - height / 2,
      width,
      height,
    };
  };

  const getEnemyContactDamage = (enemy) => {
    const config = enemy?.config || enemy || null;
    if (!config) return 0;
    if (Number.isFinite(config.contactDamage) && config.contactDamage >= 0) {
      return config.contactDamage;
    }
    if (Number.isFinite(config.damage) && config.damage >= 0) {
      return config.damage;
    }
    return 0;
  };

  const getEnemyAttackDamage = (enemy) => {
    const config = enemy?.config || enemy || null;
    if (!config) return 0;
    if (Number.isFinite(config.attackHitDamage) && config.attackHitDamage >= 0) {
      return config.attackHitDamage;
    }
    if (Number.isFinite(config.attackDamage) && config.attackDamage >= 0) {
      return config.attackDamage;
    }
    if (Number.isFinite(config.damage) && config.damage >= 0) {
      return config.damage;
    }
    return 0;
  };

  const isEnemyInKnockback = (enemy) =>
    Boolean(enemy && Number.isFinite(enemy.knockbackTimer) && enemy.knockbackTimer > 0);

  const KNOCKBACK_VISUAL_LIFT = 18;
  const DEMON_LORD_JUMP_COOLDOWN = 2.4;
  const DEMON_LORD_JUMP_DURATION = 0.58;
  const DEMON_LORD_JUMP_MIN_DISTANCE = 220;
  const DEMON_LORD_JUMP_MAX_DISTANCE = 400;
  const DEMON_LORD_JUMP_ARC_LIFT = 22;
  const FIRE_KEEPER_HIDDEN_DURATION = 0.95;
  const FIRE_KEEPER_MATERIALIZE_DURATION = 0.24;
  const FIRE_KEEPER_PRE_ATTACK_HOLD = 0.8;
  const FIRE_KEEPER_POST_ATTACK_HOLD = 1.15;
  const FIRE_KEEPER_DEMATERIALIZE_DURATION = 0.62;
  const DEMONESS_WHIP_RANGE = 240;
  const DEMONESS_PULL_SPEED = 86;
  const DEMONESS_PULL_CONTACT_DISTANCE = 34;
  const DEMONESS_DRAIN_TICK_INTERVAL = 0.34;
  const DEMONESS_DRAIN_TOTAL_FAITH = 30;
  const DEMONESS_WHIP_ATTACK_HIT_FRAME = 5;
  const DEMONESS_DRAIN_ATTACK_HIT_FRAME = 4;
  const DEMONESS_LASSO_BREAK_COOLDOWN = 3.0;

  const drawDemonessBindEffect = (
    enemy,
    npc,
    mode = "drag",
    {
      drawTether = true,
      drawBackLoop = true,
      drawFrontLoop = true,
      drawPulse = true,
    } = {},
  ) => {
    if (!ctx || !enemy || !npc) return;
    const now =
      typeof performance !== "undefined" && typeof performance.now === "function"
        ? performance.now()
        : Date.now();
    const t = now * 0.001;
    const enemyHandX = enemy.x + (enemy.facing === "left" ? -enemy.radius * 0.55 : enemy.radius * 0.55);
    const enemyHandY = enemy.y - enemy.radius * 0.1;
    const npcCenterX = npc.x;
    const npcCenterY = npc.y - npc.radius * 0.12;
    const dx = npcCenterX - enemyHandX;
    const dy = npcCenterY - enemyHandY;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const nx = dx / distance;
    const ny = dy / distance;
    const px = -ny;
    const py = nx;
    const wave = Math.sin(t * 8.5) * Math.min(16, distance * 0.09);
    const midX = (enemyHandX + npcCenterX) * 0.5 + px * wave;
    const midY = (enemyHandY + npcCenterY) * 0.5 + py * wave;
    const sampleCurvePoint = (phase) => {
      const inv = 1 - phase;
      return {
        x: inv * inv * enemyHandX + 2 * inv * phase * midX + phase * phase * npcCenterX,
        y: inv * inv * enemyHandY + 2 * inv * phase * midY + phase * phase * npcCenterY,
      };
    };
    const ringRadius = Math.max(npc.radius * 0.88, 14);
    const ringPulse = 1 + Math.sin(t * 7.2) * 0.08;
    const ringCenterX = npc.x;
    const ringCenterY = npc.y + npc.radius * 0.22;
    const ringRx = ringRadius * 1.06 * ringPulse;
    const ringRy = ringRadius * 0.82 * ringPulse;
    const tetherLandingAngle = Math.atan2(enemyHandY - ringCenterY, enemyHandX - ringCenterX);
    const landingX = ringCenterX + Math.cos(tetherLandingAngle) * ringRx;
    const landingY = ringCenterY + Math.sin(tetherLandingAngle) * ringRy;
    const warpedLoopPoints = [];
    const loopSegments = 36;
    for (let i = 0; i <= loopSegments; i += 1) {
      const phase = i / loopSegments;
      const angle = phase * Math.PI * 2;
      const wobble =
        1 +
        Math.sin(angle * 3 + t * 2.7) * 0.08 +
        Math.cos(angle * 5 - t * 2.1) * 0.04;
      warpedLoopPoints.push({
        x: ringCenterX + Math.cos(angle) * ringRx * wobble,
        y: ringCenterY + Math.sin(angle) * ringRy * wobble,
      });
    }

    ctx.save();
    ctx.lineCap = "round";
    ctx.filter = "blur(0.8px)";

    if (drawTether) {
      ctx.strokeStyle = "rgba(90, 18, 10, 0.42)";
      ctx.lineWidth = Math.max(5, enemy.radius * 0.22);
      ctx.beginPath();
      ctx.moveTo(enemyHandX, enemyHandY);
      ctx.quadraticCurveTo(midX, midY, landingX, landingY);
      ctx.stroke();

      const coreGradient = ctx.createLinearGradient(enemyHandX, enemyHandY, landingX, landingY);
      coreGradient.addColorStop(0, mode === "drain" ? "rgba(255, 242, 160, 0.95)" : "rgba(255, 195, 110, 0.92)");
      coreGradient.addColorStop(0.55, "rgba(255, 122, 52, 0.88)");
      coreGradient.addColorStop(1, "rgba(255, 238, 150, 0.9)");
      ctx.strokeStyle = coreGradient;
      ctx.shadowColor = mode === "drain" ? "rgba(255, 220, 110, 0.7)" : "rgba(255, 136, 64, 0.65)";
      ctx.shadowBlur = mode === "drain" ? 16 : 12;
      ctx.lineWidth = Math.max(2.2, enemy.radius * 0.09);
      ctx.beginPath();
      ctx.moveTo(enemyHandX, enemyHandY);
      ctx.quadraticCurveTo(midX, midY, landingX, landingY);
      ctx.stroke();

      ctx.strokeStyle = "rgba(255, 242, 190, 0.42)";
      ctx.lineWidth = Math.max(0.9, enemy.radius * 0.035);
      ctx.beginPath();
      ctx.moveTo(enemyHandX + px * 2.2, enemyHandY + py * 2.2);
      ctx.quadraticCurveTo(midX + px * 3.5, midY + py * 3.5, landingX + px * 1.2, landingY + py * 1.2);
      ctx.stroke();
    }

    if (drawPulse) {
      const pulsePhase = 1 - ((t * (mode === "drain" ? 1.7 : 1.25)) % 1);
      const pulsePoint = sampleCurvePoint(pulsePhase);
      const pulseTail = sampleCurvePoint(Math.max(0, pulsePhase - 0.08));
      const pulseHead = sampleCurvePoint(Math.min(1, pulsePhase + 0.08));
      const pulseGradient = ctx.createLinearGradient(
        pulseTail.x,
        pulseTail.y,
        pulseHead.x,
        pulseHead.y,
      );
      pulseGradient.addColorStop(0, "rgba(255, 240, 180, 0)");
      pulseGradient.addColorStop(0.45, "rgba(255, 250, 210, 0.92)");
      pulseGradient.addColorStop(1, "rgba(255, 210, 120, 0)");
      ctx.strokeStyle = pulseGradient;
      ctx.lineWidth = Math.max(4.2, enemy.radius * 0.16);
      ctx.shadowColor = "rgba(255, 236, 160, 0.8)";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(pulseTail.x, pulseTail.y);
      ctx.lineTo(pulsePoint.x, pulsePoint.y);
      ctx.lineTo(pulseHead.x, pulseHead.y);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    const drawLoopSegment = (startIndex, endIndex) => {
      if (endIndex - startIndex < 1) return;
      ctx.lineWidth = Math.max(2.2, enemy.radius * 0.09);
      ctx.strokeStyle = "rgba(255, 214, 96, 0.95)";
      ctx.shadowColor = "rgba(255, 214, 120, 0.45)";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(warpedLoopPoints[startIndex].x, warpedLoopPoints[startIndex].y);
      for (let i = startIndex + 1; i <= endIndex; i += 1) {
        ctx.lineTo(warpedLoopPoints[i].x, warpedLoopPoints[i].y);
      }
      ctx.stroke();

      ctx.lineWidth = 1.2;
      ctx.strokeStyle = "rgba(128, 34, 12, 0.8)";
      ctx.shadowBlur = 0;
      ctx.beginPath();
      const startPoint = warpedLoopPoints[startIndex];
      ctx.moveTo(startPoint.x * 0.985 + ringCenterX * 0.015, startPoint.y * 0.985 + ringCenterY * 0.015);
      for (let i = startIndex + 1; i <= endIndex; i += 1) {
        const point = warpedLoopPoints[i];
        ctx.lineTo(point.x * 0.985 + ringCenterX * 0.015, point.y * 0.985 + ringCenterY * 0.015);
      }
      ctx.stroke();
    };

    const halfIndex = Math.floor(loopSegments / 2);
    if (drawBackLoop) {
      drawLoopSegment(halfIndex, loopSegments);
    }
    if (drawFrontLoop) {
      drawLoopSegment(0, halfIndex);
    }

    if (mode === "drain") {
      for (let i = 0; i < 4; i += 1) {
        const phase = ((t * 1.85) + i * 0.23) % 1;
        const qx = (1 - phase) * (1 - phase) * enemyHandX + 2 * (1 - phase) * phase * midX + phase * phase * npcCenterX;
        const qy = (1 - phase) * (1 - phase) * enemyHandY + 2 * (1 - phase) * phase * midY + phase * phase * npcCenterY;
        const radius = 2.8 + (1 - phase) * 1.8;
        ctx.fillStyle = `rgba(255, 244, 170, ${(0.35 + (1 - phase) * 0.45).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(qx, qy, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  };

  const getKnockbackArcLift = (remainingTime, totalDuration, maxLift = KNOCKBACK_VISUAL_LIFT) => {
    const duration = Math.max(0.001, totalDuration || 0);
    const normalized = Math.max(0, Math.min(1, 1 - Math.max(0, remainingTime) / duration));
    return Math.sin(normalized * Math.PI) * Math.max(0, maxLift);
  };

  let settings = Object.assign({}, defaults);
  let enemyDefinitions = {};
  let enemyTypesCache = null;
  let playerConfigCache = null;
  const tintCanvas =
    typeof document !== "undefined" && document?.createElement
      ? document.createElement("canvas")
      : null;
  const tintContext = tintCanvas ? tintCanvas.getContext("2d") : null;

  function buildPlayerConfig(baseConfig) {
    if (baseConfig) return Object.assign({}, baseConfig);
  const baseScale =
    typeof settings.PLAYER_BASE_SCALE === "number"
      ? settings.PLAYER_BASE_SCALE
      : defaults.PLAYER_BASE_SCALE;
  const playerScale = baseScale * (settings.WORLD_SCALE || 1);
  const playerSpeedScale = settings.WORLD_SCALE || 1;
  const playerCollisionRadius = 12;
  return {
    scale: playerScale,
    speed: 260 * playerSpeedScale,
    arrowCooldown: 0.35 / 2,
      maxHealth: settings.HERO_MAX_HEALTH || 100,
      radius: playerCollisionRadius * playerScale,
    };
  }

  function initialize(options = {}) {
    settings = Object.assign({}, defaults, options || {});
    enemyDefinitions = options.ENEMY_DEFINITIONS || enemyDefinitions || {};
    enemyTypesCache = buildEnemyTypes(enemyDefinitions);
    playerConfigCache = buildPlayerConfig(options && options.PLAYER_BASE_CONFIG);
    settings.PLAYER_CONFIG = playerConfigCache;
    return {
      PLAYER_CONFIG: playerConfigCache,
      ENEMY_TYPES: enemyTypesCache,
    };
  }

  function buildEnemyTypes(defs) {
    if (!defs || typeof defs !== "object") return {};
    const worldScale = settings.WORLD_SCALE || 1;
    const buildScaledHitbox = (def, scale) => {
      const raw = def && def.hitbox ? def.hitbox : null;
      if (!raw) return null;
      const width = Number(raw.width);
      const height = Number(raw.height);
      if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        return null;
      }
      const offsetX = Number.isFinite(raw.offsetX) ? raw.offsetX : 0;
      const offsetY = Number.isFinite(raw.offsetY) ? raw.offsetY : 0;
      return {
        width: width * scale,
        height: height * scale,
        offsetX: offsetX * scale,
        offsetY: offsetY * scale,
      };
    };
    const getHitboxRadius = (hitbox, fallback) => {
      if (!hitbox || !Number.isFinite(hitbox.width) || !Number.isFinite(hitbox.height)) return fallback;
      return Math.max(hitbox.width, hitbox.height) * 0.5;
    };
    const buildScaledWeaponHitbox = (def, scale) => {
      const raw = def && def.weaponHitbox ? def.weaponHitbox : null;
      if (!raw) return null;
      const width = Number(raw.width);
      const height = Number(raw.height);
      if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        return null;
      }
      const offsetX = Number.isFinite(raw.offsetX) ? raw.offsetX : 0;
      const offsetY = Number.isFinite(raw.offsetY) ? raw.offsetY : 0;
      return {
        width: width * scale,
        height: height * scale,
        offsetX: offsetX * scale,
        offsetY: offsetY * scale,
      };
    };
    return Object.fromEntries(
      Object.entries(defs).map(([key, def]) => {
        const scale = (def.scale || 1) * worldScale;
        const baseRadius = def.baseRadius || 14;
        const hitbox = buildScaledHitbox(def, scale);
        const weaponHitbox = buildScaledWeaponHitbox(def, scale);
        const baseHitRadius = baseRadius * scale;
        const hitRadius = getHitboxRadius(hitbox, baseHitRadius);
        const attackRange = def.attackRange ?? hitRadius + (def.attackBonus ?? 30);
        const displayName = def.displayName || def.folder || key;
        const referenceHealth = 120;
        const rawSpeed = typeof def.speed === "number" ? def.speed : 120;
        const enemyHealth = Math.max(
          1,
          def.maxHealth || def.health || referenceHealth,
        );
        // Scale speed down when health exceeds the reference so tougher enemies
        // walk slower, but never drop below 50% of their base pace.
        const healthRatio = referenceHealth / enemyHealth;
        const speedFactor = Math.min(1, Math.max(0.8, healthRatio));
        const adjustedSpeed = rawSpeed * speedFactor;
        const scaledSpeed = adjustedSpeed * worldScale;
        const tintColor = def.tintColor || null;
        const tintIntensity =
          typeof def.tintIntensity === "number" && def.tintIntensity >= 0
            ? def.tintIntensity
            : 0.75;
        return [
          key,
          {
            speed: scaledSpeed,
            health: def.health,
            maxHealth: def.health,
            damage: def.damage,
            contactDamage:
              Number.isFinite(def.contactDamage) && def.contactDamage >= 0
                ? def.contactDamage
                : undefined,
            attackDamage:
              Number.isFinite(def.attackDamage) && def.attackDamage >= 0
                ? def.attackDamage
                : undefined,
            attackRange,
            hitRadius,
            attackCooldown: def.cooldown,
            scale,
            catalogScale: def.scale || 1,
            score: def.score,
            displayName,
            ranged: Boolean(def.ranged),
            projectileType: def.projectileType || null,
            preferEdges: Boolean(def.preferEdges),
            desiredRange: def.desiredRange || attackRange,
            projectileCooldown: def.projectileCooldown || def.cooldown,
            bossTier: def.bossTier || 0,
            preferredTarget: def.preferredTarget || "player",
            orbiterSpawnType: def.orbiterSpawnType || null,
            orbiterVisual: def.orbiterVisual ? deepCloneValue(def.orbiterVisual) : null,
            specialBehavior: def.specialBehavior || [],
            damageClass: def.damageClass,
            tintColor,
            tintIntensity,
            hitbox,
            weaponHitbox: weaponHitbox || undefined,
            attackHitFrame:
              Number.isFinite(def.attackHitFrame) && def.attackHitFrame > 0
                ? def.attackHitFrame
                : undefined,
            attackHitDamage:
              Number.isFinite(def.attackHitDamage) && def.attackHitDamage >= 0
                ? def.attackHitDamage
                : undefined,
            swarmSpacing:
              typeof def.swarmSpacing === "number" ? def.swarmSpacing : undefined,
          },
        ];
      }),
    );
  }

  class AnimationClip {
    constructor(image, frameWidth, frameHeight, frameRate, options = {}) {
      const { loop = true, frameCount, renderScale = 1 } = options;
      this.image = image;
      this.frameWidth = frameWidth;
      this.frameHeight = frameHeight;
      this.frameRate = frameRate;
      this.loop = loop;
      this.renderScale = Number.isFinite(renderScale) && renderScale > 0 ? renderScale : 1;
      if (frameCount) {
        this.frameCount = frameCount;
      } else {
        const cols = Math.max(1, Math.floor(image.width / frameWidth));
        const rows = Math.max(1, Math.floor(image.height / frameHeight));
        this.frameCount = Math.max(1, cols * rows);
      }
    }
  }

  const cloneAnimationClip = (clip) => {
    if (!clip) return clip;
    const cloned = new AnimationClip(
      clip.image,
      clip.frameWidth,
      clip.frameHeight,
      clip.frameRate,
      {
        loop: clip.loop,
        frameCount: clip.frameCount,
        renderScale: clip.renderScale,
      },
    );
    if (Array.isArray(clip.frameMap)) {
      cloned.frameMap = clip.frameMap.slice();
    }
    for (const [key, value] of Object.entries(clip)) {
      if (
        key === "image" ||
        key === "frameWidth" ||
        key === "frameHeight" ||
        key === "frameRate" ||
        key === "loop" ||
        key === "renderScale" ||
        key === "frameCount" ||
        key === "frameMap"
      ) {
        continue;
      }
      cloned[key] = Array.isArray(value) ? value.slice() : value;
    }
    return cloned;
  };

  const cloneClipBundle = (clips) => {
    if (!clips || typeof clips !== "object") return clips;
    return Object.fromEntries(
      Object.entries(clips).map(([name, clip]) => [name, cloneAnimationClip(clip)]),
    );
  };

  const deepCloneValue = (value) => {
    if (Array.isArray(value)) {
      return value.map((item) => deepCloneValue(item));
    }
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [key, deepCloneValue(entry)]),
      );
    }
    return value;
  };

  const getOrbiterVisualFrames = (visualConfig) => {
    if (!visualConfig || typeof visualConfig !== "object") return null;
    if (String(visualConfig.type || "").toLowerCase() !== "projectile") return null;
    const assetKey = String(visualConfig.assetKey || "").trim();
    if (!assetKey) return null;
    const frames =
      typeof projectileFrames !== "undefined" && projectileFrames
        ? projectileFrames[assetKey]
        : null;
    return Array.isArray(frames) && frames.length ? frames : null;
  };

  const getOrbiterVisualFrame = (visualConfig, frameTime = 0) => {
    const frames = getOrbiterVisualFrames(visualConfig);
    if (!frames || !frames.length) return null;
    const frameDuration =
      Number.isFinite(visualConfig?.frameDuration) && visualConfig.frameDuration > 0
        ? visualConfig.frameDuration
        : 0.08;
    const frameIndex = Math.floor(Math.max(0, frameTime) / frameDuration) % frames.length;
    return frames[frameIndex] || frames[0];
  };

  class Animator {
    constructor(clips, scale = 1) {
      this.clips = clips;
      this.scale = scale;
      this.currentClip = null;
      this.currentName = "";
      this.frameIndex = 0;
      this.accumulator = 0;
      this.finished = false;
      this.playbackLoopOverride = undefined;
      this._deathLocked = false;
    }

    play(name, { restart = false, loop = undefined } = {}) {
      if (!this.clips[name]) return;
      this.playbackLoopOverride = loop;
      if (name === "death") {
        const callerRequestedLoop = typeof loop !== "undefined" ? Boolean(loop) : undefined;
        const clipLoopMeta = (this.currentClip && this.currentClip.loop) || false;
        const effectiveLooping =
          typeof callerRequestedLoop !== "undefined" ? callerRequestedLoop : clipLoopMeta;
        if (effectiveLooping === false) {
          if (this.currentName === "death" && this._deathLocked) {
            try {
              console.debug && console.debug("Animator.play: death locked, ignoring request");
            } catch (e) {}
            return;
          }
          this._deathLocked = true;
        }
      } else {
        this._deathLocked = false;
      }

      if (this.currentName === name && restart && name === "death") {
        const alreadyStarted = this.frameIndex > 0 || this.accumulator > 0;
        const callerOverride =
          typeof this.playbackLoopOverride !== "undefined"
            ? Boolean(this.playbackLoopOverride)
            : undefined;
        const effectiveLooping =
          typeof callerOverride !== "undefined"
            ? callerOverride
            : ((this.currentClip && this.currentClip.loop) || false);
        if (!effectiveLooping && (alreadyStarted || this.playbackLoopOverride === false)) {
          try {
            console.debug &&
              console.debug("Animator.play: ignoring repeated death restart (strict)", {
                name,
                frameIndex: this.frameIndex,
                accumulator: this.accumulator,
                clip: this.currentClip && {
                  frameCount: this.currentClip.frameCount,
                  frameRate: this.currentClip.frameRate,
                  frameWidth: this.currentClip.frameWidth,
                  frameHeight: this.currentClip.frameHeight,
                  loop: this.currentClip.loop,
                },
                playbackLoopOverride: this.playbackLoopOverride,
              });
          } catch (e) {}
          return;
        }
      }

      this.currentClip = this.clips[name];
      this.currentName = name;
      this.frameIndex = 0;
      this.accumulator = 0;
      this.finished = false;
      this.playbackLoopOverride = loop;

      if (name === "death") {
        try {
          const c = this.currentClip || {};
          console.debug && console.debug("Animator.play: death requested", {
            name,
            clip: {
              frameCount: c.frameCount,
              frameRate: c.frameRate,
              frameWidth: c.frameWidth,
              frameHeight: c.frameHeight,
              imageSrc: c.image && c.image.src,
            },
            playbackLoopOverride: this.playbackLoopOverride,
          });
        } catch (e) {}
      }

      try {
        const clip = this.currentClip;
        const logicalFrames =
          Array.isArray(clip.frameMap) && clip.frameMap.length
            ? clip.frameMap.length
            : clip.frameCount || 0;
        const shouldLoop =
          this.playbackLoopOverride !== undefined
            ? Boolean(this.playbackLoopOverride)
            : Boolean(clip.loop);
        if (!shouldLoop && (logicalFrames <= 1 || clip.frameRate <= 0)) {
          this.finished = true;
        }
      } catch (e) {}
    }

    update(dt) {
      if (!this.currentClip) return;
      const clip = this.currentClip;
      const logicalFrames =
        Array.isArray(clip.frameMap) && clip.frameMap.length
          ? clip.frameMap.length
          : clip.frameCount || 0;
      if (logicalFrames <= 1 || clip.frameRate <= 0) return;
      const frameDuration = 1 / clip.frameRate;
      this.accumulator += dt;

      while (this.accumulator >= frameDuration) {
        this.accumulator -= frameDuration;
        const shouldLoop =
          this.playbackLoopOverride !== undefined
            ? Boolean(this.playbackLoopOverride)
            : Boolean(clip.loop);
        if (this.frameIndex < logicalFrames - 1) {
          this.frameIndex += 1;
        } else if (shouldLoop) {
          this.frameIndex = 0;
        } else {
          this.frameIndex = logicalFrames - 1;
          this.finished = true;
          break;
        }
      }
    }

    isFinished() {
      return this.finished;
    }

    draw(context, x, y, options = {}) {
      const {
        flipX = false,
        alpha = 1,
        rotation = 0,
        flashWhite = 0,
        damageFlashIntensity = settings.DAMAGE_FLASH_INTENSITY || 1,
        tintColor = null,
        tintIntensity = 1,
        blur = 0,
      } = options || {};
      if (!this.currentClip) return;
      const clip = this.currentClip;
      const baseScale = Number.isFinite(clip.renderScale) && clip.renderScale > 0 ? clip.renderScale : 1;
      const clipScale =
        typeof this.scale === "number" && this.scale > 0
          ? baseScale * this.scale
          : baseScale;
      const width = clip.frameWidth * clipScale;
      const height = clip.frameHeight * clipScale;
      const cols = Math.max(1, Math.floor(clip.image.width / clip.frameWidth));
      let effectiveIndex = this.frameIndex;
      if (Array.isArray(clip.frameMap) && clip.frameMap.length) {
        const mapLen = clip.frameMap.length;
        const mapPos = mapLen > 0 ? this.frameIndex % mapLen : 0;
        effectiveIndex = Number.isFinite(clip.frameMap[mapPos]) ? clip.frameMap[mapPos] : 0;
      }
      const sx = (effectiveIndex % cols) * clip.frameWidth;
      const sy = Math.floor(effectiveIndex / cols) * clip.frameHeight;

      context.save();
      context.globalAlpha = alpha;
      if (blur > 0) {
        context.filter = `blur(${blur}px)`;
      }
      context.translate(x, y);
      context.rotate(rotation);
      if (flipX) context.scale(-1, 1);

      context.drawImage(
        clip.image,
        sx,
        sy,
        clip.frameWidth,
        clip.frameHeight,
        -width / 2,
        -height / 2,
        width,
        height,
      );

      const flashAmount = Math.max(0, Math.min(1, flashWhite * damageFlashIntensity));
      if (flashAmount > 0) {
        const prevComposite = context.globalCompositeOperation;
        const prevAlpha = context.globalAlpha;
        const prevFilter = context.filter || "none";
        context.globalCompositeOperation = "lighter";
        context.globalAlpha = flashAmount;
        context.filter = `brightness(${(1 + flashAmount * 1.4).toFixed(2)}) saturate(${(
          1 + flashAmount * 0.9
        ).toFixed(2)})`;
        context.drawImage(
          clip.image,
          sx,
          sy,
          clip.frameWidth,
          clip.frameHeight,
          -width / 2,
          -height / 2,
          width,
          height,
        );
        context.filter = prevFilter;
        context.globalAlpha = prevAlpha;
        context.globalCompositeOperation = prevComposite;
      }

      if (tintColor) {
        const bufferWidth = Math.max(1, Math.ceil(width));
        const bufferHeight = Math.max(1, Math.ceil(height));
        if (tintCanvas && tintContext) {
          if (tintCanvas.width !== bufferWidth || tintCanvas.height !== bufferHeight) {
            tintCanvas.width = bufferWidth;
            tintCanvas.height = bufferHeight;
          } else {
            tintContext.clearRect(0, 0, bufferWidth, bufferHeight);
          }
          tintContext.globalAlpha = 1;
          tintContext.globalCompositeOperation = "source-over";
          tintContext.setTransform(1, 0, 0, 1, 0, 0);
          tintContext.drawImage(
            clip.image,
            sx,
            sy,
            clip.frameWidth,
            clip.frameHeight,
            0,
            0,
            bufferWidth,
            bufferHeight,
          );
          tintContext.globalCompositeOperation = "multiply";
          tintContext.globalAlpha = Math.max(0, Math.min(1, tintIntensity));
          tintContext.fillStyle = tintColor;
          tintContext.fillRect(0, 0, bufferWidth, bufferHeight);
          tintContext.globalCompositeOperation = "destination-atop";
          tintContext.globalAlpha = 1;
          tintContext.drawImage(
            clip.image,
            sx,
            sy,
            clip.frameWidth,
            clip.frameHeight,
            0,
            0,
            bufferWidth,
            bufferHeight,
          );
          tintContext.globalCompositeOperation = "source-over";
          tintContext.globalAlpha = 1;
          context.drawImage(
            tintCanvas,
            -width / 2,
            -height / 2,
            width,
            height,
          );
        } else {
          context.save();
          context.globalCompositeOperation = "multiply";
          context.globalAlpha = Math.max(0, Math.min(1, tintIntensity));
          context.fillStyle = tintColor;
          context.fillRect(-width / 2, -height / 2, width, height);
          context.globalCompositeOperation = "destination-atop";
          context.globalAlpha = 1;
          context.drawImage(
            clip.image,
            sx,
            sy,
            clip.frameWidth,
            clip.frameHeight,
            -width / 2,
            -height / 2,
            width,
            height,
          );
          context.restore();
        }
      }

      context.restore();
    }
  }

  class Player {
  constructor(x, y, clips) {
    this.x = x;
    this.y = y;
    this.isPlayer = true;
    const cfg = settings.PLAYER_CONFIG || playerConfigCache || buildPlayerConfig();
    playerConfigCache = cfg;
    this.config = cfg;
    this.animator = new Animator(clips, cfg.scale);
    this.animator.play("idle");
    this.state = "idle";
    this.facing = "down";
    this.aim = { x: 0, y: 1 };
    this.arrowCooldown = 0;
    this.magicCooldown = 0;
    this.maxHealth = this.config.maxHealth;
    this.health = this.maxHealth;
    this.invulnerableTimer = 0;
    this.radius = this.config.radius;
    this.weaponMode = "arrow";
    this.arrowBuffTimer = 0;
    this.magicBuffTimer = 0;
    this.arrowDamageMultiplier = 1;
    this.magicCooldownMultiplier = 1;
    this.magicSpeedMultiplier = 1;
    this.wisdomMissleShotsMax = 1;
    this.faithCannonDamageMultiplier = 1;
    this.faithCannonSpeedMultiplier = 1;
    this.faithCannonShotsMax = 1;
    this.faithCannonCooldownMultiplier = 1;
    this.fireDamageMultiplier = 1;
    this.fireSpeedMultiplier = 1;
    this.fireShotsMax = 1;
    this.fireCooldownMultiplier = 1;
    this.spreadGunTimer = 0;
    this.spreadGunBonusTimer = 0;
    this.spreadGunDuration = 0;
    this.spreadGunMaxDuration = 0;
    this.spreadGunExtraTimer = 0;
    this.spreadGunLevel = 0;
    this.spreadGunAlternate = false;
    this.haloTimer = 0;
    this.haloDuration = 0;
    this.haloMaxDuration = 0;
    this.haloLevel = 0;
    this.haloTimerSecondary = 0;
    this.haloTimerBonus = 0;
    this.spearTimer = 0;
    this.spearDuration = 0;
    this.spearMaxDuration = 0;
    this.spearLevel = 0;
    this.spearTimerSecondary = 0;
    this.spearTimerBonus = 0;
    this.sentryTimer = 0;
    this.sentryDuration = 0;
    this.sentryMaxDuration = 0;
    this.sentryLevel = 0;
    this.sentryTimerSecondary = 0;
    this.sentryTimerBonus = 0;
    this.armorTimer = 0;
    this.armorReduction = 0;
    this.weaponPowerTimer = 0;
    this.weaponPowerDuration = 0;
    this.wordOfGodTimer = 0;
    this.wordOfGodDuration = 0;
    this.wordOfGodCooldown = 0;
    this.prayerHoldTimer = 0;
    this.prayerHoldLocked = false;
    this.prayerCharge = 0;
    this.prayerChargeRequired =
      settings.PRAYER_BOMB_CHARGE_REQUIRED || defaults.PRAYER_BOMB_CHARGE_REQUIRED || 60;
    this.congregationCommandCharge = 0;
    this.congregationCommandChargeRequired =
      settings.CONGREGATION_COMMAND_CHARGE_TIME ||
      defaults.CONGREGATION_COMMAND_CHARGE_TIME ||
      12;
    this.overrideWeaponMode = null;
    this.shieldTimer = 0;
    this.shieldDuration = 0;
    this.speedBoostTimer = 0;
    this.speedBoostDuration = 0;
    this.powerExtendTimer = 0;
    this.powerExtendDuration = 0;
    this.damageFlashTimer = 0;
    this.projectileGlowTimer = 0;
    this.lockedPosition = null;
    this.safeTopMargin = Math.max(this.radius * 2, 8);
    this.knockbackVx = 0;
    this.knockbackVy = 0;
    this.knockbackTimer = 0;
    this.knockbackDuration = 0;
    this.knockbackLift = 0;
  }

    update(dt) {
    const timerDrainScale = 1;
    this.arrowCooldown = Math.max(0, this.arrowCooldown - dt);
    this.magicCooldown = Math.max(0, this.magicCooldown - dt);
    this.invulnerableTimer = Math.max(0, this.invulnerableTimer - dt);
    this.shieldTimer = Math.max(0, this.shieldTimer - dt * timerDrainScale);
    this.speedBoostTimer = Math.max(0, this.speedBoostTimer - dt * timerDrainScale);
    this.powerExtendTimer = Math.max(0, this.powerExtendTimer - dt * timerDrainScale);
    this.damageFlashTimer = Math.max(0, this.damageFlashTimer - dt);
    this.projectileGlowTimer = Math.max(0, (this.projectileGlowTimer || 0) - dt);
    if (this.hpDamageFlash?.timer > 0) {
      this.hpDamageFlash.timer = Math.max(0, this.hpDamageFlash.timer - dt);
    }
      if (this.state === "death") {
        this.animator.update(dt);
        if (typeof this.deathTimer === "number") {
          this.deathTimer -= dt;
          if (this.deathTimer <= 0 && !this.animator.isFinished()) {
            console.debug && console.debug("Player death timeout forcing finish");
            this.animator.finished = true;
          }
        }
        return;
      }

    this.arrowBuffTimer = Math.max(0, this.arrowBuffTimer - dt * timerDrainScale);
    if (this.arrowBuffTimer <= 0) this.arrowDamageMultiplier = 1;
    this.magicBuffTimer = Math.max(0, this.magicBuffTimer - dt * timerDrainScale);
    if (this.magicBuffTimer <= 0) {
      this.magicCooldownMultiplier = 1;
      this.magicSpeedMultiplier = 1;
    }
    this.spreadGunTimer = Math.max(0, this.spreadGunTimer - dt * timerDrainScale);
    this.spreadGunBonusTimer = Math.max(0, this.spreadGunBonusTimer - dt * timerDrainScale);
    if (this.spreadGunTimer <= 0) {
      if (this.spreadGunBonusTimer > 0) {
        this.spreadGunTimer = this.spreadGunBonusTimer;
        this.spreadGunBonusTimer = 0;
      }
    }
    if (this.spreadGunTimer <= 0 && this.spreadGunBonusTimer <= 0) {
      this.spreadGunDuration = 0;
      this.spreadGunLevel = 0;
      this.spreadGunAlternate = false;
    }
    this.spreadGunExtraTimer = Math.max(0, this.spreadGunExtraTimer - dt);
    this.haloTimer = Math.max(0, this.haloTimer - dt * timerDrainScale);
    this.haloTimerSecondary = Math.max(0, this.haloTimerSecondary - dt * timerDrainScale);
    this.haloTimerBonus = Math.max(0, this.haloTimerBonus - dt * timerDrainScale);
    if (this.haloTimer <= 0 && this.haloTimerSecondary > 0) {
      this.haloTimer = this.haloTimerSecondary;
      this.haloTimerSecondary = 0;
    }
    if (this.haloTimerSecondary <= 0 && this.haloTimerBonus > 0) {
      this.haloTimerSecondary = this.haloTimerBonus;
      this.haloTimerBonus = 0;
    }
    if (this.haloTimer <= 0 && this.haloTimerSecondary > 0) {
      this.haloTimer = this.haloTimerSecondary;
      this.haloTimerSecondary = 0;
    }
    if (this.haloTimer <= 0 && this.haloTimerSecondary <= 0 && this.haloTimerBonus <= 0) {
      this.haloDuration = 0;
      this.haloLevel = 0;
    }
    this.spearTimer = Math.max(0, this.spearTimer - dt * timerDrainScale);
    this.spearTimerSecondary = Math.max(0, this.spearTimerSecondary - dt * timerDrainScale);
    this.spearTimerBonus = Math.max(0, this.spearTimerBonus - dt * timerDrainScale);
    if (this.spearTimer <= 0 && this.spearTimerSecondary > 0) {
      this.spearTimer = this.spearTimerSecondary;
      this.spearTimerSecondary = 0;
    }
    if (this.spearTimerSecondary <= 0 && this.spearTimerBonus > 0) {
      this.spearTimerSecondary = this.spearTimerBonus;
      this.spearTimerBonus = 0;
    }
    if (this.spearTimer <= 0 && this.spearTimerSecondary > 0) {
      this.spearTimer = this.spearTimerSecondary;
      this.spearTimerSecondary = 0;
    }
    if (this.spearTimer <= 0 && this.spearTimerSecondary <= 0 && this.spearTimerBonus <= 0) {
      this.spearDuration = 0;
      this.spearLevel = 0;
    }
    this.sentryTimer = Math.max(0, this.sentryTimer - dt * timerDrainScale);
    this.sentryTimerSecondary = Math.max(0, this.sentryTimerSecondary - dt * timerDrainScale);
    this.sentryTimerBonus = Math.max(0, this.sentryTimerBonus - dt * timerDrainScale);
    if (this.sentryTimer <= 0 && this.sentryTimerSecondary > 0) {
      this.sentryTimer = this.sentryTimerSecondary;
      this.sentryTimerSecondary = 0;
    }
    if (this.sentryTimerSecondary <= 0 && this.sentryTimerBonus > 0) {
      this.sentryTimerSecondary = this.sentryTimerBonus;
      this.sentryTimerBonus = 0;
    }
    if (this.sentryTimer <= 0 && this.sentryTimerSecondary > 0) {
      this.sentryTimer = this.sentryTimerSecondary;
      this.sentryTimerSecondary = 0;
    }
    if (this.sentryTimer <= 0 && this.sentryTimerSecondary <= 0 && this.sentryTimerBonus <= 0) {
      this.sentryDuration = 0;
      this.sentryLevel = 0;
    }

    const decayBase = this.powerExtendTimer > 0 ? 0.5 : 1;
    const weaponDecayFactor = decayBase * 1.35 * timerDrainScale;
    this.weaponPowerTimer = Math.max(0, this.weaponPowerTimer - dt * weaponDecayFactor);
    if (this.weaponPowerTimer <= 0 && this.weaponMode !== "arrow") {
      this.weaponMode = "arrow";
      this.wisdomMissleShotsMax = 1;
      this.magicCooldownMultiplier = 1;
      this.magicSpeedMultiplier = 1;
      this.faithCannonShotsMax = 1;
      this.faithCannonCooldownMultiplier = 1;
      this.faithCannonSpeedMultiplier = 1;
      this.faithCannonDamageMultiplier = 1;
      this.fireShotsMax = 1;
      this.fireCooldownMultiplier = 1;
      this.fireSpeedMultiplier = 1;
      this.fireDamageMultiplier = 1;
      this.weaponPowerDuration = 0;
    }
    this.wordOfGodTimer = Math.max(0, this.wordOfGodTimer - dt * timerDrainScale);
    if (this.wordOfGodTimer <= 0) {
      this.wordOfGodDuration = 0;
    }
    this.wordOfGodCooldown = Math.max(0, this.wordOfGodCooldown - dt);
    this.congregationCommandCharge = Math.min(
      Math.max(0.001, this.congregationCommandChargeRequired || 1),
      Math.max(0, (this.congregationCommandCharge || 0) + dt),
    );

    this.armorTimer = Math.max(0, this.armorTimer - dt);
    if (this.armorTimer <= 0) this.armorReduction = 0;

    let moveX = 0;
    let moveY = 0;

    if (isActionActive("up")) moveY -= 1;
    if (isActionActive("down")) moveY += 1;
    if (isActionActive("left")) moveX -= 1;
    if (isActionActive("right")) moveX += 1;

    const movementLocked = isMovementLocked();
    if (movementLocked) {
      if (!this.lockedPosition) {
        this.lockedPosition = { x: this.x, y: this.y };
      } else {
        this.x = this.lockedPosition.x;
        this.y = this.lockedPosition.y;
      }
      moveX = 0;
      moveY = 0;
    } else if (this.lockedPosition) {
      this.lockedPosition = null;
    }

    const moving = moveX !== 0 || moveY !== 0;

    if (moving) {
      const { x, y } = normalizeVector(moveX, moveY);
      moveX = x;
      moveY = y;
      const speedMultiplier = this.getSpeedMultiplier();
      this.x += moveX * this.config.speed * speedMultiplier * dt;
      this.y += moveY * this.config.speed * speedMultiplier * dt;
      if (!this.isAttacking()) {
        if (this.state !== "walk") {
          this.state = "walk";
          this.animator.play("walk");
        }
      }
    } else if (!this.isAttacking()) {
      if (this.state !== "idle") {
        this.state = "idle";
        this.animator.play("idle");
      }
    }

    const meleeAttackState = window._meleeAttackState;
    let meleeFacingLocked = false;
    if (meleeAttackState && (meleeAttackState.swooshTimer > 0 || meleeAttackState.spinTimer > 0)) {
      const dir = meleeAttackState.spinTimer > 0
        ? (meleeAttackState.spinFacingDir || meleeAttackState.swooshDir || window.Input?.lastMovementDirection || { x: 1, y: 0 })
        : (meleeAttackState.swooshDir || window.Input?.lastMovementDirection || { x: 1, y: 0 });
      const { x, y } = normalizeVector(dir.x, dir.y);
      this.aim = { x, y };
      this.updateFacing(x, y);
      meleeFacingLocked = true;
    }

    if (!meleeFacingLocked) {
      let pointerApplied = false;
      if (aimState.usingPointer && pointerState.active) {
        pointerApplied = this.updateAimFromPointer();
      }

      if (!pointerApplied) {
        const hasKeyboardAim = !aimState.usingPointer && (aimState.x !== 0 || aimState.y !== 0);
        if (hasKeyboardAim) {
          this.aim = { x: aimState.x, y: aimState.y };
          this.updateFacing(aimState.x, aimState.y);
        } else if (moving) {
          this.aim = { x: moveX, y: moveY };
          this.updateFacing(moveX, moveY);
        }
      }
    }

    const holdingPrayerKeys = Boolean(window.Input?.keysPressed?.has("ArrowRight"));
    const prayerBombAllowed = typeof this.isPrayerBombReady === "function" ? this.isPrayerBombReady() : false;
    if (holdingPrayerKeys && prayerBombAllowed) {
      this.prayerHoldTimer += dt;
      this.prayerHoldTimer = Math.min(this.prayerHoldTimer, PRAYER_BOMB_HOLD_TIME);
      if (!this.prayerHoldLocked && this.prayerHoldTimer >= PRAYER_BOMB_HOLD_TIME) {
        this.prayerHoldLocked =
          typeof this.isPrayerBombReady === "function" ? this.isPrayerBombReady() : false;
      }
    } else {
      this.prayerHoldTimer = 0;
      this.prayerHoldLocked = false;
    }

    const congregationCommand =
      typeof consumeCongregationClick === "function" ? consumeCongregationClick() : false;
    if (congregationCommand) {
      const cTapCost = (this.prayerChargeRequired || 6000) / 6;
      if (this.isCongregationCommandReady() && (this.prayerCharge || 0) >= cTapCost) {
        const triggerCongregationCommand =
          typeof window !== "undefined" ? window.triggerCongregationCommand : null;
        if (
          typeof triggerCongregationCommand === "function" &&
          triggerCongregationCommand(this, { mode: congregationCommand })
        ) {
          this.congregationCommandCharge = 0;
          this.prayerCharge = Math.max(0, (this.prayerCharge || 0) - cTapCost);
          if (congregationCommand === "path") {
            window.FloatingText?.npcsYell?.("Pastor Protection");
            if (typeof window !== "undefined" && Array.isArray(window.npcs)) {
              window.npcs.forEach((npc) => {
                if (npc && !npc.departed && npc.active) {
                  window.FloatingText?.npcCheer(npc, "Pastor Protection!", "#fffbe8");
                }
              });
            }
          } else {
            window.npcsYell?.("Unity Attack");
          }
        }
      }
    }

    const suppressPrayerBombInput =
      typeof window !== "undefined" &&
      typeof window.isPrayerBombInputSuppressed === "function" &&
      window.isPrayerBombInputSuppressed();
    if (suppressPrayerBombInput && typeof window !== "undefined" && window.Input) {
      window.Input.prayerBombClickQueued = false;
    }
    if (!suppressPrayerBombInput && consumePrayerBombClick()) {
      const isFullCharge = typeof this.getPrayerChargeRatio === "function" && this.getPrayerChargeRatio() >= 1.0;
      this.castPrayerBomb();
      window.FloatingText?.heroSay?.(isFullCharge ? "Smite" : "Purge");
    }

      // Visitor mini-game: autolock on closest visitor or chatty NPC
      const activeWeapon = this.getActiveWeaponMode();
      let targetEntity = null;
      let minDistSq = Infinity;
      const weaponRange = 400 * (isBossStageActive() ? 1.5 : 1); // You may want to use weapon-specific range

  // Collect possible targets: enemies, bosses, visitors, chatty NPCs
  let possibleTargets = [];
  if (Array.isArray(enemies)) {
    for (const enemy of enemies) {
      if (!enemy) continue;
      if (
        typeof isEnemyTargetableForAutoAim === "function" &&
        !isEnemyTargetableForAutoAim(enemy)
      ) {
        continue;
      }
      possibleTargets.push(enemy);
    }
  }
  if (typeof activeBoss !== 'undefined' && activeBoss && !activeBoss.dead && activeBoss.state !== "death") possibleTargets.push(activeBoss);
  if (typeof visitorSession !== 'undefined' && Array.isArray(visitorSession.visitors)) possibleTargets = possibleTargets.concat(visitorSession.visitors);
      // Always include chatty NPCs in possibleTargets
      if (Array.isArray(npcs)) {
        for (const npc of npcs) {
          if (npc && npc.chatty && !possibleTargets.includes(npc)) possibleTargets.push(npc);
        }
      }

      for (const entity of possibleTargets) {
  // Do not skip bosses
  const isBoss = entity.isBoss || (entity.config && entity.config.isBoss) || (typeof entity.type === 'string' && entity.type.toLowerCase().includes('boss'));
  if (!entity || entity.dead || entity.state === "death" || ((entity.departed === true && !entity.chatty) && !isBoss)) continue;
        const dx = entity.x - this.x;
        const dy = entity.y - this.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < minDistSq && Math.sqrt(distSq) <= weaponRange) {
          minDistSq = distSq;
          targetEntity = entity;
        }
      }

      // Set aim to closest valid target if in range
      if (targetEntity && !meleeFacingLocked) {
        const dx = targetEntity.x - this.x;
        const dy = targetEntity.y - this.y;
        const norm = normalizeVector(dx, dy);
        this.aim = { x: norm.x, y: norm.y };
        this.updateFacing(norm.x, norm.y);
        // Optionally update reticle position here

        // Check if melee attack is blocking projectile firing
        const meleeState = window._meleeAttackState;
        const meleeBlocking = meleeState && meleeState.projectileBlockTimer > 0;

      // Autofire using the player's current weapon, including during visitor sessions.
      if (!meleeBlocking) {
        if (activeWeapon === "arrow" && this.arrowCooldown <= 0) {
          this.tryAttack("arrow");
        } else if (activeWeapon === "wisdom_missle" && this.magicCooldown <= 0) {
          this.tryAttack("wisdom_missle");
        } else if (activeWeapon === "faith_cannon" && this.magicCooldown <= 0) {
          this.tryAttack("faith_cannon");
        } else if (activeWeapon === "fire" && this.magicCooldown <= 0) {
          this.tryAttack("fire");
        }
        if (activeWeapon !== "arrow" && this.spreadGunTimer > 0) {
          const direction = this.getAimDirection();
          const originOffset = this.radius * 0.55;
          const originX = this.x + direction.x * originOffset;
          const originY = this.y + direction.y * originOffset;
          const bossRangeMultiplier = isBossStageActive() ? 1.5 : 1;
          this.spawnSpreadGunShots(direction, originX, originY, bossRangeMultiplier);
        }
      }
      } else if (moving) {
        // No target: face movement direction
        this.updateFacing(moveX, moveY);
      }

    if (this.isAttacking() && this.animator.isFinished()) {
      this.state = moving ? "walk" : "idle";
      this.animator.play(this.state);
    }

    this._renderYOverride = undefined;
    if (this.knockbackTimer > 0) {
      const step = Math.min(this.knockbackTimer, dt);
      const knockbackDuration = Math.max(0.001, this.knockbackDuration || this.knockbackTimer || step);
      this.x += this.knockbackVx * step;
      this.y += this.knockbackVy * step;
      if ((this.knockbackLift || 0) > 0) {
        const lift = getKnockbackArcLift(this.knockbackTimer, knockbackDuration, this.knockbackLift);
        this._renderYOverride = this.y - lift;
      }
      this.knockbackTimer = Math.max(0, this.knockbackTimer - dt);
      if (this.knockbackTimer <= 0) {
        this.knockbackVx = 0;
        this.knockbackVy = 0;
        this.knockbackDuration = 0;
        this.knockbackLift = 0;
      }
    }

    this.animator.update(dt);
  }

  updateAimFromPointer() {
    if (!pointerState.active) return false;
    const dx = pointerState.x - this.x;
    const dy = pointerState.y - this.y;
    if (dx === 0 && dy === 0) return false;
    const { x, y } = normalizeVector(dx, dy);
    this.aim = { x, y };
    aimState.x = x;
    aimState.y = y;
    aimState.usingPointer = true;
    this.updateFacing(x, y);
    return true;
  }

  updateFacing(dx, dy) {
    if (Math.abs(dx) > Math.abs(dy)) {
      this.facing = dx >= 0 ? "right" : "left";
    } else {
      this.facing = dy >= 0 ? "down" : "up";
    }
  }

  applySwordSlashFrameMap() {
    const animator = this.animator;
    if (!animator) return;
    const useShort = this.powerExtendTimer > 0;
    const clipNames = ["attackMelee", "attackArrow", "attackMagic"];
    clipNames.forEach((name) => {
      const clip = animator.clips?.[name];
      if (!clip) return;
      if (!clip._defaultFrameMap) {
        clip._defaultFrameMap = Array.isArray(clip.frameMap)
          ? clip.frameMap.slice()
          : null;
      }
      if (useShort) {
        clip.frameMap = [2, 3];
      } else if (clip._defaultFrameMap) {
        clip.frameMap = clip._defaultFrameMap.slice();
      }
    });
  }

  isAttacking() {
    return (
      this.state === "attackArrow" ||
      this.state === "attackMagic" ||
      this.state === "attackPrayer" ||
      this.state === "attackMelee"
    );
  }

  getActiveWeaponMode() {
    return this.overrideWeaponMode || this.weaponMode;
  }

  tryAttack(type) {
  if (this.state === "hurt" || this.state === "death") return;
  if (
    isDevMeleeArenaActive() &&
    type === "arrow"
  ) {
    return;
  }
  const meleeAttackState = window._meleeAttackState;
  if (meleeAttackState?.projectileBlockTimer > 0) return;
  const meleeInputBlocking =
    window.Input?.nesAButtonActive &&
    type === "arrow" &&
    Boolean(
      meleeAttackState &&
      (
        meleeAttackState.active ||
        meleeAttackState.buttonDown ||
        meleeAttackState.isCharging ||
        meleeAttackState.spinCharging ||
        meleeAttackState.isRushing ||
        meleeAttackState.spinTimer > 0 ||
        meleeAttackState.swooshTimer > 0
      )
    );
  if (meleeInputBlocking) return;
  this.applySwordSlashFrameMap();
  const bossRangeMultiplier = isBossStageActive() ? 1.5 : 1;
    if (type === "arrow") {
      if (this.arrowCooldown > 0) return;
      let direction = this.getAimDirection();
      if (!aimState.usingPointer && aimAssist.target) {
        const targetVec = normalizeVector(
          aimAssist.target.x - this.x,
          aimAssist.target.y - this.y,
        );
        const blend = 0.45;
        direction = normalizeVector(
          direction.x * (1 - blend) + targetVec.x * blend,
          direction.y * (1 - blend) + targetVec.y * blend,
        );
      }
      const originOffset = this.radius * 0.55;
      const originX = this.x + direction.x * originOffset;
      const originY = this.y + direction.y * originOffset;
      spawnProjectile("arrow", originX, originY, direction.x, direction.y, {
        damage: this.getArrowDamage(),
        scale: this.getArrowProjectileScale(),
        life: Number.isFinite(PROJECTILE_CONFIG.arrow?.life)
          ? PROJECTILE_CONFIG.arrow.life * bossRangeMultiplier
          : undefined,
        source: this,
        perseveranceFeedback: this.isArrowExtendProjectileBuffActive(),
      });
      this.spawnSpreadGunShots(direction, originX, originY, bossRangeMultiplier);
      const playArrowSfx =
        typeof window !== "undefined" ? window.playDefaultArrowSfx : null;
      if (typeof playArrowSfx === "function") {
        playArrowSfx(0.7);
      }
      this.state = "attackArrow";
      this.animator.play("attackArrow", { restart: true });
      this.arrowCooldown = this.getArrowCooldown();
      return;
    }

    if (type === "wisdom_missle") {
      if (this.magicCooldown > 0) return;
      let direction = this.getAimDirection();
      if (!aimState.usingPointer && aimAssist.target) {
        direction = normalizeVector(
          aimAssist.target.x - this.x,
          aimAssist.target.y - this.y,
        );
      }
      const originOffset = this.radius * 0.7;
      const originX = this.x + direction.x * originOffset;
      const originY = this.y + direction.y * originOffset;
      if (!canSpawnWisdomMissleProjectile()) return;
      const speed = this.getWisdomMissleSpeed();
      const travel = distanceToEdge(originX, originY, direction.x, direction.y);
      const life = (travel * bossRangeMultiplier) / speed;
      spawnProjectile("wisdom_missle", originX, originY, direction.x, direction.y, {
        damage: this.getWisdomMissleDamage(),
        speed,
        life,
        pierce: true,
        source: this,
      });
      this.spawnSpreadGunShots(direction, originX, originY, bossRangeMultiplier);
      const playWisdomSfx =
        typeof window !== "undefined" ? window.playWisdomCastSfx : null;
      if (typeof playWisdomSfx === "function") {
        playWisdomSfx(0.55);
      }
      this.magicCooldown = this.getWisdomMissleCooldown();
      this.state = "attackMagic";
      this.animator.play("attackMagic", { restart: true });
      return;
    }

    if (type === "faith_cannon") {
      if (this.magicCooldown > 0) return;
      let direction = this.getAimDirection();
      if (!aimState.usingPointer && aimAssist.target) {
        direction = normalizeVector(
          aimAssist.target.x - this.x,
          aimAssist.target.y - this.y,
        );
      }
      const originOffset = this.radius * 0.7;
      const originX = this.x + direction.x * originOffset;
      const originY = this.y + direction.y * originOffset;
      if (!canSpawnFaithCannonProjectile()) return;
      const speed = this.getFaithCannonSpeed();
      const travel = distanceToEdge(originX, originY, direction.x, direction.y);
      const life = Math.min(
        (travel * bossRangeMultiplier) / speed,
        (FAITH_CANNON_PROJECTILE_RANGE * bossRangeMultiplier) / speed,
      );
      spawnProjectile("faith_cannon", originX, originY, direction.x, direction.y, {
        damage: this.getFaithCannonDamage(),
        speed,
        life,
        pierce: false,
        source: this,
        onImpact: (projectile) => detonateFaithCannonProjectile(projectile, { endOfRange: false }),
        onExpire: (projectile) => {
          detonateFaithCannonProjectile(projectile, { endOfRange: true });
        },
      });
      this.spawnSpreadGunShots(direction, originX, originY, bossRangeMultiplier);
      const playFaithSfx =
        typeof window !== "undefined" ? window.playFaithCannonSfx : null;
      if (typeof playFaithSfx === "function") {
        playFaithSfx(0.55);
      }
      this.magicCooldown = this.getFaithCannonCooldown();
      this.state = "attackMagic";
      this.animator.play("attackMagic", { restart: true });
      return;
    }

    if (type === "fire") {
      if (this.magicCooldown > 0) return;
      let direction = this.getAimDirection();
      if (!aimState.usingPointer && aimAssist.target) {
        direction = normalizeVector(
          aimAssist.target.x - this.x,
          aimAssist.target.y - this.y,
        );
      }
      const originOffset = this.radius * 0.7;
      const originX = this.x + direction.x * originOffset;
      const originY = this.y + direction.y * originOffset;
      if (!canSpawnFireProjectile()) return;
      const speed = this.getFireSpeed();
      const travel = distanceToEdge(originX, originY, direction.x, direction.y);
      const life = (travel * bossRangeMultiplier) / speed;
      const frames = assets?.projectiles?.fire?.frames;
      spawnProjectile("fire", originX, originY, direction.x, direction.y, {
        damage: this.getFireDamage(),
        speed,
        life,
        pierce: true,
        frames,
        frameDuration: 0.05,
        flipHorizontal: direction.x < 0,
        source: this,
      });
      this.spawnSpreadGunShots(direction, originX, originY, bossRangeMultiplier);
      const playFireballSfx =
        typeof window !== "undefined" ? window.playFireballCastSfx : null;
      if (typeof playFireballSfx === "function") {
        playFireballSfx(0.6);
      }
      this.magicCooldown = this.getFireCooldown();
      this.state = "attackMagic";
      this.animator.play("attackMagic", { restart: true });
      return;
    }
  }

  castPrayerBomb() {
    if (this.invulnerableTimer > 0 || gameOver) return false;
    const ratio = this.getPrayerChargeRatio();
    const level1Threshold =
      typeof PRAYER_BOMB_LEVEL1_THRESHOLD === "number" ? PRAYER_BOMB_LEVEL1_THRESHOLD : 0.5;
    const level2Threshold =
      typeof PRAYER_BOMB_LEVEL2_THRESHOLD === "number" ? PRAYER_BOMB_LEVEL2_THRESHOLD : 0.8;
    const level3Threshold =
      typeof PRAYER_BOMB_LEVEL3_THRESHOLD === "number" ? PRAYER_BOMB_LEVEL3_THRESHOLD : 1.0;
    if (ratio < level1Threshold) return false;
    const level = ratio >= level3Threshold ? 3 : ratio >= level2Threshold ? 2 : 1;
    const bossScale =
      typeof PRAYER_BOMB_BOSS_DAMAGE_SCALE === "number" ? PRAYER_BOMB_BOSS_DAMAGE_SCALE : 0.5;
    const playPrayerBombSfx =
      typeof window !== "undefined" ? window.playPrayerBombSfx : null;
    const triggerPrayerBombScreenDarken =
      typeof window !== "undefined" ? window.triggerPrayerBombScreenDarken : null;
    if (typeof triggerPrayerBombScreenDarken === "function") {
      const duration = level === 3 ? 2.4 : 1.6;
      triggerPrayerBombScreenDarken(duration);
    }
    if (level === 1) {
      if (typeof playPrayerBombSfx === "function") {
        playPrayerBombSfx(0.85);
      }
      const radius = PRAYER_BOMB_RADIUS;
      const baseDamage =
        typeof PRAYER_BOMB_LEVEL1_DAMAGE === "number"
          ? PRAYER_BOMB_LEVEL1_DAMAGE
          : Math.max(
              this.getMagicDamage(),
              this.getPigDamage(),
              this.getFireDamage(),
            ) * PRAYER_BOMB_DAMAGE_MULTIPLIER;
      const struckEnemies = [];
      enemies.forEach((enemy) => {
        if (enemy.dead || enemy.state === "death") return;
        const distance = Math.hypot(enemy.x - this.x, enemy.y - this.y);
        const threshold = radius + (enemy.config?.hitRadius || enemy.radius || 0) * 0.8;
        if (distance <= threshold) {
          enemy.takeDamage(baseDamage);
          if (enemy.dead || enemy.state === "death" || (Number.isFinite(enemy.health) && enemy.health <= 0)) {
            enemy.killedByPrayerBomb = true;
          }
          struckEnemies.push(enemy);
        }
      });
      let bossHit = false;
      if (typeof activeBoss !== "undefined" && activeBoss && !activeBoss.dead && activeBoss.state !== "death") {
        const bossRadius = activeBoss.radius || 0;
        const bossDistance = Math.hypot(activeBoss.x - this.x, activeBoss.y - this.y);
        if (bossDistance <= radius + bossRadius * 0.8) {
          const bossDamage =
            typeof PRAYER_BOMB_LEVEL1_BOSS_DAMAGE === "number"
              ? PRAYER_BOMB_LEVEL1_BOSS_DAMAGE
              : baseDamage * bossScale;
          activeBoss.takeDamage(bossDamage);
          bossHit = true;
        }
      }
      if (struckEnemies.length) {
        struckEnemies.forEach((enemy) => {
          spawnRayboltEffect(enemy.x, enemy.y - enemy.config.hitRadius / 2, enemy.config.hitRadius * 1.2);
        });
      } else if (bossHit) {
        spawnRayboltEffect(activeBoss.x, activeBoss.y - (activeBoss.radius || 0) / 2, (activeBoss.radius || 60) * 1.2);
      } else {
        spawnRayboltEffect(this.x, this.y, radius);
      }
      const comboCount = struckEnemies.length + (bossHit ? 1 : 0);
      if (comboCount > 0 && levelManager?.recordPrayerBombContribution) {
        levelManager.recordPrayerBombContribution(comboCount);
      }
      if (comboCount > 0 && typeof window !== "undefined" && typeof window.showPrayerBombBlastCombo === "function") {
        const comboY = this.y - (this.radius || 24) - 20;
        window.showPrayerBombBlastCombo(comboCount, this.x, comboY);
      }
      spawnSplashDebugCircle(this.x, this.y, radius);
      spawnPrayerBombGlow(this.x, this.y, radius);
    } else if (level === 2) {
      if (typeof playPrayerBombSfx === "function") {
        playPrayerBombSfx(0.85);
      }
      const radius =
        typeof PRAYER_BOMB_LEVEL2_RADIUS === "number" ? PRAYER_BOMB_LEVEL2_RADIUS : PRAYER_BOMB_RADIUS * 1.35;
      const damage =
        typeof PRAYER_BOMB_LEVEL2_DAMAGE === "number" ? PRAYER_BOMB_LEVEL2_DAMAGE : 400;
      const struckEnemies = [];
      enemies.forEach((enemy) => {
        if (enemy.dead || enemy.state === "death") return;
        const distance = Math.hypot(enemy.x - this.x, enemy.y - this.y);
        const threshold = radius + (enemy.config?.hitRadius || enemy.radius || 0) * 0.8;
        if (distance <= threshold) {
          enemy.takeDamage(damage);
          if (enemy.dead || enemy.state === "death" || (Number.isFinite(enemy.health) && enemy.health <= 0)) {
            enemy.killedByPrayerBomb = true;
          }
          struckEnemies.push(enemy);
        }
      });
      let bossHit = false;
      if (typeof activeBoss !== "undefined" && activeBoss && !activeBoss.dead && activeBoss.state !== "death") {
        const bossRadius = activeBoss.radius || 0;
        const bossDistance = Math.hypot(activeBoss.x - this.x, activeBoss.y - this.y);
        if (bossDistance <= radius + bossRadius * 0.8) {
          const bossDamage =
            typeof PRAYER_BOMB_LEVEL2_BOSS_DAMAGE === "number"
              ? PRAYER_BOMB_LEVEL2_BOSS_DAMAGE
              : damage * bossScale;
          activeBoss.takeDamage(bossDamage);
          bossHit = true;
        }
      }
      if (struckEnemies.length) {
        struckEnemies.forEach((enemy) => {
          if (typeof spawnPrayerBombExplosion === "function") {
            spawnPrayerBombExplosion(enemy.x, enemy.y, { radius: enemy.config?.hitRadius || enemy.radius || 48 });
          }
        });
      }
      if (bossHit) {
        if (typeof spawnPrayerBombExplosion === "function") {
          spawnPrayerBombExplosion(activeBoss.x, activeBoss.y, { radius: activeBoss.radius || 80 });
        }
      }
      const comboCount = struckEnemies.length + (bossHit ? 1 : 0);
      if (comboCount > 0 && levelManager?.recordPrayerBombContribution) {
        levelManager.recordPrayerBombContribution(comboCount);
      }
      if (comboCount > 0 && typeof window !== "undefined" && typeof window.showPrayerBombBlastCombo === "function") {
        const comboY = this.y - (this.radius || 24) - 20;
        window.showPrayerBombBlastCombo(comboCount, this.x, comboY);
      }
      if (!struckEnemies.length && !bossHit) {
        if (typeof spawnPrayerBombExplosion === "function") {
          spawnPrayerBombExplosion(this.x, this.y, { radius });
        }
      }
    } else {
      if (typeof window !== "undefined" && typeof window.startPrayerBombFireRain === "function") {
        const duration = typeof window.PRAYER_BOMB_RAIN_DURATION === "number"
          ? window.PRAYER_BOMB_RAIN_DURATION
          : 5;
        window.startPrayerBombFireRain(duration);
      }
      if (typeof spawnPrayerBombExplosion === "function") {
        spawnPrayerBombExplosion(this.x, this.y, { radius: PRAYER_BOMB_RAIN_RADIUS });
      }
    }
    try {
      if (typeof window !== "undefined" && typeof window.boostVisitorFaithFromPrayerBomb === "function") {
        window.boostVisitorFaithFromPrayerBomb();
      }
    } catch (err) {
      console.warn && console.warn("boostVisitorFaithFromPrayerBomb failed", err);
    }
    hitFreezeTimer = HIT_FREEZE_DURATION;
    cameraShakeTimer = CAMERA_SHAKE_DURATION;
    cameraShakeMagnitude = CAMERA_SHAKE_INTENSITY * 1.5;
    // Level 3 (full charge) wipes the whole meter; lower levels cost 2 bars
    if (level === 3) {
      this.prayerCharge = 0;
    } else {
      const twoBars = (this.prayerChargeRequired || 6000) / 3; // 2/6 of the meter
      this.prayerCharge = Math.max(0, (this.prayerCharge || 0) - twoBars);
    }
    this.state = "attackPrayer";
    this.animator.play("attackMagic", { restart: true });
    return true;
  }

  addPrayerCharge(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return;
    const required = Math.max(1, this.prayerChargeRequired || 1);
    this.prayerCharge = Math.max(0, Math.min(required, (this.prayerCharge || 0) + amount));
  }

  resetPrayerCharge() {
    this.prayerCharge = 0;
  }

  getPrayerChargeRatio() {
    const required = Math.max(1, this.prayerChargeRequired || 1);
    return Math.max(0, Math.min(1, (this.prayerCharge || 0) / required));
  }

  getCongregationCommandChargeRatio() {
    const required = Math.max(0.001, this.congregationCommandChargeRequired || 1);
    return Math.max(0, Math.min(1, (this.congregationCommandCharge || 0) / required));
  }

  isCongregationCommandReady() {
    return this.getCongregationCommandChargeRatio() >= 1;
  }

  isPrayerBombReady() {
    const required = Math.max(1, this.prayerChargeRequired || 1);
    const ratio = (this.prayerCharge || 0) / required;
    const level1Threshold =
      typeof PRAYER_BOMB_LEVEL1_THRESHOLD === "number" ? PRAYER_BOMB_LEVEL1_THRESHOLD : 0.5;
    return ratio >= level1Threshold;
  }

  getAimDirection() {
    const aimVector =
      this.aim.x !== 0 || this.aim.y !== 0 ? this.aim : { x: 0, y: 1 };
    return normalizeVector(aimVector.x, aimVector.y);
  }

  spawnSpreadGunShots(direction, originX, originY, bossRangeMultiplier = 1) {
    if (this.spreadGunTimer <= 0) return;
    if (this.spreadGunExtraTimer > 0) return;
    const life = Number.isFinite(PROJECTILE_CONFIG.arrow?.life)
      ? PROJECTILE_CONFIG.arrow.life * bossRangeMultiplier
      : undefined;
    const damage = this.getArrowDamage();
    const scale = this.getArrowProjectileScale();
    const level = Math.max(1, Math.min(10, this.spreadGunLevel || 1));
    // streamCount = individual extra shots (1–5). Even counts = symmetric pairs. Odd = pairs + 1 alternating.
    const streamCount = Math.ceil(level / 2);
    const bonusStreams = this.spreadGunBonusTimer > 0 ? 2 : 0;
    const effectiveStreamCount = Math.min(7, streamCount + bonusStreams);
    const rateMultiplier = Math.max(0.7, ((level / 2) / effectiveStreamCount) * 2.0); // faster spread cadence for machine-gun feel
    this.spreadGunExtraTimer = this.getArrowCooldown() / rateMultiplier;
    const spreadStep = 0.15;
    const perp = { x: -direction.y, y: direction.x };
    const pairs = Math.floor(effectiveStreamCount / 2);
    const hasAlternating = (effectiveStreamCount % 2) === 1;
    const useLightSpreadVisual = true;
    const buildSpreadShotOverrides = (dx, dy) => {
      const overrides = { damage, scale, life, source: this, perseveranceFeedback: this.isArrowExtendProjectileBuffActive() };
      if (useLightSpreadVisual) {
        const baseArrowSpeed = Number.isFinite(PROJECTILE_CONFIG?.arrow?.speed)
          ? PROJECTILE_CONFIG.arrow.speed
          : null;
        if (baseArrowSpeed && baseArrowSpeed > 0) {
          // Laser tracers should feel snappy and precise.
          overrides.speed = baseArrowSpeed * 1.9;
          const travelDistance = Number.isFinite(life) ? baseArrowSpeed * life : null;
          if (travelDistance && travelDistance > 0) {
            overrides.life = travelDistance / overrides.speed;
          }
        }
        overrides.lightSpreadShot = true;
      }
      return overrides;
    };

    // Symmetric pairs (streams 1+2, 3+4, ...)
    for (let tier = 1; tier <= pairs; tier += 1) {
      const spread = spreadStep * tier;
      const left = normalizeVector(direction.x + perp.x * spread, direction.y + perp.y * spread);
      const right = normalizeVector(direction.x - perp.x * spread, direction.y - perp.y * spread);
      spawnProjectile("arrow", originX, originY, left.x, left.y, buildSpreadShotOverrides(left.x, left.y));
      spawnProjectile("arrow", originX, originY, right.x, right.y, buildSpreadShotOverrides(right.x, right.y));
    }

    // Odd stream: alternates left/right each shot so it stays visually balanced
    if (hasAlternating) {
      const spread = spreadStep * (pairs + 1);
      const side = this.spreadGunAlternate ? 1 : -1;
      const altDir = normalizeVector(
        direction.x + perp.x * spread * side,
        direction.y + perp.y * spread * side,
      );
      spawnProjectile("arrow", originX, originY, altDir.x, altDir.y, buildSpreadShotOverrides(altDir.x, altDir.y));
      this.spreadGunAlternate = !this.spreadGunAlternate;
    }
  }

  isArrowExtendProjectileBuffActive() {
    return (
      this.powerExtendTimer > 0 &&
      this.getActiveWeaponMode() === "arrow"
    );
  }

  getArrowDamage() {
    const extendBonus = this.isArrowExtendProjectileBuffActive() ? 1.5 : 1;
    return (
      PROJECTILE_CONFIG.arrow.damage *
      this.arrowDamageMultiplier *
      extendBonus
    );
  }

  getWisdomMissleDamage() {
    return PROJECTILE_CONFIG.wisdom_missle.damage;
  }

  getWisdomMissleSpeed() {
    return PROJECTILE_CONFIG.wisdom_missle.speed * this.magicSpeedMultiplier;
  }

  getWisdomMissleCooldown() {
    return (
      PROJECTILE_CONFIG.wisdom_missle.cooldownAfterFire * this.magicCooldownMultiplier
    );
  }

  getFaithCannonDamage() {
    return (
      PROJECTILE_CONFIG.faith_cannon.damage *
      this.faithCannonDamageMultiplier
    );
  }

  getFaithCannonSpeed() {
    return PROJECTILE_CONFIG.faith_cannon.speed * this.faithCannonSpeedMultiplier;
  }

  getFaithCannonCooldown() {
    return (
      PROJECTILE_CONFIG.faith_cannon.cooldownAfterFire *
      this.faithCannonCooldownMultiplier
    );
  }

  getFireDamage() {
    return PROJECTILE_CONFIG.fire.damage * this.fireDamageMultiplier;
  }

  getFireSpeed() {
    return PROJECTILE_CONFIG.fire.speed * this.fireSpeedMultiplier;
  }

  getFireCooldown() {
    return PROJECTILE_CONFIG.fire.cooldownAfterFire * this.fireCooldownMultiplier;
  }

  getMagicDamage() {
    return Math.max(
      this.getWisdomMissleDamage(),
      this.getFaithCannonDamage(),
      this.getFireDamage(),
    );
  }

  getPigDamage() {
    return this.getFireDamage();
  }

  getArrowProjectileScale() {
    const baseScale = PROJECTILE_CONFIG.arrow.scale || 1;
    return this.isArrowExtendProjectileBuffActive() ? baseScale * 2 : baseScale;
  }

  getArrowCooldown() {
    const baseCooldown = this.config.arrowCooldown || 0.1;
    return this.isArrowExtendProjectileBuffActive()
      ? Math.max(0.02, baseCooldown * 0.5)
      : baseCooldown;
  }

  getSpeedMultiplier() {
    let multiplier = 1;
    if (this.speedBoostTimer > 0) multiplier *= 1.4;
    const meleeChargeSlow =
      window._meleeAttackState?.isCharging && window._meleeAttackState?.buttonDown;
    if (meleeChargeSlow) {
      const slowMultiplier =
        typeof MELEE_CHARGE_MOVE_MULTIPLIER === "number" ? MELEE_CHARGE_MOVE_MULTIPLIER : 0.6;
      multiplier *= slowMultiplier;
    }
    const spinChargeSlow =
      window._meleeAttackState?.spinCharging && window._meleeAttackState?.spinButtonDown;
    if (spinChargeSlow) {
      const slowMultiplier =
        typeof SPIN_CHARGE_MOVE_MULTIPLIER === "number" ? SPIN_CHARGE_MOVE_MULTIPLIER : 0.5;
      multiplier *= slowMultiplier;
    }
    if (meleeChargeSlow && spinChargeSlow) {
      multiplier *= 0.5;
    }
    return multiplier;
  }

  clampToBounds() {
    clampEntityToBounds(this);
  }

  takeDamage(amount) {
    if (devTools.godMode) return;
    if (this.shieldTimer > 0) {
      spawnFlashEffect(this.x, this.y - this.radius / 2);
      return;
    }
    if (this.invulnerableTimer > 0 || gameOver) return;
    if (this.state === "death") return;
    const baseDamage = amount;
    const prevHealth = this.health;
    const reductionFactor = 1 - Math.min(0.8, this.armorReduction || 0);
    const appliedDamage = Math.max(1, Math.round(baseDamage * reductionFactor));
    if (!(typeof window !== "undefined" && window.__suppressDamageNumbers)) showDamage(this, appliedDamage, {
      color: "#ffd966",
      offsetY: this.radius * 0.5,
      fadeDelay: 0.5,
    });
    this.health = Math.max(0, this.health - appliedDamage);
    if (appliedDamage > 0 && (this.maxHealth || 0) > 0) {
      const startRatio = prevHealth / this.maxHealth;
      const endRatio = this.health / this.maxHealth;
      this.hpDamageFlash = {
        startRatio,
        endRatio,
        timer: 1.0,
        duration: 1.0,
        flashes: 3,
      };
    }
    this.invulnerableTimer = 1.1;
    hpFlashTimer = 0.6;
    if (typeof window !== "undefined" && typeof window.triggerDamageFlash === "function") {
      window.triggerDamageFlash();
    }
    if (typeof window !== "undefined" && typeof window.playPlayerHurtSfx === "function") {
      window.playPlayerHurtSfx(1.0);
    }
    spawnFlashEffect(this.x, this.y - this.radius / 2);
    this.damageFlashTimer = DAMAGE_FLASH_DURATION;
    hitFreezeTimer = HIT_FREEZE_DURATION;
    cameraShakeTimer = CAMERA_SHAKE_DURATION;
    cameraShakeMagnitude = CAMERA_SHAKE_INTENSITY;
    this.state = "hurt";
    this.animator.play("hurt", { restart: true });
    if (this.health <= 0) {
      if (this.state !== 'death') {
        this.state = "death";
        this.animator.play("death", { restart: true, loop: false });
        if (typeof window !== "undefined" && typeof window.playPlayerDeathBell === "function") {
          window.playPlayerDeathBell(1.0);
        }
        // compute fallback death timer
        try {
          const clip = this.animator.currentClip || {};
          const framesFromMap = Array.isArray(clip.frameMap) && clip.frameMap.length ? clip.frameMap.length : null;
          const frames = framesFromMap || (clip.frameCount || 0) || 10;
          const rate = clip && clip.frameRate ? clip.frameRate : 8;
          const expected = Math.max(0.05, frames / Math.max(0.0001, rate));
          this.deathTimer = expected + 0.25;
          console.debug && console.debug('Player death initiated', { frames, rate, expected, deathTimer: this.deathTimer });
        } catch (e) {}
        onPlayerDeath();
      }
    }
  }

  draw() {
    let flicker = 1;
    if (this.state === "death" && gameOver) {
      const flash = Math.sin(performance.now() * 0.02 * 20);
      flicker = flash > 0 ? 1 : 0.2;
    } else if (this.invulnerableTimer > 0) {
      flicker = 0.7 + Math.sin(Date.now() * 0.02) * 0.2;
    }
    const flip = this.facing === "left";
  const drawY = (this._renderYOverride !== undefined) ? this._renderYOverride : this.y;
    const flashStrength = this.damageFlashTimer > 0
      ? Math.min(1, Math.pow(this.damageFlashTimer / DAMAGE_FLASH_DURATION, 0.6))
      : 0;
    const glowTimer = this.projectileGlowTimer || 0;
    if (glowTimer > 0 && typeof drawProjectileGlow === "function") {
      const strength = Math.min(1, glowTimer / 0.22);
      const glowSize = Math.max(this.radius * 3.4, 84);
      ctx.save();
      ctx.translate(this.x, drawY);
      drawProjectileGlow(glowSize, glowSize, {
        radiusScale: 1.2,
        baseAlpha: 0.26 * strength,
        pulseScale: 0.3 * strength,
      });
      ctx.restore();
    }
  this.animator.draw(ctx, this.x, drawY, { flipX: flip, alpha: flicker, flashWhite: flashStrength });
  }
}


  class Enemy {
    constructor(type, config, clips, x, y) {
      this.type = type;
      const baseConfig = config || {};
      const resolvedHealth =
        typeof baseConfig.health === "number" && baseConfig.health > 0
          ? baseConfig.health
          : typeof baseConfig.maxHealth === "number" && baseConfig.maxHealth > 0
          ? baseConfig.maxHealth
          : 1;
      const resolvedMaxHealth =
        typeof baseConfig.maxHealth === "number" && baseConfig.maxHealth > 0
          ? baseConfig.maxHealth
          : resolvedHealth;
      this.config = {
        ...baseConfig,
        health: resolvedHealth,
        maxHealth: resolvedMaxHealth,
      };
      this.x = x;
      this.y = y;
      this.maxHealth = resolvedMaxHealth;
      this.health = resolvedHealth;
      const resolvedClips = this.type === "miniDemoness" ? cloneClipBundle(clips) : clips;
      this.animator = new Animator(resolvedClips, this.config.scale);
      this.state = "walk";
      this.animator.play("walk");
      this.facing = "down";
      this.attackTimer = 0;
      this.dead = false;
      this.scoreGranted = false;
      const hitbox = this.config.hitbox || null;
      if (hitbox && Number.isFinite(hitbox.width) && Number.isFinite(hitbox.height)) {
        this.radius = Math.max(hitbox.width, hitbox.height) * 0.5;
      } else {
        this.radius = this.config.hitRadius;
      }
      this.displayName = this.config.displayName || this.type;
      this.preferredTarget = this.config.preferredTarget || "player";
      this.orbiterSpawnType = this.config.orbiterSpawnType || null;
      this.orbiterVisual = this.config.orbiterVisual
        ? deepCloneValue(this.config.orbiterVisual)
        : null;
      this.touchCooldown = 0;
      this.isRanged = Boolean(this.config.ranged);
      this.preferEdges = Boolean(this.config.preferEdges);
      this.targetClosestAny =
        Array.isArray(this.config.specialBehavior) &&
        this.config.specialBehavior.includes("closestAny");
      this.projectileType =
        this.config.projectileType ||
        (this.type === "miniDemonLord" ? "fire" : null);
      this.projectileCooldown = this.config.projectileCooldown || this.config.attackCooldown || 1.5;
      this.desiredRange = this.config.desiredRange || this.config.attackRange || 300;
      this.edgeTarget = this.preferEdges ? this.chooseEdgePosition() : null;
      this.shieldHitCooldown = 0;
      this.cinematicWanderDir = this.randomDirection();
      const huntResolver =
        typeof shouldEnemyHuntNpcs === "function" ? shouldEnemyHuntNpcs : () => false;
      this.huntsNpcs = huntResolver(type, this.config);
      this.safeTopMargin = Math.max(this.radius * 3.5, 100);
      this.spawnDelay = 0;
      this.damageFlashTimer = 0;
      this.scatterTimer = 0;
      this.scatterDuration = 0;
      this.scatterVx = 0;
      this.scatterVy = 0;
      this.knockbackVx = 0;
      this.knockbackVy = 0;
      this.knockbackTimer = 0;
      this.knockbackDuration = 0;
      this.knockbackLift = KNOCKBACK_VISUAL_LIFT;
      this.hurtTimer = 0;
      this.hurtTimerActive = false;
      this.jumpCooldown = 0;
      this.jumpTimer = 0;
      this.jumpDuration = 0;
      this.jumpStartX = x;
      this.jumpStartY = y;
      this.jumpTargetX = x;
      this.jumpTargetY = y;
      this.forceDemonLordJump = false;
      this.fireKeeperPhase = null;
      this.fireKeeperPhaseTimer = 0;
      this.fireKeeperVisualAlpha = 1;
      this.fireKeeperHasFired = false;
      this.fireKeeperPendingReposition = false;
      this.fireKeeperSpawnPuffPlayed = false;
      this.demonessMode = null;
      this.demonessGrabTarget = null;
      this.demonessWhipApplied = false;
      this.demonessDrainTickTimer = DEMONESS_DRAIN_TICK_INTERVAL;
      this.demonessDrainedFaith = 0;
      this.demonessLassoCooldown = 0;
      this.fireThrowerBombActive = null;
      if (this.type === "miniDemonFireKeeper") {
        this.fireKeeperPhase = "hidden";
        this.fireKeeperPhaseTimer = FIRE_KEEPER_HIDDEN_DURATION * (0.85 + Math.random() * 0.35);
        this.fireKeeperVisualAlpha = 0;
        this.touchCooldown = Infinity;
        if (this.animator?.clips?.idle) {
          this.state = "idle";
          this.animator.play("idle");
        }
      }
      if (this.type === "tormentorFlame") {
        this.ignoreEntityCollisions = true;
      }
    }

    update(dt) {
      // spawnDelay removed; enemies act immediately after spawning
      this.damageFlashTimer = Math.max(0, this.damageFlashTimer - dt);
      this.jumpCooldown = Math.max(0, (this.jumpCooldown || 0) - dt);
      this.demonessLassoCooldown = Math.max(0, (this.demonessLassoCooldown || 0) - dt);
      if (this.type === "miniDemonFireThrower" && this.fireThrowerBombActive?.dead) {
        this.fireThrowerBombActive = null;
      }

      // Keep newly spawned enemies parked at their offscreen spawn position
      // until spawnOffscreenTimer elapses, so they don't drift inward before
      // entering the arena.
      if (this.spawnOffscreenTimer > 0 && !this._orbiting) {
        this.animator.update(dt);
        return;
      }

      if (this._orbiting && this.orbitParent) {
        if (this.orbitParent.dead || this.orbitParent.state === "death") {
          if (this.type === "tormentorFlame") {
            if (typeof window !== "undefined" &&
              typeof window.releaseTormentorFlameOnOwnerDeath === "function") {
              window.releaseTormentorFlameOnOwnerDeath(this);
            } else {
              this._orbiting = false;
              this.orbitParent = null;
              this.tormentorOrbitBound = false;
              this.tormentorReleasedOnDeath = true;
              this.ignoreEntityCollisions = false;
              this.ignoreWorldBounds = false;
              this.touchCooldown = 0;
              this.attackTimer = 0;
            }
            return;
          } else {
            this._orbiting = false;
            this.orbitParent = null;
            this.ignoreEntityCollisions = false;
            this.ignoreWorldBounds = false;
            this.touchCooldown = 0;
            this.attackTimer = 0;
            if (this.animator && this.config?.scale) {
              this.animator.scale = this.config.scale;
            }
          }
        } else {
          const angle = (this.orbitAngle || 0) + (this.orbitSpeed || 0) * dt;
          this.orbitAngle = angle;
          const radiusX = this.orbitRadiusX || 0;
          const radiusY = this.orbitRadiusY || 0;
          const depth = (Math.sin(angle) + 1) * 0.5;
          const lift = (1 - depth) * (this.orbitLift || 6);
          const offsetY = this.orbitOffsetY || 0;
          this.x = this.orbitParent.x + Math.cos(angle) * radiusX;
          this.y = this.orbitParent.y + offsetY + Math.sin(angle) * radiusY - lift;
          this.ignoreEntityCollisions = true;
          this.ignoreWorldBounds = true;
          this.touchCooldown = Infinity;
          this.updateFacing(Math.cos(angle), Math.sin(angle));
          if (this.state !== "walk") {
            this.state = "walk";
            this.animator.play("walk");
          }
          if (this.animator) {
            const scale = this.config?.scale || 1;
            const minScale = this.orbitScaleMin || 0.85;
            const maxScale = this.orbitScaleMax || 1.15;
            this.animator.scale = scale * (minScale + depth * (maxScale - minScale));
            this.animator.update(dt);
          }
          return;
        }
      }

      if (this.state === "death") {
        this.animator.update(dt);
        if (typeof this.deathTimer === "number") {
          this.deathTimer -= dt;
          if (this.deathTimer <= 0 && !this.animator.isFinished()) {
            try {
              console.debug &&
                console.debug("Enemy death timeout forcing finish", { type: this.type, x: this.x, y: this.y });
            } catch (e) {}
            this.animator.finished = true;
          }
        }
        if (this.animator.isFinished()) {
          this.dead = true;
        }
        return;
      }
      this.shieldHitCooldown = Math.max(0, (this.shieldHitCooldown || 0) - dt);
      this.tauntCooldown = Math.max(0, (this.tauntCooldown || 0) - dt);
      this._renderYOverride = undefined;

      if (this.scatterTimer > 0) {
        const step = Math.min(this.scatterTimer, dt);
        const scatterDuration = Math.max(0.001, this.scatterDuration || this.scatterTimer || step);
        const scatterFalloff = Math.max(0.18, this.scatterTimer / scatterDuration);
        this.scatterTimer = Math.max(0, this.scatterTimer - dt);
        this.knockbackTimer = Math.max(0, this.knockbackTimer - dt);
        this.x += this.scatterVx * step * scatterFalloff;
        this.y += this.scatterVy * step * scatterFalloff;
        if (typeof resolveEntityObstacles === "function") resolveEntityObstacles(this);
        if (typeof clampEntityToBounds === "function") clampEntityToBounds(this);
        const lift = getKnockbackArcLift(
          this.scatterTimer,
          scatterDuration,
          this.knockbackLift || KNOCKBACK_VISUAL_LIFT,
        );
        this._renderYOverride = this.y - lift;
        this.updateFacing(this.scatterVx, this.scatterVy);
        if (this.scatterTimer <= 0) {
          this.scatterVx = 0;
          this.scatterVy = 0;
          this.scatterDuration = 0;
          this.knockbackVx = 0;
          this.knockbackVy = 0;
          this.knockbackTimer = 0;
          this.knockbackDuration = 0;
        }
        this.animator.update(dt);
        return;
      }

      if (this.state === "hurt") {
        this.animator.update(dt);
        if (this.hurtTimerActive) {
          this.hurtTimer = Math.max(0, this.hurtTimer - dt);
          if (this.hurtTimer <= 0) {
            this.hurtTimer = 0;
            this.hurtTimerActive = false;
            this.state = "walk";
            this.animator.play("walk");
            return;
          }
        }
        if (this.animator.isFinished()) {
          this.hurtTimer = 0;
          this.hurtTimerActive = false;
          this.state = "walk";
          this.animator.play("walk");
        }
        return;
      }

      if (this.state === "jump") {
        const duration = Math.max(0.001, this.jumpDuration || DEMON_LORD_JUMP_DURATION);
        this.jumpTimer = Math.min(duration, (this.jumpTimer || 0) + dt);
        const t = Math.max(0, Math.min(1, this.jumpTimer / duration));
        const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const lineX = this.jumpStartX + (this.jumpTargetX - this.jumpStartX) * eased;
        const lineY = this.jumpStartY + (this.jumpTargetY - this.jumpStartY) * eased;
        const jumpDx = this.jumpTargetX - this.jumpStartX;
        const jumpDy = this.jumpTargetY - this.jumpStartY;
        const jumpDistance = Math.hypot(jumpDx, jumpDy) || 1;
        const perpX = -jumpDy / jumpDistance;
        const perpY = jumpDx / jumpDistance;
        const curveStrength = Math.min(42, jumpDistance * 0.14);
        const curveOffset = Math.sin(t * Math.PI) * curveStrength * (this.jumpCurveSign || 1);
        this.x = lineX + perpX * curveOffset;
        this.y = lineY + perpY * curveOffset;
        const lift = Math.sin(t * Math.PI) * DEMON_LORD_JUMP_ARC_LIFT;
        this._renderYOverride = this.y - lift;
        const faceDx = this.jumpTargetX - this.jumpStartX;
        const faceDy = this.jumpTargetY - this.jumpStartY;
        this.updateFacing(faceDx, faceDy);
        this.animator.update(dt);
        if (this.jumpTimer >= duration || this.animator.isFinished()) {
          this.jumpTimer = 0;
          this.jumpDuration = 0;
          this._renderYOverride = undefined;
          this.state = "walk";
          this.animator.play("walk");
        }
        return;
      }

      const cinematicActive = Boolean(window?.postDeathSequenceActive);
      if (cinematicActive) {
        this.wanderDuringCinematic(dt);
        return;
      }
      const target = this.acquireTarget();
      if (!target) {
        this.animator.update(dt);
        return;
      }

      const targetIsPlayer = target === player;
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const distance = Math.hypot(dx, dy) || 1;
      const targetRadius = targetIsPlayer ? (player?.radius || 0) : target.radius || NPC_RADIUS;
      const targetHitboxRect = getTargetHitboxRect(target);
      const isImmobileDummy = this.devImmobileTestDummy === true;
      if (isImmobileDummy) {
        if (!Number.isFinite(this.devAnchorX) || !Number.isFinite(this.devAnchorY)) {
          this.devAnchorX = this.x;
          this.devAnchorY = this.y;
        }
        this.x = this.devAnchorX;
        this.y = this.devAnchorY;
        this.knockbackVx = 0;
        this.knockbackVy = 0;
        this.knockbackTimer = 0;
        this.knockbackDuration = 0;
        this.scatterVx = 0;
        this.scatterVy = 0;
        this.scatterTimer = 0;
        this.scatterDuration = 0;
      }

      this.attackTimer = Math.max(0, this.attackTimer - dt);

      if (this.type === "miniDemonFireKeeper") {
        if (this.devArenaIdleOnly) {
          this.fireKeeperPhase = "materialize";
          this.fireKeeperVisualAlpha = 1;
          this.touchCooldown = 0;
          if (this.state !== "idle" && this.animator?.clips?.idle) {
            this.state = "idle";
            this.animator.play("idle");
          } else if (this.state !== "walk" && !this.animator?.clips?.idle) {
            this.state = "walk";
            this.animator.play("walk");
          }
          this.animator.update(dt);
          return;
        }
        this.updateFireKeeperBehavior(dt, target, dx, dy, distance, targetRadius);
        return;
      }
      if (this.type === "miniDemoness" && this.updateDemonessBehavior(dt, target, dx, dy, distance, targetRadius)) {
        return;
      }

      if (this.state === "attack") {
        if (!isImmobileDummy && this._attackLock && this._attackLock.target) {
          const t = this._attackLock.target;
          if (!t || t.departed || (typeof t.active !== "undefined" && !t.active)) {
            this._attackLock = null;
          } else {
            this.x = t.x + (this._attackLock.offsetX || 0);
            this.y = t.y + (this._attackLock.offsetY || 0);
          }
        }
        this.animator.update(dt);
        const attackHitFrame =
          Number.isFinite(this.config?.attackHitFrame) && this.config.attackHitFrame > 0
            ? this.config.attackHitFrame
            : null;
        const attackFrameEnabled = attackHitFrame !== null;
        if (attackFrameEnabled && !this.attackHitApplied) {
          const currentFrame =
            typeof this.animator?.frameIndex === "number" ? this.animator.frameIndex : 0;
          const displayFrame = currentFrame + 1;
          if (displayFrame >= attackHitFrame) {
            if (this.isRanged && this.projectileType) {
              this.fireRangedProjectile(dx, dy, {
                triggerAttackAnimation: false,
                setAttackTimer: false,
              });
              this.attackHitApplied = true;
            } else {
            const baseAttackRange =
              (this.config && (this.config.attackRange || this.config.desiredRange)) ||
              this.desiredRange ||
              this.radius;
            const attackThreshold = baseAttackRange + targetRadius * 0.2;
            const weaponRect = getWeaponHitboxRect(this);
            const targetX = targetIsPlayer ? player.x : target.x;
            const targetY = targetIsPlayer ? player.y : target.y;
            const hitConfirmed = weaponRect
              ? targetHitboxRect
                ? rectIntersectsRect(targetHitboxRect, weaponRect)
                : circleIntersectsRect(targetX, targetY, targetRadius, weaponRect)
              : distance <= attackThreshold;
            if (hitConfirmed) {
              if (targetIsPlayer) this.playerHitDuringAttack = true;
              const hitDamage = getEnemyAttackDamage(this);
              if (targetIsPlayer) {
                if (player.invulnerableTimer > 0) {
                  this.touchCooldown = Math.max(this.touchCooldown || 0, 0.35);
                } else if (player.shieldTimer > 0) {
                  applyShieldImpact(this);
                } else {
                  player.takeDamage(hitDamage);
                  applyWeaponKnockback(player, this.x, this.y, this);
                }
              } else if (typeof target.sufferAttack === "function") {
                const npcTarget = target;
                const targetStillValid =
                  npcTarget &&
                  !npcTarget.departed &&
                  (typeof npcTarget.active === "undefined" || npcTarget.active);
                const hasFaith = !(typeof npcTarget.faith === "number" && npcTarget.faith <= 0);
                if (targetStillValid && hasFaith) {
                  npcTarget.sufferAttack(hitDamage, {
                    sourceType: this.type,
                    bypassCooldown: true,
                  });
                  applyWeaponKnockback(npcTarget, this.x, this.y);
                }
              }
            } else if (targetIsPlayer) {
              this.counterHitUntil =
                (typeof performance !== "undefined" && typeof performance.now === "function"
                  ? performance.now()
                  : Date.now()) + 300;
            }
            this.attackHitApplied = true;
            }
          }
        }
        if (this.animator.isFinished()) {
          const baseAttackRange =
            (this.config && (this.config.attackRange || this.config.desiredRange)) || this.desiredRange || this.radius;
          const attackThreshold = baseAttackRange + targetRadius * 0.2;
          try {
            if (typeof console !== "undefined" && console.debug) {
              console.debug && console.debug("Enemy attack resolution", {
                type: this.type,
                targetType: targetIsPlayer ? "player" : target.type || "npc",
                distance,
                radius: this.radius,
                targetRadius,
                attackThreshold,
                isRanged: this.isRanged,
                attackTimer: this.attackTimer,
                targetActive: target && typeof target.active !== "undefined" ? target.active : undefined,
                targetDeparted: target && typeof target.departed !== "undefined" ? target.departed : undefined,
                damage: this.config && this.config.damage,
              });
            }
          } catch (e) {}
          if (!this.isRanged && distance <= attackThreshold && !attackFrameEnabled) {
            if (targetIsPlayer) {
              this.playerHitDuringAttack = true;
              if (player.invulnerableTimer > 0) {
                this.touchCooldown = Math.max(this.touchCooldown || 0, 0.35);
              } else if (player.shieldTimer > 0) {
                applyShieldImpact(this);
              } else {
                const hitDamage = getEnemyAttackDamage(this);
                if (hitDamage > 0) {
                  player.takeDamage(hitDamage);
                }
                applyWeaponKnockback(player, this.x, this.y, this);
              }
            } else if (typeof target.sufferAttack === "function") {
              const npcTarget = target;
              const targetStillValid =
                npcTarget && !npcTarget.departed && (typeof npcTarget.active === "undefined" || npcTarget.active);
              const hasFaith = !(typeof npcTarget.faith === "number" && npcTarget.faith <= 0);
              if (targetStillValid && hasFaith) {
                try {
                  console.debug &&
                    console.debug("Enemy dealing damage to NPC", { enemy: this.type, damage: getEnemyAttackDamage(this) });
                } catch (e) {}
                const hitDamage = getEnemyAttackDamage(this);
                if (hitDamage > 0) {
                  target.sufferAttack(hitDamage, {
                    sourceType: this.type,
                    bypassCooldown: true,
                  });
                  applyWeaponKnockback(npcTarget, this.x, this.y);
                }
              } else {
                this._attackLock = null;
              }
            }
          }
          if (targetIsPlayer && !this.playerHitDuringAttack) {
            this.counterHitUntil =
              (typeof performance !== "undefined" && typeof performance.now === "function"
                ? performance.now()
                : Date.now()) + 300;
          }
          this.playerHitDuringAttack = false;
          this.attackTimer = this.isRanged ? this.projectileCooldown : this.config.attackCooldown;
          this.state = "walk";
          this.animator.play("walk");
        }
        return;
      }

      if (this.isRanged) {
        this.updateRangedBehavior(dt, dx, dy, distance, targetRadius, isImmobileDummy);
        this.animator.update(dt);
        return;
      }

      const attackRange = this.config.attackRange + targetRadius * 0.2;
      const weaponHitbox = this.config?.weaponHitbox || null;
      const facingSign = dx >= 0 ? 1 : -1;
      const weaponRect =
        weaponHitbox && Number.isFinite(weaponHitbox.width) && Number.isFinite(weaponHitbox.height)
          ? {
              x:
                this.x +
                (this.config?.hitbox && Number.isFinite(this.config.hitbox.offsetX)
                  ? this.config.hitbox.offsetX
                  : 0) +
                (Number.isFinite(weaponHitbox.offsetX) ? weaponHitbox.offsetX * facingSign : 0) -
                weaponHitbox.width / 2,
              y:
                this.y +
                (this.config?.hitbox && Number.isFinite(this.config.hitbox.offsetY)
                  ? this.config.hitbox.offsetY
                  : 0) +
                (Number.isFinite(weaponHitbox.offsetY) ? weaponHitbox.offsetY : 0) -
                weaponHitbox.height / 2,
              width: weaponHitbox.width,
              height: weaponHitbox.height,
            }
          : null;
      const targetInWeaponRange =
        weaponRect &&
        (targetHitboxRect
          ? rectIntersectsRect(targetHitboxRect, weaponRect)
          : circleIntersectsRect(target.x, target.y, targetRadius, weaponRect));
      if ((targetInWeaponRange || distance <= attackRange) && this.attackTimer <= 0) {
        this.updateFacing(dx, dy);
        this.state = "attack";
        this.animator.play("attack", { restart: true });
        this.attackHitApplied = false;
        this.playerHitDuringAttack = false;
        return;
      }

      const desired = normalizeVector(dx, dy);
      const avoidance = computeObstacleAvoidance(this);
      let moveX = desired.x + avoidance.x * 2.2;
      let moveY = desired.y + avoidance.y * 2.2;
      if (moveX === 0 && moveY === 0) {
        moveX = desired.x;
        moveY = desired.y;
      }
      const moveDir = normalizeVector(moveX, moveY);
      if (!isImmobileDummy) {
        this.x += moveDir.x * this.config.speed * dt;
        this.y += moveDir.y * this.config.speed * dt;
      }
      this.updateFacing(moveDir.x, moveDir.y);

      if (this.knockbackTimer > 0) {
        const step = Math.min(this.knockbackTimer, dt);
        const knockbackDuration = Math.max(0.001, this.knockbackDuration || this.knockbackTimer || step);
        const knockbackFalloff = Math.max(0.18, this.knockbackTimer / knockbackDuration);
        this.x += this.knockbackVx * step * knockbackFalloff;
        this.y += this.knockbackVy * step * knockbackFalloff;
        const lift = getKnockbackArcLift(
          this.knockbackTimer,
          knockbackDuration,
          this.knockbackLift || KNOCKBACK_VISUAL_LIFT,
        );
        this._renderYOverride = this.y - lift;
        this.knockbackTimer = Math.max(0, this.knockbackTimer - dt);
        if (this.knockbackTimer <= 0) {
          this.knockbackVx = 0;
          this.knockbackVy = 0;
          this.knockbackDuration = 0;
        }
        if (typeof clampEntityToBounds === "function") {
          clampEntityToBounds(this);
        }
      }
      this.animator.update(dt);
    }

    acquireTarget() {
      let bestTarget = null;
      let bestDistSq = Infinity;
      const behaviors = Array.isArray(this.config?.specialBehavior) ? this.config.specialBehavior : [];
      const npcPriority = behaviors.includes("npcPriority");
      const targetClosestAny = behaviors.includes("closestAny") || this.targetClosestAny;
      const preferNpc = this.preferredTarget === "npc";
      const now =
        typeof performance !== "undefined" && typeof performance.now === "function"
          ? performance.now()
          : Date.now();
      if (this._forcedTarget && this._forcedTargetUntil && this._forcedTargetUntil > now) {
        const forced = this._forcedTarget;
        const stillValid =
          forced &&
          !forced.departed &&
          (typeof forced.active === "undefined" || forced.active) &&
          !(typeof forced.faith === "number" && forced.faith <= 0);
        if (stillValid) {
          return forced;
        }
      } else if (this._forcedTarget) {
        this._forcedTarget = null;
        this._forcedTargetUntil = null;
      }

      const considerNpc = (npc) => {
        if (!npc || npc.departed || !npc.active) return;
        if (typeof npc.faith === "number" && npc.faith <= 0) return;
        const dx = npc.x - this.x;
        const dy = npc.y - this.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < bestDistSq || npcPriority) {
          bestTarget = npc;
          bestDistSq = distSq;
        }
      };

      if (targetClosestAny) {
        if (player && player.state !== "death") {
          const dx = player.x - this.x;
          const dy = player.y - this.y;
          bestTarget = player;
          bestDistSq = dx * dx + dy * dy;
        }
        for (const npc of npcs) {
          considerNpc(npc);
        }
      } else if (preferNpc) {
        for (const npc of npcs) {
          considerNpc(npc);
        }
        if (!bestTarget && player && player.state !== "death") {
          bestTarget = player;
        }
      } else {
        if (player && player.state !== "death") {
          const dx = player.x - this.x;
          const dy = player.y - this.y;
          bestTarget = player;
          bestDistSq = dx * dx + dy * dy;
        }

        if (this.huntsNpcs || this.preferredTarget === "npc") {
          for (const npc of npcs) {
            considerNpc(npc);
          }
        }
      }

      return bestTarget;
    }

    updateFacing(nx, ny) {
      if (Math.abs(nx) > Math.abs(ny)) {
        this.facing = nx >= 0 ? "right" : "left";
      } else {
        this.facing = ny >= 0 ? "down" : "up";
      }
    }

    chooseEdgePosition() {
      const margin = Number.isFinite(this.config?.edgeMargin) ? this.config.edgeMargin : 120;
      if (!canvas) return { x: margin, y: margin };
      const minY = HUD_HEIGHT + margin;
      const maxY = Math.max(minY, canvas.height - margin);
      if (typeof randomInRange !== "function" || typeof randomChoice !== "function") {
        return { x: margin, y: minY };
      }
      const options = [
        { x: margin, y: randomInRange(minY, maxY) },
        { x: canvas.width - margin, y: randomInRange(minY, maxY) },
        { x: randomInRange(margin, canvas.width - margin), y: minY },
        { x: randomInRange(margin, canvas.width - margin), y: canvas.height - margin },
      ];
      return randomChoice(options);
    }

    ensureDemonessAttackProfile(mode = "whip") {
      const attackClip = this.animator?.clips?.attack;
      if (!attackClip) return;
      if (!Array.isArray(attackClip._demonessWhipFrames)) {
        attackClip._demonessWhipFrames = [27, 28, 29, 30, 31, 32, 33, 34, 35];
      }
      if (!Array.isArray(attackClip._demonessDrainFrames)) {
        attackClip._demonessDrainFrames = [45, 46, 47, 48, 49, 50, 51];
      }
      if (mode === "drain") {
        attackClip.frameMap = attackClip._demonessDrainFrames.slice();
        attackClip.frameRate = 12;
      } else {
        attackClip.frameMap = attackClip._demonessWhipFrames.slice();
        attackClip.frameRate = 11;
      }
    }

    getClosestDemonessNpcTarget() {
      if (!Array.isArray(npcs) || !npcs.length) return null;
      let bestNpc = null;
      let bestDistSq = Infinity;
      for (const npc of npcs) {
        if (!npc || npc.departed || !npc.active) continue;
        if (typeof npc.faith === "number" && npc.faith <= 0) continue;
        if (typeof npc.isEnsnared === "function" && npc.isEnsnared() && npc.ensnaredByEnemy !== this) continue;
        const dx = npc.x - this.x;
        const dy = npc.y - this.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < bestDistSq) {
          bestNpc = npc;
          bestDistSq = distSq;
        }
      }
      return bestNpc;
    }

    releaseDemonessGrabTarget({ resumeNpc = true } = {}) {
      const npc = this.demonessGrabTarget;
      if (npc && typeof npc.clearEnsnare === "function") {
        npc.clearEnsnare(this, { resume: resumeNpc });
      }
      this.demonessGrabTarget = null;
      this.demonessWhipApplied = false;
      this.demonessDrainTickTimer = DEMONESS_DRAIN_TICK_INTERVAL;
      this.demonessDrainedFaith = 0;
      if (this.state !== "hurt" && this.state !== "death") {
        this.state = "walk";
        this.animator.play("walk");
      }
    }

    updateDemonessBehavior(dt, target, dx, dy, distance, targetRadius = 0) {
      this.ensureDemonessAttackProfile("whip");
      const grabbedNpc =
        this.demonessGrabTarget &&
        !this.demonessGrabTarget.departed &&
        (typeof this.demonessGrabTarget.active === "undefined" || this.demonessGrabTarget.active) &&
        !(typeof this.demonessGrabTarget.faith === "number" && this.demonessGrabTarget.faith <= 0)
          ? this.demonessGrabTarget
          : null;
      if (!grabbedNpc && this.demonessGrabTarget) {
        this.releaseDemonessGrabTarget({ resumeNpc: false });
      }

      const npcTarget = grabbedNpc || this.getClosestDemonessNpcTarget();
      if (!npcTarget) {
        if (this.demonessGrabTarget) {
          this.releaseDemonessGrabTarget({ resumeNpc: true });
        }
        this.ensureDemonessAttackProfile("drain");
        return false;
      }

      let npcDx = npcTarget.x - this.x;
      let npcDy = npcTarget.y - this.y;
      let npcDistance = Math.hypot(npcDx, npcDy) || 1;
      const npcRadius = npcTarget.radius || 0;

      if (this.state === "attack" && this.demonessMode === "whip") {
        this.ensureDemonessAttackProfile("whip");
        this.updateFacing(npcDx, npcDy);
        this.animator.update(dt);
        const currentFrame =
          typeof this.animator?.frameIndex === "number" ? this.animator.frameIndex + 1 : 1;
        if (!this.demonessWhipApplied && currentFrame >= DEMONESS_WHIP_ATTACK_HIT_FRAME) {
          const whipRange = DEMONESS_WHIP_RANGE + npcRadius * 0.35;
          if (npcDistance <= whipRange && typeof npcTarget.setEnsnaredBy === "function") {
            if (npcTarget.setEnsnaredBy(this)) {
              this.demonessGrabTarget = npcTarget;
            }
          }
          this.demonessWhipApplied = true;
        }
        if (this.animator.isFinished()) {
          this.state = "walk";
          this.animator.play("walk");
          this.attackTimer = this.demonessGrabTarget ? 0.08 : Math.max(0.18, this.config.attackCooldown * 0.45);
        }
        return true;
      }

      if (this.demonessGrabTarget !== npcTarget) {
        this.ensureDemonessAttackProfile("whip");
        this.updateFacing(npcDx, npcDy);
        const desiredRange = DEMONESS_WHIP_RANGE + npcRadius * 0.35;
        if (npcDistance <= desiredRange && this.attackTimer <= 0 && (this.demonessLassoCooldown || 0) <= 0) {
          this.state = "attack";
          this.demonessMode = "whip";
          this.demonessWhipApplied = false;
          this.animator.play("attack", { restart: true, loop: false });
          return true;
        }
        const desired = normalizeVector(npcDx, npcDy);
        const avoidance = computeObstacleAvoidance(this);
        const moveDir = normalizeVector(desired.x + avoidance.x * 2.2, desired.y + avoidance.y * 2.2);
        this.x += moveDir.x * this.config.speed * dt;
        this.y += moveDir.y * this.config.speed * dt;
        this.updateFacing(moveDir.x, moveDir.y);
        if (this.state !== "walk") {
          this.state = "walk";
          this.animator.play("walk");
        }
        this.animator.update(dt);
        return true;
      }

      const dragGap = Math.max(0, npcDistance - (DEMONESS_PULL_CONTACT_DISTANCE + npcRadius * 0.45));
      if (dragGap > 0.5) {
        const pullStep = Math.min(dragGap, DEMONESS_PULL_SPEED * dt);
        const pullDir = normalizeVector(-npcDx, -npcDy);
        npcTarget.x += pullDir.x * pullStep;
        npcTarget.y += pullDir.y * pullStep;
        if (typeof clampEntityToBounds === "function") {
          clampEntityToBounds(npcTarget);
        }
        npcDx = npcTarget.x - this.x;
        npcDy = npcTarget.y - this.y;
        npcDistance = Math.hypot(npcDx, npcDy) || 1;
      }

      if (npcDistance > DEMONESS_PULL_CONTACT_DISTANCE + npcRadius * 0.45) {
        if (this.state !== "walk") {
          this.state = "walk";
          this.animator.play("walk");
        }
        this.animator.update(dt);
        return true;
      }

      this.ensureDemonessAttackProfile("drain");
      this.updateFacing(npcDx, npcDy);
      const contactDir = normalizeVector(npcDx, npcDy);
      const holdDistance = Math.max(8, DEMONESS_PULL_CONTACT_DISTANCE + npcRadius * 0.15);
      npcTarget.x = this.x + contactDir.x * holdDistance;
      npcTarget.y = this.y + contactDir.y * holdDistance;
      if (typeof clampEntityToBounds === "function") {
        clampEntityToBounds(npcTarget);
      }

      if (this.state !== "attack" || this.demonessMode !== "drain") {
        this.state = "attack";
        this.demonessMode = "drain";
        this.demonessDrainTickTimer = 0.08;
        this.attackHitApplied = false;
        this.animator.play("attack", { restart: true, loop: true });
      }

      this.animator.update(dt);
      this.demonessDrainTickTimer = Math.max(0, (this.demonessDrainTickTimer || 0) - dt);

      if (
        this.demonessDrainedFaith >= DEMONESS_DRAIN_TOTAL_FAITH ||
        (typeof npcTarget.faith === "number" && npcTarget.faith <= 0) ||
        npcTarget.departed ||
        !npcTarget.active
      ) {
        this.attackTimer = this.config.attackCooldown;
        this.releaseDemonessGrabTarget({ resumeNpc: (npcTarget.faith || 0) > 0 });
      }
      return true;
    }

    fireRangedProjectile(dx, dy, options = {}) {
      if (!this.projectileType) return;
      if (typeof normalizeVector !== "function" || typeof spawnProjectile !== "function") return;
      const triggerAttackAnimation = options?.triggerAttackAnimation !== false;
      const setAttackTimer = options?.setAttackTimer !== false;
      const dir = normalizeVector(dx, dy);
      const offset = this.radius * 0.6;
      let originX = this.x + dir.x * offset;
      let originY = this.y + dir.y * offset;
      const projectileConfig = typeof PROJECTILE_CONFIG === "object" && PROJECTILE_CONFIG !== null
        ? PROJECTILE_CONFIG
        : {};
      const baseConfig = projectileConfig[this.projectileType] || {};
      const baseSpeedScale = this.config.projectileSpeedMultiplier ?? 0.9;
      const speedScale = this.type === "miniFireImp" ? baseSpeedScale * 0.5 : baseSpeedScale;
      const spawnType = this.projectileType === "miniFireball" ? "arrow" : this.projectileType;
      const spawnOverrides = {
        friendly: false,
        damage: Math.max(1, this.config.damage || baseConfig.damage || 1),
        speed: (baseConfig.speed || 520) * speedScale,
        radius: baseConfig.radius || 20,
        source: this,
      };
      if (this.type === "miniDemonFireThrower") {
        if (this.fireThrowerBombActive && !this.fireThrowerBombActive.dead) return;
        const targetDistance = Math.max(90, Math.min(distanceToEdge ? distanceToEdge(this.x, this.y, dir.x, dir.y) : 220, 260));
        const flightDuration = 0.58;
        spawnOverrides.speed = targetDistance / flightDuration;
        spawnOverrides.damage = 0;
        spawnOverrides.radius = Math.max(16, Math.min(baseConfig.radius || 18, 18));
        spawnOverrides.frameDuration = 0.05;
        spawnOverrides.scale = 0.82;
        spawnOverrides.durabilityHealth = 20;
        spawnOverrides.durabilityDamagePerHit = 10;
        spawnOverrides.collisionDisabled = true;
        spawnOverrides.fireThrowerBomb = true;
        spawnOverrides.flightDuration = flightDuration;
        spawnOverrides.armedDuration = 2.1;
        spawnOverrides.fireThrowerLandingDamage = 5;
        spawnOverrides.fireThrowerLandingRadius = Math.max(spawnOverrides.radius * 2.1, 34);
        spawnOverrides.onExpire = (proj) => {
          if (proj?.source?.fireThrowerBombActive === proj) {
            proj.source.fireThrowerBombActive = null;
          }
        };
        spawnOverrides.onDestroyed = (proj) => {
          if (typeof spawnPuffEffect === "function") {
            spawnPuffEffect(proj.x, proj.y, Math.max(24, (proj.radius || 20) * 1.5), {
              tintColor: "#ffb347",
              tintAlpha: 0.48,
            });
          }
          if (proj?.source?.fireThrowerBombActive === proj) {
            proj.source.fireThrowerBombActive = null;
          }
        };
      }
      if (this.type === "miniDemonLord" && this.projectileType === "fire") {
        originX = this.x;
        originY = this.y - Math.max(this.radius * 1.45, 26) + 25;
        spawnOverrides.damage = 5;
        spawnOverrides.speed *= 0.55;
        spawnOverrides.durabilityHealth = 20;
        spawnOverrides.durabilityDamagePerHit = 10;
      }
      if (this.type === "miniFireImp") {
        const baseLife = baseConfig.life || 1.2;
        spawnOverrides.life = baseLife / Math.max(0.05, speedScale);
      }
      if (this.projectileType === "miniFireball" && Number.isFinite(baseConfig.life)) {
        spawnOverrides.life = baseConfig.life;
      }
      if (this.projectileType === "miniTrident") {
        const frames = projectileFrames.miniTrident ||
          (typeof getFramesForClip === "function" ? getFramesForClip(assets?.projectiles?.miniTrident) : null);
        if (frames && frames.length) {
          spawnOverrides.frames = frames;
          spawnOverrides.frameDuration = 0.08;
          spawnOverrides.loopFrames = false;
          spawnOverrides.flipHorizontal = false;
        }
        spawnOverrides.speed = (baseConfig.speed || spawnOverrides.speed) * speedScale;
        spawnOverrides.radius = baseConfig.radius || spawnOverrides.radius;
        spawnOverrides.scale = baseConfig.scale || spawnOverrides.scale;
      }
      if (this.type === "miniDemonLord" && this.projectileType === "fire") {
        const demonLordFrames = Array.isArray(projectileFrames.demonLordFireball)
          ? projectileFrames.demonLordFireball.slice(7)
          : null;
        if (demonLordFrames && demonLordFrames.length) {
          spawnOverrides.frames = demonLordFrames;
          spawnOverrides.frameDuration = 0.055;
          spawnOverrides.loopFrames = true;
          spawnOverrides.scale = Math.max(Number(baseConfig.scale) || 0, 1.3);
        }
      }
      if (this.type === "miniDemonFireKeeper" && this.projectileType === "faith_cannon") {
        const fireKeeperFrames = Array.isArray(projectileFrames.faith_cannon)
          ? projectileFrames.faith_cannon
          : null;
        if (fireKeeperFrames && fireKeeperFrames.length) {
          spawnOverrides.frames = fireKeeperFrames;
          spawnOverrides.frameDuration = 0.06;
          spawnOverrides.loopFrames = false;
          spawnOverrides.scale = Math.max(Number(baseConfig.scale) || 0, 1.45);
        }
        spawnOverrides.speed *= 0.82;
      }
      const projectile = spawnProjectile(spawnType, originX, originY, dir.x, dir.y, spawnOverrides);
      if (projectile) {
        projectile.hitEntities.add(this);
        this.updateFacing(dir.x, dir.y);
        if (this.type === "miniDemonFireThrower") {
          this.fireThrowerBombActive = projectile;
        }
        if (this.type === "miniDemonLord") {
          this.forceDemonLordJump = true;
          this.jumpCooldown = Math.max(this.jumpCooldown || 0, DEMON_LORD_JUMP_COOLDOWN * 0.5);
        }
        if (this.type === "miniDemonFireKeeper") {
          this.fireKeeperHasFired = true;
        }
        if (triggerAttackAnimation) {
          this.state = "attack";
          this.animator.play("attack", { restart: true });
          this.attackHitApplied = false;
        }
        if (setAttackTimer) {
          this.attackTimer = this.projectileCooldown;
        }
      }
    }


  wanderDuringCinematic(dt) {
    const speed = (this.config.speed || 120) * 0.35;
    if (Math.random() < 0.02 || !this.cinematicWanderDir) {
      this.cinematicWanderDir = this.randomDirection();
    }
    const dir = this.cinematicWanderDir;
    this.x += dir.x * speed * dt;
    this.y += dir.y * speed * dt;
    this.updateFacing(dir.x, dir.y);
    this.animator.update(dt);
  }

  randomDirection() {
    const angle = Math.random() * Math.PI * 2;
    return { x: Math.cos(angle), y: Math.sin(angle) };
  }

    chooseDemonLordJumpTarget(dx, dy) {
      let targetDx = dx;
      let targetDy = dy;
      if (Array.isArray(npcs) && npcs.length) {
        let bestNpc = null;
        let bestDistSq = Infinity;
        for (const npc of npcs) {
          if (!npc || npc.departed || !npc.active) continue;
          if (typeof npc.faith === "number" && npc.faith <= 0) continue;
          const ndx = npc.x - this.x;
          const ndy = npc.y - this.y;
          const distSq = ndx * ndx + ndy * ndy;
          if (distSq < bestDistSq) {
            bestDistSq = distSq;
            bestNpc = npc;
          }
        }
        if (bestNpc) {
          targetDx = bestNpc.x - this.x;
          targetDy = bestNpc.y - this.y;
        }
      }
      const toward = normalizeVector(targetDx, targetDy);
      const fallbackToward = toward.x === 0 && toward.y === 0 ? { x: 1, y: 0 } : toward;
      const lateralSign = Math.random() < 0.5 ? -1 : 1;
      const lateral = {
        x: -fallbackToward.y * lateralSign,
        y: fallbackToward.x * lateralSign,
      };
      const targetX = this.x + targetDx;
      const targetY = this.y + targetDy;
      const orbitDistance = randomInRange(
        Math.max(150, DEMON_LORD_JUMP_MIN_DISTANCE * 0.72),
        Math.max(210, DEMON_LORD_JUMP_MAX_DISTANCE * 0.68),
      );
      const retreatAmount = randomInRange(0.55, 0.9);
      const lateralAmount = randomInRange(0.75, 1.25);
      const orbitDir = normalizeVector(
        -fallbackToward.x * retreatAmount + lateral.x * lateralAmount,
        -fallbackToward.y * retreatAmount + lateral.y * lateralAmount,
      );
      const target = {
        x: targetX + orbitDir.x * orbitDistance,
        y: targetY + orbitDir.y * orbitDistance,
      };
      const radius = Math.max(this.radius || 0, 12);
      const lateralMargin = Math.max(radius, 16);
      const verticalMargin = Math.max(radius, 16);
      const topPadding =
        typeof this.safeTopMargin === "number"
          ? Math.max(this.safeTopMargin, verticalMargin)
          : Math.max(verticalMargin, Math.floor(radius * 2), 8);
      return {
        x: Math.max(lateralMargin, Math.min(canvas.width - lateralMargin, target.x)),
        y: Math.max(
          HUD_HEIGHT + topPadding,
          Math.min(canvas.height - verticalMargin, target.y),
        ),
      };
    }

    tryStartDemonLordJump(dx, dy, distance, targetRadius = 0) {
      if (this.type !== "miniDemonLord") return false;
      if (this.state === "jump" || this.state === "attack" || this.state === "hurt") return false;
      const forcedJump = this.forceDemonLordJump === true;
      if (!forcedJump && (this.jumpCooldown || 0) > 0) return false;
      const desiredRange = this.desiredRange || 360;
      const rangeBuffer = Math.max(0, targetRadius * 0.5);
      const tooClose = distance < desiredRange * 0.72 + rangeBuffer;
      const randomReposition = distance < desiredRange * 1.05 && Math.random() < 0.004;
      if (!forcedJump && !tooClose && !randomReposition) return false;
      const target = this.chooseDemonLordJumpTarget(dx, dy);
      if (!target) return false;
      this.jumpStartX = this.x;
      this.jumpStartY = this.y;
      this.jumpTargetX = target.x;
      this.jumpTargetY = target.y;
      this.jumpCurveSign = Math.random() < 0.5 ? -1 : 1;
      this.jumpTimer = 0;
      this.jumpDuration = DEMON_LORD_JUMP_DURATION;
      this.jumpCooldown = DEMON_LORD_JUMP_COOLDOWN;
      this.forceDemonLordJump = false;
      this.state = "jump";
      if (this.animator.clips?.jump) {
        this.animator.play("jump", { restart: true, loop: false });
      } else {
        this.animator.play("walk");
      }
      this.attackHitApplied = false;
      return true;
    }

    updateRangedBehavior(dt, dx, dy, distance, targetRadius = 0, isImmobileDummy = false) {
      const desiredRange = this.desiredRange;
      const rangeBuffer = Math.max(0, targetRadius * 0.5);
      const minDistance = desiredRange * 0.55 + rangeBuffer;
      const maxDistance = desiredRange * 1.25 + rangeBuffer;
      const isDemonLord = this.type === "miniDemonLord";
      let moveX = 0;
      let moveY = 0;

      if (!isImmobileDummy && this.tryStartDemonLordJump(dx, dy, distance, targetRadius)) {
        return;
      }

      if (!isImmobileDummy && this.preferEdges) {
        if (!this.edgeTarget || Math.random() < 0.002) {
          this.edgeTarget = this.chooseEdgePosition();
        }
        const edgeDx = this.edgeTarget.x - this.x;
        const edgeDy = this.edgeTarget.y - this.y;
        const edgeDist = Math.hypot(edgeDx, edgeDy);
        const edgeWeight = Number.isFinite(this.config?.edgeWeight) ? this.config.edgeWeight : 1;
        if (edgeDist > 48) {
          moveX += (edgeDx / edgeDist) * edgeWeight;
          moveY += (edgeDy / edgeDist) * edgeWeight;
        }
      }

      if (!isImmobileDummy && distance < minDistance && distance > 1) {
        moveX -= dx / distance;
        moveY -= dy / distance;
      } else if (!isImmobileDummy && distance > maxDistance) {
        moveX += dx / distance;
        moveY += dy / distance;
      }

      if (!isImmobileDummy && isDemonLord && distance > 1) {
        const lateralSign =
          Number.isFinite(this.jumpCurveSign) && this.jumpCurveSign !== 0
            ? this.jumpCurveSign
            : (Math.random() < 0.5 ? -1 : 1);
        const lateralX = (-dy / distance) * lateralSign;
        const lateralY = (dx / distance) * lateralSign;
        moveX += lateralX * 1.05;
        moveY += lateralY * 1.05;
        if (distance > desiredRange * 0.9 + rangeBuffer) {
          moveX += (dx / distance) * 0.7;
          moveY += (dy / distance) * 0.7;
        } else if (distance < desiredRange * 0.68 + rangeBuffer) {
          moveX -= (dx / distance) * 0.5;
          moveY -= (dy / distance) * 0.5;
        }
      }

      if (!isImmobileDummy && (moveX !== 0 || moveY !== 0)) {
        const moveDir = normalizeVector(moveX, moveY);
        this.x += moveDir.x * this.config.speed * dt;
        this.y += moveDir.y * this.config.speed * dt;
        if (typeof resolveEntityObstacles === "function") resolveEntityObstacles(this);
        if (typeof clampEntityToBounds === "function") clampEntityToBounds(this);
        this.updateFacing(moveDir.x, moveDir.y);
        if (this.state !== "attack") {
          if (this.state !== "walk") {
            this.state = "walk";
            this.animator.play("walk");
          }
        }
      } else if (this.state !== "attack" && this.state !== "hurt") {
        this.updateFacing(dx, dy);
        if (isDemonLord) {
          if (this.state !== "walk") {
            this.state = "walk";
            this.animator.play("walk");
          }
        } else if (this.state !== "idle") {
          this.state = "idle";
          this.animator.play("idle");
        }
      }

      const attackRangeMultiplier = isDemonLord ? 1.35 : 1.1;
      if (this.attackTimer <= 0 && distance <= desiredRange * attackRangeMultiplier + rangeBuffer) {
        const attackHitFrame =
          Number.isFinite(this.config?.attackHitFrame) && this.config.attackHitFrame > 0
            ? this.config.attackHitFrame
            : null;
        if (attackHitFrame !== null) {
          this.updateFacing(dx, dy);
          this.state = "attack";
          this.animator.play("attack", { restart: true });
          this.attackHitApplied = false;
        } else {
          this.fireRangedProjectile(dx, dy);
        }
      }
    }

    updateFireKeeperBehavior(dt, target, dx, dy, distance, targetRadius = 0) {
      const phase = this.fireKeeperPhase || "hidden";
      this.fireKeeperPhaseTimer = Math.max(0, (this.fireKeeperPhaseTimer || 0) - dt);
      this.updateFacing(dx, dy);

      const setIdle = () => {
        if (this.animator?.clips?.idle) {
          if (this.state !== "idle") {
            this.state = "idle";
            this.animator.play("idle");
          }
        } else if (this.state !== "walk") {
          this.state = "walk";
          this.animator.play("walk");
        }
      };

      if (phase === "hidden") {
        this.fireKeeperVisualAlpha = 0;
        this.touchCooldown = Infinity;
        this.attackHitApplied = false;
        this.fireKeeperHasFired = false;
        setIdle();
        this.animator.update(dt);
        if (this.fireKeeperPhaseTimer <= 0) {
          const nextPosition = this.preferEdges ? this.chooseEdgePosition() : { x: this.x, y: this.y };
          if (nextPosition) {
            this.x = nextPosition.x;
            this.y = nextPosition.y;
            if (typeof clampEntityToBounds === "function") clampEntityToBounds(this);
          }
          this.fireKeeperSpawnPuffPlayed = false;
          this.fireKeeperPhase = "materialize";
          this.fireKeeperPhaseTimer = FIRE_KEEPER_MATERIALIZE_DURATION;
        }
        return;
      }

      if (phase === "materialize") {
        if (!this.fireKeeperSpawnPuffPlayed && typeof spawnPuffEffect === "function") {
          spawnPuffEffect(
            this.x,
            this.y - Math.max(6, this.radius * 0.3),
            Math.max(30, this.radius * 3.2),
            { tintColor: "#f4d35e", tintAlpha: 0.72 },
          );
          this.fireKeeperSpawnPuffPlayed = true;
        }
        const progress = 1 - this.fireKeeperPhaseTimer / FIRE_KEEPER_MATERIALIZE_DURATION;
        const revealProgress = Math.max(0, (progress - 0.35) / 0.65);
        this.fireKeeperVisualAlpha = Math.max(0, Math.min(1, Math.pow(revealProgress, 0.8)));
        this.touchCooldown = 0;
        setIdle();
        this.animator.update(dt);
        if (this.fireKeeperPhaseTimer <= 0) {
          this.fireKeeperPhase = "casting";
          this.fireKeeperPhaseTimer = FIRE_KEEPER_PRE_ATTACK_HOLD;
          this.attackTimer = 0;
        }
        return;
      }

      if (this.state === "attack") {
        this.fireKeeperVisualAlpha = 1;
        this.touchCooldown = 0;
        this.animator.update(dt);
        const attackHitFrame =
          Number.isFinite(this.config?.attackHitFrame) && this.config.attackHitFrame > 0
            ? this.config.attackHitFrame
            : 5;
        if (!this.attackHitApplied) {
          const currentFrame =
            typeof this.animator?.frameIndex === "number" ? this.animator.frameIndex : 0;
          if (currentFrame + 1 >= attackHitFrame) {
            this.fireRangedProjectile(dx, dy, {
              triggerAttackAnimation: false,
              setAttackTimer: false,
            });
            this.attackHitApplied = true;
          }
        }
        if (this.animator.isFinished()) {
          this.attackTimer = this.projectileCooldown;
          this.attackHitApplied = false;
          this.fireKeeperPhase = "linger";
          this.fireKeeperPhaseTimer = FIRE_KEEPER_POST_ATTACK_HOLD;
          setIdle();
        }
        return;
      }

      if (phase === "casting") {
        this.fireKeeperVisualAlpha = 1;
        this.touchCooldown = 0;
        setIdle();
        this.animator.update(dt);
        const rangeBuffer = Math.max(0, targetRadius * 0.5);
        const fireRange = (this.desiredRange || 360) * 1.2 + rangeBuffer;
        if (distance <= fireRange && this.attackTimer <= 0) {
          this.state = "attack";
          this.animator.play("attack", { restart: true });
          this.attackHitApplied = false;
          this.fireKeeperHasFired = false;
          return;
        }
        if (this.fireKeeperPhaseTimer <= 0) {
          this.fireKeeperPhase = "dematerialize";
          this.fireKeeperPhaseTimer = FIRE_KEEPER_DEMATERIALIZE_DURATION;
        }
        return;
      }

      if (phase === "linger") {
        this.fireKeeperVisualAlpha = 1;
        this.touchCooldown = 0;
        setIdle();
        this.animator.update(dt);
        if (this.fireKeeperPhaseTimer <= 0) {
          this.fireKeeperPhase = "dematerialize";
          this.fireKeeperPhaseTimer = FIRE_KEEPER_DEMATERIALIZE_DURATION;
        }
        return;
      }

      if (phase === "dematerialize") {
        const progress = this.fireKeeperPhaseTimer / FIRE_KEEPER_DEMATERIALIZE_DURATION;
        const eased = Math.max(0, Math.min(1, Math.pow(progress, 1.65)));
        this.fireKeeperVisualAlpha = eased;
        this.touchCooldown = 0;
        setIdle();
        this.animator.update(dt);
        if (this.fireKeeperPhaseTimer <= 0) {
          this.fireKeeperPhase = "hidden";
          this.fireKeeperPhaseTimer = FIRE_KEEPER_HIDDEN_DURATION;
          this.fireKeeperVisualAlpha = 0;
          this.touchCooldown = Infinity;
        }
      }
    }

    takeDamage(amount, options = {}) {
      if (this.state === "death") return;
      if (this.type === "miniDemonFireKeeper" && this.fireKeeperPhase === "hidden") return;
      if (
        this.type === "tormentorFlame" &&
        this._orbiting &&
        this.tormentorOrbitBound &&
        this.orbitParent &&
        !this.orbitParent.dead &&
        this.orbitParent.state !== "death"
      ) {
        return;
      }
      const damageType = options?.damageType || null;
      const damageClass = (this.config?.damageClass || "normal").toLowerCase();
      const ignoreProjectileResistance = Boolean(
        options?.ignoreProjectileResistance &&
        damageType === "projectile" &&
        (damageClass === "tank" || damageClass === "armored")
      );
      let multiplier = 1;
      if (damageType) {
        if (ignoreProjectileResistance) {
          multiplier = 1;
        } else {
          multiplier = damageType === "projectile" && damageClass === "armored" ? 0.7 : 1.0;
        }
      }
      const scaledDamage = Math.max(0, Math.round(amount * multiplier));
      if (
        typeof window !== "undefined" &&
        window.__battlechurchDevMeleeArenaMode === true
      ) {
        window.__devArenaLastAppliedDamage = {
          at:
            typeof performance !== "undefined" && typeof performance.now === "function"
              ? performance.now()
              : Date.now(),
          target: this.config?.displayName || this.type || "Enemy",
          damageType: damageType || "none",
          damageClass,
          baseDamage: Math.max(0, Math.round(Number(amount) || 0)),
          multiplier: Number(multiplier) || 1,
          appliedDamage: scaledDamage,
        };
      }
      this.health -= scaledDamage;
      const damageText = options?.damageText || null;
      if (typeof showDamage === "function" && !(typeof window !== "undefined" && window.__suppressDamageNumbers)) {
        showDamage(this, scaledDamage, {
          color: damageText?.color || "#ff8181",
          fontSize: damageText?.fontSize || null,
          fontWeight: damageText?.fontWeight || null,
          offsetY: damageText?.offsetY || 0,
          fadeDelay: damageText?.fadeDelay || 0,
          priority: damageText?.priority || 0,
        });
      }
      const playHitSfx = typeof window !== "undefined" ? window.playEnemyHitSfx : null;
      if (typeof playHitSfx === "function") {
        playHitSfx(0.3);
      }
      if (this.type !== "tormentorFlame") {
        this.damageFlashTimer = DAMAGE_FLASH_DURATION;
      }
      if (this.health <= 0) {
        this.health = 0;
        if (this.type === "miniDemoness" && this.demonessGrabTarget) {
          this.releaseDemonessGrabTarget({ resumeNpc: true });
        }
        if (this.type === "tormentorFlame") {
          if (typeof spawnPuffEffect === "function") {
            const puffRadius = Math.max(18, (this.radius || 12) * 1.4);
            spawnPuffEffect(this.x, this.y, puffRadius);
          }
          this.state = "death";
          this.dead = true;
          this.ignoreEntityCollisions = true;
          this.canDealDamage = false;
          this.touchCooldown = Infinity;
          this.attackTimer = Infinity;
          this.config.hitRadius = 0;
          this.radius = 0;
          if (levelManager && typeof levelManager.notifyEnemyDefeated === "function") {
            levelManager.notifyEnemyDefeated();
            const baseHp = Math.max(0, Number(this.maxHealth) || Number(this.config?.health) || 0);
            if (baseHp > 0 && typeof levelManager.notifyEnemyDamaged === "function") {
              levelManager.notifyEnemyDamaged(baseHp);
            }
          }
          return;
        }
        if (this.state !== "death") {
          this.state = "death";
          this.animator.play("death", { restart: true, loop: false });
          const highHealth = (this.maxHealth || 0) > 400;
          const playHighHealthDeathSfx =
            typeof window !== "undefined" ? window.playHighHealthEnemyDeathSfx : null;
          const playDeathSfx =
            typeof window !== "undefined" ? window.playEnemyDeathSfx : null;
          if (highHealth && typeof playHighHealthDeathSfx === "function") {
            playHighHealthDeathSfx(1.0);
          } else if (typeof playDeathSfx === "function") {
            playDeathSfx(0.35);
          }
          this.ignoreEntityCollisions = true;
          this.canDealDamage = false;
          this.touchCooldown = Infinity;
          this.attackTimer = Infinity;
          if (typeof spawnEnemyDeathExplosion === "function") {
            const radius = this.config.hitRadius || this.radius || 24;
            spawnEnemyDeathExplosion(this.x, this.y, { radius });
          }
          this.config.hitRadius = 0;
          this.radius = 0;
          try {
            const clip = this.animator.currentClip || {};
            const framesFromMap =
              Array.isArray(clip.frameMap) && clip.frameMap.length ? clip.frameMap.length : null;
            const frames = framesFromMap || clip.frameCount || 0 || 8;
            const rate = clip && clip.frameRate ? clip.frameRate : 8;
            const expected = Math.max(0.05, frames / Math.max(0.0001, rate));
            this.deathTimer = expected + 0.25;
            console.debug &&
              console.debug("Enemy death initiated", { type: this.type, frames, rate, expected, deathTimer: this.deathTimer });
          } catch (e) {}
        }
        if (levelManager && typeof levelManager.notifyEnemyDefeated === "function") {
          levelManager.notifyEnemyDefeated();
          const baseHp = Math.max(0, Number(this.maxHealth) || Number(this.config?.health) || 0);
          if (baseHp > 0 && typeof levelManager.notifyEnemyDamaged === "function") {
            levelManager.notifyEnemyDamaged(baseHp);
          }
        }
      } else {
        if (this.type === "tormentorFlame") {
          return;
        }
        if (
          this.type === "miniDemoness" &&
          this.demonessGrabTarget &&
          (damageType === "melee" || damageType === "charged")
        ) {
          this.releaseDemonessGrabTarget({ resumeNpc: true });
          this.demonessLassoCooldown = DEMONESS_LASSO_BREAK_COOLDOWN;
        }
        const chargeProtected =
          this.type === "miniDemonLord" &&
          this.state === "attack" &&
          !this.attackHitApplied;
        const preemptedByPlayerMelee =
          !chargeProtected &&
          this.state === "attack" &&
          !this.attackHitApplied &&
          (damageType === "melee" || damageType === "charged");
        if (preemptedByPlayerMelee) {
          this.attackHitApplied = true;
          this.playerHitDuringAttack = false;
        }
        const repeatedLightPressure =
          damageType === "melee" &&
          Number.isFinite(Number(options?.hurtDuration)) &&
          Number(options.hurtDuration) > 0;
        const suppressProjectileStun =
          damageType === "projectile" && damageClass === "armored" && !ignoreProjectileResistance;
        const suppressRepeatedLightStun =
          repeatedLightPressure && damageClass === "armored";
        if (!chargeProtected && !suppressProjectileStun && !suppressRepeatedLightStun) {
          this.state = "hurt";
          if (this.type === "miniDemoness" && this.demonessMode === "whip") {
            this.demonessWhipApplied = true;
          }
          const customHurtDuration = Number(options?.hurtDuration);
          if (Number.isFinite(customHurtDuration) && customHurtDuration > 0) {
            this.hurtTimer = customHurtDuration;
            this.hurtTimerActive = true;
          } else {
            this.hurtTimer = 0;
            this.hurtTimerActive = false;
          }
          this.animator.play("hurt", { restart: true });
        }
      }
    }

    draw() {
      const flip = this.facing === "left";
      const drawY = this._renderYOverride !== undefined ? this._renderYOverride : this.y;
      if (!ctx) return;
      const showDemonessBind =
        this.type === "miniDemoness" &&
        this.demonessGrabTarget &&
        !this.demonessGrabTarget.departed &&
        (
          this.demonessMode !== "whip" ||
          this.state !== "attack" ||
          (((this.animator?.frameIndex ?? 0) + 1) >= 6)
        );
      if (showDemonessBind) {
        drawDemonessBindEffect(
          this,
          this.demonessGrabTarget,
          this.demonessMode === "drain" ? "drain" : "drag",
          { drawFrontLoop: false }
        );
      }
      const flashStrength =
        this.damageFlashTimer > 0
          ? Math.min(1, Math.pow(this.damageFlashTimer / DAMAGE_FLASH_DURATION, 0.6))
          : 0;
      const drawOptions = { flipX: flip, flashWhite: flashStrength };
      let baseAlpha = 1;
      if (typeof this.config?.alpha === "number") {
        baseAlpha = Math.max(0, Math.min(1, this.config.alpha));
      }
      if (baseAlpha < 1) {
        drawOptions.alpha = baseAlpha;
      }
      if (typeof this.config?.blur === "number" && this.config.blur > 0) {
        drawOptions.blur = this.config.blur;
      }
      if (this.type === "miniDemonFireKeeper") {
        drawOptions.alpha = Math.max(0, Math.min(1, (drawOptions.alpha ?? 1) * (this.fireKeeperVisualAlpha ?? 1)));
      }
      const tintColor = this.config?.tintColor;
      if (tintColor) {
        drawOptions.tintColor = tintColor;
        if (typeof this.config?.tintIntensity === "number") {
          drawOptions.tintIntensity = this.config.tintIntensity;
        }
      }
      const nowSeconds =
        (typeof performance !== "undefined" && typeof performance.now === "function"
          ? performance.now()
          : Date.now()) * 0.001;
      const hasFlameTag = Array.isArray(this.config?.specialBehavior)
        ? this.config.specialBehavior.includes("tormentorFlame")
        : this.type === "tormentorFlame";
      const isTormentorOrbiterVisualTarget =
        this.type === "tormentorFlame" ||
        (hasFlameTag && (this._orbiting || this.tormentorOrbitBound || this.tormentorReleasedOnDeath));
      if (isTormentorOrbiterVisualTarget) {
        drawOptions.alpha = 1;
      }
      const orbiterVisualFrame = isTormentorOrbiterVisualTarget
        ? getOrbiterVisualFrame(this.orbiterVisual, nowSeconds)
        : null;
      const shouldDrawOrbiterGlow =
        this.orbiterVisual?.glow === undefined ? hasFlameTag : Boolean(this.orbiterVisual?.glow);
      if (shouldDrawOrbiterGlow && this.state !== "death" && typeof drawProjectileGlow === "function") {
        const clip = this.animator?.currentClip;
        const clipScale =
          (Number.isFinite(this.animator?.scale) ? this.animator.scale : 1) *
          (Number.isFinite(clip?.renderScale) ? clip.renderScale : 1);
        const visualScale =
          Number.isFinite(this.orbiterVisual?.scale) && this.orbiterVisual.scale > 0
            ? this.orbiterVisual.scale
            : 1;
        const frameSize = orbiterVisualFrame
          ? Math.max(orbiterVisualFrame.width, orbiterVisualFrame.height) * clipScale * visualScale
          : clip && Number.isFinite(clip.frameWidth) && Number.isFinite(clip.frameHeight)
            ? Math.max(clip.frameWidth, clip.frameHeight) * clipScale
            : 0;
        const baseRadius = Math.max(10, this.radius || 0);
        const glowSize = Math.max(frameSize * 1.1, baseRadius * 2.8, 46);
        ctx.save();
        ctx.translate(this.x, drawY);
        drawProjectileGlow(glowSize, glowSize, { radiusScale: 1.05, baseAlpha: 0.18, pulseScale: 0.16 });
        ctx.restore();
      }
      if (orbiterVisualFrame && this.state !== "death") {
        const visualScale =
          Number.isFinite(this.orbiterVisual?.scale) && this.orbiterVisual.scale > 0
            ? this.orbiterVisual.scale
            : 1;
        const drawScale = (Number.isFinite(this.animator?.scale) ? this.animator.scale : 1) * visualScale;
        const drawWidth = orbiterVisualFrame.width * drawScale;
        const drawHeight = orbiterVisualFrame.height * drawScale;
        const visualAlpha =
          Number.isFinite(this.orbiterVisual?.alpha) && this.orbiterVisual.alpha >= 0
            ? this.orbiterVisual.alpha
            : 1;
        const brightness =
          Number.isFinite(this.orbiterVisual?.brightness) && this.orbiterVisual.brightness > 0
            ? this.orbiterVisual.brightness
            : 1;
        const saturation =
          Number.isFinite(this.orbiterVisual?.saturation) && this.orbiterVisual.saturation > 0
            ? this.orbiterVisual.saturation
            : 1;
        const rotationSpeed =
          Number.isFinite(this.orbiterVisual?.rotationSpeed)
            ? this.orbiterVisual.rotationSpeed
            : 0;
        ctx.save();
        ctx.translate(this.x, drawY);
        if (rotationSpeed) {
          ctx.rotate(nowSeconds * rotationSpeed);
        }
        ctx.globalAlpha *= (drawOptions.alpha ?? 1) * visualAlpha;
        if (brightness !== 1 || saturation !== 1) {
          ctx.filter = `brightness(${brightness}) saturate(${saturation})`;
        }
        ctx.drawImage(
          orbiterVisualFrame,
          -drawWidth / 2,
          -drawHeight / 2,
          drawWidth,
          drawHeight,
        );
        ctx.restore();
      } else {
        this.animator.draw(ctx, this.x, drawY, drawOptions);
      }
      if (showDemonessBind) {
        this._pendingFrontDemonessBindOverlay = true;
      }
      if (
        this.type === "miniDemonLord" &&
        this.state === "attack" &&
        this.projectileType === "fire" &&
        this.animator?.currentName === "attack"
      ) {
        const chargeFrames = Array.isArray(projectileFrames.demonLordFireball)
          ? projectileFrames.demonLordFireball
          : null;
        const attackFrame =
          typeof this.animator?.frameIndex === "number" ? this.animator.frameIndex + 1 : 1;
        if (chargeFrames && chargeFrames.length && attackFrame >= 1 && attackFrame <= 7) {
          const chargeFrame = chargeFrames[Math.min(chargeFrames.length - 1, attackFrame - 1)];
          if (chargeFrame) {
            const progress = attackFrame / 7;
            const growth = Math.pow(progress, 1.9);
            const orbX = this.x;
            const orbY = drawY - Math.max(this.radius * 1.7, 30) + 25;
            const minOrbSize = Math.max(6, this.radius * 0.22);
            const maxOrbSize = Math.max(this.radius * 1.9, chargeFrame.width * 1.85);
            const orbSize = minOrbSize + (maxOrbSize - minOrbSize) * growth;
            if (typeof drawProjectileGlow === "function") {
              ctx.save();
              ctx.translate(orbX, orbY);
              drawProjectileGlow(orbSize * 1.45, orbSize * 1.45, {
                radiusScale: 0.82 + growth * 0.48,
                baseAlpha: 0.06 + growth * 0.2,
                pulseScale: 0.08 + growth * 0.2,
              });
              ctx.restore();
            }
            ctx.save();
            ctx.translate(orbX, orbY);
            ctx.globalAlpha = 0.28 + growth * 0.72;
            ctx.drawImage(chargeFrame, -orbSize / 2, -orbSize / 2, orbSize, orbSize);
            ctx.restore();
          }
        }
      }
      const alwaysShow =
        typeof devTools !== "undefined" && Boolean(devTools.alwaysShowEnemyHP);
      const forceShow = Boolean(this.forceShowHpBar);
      const isBossLike =
        typeof this.type === "string" && this.type.toLowerCase().includes("boss");
      if (this.state !== "death" && (alwaysShow || forceShow || isBossLike)) {
        this.drawHealthBars();
      }
      if (this.state !== "death") {
        const hitRadius = this.radius || 0;
        const labelY = drawY - (hitRadius > 0 ? hitRadius * 0.6 : 6);
        if (typeof window !== "undefined" && Array.isArray(window.__battlechurchEnemyHpLabels)) {
          const hpValue = Math.max(0, Math.round(this.health || 0));
          const forceLabels = Boolean(window.__battlechurchShowEnemyDevLabels);
          if (forceLabels || hpValue > 100) {
            window.__battlechurchEnemyHpLabels.push({
              x: this.x,
              y: labelY,
              name: this.displayName || this.type,
              hp: hpValue,
              damage: this.config?.damage || 0,
              speed: this.config?.speed || 0,
              scale: this.config?.scale || 1,
              catalogScale: this.config?.catalogScale || this.config?.scale || 1,
            });
          }
        }
      }

      if (devTools.showCombatDebug) {
        try {
          ctx.save();
          ctx.fillStyle = "#fff";
          ctx.font = "12px Arial";
          const info = `hp:${Math.round(this.health || 0)}/${Math.round(this.maxHealth || 0)} dmg:${
            this.config?.damage || 0
          }`;
          ctx.fillText(info, this.x - 28, this.y - (this.radius || 20) - 40);
          ctx.strokeStyle = "rgba(255,255,255,0.12)";
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        } catch (e) {}
      }
    }

    drawPostNpcOverlay() {
      const showDemonessBind =
        this.type === "miniDemoness" &&
        this._pendingFrontDemonessBindOverlay &&
        this.demonessGrabTarget &&
        !this.demonessGrabTarget.departed;
      if (!showDemonessBind) return;
      drawDemonessBindEffect(
        this,
        this.demonessGrabTarget,
        this.demonessMode === "drain" ? "drain" : "drag",
        {
          drawTether: false,
          drawBackLoop: false,
          drawPulse: false,
        },
      );
      this._pendingFrontDemonessBindOverlay = false;
    }

    drawHealthBars() {
      const baseWidth = Math.min(110, Math.max(48, (this.radius || 0) * 1.4));
      const rowHeight = 6;
      const gap = 2;
      const baseY = this.y - (this.radius || 0) - 10;
      let remaining = this.health;
      ctx.save();
      for (let row = 0; row < HEALTH_BAR_ROW_HITS.length && remaining > 0; row += 1) {
        const hits = HEALTH_BAR_ROW_HITS[row];
        const rowMaxHealth = hits * ARROW_DAMAGE;
        const rowHealth = Math.min(remaining, rowMaxHealth);
        remaining -= rowHealth;
        const ratio = rowMaxHealth === 0 ? 0 : rowHealth / rowMaxHealth;
        const barX = this.x - baseWidth / 2;
        const barY = baseY - row * (rowHeight + gap);
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(barX, barY, baseWidth, rowHeight);
        const color = HEALTH_BAR_COLORS[row] || HEALTH_BAR_COLORS[HEALTH_BAR_COLORS.length - 1];
        ctx.fillStyle = color;
        ctx.fillRect(barX + 1, barY + 1, (baseWidth - 2) * ratio, rowHeight - 2);
      }
      ctx.restore();
    }
  }

  Entities.initialize = initialize;
  Entities.buildPlayerConfig = buildPlayerConfig;
  Entities.AnimationClip = AnimationClip;
  Entities.Animator = Animator;
  Entities.Player = Player;
  Entities.Enemy = Enemy;
  Entities.createPlayer = function createPlayer(x, y, clips) {
    return new Player(x, y, clips);
  };
  Entities.createEnemy = function createEnemy(type, config, clips, x, y) {
    return new Enemy(type, config, clips, x, y);
  };

  window.Entities = window.Entities || {};
  Object.assign(window.Entities, Entities);
})(typeof window !== "undefined" ? window : null);
