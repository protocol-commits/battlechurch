class Enemy {
  constructor(type, config, clips, x, y) {
    this.type = type;
    const baseConfig = config || {};
    const scaledHealth = scaleEnemyHealth(baseConfig.health);
    const scaledMaxHealth = scaleEnemyHealth(
      typeof baseConfig.maxHealth === "number" && baseConfig.maxHealth > 0 ? baseConfig.maxHealth : baseConfig.health
    );
    this.config = { ...baseConfig, health: scaledHealth, maxHealth: scaledMaxHealth };
    this.x = x;
    this.y = y;
    this.maxHealth = this.config.maxHealth || scaledHealth;
    this.health = this.config.health || scaledHealth;
    this.animator = new Animator(clips, this.config.scale);
    this.state = "walk";
    this.animator.play("walk");
    this.facing = "down";
    this.attackTimer = 0;
    this.dead = false;
    this.scoreGranted = false;
    this.radius = this.config.hitRadius;
    this.displayName = this.config.displayName || this.type;
    this.touchCooldown = 0;
    this.isRanged = Boolean(this.config.ranged);
    this.preferEdges = Boolean(this.config.preferEdges);
    this.projectileType = this.config.projectileType || null;
    this.projectileCooldown = this.config.projectileCooldown || this.config.attackCooldown || 1.5;
    this.desiredRange = this.config.desiredRange || this.config.attackRange || 300;
    this.edgeTarget = this.preferEdges ? this.chooseEdgePosition() : null;
    this.shieldHitCooldown = 0;
    this.huntsNpcs = shouldEnemyHuntNpcs(type, this.config);
    this.safeTopMargin = Math.max(this.radius * 3.5, 100);
    this.spawnDelay = ENEMY_SPAWN_PUFF_DURATION;
  }

  update(dt) {
    if (this.spawnDelay > 0) {
      this.spawnDelay = Math.max(0, this.spawnDelay - dt);
      this.animator.update(dt);
      return;
    }

    if (this.state === "death") {
      this.animator.update(dt);
      // decrement deathTimer if present
      if (typeof this.deathTimer === 'number') {
        this.deathTimer -= dt;
        if (this.deathTimer <= 0 && !this.animator.isFinished()) {
          // force finish
          console.debug && console.debug('Enemy death timeout forcing finish', { type: this.type, x: this.x, y: this.y });
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
      // If we began an attack and have an attack lock, glue to the target's position
      if (this._attackLock && this._attackLock.target) {
        const t = this._attackLock.target;
        if (!t || t.departed || (typeof t.active !== 'undefined' && !t.active)) {
          // target became invalid during attack; clear lock and fall through
          this._attackLock = null;
        } else {
          // direct snap to maintain contact during attack animation
          this.x = t.x + (this._attackLock.offsetX || 0);
          this.y = t.y + (this._attackLock.offsetY || 0);
        }
      }
      this.animator.update(dt);
      if (this.animator.isFinished()) {
  // Use the same threshold logic as the attack initiation check so an attack
  // that began will be able to land when the animation finishes.
  const baseAttackRange = (this.config && (this.config.attackRange || this.config.desiredRange)) || this.desiredRange || this.radius;
  const attackThreshold = baseAttackRange + targetRadius * 0.2;
        // Debug: report attack attempt conditions
        if (typeof console !== 'undefined' && console.debug) {
          console.debug && console.debug('Enemy attack resolution', {
            type: this.type,
            targetType: targetIsPlayer ? 'player' : target.type || 'npc',
            distance,
            radius: this.radius,
            targetRadius,
            attackThreshold,
            isRanged: this.isRanged,
            attackTimer: this.attackTimer,
            targetActive: target && typeof target.active !== 'undefined' ? target.active : undefined,
            targetDeparted: target && typeof target.departed !== 'undefined' ? target.departed : undefined,
            damage: this.config && this.config.damage,
          });
        }
        if (!this.isRanged && distance <= attackThreshold) {
          if (targetIsPlayer) {
            if (player.shieldTimer > 0) {
              applyShieldImpact(this);
            } else {
              player.takeDamage(this.config.damage);
            }
          } else if (typeof target.sufferAttack === "function") {
            // Before dealing damage, ensure the NPC target is still valid and has faith
            const npcTarget = target;
            const targetStillValid = npcTarget && !npcTarget.departed && (typeof npcTarget.active === 'undefined' || npcTarget.active);
            const hasFaith = !(typeof npcTarget.faith === 'number' && npcTarget.faith <= 0);
            if (targetStillValid && hasFaith) {
              // log before calling sufferAttack
              console.debug && console.debug('Enemy dealing damage to NPC', { enemy: this.type, damage: this.config.damage });
              if (this.type === "miniGhost" && typeof npcTarget.markMiniGhostAttack === "function") {
                npcTarget.markMiniGhostAttack();
              }
              target.sufferAttack(this.config.damage);
            } else {
              // target invalid or faith drained; clear any attack lock so minighost will re-acquire
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
      // If we're a miniGhost attacking an NPC, lock our position relative to that NPC
      if (this.type === 'miniGhost' && !targetIsPlayer && target) {
        try {
          this._attackLock = {
            target: target,
            offsetX: this.x - target.x,
            offsetY: this.y - target.y,
          };
        } catch (e) {
          this._attackLock = null;
        }
      }
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
    // Default behavior: consider player first, then NPCs
    if (player && player.state !== "death") {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      bestTarget = player;
      bestDistSq = dx * dx + dy * dy;
    }

    if (this.huntsNpcs) {
      for (const npc of npcs) {
        // Skip invalid, departed, inactive, or faith-drained NPCs
        if (!npc || npc.departed || !npc.active) continue;
        if (typeof npc.faith === 'number' && npc.faith <= 0) continue;
        const dx = npc.x - this.x;
        const dy = npc.y - this.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < bestDistSq) {
          bestDistSq = distSq;
          bestTarget = npc;
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
    const minY = HUD_HEIGHT + margin;
    const maxY = Math.max(minY, canvas.height - margin);
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
    const dir = normalizeVector(dx, dy);
    const offset = this.radius * 0.6;
    const originX = this.x + dir.x * offset;
    const originY = this.y + dir.y * offset;
  const baseConfig = PROJECTILE_CONFIG[this.projectileType] || {};
  const spawnOverrides = {
    friendly: false,
      damage: Math.max(1, this.config.damage || baseConfig.damage || 1),
      speed: (baseConfig.speed || 520) * 0.9,
      radius: baseConfig.radius || 20,
      source: this,
    };
    // Special-case miniFireball: alternate between row 0 and row 1 animations
    if (this.projectileType === 'miniFireball') {
      try {
        // toggle per-instance flag
        this._miniFireAlt = !this._miniFireAlt;
        const clip = assets.projectiles?.miniFireball;
        if (clip && clip.image && clip.frameWidth > 0 && clip.frameHeight > 0) {
          const cols = Math.max(1, Math.floor(clip.image.width / clip.frameWidth));
          const rows = Math.max(1, Math.floor(clip.image.height / clip.frameHeight));
          const rowCount = Math.max(1, rows);
          const rowToUse = this._miniFireAlt ? 1 : 0;
          const frames = [];
          for (let c = 0; c < cols; c += 1) {
            const idx = rowToUse * cols + c;
            frames.push(projectileFrames.miniFireball ? projectileFrames.miniFireball[idx] : null);
          }
          // remove any nulls (safety)
          const filtered = frames.filter(Boolean);
          if (filtered.length) {
    spawnOverrides.frames = filtered;
    spawnOverrides.frameDuration = 0.06;
    spawnOverrides.loopFrames = true;
    spawnOverrides.flipHorizontal = dir.x < 0;
          } else {
            // fallback: do not override frames so spawnProjectile uses clip/animator
            console.debug && console.debug('miniFireball per-row frames empty, falling back to clip', { type: this.type, src: clip?.image?.src });
          }
        }
      } catch (e) {
        // ignore and fall back to default spawn
      }
    }
    const projectile = spawnProjectile(this.projectileType, originX, originY, dir.x, dir.y, spawnOverrides);
    if (projectile) {
      projectile.hitEntities.add(this);
      this.state = "attack";
      this.animator.play("attack", { restart: true });
      this.attackTimer = this.projectileCooldown;
    }
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
      resolveEntityObstacles(this);
      clampEntityToBounds(this);
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

  takeDamage(amount) {
    if (this.state === "death") return;
    this.health -= amount;
    showDamage(this, amount, { color: "#ff8181" });
      if (this.health <= 0) {
      this.health = 0;
      if (this.type === "skeleton") {
        spawnImpactEffect(this.x, this.y - this.config.hitRadius / 2);
      }
      // Guard: avoid re-entering death if already set elsewhere
      if (this.state !== 'death') {
        this.state = "death";
        this.animator.play("death", { restart: true, loop: false });
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
        // compute a fallback death timer from clip info so we can force finish
        try {
          const clip = this.animator.currentClip || {};
          // Prefer the developer-picked frameMap length when available; otherwise fall back to frameCount
          const framesFromMap = Array.isArray(clip.frameMap) && clip.frameMap.length ? clip.frameMap.length : null;
          const frames = framesFromMap || (clip.frameCount || 0) || 8;
          const rate = clip && clip.frameRate ? clip.frameRate : 8;
          const expected = Math.max(0.05, frames / Math.max(0.0001, rate));
          // small margin
          this.deathTimer = expected + 0.25;
          console.debug && console.debug('Enemy death initiated', { type: this.type, frames, rate, expected, deathTimer: this.deathTimer });
        } catch (e) {}
      }
      if (levelManager) levelManager.notifyEnemyDefeated();
    } else {
      this.state = "hurt";
      this.animator.play("hurt", { restart: true });
    }
  }

  draw() {
    const flip = this.facing === "left";
  const drawY = (this._renderYOverride !== undefined) ? this._renderYOverride : this.y;
  this.animator.draw(ctx, this.x, drawY, { flipX: flip });
    const alwaysShow = (typeof devTools !== 'undefined' && devTools.alwaysShowEnemyHP);
    const isBossLike =
      typeof this.type === "string" && this.type.toLowerCase().includes("boss");
    const forceShow = Boolean(this.forceShowHpBar);
    const shouldRenderHp =
      this.state !== "death" && (alwaysShow || isBossLike || forceShow);

    if (shouldRenderHp) {
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
        const color =
          HEALTH_BAR_COLORS[row] || HEALTH_BAR_COLORS[HEALTH_BAR_COLORS.length - 1];
        ctx.fillStyle = color;
        ctx.fillRect(barX + 1, barY + 1, (baseWidth - 2) * ratio, rowHeight - 2);
      }
      ctx.restore();
    }
    // Dev overlay: show combat debug info when enabled
    if (devTools.showCombatDebug) {
      try {
        ctx.save();
        ctx.fillStyle = "#fff";
        ctx.font = "12px Arial";
        const info = `hp:${Math.round(this.health||0)}/${Math.round(this.maxHealth||0)} dmg:${this.config?.damage||0}`;
        ctx.fillText(info, this.x - 28, this.y - (this.config?.hitRadius || 20) - 40);
        // optionally draw radius circle
        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } catch (e) {}
    }
  }
}
