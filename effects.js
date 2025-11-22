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
    constructor(frames, x, y, { frameDuration = 0.05, scale = 2, loop = false } = {}) {
      this.frames = Array.isArray(frames) ? frames : [];
      this.x = x;
      this.y = y;
      this.scale = scale;
      this.frameDuration = frameDuration;
      this.timer = 0;
      this.frameIndex = 0;
      this.dead = false;
      this.loop = Boolean(loop);
    }

    update(dt) {
      if (this.dead) return;
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
      if (this.dead) return;
      const frame = this.frames[this.frameIndex];
      if (!frame) return;
      const ctx = resolveContext();
      if (!ctx) return;
      const width = frame.width * this.scale;
      const height = frame.height * this.scale;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.drawImage(frame, -width / 2, -height / 2, width, height);
      ctx.restore();
    }
  }

  class DebugCircle {
    constructor(x, y, radius, duration = 0.4) {
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
    constructor(x, y, radius, duration = 0.45) {
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

  function spawnFlashEffect(x, y) {
    const frames = resolveAssets()?.effects?.flash;
    return spawnEffectFromFrames(frames, x, y, { frameDuration: 0.04, scale: 1.8 });
  }

  function spawnMagicImpactEffect(x, y) {
    const frames = resolveAssets()?.effects?.magicImpact;
    return spawnEffectFromFrames(frames, x, y, { frameDuration: 0.05, scale: 2.4 });
  }

  function spawnMagicSplashEffect(x, y, radius) {
    const frames = resolveAssets()?.effects?.magicSplash;
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



  function spawnPuffEffect(x, y, radius = null) {
    const frames = resolveAssets()?.effects?.verticalPuff;
    if (!frames || !frames.length) return null;
    let scale = 2.6;
    if (radius) {
      const baseSize = Math.max(frames[0].width, frames[0].height) || 1;
      scale = (radius * 2) / baseSize;
    }
    return spawnEffectFromFrames(frames, x, y, { frameDuration: 0.045, scale });
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
    spawnPuffEffect,
    spawnSmokeEffect,
    spawnImpactDustEffect,
    spawnRayboltEffect,
    spawnSplashDebugCircle,
    spawnPrayerBombGlow,
    spawnLoopingEffect,
    Effect,
    DebugCircle,
    PrayerBombGlow,
  });
})(typeof window !== "undefined" ? window : null);
