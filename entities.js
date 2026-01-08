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
    PRAYER_BOMB_CHARGE_REQUIRED: 60,
    COIN_COOLDOWN: 0.75,
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
    return Object.fromEntries(
      Object.entries(defs).map(([key, def]) => {
        const scale = (def.scale || 1) * worldScale;
        const baseRadius = def.baseRadius || 14;
        const hitRadius = baseRadius * scale;
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
            specialBehavior: def.specialBehavior || [],
            tintColor,
            tintIntensity,
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
  this.heartCooldown = Math.max(0, this.heartCooldown - dt);
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

const getPlayerStatMultiplier = (statKey) => {
  if (typeof window === "undefined" || !window.StatsManager) return 1;
  return window.StatsManager.getStatMultiplier
    ? window.StatsManager.getStatMultiplier(statKey) || 1
    : 1;
};

const getPlayerStatValue = (statKey) => {
  if (typeof window === "undefined" || !window.StatsManager) return 0;
  return window.StatsManager.getStatValue
    ? window.StatsManager.getStatValue(statKey) || 0
    : 0;
};

const getResistanceTimerScale = () => {
  const resistance = getPlayerStatValue("damage_resistance");
  const normalized = Math.max(0, Math.min(0.9, resistance));
  return Math.max(0.1, 1 - normalized);
};

class Player {
  constructor(x, y, clips) {
    this.x = x;
    this.y = y;
    this.isPlayer = true;
  this.heartCooldown = 0;
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
    this.armorTimer = 0;
    this.armorReduction = 0;
    this.weaponPowerTimer = 0;
    this.weaponPowerDuration = 0;
    this.prayerHoldTimer = 0;
    this.prayerHoldLocked = false;
    this.prayerCharge = 0;
    this.prayerChargeRequired =
      settings.PRAYER_BOMB_CHARGE_REQUIRED || defaults.PRAYER_BOMB_CHARGE_REQUIRED || 60;
    this.overrideWeaponMode = null;
    this.shieldTimer = 0;
    this.shieldDuration = 0;
    this.speedBoostTimer = 0;
    this.speedBoostDuration = 0;
    this.powerExtendTimer = 0;
    this.powerExtendDuration = 0;
    this.damageFlashTimer = 0;
    this.lockedPosition = null;
    this.safeTopMargin = Math.max(this.radius * 2, 8);
  }

    update(dt) {
    const timerDrainScale = getResistanceTimerScale();
    this.arrowCooldown = Math.max(0, this.arrowCooldown - dt);
    this.magicCooldown = Math.max(0, this.magicCooldown - dt);
    this.invulnerableTimer = Math.max(0, this.invulnerableTimer - dt);
    this.shieldTimer = Math.max(0, this.shieldTimer - dt * timerDrainScale);
    this.speedBoostTimer = Math.max(0, this.speedBoostTimer - dt * timerDrainScale);
    this.powerExtendTimer = Math.max(0, this.powerExtendTimer - dt * timerDrainScale);
    this.damageFlashTimer = Math.max(0, this.damageFlashTimer - dt);
    if (this.hpDamageFlash?.timer > 0) {
      this.hpDamageFlash.timer = Math.max(0, this.hpDamageFlash.timer - dt);
    }
    this.heartCooldown = Math.max(0, this.heartCooldown - dt);
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

    const holdingPrayerKeys = isActionActive("aimLeft") && isActionActive("aimRight");
    if (holdingPrayerKeys) {
      this.prayerHoldTimer += dt;
      if (!this.prayerHoldLocked && this.prayerHoldTimer >= PRAYER_BOMB_HOLD_TIME) {
        this.prayerHoldLocked = true;
        this.prayerHoldTimer = 0;
        this.castPrayerBomb();
      }
    } else {
      this.prayerHoldTimer = 0;
      this.prayerHoldLocked = false;
    }

    if (consumePrayerBombClick()) {
      this.castPrayerBomb();
    }

    // Previously the player would auto-switch to the "coin" weapon when
    // aim assist targeted an NPC. We no longer auto-switch — keep player
    // weapon selection under player control and preserve any manual override.
    if (this.overrideWeaponMode === "coin") {
      // clear any leftover auto-coin override
      this.overrideWeaponMode = null;
    }



      // Visitor mini-game: autolock on closest visitor or chatty NPC
      const activeWeapon = this.getActiveWeaponMode();
      let targetEntity = null;
      let minDistSq = Infinity;
      const weaponRange = 400 * (isBossStageActive() ? 1.5 : 1); // You may want to use weapon-specific range

  // Collect possible targets: enemies, bosses, visitors, chatty NPCs
  let possibleTargets = [];
  if (Array.isArray(enemies)) possibleTargets = possibleTargets.concat(enemies);
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
      if (targetEntity) {
        const dx = targetEntity.x - this.x;
        const dy = targetEntity.y - this.y;
        const norm = normalizeVector(dx, dy);
        this.aim = { x: norm.x, y: norm.y };
        this.updateFacing(norm.x, norm.y);
        // Optionally update reticle position here

        // Visitor mini-game: fire hearts at visitors/chatty NPCs
        const isVisitor = typeof visitorSession !== 'undefined' && Array.isArray(visitorSession.visitors) && visitorSession.visitors.includes(targetEntity);
        const isChattyNPC = targetEntity.chatty === true;
        if ((isVisitor || isChattyNPC) && this.heartCooldown <= 0) {
          this.tryAttack("heart");
          this.state = "attackArrow";
          this.animator.play("attackArrow", { restart: true });
          this.heartCooldown = this.config.arrowCooldown * 0.8; // match heart cooldown logic
        } else {
          // Regular autofire for enemies
          if (activeWeapon === "arrow" && this.arrowCooldown <= 0) {
            this.tryAttack("arrow");
          } else if (activeWeapon === "wisdom_missle" && this.magicCooldown <= 0) {
            this.tryAttack("wisdom_missle");
          } else if (activeWeapon === "faith_cannon" && this.magicCooldown <= 0) {
            this.tryAttack("faith_cannon");
          } else if (activeWeapon === "fire" && this.magicCooldown <= 0) {
            this.tryAttack("fire");
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

  isAttacking() {
    return (
      this.state === "attackArrow" ||
      this.state === "attackMagic" ||
      this.state === "attackPrayer"
    );
  }

  getActiveWeaponMode() {
    return this.overrideWeaponMode || this.weaponMode;
  }

  tryAttack(type) {
  if (this.state === "hurt" || this.state === "death") return;
  const meleeAttackState = window._meleeAttackState;
  if (meleeAttackState?.projectileBlockTimer > 0) return;
  // Prevent firing projectiles when melee circle is active
  if (window.Input && window.Input.nesAButtonActive) return;
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
      });
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

    if (type === "heart") {
      if (this.heartCooldown > 0) return;
      const direction = this.getAimDirection();
      const originOffset = this.radius * 0.55;
      const originX = this.x + direction.x * originOffset;
      const originY = this.y + direction.y * originOffset;
      spawnProjectile("heart", originX, originY, direction.x, direction.y, {
        damage: 0,
        life: Number.isFinite(PROJECTILE_CONFIG.heart?.life)
          ? PROJECTILE_CONFIG.heart.life * bossRangeMultiplier
          : undefined,
        source: this,
      });
      const playArrowSfx =
        typeof window !== "undefined" ? window.playDefaultArrowSfx : null;
      if (typeof playArrowSfx === "function") {
        playArrowSfx(0.55);
      }
      this.state = "attackArrow";
      this.animator.play("attackArrow", { restart: true });
      this.heartCooldown = this.config.arrowCooldown * 0.8;
      return;
    }

    if (type === "coin") {
      if (this.arrowCooldown > 0) return;
      // Coins follow player's current aim; do not auto-target NPCs.
      let direction = this.getAimDirection();
      const originOffset = this.radius * 0.55;
      const originX = this.x + direction.x * originOffset;
      const originY = this.y + direction.y * originOffset;
      const projectile = spawnProjectile("coin", originX, originY, direction.x, direction.y, {
        frameDuration: COIN_FRAME_DURATION,
        life: Number.isFinite(PROJECTILE_CONFIG.coin?.life)
          ? PROJECTILE_CONFIG.coin.life * bossRangeMultiplier
          : undefined,
        source: this,
      });
      if (!projectile) return;
      this.state = "attackArrow";
      this.animator.play("attackArrow", { restart: true });
      this.arrowCooldown = COIN_COOLDOWN;
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
    this.prayerCharge = 0;
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

  isArrowExtendProjectileBuffActive() {
    return (
      this.powerExtendTimer > 0 &&
      this.getActiveWeaponMode() === "arrow"
    );
  }

  getArrowDamage() {
    const projectileBonus = getPlayerStatMultiplier("projectile_attack_damage");
    const extendBonus = this.isArrowExtendProjectileBuffActive() ? 1.5 : 1;
    return (
      PROJECTILE_CONFIG.arrow.damage *
      this.arrowDamageMultiplier *
      extendBonus *
      projectileBonus
    );
  }

  getWisdomMissleDamage() {
    const projectileBonus = getPlayerStatMultiplier("projectile_attack_damage");
    return PROJECTILE_CONFIG.wisdom_missle.damage * projectileBonus;
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
    const projectileBonus = getPlayerStatMultiplier("projectile_attack_damage");
    return (
      PROJECTILE_CONFIG.faith_cannon.damage *
      this.faithCannonDamageMultiplier *
      projectileBonus
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
    const projectileBonus = getPlayerStatMultiplier("projectile_attack_damage");
    return PROJECTILE_CONFIG.fire.damage * this.fireDamageMultiplier * projectileBonus;
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
    const statSpeed = getPlayerStatMultiplier("speed");
    multiplier *= statSpeed;
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
    const resistanceBonus = getPlayerStatValue("damage_resistance");
    const reductionFactor = 1 - Math.min(0.8, (this.armorReduction || 0) + resistanceBonus);
    const appliedDamage = Math.max(1, Math.round(baseDamage * reductionFactor));
    showDamage(this, appliedDamage, {
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
  this.animator.draw(ctx, this.x, drawY, { flipX: flip, alpha: flicker, flashWhite: flashStrength });
    if (this.shieldTimer > 0) {
      const shieldAlpha = Math.max(0.2, Math.min(0.6, this.shieldTimer / 6));
      const clip = this.animator?.currentClip || null;
      const animatorScale = Number.isFinite(this.animator?.scale) && this.animator.scale > 0
        ? this.animator.scale
        : 1;
      const clipRenderScale =
        clip && Number.isFinite(clip.renderScale) && clip.renderScale > 0 ? clip.renderScale : 1;
      const frameScale = animatorScale * clipRenderScale;
      const frameSize = clip ? Math.max(clip.frameWidth || 0, clip.frameHeight || 0) : 0;
      const visualRadius = Math.max(this.radius * 1.6, frameSize * frameScale * 0.48);
      const lineWidth = Math.max(3, Math.round(3.5 * (settings.WORLD_SCALE || 1)));
      ctx.save();
      ctx.strokeStyle = `rgba(180, 240, 255, ${shieldAlpha})`;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.arc(this.x, this.y, visualRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
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
      this.animator = new Animator(clips, this.config.scale);
      this.state = "walk";
      this.animator.play("walk");
      this.facing = "down";
      this.attackTimer = 0;
      this.dead = false;
      this.scoreGranted = false;
      this.radius = this.config.hitRadius;
      this.displayName = this.config.displayName || this.type;
      this.preferredTarget = this.config.preferredTarget || "player";
      this.touchCooldown = 0;
      this.isRanged = Boolean(this.config.ranged);
      this.preferEdges = Boolean(this.config.preferEdges);
      this.targetClosestAny =
        Array.isArray(this.config.specialBehavior) &&
        this.config.specialBehavior.includes("closestAny");
      this.projectileType = this.config.projectileType || null;
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
    }

    update(dt) {
      // spawnDelay removed; enemies act immediately after spawning
      this.damageFlashTimer = Math.max(0, this.damageFlashTimer - dt);

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
      if (this.state === "hurt") {
        this.animator.update(dt);
        if (this.animator.isFinished()) {
          this.state = "walk";
          this.animator.play("walk");
        }
        return;
      }

      this.shieldHitCooldown = Math.max(0, (this.shieldHitCooldown || 0) - dt);
      this.tauntCooldown = Math.max(0, (this.tauntCooldown || 0) - dt);

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

      this.attackTimer = Math.max(0, this.attackTimer - dt);

      if (this.state === "attack") {
        if (this._attackLock && this._attackLock.target) {
          const t = this._attackLock.target;
          if (!t || t.departed || (typeof t.active !== "undefined" && !t.active)) {
            this._attackLock = null;
          } else {
            this.x = t.x + (this._attackLock.offsetX || 0);
            this.y = t.y + (this._attackLock.offsetY || 0);
          }
        }
        this.animator.update(dt);
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
          if (!this.isRanged && distance <= attackThreshold) {
            if (targetIsPlayer) {
              if (player.shieldTimer > 0) {
                applyShieldImpact(this);
              } else {
                player.takeDamage(this.config.damage);
              }
            } else if (typeof target.sufferAttack === "function") {
              const npcTarget = target;
              const targetStillValid =
                npcTarget && !npcTarget.departed && (typeof npcTarget.active === "undefined" || npcTarget.active);
              const hasFaith = !(typeof npcTarget.faith === "number" && npcTarget.faith <= 0);
              if (targetStillValid && hasFaith) {
                try {
                  console.debug &&
                    console.debug("Enemy dealing damage to NPC", { enemy: this.type, damage: this.config.damage });
                } catch (e) {}
                target.sufferAttack(this.config.damage);
              } else {
                this._attackLock = null;
              }
            }
          }
          this.attackTimer = this.isRanged ? this.projectileCooldown : this.config.attackCooldown;
          this.state = "walk";
          this.animator.play("walk");
        }
        return;
      }

      if (this.isRanged) {
        this.updateRangedBehavior(dt, dx, dy, distance, targetRadius);
        this.animator.update(dt);
        return;
      }

      if (distance <= this.config.attackRange + targetRadius * 0.2 && this.attackTimer <= 0) {
        this.state = "attack";
        this.animator.play("attack", { restart: true });
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
      this.x += moveDir.x * this.config.speed * dt;
      this.y += moveDir.y * this.config.speed * dt;
      this.updateFacing(moveDir.x, moveDir.y);
      this.animator.update(dt);
    }

    acquireTarget() {
      let bestTarget = null;
      let bestDistSq = Infinity;
      const behaviors = Array.isArray(this.config?.specialBehavior) ? this.config.specialBehavior : [];
      const npcPriority = behaviors.includes("npcPriority");
      const targetClosestAny = behaviors.includes("closestAny") || this.targetClosestAny;
      const preferNpc = this.preferredTarget === "npc";

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
      const margin = 120;
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

    fireRangedProjectile(dx, dy) {
      if (!this.projectileType) return;
      if (typeof normalizeVector !== "function" || typeof spawnProjectile !== "function") return;
      const dir = normalizeVector(dx, dy);
      const offset = this.radius * 0.6;
      const originX = this.x + dir.x * offset;
      const originY = this.y + dir.y * offset;
      const projectileConfig = typeof PROJECTILE_CONFIG === "object" && PROJECTILE_CONFIG !== null
        ? PROJECTILE_CONFIG
        : {};
      const baseConfig = projectileConfig[this.projectileType] || {};
      const spawnOverrides = {
        friendly: false,
        damage: Math.max(1, this.config.damage || baseConfig.damage || 1),
        speed: (baseConfig.speed || 520) * 0.9,
        radius: baseConfig.radius || 20,
        source: this,
      };
      if (this.projectileType === "miniFireball") {
        try {
          this._miniFireAlt = !this._miniFireAlt;
          const clip = assets?.projectiles?.miniFireball;
          if (clip && clip.image && clip.frameWidth > 0 && clip.frameHeight > 0) {
            const cols = Math.max(1, Math.floor(clip.image.width / clip.frameWidth));
            const rows = Math.max(1, Math.floor(clip.image.height / clip.frameHeight));
            const rowToUse = this._miniFireAlt ? 1 : 0;
            const frames = [];
            for (let c = 0; c < cols; c += 1) {
              const idx = rowToUse * cols + c;
              frames.push(projectileFrames.miniFireball ? projectileFrames.miniFireball[idx] : null);
            }
            const filtered = frames.filter(Boolean);
            if (filtered.length) {
              spawnOverrides.frames = filtered;
              spawnOverrides.frameDuration = 0.06;
              spawnOverrides.loopFrames = true;
              spawnOverrides.flipHorizontal = dir.x < 0;
            } else {
              console.debug &&
                console.debug("miniFireball per-row frames empty, falling back to clip", {
                  type: this.type,
                  src: clip?.image?.src,
                });
            }
          }
        } catch (e) {}
      } else if (this.projectileType === "miniTrident") {
        const frames = projectileFrames.miniTrident ||
          (typeof getFramesForClip === "function" ? getFramesForClip(assets?.projectiles?.miniTrident) : null);
        if (frames && frames.length) {
          spawnOverrides.frames = frames;
          spawnOverrides.frameDuration = 0.08;
          spawnOverrides.loopFrames = false;
          spawnOverrides.flipHorizontal = false;
        }
        spawnOverrides.speed = baseConfig.speed || spawnOverrides.speed;
        spawnOverrides.radius = baseConfig.radius || spawnOverrides.radius;
        spawnOverrides.scale = baseConfig.scale || spawnOverrides.scale;
      }
      const projectile = spawnProjectile(this.projectileType, originX, originY, dir.x, dir.y, spawnOverrides);
      if (projectile) {
        projectile.hitEntities.add(this);
        this.state = "attack";
        this.animator.play("attack", { restart: true });
        this.attackTimer = this.projectileCooldown;
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

    updateRangedBehavior(dt, dx, dy, distance, targetRadius = 0) {
      const desiredRange = this.desiredRange;
      const rangeBuffer = Math.max(0, targetRadius * 0.5);
      const minDistance = desiredRange * 0.55 + rangeBuffer;
      const maxDistance = desiredRange * 1.25 + rangeBuffer;
      let moveX = 0;
      let moveY = 0;

      if (this.preferEdges) {
        if (!this.edgeTarget || Math.random() < 0.002) {
          this.edgeTarget = this.chooseEdgePosition();
        }
        const edgeDx = this.edgeTarget.x - this.x;
        const edgeDy = this.edgeTarget.y - this.y;
        const edgeDist = Math.hypot(edgeDx, edgeDy);
        if (edgeDist > 48) {
          moveX += edgeDx / edgeDist;
          moveY += edgeDy / edgeDist;
        }
      }

      if (distance < minDistance && distance > 1) {
        moveX -= dx / distance;
        moveY -= dy / distance;
      } else if (distance > maxDistance) {
        moveX += dx / distance;
        moveY += dy / distance;
      }

      if (moveX !== 0 || moveY !== 0) {
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
        if (this.state !== "idle") {
          this.state = "idle";
          this.animator.play("idle");
        }
      }

      if (this.attackTimer <= 0 && distance <= desiredRange * 1.1 + rangeBuffer) {
        this.fireRangedProjectile(dx, dy);
      }
    }

    takeDamage(amount, options = {}) {
      if (this.state === "death") return;
      this.health -= amount;
      const damageText = options?.damageText || null;
      if (typeof showDamage === "function") {
        showDamage(this, amount, {
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
      this.damageFlashTimer = DAMAGE_FLASH_DURATION;
      if (this.health <= 0) {
        this.health = 0;
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
        }
      } else {
        this.state = "hurt";
        this.animator.play("hurt", { restart: true });
      }
    }

    draw() {
      const flip = this.facing === "left";
      const drawY = this._renderYOverride !== undefined ? this._renderYOverride : this.y;
      if (!ctx) return;
      const flashStrength =
        this.damageFlashTimer > 0
          ? Math.min(1, Math.pow(this.damageFlashTimer / DAMAGE_FLASH_DURATION, 0.6))
          : 0;
      const drawOptions = { flipX: flip, flashWhite: flashStrength };
      const tintColor = this.config?.tintColor;
      if (tintColor) {
        drawOptions.tintColor = tintColor;
        if (typeof this.config?.tintIntensity === "number") {
          drawOptions.tintIntensity = this.config.tintIntensity;
        }
      }
      this.animator.draw(ctx, this.x, drawY, drawOptions);
      const alwaysShow =
        typeof devTools !== "undefined" && Boolean(devTools.alwaysShowEnemyHP);
      const forceShow = Boolean(this.forceShowHpBar);
      const isBossLike =
        typeof this.type === "string" && this.type.toLowerCase().includes("boss");
      if (this.state !== "death" && (alwaysShow || forceShow || isBossLike)) {
        this.drawHealthBars();
      }
      if (this.state !== "death") {
        const hitRadius = this.config?.hitRadius || 0;
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
          ctx.fillText(info, this.x - 28, this.y - (this.config?.hitRadius || 20) - 40);
          ctx.strokeStyle = "rgba(255,255,255,0.12)";
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        } catch (e) {}
      }
    }

    drawHealthBars() {
      const baseWidth = Math.min(110, Math.max(48, this.config.hitRadius * 1.4));
      const rowHeight = 6;
      const gap = 2;
      const baseY = this.y - this.config.hitRadius - 10;
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
