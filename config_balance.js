/**
 * game_balance.js
 * ===============
 * Centralized game balance and tuning values for Battlechurch.
 *
 * FOR GAME DESIGNERS:
 * - Tweak combat feel, difficulty, and progression here
 * - Values are organized by system (combat, spawning, player, etc.)
 * - Changes take effect on game reload
 *
 * FOR DEVELOPERS:
 * - Access via window.GameBalance.* (e.g., GameBalance.combat.meleeDamage)
 * - All values have fallbacks in game.js for safety
 */
(function(global) {
  const GameBalance = {
    // =====================
    // MELEE COMBAT
    // =====================
    melee: {
      baseDamage: 100,
      cooldown: 0.4,
      swingRange: 104,        // pixels (before world scale)
      closeRange: 60,
      knockback: 48,
      pushbackStrength: 36,
      damageDuration: 0.25,
      swingDuration: 0.2,
      doubleTapWindow: 0.18,
      holdChargeTime: 1.5,
      swooshDamageScale: 1.2,
      swooshExitInvulnerability: 0.2,
      swooshArcScale: 2.5,
      projectileCooldownAfter: 0.5,
      rushLockout: 1.0,

      // Spin attack
      spinDuration: 0.45,
      spinCooldown: 2.0,
      spinDamageMultiplier: 2,
    },

    // =====================
    // RUSH ATTACK
    // =====================
    rush: {
      distance: 150,          // pixels (before world scale)
      speed: 1200,            // pixels per second (before speed scale)
      radius: 50,
      pushbackRadius: 52,
      pushbackStrength: 50,
      cooldown: 3.0,
      dustSpacing: 26,
      exitInvulnerability: 0.2,
      damage: 200,            // MELEE_BASE_DAMAGE * 2
    },

    // =====================
    // DASH
    // =====================
    dash: {
      distance: 400,
      speed: 1400,
      dustSpacing: 20,
      cooldown: 2.0,
      comboGrace: 0.12,
    },

    // =====================
    // DIVINE SHOT (Ranged Attack)
    // =====================
    divineShot: {
      damage: 100,
      speed: 920,
      life: 2.8,
      autoAimDuration: 1.6,
      autoAimStrength: 3.2,
      autoAimMinDot: 0.25,
    },

    // =====================
    // PRAYER BOMB
    // =====================
    prayerBomb: {
      radius: 520,
      damageMultiplier: 12.0,
      chargeRequired: 60,
      chargePerKill: 0.5,
      holdTime: 1.0,

      // Thresholds (0-1 ratio) — aligned to 6-section meter (1/6 per section)
      level1Threshold: 2 / 6,   // 2 bars: minimum to fire prayer bomb
      level2Threshold: 4 / 6,   // 4 bars: level 2 prayer bomb
      level3Threshold: 1.0,     // 6 bars: full charge

      // Damage per level
      level1Damage: 250,
      level2Damage: 400,
      level3Damage: 250,

      // Boss-specific damage
      level1BossDamage: 1000,
      level2BossDamage: 2000,
      bossDamageScale: 0.5,

      // Rain effect
      rainDuration: 7,
      rainInterval: 0.12,
      rainRadius: 160,
      screenDarkenAlpha: 0.38,
      rainDarkenDuration: 0.5,
      rainShakeDuration: 0.12,
      rainShakeMagnitude: 10,
    },

    // =====================
    // SHIELD
    // =====================
    shield: {
      smallDamage: 999,       // Instant kill small enemies
      largeDamage: 220,
      largeCooldown: 0.25,
      largeRadiusThreshold: 42,
    },

    // =====================
    // PLAYER STATS
    // =====================
    player: {
      maxHealth: 100,
      baseHearts: 6,
      baseScale: 1.08,
      collisionRadius: 12,
      arrowDamage: 10,

      // Respawn
      respawnDelay: 2.5,
      respawnStatusInterval: 0.5,
      respawnShieldDuration: 6,
    },

    // =====================
    // NPC/CONGREGATION
    // =====================
    npc: {
      maxFaith: 100,
      faithDrainRate: 14,
      faithRecoveryPerCoin: 22,
      startingFaithRatio: 1.0,
      faithPerEnemyKill: 0,
      maxFaithLossPerAttack: 25,
      damageCooldown: 1.5,

      // NPC combat
      arrowDamage: 10,
      arrowCooldown: 0.8,
      arrowRange: 520,

      // Congregation
      memberRadius: 26,
      memberCount: 50,
      processionSpeedMultiplier: 3.5,
      processionEntryMargin: 220,

      // Harmony buff
      harmonyBuffMultiplier: 2.25,
    },

    // =====================
    // ENEMY SPAWNING
    // =====================
    spawning: {
      maxActiveEnemies: 500,
      skeletonMinCount: 4,
      skeletonPackSize: 4,
      miniImpBaseGroupSize: 48,
      miniImpMaxGroupSize: 120,
      miniImpMinGroupsPerHorde: 1,
      groupSpawnStaggerMs: 80,
      spawnMargin: 140,
      spawnJitter: 26,
    },

    // =====================
    // GRACE PICKUPS
    // =====================
    grace: {
      pickupRadius: 18,
      lifetime: 15,
      attractDistance: 170,
      attractForce: 460,
      gravity: 520,
      airDrag: 0.88,

      // Drop chances
      dropBaseChance: 0.18,
      dropHighValueBonus: 0.12,
      dropMinionScale: 0.35,
      dropMaxStack: 3,
      dropSizeChanceFactor: 0.15,
      dropSizeStackFactor: 0.9,

      // Grace rush
      rushDuration: 5,
      bonusMultiplier: 5,
    },

    // =====================
    // POWERUPS
    // =====================
    powerups: {
      respawnDelay: 5,
      activeLifetime: 8,
      blinkDuration: 2,
      spawnBlinkDuration: 1.2,
      playfieldMargin: 140,
    },

    // =====================
    // VISITOR MINIGAME
    // =====================
    visitor: {
      guestCount: 10,
      sessionDuration: 30,
      guestMaxFaith: 10,
      blockerHitsRequired: 5,
      heartFaithPerHit: 1,
    },

    // =====================
    // COMBAT FEEL
    // =====================
    combatFeel: {
      comboWindowMs: 350,
      hitFreezeDuration: 0.08,
      cameraShakeDuration: 0.3,
      cameraShakeIntensity: 18,
      wisdomHitShakeDuration: 0.15,
      faithHitShakeDuration: 0.15,
      damageFlashDuration: 0.6,
      damageFlashIntensity: 1.35,
      damageHitFlashDuration: 0.08,
    },

    // =====================
    // SPECIAL ENEMIES
    // =====================
    specialEnemies: {
      // Bat scatter
      batSpawnCount: 10,
      batScatterDuration: 0.35,
      batScatterSpeedMultiplier: 2.0,

      // Tormentor flames
      tormentorFlameMax: 3,
      tormentorFlameRespawnInterval: 7.0,
      tormentorFlameOrbitSpeed: 2.6,
      tormentorFlameOrbitScaleMin: 0.9,
      tormentorFlameOrbitScaleMax: 1.08,
    },

    // =====================
    // TIMING/PACING
    // =====================
    timing: {
      postDeathHang: 5,
      arenaFadeDuration: 2,
      actBreakFadeIn: 0.8,
      actBreakFadeOut: 0.8,
      actBreakHoldSeconds: 2,
      playerDeathFadeTarget: 0.5,
      playerDeathFadeSpeed: 6,
      townIntroZoomDuration: 1.0,
      townIntroFadeDuration: 2.0,
    },
  };

  // Export to global namespace
  global.GameBalance = GameBalance;

})(typeof window !== "undefined" ? window : globalThis);
