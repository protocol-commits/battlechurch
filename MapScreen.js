(function setupMapScreen(window) {
  if (!window) return;

  const MAP_IMAGE_PRIMARY = "./assets/backgrounds/map.jpg";
  const MAP_IMAGE_FALLBACK = "./assets/backgrounds/map.jpg";
  const HIT_RADIUS_BASE = 10;
  const UI_FONT_FAMILY = "'Orbitron', sans-serif";
  const IS_LOCAL_HOST =
    typeof window !== "undefined" &&
    (window.location?.hostname === "localhost" || window.location?.hostname === "127.0.0.1");

  let mapImage = null;
  let mapImageLoaded = false;
  let mapImageFailed = false;
  let mapAssets = null;
  const townAnimators = new Map();

  const state = {
    active: false,
    mapRect: { x: 0, y: 0, w: 0, h: 0 },
    selectedTownId: null,
    panelOpen: false,
    denomUpgrade: null, // { active, townId, maxPicks, selectedKeys[], focusedIndex }
    panelFocus: 0,
    navHoldDir: 0,
    navNextTime: 0,
    playerDoc: null,
    mapProgress: null,
    loading: false,
    lastMapLoad: 0,
    lastPulseTime: 0,
    ambient: {
      active: false,
      nextAt: 0,
      lastAt: 0,
      fadeOut: false,
      fadeStart: 0,
      fadeDuration: 900,
    },
  };

  const MAP_AMBIENT_SRCS = [
    "assets/sfx/rpg/Monsters/monster_1.wav",
    "assets/sfx/rpg/Monsters/monster_1.wav",
    "assets/sfx/rpg/Monsters/monster_10.wav",
    "assets/sfx/rpg/Monsters/monster_11.wav",
    "assets/sfx/rpg/Monsters/monster_12.wav",
  ];
  const MAP_AMBIENT_POOL_MAX = 4;
  const mapAmbientPools = new Map();
  const mapAmbientActive = [];

  function getEffectiveMapSfxVolume(volume = 1) {
    if (typeof window !== "undefined" && typeof window.getEffectiveSfxVolume === "function") {
      return window.getEffectiveSfxVolume(volume);
    }
    if (typeof window !== "undefined" && window.audioSettings?.sfxEnabled === false) {
      return 0;
    }
    return Number.isFinite(volume) ? volume : 1;
  }

  function playMapAmbientSfx(src, volume = 0.45) {
    if (typeof Audio === "undefined") return null;
    const effectiveVolume = getEffectiveMapSfxVolume(volume);
    if (effectiveVolume <= 0) return null;
    let pool = mapAmbientPools.get(src);
    if (!pool) {
      pool = [];
      mapAmbientPools.set(src, pool);
    }
    let audio = pool.find((a) => a && a.paused);
    if (!audio && pool.length < MAP_AMBIENT_POOL_MAX) {
      audio = new Audio(src);
      audio.preload = "auto";
      pool.push(audio);
    }
    if (!audio) return null;
    audio.volume = effectiveVolume;
    audio.__mapAmbientBaseVolume = effectiveVolume;
    audio.currentTime = 0;
    try {
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
    } catch (e) {}
    mapAmbientActive.push(audio);
    return audio;
  }

  function stopMapAmbient({ fade = false } = {}) {
    if (fade) {
      state.ambient.fadeOut = true;
      state.ambient.fadeStart =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      return;
    }
    state.ambient.active = false;
    state.ambient.fadeOut = false;
    state.ambient.nextAt = 0;
    state.ambient.lastAt = 0;
    mapAmbientActive.length = 0;
    for (const pool of mapAmbientPools.values()) {
      pool.forEach((audio) => {
        if (!audio) return;
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch (e) {}
      });
    }
  }

  function startMapAmbient() {
    state.ambient.active = true;
    state.ambient.fadeOut = false;
    state.ambient.nextAt = 0;
    state.ambient.lastAt = 0;
  }

  function updateMapAmbient() {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (typeof window !== "undefined" && typeof window.isSfxEnabled === "function") {
      if (!window.isSfxEnabled()) {
        if (state.ambient.active && !state.ambient.fadeOut) stopMapAmbient({ fade: true });
        return;
      }
    }
    if (state.ambient.fadeOut) {
      const t = state.ambient.fadeStart ? (now - state.ambient.fadeStart) / state.ambient.fadeDuration : 1;
      const factor = Math.max(0, 1 - t);
      for (let i = mapAmbientActive.length - 1; i >= 0; i -= 1) {
        const audio = mapAmbientActive[i];
        if (!audio) {
          mapAmbientActive.splice(i, 1);
          continue;
        }
        const base = Number.isFinite(audio.__mapAmbientBaseVolume) ? audio.__mapAmbientBaseVolume : 0.45;
        audio.volume = base * factor;
        if (t >= 1) {
          try {
            audio.pause();
            audio.currentTime = 0;
          } catch (e) {}
          mapAmbientActive.splice(i, 1);
        }
      }
      if (t >= 1) {
        state.ambient.active = false;
        state.ambient.fadeOut = false;
        state.ambient.nextAt = 0;
        state.ambient.lastAt = 0;
      }
      return;
    }
    if (!state.ambient.active) return;
    if (!state.ambient.nextAt) {
      state.ambient.nextAt = now + 600 + Math.random() * 900;
      return;
    }
    if (now < state.ambient.nextAt) return;
    const src = MAP_AMBIENT_SRCS[Math.floor(Math.random() * MAP_AMBIENT_SRCS.length)];
    playMapAmbientSfx(src, 0.45);
    const gap = 700 + Math.random() * 1400;
    state.ambient.lastAt = now;
    state.ambient.nextAt = now + gap;
  }

  function roundRect(ctx, x, y, width, height, radius, fill = true, stroke = true) {
    if (!ctx) return;
    ctx.beginPath();
    const r = Math.min(radius, width / 2, height / 2);
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  function loadMapImage() {
    if (mapImage || mapImageLoaded || mapImageFailed) return;
    mapImage = new Image();
    mapImage.onload = () => {
      mapImageLoaded = true;
    };
    mapImage.onerror = () => {
      if (mapImage && mapImage.src === MAP_IMAGE_PRIMARY) {
        mapImage.src = MAP_IMAGE_FALLBACK;
        return;
      }
      mapImageFailed = true;
    };
    mapImage.src = MAP_IMAGE_PRIMARY;
  }

  function setAssets(assets) {
    mapAssets = assets || null;
    townAnimators.clear();
  }

  function getMiniImpClips() {
    return mapAssets?.enemies?.miniImp || null;
  }

  function getMiniClawedDemonClips() {
    return mapAssets?.enemies?.miniClawedDemon || null;
  }

  function getMiniDemonFireKeeperClips() {
    return mapAssets?.enemies?.miniDemonFireKeeper || null;
  }

  function getMiniDemonLordClips() {
    return mapAssets?.enemies?.miniDemonLord || null;
  }

  function updateAnimatorCycle(animator, dt, state, minHold, maxHold) {
    if (!animator || !state) return;
    state.timer += dt;
    if (animator.currentName === "walk") {
      if (state.timer >= state.hold) {
        state.timer = 0;
        animator.play("attack", { restart: true, loop: false });
      }
    } else if (animator.currentName === "attack") {
      if (animator.isFinished?.()) {
        animator.play("walk", { restart: true, loop: true });
        state.hold = minHold + Math.random() * Math.max(0.1, maxHold - minHold);
      }
    } else {
      animator.play("walk", { restart: true, loop: true });
      state.timer = 0;
    }
  }

  function getTownAnimatorState(town, bestCount) {
    if (!town) return null;
    const key = town.id;
    const isCapital = town.type === "capital";
    const shouldShow = isCapital || bestCount == null;
    if (!shouldShow) {
      if (townAnimators.has(key)) townAnimators.delete(key);
      return null;
    }
    if (townAnimators.has(key)) return townAnimators.get(key);
    const Animator = window.Entities?.Animator || null;
    let clips = null;
    if (isCapital) {
      clips = getMiniDemonLordClips();
    } else if (town.districtId === "northeast") {
      clips = getMiniClawedDemonClips();
    } else if (town.districtId === "southwest") {
      clips = getMiniDemonFireKeeperClips();
    } else {
      clips = getMiniImpClips();
    }
    if (!Animator || !clips) return null;
    const animator = new Animator(clips, 1);
    animator.play("walk", { restart: true, loop: true });
    if (!animator) return null;
    const minHold = isCapital ? 1.4 : 1.0;
    const maxHold = isCapital ? 2.6 : 2.0;
    const state = {
      animator,
      timer: Math.random() * 1.2,
      hold: minHold + Math.random() * (maxHold - minHold),
      minHold,
      maxHold,
    };
    townAnimators.set(key, state);
    return state;
  }

  function ensureProgress() {
    const mapData = window.BattlechurchMapData;
    if (!mapData) return null;
    if (IS_LOCAL_HOST) {
      if (!state.mapProgress || state.mapProgress.version !== 2) {
        state.mapProgress = buildLocalProgress(mapData);
      }
      return state.mapProgress;
    }
    // Clean break: v1 saves are discarded, start fresh with v2
    if (!state.mapProgress || state.mapProgress.version !== 2) {
      state.mapProgress = {
        version: 2,
        towns: {},
        unlockedTownIds: [],
      };
    }
    if (!Array.isArray(state.mapProgress.unlockedTownIds)) {
      state.mapProgress.unlockedTownIds = [];
    }
    if (!state.mapProgress.towns || typeof state.mapProgress.towns !== "object") {
      state.mapProgress.towns = {};
    }
    if (!state.mapProgress.unlockedTownIds.length) {
      const firstTownId = mapData.getFirstTownId();
      if (firstTownId) state.mapProgress.unlockedTownIds.push(firstTownId);
    }
    ensureNextTownUnlocked(state.mapProgress, mapData);
    return state.mapProgress;
  }

  function buildLocalProgress(mapData) {
    const allTowns = mapData.towns || [];
    const regularTowns = allTowns.filter((t) => t.type !== "capital");
    const completedCount = 2;
    const completedIds = regularTowns.slice(0, completedCount).map((town) => town.id);
    const unlockedTownIds = completedIds.slice();
    const townEntries = {};
    completedIds.forEach((townId) => {
      townEntries[townId] = {
        p1: {
          completed: true,
          stars: mapData.calculateStars(100),
          bestCount: 100,
          churchPowerupLevels: {},
        },
        p2: null,
        p3: null,
      };
    });
    const progress = {
      version: 2,
      towns: townEntries,
      unlockedTownIds,
    };
    ensureNextTownUnlocked(progress, mapData);
    return progress;
  }

  async function loadPlayerProgress() {
    if (state.loading) return;
    state.loading = true;
    try {
      if (IS_LOCAL_HOST) {
        state.mapProgress = ensureProgress();
        state.selectedTownId = state.selectedTownId || pickInitialTown();
        return;
      }
      if (window.Cloud?.initCloud) {
        await window.Cloud.initCloud();
      }
      if (window.Cloud?.loadPlayerDoc) {
        state.playerDoc = await window.Cloud.loadPlayerDoc();
      }
      state.mapProgress = state.playerDoc?.mapProgress || null;
      const progress = ensureProgress();
      // Save fresh v2 progress if no doc exists or doc is pre-v2 (clean break)
      const isV2 = state.playerDoc?.mapProgress?.version === 2;
      if (!isV2 && window.Cloud?.savePlayerDoc) {
        await window.Cloud.savePlayerDoc({ mapProgress: progress });
      }
      if (!state.selectedTownId) {
        state.selectedTownId = pickInitialTown();
      }
    } catch (e) {
      // swallow errors for offline/local runs
    } finally {
      state.loading = false;
      state.lastMapLoad = Date.now();
    }
  }

  function getTownStartCount(townId) {
    // Legacy shim — prefer getTownCampaignData for v2 campaign-aware start counts
    const data = getTownCampaignData(townId);
    return data?.startCount ?? 50;
  }

  async function ensureTownStartCount(townId) {
    // In v2, start count is derived from campaign history; no separate persistence needed
    if (!state.mapProgress) await loadPlayerProgress();
    return getTownStartCount(townId);
  }

  function isTownUnlocked(townId) {
    const progress = ensureProgress();
    if (!progress) return false;
    return progress.unlockedTownIds.includes(townId);
  }

  function getTownStars(townId) {
    // Returns number of completed campaigns (0–3), used for glow scaling
    const progress = ensureProgress();
    const townEntry = progress?.towns?.[townId];
    if (!townEntry) return 0;
    let count = 0;
    for (const camp of ["p1", "p2", "p3"]) {
      if (townEntry[camp]?.completed === true) count += 1;
    }
    return count;
  }

  function getTownBestCount(townId) {
    const progress = ensureProgress();
    const townEntry = progress?.towns?.[townId];
    if (!townEntry) return null;
    let best = null;
    for (const camp of ["p1", "p2", "p3"]) {
      const count = townEntry[camp]?.bestCount;
      if (Number.isFinite(count)) {
        best = best == null ? count : Math.max(best, count);
      }
    }
    return best;
  }

  function getTownById(townId) {
    const mapData = window.BattlechurchMapData;
    if (!mapData) return null;
    return mapData.towns.find((town) => town.id === townId) || null;
  }

  function getDistrictById(districtId) {
    const mapData = window.BattlechurchMapData;
    if (!mapData) return null;
    return mapData.districts.find((district) => district.id === districtId) || null;
  }

  function getTownPosition(town, rect) {
    return {
      x: rect.x + town.x * rect.w,
      y: rect.y + town.y * rect.h,
    };
  }

  function computeMapRect(canvas) {
    if (!mapImageLoaded || !mapImage) {
      state.mapRect = { x: 0, y: 0, w: canvas.width, h: canvas.height };
      return state.mapRect;
    }
    const scale = Math.min(canvas.width / mapImage.width, canvas.height / mapImage.height);
    const w = mapImage.width * scale;
    const h = mapImage.height * scale;
    const x = (canvas.width - w) / 2;
    const y = (canvas.height - h) / 2;
    state.mapRect = { x, y, w, h };
    return state.mapRect;
  }

  function drawMapBackground(ctx, canvas) {
    const rect = computeMapRect(canvas);
    if (mapImageLoaded && mapImage) {
      const stripHeight = 14;
      const time = (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000;
      const amp = 0.9;
      const scaleY = rect.h / mapImage.height;
      for (let y = 0; y < mapImage.height; y += stripHeight) {
        const wave = Math.sin(time * 2 + y * 0.15) + Math.sin(time * 1.2 + y * 0.05);
        const offset = wave * amp;
        const srcH = Math.min(stripHeight, mapImage.height - y);
        const destY = rect.y + y * scaleY;
        const destH = srcH * scaleY;
        ctx.drawImage(
          mapImage,
          0,
          y,
          mapImage.width,
          srcH,
          rect.x + offset,
          destY,
          rect.w,
          destH,
        );
      }
    } else {
      ctx.fillStyle = "#0b111a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    return rect;
  }

  // Draws P1/P2/P3 campaign completion dots above a town node
  function drawCampaignDots(ctx, town, position, radius, rect) {
    const progress = ensureProgress();
    if (!progress) return;
    const townEntry = progress.towns?.[town.id];
    const scale = rect.w / 1280;
    const dotRadius = Math.max(3, Math.round(5 * scale));
    const dotGap = Math.round(14 * scale);
    const dotY = position.y - radius - 28 * scale;
    const campaigns = ["p1", "p2", "p3"];
    const totalWidth = (campaigns.length - 1) * dotGap;
    const startX = position.x - totalWidth / 2;

    const p2Available = isP2UnlockedForTown(town.id, progress);
    const p3Available = isP3UnlockedForTown(town.id, progress);

    ctx.save();
    campaigns.forEach((camp, i) => {
      const cx = startX + i * dotGap;
      const completed = townEntry?.[camp]?.completed === true;
      const available = camp === "p1" || (camp === "p2" && p2Available) || (camp === "p3" && p3Available);

      ctx.beginPath();
      ctx.arc(cx, dotY, dotRadius, 0, Math.PI * 2);

      if (completed) {
        ctx.fillStyle = camp === "p1" ? "#FFD978" : camp === "p2" ? "#8FD7FF" : "#C8FFB0";
        ctx.shadowColor = camp === "p1" ? "rgba(255,210,80,0.8)" : camp === "p2" ? "rgba(140,215,255,0.8)" : "rgba(200,255,160,0.8)";
        ctx.shadowBlur = 6;
        ctx.fill();
      } else if (available) {
        ctx.strokeStyle = camp === "p1" ? "#FFD978" : camp === "p2" ? "#8FD7FF" : "#C8FFB0";
        ctx.lineWidth = 1.5;
        ctx.shadowColor = "rgba(255,255,255,0.3)";
        ctx.shadowBlur = 4;
        ctx.stroke();
      } else {
        // Locked — dim outline
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;
        ctx.stroke();
      }
    });
    ctx.restore();
  }

  function drawTownNode(ctx, town, rect, pulse) {
    const position = getTownPosition(town, rect);
    const dpr = window.devicePixelRatio || 1;
    const radius = HIT_RADIUS_BASE * dpr;
    const unlocked = isTownUnlocked(town.id);
    const selected = state.selectedTownId === town.id;
    const starCount = getTownStars(town.id);
    const bestCount = getTownBestCount(town.id);
    const isCapital = town.type === "capital";
    const nodeRadius = isCapital ? radius * 3.6 : radius;
    const districtId = town.districtId || "";
    const districtStyles = {
      northwest: { core: "#FFD978", glow: "rgba(255, 217, 120, 0.8)", ring: "rgba(255, 235, 180, 0.9)" },
      northeast: { core: "#8FD7FF", glow: "rgba(140, 215, 255, 0.75)", ring: "rgba(190, 235, 255, 0.9)" },
      southwest: { core: "#C8FFB0", glow: "rgba(200, 255, 176, 0.75)", ring: "rgba(230, 255, 210, 0.9)" },
    };
    const style = districtStyles[districtId] || districtStyles.northwest;
    const isDemonTown = bestCount == null;

    if (bestCount != null) {
      const glowStars = Math.max(1, Math.min(3, starCount || 1));
      const glowRadius = (glowStars * 100) * (isCapital ? 1.3 : 1);
      const glow = ctx.createRadialGradient(
        position.x,
        position.y,
        nodeRadius * 0.5,
        position.x,
        position.y,
        glowRadius,
      );
      glow.addColorStop(0, style.glow.replace("0.8", "0.4").replace("0.75", "0.4"));
      glow.addColorStop(0.55, style.glow.replace("0.8", "0.2").replace("0.75", "0.2"));
      glow.addColorStop(0.85, style.glow.replace("0.8", "0.08").replace("0.75", "0.08"));
      glow.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(position.x, position.y, glowRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.beginPath();
    if (isCapital) {
      const spikes = 8;
      const inner = nodeRadius * 0.7;
      const outer = nodeRadius * 1.2;
      for (let i = 0; i < spikes * 2; i += 1) {
        const angle = (Math.PI * 2 * i) / (spikes * 2) - Math.PI / 2;
        const r = i % 2 === 0 ? outer : inner;
        const x = position.x + Math.cos(angle) * r;
        const y = position.y + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    } else if (districtId === "northeast") {
      const size = nodeRadius * 1.1;
      ctx.moveTo(position.x, position.y - size);
      ctx.lineTo(position.x + size, position.y);
      ctx.lineTo(position.x, position.y + size);
      ctx.lineTo(position.x - size, position.y);
      ctx.closePath();
    } else if (districtId === "southwest") {
      const size = nodeRadius * 1.05;
      for (let i = 0; i < 6; i += 1) {
        const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
        const x = position.x + Math.cos(angle) * size;
        const y = position.y + Math.sin(angle) * size;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    } else {
      ctx.arc(position.x, position.y, nodeRadius * 0.98, 0, Math.PI * 2);
    }
    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = 10;
    ctx.globalAlpha = 0.4;
    if (bestCount == null) {
      const glow = ctx.createRadialGradient(position.x, position.y, 2, position.x, position.y, nodeRadius + 6);
      glow.addColorStop(0, "rgba(10, 6, 8, 0.6)");
      glow.addColorStop(0.6, "rgba(6, 4, 6, 0.35)");
      glow.addColorStop(1, "rgba(2, 2, 3, 0.15)");
      ctx.fillStyle = glow;
    } else {
      ctx.fillStyle = unlocked ? "rgba(255, 255, 255, 0.45)" : "rgba(255,255,255,0.2)";
      if (unlocked) {
        ctx.fillStyle = style.core.replace(")", ", 0.45)").replace("rgb(", "rgba(");
      }
    }
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.lineWidth = isDemonTown ? 2.6 : 2;
    ctx.strokeStyle = "rgba(140, 35, 35, 0.95)";
    ctx.stroke();
    if (isDemonTown) {
      ctx.save();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(210, 90, 90, 0.6)";
      ctx.shadowColor = "rgba(210, 90, 90, 0.45)";
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.restore();
    }
    if (selected && unlocked) {
      ctx.lineWidth = 4;
      ctx.strokeStyle = isCapital ? "rgba(255, 90, 90, 0.95)" : style.ring;
      ctx.stroke();
      if (pulse) {
        const glowRadius = nodeRadius + 12 + pulse * 2;
        ctx.beginPath();
        ctx.arc(position.x, position.y, glowRadius, 0, Math.PI * 2);
        ctx.strokeStyle = isCapital ? "rgba(255, 90, 90, 0.7)" : style.ring;
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(position.x, position.y, glowRadius + 8, 0, Math.PI * 2);
        ctx.strokeStyle = isCapital ? "rgba(255, 120, 120, 0.6)" : "rgba(255, 255, 255, 0.6)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    ctx.restore();


    const animState = getTownAnimatorState(town, bestCount);
    const animator = animState?.animator || null;
    const clip = animator?.currentClip || null;
    if (animator && clip && (town.type === "capital" || bestCount == null)) {
      let baseTarget = town.type === "capital" ? radius * 8.4 : radius * 3.75;
      if (town.districtId === "northeast") {
        baseTarget *= 0.75;
      }
      const baseSize = Math.max(clip.frameWidth || 1, clip.frameHeight || 1);
      animator.scale = baseSize > 0 ? baseTarget / baseSize : 1;
      animator.draw(ctx, position.x, position.y - 15, {
        alpha: 1,
        flipX: true,
      });
    }
    if (bestCount != null) {
      ctx.save();
      const nameSize = Math.round(14 * (rect.w / 1280));
      ctx.font = `600 ${nameSize}px ${UI_FONT_FAMILY}`;
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.shadowColor = "rgba(6, 10, 18, 0.85)";
      ctx.shadowBlur = 10;
      ctx.fillText(`${town.name} (${Math.round(bestCount)})`, position.x, position.y - radius - 10);
      ctx.restore();
    } else if (selected) {
      ctx.save();
      ctx.font = `600 ${Math.round(16 * (rect.w / 1280))}px ${UI_FONT_FAMILY}`;
      ctx.fillStyle = unlocked ? "#FFFFFF" : "rgba(255,255,255,0.6)";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.shadowColor = "rgba(6, 10, 18, 0.85)";
      ctx.shadowBlur = 10;
      ctx.fillText(town.name, position.x, position.y - radius - 10);
      ctx.restore();
    }

    // Campaign dots (P1/P2/P3) above the name label for regular towns
    if (!isCapital && unlocked) {
      drawCampaignDots(ctx, town, position, radius, rect);
    }
  }

  function drawPhaseBox(ctx, rect) {
    const progress = ensureProgress();
    const op = getActiveOperation(progress);
    const scale = rect.w / 1280;
    const boxW = Math.round(182 * scale);
    const boxH = Math.round(64 * scale);
    const pad = Math.round(18 * scale);
    const boxX = rect.x + rect.w - boxW - pad;
    const boxY = rect.y + rect.h - boxH - pad;
    const textX = boxX + Math.round(12 * scale);

    ctx.save();

    // Background
    ctx.fillStyle = "rgba(4, 8, 14, 0.88)";
    ctx.fillRect(boxX, boxY, boxW, boxH);

    // Border
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    // Left accent bar in operation color
    ctx.fillStyle = op.color;
    ctx.shadowColor = op.glow;
    ctx.shadowBlur = 8;
    ctx.fillRect(boxX, boxY, Math.max(2, Math.round(3 * scale)), boxH);
    ctx.shadowBlur = 0;

    // "OPERATION:" tag — tiny, muted
    const tagSize = Math.max(7, Math.round(8 * scale));
    const nameSize = Math.max(11, Math.round(14 * scale));
    const statusSize = Math.max(7, Math.round(9 * scale));

    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    ctx.font = `600 ${tagSize}px ${UI_FONT_FAMILY}`;
    ctx.fillStyle = "rgba(180, 190, 200, 0.5)";
    ctx.fillText("OPERATION", textX, boxY + boxH * 0.22);

    // Operation name — bold, colored
    ctx.font = `700 ${nameSize}px ${UI_FONT_FAMILY}`;
    ctx.fillStyle = op.color;
    ctx.shadowColor = op.glow;
    ctx.shadowBlur = 6;
    ctx.fillText(op.name, textX, boxY + boxH * 0.52);
    ctx.shadowBlur = 0;

    // Status line — small dot + text
    const dotR = Math.max(2, Math.round(2.5 * scale));
    const dotX = textX + dotR;
    const statusY = boxY + boxH * 0.82;
    ctx.beginPath();
    ctx.arc(dotX, statusY, dotR, 0, Math.PI * 2);
    ctx.fillStyle = op.color;
    ctx.fill();

    ctx.font = `400 ${statusSize}px ${UI_FONT_FAMILY}`;
    ctx.fillStyle = "rgba(190, 205, 220, 0.65)";
    ctx.fillText(op.statusLine, textX + dotR * 2 + Math.round(5 * scale), statusY);

    ctx.restore();
  }

  function drawMapLabels(ctx, canvas, rect) {
    const mapData = window.BattlechurchMapData;
    if (!mapData) return;
    const scale = rect.w / 1280;
    const taglineSize = Math.round(40 * scale);
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.shadowColor = "rgba(6, 10, 18, 0.85)";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "#EAF6FF";
    ctx.font = `800 ${taglineSize}px ${UI_FONT_FAMILY}`;
    ctx.fillText("Smite the hordes. Save the people.", canvas.width / 2, rect.y + Math.round(16 * scale) + 35);
    ctx.restore();
  }

  function findTownAtPosition(point, rect) {
    const mapData = window.BattlechurchMapData;
    if (!mapData) return null;
    const dpr = window.devicePixelRatio || 1;
    const radius = HIT_RADIUS_BASE * dpr;
    for (const town of mapData.towns) {
      const pos = getTownPosition(town, rect);
      const dx = point.x - pos.x;
      const dy = point.y - pos.y;
      if (Math.hypot(dx, dy) <= radius) return town;
    }
    return null;
  }

  function getUnlockedTowns() {
    const mapData = window.BattlechurchMapData;
    if (!mapData) return [];
    return mapData.towns.filter((town) => isTownUnlocked(town.id));
  }

  function pickInitialTown() {
    const unlocked = getUnlockedTowns();
    if (!unlocked.length) return null;
    return unlocked[0].id;
  }

  function getOrderedUnlockedTowns() {
    const mapData = window.BattlechurchMapData;
    if (!mapData) return [];
    const districts = mapData.getDistricts(); // Already sorted by order: NW, NE, SW, SE
    const ordered = [];
    // Add towns district by district
    districts.forEach((district) => {
      const townsInDistrict = mapData.getTownsByDistrict(district.id);
      townsInDistrict.forEach((town) => {
        if (isTownUnlocked(town.id)) {
          ordered.push(town);
        }
      });
    });
    // Add capital last
    const capital = mapData.towns.find((t) => t.type === "capital");
    if (capital && isTownUnlocked(capital.id)) {
      ordered.push(capital);
    }
    return ordered;
  }

  function pickNextTown(direction) {
    const mapData = window.BattlechurchMapData;
    if (!mapData || !state.selectedTownId) return state.selectedTownId;
    const ordered = getOrderedUnlockedTowns();
    if (!ordered.length) return state.selectedTownId;
    const currentIndex = ordered.findIndex((t) => t.id === state.selectedTownId);
    if (currentIndex < 0) return ordered[0].id;
    // Right/Down = next in sequence, Left/Up = previous in sequence
    const forward = direction === "right" || direction === "down";
    let nextIndex;
    if (forward) {
      nextIndex = (currentIndex + 1) % ordered.length;
    } else {
      nextIndex = (currentIndex - 1 + ordered.length) % ordered.length;
    }
    return ordered[nextIndex].id;
  }

  // ---------------------------------------------------------------------------
  // Denominational Upgrade helpers
  // County number: 1=Westreach, 2=Ashvale, 3=Lowmarch, 4=Capital.
  // To remap counties, update the district order in mapData.js.
  // ---------------------------------------------------------------------------
  function getCountyNumberForTown(townId) {
    const mapData = window.BattlechurchMapData;
    if (!mapData) return 1;
    const town = mapData.towns.find(function(t) { return t.id === townId; });
    if (!town) return 1;
    if (town.type === "capital") return 4;
    const districts = mapData.getDistricts(); // sorted by order
    const idx = districts.findIndex(function(d) { return d.id === town.districtId; });
    return idx >= 0 ? idx + 1 : 1;
  }

  // County 1 = no picks; County 2 = 1 pick; County 3 = 2 picks; County 4 = 3 picks.
  function getDenomPickCountForTown(townId) {
    const county = getCountyNumberForTown(townId);
    if (county === 2) return 1;
    if (county === 3) return 2;
    if (county === 4) return 3;
    return 0;
  }

  function openTownPanel(townId) {
    if (!isTownUnlocked(townId)) return;
    if (typeof window !== "undefined" && typeof window.playMenuItemPickSfx === "function") {
      window.playMenuItemPickSfx(0.55);
    }
    state.selectedTownId = townId;
    state.panelOpen = true;
    state.panelFocus = 0;
  }

  function closeTownPanel() {
    state.panelOpen = false;
    state.navHoldDir = 0;
    state.navNextTime = 0;
  }

  function getNavigationDirection(input, keysJustPressed) {
    let direction = null;
    if (keysJustPressed.has("w") || keysJustPressed.has("ArrowUp")) direction = "up";
    else if (keysJustPressed.has("s") || keysJustPressed.has("ArrowDown")) direction = "down";
    else if (keysJustPressed.has("a") || keysJustPressed.has("ArrowLeft")) direction = "left";
    else if (keysJustPressed.has("d") || keysJustPressed.has("ArrowRight")) direction = "right";
    if (direction) return direction;
    if (!input || typeof input.isActionActive !== "function") {
      state.navHoldDir = 0;
      state.navNextTime = 0;
      return null;
    }
    const hasHoldInputSource =
      Boolean(input.virtualInput?.enabled) || Boolean(input.gamepadState?.movement?.active);
    if (!hasHoldInputSource) {
      state.navHoldDir = 0;
      state.navNextTime = 0;
      return null;
    }
    const nextDir =
      input.isActionActive("up") ? "up" :
      input.isActionActive("down") ? "down" :
      input.isActionActive("left") ? "left" :
      input.isActionActive("right") ? "right" :
      null;
    if (!nextDir) {
      state.navHoldDir = 0;
      state.navNextTime = 0;
      return null;
    }
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const initialDelayMs = 280;
    const repeatDelayMs = 140;
    if (state.navHoldDir !== nextDir) {
      state.navHoldDir = nextDir;
      state.navNextTime = now + initialDelayMs;
      return nextDir;
    }
    if (now >= state.navNextTime) {
      state.navNextTime = now + repeatDelayMs;
      return nextDir;
    }
    return null;
  }

  function drawTownPanel(ctx, canvas) {
    if (!state.panelOpen || !state.selectedTownId) return;
    const town = getTownById(state.selectedTownId);
    if (!town) return;
    const district = getDistrictById(town.districtId);
    const panelW = Math.min(520, canvas.width * 0.7);
    const panelH = 220;
    const panelX = canvas.width / 2 - panelW / 2;
    const panelY = canvas.height - panelH - 40;

    ctx.save();
    ctx.fillStyle = "rgba(8, 12, 20, 0.85)";
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 2;
    roundRect(ctx, panelX, panelY, panelW, panelH, 16, true, true);

    ctx.fillStyle = "#FFD978";
    ctx.font = `600 22px ${UI_FONT_FAMILY}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(town.name, canvas.width / 2, panelY + 16);

    ctx.fillStyle = "#EAF6FF";
    ctx.font = `500 16px ${UI_FONT_FAMILY}`;
    const districtLabel = town.type === "capital" ? "Capital" : (district ? district.name : "");
    ctx.fillText(districtLabel, canvas.width / 2, panelY + 46);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = `500 16px ${UI_FONT_FAMILY}`;
    const progress = ensureProgress();
    if (town.type === "capital") {
      ctx.fillText(`Score ×${getCapitalScoreMultiplier(progress).toFixed(2)}`, canvas.width / 2, panelY + 76);
    } else {
      const nextCamp = progress ? getNextCampaignForTown(town.id, progress) : "p1";
      const campLabel = nextCamp === "p1" ? "Campaign I" : nextCamp === "p2" ? "Campaign II" : "Campaign III";
      const campAvail = nextCamp === "p1" || (nextCamp === "p2" ? isP2UnlockedForTown(town.id, progress) : isP3UnlockedForTown(town.id, progress));
      const campText = campAvail ? campLabel : `${campLabel} (locked)`;
      ctx.fillText(campText, canvas.width / 2, panelY + 76);
    }

    const buttonW = 140;
    const buttonH = 44;
    const gap = 20;
    const buttonY = panelY + panelH - 70;
    const totalW = buttonW * 2 + gap;
    const startX = canvas.width / 2 - totalW / 2;
    // Check if gameplay assets are still loading
    const isLoading = typeof window !== "undefined" && !window.gameAssetsLoaded;
    const loadProgress = (typeof window !== "undefined" && window.gameLoadingProgress) || 0;
    const buttons = [
      { label: isLoading ? "Loading..." : "Play", x: startX, key: "play", isLoading },
      { label: "Back", x: startX + buttonW + gap, key: "back", isLoading: false },
    ];

    buttons.forEach((btn, index) => {
      ctx.save();
      if (btn.isLoading) {
        // Loading button with progress bar
        ctx.fillStyle = "rgba(40, 50, 70, 0.9)";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        ctx.lineWidth = 2;
        roundRect(ctx, btn.x, buttonY, buttonW, buttonH, 16, true, true);
        // Progress fill
        const fillWidth = buttonW * (loadProgress / 100);
        if (fillWidth > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(btn.x, buttonY, buttonW, buttonH, 16);
          ctx.clip();
          ctx.fillStyle = "#9BD9FF";
          ctx.fillRect(btn.x, buttonY, fillWidth, buttonH);
          ctx.restore();
        }
      } else {
        ctx.fillStyle = "#9BD9FF";
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.lineWidth = 2;
        roundRect(ctx, btn.x, buttonY, buttonW, buttonH, 16, true, true);
      }
      if (index === state.panelFocus) {
        ctx.strokeStyle = "#FFD978";
        ctx.lineWidth = 3;
        roundRect(ctx, btn.x - 2, buttonY - 2, buttonW + 4, buttonH + 4, 18, false, true);
      }
      ctx.fillStyle = "#0b111a";
      ctx.font = `600 16px ${UI_FONT_FAMILY}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(btn.label, btn.x + buttonW / 2, buttonY + buttonH / 2);
      ctx.restore();
    });

    state.panelButtons = buttons.map((btn, index) => ({
      key: btn.key,
      x: btn.x,
      y: buttonY,
      width: buttonW,
      height: buttonH,
      index,
    }));

    ctx.restore();
  }

  function handlePanelInput(input, keysJustPressed) {
    if (!state.panelOpen) return false;
    const direction = getNavigationDirection(input, keysJustPressed);
    if (direction) {
      state.panelFocus = state.panelFocus === 0 ? 1 : 0;
      if (typeof window !== "undefined" && typeof window.playMenuItemPickSfx === "function") {
        window.playMenuItemPickSfx(0.55);
      }
    }
    const confirmPressed =
      keysJustPressed.has(" ") ||
      keysJustPressed.has("enter") ||
      keysJustPressed.has("Enter") ||
      keysJustPressed.has("ArrowLeft");
    if (confirmPressed) {
      const selection = state.panelButtons?.[state.panelFocus];
      if (selection?.key === "play") {
        if (typeof window !== "undefined" && typeof window.playMenuItemPickSfx === "function") {
          window.playMenuItemPickSfx(0.55);
        }
        startRunForTown(state.selectedTownId);
      } else {
        if (typeof window !== "undefined" && typeof window.playMenuItemPickSfx === "function") {
          window.playMenuItemPickSfx(0.55);
        }
        closeTownPanel();
      }
    }
    const backPressed =
      keysJustPressed.has("escape") ||
      keysJustPressed.has("Escape") ||
      keysJustPressed.has("ArrowDown");
    if (backPressed) {
      if (typeof window !== "undefined" && typeof window.playMenuItemPickSfx === "function") {
        window.playMenuItemPickSfx(0.55);
      }
      closeTownPanel();
    }
    return true;
  }

  function _launchTown(townId) {
    if (typeof window.startExteriorMusic === "function") {
      window.startExteriorMusic();
    }
    if (typeof window.startRunForTown === "function") {
      window.startRunForTown(townId);
      return;
    }
    if (typeof window.startGameFromTitle === "function") {
      window.startGameFromTitle();
    }
  }

  function startRunForTown(townId) {
    const picks = getDenomPickCountForTown(townId);
    if (picks > 0) {
      // Show denominational upgrade screen before launching
      state.panelOpen = false;
      state.denomUpgrade = { active: true, townId: townId, maxPicks: picks, selectedKeys: [], focusedIndex: 0 };
      return;
    }
    _launchTown(townId);
  }

  function confirmDenomUpgrade() {
    const du = state.denomUpgrade;
    if (!du || !du.active || du.selectedKeys.length < du.maxPicks) return;
    if (typeof window !== "undefined") {
      window.pendingDenomPowerups = du.selectedKeys.slice();
    }
    state.denomUpgrade = null;
    _launchTown(du.townId);
  }

  function cancelDenomUpgrade() {
    state.denomUpgrade = null;
  }

  function handleDenomUpgradeInput(input, keysJustPressed) {
    const du = state.denomUpgrade;
    if (!du) return;
    const defs = (typeof window !== "undefined" && window.BattlechurchPowerupDefinitions?.churchPowerupDefs) || {};
    const powerupKeys = Object.keys(defs).filter(function(k) { return !defs[k].disabled; });
    const confirmIndex = powerupKeys.length;
    const totalSlots = powerupKeys.length + 1; // cards + confirm

    const direction = getNavigationDirection(input, keysJustPressed);
    if (direction === "left" || direction === "up") {
      du.focusedIndex = (du.focusedIndex - 1 + totalSlots) % totalSlots;
      if (typeof window.playMenuMoveSfx === "function") window.playMenuMoveSfx(0.4);
    } else if (direction === "right" || direction === "down") {
      du.focusedIndex = (du.focusedIndex + 1) % totalSlots;
      if (typeof window.playMenuMoveSfx === "function") window.playMenuMoveSfx(0.4);
    }

    const confirmPressed =
      keysJustPressed.has(" ") ||
      keysJustPressed.has("enter") ||
      keysJustPressed.has("Enter") ||
      keysJustPressed.has("ArrowLeft");
    if (confirmPressed) {
      if (du.focusedIndex === confirmIndex) {
        confirmDenomUpgrade();
      } else {
        const key = powerupKeys[du.focusedIndex];
        if (key) {
          const idx = du.selectedKeys.indexOf(key);
          if (idx >= 0) {
            du.selectedKeys.splice(idx, 1);
          } else if (du.selectedKeys.length < du.maxPicks) {
            du.selectedKeys.push(key);
          }
          if (typeof window.playMenuItemPickSfx === "function") window.playMenuItemPickSfx(0.55);
        }
      }
    }

    const backPressed = keysJustPressed.has("escape") || keysJustPressed.has("Escape");
    if (backPressed) {
      cancelDenomUpgrade();
      if (typeof window.playMenuItemPickSfx === "function") window.playMenuItemPickSfx(0.55);
    }
  }

  function handleMapInput() {
    const input = window.Input;
    if (!input) return;
    const keysJustPressed = input.keysJustPressed;
    if (!keysJustPressed) return;

    if (state.denomUpgrade?.active) {
      handleDenomUpgradeInput(input, keysJustPressed);
      keysJustPressed.clear();
      return;
    }

    const prevSelection = state.selectedTownId;
    if (state.panelOpen) {
      if (handlePanelInput(input, keysJustPressed)) {
        keysJustPressed.clear();
        return;
      }
    }

    const direction = getNavigationDirection(input, keysJustPressed);
    if (direction) state.selectedTownId = pickNextTown(direction);

    if (state.selectedTownId && state.selectedTownId !== prevSelection) {
      if (typeof window !== "undefined" && typeof window.playMenuItemPickSfx === "function") {
        window.playMenuItemPickSfx(0.55);
      }
    }

    const confirmPressed =
      keysJustPressed.has(" ") ||
      keysJustPressed.has("enter") ||
      keysJustPressed.has("Enter") ||
      keysJustPressed.has("ArrowLeft");
    if (confirmPressed) {
      if (state.selectedTownId) {
        openTownPanel(state.selectedTownId);
      }
    }

    const backPressed =
      keysJustPressed.has("escape") ||
      keysJustPressed.has("Escape") ||
      keysJustPressed.has("ArrowDown");
    if (backPressed && typeof window.exitMapScreen === "function") {
      window.exitMapScreen();
    }

    if (keysJustPressed.size) {
      keysJustPressed.clear();
    }
  }

  function handleMapClicks(rect) {
    const input = window.Input;
    if (!input?.consumeCanvasClick) return;
    const click = input.consumeCanvasClick();
    if (!click) return;

    // Denom upgrade screen absorbs all clicks while active
    if (state.denomUpgrade?.active) {
      const buttons = (typeof window !== "undefined" && window.__denomUpgradeScreenButtons?.buttons) || [];
      const hit = buttons.find(function(b) {
        return click.x >= b.x && click.x <= b.x + b.width && click.y >= b.y && click.y <= b.y + b.height;
      });
      if (hit) {
        if (hit.key === "confirm") {
          if (hit.enabled !== false) {
            if (typeof window.playMenuItemPickSfx === "function") window.playMenuItemPickSfx(0.55);
            confirmDenomUpgrade();
          }
        } else {
          const du = state.denomUpgrade;
          const idx = du.selectedKeys.indexOf(hit.key);
          if (idx >= 0) {
            du.selectedKeys.splice(idx, 1);
          } else if (du.selectedKeys.length < du.maxPicks) {
            du.selectedKeys.push(hit.key);
          }
          if (typeof window.playMenuItemPickSfx === "function") window.playMenuItemPickSfx(0.55);
        }
      }
      return;
    }

    if (state.panelOpen && state.panelButtons) {
      const hit = state.panelButtons.find(
        (btn) => click.x >= btn.x && click.x <= btn.x + btn.width && click.y >= btn.y && click.y <= btn.y + btn.height,
      );
      if (hit) {
        if (typeof window !== "undefined" && typeof window.playMenuItemPickSfx === "function") {
          window.playMenuItemPickSfx(0.55);
        }
        if (hit.key === "play") {
          startRunForTown(state.selectedTownId);
        } else {
          closeTownPanel();
        }
      return;
    }
    }
    const town = findTownAtPosition(click, rect);
    if (town && isTownUnlocked(town.id)) {
      if (town.id !== state.selectedTownId) {
        if (typeof window !== "undefined" && typeof window.playMenuItemPickSfx === "function") {
          window.playMenuItemPickSfx(0.55);
        }
      }
      openTownPanel(town.id);
    }
  }

  function updateSelectionFromHover(rect) {
    const input = window.Input;
    if (!input?.pointerState) return;
    const town = findTownAtPosition(input.pointerState, rect);
    if (town && isTownUnlocked(town.id)) {
      if (town.id !== state.selectedTownId) {
        state.selectedTownId = town.id;
        if (typeof window !== "undefined" && typeof window.playMenuItemPickSfx === "function") {
          window.playMenuItemPickSfx(0.4);
        }
      }
    }
  }

  function ensureNextTownUnlocked(progress, mapData) {
    if (!progress || !mapData) return;
    const allTowns = mapData.towns || [];
    const regularTowns = allTowns.filter((t) => t.type !== "capital");
    const unlockIds = new Set(progress.unlockedTownIds || []);

    // First town is always unlocked
    const firstTownId = mapData.getFirstTownId();
    if (firstTownId) unlockIds.add(firstTownId);

    // For each P1-completed regular town, unlock the next regular town in sequence
    let allRegularP1Done = regularTowns.length > 0;
    for (const town of regularTowns) {
      const p1Done = progress.towns[town.id]?.p1?.completed === true;
      if (!p1Done) {
        allRegularP1Done = false;
        continue;
      }
      const nextId = getNextTownInOrder(town.id);
      if (nextId) {
        const nextTown = allTowns.find((t) => t.id === nextId);
        if (nextTown && nextTown.type !== "capital") unlockIds.add(nextId);
      }
    }

    // Capital unlocks only when all 9 regular towns have P1 done
    if (allRegularP1Done) {
      const capital = allTowns.find((t) => t.type === "capital");
      if (capital) unlockIds.add(capital.id);
    }

    progress.unlockedTownIds = Array.from(unlockIds);
  }

  function getNextTownInOrder(townId) {
    const mapData = window.BattlechurchMapData;
    if (!mapData || !townId) return null;
    const town = getTownById(townId);
    if (!town) return null;

    // Capital (Highgate) is the final town - no next town
    if (town.type === "capital") return null;

    const districts = mapData.getDistricts();
    const districtIndex = districts.findIndex((d) => d.id === town.districtId);
    if (districtIndex < 0) return null;

    const townsInDistrict = mapData.getTownsByDistrict(districts[districtIndex].id);
    const townIndex = townsInDistrict.findIndex((t) => t.id === townId);

    // Next town in same district
    if (townIndex >= 0 && townIndex < townsInDistrict.length - 1) {
      return townsInDistrict[townIndex + 1].id;
    }

    // First town in next district
    if (districtIndex < districts.length - 1) {
      const nextDistrictTowns = mapData.getTownsByDistrict(districts[districtIndex + 1].id);
      if (nextDistrictTowns.length) return nextDistrictTowns[0].id;
    }

    // All districts done - go to capital (Highgate)
    const capital = mapData.towns.find((t) => t.type === "capital");
    return capital ? capital.id : null;
  }

  // --- Campaign phase / unlock helpers ---

  // Returns true if all towns in a county have the given campaign completed
  function isCountyDone(districtId, campaign, progress) {
    const mapData = window.BattlechurchMapData;
    if (!mapData || !districtId || !progress) return false;
    const towns = mapData.getTownsByDistrict(districtId);
    return towns.length > 0 && towns.every((t) => progress.towns[t.id]?.[campaign]?.completed === true);
  }

  // Returns true if P2 is unlocked for this town (county has all P1s done)
  function isP2UnlockedForTown(townId, progress) {
    const town = getTownById(townId);
    if (!town || town.type === "capital") return false;
    return isCountyDone(town.districtId, "p1", progress);
  }

  // Returns true if P3 is unlocked for this town (county has all P2s done)
  function isP3UnlockedForTown(townId, progress) {
    const town = getTownById(townId);
    if (!town || town.type === "capital") return false;
    return isCountyDone(town.districtId, "p2", progress);
  }

  // Returns true if capital (Highgate) is unlocked (all 9 regular towns P1 done)
  function isCapitalUnlocked(progress) {
    const mapData = window.BattlechurchMapData;
    if (!mapData || !progress) return false;
    const regularTowns = mapData.towns.filter((t) => t.type !== "capital");
    return regularTowns.length > 0 && regularTowns.every((t) => progress.towns[t.id]?.p1?.completed === true);
  }

  // Returns the status of a county for the operation box
  function getCountyOperationStatus(districtId, progress) {
    const mapData = window.BattlechurchMapData;
    if (!mapData || !progress) return "advancing";
    const towns = mapData.getTownsByDistrict(districtId).slice(0, 3);
    if (!towns.length) return "advancing";
    const allP3 = towns.every((t) => progress.towns?.[t.id]?.p3?.completed === true);
    if (allP3) return "secured";
    const allP2 = towns.every((t) => progress.towns?.[t.id]?.p2?.completed === true);
    if (allP2) return "final_push";
    const allP1 = towns.every((t) => progress.towns?.[t.id]?.p1?.completed === true);
    if (allP1) return "contested";
    return "advancing";
  }

  // Returns the active military operation to display in the status box
  function getActiveOperation(progress) {
    const mapData = window.BattlechurchMapData;
    const defaultOp = {
      name: "WESTREACH", statusLine: "Secure the beachhead",
      color: "#D4A843", glow: "rgba(212,168,67,0.5)",
    };
    if (!mapData || !progress) return defaultOp;

    const districts = mapData.getDistricts(); // sorted by order
    const districtObjectives = {
      northwest: {
        name: "WESTREACH",
        advancing:   "Secure the beachhead",
        contested:   "Hold the beachhead",
        final_push:  "Clear the county",
      },
      northeast: {
        name: "ASHVALE",
        advancing:   "Push inland",
        contested:   "Deny the counteroffensive",
        final_push:  "Break the resistance",
      },
      southwest: {
        name: "LOWMARCH",
        advancing:   "Cut off the capital",
        contested:   "Hold the flanks",
        final_push:  "Encircle Highgate",
      },
    };

    // Show the front line — furthest county the player has reached that isn't fully secured
    let activeDistrict = null;
    for (const district of districts) {
      const towns = mapData.getTownsByDistrict(district.id).slice(0, 3);
      const hasActivity = towns.some((t) => isTownUnlocked(t.id) || progress.towns?.[t.id] != null);
      const status = getCountyOperationStatus(district.id, progress);
      if (hasActivity && status !== "secured") activeDistrict = district;
    }

    if (activeDistrict) {
      const status = getCountyOperationStatus(activeDistrict.id, progress);
      const obj = districtObjectives[activeDistrict.id];
      const name = obj?.name || activeDistrict.name.toUpperCase();
      const statusLine = obj?.[status] || "Advance";
      if (status === "contested") {
        return { name, statusLine, color: "#FF6B6B", glow: "rgba(255,107,107,0.5)" };
      }
      if (status === "final_push") {
        return { name, statusLine, color: "#A8E890", glow: "rgba(168,232,144,0.5)" };
      }
      return { name, statusLine, color: "#D4A843", glow: "rgba(212,168,67,0.5)" };
    }

    // All regular counties secured — check capital
    const capital = mapData.towns.find((t) => t.type === "capital");
    if (capital && progress.towns?.[capital.id]?.p1?.completed) {
      return { name: "HIGHGATE", statusLine: "All objectives met", color: "#FFD978", glow: "rgba(255,217,120,0.5)" };
    }
    return { name: "HIGHGATE", statusLine: "Storm the gates", color: "#FF4040", glow: "rgba(255,64,64,0.55)" };
  }

  // Returns 'p1' | 'p2' | 'p3' — the next campaign to play for a town
  function getNextCampaignForTown(townId, progress) {
    if (!progress) return "p1";
    const townEntry = progress.towns?.[townId];
    if (!townEntry?.p1?.completed) return "p1";
    if (!townEntry?.p2?.completed) return "p2";
    return "p3"; // p3 done or in progress — replay p3 if all done
  }

  // Merges church powerup levels from prior campaigns for the given campaign
  function mergeChurchPowerupLevels(townId, campaign, progress) {
    if (campaign === "p1") return {};
    const p1Levels = progress?.towns?.[townId]?.p1?.churchPowerupLevels || {};
    if (campaign === "p2") return { ...p1Levels };
    const p2Levels = progress?.towns?.[townId]?.p2?.churchPowerupLevels || {};
    // P3: merge P1+P2, taking the max level per powerup
    const merged = { ...p1Levels };
    for (const [id, lvl] of Object.entries(p2Levels)) {
      merged[id] = Math.max(merged[id] ?? 0, lvl);
    }
    return merged;
  }

  // Returns the capital score multiplier based on P2/P3 completion across all 9 regular towns
  function getCapitalScoreMultiplier(progress) {
    const mapData = window.BattlechurchMapData;
    if (!mapData || !progress) return 1.0;
    const regularTowns = mapData.towns.filter((t) => t.type !== "capital");
    if (!regularTowns.length) return 1.0;
    const allP3 = regularTowns.every((t) => progress.towns?.[t.id]?.p3?.completed === true);
    if (allP3) return 1.1;
    const allP2 = regularTowns.every((t) => progress.towns?.[t.id]?.p2?.completed === true);
    if (allP2) return 1.05;
    return 1.0;
  }

  // Returns all data needed to start a campaign run for a town
  function getTownCampaignData(townId) {
    const progress = ensureProgress();
    const mapData = window.BattlechurchMapData;
    const defaultStart = mapData ? mapData.getDefaultTownStartCount(townId) : 50;
    if (!progress) {
      return { campaign: "p1", startCount: defaultStart, campaignMultiplier: 1.0, restoredChurchPowerupLevels: {} };
    }
    const campaign = getNextCampaignForTown(townId, progress);
    let startCount;
    if (campaign === "p1") {
      startCount = defaultStart;
    } else if (campaign === "p2") {
      startCount = progress.towns?.[townId]?.p1?.bestCount ?? defaultStart;
    } else {
      startCount = progress.towns?.[townId]?.p2?.bestCount ?? defaultStart;
    }
    const multiplier = campaign === "p1" ? 1.0 : campaign === "p2" ? 1.15 : 1.1;
    const restoredChurchPowerupLevels = mergeChurchPowerupLevels(townId, campaign, progress);
    return { campaign, startCount, campaignMultiplier: multiplier, restoredChurchPowerupLevels };
  }

  function selectTown(townId) {
    if (!townId) return;
    state.selectedTownId = townId;
  }

  // campaign: 'p1' | 'p2' | 'p3'
  // savedChurchPowerupLevels: plain object { [powerupId]: 0|1|2 } (omit for p3)
  async function recordTownCompletion(townId, congregationCount, campaign, savedChurchPowerupLevels) {
    if (!townId) return;
    const mapData = window.BattlechurchMapData;
    if (!mapData) return;
    if (!state.mapProgress) {
      await loadPlayerProgress();
    }
    const progress = ensureProgress();
    if (!progress) return;

    const activeCampaign = campaign || "p1";
    const stars = mapData.calculateStars(congregationCount);

    if (!progress.towns[townId]) progress.towns[townId] = {};
    const existingCamp = progress.towns[townId][activeCampaign] || {};
    const currentBest = existingCamp.bestCount;

    const campData = {
      completed: true,
      stars: Math.max(existingCamp.stars || 0, stars),
      bestCount: currentBest == null || congregationCount > currentBest ? congregationCount : currentBest,
    };
    // Save powerup snapshot for P1 and P2 (P3 doesn't carry forward)
    if (activeCampaign !== "p3") {
      campData.churchPowerupLevels = savedChurchPowerupLevels || {};
    }
    progress.towns[townId][activeCampaign] = campData;

    // Recompute sequential town unlocks
    ensureNextTownUnlocked(progress, mapData);

    if (window.Cloud?.savePlayerDoc) {
      try {
        await window.Cloud.savePlayerDoc({ mapProgress: progress });
      } catch (e) {}
    }
  }

  function open() {
    state.active = true;
    state.panelOpen = false;
    if (!state.selectedTownId) state.selectedTownId = pickInitialTown();
    loadPlayerProgress();
    if (typeof window.startMapMusic === "function") {
      window.startMapMusic();
    }
    startMapAmbient();
  }

  function close() {
    state.active = false;
    state.panelOpen = false;
    stopMapAmbient();
  }

  function update(dt) {
    if (!state.active) return;
    loadMapImage();
    handleMapInput();
    const mapData = window.BattlechurchMapData;
    if (mapData) {
      mapData.towns.forEach((town) => {
        const bestCount = getTownBestCount(town.id);
        const animState = getTownAnimatorState(town, bestCount);
        if (!animState) return;
        animState.animator.update(dt);
        updateAnimatorCycle(
          animState.animator,
          dt,
          animState,
          animState.minHold,
          animState.maxHold,
        );
      });
    }
  }

  function drawDenomUpgradeOverlay(ctx, canvas) {
    const du = state.denomUpgrade;
    if (!du || !du.active) return;
    if (!window.Renderer?.drawDenomUpgradeScreen) return;
    const defs = (typeof window !== "undefined" && window.BattlechurchPowerupDefinitions?.churchPowerupDefs) || {};
    const stats = Object.entries(defs)
      .filter(function(entry) { return !entry[1].disabled; })
      .map(function(entry) {
        return { key: entry[0], label: entry[1].label, description: entry[1].description, iconSrc: entry[1].iconSrc };
      });
    const uiFontFamily = (typeof window !== "undefined" && window.UI_FONT_FAMILY) || "'Orbitron', sans-serif";
    window.Renderer.drawDenomUpgradeScreen(ctx, canvas, {
      stats: stats,
      selectedKeys: du.selectedKeys,
      maxPicks: du.maxPicks,
      focusedIndex: du.focusedIndex,
      uiFontFamily: uiFontFamily,
    });
  }

  function draw(ctx, canvas) {
    if (!state.active) return;
    ctx.save();
    const rect = drawMapBackground(ctx, canvas);
    const fireOverlay = typeof window !== "undefined" ? window.fireOverlay : null;
    if (fireOverlay && typeof fireOverlay.draw === "function") {
      if (typeof fireOverlay.setBounds === "function") {
        fireOverlay.setBounds(0, 0, canvas.width, canvas.height);
      }
      if (typeof fireOverlay.setIntensity === "function") {
        fireOverlay.setIntensity(1.8);
      }
      if (typeof fireOverlay.setSizeScale === "function") {
        fireOverlay.setSizeScale(1);
      }
      fireOverlay.draw(ctx);
    }
    drawMapLabels(ctx, canvas, rect);
    updateSelectionFromHover(rect);
    const pulse = Math.sin((Date.now() / 1000) * 3) * 2;
    const mapData = window.BattlechurchMapData;
    if (mapData) {
      mapData.towns.forEach((town) => drawTownNode(ctx, town, rect, pulse));
    }
    handleMapClicks(rect);
    drawTownPanel(ctx, canvas);
    drawPhaseBox(ctx, rect);
    drawDenomUpgradeOverlay(ctx, canvas);
    ctx.restore();
  }

  window.MapScreen = {
    open,
    close,
    update,
    draw,
    recordTownCompletion,
    getNextTownInOrder,
    selectTown,
    setAssets,
    getTownStartCount,
    ensureTownStartCount,
    getTownCampaignData,
    getNextCampaignForTown,
    isP2UnlockedForTown,
    isP3UnlockedForTown,
    isCountyDone,
    isCapitalUnlocked,
    getCapitalScoreMultiplier,
    updateAmbient: updateMapAmbient,
    startAmbient: startMapAmbient,
    stopAmbient: stopMapAmbient,
    isActive: () => state.active,
    get mapRect() { return { ...state.mapRect }; },
  };
})(typeof window !== "undefined" ? window : null);
