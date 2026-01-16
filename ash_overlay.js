class AshOverlay {
  constructor(width, height, particleCount = 220) {
    this.width = width;
    this.height = height;
    this.count = Math.max(40, particleCount);
    this.emberRatio = 0.05;
    this.particles = new Array(this.count);
    this._seedParticles();
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    for (let i = 0; i < this.particles.length; i += 1) {
      const p = this.particles[i];
      p.x = (p.x % width + width) % width;
      p.y = (p.y % height + height) % height;
    }
  }

  update(deltaMs) {
    const dt = Math.min(40, Math.max(0, deltaMs)) / 1000;
    for (let i = 0; i < this.particles.length; i += 1) {
      const p = this.particles[i];
      p.t += dt * p.wobbleSpeed;
      const wobble = Math.sin(p.t) * p.wobbleAmp;
      p.x += (p.vx + wobble) * dt;
      p.y += p.vy * dt;

      if (p.y > this.height + p.size) {
        p.y = -p.size;
        p.x = Math.random() * this.width;
      }
      if (p.x < -p.size) {
        p.x = this.width + p.size;
      } else if (p.x > this.width + p.size) {
        p.x = -p.size;
      }
    }
  }

  draw(ctx) {
    if (!ctx) return;

    // Ash (source-over, very subtle).
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    for (let i = 0; i < this.particles.length; i += 1) {
      const p = this.particles[i];
      if (p.isEmber) continue;
      ctx.globalAlpha = p.alpha;
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
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < this.particles.length; i += 1) {
      const p = this.particles[i];
      if (!p.isEmber) continue;
      const flicker = 0.6 + 0.4 * Math.sin(p.t * 4.2);
      ctx.globalAlpha = p.alpha * flicker;
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
      const size = isEmber ? this._rand(0.9, 1.8) : this._rand(0.7, 1.6);
      const speed = isEmber ? this._rand(12, 20) : this._rand(8, 16);
      const drift = isEmber ? this._rand(-10, -6) : this._rand(-14, -8);

      this.particles[i] = {
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: drift,
        vy: speed,
        size,
        len: this._rand(1.5, 3.5),
        wobbleAmp: this._rand(0.4, 1.2),
        wobbleSpeed: this._rand(0.6, 1.4),
        t: Math.random() * Math.PI * 2,
        alpha: isEmber ? this._rand(0.14, 0.22) : this._rand(0.06, 0.12),
        color: isEmber ? "rgba(255, 170, 90, 0.95)" : "rgba(170, 150, 130, 0.85)",
        shape: Math.random() < 0.35 ? 1 : 0,
        isEmber,
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
