class AshOverlay {
  constructor(width, height, particleCount = 220) {
    this.width = width;
    this.height = height;
    this.viewX = 0;
    this.viewY = 0;
    this.viewWidth = width;
    this.viewHeight = height;
    this.count = Math.max(40, particleCount);
    this.emberRatio = 0.55;
    this.particles = new Array(this.count);
    this._seedParticles();
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    if (!this.viewWidth || !this.viewHeight) {
      this.viewWidth = width;
      this.viewHeight = height;
    }
    for (let i = 0; i < this.particles.length; i += 1) {
      const p = this.particles[i];
      p.x = (p.x % this.viewWidth + this.viewWidth) % this.viewWidth;
      p.y = (p.y % this.viewHeight + this.viewHeight) % this.viewHeight;
    }
  }

  setBounds(x, y, width, height) {
    this.viewX = Math.max(0, x || 0);
    this.viewY = Math.max(0, y || 0);
    this.viewWidth = Math.max(1, width || this.width);
    this.viewHeight = Math.max(1, height || this.height);
    for (let i = 0; i < this.particles.length; i += 1) {
      const p = this.particles[i];
      p.x = (p.x % this.viewWidth + this.viewWidth) % this.viewWidth;
      p.y = (p.y % this.viewHeight + this.viewHeight) % this.viewHeight;
    }
  }

  update(deltaMs) {
    const dt = Math.min(40, Math.max(0, deltaMs)) / 1000;
    const width = this.viewWidth || this.width;
    const height = this.viewHeight || this.height;
    for (let i = 0; i < this.particles.length; i += 1) {
      const p = this.particles[i];
      if (p.isEmber) {
        p.lifeTimer += dt;
        const fadeIn = p.life * 0.15;
        const fadeOut = p.life * 0.2;
        if (p.lifeTimer < fadeIn) {
          p.alphaScale = p.lifeTimer / fadeIn;
        } else if (p.lifeTimer > p.life - fadeOut) {
          p.alphaScale = Math.max(0, (p.life - p.lifeTimer) / fadeOut);
        } else {
          p.alphaScale = 1;
        }
        if (p.lifeTimer >= p.life) {
          p.life = this._rand(6, 8);
          p.lifeTimer = Math.random() * p.life * 0.35;
          p.x = Math.random() * width;
          p.y = height * (0.2 + Math.random() * 0.8);
          p.vx = this._rand(-6, 6);
          p.vy = -this._rand(10, 18);
          p.size = this._rand(0.9, 2.2);
          p.wobbleAmp = this._rand(0.8, 2.2);
          p.wobbleSpeed = this._rand(0.8, 1.8);
          p.t = Math.random() * Math.PI * 2;
        }
      }
      p.t += dt * p.wobbleSpeed;
      const wobble = Math.sin(p.t) * p.wobbleAmp;
      p.x += (p.vx + wobble) * dt;
      p.y += p.vy * dt;

      if (p.y < -p.size) {
        p.y = height + p.size;
        p.x = Math.random() * width;
        if (p.isEmber) {
          p.lifeTimer = Math.min(p.lifeTimer, p.life * 0.8);
        }
      }
      if (p.x < -p.size) {
        p.x = width + p.size;
      } else if (p.x > width + p.size) {
        p.x = -p.size;
      }
    }
  }

  draw(ctx) {
    if (!ctx) return;

    // Ash (source-over, very subtle).
    ctx.save();
    ctx.translate(this.viewX || 0, this.viewY || 0);
    ctx.globalCompositeOperation = "source-over";
    for (let i = 0; i < this.particles.length; i += 1) {
      const p = this.particles[i];
      if (p.isEmber) continue;
      ctx.globalAlpha = p.alpha * (p.alphaScale ?? 1);
      ctx.fillStyle = p.color;
      if (p.shape === 0) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size * 0.6;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.len, p.y + p.len * 0.35);
        ctx.stroke();
      }
    }
    ctx.restore();

    // Embers (lighten blend, still subtle).
    ctx.save();
    ctx.translate(this.viewX || 0, this.viewY || 0);
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < this.particles.length; i += 1) {
      const p = this.particles[i];
      if (!p.isEmber) continue;
      const flicker = 0.6 + 0.4 * Math.sin(p.t * 4.2);
      ctx.globalAlpha = p.alpha * (p.alphaScale ?? 1) * flicker;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _seedParticles() {
    const emberCount = Math.max(1, Math.round(this.count * this.emberRatio));
    for (let i = 0; i < this.count; i += 1) {
      const isEmber = i < emberCount;
      const size = isEmber ? this._rand(0.9, 2.2) : this._rand(0.6, 1.4);
      const speed = isEmber ? this._rand(10, 18) : this._rand(6, 12);
      const drift = isEmber ? this._rand(-6, 6) : this._rand(-5, 5);

      this.particles[i] = {
        x: Math.random() * this.viewWidth,
        y: Math.random() * this.viewHeight,
        vx: drift,
        vy: -speed,
        size,
        len: this._rand(1.5, 3.5),
        wobbleAmp: this._rand(0.8, 2.2),
        wobbleSpeed: this._rand(0.8, 1.8),
        t: Math.random() * Math.PI * 2,
        alpha: isEmber ? this._rand(0.18, 0.3) : this._rand(0.03, 0.08),
        color: isEmber ? "rgba(255, 120, 40, 0.95)" : "rgba(140, 110, 90, 0.7)",
        shape: Math.random() < 0.2 ? 1 : 0,
        isEmber,
        life: isEmber ? this._rand(6, 8) : 0,
        lifeTimer: isEmber ? Math.random() * 6 : 0,
        alphaScale: 1,
      };
    }
    for (let i = this.particles.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = this.particles[i];
      this.particles[i] = this.particles[j];
      this.particles[j] = tmp;
    }
  }

  _rand(min, max) {
    return min + Math.random() * (max - min);
  }
}

if (typeof window !== "undefined") {
  window.AshOverlay = AshOverlay;
}
