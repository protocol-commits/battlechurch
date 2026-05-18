/* Visual effects manager for Battlechurch */
(function setupEffectsModule(window) {
  if (!window) return;

  const activeEffects = [];

  let ctxResolver = () => (typeof window.ctx !== "undefined" ? window.ctx : null);
  let assetsResolver = () =>
    (typeof window.assets !== "undefined" ? window.assets : null);

  function resolveContext() {
    try {
      return ctxResolver ? ctxResolver() : null;
    } catch (error) {
      console.warn("Effects.resolveContext: failed to resolve context", error);
      return null;
    }
  }

  function resolveAssets() {
    try {
      return assetsResolver ? assetsResolver() : null;
    } catch (error) {
      console.warn("Effects.resolveAssets: failed to resolve assets", error);
      return null;
    }
  }

  class Effect {
    constructor(frames, x, y, { frameDuration = 0.05, scale = 2, scaleX = 1, scaleY = 1, loop = false, tintColor = null, tintAlpha = 0.65, rotation = 0, flipY = false, delay = 0 } = {}) {
      this.frames = Array.isArray(frames) ? frames : [];
      this.x = x;
      this.y = y;
      this.scale = scale;
      this.scaleX = Number.isFinite(scaleX) ? scaleX : 1;
      this.scaleY = Number.isFinite(scaleY) ? scaleY : 1;
      this.frameDuration = frameDuration;
      this.timer = 0;
      this.frameIndex = 0;
      this.dead = false;
      this.loop = Boolean(loop);
      this.tintColor = tintColor;
      this.tintAlpha = Math.max(0, Math.min(1, tintAlpha));
      this.tintedFrames = null;
      this.rotation = rotation || 0;
      this.flipY = Boolean(flipY);
      this.delay = Math.max(0, delay || 0);
    }

    getFrame(frameIndex) {
      const frame = this.frames[frameIndex];
      if (!frame) return null;
      if (!this.tintColor) return frame;
      if (!this.tintedFrames) this.tintedFrames = [];
      if (this.tintedFrames[frameIndex]) return this.tintedFrames[frameIndex];
      const canvas = document.createElement("canvas");
      canvas.width = frame.width;
      canvas.height = frame.height;
      const frameCtx = canvas.getContext("2d");
      if (!frameCtx) return frame;
      frameCtx.drawImage(frame, 0, 0);
      frameCtx.globalCompositeOperation = "source-atop";
      frameCtx.globalAlpha = this.tintAlpha;
      frameCtx.fillStyle = this.tintColor;
      frameCtx.fillRect(0, 0, canvas.width, canvas.height);
      this.tintedFrames[frameIndex] = canvas;
      return canvas;
    }

    update(dt) {
      if (this.dead) return;
      if (this.delay > 0) { this.delay -= dt; return; }
      this.timer += dt;
      if (this.timer >= this.frameDuration) {
        this.timer -= this.frameDuration;
        this.frameIndex += 1;
        if (this.frameIndex >= this.frames.length) {
          if (this.loop && this.frames.length > 0) {
            this.frameIndex = 0;
          } else {
            this.dead = true;
            this.frameIndex = Math.max(0, this.frames.length - 1);
          }
        }
      }
    }

    draw() {
      if (this.dead || this.delay > 0) return;
      const frame = this.getFrame(this.frameIndex);
      if (!frame) return;
      const ctx = resolveContext();
      if (!ctx) return;
      const width = frame.width * this.scale * this.scaleX;
      const height = frame.height * this.scale * this.scaleY;
      ctx.save();
      ctx.translate(this.x, this.y);
      if (this.rotation) ctx.rotate(this.rotation);
      if (this.flipY) ctx.scale(1, -1);
      ctx.drawImage(frame, -width / 2, -height / 2, width, height);
      ctx.restore();
    }
  }

  class DebugCircle {
    constructor(x, y, radius, duration = 0.2) {
      this.x = x;
      this.y = y;
      this.radius = radius;
      this.duration = duration;
      this.timer = duration;
      this.dead = false;
    }

    update(dt) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.dead = true;
      }
    }

    draw() {
      if (this.dead) return;
      const ctx = resolveContext();
      if (!ctx) return;
      const alpha = Math.max(0, this.timer / this.duration) * 0.25;
      ctx.save();
      ctx.strokeStyle = `rgba(155, 220, 255, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 6]);
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  class PrayerBombGlow {
    constructor(x, y, radius, duration = 0.2) {
      this.x = x;
      this.y = y;
      this.radius = radius;
      this.duration = duration;
      this.timer = duration;
      this.dead = false;
    }

    update(dt) {
      this.timer -= dt;
      if (this.timer <= 0) this.dead = true;
    }

    draw() {
      if (this.dead) return;
      const ctx = resolveContext();
      if (!ctx) return;
      const progress = Math.max(0, this.timer / this.duration);
      const outerRadius = this.radius * (1.1 + (1 - progress) * 0.4);
      const innerRadius = this.radius * 0.65;
      ctx.save();
      const gradient = ctx.createRadialGradient(
        this.x,
        this.y,
        innerRadius,
        this.x,
        this.y,
        outerRadius,
      );
      gradient.addColorStop(0, `rgba(255, 255, 255, ${0.25 * progress})`);
      gradient.addColorStop(0.35, `rgba(170, 210, 255, ${0.2 * progress})`);
      gradient.addColorStop(1, "rgba(20, 40, 80, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(this.x, this.y, outerRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function add(effect) {
    if (!effect) return null;
    activeEffects.push(effect);
    return effect;
  }

  function spawnEffectFromFrames(frames, x, y, options) {
    if (!frames || !frames.length) return null;
    return add(new Effect(frames, x, y, options));
  }

  function spawnImpactEffect(x, y) {
    spawnPuffEffect(x, y);
  }

  function spawnFlashEffect(x, y, options = {}) {
    const frames = resolveAssets()?.effects?.flash;
    const tintColor = typeof options?.tintColor === "string" ? options.tintColor : null;
    const tintAlpha = Number.isFinite(options?.tintAlpha) ? options.tintAlpha : 0.65;
    const scale = Number.isFinite(options?.scale) ? options.scale : 1.8;
    return spawnEffectFromFrames(frames, x, y, {
      frameDuration: 0.04,
      scale,
      tintColor,
      tintAlpha,
    });
  }

  function spawnSentryBurnEffect(x, y) {
    const frames = resolveAssets()?.effects?.sentryBurn;
    return spawnEffectFromFrames(frames, x, y, { frameDuration: 0.06, scale: 1.6, loop: true });
  }

  function spawnSentryBeamHitEffect(x, y) {
    const frames = resolveAssets()?.effects?.enemyDeathExplosionAlt2;
    return spawnEffectFromFrames(frames, x, y, { frameDuration: 0.05, scale: 2.8 });
  }

  function spawnSentryBoreKillEffect(x, y) {
    const frames = resolveAssets()?.effects?.prayerBombExplosion;
    return spawnEffectFromFrames(frames, x, y, { frameDuration: 0.045, scale: 3.2 });
  }

  function spawnMagicImpactEffect(x, y) {
    const frames = resolveAssets()?.effects?.magicImpact;
    return spawnEffectFromFrames(frames, x, y, { frameDuration: 0.05, scale: 2.4 });
  }

  function spawnMagicSplashEffect(x, y, radius) {
    // Use the explosion variants for splash hits so repeated splashes feel varied.
    const assets = resolveAssets();
    const variants = [];
    if (assets?.effects?.enemyDeathExplosion?.length)
      variants.push(assets.effects.enemyDeathExplosion);
    if (assets?.effects?.enemyDeathExplosionAlt?.length)
      variants.push(assets.effects.enemyDeathExplosionAlt);
    if (assets?.effects?.enemyDeathExplosionAlt2?.length)
      variants.push(assets.effects.enemyDeathExplosionAlt2);
    if (!variants.length) return null;
    const frames = variants[Math.floor(Math.random() * variants.length)];
    if (!frames || !frames.length) return null;
    const baseSize = Math.max(frames[0].width, frames[0].height) || 1;
    const scale = (radius * 2) / baseSize;
    return spawnEffectFromFrames(frames, x, y, { frameDuration: 0.05, scale });
  }

  function spawnVisitorHeartHitEffect(x, y, { radius = null } = {}) {
    const frames = resolveAssets()?.effects?.visitorHeartHit;
    if (!frames || !frames.length) return null;
    let scale = 2.4;
    if (radius) {
      const base = Math.max(frames[0].width, frames[0].height) || 1;
      scale = (radius * 2) / base;
    }
    return spawnEffectFromFrames(frames, x, y, { frameDuration: 0.05, scale });
  }

  function spawnBossProjectilePuffEffect(x, y, { radius = null } = {}) {
    const frames = resolveAssets()?.effects?.visitorHeartHit;
    if (!frames || !frames.length) return null;
    let scale = 3.5;
    if (radius) {
      const base = Math.max(frames[0].width, frames[0].height) || 1;
      scale = (radius * 2.5) / base;
    }
    return spawnEffectFromFrames(frames, x, y, { frameDuration: 0.05, scale });
  }

  function spawnChattyHeartHitEffect(x, y, { radius = null } = {}) {
    const frames = resolveAssets()?.effects?.chattyHeartHit;
    if (!frames || !frames.length) return null;
    let scale = 2.2;
    if (radius) {
      const base = Math.max(frames[0].width, frames[0].height) || 1;
      scale = (radius * 2) / base;
    }
    return spawnEffectFromFrames(frames, x, y, { frameDuration: 0.04, scale });
  }

  function spawnChattyAppeaseEffect(x, y, { radius = null } = {}) {
    return spawnRayboltEffect(x, y, radius || 40);
  }

  function spawnEnemyDeathExplosion(x, y, { radius = null, scaleMultiplier = 1 } = {}) {
    const assets = resolveAssets();
    const variants = [];
    if (assets?.effects?.enemyDeathExplosion?.length) variants.push(assets.effects.enemyDeathExplosion);
    if (assets?.effects?.enemyDeathExplosionAlt?.length) variants.push(assets.effects.enemyDeathExplosionAlt);
    if (assets?.effects?.enemyDeathExplosionAlt2?.length) variants.push(assets.effects.enemyDeathExplosionAlt2);
    if (!variants.length) return null;
    const index = Math.floor(Math.random() * variants.length);
    const frames = variants[index] || variants[0];
    if (!frames || !frames.length) return null;
    const base = Math.max(frames[0].width, frames[0].height) || 1;
    let scale = 4.2; // even bigger default flame
    if (radius) {
      scale = (radius * 3.2) / base; // more overscale relative to enemy size
    }
    if (Number.isFinite(scaleMultiplier) && scaleMultiplier > 0) {
      scale *= scaleMultiplier;
    }
    return spawnEffectFromFrames(frames, x, y, { frameDuration: 0.045, scale });
  }



  function spawnRushBurstEffect(x, y, angle, scale = 4) {
    const frames = resolveAssets()?.effects?.swordSlash;
    if (!frames || !frames.length) return null;
    const facingLeft = Math.cos(angle) < 0;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const step = 30;
    const base = { frameDuration: 0.04, scale, rotation: angle, flipY: facingLeft };
    spawnEffectFromFrames(frames, x - cos * step, y - sin * step, { ...base, delay: 0,    tintColor: "#ffcc00", tintAlpha: 0.55 });
    spawnEffectFromFrames(frames, x,               y,               { ...base, delay: 0.08, tintColor: "#ff8800", tintAlpha: 0.70 });
    spawnEffectFromFrames(frames, x + cos * step, y + sin * step, { ...base, delay: 0.16, tintColor: "#cc2200", tintAlpha: 0.85 });
    return null;
  }

  function spawnSlashBurstEffect(x, y, angle, scale = 3.5, { flipY: forceFlipY, tintColor, tintAlpha, scaleX = 1, scaleY = 1 } = {}) {
    const frames = resolveAssets()?.effects?.swordSlash;
    if (!frames || !frames.length) return null;
    const facingLeft = Math.cos(angle) < 0;
    const flipY = forceFlipY !== undefined ? forceFlipY : facingLeft;
    const defaultTint = "#aaddff";
    const defaultTintAlpha = 0.5;
    return spawnEffectFromFrames(frames, x, y, {
      frameDuration: 0.04,
      scale,
      scaleX,
      scaleY,
      rotation: angle,
      flipY,
      tintColor: tintColor || defaultTint,
      tintAlpha: tintAlpha ?? defaultTintAlpha,
    });
  }

  function spawnPuffEffect(x, y, radius = null, options = {}) {
    const frames = resolveAssets()?.effects?.puff;
    if (!frames || !frames.length) return null;
    let scale = 1.4;
    if (radius) {
      const baseSize = Math.max(frames[0].width, frames[0].height) || 1;
      scale = (radius * 1.6) / baseSize;
    }
    return spawnEffectFromFrames(frames, x, y, {
      frameDuration: 0.045,
      scale,
      tintColor: options?.tintColor || null,
      tintAlpha: options?.tintAlpha ?? 0.65,
    });
  }

  function spawnSmokeEffect(x, y, scale = 1) {
    const frames = resolveAssets()?.effects?.smoke;
    if (!frames || !frames.length) return null;
    const baseSize = Math.max(frames[0].width, frames[0].height) || 1;
    const finalScale = scale || 1;
    if (baseSize <= 0) return null;
    return spawnEffectFromFrames(frames, x, y, { frameDuration: 0.045, scale: finalScale });
  }

  function spawnImpactDustEffect(x, y, radius = null) {
    const frames = resolveAssets()?.effects?.impactDust;
    if (!frames || !frames.length) return null;
    let scale = 1.0;
    if (radius) {
      const baseSize = Math.max(frames[0].width, frames[0].height) || 1;
      scale = (radius * 2) / baseSize;
    }
    return spawnEffectFromFrames(frames, x, y, { frameDuration: 0.05, scale: scale * 2 });
  }

  function spawnRayboltEffect(x, y, radius) {
    const frames = resolveAssets()?.effects?.raybolt;
    if (!frames || !frames.length) return null;
    let scale = 1;
    if (radius) {
      const baseSize = Math.max(frames[0].width, frames[0].height) || 1;
      scale = (radius * 2) / baseSize;
    }
    return spawnEffectFromFrames(frames, x, y, { frameDuration: 0.05, scale: scale * 2 });
  }

  function spawnSplashDebugCircle(x, y, radius) {
    return add(new DebugCircle(x, y, radius));
  }

  function spawnPrayerBombGlow(x, y, radius) {
    return add(new PrayerBombGlow(x, y, radius));
  }

  function spawnPrayerBombExplosion(x, y, { radius = null } = {}) {
    const frames = resolveAssets()?.effects?.prayerBombExplosion;
    if (!frames || !frames.length) return null;
    let scale = 2.4;
    if (radius) {
      const base = Math.max(frames[0].width, frames[0].height) || 1;
      scale = (radius * 2) / base;
    }
    return spawnEffectFromFrames(frames, x, y, { frameDuration: 0.05, scale });
  }

  function spawnLoopingEffect(frames, x, y, options = {}) {
    return spawnEffectFromFrames(frames, x, y, Object.assign({}, options, { loop: true }));
  }

  function update(dt) {
    for (let i = activeEffects.length - 1; i >= 0; i -= 1) {
      const effect = activeEffects[i];
      if (typeof effect.update === "function") {
        effect.update(dt);
      }
      if (effect.dead) {
        activeEffects.splice(i, 1);
      }
    }
  }

  function clear() {
    activeEffects.splice(0, activeEffects.length);
  }

  function getActive() {
    return activeEffects;
  }

  function initialize(options = {}) {
    if (options.context) {
      setContext(options.context);
    } else if (typeof options.getContext === "function") {
      setContextGetter(options.getContext);
    }
    if (typeof options.getAssets === "function") {
      setAssetsGetter(options.getAssets);
    } else if (options.assets) {
      setAssetsGetter(() => options.assets);
    }
  }

  function setContext(context) {
    ctxResolver =
      typeof context === "function"
        ? context
        : () => context;
  }

  function setContextGetter(fn) {
    ctxResolver = typeof fn === "function" ? fn : () => null;
  }

  function setAssetsGetter(fn) {
    if (typeof fn === "function") {
      assetsResolver = fn;
    } else {
      assetsResolver = () => fn || null;
    }
  }

  window.Effects = Object.assign(window.Effects || {}, {
    initialize,
    setContext,
    setContextGetter,
    setAssetsGetter,
    getActive,
    add,
    update,
    clear,
    spawnImpactEffect,
    spawnFlashEffect,
    spawnMagicImpactEffect,
    spawnMagicSplashEffect,
    spawnVisitorHeartHitEffect,
    spawnBossProjectilePuffEffect,
    spawnChattyHeartHitEffect,
    spawnChattyAppeaseEffect,
    spawnEnemyDeathExplosion,
    spawnPuffEffect,
    spawnSmokeEffect,
    spawnImpactDustEffect,
    spawnRayboltEffect,
    spawnSplashDebugCircle,
    spawnPrayerBombGlow,
    spawnPrayerBombExplosion,
    spawnSentryBurnEffect,
    spawnSentryBeamHitEffect,
    spawnSentryBoreKillEffect,
    spawnRushBurstEffect,
    spawnSlashBurstEffect,
    spawnLoopingEffect,
    Effect,
    DebugCircle,
    PrayerBombGlow,
  });
})(typeof window !== "undefined" ? window : null);
