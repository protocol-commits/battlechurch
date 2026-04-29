(function setupMapScreen(window) {
  if (!window) return;

  const MAP_IMAGE_PRIMARY = "./assets/backgrounds/map.jpg";
  const MAP_IMAGE_FALLBACK = "./assets/backgrounds/map.jpg";
  const HIT_RADIUS_BASE = 10;
  const UI_FONT_FAMILY = "'Orbitron', sans-serif";
  const MAP_HELLFIRE_TEXT = Object.freeze({
    title: "#F2C87D",
    body: "#E7B066",
    dim: "rgba(231, 176, 102, 0.68)",
  });

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
    demoProfile: null,
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
    armyMarch: {
      active: false,
      phase: "idle",
      townId: null,
      fromX: 0,
      fromY: 0,
      toX: 0,
      toY: 0,
      timer: 0,
      dashDuration: 1.4,
      xHoldDuration: 0.6,
      fadeDuration: 0.4,
      dashCount: 16,
      dashSpacing: 0.09,
      onDone: null,
      lastTownId: null,
      hasStartedOnce: false,
    },
  };
  const DEFAULT_SAVE_ID = "main";

  function deepClone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (e) {
      return null;
    }
  }

  function createFreshMapProgress(mapData) {
    const firstTownId = mapData?.getFirstTownId?.() || null;
    return {
      version: 2,
      towns: {},
      unlockedTownIds: firstTownId ? [firstTownId] : [],
      graceCount: 0,
      activeRun: null,
    };
  }

  function normalizePlayerDocForSaves(playerDoc, mapData) {
    const normalized = playerDoc && typeof playerDoc === "object" ? deepClone(playerDoc) || {} : {};
    let dirty = false;
    if (!normalized.saveFiles || typeof normalized.saveFiles !== "object" || Array.isArray(normalized.saveFiles)) {
      const legacyMapProgress =
        normalized.mapProgress && typeof normalized.mapProgress === "object"
          ? normalized.mapProgress
          : createFreshMapProgress(mapData);
      normalized.saveFiles = {
        [DEFAULT_SAVE_ID]: {
          saveName: "Main Save",
          playerName: "Pastor",
          createdAt: Date.now(),
          lastPlayedAt: Date.now(),
          playtimeSec: 0,
          mapProgress: legacyMapProgress,
        },
      };
      normalized.activeSaveId = DEFAULT_SAVE_ID;
      dirty = true;
    }

    const saveIds = Object.keys(normalized.saveFiles);
    if (!saveIds.length) {
      normalized.saveFiles[DEFAULT_SAVE_ID] = {
        saveName: "Main Save",
        playerName: "Pastor",
        createdAt: Date.now(),
        lastPlayedAt: Date.now(),
        playtimeSec: 0,
        mapProgress: createFreshMapProgress(mapData),
      };
      normalized.activeSaveId = DEFAULT_SAVE_ID;
      dirty = true;
    }

    for (const saveId of Object.keys(normalized.saveFiles)) {
      const save = normalized.saveFiles[saveId];
      if (!save || typeof save !== "object") {
        normalized.saveFiles[saveId] = {
          saveName: `Save ${saveId}`,
          playerName: "Pastor",
          createdAt: Date.now(),
          lastPlayedAt: Date.now(),
          playtimeSec: 0,
          mapProgress: createFreshMapProgress(mapData),
        };
        dirty = true;
        continue;
      }
      if (!save.saveName || typeof save.saveName !== "string") {
        save.saveName = `Save ${saveId}`;
        dirty = true;
      }
      if (!save.playerName || typeof save.playerName !== "string") {
        save.playerName = "Pastor";
        dirty = true;
      }
      if (!Number.isFinite(save.createdAt)) {
        save.createdAt = Date.now();
        dirty = true;
      }
      if (!Number.isFinite(save.lastPlayedAt)) {
        save.lastPlayedAt = save.createdAt || Date.now();
        dirty = true;
      }
      if (!Number.isFinite(save.playtimeSec) || save.playtimeSec < 0) {
        save.playtimeSec = 0;
        dirty = true;
      }
      if (!save.mapProgress || typeof save.mapProgress !== "object") {
        save.mapProgress = createFreshMapProgress(mapData);
        dirty = true;
      }
      if (!Number.isFinite(save.mapProgress.graceCount) || save.mapProgress.graceCount < 0) {
        save.mapProgress.graceCount = 0;
        dirty = true;
      }
      if (!("activeRun" in save.mapProgress)) {
        save.mapProgress.activeRun = null;
        dirty = true;
      }
    }

    if (!normalized.activeSaveId || !normalized.saveFiles[normalized.activeSaveId]) {
      normalized.activeSaveId = Object.keys(normalized.saveFiles)[0] || DEFAULT_SAVE_ID;
      dirty = true;
    }
    normalized.mapProgress = normalized.saveFiles[normalized.activeSaveId]?.mapProgress || createFreshMapProgress(mapData);
    return { doc: normalized, dirty };
  }

  function getActiveSave() {
    const saveId = state.playerDoc?.activeSaveId;
    if (!saveId) return null;
    const save = state.playerDoc?.saveFiles?.[saveId];
    return save && typeof save === "object" ? save : null;
  }

  function syncActiveSaveProgressMirror() {
    if (typeof window !== "undefined" && window.__demoSandboxRunActive) return;
    if (!state.playerDoc || typeof state.playerDoc !== "object") return;
    const activeSave = getActiveSave();
    if (!activeSave) return;
    activeSave.mapProgress = state.mapProgress;
    state.playerDoc.mapProgress = state.mapProgress;
  }

  async function persistPlayerDoc() {
    if (!state.playerDoc || typeof state.playerDoc !== "object") return false;
    if (!window.Cloud?.savePlayerDoc) return false;
    if (typeof window !== "undefined" && window.__demoSandboxRunActive) {
      return true;
    }
    try {
      await window.Cloud.savePlayerDoc({
        saveFiles: state.playerDoc.saveFiles,
        activeSaveId: state.playerDoc.activeSaveId,
        mapProgress: state.playerDoc.mapProgress,
      });
      return true;
    } catch (e) {
      return false;
    }
  }

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
    const firstTownId = mapData.getFirstTownId();
    if (firstTownId && !state.mapProgress.unlockedTownIds.includes(firstTownId)) {
      state.mapProgress.unlockedTownIds.push(firstTownId);
    }
    ensureNextTownUnlocked(state.mapProgress, mapData);
    syncActiveSaveProgressMirror();
    return state.mapProgress;
  }

  async function loadPlayerProgress() {
    if (state.loading) return;
    state.loading = true;
    try {
      if (typeof window !== "undefined" && window.__demoSandboxRunActive && state.demoProfile?.mapProgress) {
        state.mapProgress = deepClone(state.demoProfile.mapProgress) || state.demoProfile.mapProgress;
        const progress = ensureProgress();
        if (!state.selectedTownId || !isTownUnlocked(state.selectedTownId)) {
          state.selectedTownId = pickInitialTown();
        }
        state.demoProfile.mapProgress = progress;
        return;
      }
      state.demoProfile = null;
      if (window.Cloud?.initCloud) {
        await window.Cloud.initCloud();
      }
      if (window.Cloud?.loadPlayerDoc) {
        state.playerDoc = await window.Cloud.loadPlayerDoc();
      }
      const normalized = normalizePlayerDocForSaves(state.playerDoc, window.BattlechurchMapData);
      state.playerDoc = normalized.doc;
      state.mapProgress = state.playerDoc?.saveFiles?.[state.playerDoc?.activeSaveId]?.mapProgress || null;
      const progress = ensureProgress();
      const isV2 = progress?.version === 2;
      if ((normalized.dirty || !isV2) && window.Cloud?.savePlayerDoc) {
        await persistPlayerDoc();
      }
      if (!state.selectedTownId || !isTownUnlocked(state.selectedTownId)) {
        state.selectedTownId = pickInitialTown();
      }
    } catch (e) {
      // Offline/local fallback: keep map playable with in-memory fresh progress.
      const fallback = normalizePlayerDocForSaves(state.playerDoc, window.BattlechurchMapData);
      state.playerDoc = fallback.doc;
      state.mapProgress = state.playerDoc?.saveFiles?.[state.playerDoc?.activeSaveId]?.mapProgress || null;
      state.mapProgress = ensureProgress();
      if (!state.selectedTownId || !isTownUnlocked(state.selectedTownId)) {
        state.selectedTownId = pickInitialTown();
      }
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

  function getTownCampaignCompletionCount(townId) {
    // Returns number of completed campaigns (0-3), used for map node glow scaling.
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

  function getTownDisplayCount(townId) {
    const best = getTownBestCount(townId);
    if (Number.isFinite(best)) return Math.max(0, Math.round(best));
    return isTownUnlocked(townId) ? 0 : null;
  }

  function getTotalCongregationCount() {
    const mapData = window.BattlechurchMapData;
    if (!mapData?.towns?.length) return 0;
    let total = 0;
    for (const town of mapData.towns) {
      if (!town?.id || !isTownUnlocked(town.id)) continue;
      const count = getTownDisplayCount(town.id);
      if (Number.isFinite(count)) total += count;
    }
    return total;
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
    // Use cover so map.jpg always fills the viewport with no top/bottom letterbox gaps.
    const scale = Math.max(canvas.width / mapImage.width, canvas.height / mapImage.height);
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
    const dotY = position.y - radius - 40 * scale;
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
    const completionCount = getTownCampaignCompletionCount(town.id);
    const bestCount = getTownBestCount(town.id);
    const displayCount = getTownDisplayCount(town.id);
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
      const glowSteps = Math.max(1, Math.min(3, completionCount || 1));
      const glowRadius = (glowSteps * 100) * (isCapital ? 1.3 : 1);
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
    if (displayCount != null) {
      ctx.save();
      const nameSize = Math.round(14 * (rect.w / 1280));
      ctx.font = `600 ${nameSize}px ${UI_FONT_FAMILY}`;
      ctx.fillStyle = MAP_HELLFIRE_TEXT.title;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.shadowColor = "rgba(6, 10, 18, 0.85)";
      ctx.shadowBlur = 10;
      ctx.fillText(`${town.name} (${Math.round(displayCount)})`, position.x, position.y - radius - 10);
      ctx.restore();
    } else if (selected) {
      ctx.save();
      ctx.font = `600 ${Math.round(16 * (rect.w / 1280))}px ${UI_FONT_FAMILY}`;
      ctx.fillStyle = unlocked ? MAP_HELLFIRE_TEXT.title : MAP_HELLFIRE_TEXT.dim;
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

  function drawMapLabels(ctx, canvas, rect) {
    // Map title/subhead are rendered in renderer.js to keep map text
    // presentation centralized and avoid duplicate headings.
    return;
  }

  function drawTotalCongregationBadge(ctx, canvas) {
    const total = getTotalCongregationCount();
    const label = "Total Congregation";
    const value = Number(total || 0).toLocaleString();
    const badgeW = Math.max(260, Math.round(canvas.width * 0.24));
    const badgeH = 62;
    const x = 28;
    const y = canvas.height - badgeH - 28;
    ctx.save();
    const gradient = ctx.createLinearGradient(0, y, 0, y + badgeH);
    gradient.addColorStop(0, "rgba(22, 10, 8, 0.9)");
    gradient.addColorStop(1, "rgba(10, 6, 8, 0.94)");
    ctx.fillStyle = gradient;
    ctx.strokeStyle = "rgba(255, 206, 136, 0.8)";
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, badgeW, badgeH, 12, true, true);
    ctx.fillStyle = "rgba(255, 206, 136, 0.92)";
    ctx.font = `600 13px ${UI_FONT_FAMILY}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(label, x + 14, y + 10);
    ctx.fillStyle = "#FFE7B8";
    ctx.font = `700 24px ${UI_FONT_FAMILY}`;
    ctx.textBaseline = "alphabetic";
    ctx.fillText(value, x + 14, y + badgeH - 12);
    ctx.restore();
  }

  function findTownAtPosition(point, rect) {
    const mapData = window.BattlechurchMapData;
    if (!mapData) return null;
    const dpr = window.devicePixelRatio || 1;
    // Use a larger hit radius than the visual node to make clicking easier
    const radius = HIT_RADIUS_BASE * dpr * 2.8;
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
    const panelStyle = window.UIStyles?.panels?.hellfire?.withEyebrow || {};
    const shellStyle = window.UIStyles?.panels?.hellfire?.shell || {};
    const dividerStyle = window.UIStyles?.panels?.hellfire?.divider || {};
    const panelW = Math.min(panelStyle.panelWidthMax ?? 560, canvas.width * (panelStyle.panelWidthRatio ?? 0.76));
    const panelH = panelStyle.panelHeight ?? 252;
    const panelX = canvas.width / 2 - panelW / 2;
    const panelY = canvas.height - panelH - (panelStyle.panelBottomOffset ?? 40);

    ctx.save();
    ctx.shadowColor = shellStyle.shadowColor || "rgba(0, 0, 0, 0.45)";
    ctx.shadowBlur = shellStyle.shadowBlur ?? 24;
    ctx.shadowOffsetY = shellStyle.shadowOffsetY ?? 10;
    const panelGradient = ctx.createLinearGradient(0, panelY, 0, panelY + panelH);
    panelGradient.addColorStop(0, shellStyle.gradientTop || "rgba(12, 18, 30, 0.95)");
    panelGradient.addColorStop(1, shellStyle.gradientBottom || "rgba(7, 10, 18, 0.95)");
    ctx.fillStyle = panelGradient;
    ctx.strokeStyle = shellStyle.borderColor || "rgba(255, 218, 162, 0.34)";
    ctx.lineWidth = shellStyle.borderWidth ?? 2;
    roundRect(ctx, panelX, panelY, panelW, panelH, shellStyle.radius ?? 18, true, true);
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    const centerX = canvas.width / 2;
    ctx.fillStyle = panelStyle.eyebrowColor || MAP_HELLFIRE_TEXT.dim;
    ctx.font = `700 ${panelStyle.eyebrowFontSize ?? 11}px ${UI_FONT_FAMILY}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(panelStyle.eyebrowText || "TOWN TARGETED", centerX, panelY + (panelStyle.eyebrowY ?? 14));

    ctx.fillStyle = panelStyle.titleColor || "#FFD978";
    ctx.font = `700 ${panelStyle.titleFontSize ?? 28}px ${UI_FONT_FAMILY}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(town.name, centerX, panelY + (panelStyle.titleY ?? 34));

    const district = town?.districtId ? getDistrictById(town.districtId) : null;
    const areaNumber = Number.isFinite(district?.order) ? district.order + 1 : null;
    const areaLabel = Number.isFinite(areaNumber) ? `District ${areaNumber}` : "";
    const districtScopeLabel = Number.isFinite(areaNumber) ? `District ${areaNumber}` : "this District";
    const hasAreaLabel = Boolean(areaLabel);
    const areaVerticalOffset = hasAreaLabel ? 18 : 0;
    if (hasAreaLabel) {
      const areaY = panelY + (panelStyle.titleY ?? 34) + (panelStyle.titleFontSize ?? 28) + 4;
      ctx.fillStyle = panelStyle.eyebrowColor || MAP_HELLFIRE_TEXT.dim;
      ctx.font = `600 ${Math.max(10, (panelStyle.eyebrowFontSize ?? 11) + 1)}px ${UI_FONT_FAMILY}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(areaLabel, centerX, areaY);
    }

    ctx.strokeStyle = dividerStyle.color || "rgba(255, 214, 148, 0.22)";
    ctx.lineWidth = dividerStyle.width ?? 1;
    ctx.beginPath();
    ctx.moveTo(panelX + (dividerStyle.insetX ?? 24), panelY + (panelStyle.dividerY ?? 78) + areaVerticalOffset);
    ctx.lineTo(panelX + panelW - (dividerStyle.insetX ?? 24), panelY + (panelStyle.dividerY ?? 78) + areaVerticalOffset);
    ctx.stroke();

    const progress = ensureProgress();
    let primaryLine = "";
    let secondaryLine = "";
    if (town.type === "capital") {
      primaryLine = "Final Mission";
      secondaryLine = `Score Multiplier: ×${getCapitalScoreMultiplier(progress).toFixed(2)}`;
    } else {
      const nextCamp = progress ? getNextCampaignForTown(town.id, progress) : "p1";
      const _phases = window.BattlechurchCampaignLabels?.phases || {};
      const campLabel = _phases[nextCamp] || nextCamp.toUpperCase();
      const campAvail =
        nextCamp === "p1" ||
        (nextCamp === "p2" ? isP2UnlockedForTown(town.id, progress) : isP3UnlockedForTown(town.id, progress));
      const townEntry = progress?.towns?.[town.id] || {};
      const completedVisits = ["p1", "p2", "p3"].reduce(
        (sum, camp) => sum + (townEntry?.[camp]?.completed === true ? 1 : 0),
        0,
      );
      primaryLine = `Current Phase: ${campLabel}${campAvail ? "" : " (Locked)"}`;
      if (campAvail) {
        secondaryLine = `Missions Completed: ${completedVisits}/3`;
      } else if (nextCamp === "p2") {
        secondaryLine = `Complete ${_phases.p1 || "Invasion"} in all ${districtScopeLabel} towns to unlock ${_phases.p2 || "Occupation"}.`;
      } else {
        secondaryLine = `Complete ${_phases.p2 || "Occupation"} in all ${districtScopeLabel} towns to unlock ${_phases.p3 || "Fortification"}.`;
      }
    }
    ctx.fillStyle = panelStyle.primaryColor || MAP_HELLFIRE_TEXT.title;
    ctx.font = `600 ${panelStyle.primaryFontSize ?? 17}px ${UI_FONT_FAMILY}`;
    ctx.fillText(primaryLine, centerX, panelY + (panelStyle.primaryY ?? 94) + areaVerticalOffset);
    ctx.fillStyle = panelStyle.secondaryColor || MAP_HELLFIRE_TEXT.body;
    ctx.font = `500 ${panelStyle.secondaryFontSize ?? 14}px ${UI_FONT_FAMILY}`;
    ctx.fillText(secondaryLine, centerX, panelY + (panelStyle.secondaryY ?? 124) + areaVerticalOffset);

    const buttonW = 140;
    const buttonH = 44;
    const gap = 20;
    const buttonY = panelY + panelH - 68;
    const totalW = buttonW * 2 + gap;
    const startX = canvas.width / 2 - totalW / 2;
    // Check if gameplay assets are still loading
    const isLoading = typeof window !== "undefined" && !window.gameAssetsLoaded;
    const loadProgress = (typeof window !== "undefined" && window.gameLoadingProgress) || 0;
    const buttonPalette = {
      top: "#D76B2D",
      bottom: "#8D2F1E",
      border: "rgba(255, 210, 148, 0.82)",
      loadingBase: "rgba(62, 20, 14, 0.94)",
      loadingFill: "#F1882F",
      text: "#FBEBC9",
      textShadow: "rgba(34, 10, 8, 0.68)",
      focus: "#F6C06E",
    };
    const buttons = [
      { label: isLoading ? "Loading..." : "Play", x: startX, key: "play", isLoading },
      { label: "Back", x: startX + buttonW + gap, key: "back", isLoading: false },
    ];

    buttons.forEach((btn, index) => {
      ctx.save();
      if (btn.isLoading) {
        // Loading button with progress bar
        ctx.fillStyle = buttonPalette.loadingBase;
        ctx.strokeStyle = buttonPalette.border;
        ctx.lineWidth = 2;
        roundRect(ctx, btn.x, buttonY, buttonW, buttonH, 16, true, true);
        // Progress fill
        const fillWidth = buttonW * (loadProgress / 100);
        if (fillWidth > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(btn.x, buttonY, buttonW, buttonH, 16);
          ctx.clip();
          ctx.fillStyle = buttonPalette.loadingFill;
          ctx.fillRect(btn.x, buttonY, fillWidth, buttonH);
          ctx.restore();
        }
      } else {
        const buttonGradient = ctx.createLinearGradient(0, buttonY, 0, buttonY + buttonH);
        buttonGradient.addColorStop(0, buttonPalette.top);
        buttonGradient.addColorStop(1, buttonPalette.bottom);
        ctx.fillStyle = buttonGradient;
        ctx.strokeStyle = buttonPalette.border;
        ctx.lineWidth = 2;
        roundRect(ctx, btn.x, buttonY, buttonW, buttonH, 16, true, true);
      }
      if (index === state.panelFocus) {
        ctx.strokeStyle = buttonPalette.focus;
        ctx.lineWidth = 3;
        roundRect(ctx, btn.x - 2, buttonY - 2, buttonW + 4, buttonH + 4, 18, false, true);
      }
      ctx.fillStyle = buttonPalette.text;
      ctx.shadowColor = buttonPalette.textShadow;
      ctx.shadowBlur = 5;
      ctx.shadowOffsetY = 1;
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
    beginArmyMarchToTown(townId, function() {
      _launchTown(townId);
    });
  }

  function devStartRunForTown(townId) {
    if (!townId) return false;
    state.selectedTownId = townId;
    state.panelOpen = false;
    startRunForTown(townId);
    return true;
  }

  function confirmDenomUpgrade() {
    const du = state.denomUpgrade;
    if (!du || !du.active || du.selectedKeys.length < du.maxPicks) return;
    if (typeof window !== "undefined") {
      window.pendingDenomPowerups = du.selectedKeys.slice();
    }
    state.denomUpgrade = null;
    beginArmyMarchToTown(du.townId, function() {
      _launchTown(du.townId);
    });
  }

  function cancelDenomUpgrade() {
    state.denomUpgrade = null;
  }

  function resetDenomSelections() {
    const du = state.denomUpgrade;
    if (!du || !du.active) return;
    if (du.selectedKeys.length > 0) {
      du.selectedKeys = [];
    }
    du.focusedIndex = 0;
  }

  function handleDenomUpgradeInput(input, keysJustPressed) {
    const du = state.denomUpgrade;
    if (!du) return;
    const defs = (typeof window !== "undefined" && window.BattlechurchPowerupDefinitions?.churchPowerupDefs) || {};
    const powerupKeys = Object.keys(defs).filter(function(k) { return !defs[k].disabled; });
    const confirmIndex = powerupKeys.length;
    const resetIndex = powerupKeys.length + 1;
    const totalSlots = powerupKeys.length + 2; // cards + confirm + reset

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
      } else if (du.focusedIndex === resetIndex) {
        resetDenomSelections();
        if (typeof window.playMenuItemPickSfx === "function") window.playMenuItemPickSfx(0.55);
      } else {
        const key = powerupKeys[du.focusedIndex];
        if (key) {
          const idx = du.selectedKeys.indexOf(key);
          if (idx >= 0) {
            du.selectedKeys.splice(idx, 1);
          } else if (du.selectedKeys.length < du.maxPicks) {
            du.selectedKeys.push(key);
            if (du.selectedKeys.length >= du.maxPicks) {
              du.focusedIndex = confirmIndex;
            }
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
    if (state.armyMarch?.active) {
      if (keysJustPressed.size) keysJustPressed.clear();
      return;
    }

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
    if (direction) {
      state.selectedTownId = pickNextTown(direction);
      // Give keyboard navigation priority until mouse moves again.
      if (input.pointerState) input.pointerState.active = false;
    }

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
    if (state.armyMarch?.active) return;
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
        } else if (hit.key === "reset") {
          if (hit.enabled !== false) {
            resetDenomSelections();
            if (typeof window.playMenuItemPickSfx === "function") window.playMenuItemPickSfx(0.55);
          }
        } else {
          const du = state.denomUpgrade;
          const idx = du.selectedKeys.indexOf(hit.key);
          if (idx >= 0) {
            du.selectedKeys.splice(idx, 1);
          } else if (du.selectedKeys.length < du.maxPicks) {
            du.selectedKeys.push(hit.key);
            if (du.selectedKeys.length >= du.maxPicks) {
              const defs = (typeof window !== "undefined" && window.BattlechurchPowerupDefinitions?.churchPowerupDefs) || {};
              const powerupKeys = Object.keys(defs).filter(function(k) { return !defs[k].disabled; });
              du.focusedIndex = powerupKeys.length;
            }
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
    if (!input?.pointerState?.active) return;
    if (state.armyMarch?.active) return;
    if (state.panelOpen) return;
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
    const activeRun = progress?.activeRun;
    const baseGraceCount = Number.isFinite(progress?.graceCount)
      ? Math.max(0, Math.round(progress.graceCount))
      : 0;
    const canResumeFromCheckpoint =
      activeRun &&
      activeRun.townId === townId &&
      activeRun.campaign === campaign &&
      Number.isFinite(activeRun.resumeLocalBattleNumber) &&
      activeRun.resumeLocalBattleNumber > 1;
    const restoredChurchPowerupLevels = canResumeFromCheckpoint
      ? { ...(activeRun.churchPowerupLevels || {}) }
      : mergeChurchPowerupLevels(townId, campaign, progress);
    const checkpointStartCount = Number.isFinite(activeRun?.startCount)
      ? Math.max(0, Math.round(activeRun.startCount))
      : null;
    const resolvedStartCount = canResumeFromCheckpoint && checkpointStartCount != null
      ? checkpointStartCount
      : startCount;
    const savedGraceCount = canResumeFromCheckpoint && Number.isFinite(activeRun?.graceCount)
      ? Math.max(0, Math.round(activeRun.graceCount))
      : baseGraceCount;
    return {
      campaign,
      startCount: resolvedStartCount,
      campaignMultiplier: multiplier,
      restoredChurchPowerupLevels,
      savedGraceCount,
      resumeLocalBattleNumber: canResumeFromCheckpoint
        ? Math.max(1, Math.floor(activeRun.resumeLocalBattleNumber))
        : 1,
      resumeFromCheckpoint: Boolean(canResumeFromCheckpoint),
    };
  }

  function selectTown(townId) {
    if (!townId) return;
    state.selectedTownId = townId;
  }

  // campaign: 'p1' | 'p2' | 'p3'
  // savedChurchPowerupLevels: plain object { [powerupId]: 0|1|2 } (omit for p3)
  async function recordTownCompletion(townId, congregationCount, campaign, savedChurchPowerupLevels, graceCount = null) {
    if (!townId) return;
    const mapData = window.BattlechurchMapData;
    if (!mapData) return;
    if (!state.mapProgress) {
      await loadPlayerProgress();
    }
    const progress = ensureProgress();
    if (!progress) return;

    const activeCampaign = campaign || "p1";

    if (!progress.towns[townId]) progress.towns[townId] = {};
    const existingCamp = progress.towns[townId][activeCampaign] || {};
    const currentBest = existingCamp.bestCount;

    const campData = {
      completed: true,
      bestCount: currentBest == null || congregationCount > currentBest ? congregationCount : currentBest,
    };
    // Save powerup snapshot for P1 and P2 (P3 doesn't carry forward)
    if (activeCampaign !== "p3") {
      campData.churchPowerupLevels = savedChurchPowerupLevels || {};
    }
    progress.towns[townId][activeCampaign] = campData;
    if (Number.isFinite(graceCount) && graceCount >= 0) {
      progress.graceCount = Math.max(0, Math.round(graceCount));
    }
    if (progress.activeRun && progress.activeRun.townId === townId && progress.activeRun.campaign === activeCampaign) {
      progress.activeRun = null;
    }

    // Recompute sequential town unlocks
    ensureNextTownUnlocked(progress, mapData);

    const activeSave = getActiveSave();
    if (activeSave) {
      activeSave.lastPlayedAt = Date.now();
    }
    syncActiveSaveProgressMirror();
    await persistPlayerDoc();
  }

  async function saveMissionCheckpoint({
    townId,
    campaign,
    resumeLocalBattleNumber,
    startCount,
    churchPowerupLevels,
    graceCount,
  } = {}) {
    if (!townId || !campaign) return false;
    const mapData = window.BattlechurchMapData;
    if (!mapData) return false;
    if (!state.mapProgress) {
      await loadPlayerProgress();
    }
    const progress = ensureProgress();
    if (!progress) return false;
    progress.activeRun = {
      townId,
      campaign,
      resumeLocalBattleNumber: Number.isFinite(resumeLocalBattleNumber)
        ? Math.max(1, Math.floor(resumeLocalBattleNumber))
        : 1,
      startCount: Number.isFinite(startCount) ? Math.max(0, Math.round(startCount)) : 0,
      churchPowerupLevels: churchPowerupLevels && typeof churchPowerupLevels === "object"
        ? { ...churchPowerupLevels }
        : {},
      graceCount: Number.isFinite(graceCount) ? Math.max(0, Math.round(graceCount)) : 0,
      savedAt: Date.now(),
    };
    if (Number.isFinite(graceCount) && graceCount >= 0) {
      progress.graceCount = Math.max(0, Math.round(graceCount));
    }
    const activeSave = getActiveSave();
    if (activeSave) {
      activeSave.lastPlayedAt = Date.now();
    }
    syncActiveSaveProgressMirror();
    return await persistPlayerDoc();
  }

  async function clearMissionCheckpoint(options = {}) {
    const townId = options && typeof options === "object" ? options.townId : null;
    const campaign = options && typeof options === "object" ? options.campaign : null;
    if (!state.mapProgress) {
      await loadPlayerProgress();
    }
    const progress = ensureProgress();
    if (!progress?.activeRun) return true;
    const matchesTown = !townId || progress.activeRun.townId === townId;
    const matchesCampaign = !campaign || progress.activeRun.campaign === campaign;
    if (!matchesTown || !matchesCampaign) return true;
    progress.activeRun = null;
    const activeSave = getActiveSave();
    if (activeSave) activeSave.lastPlayedAt = Date.now();
    syncActiveSaveProgressMirror();
    return await persistPlayerDoc();
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

  async function reloadProgress() {
    await loadPlayerProgress();
    return ensureProgress();
  }

  function getSaveFileSummaries() {
    const mapData = window.BattlechurchMapData;
    const towns = Array.isArray(mapData?.towns) ? mapData.towns : [];
    const saveFiles = state.playerDoc?.saveFiles || {};
    const activeSaveId = state.playerDoc?.activeSaveId || null;
    const summaries = Object.entries(saveFiles).map(([id, save]) => {
      const mapProgress = save?.mapProgress || { towns: {}, unlockedTownIds: [] };
      const completedP1Towns = towns.filter((town) => mapProgress?.towns?.[town.id]?.p1?.completed === true).length;
      const totalTowns = Math.max(1, towns.length || 10);
      let totalCongregationBest = 0;
      let totalReplayCompletions = 0;
      let totalUpgradeLevels = 0;
      const townProgressRows = towns.map((town) => {
        const townProgress = mapProgress?.towns?.[town.id] || {};
        const p1 = townProgress?.p1 || {};
        const p2 = townProgress?.p2 || {};
        const p3 = townProgress?.p3 || {};
        const campaignsCompleted = [p1, p2, p3].filter((campaign) => campaign?.completed === true).length;
        const bestCountByTown = [p1?.bestCount, p2?.bestCount, p3?.bestCount]
          .filter((value) => Number.isFinite(value))
          .reduce((max, value) => Math.max(max, Number(value)), 0);
        const bestCount = Math.max(0, Math.round(bestCountByTown));
        totalCongregationBest += bestCount;
        totalReplayCompletions += campaignsCompleted;
        const upgradeEntries = Object.entries(p1?.churchPowerupLevels || {}).filter(([, level]) => Number(level) > 0);
        const upgradeTypeCount = upgradeEntries.length;
        const upgradeLevelTotal = upgradeEntries.reduce((sum, [, level]) => sum + Number(level || 0), 0);
        totalUpgradeLevels += upgradeLevelTotal;
        return {
          townId: town.id,
          townName: town.name || town.id || "Unknown Town",
          p1Completed: p1?.completed === true,
          bestCount,
          completions: campaignsCompleted,
          upgradeTypeCount,
          upgradeLevelTotal,
        };
      });
      const firstTownId = mapData?.getFirstTownId?.() || towns[0]?.id || null;
      const regularTownIds = towns.filter((town) => town.type !== "capital").map((town) => town.id);
      const capitalTownId = towns.find((town) => town.type === "capital")?.id || null;
      const unlocked = new Set(firstTownId ? [firstTownId] : []);
      for (let i = 0; i < regularTownIds.length; i += 1) {
        if (mapProgress?.towns?.[regularTownIds[i]]?.p1?.completed === true && regularTownIds[i + 1]) {
          unlocked.add(regularTownIds[i + 1]);
        }
      }
      if (regularTownIds.length > 0 && regularTownIds.every((townId) => mapProgress?.towns?.[townId]?.p1?.completed === true) && capitalTownId) {
        unlocked.add(capitalTownId);
      }
      const orderedTownIds = towns.map((town) => town.id);
      const suggestedTownId =
        orderedTownIds.find((townId) => unlocked.has(townId) && !(mapProgress?.towns?.[townId]?.p1?.completed)) ||
        [...orderedTownIds].reverse().find((townId) => unlocked.has(townId)) ||
        firstTownId ||
        null;
      return {
        id,
        saveName: save?.saveName || `Save ${id}`,
        playerName: save?.playerName || "Pastor",
        createdAt: Number.isFinite(save?.createdAt) ? save.createdAt : null,
        lastPlayedAt: Number.isFinite(save?.lastPlayedAt) ? save.lastPlayedAt : null,
        playtimeSec: Number.isFinite(save?.playtimeSec) ? save.playtimeSec : 0,
        completedP1Towns,
        totalTowns,
        totalCongregationBest,
        totalReplayCompletions,
        totalUpgradeLevels,
        townProgressRows,
        suggestedTownId,
        suggestedTownName: towns.find((town) => town.id === suggestedTownId)?.name || "",
        isActive: id === activeSaveId,
      };
    });
    summaries.sort((a, b) => {
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      return (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0);
    });
    return { activeSaveId, saves: summaries };
  }

  async function setActiveSave(saveId) {
    if (!saveId || !state.playerDoc?.saveFiles?.[saveId]) return false;
    state.playerDoc.activeSaveId = saveId;
    state.mapProgress = state.playerDoc.saveFiles[saveId].mapProgress;
    ensureProgress();
    if (!state.selectedTownId || !isTownUnlocked(state.selectedTownId)) {
      state.selectedTownId = pickInitialTown();
    }
    const activeSave = getActiveSave();
    if (activeSave) activeSave.lastPlayedAt = Date.now();
    syncActiveSaveProgressMirror();
    await persistPlayerDoc();
    return true;
  }

  async function createSaveFile({ saveName, playerName, sourceSaveId = null, setActive = true } = {}) {
    if (!state.playerDoc || !state.playerDoc.saveFiles) return null;
    const baseId = String(Date.now());
    let saveId = `save_${baseId}`;
    while (state.playerDoc.saveFiles[saveId]) {
      saveId = `save_${baseId}_${Math.floor(Math.random() * 1000)}`;
    }
    const source = sourceSaveId && state.playerDoc.saveFiles[sourceSaveId]
      ? state.playerDoc.saveFiles[sourceSaveId]
      : null;
    // "New Save" should be fresh. Cloning only happens when sourceSaveId is provided ("Save File As").
    const sourceMapProgress = source?.mapProgress ? deepClone(source.mapProgress) : createFreshMapProgress(window.BattlechurchMapData);
    const fallbackPlayerName = state.playerDoc.saveFiles[state.playerDoc.activeSaveId]?.playerName || "Pastor";
    state.playerDoc.saveFiles[saveId] = {
      saveName: typeof saveName === "string" && saveName.trim() ? saveName.trim() : `Save ${Object.keys(state.playerDoc.saveFiles).length + 1}`,
      playerName: typeof playerName === "string" && playerName.trim() ? playerName.trim() : (source?.playerName || fallbackPlayerName),
      createdAt: Date.now(),
      lastPlayedAt: Date.now(),
      playtimeSec: 0,
      mapProgress: sourceMapProgress,
    };
    if (setActive) {
      state.playerDoc.activeSaveId = saveId;
      state.mapProgress = state.playerDoc.saveFiles[saveId].mapProgress;
      ensureProgress();
      if (!state.selectedTownId || !isTownUnlocked(state.selectedTownId)) {
        state.selectedTownId = pickInitialTown();
      }
    }
    syncActiveSaveProgressMirror();
    await persistPlayerDoc();
    return saveId;
  }

  async function resetSaveFile(saveId) {
    const target = state.playerDoc?.saveFiles?.[saveId];
    if (!target) return false;
    target.mapProgress = createFreshMapProgress(window.BattlechurchMapData);
    target.lastPlayedAt = Date.now();
    if (state.playerDoc.activeSaveId === saveId) {
      state.mapProgress = target.mapProgress;
      ensureProgress();
      if (!state.selectedTownId || !isTownUnlocked(state.selectedTownId)) {
        state.selectedTownId = pickInitialTown();
      }
    }
    syncActiveSaveProgressMirror();
    await persistPlayerDoc();
    return true;
  }

  async function devAwardNextTown({
    congregationCount = 100,
    campaign = "p1",
    churchPowerupLevels = {},
  } = {}) {
    const progress = ensureProgress();
    const mapData = window.BattlechurchMapData;
    if (!mapData?.towns?.length) return null;
    ensureNextTownUnlocked(progress, mapData);
    const orderedTowns = mapData.towns.filter((town) => town && town.id);
    const unlockedSet = new Set(progress.unlockedTownIds || []);
    const targetTown =
      orderedTowns.find((town) => unlockedSet.has(town.id) && !progress?.towns?.[town.id]?.p1?.completed) ||
      null;
    if (!targetTown) return null;

    if (!progress.towns[targetTown.id]) progress.towns[targetTown.id] = {};
    const existing = progress.towns[targetTown.id][campaign] || {};
    progress.towns[targetTown.id][campaign] = {
      ...existing,
      completed: true,
      bestCount:
        existing?.bestCount == null
          ? congregationCount
          : Math.max(existing.bestCount, congregationCount),
      churchPowerupLevels:
        campaign !== "p3"
          ? { ...(existing?.churchPowerupLevels || {}), ...(churchPowerupLevels || {}) }
          : existing?.churchPowerupLevels,
    };

    ensureNextTownUnlocked(progress, mapData);
    const nextTown =
      orderedTowns.find((town) => (progress.unlockedTownIds || []).includes(town.id) && !progress?.towns?.[town.id]?.p1?.completed) ||
      targetTown;
    state.selectedTownId = nextTown?.id || targetTown.id;
    const activeSave = getActiveSave();
    if (activeSave) activeSave.lastPlayedAt = Date.now();
    syncActiveSaveProgressMirror();
    await persistPlayerDoc();
    return {
      awardedTownId: targetTown.id,
      awardedTownName: targetTown.name || targetTown.id,
      nextTownId: nextTown?.id || null,
      nextTownName: nextTown?.name || nextTown?.id || null,
    };
  }

  function setDemoProfile({ completedTowns = 0 } = {}) {
    const mapData = window.BattlechurchMapData;
    if (!mapData?.towns?.length) return false;
    const progress = createFreshMapProgress(mapData);
    const regularTownIds = mapData.towns
      .filter((town) => town && town.type !== "capital")
      .map((town) => town.id)
      .filter(Boolean);
    const targetIds = regularTownIds.slice(0, Math.max(0, Number(completedTowns) || 0));
    targetIds.forEach((townId) => {
      if (!progress.towns[townId]) progress.towns[townId] = {};
      progress.towns[townId].p1 = {
        completed: true,
        bestCount: 100,
        churchPowerupLevels: {},
      };
    });
    ensureNextTownUnlocked(progress, mapData);
    state.demoProfile = { mapProgress: progress };
    state.mapProgress = progress;
    if (!state.selectedTownId || !isTownUnlocked(state.selectedTownId)) {
      state.selectedTownId = pickInitialTown();
    }
    return true;
  }

  function clearDemoProfile() {
    state.demoProfile = null;
  }

  async function renameSaveFile(saveId, saveName, playerName = null) {
    const target = state.playerDoc?.saveFiles?.[saveId];
    if (!target) return false;
    if (typeof saveName === "string" && saveName.trim()) {
      target.saveName = saveName.trim();
    }
    if (typeof playerName === "string" && playerName.trim()) {
      target.playerName = playerName.trim();
    }
    target.lastPlayedAt = Date.now();
    syncActiveSaveProgressMirror();
    await persistPlayerDoc();
    return true;
  }

  async function deleteSaveFile(saveId) {
    if (!saveId || !state.playerDoc?.saveFiles?.[saveId]) return false;
    const ids = Object.keys(state.playerDoc.saveFiles);
    if (ids.length <= 1) return false;
    delete state.playerDoc.saveFiles[saveId];
    if (state.playerDoc.activeSaveId === saveId) {
      state.playerDoc.activeSaveId = Object.keys(state.playerDoc.saveFiles)[0];
      state.mapProgress = state.playerDoc.saveFiles[state.playerDoc.activeSaveId].mapProgress;
      ensureProgress();
      if (!state.selectedTownId || !isTownUnlocked(state.selectedTownId)) {
        state.selectedTownId = pickInitialTown();
      }
    }
    syncActiveSaveProgressMirror();
    await persistPlayerDoc();
    return true;
  }

  function close() {
    state.active = false;
    state.panelOpen = false;
    stopMapAmbient();
  }

  function update(dt) {
    if (!state.active) return;
    loadMapImage();
    updateArmyMarchAnimation(dt);
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
    drawTotalCongregationBadge(ctx, canvas);
    updateSelectionFromHover(rect);
    const pulse = Math.sin((Date.now() / 1000) * 3) * 2;
    const mapData = window.BattlechurchMapData;
    if (mapData) {
      mapData.towns.forEach((town) => drawTownNode(ctx, town, rect, pulse));
    }
    drawInitialMarchOriginMarker(ctx);
    drawArmyMarchOverlay(ctx);
    handleMapClicks(rect);
    drawTownPanel(ctx, canvas);
    drawDenomUpgradeOverlay(ctx, canvas);
    ctx.restore();
  }

  function beginArmyMarchToTown(townId, onDone) {
    const mapData = window.BattlechurchMapData;
    const town = getTownById(townId);
    const rect = state.mapRect;
    if (!mapData || !town || !rect || !Number.isFinite(rect.w) || rect.w <= 0) {
      if (typeof onDone === "function") onDone();
      return;
    }
    const target = getTownPosition(town, rect);
    let startX;
    let startY;
    if (!state.armyMarch.hasStartedOnce) {
      const origin = getInitialMarchOrigin(rect);
      startX = origin.x;
      startY = origin.y;
    } else if (state.armyMarch.lastTownId) {
      const prevTown = getTownById(state.armyMarch.lastTownId);
      const prevPos = prevTown ? getTownPosition(prevTown, rect) : target;
      startX = prevPos.x;
      startY = prevPos.y;
    } else {
      startX = target.x - 200;
      startY = target.y;
    }
    const march = state.armyMarch;
    march.active = true;
    march.phase = "dash";
    march.townId = townId;
    march.fromX = startX;
    march.fromY = startY;
    march.toX = target.x;
    march.toY = target.y;
    march.timer = 0;
    march.onDone = typeof onDone === "function" ? onDone : null;
  }

  function finishArmyMarchAnimation() {
    const march = state.armyMarch;
    const done = march.onDone;
    const townId = march.townId;
    march.active = false;
    march.phase = "idle";
    march.townId = null;
    march.timer = 0;
    march.onDone = null;
    march.lastTownId = townId || march.lastTownId;
    march.hasStartedOnce = true;
    if (typeof done === "function") done();
  }

  function updateArmyMarchAnimation(dt) {
    const march = state.armyMarch;
    if (!march?.active) return;
    march.timer += Math.max(0, Number(dt) || 0);
    if (march.phase === "dash" && march.timer >= march.dashDuration) {
      march.phase = "x";
      march.timer = 0;
      return;
    }
    if (march.phase === "x" && march.timer >= march.xHoldDuration) {
      march.phase = "fade";
      march.timer = 0;
      return;
    }
    if (march.phase === "fade" && march.timer >= march.fadeDuration) {
      finishArmyMarchAnimation();
    }
  }

  function drawArmyMarchOverlay(ctx) {
    const march = state.armyMarch;
    if (!march?.active) return;
    const dx = march.toX - march.fromX;
    const dy = march.toY - march.fromY;
    const lineLen = Math.hypot(dx, dy) || 1;
    const nx = dx / lineLen;
    const ny = dy / lineLen;
    const marchProgress =
      march.phase === "dash"
        ? Math.max(0, Math.min(1, march.timer / Math.max(0.001, march.dashDuration)))
        : 1;
    const pulse = 0.55 + 0.45 * Math.sin((typeof performance !== "undefined" ? performance.now() : Date.now()) * 0.012);
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(255, 232, 180, 0.95)";
    ctx.shadowColor = "rgba(255, 170, 70, 0.7)";
    ctx.shadowBlur = 8;
    const dashSegments = Math.max(6, Math.floor(march.dashCount || 16));
    const dashSlots = dashSegments * 2; // every other slot is a gap
    const laidSlotCount = march.phase === "dash"
      ? Math.max(0, Math.min(dashSlots, Math.floor(marchProgress * dashSlots)))
      : dashSlots;
    for (let slot = 0; slot < laidSlotCount; slot += 1) {
      if (slot % 2 === 1) continue; // keep visible gap between dashes
      const p = (slot + 1) / dashSlots;
      const x = march.fromX + dx * p;
      const y = march.fromY + dy * p;
      const dashLen = 9;
      const isLeadingDash = slot >= laidSlotCount - 2 && march.phase === "dash";
      ctx.globalAlpha = isLeadingDash ? (0.75 + 0.25 * pulse) : 0.9;
      ctx.beginPath();
      ctx.moveTo(x - nx * dashLen * 0.5, y - ny * dashLen * 0.5);
      ctx.lineTo(x + nx * dashLen * 0.5, y + ny * dashLen * 0.5);
      ctx.stroke();
    }
    if (march.phase !== "dash") {
      const fadeAlpha = march.phase === "fade"
        ? Math.max(0, 1 - march.timer / Math.max(0.001, march.fadeDuration))
        : 1;
      const xSize = 24 + pulse * 6;
      ctx.globalAlpha = 0.95 * fadeAlpha;
      ctx.lineWidth = 8;
      ctx.strokeStyle = "rgba(255, 92, 92, 0.96)";
      ctx.shadowColor = "rgba(255, 48, 32, 0.85)";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(march.toX - xSize, march.toY - xSize);
      ctx.lineTo(march.toX + xSize, march.toY + xSize);
      ctx.moveTo(march.toX + xSize, march.toY - xSize);
      ctx.lineTo(march.toX - xSize, march.toY + xSize);
      ctx.stroke();
    }
    // Draw a subtle origin X during the full march so it reads as X -> X.
    {
      const fadeAlpha = march.phase === "fade"
        ? Math.max(0, 1 - march.timer / Math.max(0.001, march.fadeDuration))
        : 1;
      const oxSize = 15 + pulse * 3;
      ctx.globalAlpha = 0.62 * fadeAlpha;
      ctx.lineWidth = 6;
      ctx.strokeStyle = "rgba(255, 188, 122, 0.92)";
      ctx.shadowColor = "rgba(255, 132, 72, 0.65)";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(march.fromX - oxSize, march.fromY - oxSize);
      ctx.lineTo(march.fromX + oxSize, march.fromY + oxSize);
      ctx.moveTo(march.fromX + oxSize, march.fromY - oxSize);
      ctx.lineTo(march.fromX - oxSize, march.fromY + oxSize);
      ctx.stroke();
    }
    ctx.restore();
  }

  function getInitialMarchOrigin(rect) {
    const mapData = window.BattlechurchMapData;
    const safeRect = rect || state.mapRect || { x: 0, y: 0, w: 1280, h: 720 };
    const firstTownId = mapData?.getFirstTownId?.() || mapData?.towns?.[0]?.id;
    const firstTown = firstTownId ? getTownById(firstTownId) : null;
    const fallbackX = safeRect.x + safeRect.w * 0.2;
    const fallbackY = safeRect.y + safeRect.h * 0.25;
    const firstPos = firstTown ? getTownPosition(firstTown, safeRect) : { x: fallbackX, y: fallbackY };
    let x = firstPos.x - 145;
    let y = firstPos.y - 165;
    const minX = safeRect.x + 28;
    const maxX = safeRect.x + safeRect.w - 28;
    const minY = safeRect.y + 28;
    const maxY = safeRect.y + safeRect.h - 28;
    x = Math.max(minX, Math.min(maxX, x));
    y = Math.max(minY, Math.min(maxY, y));
    return { x, y };
  }

  function drawInitialMarchOriginMarker(ctx) {
    const march = state.armyMarch;
    if (!state.active || march.hasStartedOnce || march.active) return;
    const origin = getInitialMarchOrigin(state.mapRect);
    const pulse = 0.55 + 0.45 * Math.sin((typeof performance !== "undefined" ? performance.now() : Date.now()) * 0.012);
    const size = 15 + pulse * 3;
    ctx.save();
    ctx.globalAlpha = 0.62;
    ctx.lineCap = "round";
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(255, 188, 122, 0.92)";
    ctx.shadowColor = "rgba(255, 132, 72, 0.65)";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(origin.x - size, origin.y - size);
    ctx.lineTo(origin.x + size, origin.y + size);
    ctx.moveTo(origin.x + size, origin.y - size);
    ctx.lineTo(origin.x - size, origin.y + size);
    ctx.stroke();
    ctx.restore();
  }

  // Dev-only: mark all 9 regular towns as P1-completed (100 congregation) in memory.
  // Does NOT save to Firebase. Automatically unlocks the capital via ensureNextTownUnlocked.
  function devUnlockAllTowns() {
    const mapData = window.BattlechurchMapData;
    if (!mapData) return false;
    const progress = ensureProgress();
    if (!progress) return false;
    const regularTowns = (mapData.towns || []).filter(function(t) { return t.type !== "capital"; });
    if (!progress.towns) progress.towns = {};
    regularTowns.forEach(function(town) {
      if (!progress.towns[town.id]) progress.towns[town.id] = { p1: null, p2: null, p3: null };
      progress.towns[town.id].p1 = {
        completed: true,
        bestCount: 100,
        churchPowerupLevels: {},
      };
    });
    // Directly unlock every town (regular + capital) — don't rely on chain logic
    progress.unlockedTownIds = (mapData.towns || []).map(function(t) { return t.id; });
    // Close any open panel or overlay so WASD navigation works immediately
    state.panelOpen = false;
    state.denomUpgrade = null;
    if (typeof console !== "undefined") {
      console.log("[DEV] devUnlockAllTowns: unlockedTownIds =", progress.unlockedTownIds.join(", "));
    }
    return true;
  }

  window.MapScreen = {
    open,
    close,
    update,
    draw,
    recordTownCompletion,
    devUnlockAllTowns,
    getNextTownInOrder,
    selectTown,
    setAssets,
    getTownStartCount,
    ensureTownStartCount,
    getTownCampaignData,
    getTotalCongregationCount,
    saveMissionCheckpoint,
    clearMissionCheckpoint,
    getDenomPickCountForTown,
    devStartRunForTown,
    getNextCampaignForTown,
    isP2UnlockedForTown,
    isP3UnlockedForTown,
    reloadProgress,
    getSaveFileSummaries,
    setActiveSave,
    createSaveFile,
    resetSaveFile,
    renameSaveFile,
    deleteSaveFile,
    devAwardNextTown,
    setDemoProfile,
    clearDemoProfile,
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
