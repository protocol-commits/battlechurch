(function setupMapScreen(window) {
  if (!window) return;

  const MAP_IMAGE_NORMAL_PRIMARY = "./assets/backgrounds/map/map_normal.png";
  const MAP_IMAGE_NORMAL_FALLBACK = "./assets/backgrounds/map.png";
  const MAP_IMAGE_DEMON_PRIMARY = "./assets/backgrounds/map/map_demon.png";
  const MAP_IMAGE_DEMON_FALLBACK = "./assets/backgrounds/map.png";
  const DISTRICT_EXTERIOR_IMAGE_PRIMARY = "./assets/backgrounds/mission-1.png";
  const HIT_RADIUS_BASE = 10;
  const UI_FONT_FAMILY =
    (typeof window !== "undefined" && window.UIStyles?.fonts?.primary) ||
    "'VT323', 'Press Start 2P', monospace";
  const MAP_HELLFIRE_TEXT = Object.freeze({
    title: "#F2C87D",
    body: "#E7B066",
    dim: "rgba(231, 176, 102, 0.68)",
  });
  const MAP_SCREEN_SHADOW_CRUSH_DEFAULT = 0;
  const MAP_SCREEN_SHADOW_THRESHOLD_DEFAULT = 0.72;
  const CANVAS_SEMANTIC_DEFAULTS = {
    eyebrow: { size: 13, weight: 600, lineHeight: 1.15 },
    h1: { size: 56, weight: 900, lineHeight: 1.05 },
    h2: { size: 40, weight: 800, lineHeight: 1.2 },
    h3: { size: 28, weight: 700, lineHeight: 1.2 },
    subhead: { size: 22, weight: 600, lineHeight: 1.25 },
    body: { size: 20, weight: 600, lineHeight: 1.3 },
    caption: { size: 14, weight: 500, lineHeight: 1.25 },
    button: { size: 18, weight: 600, lineHeight: 1.1 },
  };

  function getCanvasSemanticToken(role) {
    const semantic = window.UIStyles?.typography?.canvasSemantic || {};
    return semantic[role] || CANVAS_SEMANTIC_DEFAULTS[role] || CANVAS_SEMANTIC_DEFAULTS.body;
  }

  function getCanvasSemanticForMap(usageKey, fallbackRole) {
    const usage = window.UIStyles?.typography?.canvasSemanticUsage?.mapScreen || {};
    const role = usage[usageKey] || fallbackRole || "body";
    return getCanvasSemanticToken(role);
  }
  function pushTypographyDebugLabel(role, x, y) {
    if (!window.UIStyles?.debug?.typographyLabels) return;
    if (typeof window.__bcPushTypographyDebugLabel !== "function") return;
    window.__bcPushTypographyDebugLabel(role, x, y);
  }

  let mapNormalImage = null;
  let mapNormalImageLoaded = false;
  let mapNormalImageFailed = false;
  let mapDemonImage = null;
  let mapDemonImageLoaded = false;
  let mapDemonImageFailed = false;
  let districtExteriorImage = null;
  let districtExteriorImageLoaded = false;
  let districtExteriorImageFailed = false;
  let mapAssets = null;
  const districtAnimators = new Map();
  const MAP_REALM_FLICKER = Object.freeze({
    normalHoldMs: 2750,
    toDemonFlickerMs: 500,
    demonHoldMs: 3500,
    toNormalFlickerMs: 700,
    flickerStepMs: 80,
  });

  function readMapScreenRenderStyleNumber(key, fallback) {
    const root = (() => {
      if (typeof window === "undefined") return null;
      const cfg = window.GameBalance || window.BattlechurchBalanceConfig || null;
      if (!cfg) return null;
      return cfg.masterRenderStyle
        || cfg.mapScreenRenderStyle
        || null;
    })();
    const raw = root ? Number(root[key]) : NaN;
    return Number.isFinite(raw) ? raw : fallback;
  }

  function getMapScreenShadowStyle() {
    const shadowCrush = Math.max(
      0,
      Math.min(1, readMapScreenRenderStyleNumber("shadowCrush", MAP_SCREEN_SHADOW_CRUSH_DEFAULT)),
    );
    const shadowThreshold = Math.max(
      0.02,
      Math.min(1, readMapScreenRenderStyleNumber("shadowThreshold", MAP_SCREEN_SHADOW_THRESHOLD_DEFAULT)),
    );
    return { shadowCrush, shadowThreshold };
  }

  function applyShadowCrushToCanvas(canvas, renderStyle) {
    if (!canvas || typeof canvas.getContext !== "function") return canvas;
    const shadowCrush = Number.isFinite(renderStyle?.shadowCrush)
      ? Math.max(0, Math.min(1, renderStyle.shadowCrush))
      : 0;
    if (shadowCrush <= 0) return canvas;
    const shadowThreshold = Number.isFinite(renderStyle?.shadowThreshold)
      ? Math.max(0.02, Math.min(1, renderStyle.shadowThreshold))
      : 0.5;
    const ctx2d = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx2d) return canvas;
    let imageData = null;
    try {
      imageData = ctx2d.getImageData(0, 0, canvas.width, canvas.height);
    } catch (e) {
      return canvas;
    }
    const pixels = imageData.data;
    for (let i = 0; i < pixels.length; i += 4) {
      const a = pixels[i + 3];
      if (!a) continue;
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      if (luminance >= shadowThreshold) continue;
      const under = (shadowThreshold - luminance) / shadowThreshold;
      const darken = Math.max(0, Math.min(1, under * shadowCrush));
      const mult = 1 - darken;
      pixels[i] = Math.max(0, Math.min(255, Math.round(r * mult)));
      pixels[i + 1] = Math.max(0, Math.min(255, Math.round(g * mult)));
      pixels[i + 2] = Math.max(0, Math.min(255, Math.round(b * mult)));
    }
    ctx2d.putImageData(imageData, 0, 0);
    return canvas;
  }

  function maybeApplyMapScreenShadowCrush(image) {
    if (!image || !image.width || !image.height) return image;
    if (typeof document === "undefined" || typeof document.createElement !== "function") return image;
    const style = getMapScreenShadowStyle();
    if (!style.shadowCrush) return image;
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx2d = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx2d) return image;
    ctx2d.imageSmoothingEnabled = false;
    ctx2d.drawImage(image, 0, 0);
    return applyShadowCrushToCanvas(canvas, style);
  }

  const state = {
    active: false,
    mapRect: { x: 0, y: 0, w: 0, h: 0 },
    selectedDistrictId: null,
    panelOpen: false,
    denomUpgrade: null, // { active, districtId, maxPicks, selectedKeys[], focusedIndex }
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
      districtId: null,
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
      lastDistrictId: null,
      hasStartedOnce: false,
      routeStops: [],
      previewClockMs: 0,
      previewPhase: 0,
    },
    mapLaunchTransition: {
      active: false,
      districtId: null,
      timer: 0,
      duration: 2.7,
      maxScale: 3.8,
      zoomInRatio: 0.22,
      holdRatio: 0.01,
      crossfadeRatio: 0.24,
      handoffRatio: 0.68,
      launched: false,
    },
  };
  const DEFAULT_SAVE_ID = "main";

  function getDefaultClassIdForSaves() {
    const configuredDefault = String(window.BattlechurchClassConfig?.defaultClassId || "").trim();
    if (configuredDefault) return configuredDefault;
    const fallbackFromRuntime = String(window.BattlechurchClasses?.getActiveId?.() || "").trim();
    if (fallbackFromRuntime) return fallbackFromRuntime;
    const firstClassId = String(window.BattlechurchClassConfig?.classes?.[0]?.id || "").trim();
    return firstClassId || "class1";
  }

  function resolveClassMetaForSave(classId) {
    const runtimeById = typeof window.BattlechurchClasses?.getById === "function"
      ? window.BattlechurchClasses.getById(classId)
      : null;
    const resolvedId = String(runtimeById?.id || classId || "").trim() || getDefaultClassIdForSaves();
    const classTitle = String(runtimeById?.classTitle || resolvedId || "").trim() || "Unknown";
    return { classId: resolvedId, classTitle };
  }

  function deepClone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (e) {
      return null;
    }
  }

  function createFreshMapProgress(mapData) {
    const firstDistrictId = mapData?.getFirstDistrictId?.() || null;
    return {
      version: 2,
      districts: {},
      unlockedDistrictIds: firstDistrictId ? [firstDistrictId] : [],
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
          classId: getDefaultClassIdForSaves(),
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
        classId: getDefaultClassIdForSaves(),
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
          classId: getDefaultClassIdForSaves(),
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
      if (typeof save.classId !== "string" || !save.classId.trim()) {
        save.classId = getDefaultClassIdForSaves();
        dirty = true;
      }
      const classMeta = resolveClassMetaForSave(save.classId);
      if (save.classId !== classMeta.classId) {
        save.classId = classMeta.classId;
        dirty = true;
      }
      if (typeof save.cityName !== "string") {
        save.cityName = "";
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
    if (typeof window !== "undefined" && window.__demoSandboxRunActive && state.demoProfile) {
      return {
        mapProgress: state.demoProfile.mapProgress,
        playerName: state.demoProfile.playerName || "DemoName",
        cityName: state.demoProfile.cityName || "DemoTown",
        classId: state.demoProfile.classId || getDefaultClassIdForSaves(),
      };
    }
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

  function loadMapImages() {
    if (!mapNormalImage && !mapNormalImageLoaded && !mapNormalImageFailed) {
      mapNormalImage = new Image();
      mapNormalImage.onload = () => {
        mapNormalImageLoaded = true;
        mapNormalImage = maybeApplyMapScreenShadowCrush(mapNormalImage);
      };
      mapNormalImage.onerror = () => {
        if (mapNormalImage && mapNormalImage.src === MAP_IMAGE_NORMAL_PRIMARY) {
          mapNormalImage.src = MAP_IMAGE_NORMAL_FALLBACK;
          return;
        }
        mapNormalImageFailed = true;
      };
      mapNormalImage.src = MAP_IMAGE_NORMAL_PRIMARY;
    }
    if (!mapDemonImage && !mapDemonImageLoaded && !mapDemonImageFailed) {
      mapDemonImage = new Image();
      mapDemonImage.onload = () => {
        mapDemonImageLoaded = true;
        mapDemonImage = maybeApplyMapScreenShadowCrush(mapDemonImage);
      };
      mapDemonImage.onerror = () => {
        if (mapDemonImage && mapDemonImage.src === MAP_IMAGE_DEMON_PRIMARY) {
          mapDemonImage.src = MAP_IMAGE_DEMON_FALLBACK;
          return;
        }
        mapDemonImageFailed = true;
      };
      mapDemonImage.src = MAP_IMAGE_DEMON_PRIMARY;
    }
  }

  function resolveMapRealmState(nowMs) {
    const cfg = MAP_REALM_FLICKER;
    const total =
      cfg.normalHoldMs +
      cfg.toDemonFlickerMs +
      cfg.demonHoldMs +
      cfg.toNormalFlickerMs;
    const t = ((nowMs % total) + total) % total;
    if (t < cfg.normalHoldMs) return { demon: false };
    if (t < cfg.normalHoldMs + cfg.toDemonFlickerMs) {
      const step = Math.floor((t - cfg.normalHoldMs) / Math.max(1, cfg.flickerStepMs));
      return { demon: step % 2 === 1 };
    }
    if (t < cfg.normalHoldMs + cfg.toDemonFlickerMs + cfg.demonHoldMs) return { demon: true };
    const step = Math.floor(
      (t - (cfg.normalHoldMs + cfg.toDemonFlickerMs + cfg.demonHoldMs)) / Math.max(1, cfg.flickerStepMs),
    );
    return { demon: step % 2 === 0 };
  }

  function getActiveMapImage(preferDemonRealm) {
    if (preferDemonRealm) {
      if (mapDemonImageLoaded && mapDemonImage) return mapDemonImage;
      if (mapNormalImageLoaded && mapNormalImage) return mapNormalImage;
      return null;
    }
    if (mapNormalImageLoaded && mapNormalImage) return mapNormalImage;
    if (mapDemonImageLoaded && mapDemonImage) return mapDemonImage;
    return null;
  }

  function loadDistrictExteriorImage() {
    if (districtExteriorImage || districtExteriorImageLoaded || districtExteriorImageFailed) return;
    districtExteriorImage = new Image();
    districtExteriorImage.onload = () => {
      districtExteriorImageLoaded = true;
      districtExteriorImage = maybeApplyMapScreenShadowCrush(districtExteriorImage);
    };
    districtExteriorImage.onerror = () => {
      districtExteriorImageFailed = true;
    };
    districtExteriorImage.src = DISTRICT_EXTERIOR_IMAGE_PRIMARY;
  }

  function setAssets(assets) {
    mapAssets = assets || null;
    districtAnimators.clear();
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

  function getDistrictAnimatorState(district, bestCount) {
    if (!district) return null;
    const key = district.id;
    const isCapital = district.type === "capital";
    const shouldShow = isCapital || bestCount == null;
    if (!shouldShow) {
      if (districtAnimators.has(key)) districtAnimators.delete(key);
      return null;
    }
    if (districtAnimators.has(key)) return districtAnimators.get(key);
    const Animator = window.Entities?.Animator || null;
    let clips = null;
    if (isCapital) {
      clips = getMiniDemonLordClips();
    } else if (district.frontId === "northeast") {
      clips = getMiniClawedDemonClips();
    } else if (district.frontId === "southwest") {
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
    const animState = {
      animator,
      timer: Math.random() * 1.2,
      hold: minHold + Math.random() * (maxHold - minHold),
      minHold,
      maxHold,
    };
    districtAnimators.set(key, animState);
    return animState;
  }

  function ensureProgress() {
    const mapData = window.BattlechurchMapData;
    if (!mapData) return null;
    // Clean break: v1 saves are discarded, start fresh with v2
    if (!state.mapProgress || state.mapProgress.version !== 2) {
      state.mapProgress = {
        version: 2,
        districts: {},
        unlockedDistrictIds: [],
      };
    }
    // Migrate old save keys if present
    if (!Array.isArray(state.mapProgress.unlockedDistrictIds)) {
      state.mapProgress.unlockedDistrictIds = Array.isArray(state.mapProgress.unlockedTownIds)
        ? state.mapProgress.unlockedTownIds
        : [];
      delete state.mapProgress.unlockedTownIds;
    }
    if (!state.mapProgress.districts || typeof state.mapProgress.districts !== "object") {
      state.mapProgress.districts = state.mapProgress.towns && typeof state.mapProgress.towns === "object"
        ? state.mapProgress.towns
        : {};
      delete state.mapProgress.towns;
    }
    const firstDistrictId = mapData.getFirstDistrictId();
    if (firstDistrictId && !state.mapProgress.unlockedDistrictIds.includes(firstDistrictId)) {
      state.mapProgress.unlockedDistrictIds.push(firstDistrictId);
    }
    ensureNextDistrictUnlocked(state.mapProgress, mapData);
    syncActiveSaveProgressMirror();
    return state.mapProgress;
  }

  function rebuildArmyMarchRouteFromProgress() {
    const mapData = window.BattlechurchMapData;
    const progress = ensureProgress();
    const march = state.armyMarch;
    if (!march) return;
    const baseStops = [{ type: "origin" }];
    if (!mapData?.districts?.length || !progress?.districts) {
      march.routeStops = baseStops;
      march.lastDistrictId = null;
      march.hasStartedOnce = false;
      return;
    }
    const completedDistrictIds = mapData.districts
      .filter((district) => district && district.id)
      .filter((district) => progress.districts?.[district.id]?.p1?.completed === true)
      .map((district) => district.id);
    march.routeStops = baseStops.concat(completedDistrictIds.map((id) => ({ type: "district", id })));
    march.lastDistrictId = completedDistrictIds.length ? completedDistrictIds[completedDistrictIds.length - 1] : null;
    march.hasStartedOnce = completedDistrictIds.length > 0;
  }

  async function loadPlayerProgress() {
    if (state.loading) return;
    state.loading = true;
    try {
      if (typeof window !== "undefined" && window.__demoSandboxRunActive && state.demoProfile?.mapProgress) {
        state.mapProgress = deepClone(state.demoProfile.mapProgress) || state.demoProfile.mapProgress;
        const progress = ensureProgress();
        rebuildArmyMarchRouteFromProgress();
        if (!state.selectedDistrictId || !isDistrictUnlocked(state.selectedDistrictId)) {
          state.selectedDistrictId = pickInitialDistrict();
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
      rebuildArmyMarchRouteFromProgress();
      const isV2 = progress?.version === 2;
      if ((normalized.dirty || !isV2) && window.Cloud?.savePlayerDoc) {
        await persistPlayerDoc();
      }
      if (!state.selectedDistrictId || !isDistrictUnlocked(state.selectedDistrictId)) {
        state.selectedDistrictId = pickInitialDistrict();
      }
    } catch (e) {
      // Offline/local fallback: keep map playable with in-memory fresh progress.
      const fallback = normalizePlayerDocForSaves(state.playerDoc, window.BattlechurchMapData);
      state.playerDoc = fallback.doc;
      state.mapProgress = state.playerDoc?.saveFiles?.[state.playerDoc?.activeSaveId]?.mapProgress || null;
      state.mapProgress = ensureProgress();
      rebuildArmyMarchRouteFromProgress();
      if (!state.selectedDistrictId || !isDistrictUnlocked(state.selectedDistrictId)) {
        state.selectedDistrictId = pickInitialDistrict();
      }
    } finally {
      state.loading = false;
      state.lastMapLoad = Date.now();
    }
  }

  function getDistrictStartCount(districtId) {
    // Legacy shim — prefer getDistrictCampaignData for v2 campaign-aware start counts
    const data = getDistrictCampaignData(districtId);
    return data?.startCount ?? 50;
  }

  async function ensureDistrictStartCount(districtId) {
    // In v2, start count is derived from campaign history; no separate persistence needed
    if (!state.mapProgress) await loadPlayerProgress();
    return getDistrictStartCount(districtId);
  }

  function isDistrictUnlocked(districtId) {
    const progress = ensureProgress();
    if (!progress) return false;
    return progress.unlockedDistrictIds.includes(districtId);
  }

  function getDistrictCampaignCompletionCount(districtId) {
    // Returns number of completed campaigns (0-3), used for map node glow scaling.
    const progress = ensureProgress();
    const districtEntry = progress?.districts?.[districtId];
    if (!districtEntry) return 0;
    let count = 0;
    for (const camp of ["p1", "p2", "p3"]) {
      if (districtEntry[camp]?.completed === true) count += 1;
    }
    return count;
  }

  function getDistrictBestCount(districtId) {
    const progress = ensureProgress();
    const districtEntry = progress?.districts?.[districtId];
    if (!districtEntry) return null;
    let best = null;
    for (const camp of ["p1", "p2", "p3"]) {
      const count = districtEntry[camp]?.bestCount;
      if (Number.isFinite(count)) {
        best = best == null ? count : Math.max(best, count);
      }
    }
    return best;
  }

  function getDistrictDisplayCount(districtId) {
    const best = getDistrictBestCount(districtId);
    if (Number.isFinite(best)) return Math.max(0, Math.round(best));
    return isDistrictUnlocked(districtId) ? 0 : null;
  }

  // Returns the saved congregation total across all districts except excludeDistrictId.
  // Per district: uses the most recently completed campaign's bestCount (p3 > p2 > p1).
  function getMapSavedTotal(excludeDistrictId) {
    const progress = ensureProgress();
    const mapData = window.BattlechurchMapData;
    if (!progress || !mapData?.districts?.length) return 0;
    let total = 0;
    for (const district of mapData.districts) {
      if (!district?.id || district.id === excludeDistrictId) continue;
      const entry = progress.districts?.[district.id];
      if (!entry) continue;
      const count =
        (entry.p3?.completed && Number.isFinite(entry.p3?.bestCount)) ? entry.p3.bestCount :
        (entry.p2?.completed && Number.isFinite(entry.p2?.bestCount)) ? entry.p2.bestCount :
        (entry.p1?.completed && Number.isFinite(entry.p1?.bestCount)) ? entry.p1.bestCount :
        0;
      total += Math.max(0, Math.round(count));
    }
    return total;
  }

  function getTotalCongregationCount() {
    const mapData = window.BattlechurchMapData;
    if (!mapData?.districts?.length) return 0;
    let total = 0;
    for (const district of mapData.districts) {
      if (!district?.id || !isDistrictUnlocked(district.id)) continue;
      const count = getDistrictDisplayCount(district.id);
      if (Number.isFinite(count)) total += count;
    }
    return total;
  }

  function getDistrictById(districtId) {
    const mapData = window.BattlechurchMapData;
    if (!mapData) return null;
    return mapData.districts.find((d) => d.id === districtId) || null;
  }

  function getFrontById(frontId) {
    const mapData = window.BattlechurchMapData;
    if (!mapData) return null;
    return mapData.fronts.find((f) => f.id === frontId) || null;
  }

  function getDistrictPosition(district, rect) {
    return {
      x: rect.x + district.x * rect.w,
      y: rect.y + district.y * rect.h,
    };
  }

  function computeMapRect(canvas, activeImage = null) {
    const mapImage = activeImage || mapDemonImage || mapNormalImage || null;
    if (!mapImage) {
      state.mapRect = { x: 0, y: 0, w: canvas.width, h: canvas.height };
      return state.mapRect;
    }
    // Use cover so map.png always fills the viewport with no top/bottom letterbox gaps.
    const scale = Math.max(canvas.width / mapImage.width, canvas.height / mapImage.height);
    const w = mapImage.width * scale;
    const h = mapImage.height * scale;
    const x = (canvas.width - w) / 2;
    const y = (canvas.height - h) / 2;
    state.mapRect = { x, y, w, h };
    return state.mapRect;
  }

  function drawMapBackground(ctx, canvas, activeImage = null) {
    const mapImage = activeImage || null;
    const rect = computeMapRect(canvas, mapImage);
    if (mapImage) {
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

  function drawFireOverlayInCurrentTransform(
    renderCtx,
    canvas,
    intensity = 1.8,
    sizeScale = 1.0,
    alpha = 1,
    bounds = null,
  ) {
    if (!renderCtx) return false;
    const fireOverlay = typeof window !== "undefined" ? window.fireOverlay : null;
    if (!fireOverlay || typeof fireOverlay.draw !== "function") return false;
    if (!canvas) return false;
    if (typeof fireOverlay.setBounds === "function") {
      const bx = Number(bounds?.x);
      const by = Number(bounds?.y);
      const bw = Number(bounds?.w);
      const bh = Number(bounds?.h);
      if (
        Number.isFinite(bx) &&
        Number.isFinite(by) &&
        Number.isFinite(bw) &&
        Number.isFinite(bh) &&
        bw > 0 &&
        bh > 0
      ) {
        fireOverlay.setBounds(bx, by, bw, bh);
      } else {
        fireOverlay.setBounds(0, 0, canvas.width, canvas.height);
      }
    }
    if (typeof fireOverlay.setIntensity === "function") {
      fireOverlay.setIntensity(intensity);
    }
    if (typeof fireOverlay.setSizeScale === "function") {
      fireOverlay.setSizeScale(sizeScale);
    }
    if (alpha < 0.999) {
      const prev = fireOverlay.intensity;
      fireOverlay.setIntensity((Number.isFinite(prev) ? prev : intensity) * Math.max(0, Math.min(1, alpha)));
      fireOverlay.draw(renderCtx);
      fireOverlay.setIntensity(prev);
    } else {
      fireOverlay.draw(renderCtx);
    }
    return true;
  }

  function drawWavyCoverImage(ctx, canvas, image, alpha = 1) {
    if (!ctx || !canvas || !image || !image.width || !image.height) return;
    const stripHeight = 14;
    const time = (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000;
    const amp = 0.9;
    const focusX = 0.5;
    const focusY = 0.5;
    const baseScale = Math.max(canvas.width / image.width, canvas.height / image.height);
    const drawW = image.width * baseScale;
    const drawH = image.height * baseScale;
    const offsetX = canvas.width * focusX - drawW * focusX;
    const offsetY = canvas.height * focusY - drawH * focusY;
    const scaleY = drawH / image.height;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    for (let y = 0; y < image.height; y += stripHeight) {
      const wave = Math.sin(time * 2 + y * 0.15) + Math.sin(time * 1.2 + y * 0.05);
      const offset = wave * amp;
      const srcH = Math.min(stripHeight, image.height - y);
      const destY = offsetY + y * scaleY;
      const destH = srcH * scaleY;
      ctx.drawImage(
        image,
        0,
        y,
        image.width,
        srcH,
        offsetX + offset,
        destY,
        drawW,
        destH,
      );
    }
    ctx.restore();
  }

  // Draws P1/P2/P3 campaign completion dots above a district node
  function drawCampaignDots(ctx, district, position, radius, rect) {
    const progress = ensureProgress();
    if (!progress) return;
    const districtEntry = progress.districts?.[district.id];
    const scale = rect.w / 1280;
    const dotRadius = Math.max(3, Math.round(5 * scale));
    const dotGap = Math.round(14 * scale);
    const dotY = position.y - radius - 40 * scale;
    const campaigns = ["p1", "p2", "p3"];
    const totalWidth = (campaigns.length - 1) * dotGap;
    const startX = position.x - totalWidth / 2;

    const p2Available = isP2UnlockedForDistrict(district.id, progress);
    const p3Available = isP3UnlockedForDistrict(district.id, progress);

    ctx.save();
    campaigns.forEach((camp, i) => {
      const cx = startX + i * dotGap;
      const completed = districtEntry?.[camp]?.completed === true;
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

  function drawDistrictNode(ctx, district, rect, pulse, options = {}) {
    const showDemonIcons = options.showDemonIcons !== false;
    const position = getDistrictPosition(district, rect);
    const dpr = window.devicePixelRatio || 1;
    const radius = HIT_RADIUS_BASE * dpr;
    if (
      !Number.isFinite(position?.x) ||
      !Number.isFinite(position?.y) ||
      !Number.isFinite(radius) ||
      radius <= 0
    ) {
      return;
    }
    const unlocked = isDistrictUnlocked(district.id);
    const selected = state.selectedDistrictId === district.id;
    const completionCount = getDistrictCampaignCompletionCount(district.id);
    const bestCount = getDistrictBestCount(district.id);
    const displayCount = getDistrictDisplayCount(district.id);
    const isCapital = district.type === "capital";
    const nodeRadius = isCapital ? radius * 3.6 : radius;
    if (!Number.isFinite(nodeRadius) || nodeRadius <= 0) return;
    const frontId = district.frontId || "";
    const districtStyles = {
      northwest: { core: "#FFD978", glow: "rgba(255, 217, 120, 0.8)", ring: "rgba(255, 235, 180, 0.9)" },
      northeast: { core: "#8FD7FF", glow: "rgba(140, 215, 255, 0.75)", ring: "rgba(190, 235, 255, 0.9)" },
      southwest: { core: "#C8FFB0", glow: "rgba(200, 255, 176, 0.75)", ring: "rgba(230, 255, 210, 0.9)" },
    };
    const style = districtStyles[frontId] || districtStyles.northwest;
    const isDemonDistrict = bestCount == null;

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
    } else if (frontId === "northeast") {
      const size = nodeRadius * 1.1;
      ctx.moveTo(position.x, position.y - size);
      ctx.lineTo(position.x + size, position.y);
      ctx.lineTo(position.x, position.y + size);
      ctx.lineTo(position.x - size, position.y);
      ctx.closePath();
    } else if (frontId === "southwest") {
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
    ctx.lineWidth = isDemonDistrict ? 2.6 : 2;
    ctx.strokeStyle = "rgba(140, 35, 35, 0.95)";
    ctx.stroke();
    if (isDemonDistrict) {
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


    const animState = getDistrictAnimatorState(district, bestCount);
    const animator = animState?.animator || null;
    const clip = animator?.currentClip || null;
    if (showDemonIcons && animator && clip && (district.type === "capital" || bestCount == null)) {
      let baseTarget = district.type === "capital" ? radius * 8.4 : radius * 3.75;
      if (district.frontId === "northeast") {
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
      const districtLabelType = getCanvasSemanticForMap("districtLabel", "h3");
      const nameSize = Math.round(districtLabelType.size * (rect.w / 1280));
      ctx.font = `${districtLabelType.weight} ${nameSize}px ${UI_FONT_FAMILY}`;
      ctx.fillStyle = MAP_HELLFIRE_TEXT.title;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.shadowColor = "rgba(6, 10, 18, 0.85)";
      ctx.shadowBlur = 10;
      ctx.strokeStyle = "rgba(0, 0, 0, 0.95)";
      ctx.lineWidth = Math.max(2, Math.round(nameSize * 0.16));
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;
      ctx.strokeText(`${district.name} (${Math.round(displayCount)})`, position.x, position.y - radius - 10);
      ctx.fillText(`${district.name} (${Math.round(displayCount)})`, position.x, position.y - radius - 10);
      pushTypographyDebugLabel("h3", position.x, position.y - radius - 10);
      ctx.restore();
    } else if (selected) {
      ctx.save();
      const districtLabelType = getCanvasSemanticForMap("districtLabel", "h3");
      const selectedNameSize = Math.round(districtLabelType.size * (rect.w / 1280));
      ctx.font = `${districtLabelType.weight} ${selectedNameSize}px ${UI_FONT_FAMILY}`;
      ctx.fillStyle = unlocked ? MAP_HELLFIRE_TEXT.title : MAP_HELLFIRE_TEXT.dim;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.shadowColor = "rgba(6, 10, 18, 0.85)";
      ctx.shadowBlur = 10;
      ctx.strokeStyle = "rgba(0, 0, 0, 0.95)";
      ctx.lineWidth = Math.max(2, Math.round(selectedNameSize * 0.16));
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;
      ctx.strokeText(district.name, position.x, position.y - radius - 10);
      ctx.fillText(district.name, position.x, position.y - radius - 10);
      pushTypographyDebugLabel("h3", position.x, position.y - radius - 10);
      ctx.restore();
    }

    // Campaign dots (P1/P2/P3) above the name label for regular districts
    if (!isCapital && unlocked) {
      drawCampaignDots(ctx, district, position, radius, rect);
    }
  }

  function drawMapLabels(ctx, canvas, rect) {
    // Map title/subhead are rendered in renderer.js to keep map text
    // presentation centralized and avoid duplicate headings.
    return;
  }

  function drawMapHeadingText(ctx, canvas) {
    const cityName = getActiveSave()?.cityName?.trim() || "";
    const cx = canvas.width * 0.5;
    const mapHeadingTitleType = getCanvasSemanticToken(
      window.UIStyles?.typography?.canvasSemanticUsage?.mapHeading?.title || "h3",
    );
    const mapHeadingSubtitleType = getCanvasSemanticToken(
      window.UIStyles?.typography?.canvasSemanticUsage?.mapHeading?.subtitle || "subhead",
    );
    const scale = canvas.width / 1280;
    const line1Size = Math.round(Math.max(18, mapHeadingTitleType.size) * scale);
    const line2Size = Math.round(Math.max(14, mapHeadingSubtitleType.size) * scale);
    const topY = Math.round(38 * scale);
    const lineGap = Math.round(10 * scale);

    const line1 = cityName
      ? `${cityName} is overrun with spiritual darkness.`
      : "Your hometown is overrun with spiritual darkness.";

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.shadowColor = "rgba(0,0,0,0)";
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(0,0,0,0.95)";
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;

    ctx.font = `${mapHeadingTitleType.weight} ${line1Size}px ${UI_FONT_FAMILY}`;
    ctx.fillStyle = MAP_HELLFIRE_TEXT.title;
    ctx.lineWidth = Math.max(2, Math.round(line1Size * 0.15));
    ctx.strokeText(line1, cx, topY);
    ctx.fillText(line1, cx, topY);
    pushTypographyDebugLabel("h3", cx, topY);

    const playerName = getActiveSave()?.playerName?.trim() || "Pastor";
    ctx.font = `${mapHeadingSubtitleType.weight} ${line2Size}px ${UI_FONT_FAMILY}`;
    ctx.fillStyle = MAP_HELLFIRE_TEXT.dim;
    ctx.lineWidth = Math.max(2, Math.round(line2Size * 0.15));
    ctx.strokeText(`Pastor ${playerName}, you have been called to liberate it.`, cx, topY + line1Size + lineGap);
    ctx.fillText(`Pastor ${playerName}, you have been called to liberate it.`, cx, topY + line1Size + lineGap);
    pushTypographyDebugLabel("subhead", cx, topY + line1Size + lineGap);

    ctx.restore();
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
    const eyebrowType = getCanvasSemanticForMap("eyebrow", "eyebrow");
    const valueType = getCanvasSemanticForMap("title", "h3");
    ctx.font = `${eyebrowType.weight} ${eyebrowType.size}px ${UI_FONT_FAMILY}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(label, x + 14, y + 10);
    pushTypographyDebugLabel("eyebrow", x + 14, y + 10);
    ctx.fillStyle = "#FFE7B8";
    ctx.font = `${valueType.weight} ${Math.max(20, Math.round(valueType.size * 0.86))}px ${UI_FONT_FAMILY}`;
    ctx.textBaseline = "alphabetic";
    ctx.fillText(value, x + 14, y + badgeH - 12);
    pushTypographyDebugLabel("h3", x + 14, y + badgeH - 12);
    ctx.restore();
  }

  function findDistrictAtPosition(point, rect) {
    const mapData = window.BattlechurchMapData;
    if (!mapData) return null;
    const dpr = window.devicePixelRatio || 1;
    // Use a larger hit radius than the visual node to make clicking easier
    const radius = HIT_RADIUS_BASE * dpr * 2.8;
    for (const district of mapData.districts) {
      const pos = getDistrictPosition(district, rect);
      const dx = point.x - pos.x;
      const dy = point.y - pos.y;
      if (Math.hypot(dx, dy) <= radius) return district;
    }
    return null;
  }

  function getUnlockedDistricts() {
    const mapData = window.BattlechurchMapData;
    if (!mapData) return [];
    return mapData.districts.filter((district) => isDistrictUnlocked(district.id));
  }

  function pickInitialDistrict() {
    const unlocked = getUnlockedDistricts();
    if (!unlocked.length) return null;
    return unlocked[0].id;
  }

  function getOrderedUnlockedDistricts() {
    const mapData = window.BattlechurchMapData;
    if (!mapData) return [];
    const fronts = mapData.getFronts ? mapData.getFronts() : []; // Already sorted by order: NW, NE, SW, SE
    const ordered = [];
    // Add districts front by front
    fronts.forEach((front) => {
      const districtsInFront = mapData.getDistrictsByFront(front.id);
      districtsInFront.forEach((district) => {
        if (isDistrictUnlocked(district.id)) {
          ordered.push(district);
        }
      });
    });
    // Add capital last
    const capital = mapData.districts.find((t) => t.type === "capital");
    if (capital && isDistrictUnlocked(capital.id)) {
      ordered.push(capital);
    }
    return ordered;
  }

  function pickNextDistrict(direction) {
    const mapData = window.BattlechurchMapData;
    if (!mapData || !state.selectedDistrictId) return state.selectedDistrictId;
    const ordered = getOrderedUnlockedDistricts();
    if (!ordered.length) return state.selectedDistrictId;
    const currentIndex = ordered.findIndex((t) => t.id === state.selectedDistrictId);
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
  function getCountyNumberForDistrict(districtId) {
    const mapData = window.BattlechurchMapData;
    if (!mapData) return 1;
    const district = mapData.districts.find(function(t) { return t.id === districtId; });
    if (!district) return 1;
    if (district.type === "capital") return 4;
    const fronts = mapData.getFronts ? mapData.getFronts() : []; // sorted by order
    const idx = fronts.findIndex(function(f) { return f.id === district.frontId; });
    return idx >= 0 ? idx + 1 : 1;
  }

  // County 1 = no picks; County 2 = 1 pick; County 3 = 2 picks; County 4 = 3 picks.
  function getDenomPickCountForDistrict(districtId) {
    const county = getCountyNumberForDistrict(districtId);
    if (county === 2) return 1;
    if (county === 3) return 2;
    if (county === 4) return 3;
    return 0;
  }

  function openDistrictPanel(districtId) {
    if (!isDistrictUnlocked(districtId)) return;
    if (typeof window !== "undefined" && typeof window.playMenuItemPickSfx === "function") {
      window.playMenuItemPickSfx(0.55);
    }
    state.selectedDistrictId = districtId;
    state.panelOpen = true;
    state.panelFocus = 0;
  }

  function closeDistrictPanel() {
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

  function drawDistrictPanel(ctx, canvas) {
    if (!state.panelOpen || !state.selectedDistrictId) return;
    const district = getDistrictById(state.selectedDistrictId);
    if (!district) return;
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
    const mapEyebrowType = getCanvasSemanticForMap("eyebrow", "eyebrow");
    const mapTitleType = getCanvasSemanticForMap("title", "h3");
    const mapAreaType = getCanvasSemanticForMap("areaLabel", "caption");
    const mapPrimaryType = getCanvasSemanticForMap("primary", "subhead");
    const mapSecondaryType = getCanvasSemanticForMap("secondary", "caption");
    const mapButtonType = getCanvasSemanticForMap("button", "button");
    ctx.fillStyle = panelStyle.eyebrowColor || MAP_HELLFIRE_TEXT.dim;
    ctx.font = `${mapEyebrowType.weight} ${panelStyle.eyebrowFontSize ?? mapEyebrowType.size}px ${UI_FONT_FAMILY}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const _eyebrowDistrictTerm = window.BattlechurchCampaignLabels?.terms?.district || "District";
    ctx.fillText(panelStyle.eyebrowText || `${_eyebrowDistrictTerm.toUpperCase()} TARGETED`, centerX, panelY + (panelStyle.eyebrowY ?? 14));
    pushTypographyDebugLabel("eyebrow", centerX, panelY + (panelStyle.eyebrowY ?? 14));

    ctx.fillStyle = panelStyle.titleColor || "#FFD978";
    ctx.font = `${mapTitleType.weight} ${panelStyle.titleFontSize ?? mapTitleType.size}px ${UI_FONT_FAMILY}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(district.name, centerX, panelY + (panelStyle.titleY ?? 34));
    pushTypographyDebugLabel("h3", centerX, panelY + (panelStyle.titleY ?? 34));

    const front = district.frontId ? getFrontById(district.frontId) : null;
    const areaNumber = Number.isFinite(front?.order) ? front.order + 1 : null;
    const areaLabel = front?.name || district.frontName || (Number.isFinite(areaNumber) ? `Front ${areaNumber}` : "");
    const districtScopeLabel = areaLabel || "this Front";
    const hasAreaLabel = Boolean(areaLabel);
    const areaVerticalOffset = hasAreaLabel ? 18 : 0;
    if (hasAreaLabel) {
      const areaY = panelY + (panelStyle.titleY ?? 34) + (panelStyle.titleFontSize ?? 28) + 4;
      ctx.fillStyle = panelStyle.eyebrowColor || MAP_HELLFIRE_TEXT.dim;
      ctx.font = `${mapAreaType.weight} ${Math.max(10, panelStyle.eyebrowFontSize ?? mapAreaType.size)}px ${UI_FONT_FAMILY}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(areaLabel, centerX, areaY);
      pushTypographyDebugLabel("caption", centerX, areaY);
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
    if (district.type === "capital") {
      primaryLine = `Final ${(typeof window !== "undefined" && window.PHASE_LABEL) || "Mission"}`;
      secondaryLine = `Score Multiplier: ×${getCapitalScoreMultiplier(progress).toFixed(2)}`;
    } else {
      const nextCamp = progress ? getNextCampaignForDistrict(district.id, progress) : "p1";
      const _phases = window.BattlechurchCampaignLabels?.phases || {};
      const campLabel = _phases[nextCamp] || nextCamp.toUpperCase();
      const campAvail =
        nextCamp === "p1" ||
        (nextCamp === "p2" ? isP2UnlockedForDistrict(district.id, progress) : isP3UnlockedForDistrict(district.id, progress));
      const districtEntry = progress?.districts?.[district.id] || {};
      const completedVisits = ["p1", "p2", "p3"].reduce(
        (sum, camp) => sum + (districtEntry?.[camp]?.completed === true ? 1 : 0),
        0,
      );
      primaryLine = `Current ${(typeof window !== "undefined" && window.PHASE_LABEL) || "Mission"}: ${campLabel}${campAvail ? "" : " (Locked)"}`;
      if (campAvail) {
        const activeRun = progress?.activeRun;
        const isInProgress = activeRun?.districtId === district.id && activeRun?.campaign === nextCamp && Number.isFinite(activeRun?.resumeLocalBattleNumber) && activeRun.resumeLocalBattleNumber > 1;
        if (isInProgress) {
          secondaryLine = `In Progress: ${(typeof window !== "undefined" && window.STAGE_LABEL) || "Battlefield"} ${activeRun.resumeLocalBattleNumber - 1}/3 done`;
        } else {
          secondaryLine = `${(typeof window !== "undefined" && window.STAGE_LABEL) || "Battlefield"}s Completed: ${completedVisits}/3`;
        }
      } else if (nextCamp === "p2") {
        const _unlockDistrictTerm = window.BattlechurchCampaignLabels?.terms?.districts || "districts";
        secondaryLine = `Complete ${_phases.p1 || "Invasion"} in all ${districtScopeLabel} ${_unlockDistrictTerm.toLowerCase()} to unlock ${_phases.p2 || "Occupation"}.`;
      } else {
        const _unlockDistrictTerm2 = window.BattlechurchCampaignLabels?.terms?.districts || "districts";
        secondaryLine = `Complete ${_phases.p2 || "Occupation"} in all ${districtScopeLabel} ${_unlockDistrictTerm2.toLowerCase()} to unlock ${_phases.p3 || "Fortification"}.`;
      }
    }
    ctx.fillStyle = panelStyle.primaryColor || MAP_HELLFIRE_TEXT.title;
    ctx.font = `${mapPrimaryType.weight} ${panelStyle.primaryFontSize ?? mapPrimaryType.size}px ${UI_FONT_FAMILY}`;
    ctx.fillText(primaryLine, centerX, panelY + (panelStyle.primaryY ?? 94) + areaVerticalOffset);
    pushTypographyDebugLabel("subhead", centerX, panelY + (panelStyle.primaryY ?? 94) + areaVerticalOffset);
    ctx.fillStyle = panelStyle.secondaryColor || MAP_HELLFIRE_TEXT.body;
    ctx.font = `${mapSecondaryType.weight} ${panelStyle.secondaryFontSize ?? mapSecondaryType.size}px ${UI_FONT_FAMILY}`;
    ctx.fillText(secondaryLine, centerX, panelY + (panelStyle.secondaryY ?? 124) + areaVerticalOffset);
    pushTypographyDebugLabel("caption", centerX, panelY + (panelStyle.secondaryY ?? 124) + areaVerticalOffset);

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
      ctx.font = `${mapButtonType.weight} ${mapButtonType.size}px ${UI_FONT_FAMILY}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(btn.label, btn.x + buttonW / 2, buttonY + buttonH / 2);
      pushTypographyDebugLabel("button", btn.x + buttonW / 2, buttonY + buttonH / 2);
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
        startRunForDistrict(state.selectedDistrictId);
      } else {
        if (typeof window !== "undefined" && typeof window.playMenuItemPickSfx === "function") {
          window.playMenuItemPickSfx(0.55);
        }
        closeDistrictPanel();
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
      closeDistrictPanel();
    }
    return true;
  }

  function _launchDistrict(districtId) {
    if (typeof window !== "undefined") {
      window.__mapDistrictLaunchFadeIn = {
        startMs: undefined,
        durationMs: 120,
        maxAlpha: 0.12,
      };
    }
    if (typeof window.startRunForDistrict === "function") {
      window.startRunForDistrict(districtId);
      return;
    }
    if (typeof window.startGameFromTitle === "function") {
      window.startGameFromTitle();
    }
  }

  function startRunForDistrict(districtId) {
    const picks = getDenomPickCountForDistrict(districtId);
    if (picks > 0) {
      // Show denominational upgrade screen before launching
      state.panelOpen = false;
      state.denomUpgrade = { active: true, districtId: districtId, maxPicks: picks, selectedKeys: [], focusedIndex: 0 };
      return;
    }
    const transition = state.mapLaunchTransition;
    transition.active = true;
    transition.districtId = districtId;
    transition.timer = 0;
    transition.launched = false;
    state.panelOpen = false;
  }

  function devStartRunForDistrict(districtId) {
    if (!districtId) return false;
    state.selectedDistrictId = districtId;
    state.panelOpen = false;
    startRunForDistrict(districtId);
    return true;
  }

  function confirmDenomUpgrade() {
    const du = state.denomUpgrade;
    if (!du || !du.active || du.selectedKeys.length < du.maxPicks) return;
    if (typeof window !== "undefined") {
      window.pendingDenomPowerups = du.selectedKeys.slice();
    }
    state.denomUpgrade = null;
    _launchDistrict(du.districtId);
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
    if (state.mapLaunchTransition?.active) {
      if (keysJustPressed.size) keysJustPressed.clear();
      return;
    }
    if (state.armyMarch?.active) {
      if (keysJustPressed.size) keysJustPressed.clear();
      return;
    }

    if (state.denomUpgrade?.active) {
      handleDenomUpgradeInput(input, keysJustPressed);
      keysJustPressed.clear();
      return;
    }

    const prevSelection = state.selectedDistrictId;
    if (state.panelOpen) {
      if (handlePanelInput(input, keysJustPressed)) {
        keysJustPressed.clear();
        return;
      }
    }

    const direction = getNavigationDirection(input, keysJustPressed);
    if (direction) {
      state.selectedDistrictId = pickNextDistrict(direction);
      // Give keyboard navigation priority until mouse moves again.
      if (input.pointerState) input.pointerState.active = false;
    }

    if (state.selectedDistrictId && state.selectedDistrictId !== prevSelection) {
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
      if (state.selectedDistrictId) {
        openDistrictPanel(state.selectedDistrictId);
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
    if (state.mapLaunchTransition?.active) return;
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
          startRunForDistrict(state.selectedDistrictId);
        } else {
          closeDistrictPanel();
        }
      return;
    }
    }
    const district = findDistrictAtPosition(click, rect);
    if (district && isDistrictUnlocked(district.id)) {
      if (district.id !== state.selectedDistrictId) {
        if (typeof window !== "undefined" && typeof window.playMenuItemPickSfx === "function") {
          window.playMenuItemPickSfx(0.55);
        }
      }
      openDistrictPanel(district.id);
    }
  }

  function updateSelectionFromHover(rect) {
    const input = window.Input;
    if (!input?.pointerState?.active) return;
    if (state.armyMarch?.active) return;
    if (state.panelOpen) return;
    const district = findDistrictAtPosition(input.pointerState, rect);
    if (district && isDistrictUnlocked(district.id)) {
      if (district.id !== state.selectedDistrictId) {
        state.selectedDistrictId = district.id;
        if (typeof window !== "undefined" && typeof window.playMenuItemPickSfx === "function") {
          window.playMenuItemPickSfx(0.4);
        }
      }
    }
  }

  const BETA_MAX_DISTRICT_ID = "red_creek";

  function ensureNextDistrictUnlocked(progress, mapData) {
    if (!progress || !mapData) return;
    const allDistricts = mapData.districts || [];
    const regularDistricts = allDistricts.filter((t) => t.type !== "capital");
    const unlockIds = new Set(progress.unlockedDistrictIds || []);

    // In beta (non-dev), cap unlocks at BETA_MAX_DISTRICT_ID
    const isBeta = typeof window !== "undefined" && !window.IS_DEV;
    const betaMaxIndex = isBeta
      ? regularDistricts.findIndex((t) => t.id === BETA_MAX_DISTRICT_ID)
      : -1;

    // First district is always unlocked
    const firstDistrictId = mapData.getFirstDistrictId ? mapData.getFirstDistrictId() : mapData.getFirstTownId();
    if (firstDistrictId) unlockIds.add(firstDistrictId);

    // For each P1-completed regular town, unlock the next regular town in sequence
    let allRegularP1Done = regularDistricts.length > 0;
    for (let i = 0; i < regularDistricts.length; i++) {
      const district = regularDistricts[i];
      const p1Done = progress.districts[district.id]?.p1?.completed === true;
      if (!p1Done) {
        allRegularP1Done = false;
        continue;
      }
      const nextId = getNextDistrictInOrder(district.id);
      if (nextId) {
        const nextDistrict = allDistricts.find((t) => t.id === nextId);
        if (nextDistrict && nextDistrict.type !== "capital") {
          // Beta: don't unlock anything past the max district
          const nextIndex = regularDistricts.findIndex((t) => t.id === nextId);
          if (isBeta && betaMaxIndex >= 0 && nextIndex > betaMaxIndex) continue;
          unlockIds.add(nextId);
        }
      }
    }

    // Capital unlocks only when all 9 regular towns have P1 done (never in beta)
    if (!isBeta && allRegularP1Done) {
      const capital = allDistricts.find((t) => t.type === "capital");
      if (capital) unlockIds.add(capital.id);
    }

    progress.unlockedDistrictIds = Array.from(unlockIds);
  }

  function getNextDistrictInOrder(districtId) {
    const mapData = window.BattlechurchMapData;
    if (!mapData || !districtId) return null;
    const district = getDistrictById(districtId);
    if (!district) return null;

    // Capital (Highgate) is the final district - no next one
    if (district.type === "capital") return null;

    const fronts = mapData.getFronts ? mapData.getFronts() : [];
    const frontIndex = fronts.findIndex((f) => f.id === district.frontId);
    if (frontIndex < 0) return null;

    const districtsInFront = mapData.getDistrictsByFront(fronts[frontIndex].id);
    const indexInFront = districtsInFront.findIndex((t) => t.id === districtId);

    // Next district in same front
    if (indexInFront >= 0 && indexInFront < districtsInFront.length - 1) {
      return districtsInFront[indexInFront + 1].id;
    }

    // First district in next front
    if (frontIndex < fronts.length - 1) {
      const nextFrontDistricts = mapData.getDistrictsByFront(fronts[frontIndex + 1].id);
      if (nextFrontDistricts.length) return nextFrontDistricts[0].id;
    }

    // All fronts done - go to capital (Highgate)
    const capital = mapData.districts.find((t) => t.type === "capital");
    return capital ? capital.id : null;
  }

  // --- Campaign phase / unlock helpers ---

  // Returns true if all towns in a county have the given campaign completed
  function isCountyDone(frontId, campaign, progress) {
    const mapData = window.BattlechurchMapData;
    if (!mapData || !frontId || !progress) return false;
    const districts = mapData.getDistrictsByFront(frontId);
    return districts.length > 0 && districts.every((t) => progress.districts[t.id]?.[campaign]?.completed === true);
  }

  // Returns true if P2 is unlocked for this district (front has all P1s done)
  function isP2UnlockedForDistrict(districtId, progress) {
    const district = getDistrictById(districtId);
    if (!district || district.type === "capital") return false;
    return isCountyDone(district.frontId, "p1", progress);
  }

  // Returns true if P3 is unlocked for this district (front has all P2s done)
  function isP3UnlockedForDistrict(districtId, progress) {
    const district = getDistrictById(districtId);
    if (!district || district.type === "capital") return false;
    return isCountyDone(district.frontId, "p2", progress);
  }

  // Returns true if capital (Highgate) is unlocked (all 9 regular towns P1 done)
  function isCapitalUnlocked(progress) {
    const mapData = window.BattlechurchMapData;
    if (!mapData || !progress) return false;
    const regularDistricts = mapData.districts.filter((t) => t.type !== "capital");
    return regularDistricts.length > 0 && regularDistricts.every((t) => progress.districts[t.id]?.p1?.completed === true);
  }

  // Returns 'p1' | 'p2' | 'p3' — the next campaign to play for a town
  function getNextCampaignForDistrict(districtId, progress) {
    if (!progress) return "p1";
    const districtEntry = progress.districts?.[districtId];
    if (!districtEntry?.p1?.completed) return "p1";
    if (!districtEntry?.p2?.completed) return "p2";
    return "p3"; // p3 done or in progress — replay p3 if all done
  }

  // Merges church powerup levels from prior campaigns for the given campaign
  function mergeChurchPowerupLevels(districtId, campaign, progress) {
    if (campaign === "p1") return {};
    const p1Levels = progress?.districts?.[districtId]?.p1?.churchPowerupLevels || {};
    if (campaign === "p2") return { ...p1Levels };
    const p2Levels = progress?.districts?.[districtId]?.p2?.churchPowerupLevels || {};
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
    const regularDistricts = mapData.districts.filter((t) => t.type !== "capital");
    if (!regularDistricts.length) return 1.0;
    const allP3 = regularDistricts.every((t) => progress.districts?.[t.id]?.p3?.completed === true);
    if (allP3) return 1.1;
    const allP2 = regularDistricts.every((t) => progress.districts?.[t.id]?.p2?.completed === true);
    if (allP2) return 1.05;
    return 1.0;
  }

  // Returns all data needed to start a campaign run for a town
  function getDistrictCampaignData(districtId) {
    const progress = ensureProgress();
    const mapData = window.BattlechurchMapData;
    const defaultStart = mapData ? (mapData.getDefaultDistrictStartCount ? mapData.getDefaultDistrictStartCount(districtId) : mapData.getDefaultTownStartCount(districtId)) : 50;
    if (!progress) {
      return { campaign: "p1", startCount: defaultStart, campaignMultiplier: 1.0, restoredChurchPowerupLevels: {} };
    }
    const campaign = getNextCampaignForDistrict(districtId, progress);
    let startCount;
    if (campaign === "p1") {
      startCount = defaultStart;
    } else if (campaign === "p2") {
      startCount = progress.districts?.[districtId]?.p1?.bestCount ?? defaultStart;
    } else {
      startCount = progress.districts?.[districtId]?.p2?.bestCount ?? defaultStart;
    }
    const multiplier = campaign === "p1" ? 1.0 : campaign === "p2" ? 1.15 : 1.1;
    const activeRun = progress?.activeRun;
    const baseGraceCount = Number.isFinite(progress?.graceCount)
      ? Math.max(0, Math.round(progress.graceCount))
      : 0;
    const canResumeFromCheckpoint =
      activeRun &&
      activeRun.districtId === districtId &&
      activeRun.campaign === campaign &&
      Number.isFinite(activeRun.resumeLocalBattleNumber) &&
      activeRun.resumeLocalBattleNumber > 1;
    const restoredChurchPowerupLevels = canResumeFromCheckpoint
      ? { ...(activeRun.churchPowerupLevels || {}) }
      : mergeChurchPowerupLevels(districtId, campaign, progress);
    const checkpointStartCount = Number.isFinite(activeRun?.startCount)
      ? Math.max(0, Math.round(activeRun.startCount))
      : null;
    const resolvedStartCount = canResumeFromCheckpoint && checkpointStartCount != null
      ? checkpointStartCount
      : startCount;
    const savedGraceCount = canResumeFromCheckpoint && Number.isFinite(activeRun?.graceCount)
      ? Math.max(0, Math.round(activeRun.graceCount))
      : baseGraceCount;
    const restoredPastorPowerupLevels = progress.pastorPowerupLevels && typeof progress.pastorPowerupLevels === "object"
      ? { ...progress.pastorPowerupLevels }
      : null;
    return {
      campaign,
      startCount: resolvedStartCount,
      campaignMultiplier: multiplier,
      restoredChurchPowerupLevels,
      restoredPastorPowerupLevels,
      savedGraceCount,
      resumeLocalBattleNumber: canResumeFromCheckpoint
        ? Math.max(1, Math.floor(activeRun.resumeLocalBattleNumber))
        : 1,
      resumeFromCheckpoint: Boolean(canResumeFromCheckpoint),
    };
  }

  function selectDistrict(districtId) {
    if (!districtId) return;
    state.selectedDistrictId = districtId;
  }

  // campaign: 'p1' | 'p2' | 'p3'
  // savedChurchPowerupLevels: plain object { [powerupId]: 0|1|2 } (omit for p3)
  async function recordDistrictCompletion(districtId, congregationCount, campaign, savedChurchPowerupLevels, graceCount = null) {
    if (!districtId) return;
    const mapData = window.BattlechurchMapData;
    if (!mapData) return;
    if (!state.mapProgress) {
      await loadPlayerProgress();
    }
    const progress = ensureProgress();
    if (!progress) return;

    const activeCampaign = campaign || "p1";

    if (!progress.districts[districtId]) progress.districts[districtId] = {};
    const existingCamp = progress.districts[districtId][activeCampaign] || {};
    const currentBest = existingCamp.bestCount;

    const campData = {
      completed: true,
      bestCount: currentBest == null || congregationCount > currentBest ? congregationCount : currentBest,
    };
    // Save powerup snapshot for P1 and P2 (P3 doesn't carry forward)
    if (activeCampaign !== "p3") {
      campData.churchPowerupLevels = savedChurchPowerupLevels || {};
    }
    progress.districts[districtId][activeCampaign] = campData;
    if (Number.isFinite(graceCount) && graceCount >= 0) {
      progress.graceCount = Math.max(0, Math.round(graceCount));
    }
    if (progress.activeRun && progress.activeRun.districtId === districtId && progress.activeRun.campaign === activeCampaign) {
      progress.activeRun = null;
    }
    // Save pastor powerup levels (persist across all districts)
    const livePastorLevels = typeof window !== "undefined" && window.pastorPowerupLevels instanceof Map
      ? Object.fromEntries(window.pastorPowerupLevels)
      : null;
    if (livePastorLevels) progress.pastorPowerupLevels = livePastorLevels;

    // Mark denominations unlocked once first district is completed (for Protestant players)
    if (!progress.denominationsUnlocked) {
      const firstFront = (mapData.fronts || []).find((f) => f.order === 0);
      if (firstFront) {
        const firstFrontDistricts = (mapData.districts || []).filter((d) => d.frontId === firstFront.id);
        const firstDistrictDone = firstFrontDistricts.length > 0 &&
          firstFrontDistricts.every((d) => progress.districts?.[d.id]?.p1?.completed === true);
        if (firstDistrictDone) progress.denominationsUnlocked = true;
      }
    }

    // Recompute sequential town unlocks
    ensureNextDistrictUnlocked(progress, mapData);

    const activeSave = getActiveSave();
    if (activeSave) {
      activeSave.lastPlayedAt = Date.now();
    }
    syncActiveSaveProgressMirror();
    await persistPlayerDoc();
  }

  async function saveMissionCheckpoint({
    districtId,
    campaign,
    resumeLocalBattleNumber,
    startCount,
    churchPowerupLevels,
    graceCount,
  } = {}) {
    if (!districtId || !campaign) return false;
    const mapData = window.BattlechurchMapData;
    if (!mapData) return false;
    if (!state.mapProgress) {
      await loadPlayerProgress();
    }
    const progress = ensureProgress();
    if (!progress) return false;
    progress.activeRun = {
      districtId,
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
    // Save pastor powerup levels at checkpoint
    const livePastorLevels = typeof window !== "undefined" && window.pastorPowerupLevels instanceof Map
      ? Object.fromEntries(window.pastorPowerupLevels)
      : null;
    if (livePastorLevels) progress.pastorPowerupLevels = livePastorLevels;

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
    const districtId = options && typeof options === "object" ? options.districtId : null;
    const campaign = options && typeof options === "object" ? options.campaign : null;
    if (!state.mapProgress) {
      await loadPlayerProgress();
    }
    const progress = ensureProgress();
    if (!progress?.activeRun) return true;
    const matchesTown = !districtId || progress.activeRun.districtId === districtId;
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
    if (!state.selectedDistrictId) state.selectedDistrictId = pickInitialDistrict();
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
    const districts = Array.isArray(mapData?.districts) ? mapData.districts : [];
    const saveFiles = state.playerDoc?.saveFiles || {};
    const activeSaveId = state.playerDoc?.activeSaveId || null;
    const summaries = Object.entries(saveFiles).map(([id, save]) => {
      const mapProgress = save?.mapProgress || { districts: {}, unlockedDistrictIds: [] };
      const completedP1Districts = districts.filter((district) => mapProgress?.districts?.[district.id]?.p1?.completed === true).length;
      const totalDistricts = Math.max(1, districts.length || 10);
      let totalCongregationBest = 0;
      let totalReplayCompletions = 0;
      let totalUpgradeLevels = 0;
      const districtProgressRows = districts.map((district) => {
        const districtProgress = mapProgress?.districts?.[district.id] || {};
        const p1 = districtProgress?.p1 || {};
        const p2 = districtProgress?.p2 || {};
        const p3 = districtProgress?.p3 || {};
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
          districtId: district.id,
          districtName: district.name || district.id || "Unknown Town",
          p1Completed: p1?.completed === true,
          bestCount,
          completions: campaignsCompleted,
          upgradeTypeCount,
          upgradeLevelTotal,
        };
      });
      const firstDistrictId = mapData?.getFirstDistrictId?.() || districts[0]?.id || null;
      const regularDistrictIds = districts.filter((district) => district.type !== "capital").map((district) => district.id);
      const capitalDistrictId = districts.find((district) => district.type === "capital")?.id || null;
      const unlocked = new Set(firstDistrictId ? [firstDistrictId] : []);
      for (let i = 0; i < regularDistrictIds.length; i += 1) {
        if (mapProgress?.districts?.[regularDistrictIds[i]]?.p1?.completed === true && regularDistrictIds[i + 1]) {
          unlocked.add(regularDistrictIds[i + 1]);
        }
      }
      if (regularDistrictIds.length > 0 && regularDistrictIds.every((districtId) => mapProgress?.districts?.[districtId]?.p1?.completed === true) && capitalDistrictId) {
        unlocked.add(capitalDistrictId);
      }
      const orderedDistrictIds = districts.map((district) => district.id);
      const suggestedDistrictId =
        orderedDistrictIds.find((districtId) => unlocked.has(districtId) && !(mapProgress?.districts?.[districtId]?.p1?.completed)) ||
        [...orderedDistrictIds].reverse().find((districtId) => unlocked.has(districtId)) ||
        firstDistrictId ||
        null;
      const activeRun = mapProgress?.activeRun || null;
      const activeRunDistrictId = activeRun?.districtId || null;
      const activeRunDistrictName = activeRunDistrictId ? (districts.find((t) => t.id === activeRunDistrictId)?.name || activeRunDistrictId) : null;
      const activeRunActNumber = Number.isFinite(activeRun?.resumeLocalBattleNumber) ? activeRun.resumeLocalBattleNumber : null;
      const activeRunCongregation = Number.isFinite(activeRun?.startCount) ? activeRun.startCount : null;
      return {
        id,
        saveName: save?.saveName || `Save ${id}`,
        playerName: save?.playerName || "Pastor",
        classId: save?.classId || getDefaultClassIdForSaves(),
        classTitle: resolveClassMetaForSave(save?.classId).classTitle,
        cityName: save?.cityName || "",
        createdAt: Number.isFinite(save?.createdAt) ? save.createdAt : null,
        lastPlayedAt: Number.isFinite(save?.lastPlayedAt) ? save.lastPlayedAt : null,
        playtimeSec: Number.isFinite(save?.playtimeSec) ? save.playtimeSec : 0,
        completedP1Districts,
        totalDistricts,
        totalCongregationBest,
        totalReplayCompletions,
        totalUpgradeLevels,
        districtProgressRows,
        suggestedDistrictId,
        suggestedDistrictName: districts.find((district) => district.id === suggestedDistrictId)?.name || "",
        isActive: id === activeSaveId,
        activeRunDistrictId,
        activeRunDistrictName,
        activeRunActNumber,
        activeRunCongregation,
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
    const saveClassMeta = resolveClassMetaForSave(state.playerDoc.saveFiles[saveId].classId);
    state.playerDoc.saveFiles[saveId].classId = saveClassMeta.classId;
    if (typeof window.BattlechurchClasses?.setActive === "function") {
      window.BattlechurchClasses.setActive(saveClassMeta.classId);
    }
    ensureProgress();
    rebuildArmyMarchRouteFromProgress();
    if (!state.selectedDistrictId || !isDistrictUnlocked(state.selectedDistrictId)) {
      state.selectedDistrictId = pickInitialDistrict();
    }
    const activeSave = getActiveSave();
    if (activeSave) activeSave.lastPlayedAt = Date.now();
    syncActiveSaveProgressMirror();
    await persistPlayerDoc();
    return true;
  }

  async function createSaveFile({ saveName, playerName, cityName, classId = null, sourceSaveId = null, setActive = true } = {}) {
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
    const fallbackCityName = state.playerDoc.saveFiles[state.playerDoc.activeSaveId]?.cityName || "";
    const fallbackClassId = state.playerDoc.saveFiles[state.playerDoc.activeSaveId]?.classId || getDefaultClassIdForSaves();
    const newSaveClassMeta = resolveClassMetaForSave(classId || source?.classId || fallbackClassId);
    state.playerDoc.saveFiles[saveId] = {
      saveName: typeof saveName === "string" && saveName.trim() ? saveName.trim() : `Save ${Object.keys(state.playerDoc.saveFiles).length + 1}`,
      playerName: typeof playerName === "string" && playerName.trim() ? playerName.trim() : (source?.playerName || fallbackPlayerName),
      cityName: typeof cityName === "string" && cityName.trim() ? cityName.trim() : (source?.cityName || fallbackCityName),
      classId: newSaveClassMeta.classId,
      createdAt: Date.now(),
      lastPlayedAt: Date.now(),
      playtimeSec: 0,
      mapProgress: sourceMapProgress,
    };
    if (setActive) {
      state.playerDoc.activeSaveId = saveId;
      state.mapProgress = state.playerDoc.saveFiles[saveId].mapProgress;
      ensureProgress();
      rebuildArmyMarchRouteFromProgress();
      if (!state.selectedDistrictId || !isDistrictUnlocked(state.selectedDistrictId)) {
        state.selectedDistrictId = pickInitialDistrict();
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
      rebuildArmyMarchRouteFromProgress();
      if (!state.selectedDistrictId || !isDistrictUnlocked(state.selectedDistrictId)) {
        state.selectedDistrictId = pickInitialDistrict();
      }
    }
    syncActiveSaveProgressMirror();
    await persistPlayerDoc();
    return true;
  }

  async function setClassForActiveSave(classId, { persist = true } = {}) {
    if (!state.playerDoc?.saveFiles || !state.playerDoc.activeSaveId) return false;
    const activeSave = state.playerDoc.saveFiles[state.playerDoc.activeSaveId];
    if (!activeSave || typeof activeSave !== "object") return false;
    const classMeta = resolveClassMetaForSave(classId);
    activeSave.classId = classMeta.classId;
    activeSave.lastPlayedAt = Date.now();
    syncActiveSaveProgressMirror();
    if (persist) {
      await persistPlayerDoc();
    }
    return true;
  }

  async function devAwardNextDistrict({
    congregationCount = 100,
    campaign = "p1",
    churchPowerupLevels = {},
  } = {}) {
    const progress = ensureProgress();
    const mapData = window.BattlechurchMapData;
    if (!mapData?.districts?.length) return null;
    ensureNextDistrictUnlocked(progress, mapData);
    const orderedDistricts = mapData.districts.filter((district) => district && district.id);
    const unlockedSet = new Set(progress.unlockedDistrictIds || []);
    const targetDistrict =
      orderedDistricts.find((district) => unlockedSet.has(district.id) && !progress?.districts?.[district.id]?.p1?.completed) ||
      null;
    if (!targetDistrict) return null;

    if (!progress.districts[targetDistrict.id]) progress.districts[targetDistrict.id] = {};
    const existing = progress.districts[targetDistrict.id][campaign] || {};
    progress.districts[targetDistrict.id][campaign] = {
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

    ensureNextDistrictUnlocked(progress, mapData);
    const nextDistrict =
      orderedDistricts.find((district) => (progress.unlockedDistrictIds || []).includes(district.id) && !progress?.districts?.[district.id]?.p1?.completed) ||
      targetDistrict;
    state.selectedDistrictId = nextDistrict?.id || targetDistrict.id;
    const activeSave = getActiveSave();
    if (activeSave) activeSave.lastPlayedAt = Date.now();
    syncActiveSaveProgressMirror();
    await persistPlayerDoc();
    return {
      awardedDistrictId: targetDistrict.id,
      awardedDistrictName: targetDistrict.name || targetDistrict.id,
      nextDistrictId: nextDistrict?.id || null,
      nextDistrictName: nextDistrict?.name || nextDistrict?.id || null,
    };
  }

  function setDemoProfile({ completedDistricts = 0, playerName = null, cityName = null, classId = null, districtPowerups = null, districtStartCounts = null } = {}) {
    const mapData = window.BattlechurchMapData;
    if (!mapData?.districts?.length) return false;
    const progress = createFreshMapProgress(mapData);
    const regularDistrictIds = mapData.districts
      .filter((district) => district && district.type !== "capital")
      .map((district) => district.id)
      .filter(Boolean);
    const targetIds = regularDistrictIds.slice(0, Math.max(0, Number(completedDistricts) || 0));
    targetIds.forEach((districtId) => {
      if (!progress.districts[districtId]) progress.districts[districtId] = {};
      const powerups = (districtPowerups && districtPowerups[districtId]) ? districtPowerups[districtId] : {};
      const bestCount = (districtStartCounts && Number.isFinite(districtStartCounts[districtId])) ? districtStartCounts[districtId] : 100;
      progress.districts[districtId].p1 = {
        completed: true,
        bestCount,
        churchPowerupLevels: powerups,
      };
    });
    ensureNextDistrictUnlocked(progress, mapData);
    const classMeta = resolveClassMetaForSave(classId);
    state.demoProfile = {
      mapProgress: progress,
      playerName: typeof playerName === "string" && playerName.trim() ? playerName.trim() : null,
      cityName: typeof cityName === "string" && cityName.trim() ? cityName.trim() : null,
      classId: classMeta.classId || null,
    };
    state.mapProgress = progress;
    if (!state.selectedDistrictId || !isDistrictUnlocked(state.selectedDistrictId)) {
      state.selectedDistrictId = pickInitialDistrict();
    }
    if (classMeta.classId && typeof window.BattlechurchClasses?.setActive === "function") {
      window.BattlechurchClasses.setActive(classMeta.classId);
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

  async function updateSaveFileMetadata(
    saveId,
    { saveName = null, playerName = null, cityName = null, classId = null } = {},
  ) {
    const target = state.playerDoc?.saveFiles?.[saveId];
    if (!target) return false;
    if (typeof saveName === "string" && saveName.trim()) {
      target.saveName = saveName.trim();
    }
    if (typeof playerName === "string" && playerName.trim()) {
      target.playerName = playerName.trim();
    }
    if (typeof cityName === "string") {
      target.cityName = cityName.trim();
    }
    if (typeof classId === "string" && classId.trim()) {
      const classMeta = resolveClassMetaForSave(classId);
      target.classId = classMeta.classId;
      if (state.playerDoc.activeSaveId === saveId && typeof window.BattlechurchClasses?.setActive === "function") {
        window.BattlechurchClasses.setActive(classMeta.classId);
      }
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
      if (!state.selectedDistrictId || !isDistrictUnlocked(state.selectedDistrictId)) {
        state.selectedDistrictId = pickInitialDistrict();
      }
    }
    syncActiveSaveProgressMirror();
    await persistPlayerDoc();
    return true;
  }

  function close() {
    state.active = false;
    state.panelOpen = false;
    state.mapLaunchTransition.active = false;
    state.mapLaunchTransition.districtId = null;
    state.mapLaunchTransition.timer = 0;
    state.mapLaunchTransition.launched = false;
    stopMapAmbient();
  }

  function update(dt) {
    if (!state.active) return;
    loadMapImages();
    loadDistrictExteriorImage();
    updateArmyMarchAnimation(dt);
    handleMapInput();
    const mapData = window.BattlechurchMapData;
    if (mapData) {
      mapData.districts.forEach((district) => {
        const bestCount = getDistrictBestCount(district.id);
        const animState = getDistrictAnimatorState(district, bestCount);
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
    const transition = state.mapLaunchTransition;
    if (transition.active) {
      const step = Number.isFinite(dt) ? dt : 0;
      const duration = Math.max(0.05, Number(transition.duration) || 1.25);
      transition.timer = Math.min(duration, transition.timer + Math.max(0, step));
      const handoffRatio = Math.max(0.05, Math.min(0.995, Number(transition.handoffRatio) || 0.98));
      if (!transition.launched && transition.timer >= duration * handoffRatio) {
        transition.launched = true;
        const launchDistrictId = transition.districtId || state.selectedDistrictId;
        transition.active = false;
        transition.districtId = null;
        transition.timer = 0;
        _launchDistrict(launchDistrictId);
      }
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
        return { key: entry[0], label: entry[1].label, description: entry[1].shopDescription || entry[1].description, iconSrc: entry[1].iconSrc };
      });
    const uiFontFamily =
      (typeof window !== "undefined" && window.UI_FONT_FAMILY) ||
      "'VT323', 'Press Start 2P', monospace";
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
    const transition = state.mapLaunchTransition;
    const transitionActive = Boolean(transition?.active);
    const transitionDuration = Math.max(0.05, Number(transition?.duration) || 1.25);
    const transitionProgress = transitionActive
      ? Math.max(0, Math.min(1, Number(transition.timer || 0) / transitionDuration))
      : 0;
    const easedProgress = transitionProgress * transitionProgress * (3 - 2 * transitionProgress);
    const zoomInRatio = Math.max(0.05, Math.min(0.8, Number(transition?.zoomInRatio) || 0.22));
    const holdRatio = Math.max(0.05, Math.min(0.9, Number(transition?.holdRatio) || 0.54));
    const crossfadeRatio = Math.max(0.05, Math.min(0.9, Number(transition?.crossfadeRatio) || 0.24));
    const zoomEnd = zoomInRatio;
    const holdEnd = Math.min(0.99, zoomEnd + holdRatio);
    const crossfadeStart = holdEnd;
    const crossfadeEnd = Math.min(1, crossfadeStart + crossfadeRatio);
    const zoomT = transitionProgress <= zoomEnd
      ? Math.max(0, Math.min(1, transitionProgress / Math.max(0.001, zoomEnd)))
      : 1;
    const easedZoomT = zoomT * zoomT * (3 - 2 * zoomT);
    const crossfadeT = transitionProgress <= crossfadeStart
      ? 0
      : Math.max(
          0,
          Math.min(
            1,
            (transitionProgress - crossfadeStart) / Math.max(0.001, crossfadeEnd - crossfadeStart),
          ),
        );
    const easedCrossfadeT = crossfadeT * crossfadeT * (3 - 2 * crossfadeT);
    const nowMs = typeof performance !== "undefined" ? performance.now() : Date.now();
    const realmState = resolveMapRealmState(nowMs);
    const activeMapImage = getActiveMapImage(realmState.demon);
    let rect = computeMapRect(canvas, activeMapImage);
    if (transitionActive) {
      const district = getDistrictById(transition.districtId || state.selectedDistrictId);
      if (district) {
        const target = getDistrictPosition(district, rect);
        if (target && Number.isFinite(target.x) && Number.isFinite(target.y)) {
          const maxScale = Math.max(1, Number(transition.maxScale) || 1.85);
          const scale = 1 + (maxScale - 1) * easedZoomT;
          const centerX = canvas.width * 0.5;
          const centerY = canvas.height * 0.5;
          const panX = (centerX - target.x) * easedZoomT;
          const panY = (centerY - target.y) * easedZoomT;
          ctx.translate(panX, panY);
          ctx.translate(target.x, target.y);
          ctx.scale(scale, scale);
          ctx.translate(-target.x, -target.y);
        }
      }
    }
    rect = drawMapBackground(ctx, canvas, activeMapImage);
    if (transitionActive) {
      const mapEmberAlpha = Math.max(0, Math.min(1, 1 - easedCrossfadeT));
      if (realmState.demon && mapEmberAlpha > 0.001) {
        drawFireOverlayInCurrentTransform(ctx, canvas, 1.8, 1.0, mapEmberAlpha, rect);
      }
    } else if (realmState.demon) {
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
    }
    drawMapLabels(ctx, canvas, rect);
    drawMapHeadingText(ctx, canvas);
    drawTotalCongregationBadge(ctx, canvas);
    if (!transitionActive) {
      updateSelectionFromHover(rect);
    }
    const pulse = Math.sin((Date.now() / 1000) * 3) * 2;
    drawFrontlineBoundary(ctx, rect);
    const mapData = window.BattlechurchMapData;
    if (mapData) {
      mapData.districts.forEach((district) =>
        drawDistrictNode(ctx, district, rect, pulse, { showDemonIcons: realmState.demon }),
      );
    }
    drawInitialMarchOriginMarker(ctx);
    drawArmyMarchOverlay(ctx);
    if (!transitionActive) {
      handleMapClicks(rect);
      drawDistrictPanel(ctx, canvas);
      drawDenomUpgradeOverlay(ctx, canvas);
    }
    if (transitionActive) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (districtExteriorImageLoaded && districtExteriorImage) {
        drawWavyCoverImage(ctx, canvas, districtExteriorImage, Math.max(0, Math.min(1, easedCrossfadeT)));
        const fireOverlay = typeof window !== "undefined" ? window.fireOverlay : null;
        if (fireOverlay && typeof fireOverlay.draw === "function" && easedCrossfadeT > 0.001) {
          ctx.save();
          ctx.globalAlpha = Math.max(0, Math.min(1, easedCrossfadeT));
          if (typeof fireOverlay.setBounds === "function") {
            fireOverlay.setBounds(0, 0, canvas.width, canvas.height);
          }
          if (typeof fireOverlay.setIntensity === "function") {
            fireOverlay.setIntensity(1.9);
          }
          if (typeof fireOverlay.setSizeScale === "function") {
            fireOverlay.setSizeScale(0.7);
          }
          fireOverlay.draw(ctx);
          ctx.restore();
        }
      } else {
        ctx.fillStyle = `rgba(0, 0, 0, ${Math.max(0, Math.min(0.35, easedCrossfadeT * 0.35))})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
    ctx.restore();
  }

  function getOccupiedDistrictPositions(rect) {
    const mapData = window.BattlechurchMapData;
    const progress = ensureProgress();
    if (!mapData?.districts?.length || !progress) return [];
    return mapData.districts
      .filter((district) => district && district.id && district.type !== "capital")
      .filter((district) => progress.districts?.[district.id]?.p1?.completed === true)
      .map((district) => getDistrictPosition(district, rect))
      .filter((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y));
  }

  function buildConvexHull(points) {
    if (!Array.isArray(points) || points.length < 3) return points ? points.slice() : [];
    const pts = points
      .map((p) => ({ x: p.x, y: p.y }))
      .sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
    const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const lower = [];
    for (const p of pts) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
      lower.push(p);
    }
    const upper = [];
    for (let i = pts.length - 1; i >= 0; i -= 1) {
      const p = pts[i];
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
      upper.push(p);
    }
    lower.pop();
    upper.pop();
    return lower.concat(upper);
  }

  function expandHull(points, padding) {
    if (!Array.isArray(points) || !points.length) return [];
    const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
    const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
    return points.map((p) => {
      const dx = p.x - cx;
      const dy = p.y - cy;
      const len = Math.hypot(dx, dy) || 1;
      return {
        x: p.x + (dx / len) * padding,
        y: p.y + (dy / len) * padding,
      };
    });
  }

  function drawFrontlineBoundary(ctx, rect) {
    const mapData = window.BattlechurchMapData;
    const progress = ensureProgress();
    const occupied = getOccupiedDistrictPositions(rect);
    if (!occupied.length || !mapData?.districts?.length || !progress) return;
    const regularDistricts = mapData.districts.filter((district) => district && district.id && district.type !== "capital");
    const occupiedSet = new Set(
      regularDistricts
        .filter((district) => progress.districts?.[district.id]?.p1?.completed === true)
        .map((district) => district.id),
    );
    const occupiedPoints = regularDistricts
      .filter((district) => occupiedSet.has(district.id))
      .map((district) => getDistrictPosition(district, rect))
      .filter((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y))
      .sort((a, b) => a.y - b.y);
    const enemyPoints = regularDistricts
      .filter((district) => !occupiedSet.has(district.id))
      .map((district) => getDistrictPosition(district, rect))
      .filter((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y));
    if (!occupiedPoints.length) return;
    const linePad = 14;
    const topY = rect.y;
    const botY = rect.y + rect.h - linePad;
    const occupiedCount = occupiedPoints.length;
    const lateCampaign = occupiedCount >= 8;
    let startAnchorY = topY;
    if (occupiedCount === 8) {
      startAnchorY = topY + (botY - topY) * 0.45;
    } else if (occupiedCount >= 9) {
      startAnchorY = topY + (botY - topY) * 0.54;
    }
    const absMinPad = 100;
    const occPad = 100;
    const enemyPad = 150;
    const yInfluence = enemyPad * 1.7;
    // Friendly "coverage" range should be tight; otherwise one town falsely covers nearby enemy towns.
    const friendlyHoldY = absMinPad * 1.2;
    const leftBound = rect.x + linePad;
    const rightBound = rect.x + rect.w - linePad;
    const frontierPts = occupiedPoints.map((p) => {
      let x = p.x + occPad;
      let enemyCapX = Infinity;
      let enemyCanOverrideMin = false;
      for (const e of enemyPoints) {
        const dy = Math.abs(e.y - p.y);
        if (dy > yInfluence) continue;
        const friendlyCoversThisEnemy = dy <= friendlyHoldY;
        if (friendlyCoversThisEnemy) continue;
        const squeeze = 1 - (dy / yInfluence);
        const cap = e.x - enemyPad * (0.8 + 0.2 * squeeze);
        if (cap < x) x = cap;
        if (cap < enemyCapX) enemyCapX = cap;
        if (cap < (p.x + occPad)) enemyCanOverrideMin = true;
      }
      x = Math.max(leftBound + 18, Math.min(rightBound, x));
      return {
        x,
        y: p.y,
        minX: p.x + occPad,
        hardMinX: p.x + absMinPad,
        enemyCapX,
        enemyCanOverrideMin,
      };
    });
    // Keep the contour from zig-zagging too sharply.
    for (let i = 1; i < frontierPts.length; i += 1) {
      const prev = frontierPts[i - 1];
      const cur = frontierPts[i];
      const maxStep = 86;
      if (Math.abs(cur.x - prev.x) > maxStep) {
        cur.x = prev.x + Math.sign(cur.x - prev.x) * maxStep;
      }
    }
    for (let i = frontierPts.length - 2; i >= 0; i -= 1) {
      const next = frontierPts[i + 1];
      const cur = frontierPts[i];
      const maxStep = 86;
      if (Math.abs(cur.x - next.x) > maxStep) {
        cur.x = next.x + Math.sign(cur.x - next.x) * maxStep;
      }
    }
    // Friendly towns hold the line unless enemy influence is outside friendly range.
    for (const p of frontierPts) {
      if (Number.isFinite(p.enemyCapX)) {
        p.x = Math.min(p.enemyCapX, p.x);
      }
      if (!p.enemyCanOverrideMin) {
        p.x = Math.max(p.minX, p.x);
      }
      // Absolute minimum friendly territory radius (cannot be overridden).
      p.x = Math.max(p.hardMinX, p.x);
      p.x = Math.max(leftBound + 18, Math.min(rightBound, p.x));
    }
    const drawFrontierPts = lateCampaign
      ? frontierPts.filter((p) => p.y >= (startAnchorY - 8))
      : frontierPts;
    if (!drawFrontierPts.length) return;
    const topBulge = {
      x: lateCampaign
        ? rightBound
        : Math.max(leftBound, Math.min(rightBound, drawFrontierPts[0].x - 38)),
      y: startAnchorY,
    };
    const bottomAnchorY = drawFrontierPts.length <= 2
      ? (topY + (botY - topY) * 0.62)
      : botY;
    const botBulge = {
      x: Math.max(leftBound, drawFrontierPts[drawFrontierPts.length - 1].x - 234),
      y: bottomAnchorY,
    };
    const fillColor = "rgba(165, 28, 20, 0.12)";
    const strokeColor = "rgba(244, 110, 78, 0.92)";

    function drawHatch(x0, y0, x1, y1) {
      // Diagonal stripes (top-right to bottom-left / NE→SW) clipped to the current path.
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = "rgba(220, 80, 50, 0.18)";
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
      ctx.shadowBlur = 0;
      const spacing = 18;
      const span = (x1 - x0) + (y1 - y0);
      for (let offset = -span; offset <= span; offset += spacing) {
        ctx.beginPath();
        ctx.moveTo(x1 - offset, y0);
        ctx.lineTo(x0 - offset, y1);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.setLineDash([16, 10]);
    ctx.lineDashOffset = 0;
    ctx.lineWidth = 5;
    ctx.strokeStyle = strokeColor;
    ctx.shadowColor = "rgba(255, 70, 45, 0.6)";
    ctx.shadowBlur = 10;
    // First foothold: keep occupancy concentrated in the northwest corner,
    // rather than stretching a full vertical strip through the map.
    if (frontierPts.length === 1) {
      const fp = frontierPts[0];
      const footholdBottomY = topY + (botY - topY) * 0.62;
      const topShoulderX = Math.max(leftBound + 24, fp.x - occPad * .1);
      const lowerShoulderX = Math.max(leftBound + 8, fp.x - occPad * 0.82);
      ctx.beginPath();
      ctx.moveTo(leftBound, topY);
      ctx.lineTo(topShoulderX, topY);
      ctx.quadraticCurveTo(fp.x - 20, fp.y - occPad * 0.34, fp.x, fp.y);
      ctx.quadraticCurveTo(fp.x - 14, fp.y + occPad * 0.5, lowerShoulderX, footholdBottomY);
      ctx.lineTo(leftBound, footholdBottomY);
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();
      drawHatch(leftBound, topY, fp.x, footholdBottomY);

      ctx.beginPath();
      ctx.moveTo(topShoulderX, topY);
      ctx.quadraticCurveTo(fp.x - 20, fp.y - occPad * 0.34, fp.x, fp.y);
      ctx.quadraticCurveTo(fp.x - 14, fp.y + occPad * 0.5, lowerShoulderX, footholdBottomY);
      ctx.lineTo(leftBound, footholdBottomY);
      ctx.stroke();
      ctx.restore();
      return;
    }

    // Fill occupied territory from the west edge to the squiggly frontline.
    ctx.beginPath();
    ctx.moveTo(leftBound, startAnchorY);
    ctx.lineTo(topBulge.x, topBulge.y);
    if (drawFrontierPts.length === 1) {
      const p = drawFrontierPts[0];
      ctx.quadraticCurveTo(p.x, p.y - 28, p.x, p.y);
    } else {
      ctx.quadraticCurveTo(drawFrontierPts[0].x, drawFrontierPts[0].y - 24, drawFrontierPts[0].x, drawFrontierPts[0].y);
      for (let i = 0; i < drawFrontierPts.length - 1; i += 1) {
        const a = drawFrontierPts[i];
        const b = drawFrontierPts[i + 1];
        const mx = (a.x + b.x) * 0.5;
        const my = (a.y + b.y) * 0.5;
        ctx.quadraticCurveTo(a.x, a.y, mx, my);
      }
      const last = drawFrontierPts[drawFrontierPts.length - 1];
      ctx.quadraticCurveTo(last.x, last.y, last.x, last.y);
    }
    ctx.quadraticCurveTo(botBulge.x + 18, botBulge.y - 20, botBulge.x, botBulge.y);
    ctx.lineTo(leftBound, bottomAnchorY);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
    drawHatch(leftBound, startAnchorY, botBulge.x, bottomAnchorY);

    // Front line stroke along the same contour path.
    ctx.beginPath();
    ctx.moveTo(topBulge.x, topBulge.y);
    if (drawFrontierPts.length === 1) {
      const p = drawFrontierPts[0];
      ctx.quadraticCurveTo(p.x, p.y - 28, p.x, p.y);
      ctx.quadraticCurveTo(p.x + 6, p.y + 26, botBulge.x, botBulge.y);
      const c1x = botBulge.x - 34;
      const c1y = botBulge.y + 10;
      const c2x = leftBound + 20;
      const c2y = botBulge.y - 8;
      ctx.bezierCurveTo(c1x, c1y, c2x, c2y, leftBound, botBulge.y);
    } else {
      ctx.quadraticCurveTo(drawFrontierPts[0].x, drawFrontierPts[0].y - 24, drawFrontierPts[0].x, drawFrontierPts[0].y);
      for (let i = 0; i < drawFrontierPts.length - 1; i += 1) {
        const a = drawFrontierPts[i];
        const b = drawFrontierPts[i + 1];
        const mx = (a.x + b.x) * 0.5;
        const my = (a.y + b.y) * 0.5;
        ctx.quadraticCurveTo(a.x, a.y, mx, my);
      }
      const last = drawFrontierPts[drawFrontierPts.length - 1];
      ctx.quadraticCurveTo(last.x, last.y, botBulge.x, botBulge.y);
      if (drawFrontierPts.length <= 2) {
        const c1x = botBulge.x - 30;
        const c1y = botBulge.y + 12;
        const c2x = leftBound + 22;
        const c2y = botBulge.y - 6;
        ctx.bezierCurveTo(c1x, c1y, c2x, c2y, leftBound, botBulge.y);
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  function beginArmyMarchToDistrict(districtId, onDone) {
    const mapData = window.BattlechurchMapData;
    const district = getDistrictById(districtId);
    const rect = state.mapRect;
    if (!mapData || !district || !rect || !Number.isFinite(rect.w) || rect.w <= 0) {
      if (typeof onDone === "function") onDone();
      return;
    }
    const march = state.armyMarch;
    const target = getDistrictPosition(district, rect);
    if (!Array.isArray(march.routeStops) || !march.routeStops.length) {
      march.routeStops = [{ type: "origin" }];
    }
    const routeStart = resolveRouteStopPoint(march.routeStops[march.routeStops.length - 1], rect) || getInitialMarchOrigin(rect);
    march.active = true;
    march.phase = "dash";
    march.districtId = districtId;
    march.fromX = routeStart.x;
    march.fromY = routeStart.y;
    march.toX = target.x;
    march.toY = target.y;
    march.timer = 0;
    march.onDone = typeof onDone === "function" ? onDone : null;
  }

  function finishArmyMarchAnimation() {
    const march = state.armyMarch;
    const done = march.onDone;
    const districtId = march.districtId;
    march.active = false;
    march.phase = "idle";
    march.districtId = null;
    march.timer = 0;
    march.onDone = null;
    march.lastDistrictId = districtId || march.lastDistrictId;
    march.hasStartedOnce = true;
    if (districtId) {
      if (!Array.isArray(march.routeStops) || !march.routeStops.length) {
        march.routeStops = [{ type: "origin" }];
      }
      const last = march.routeStops[march.routeStops.length - 1];
      if (!(last && last.type === "district" && last.id === districtId)) {
        march.routeStops.push({ type: "district", id: districtId });
      }
    }
    if (typeof done === "function") done();
  }

  function updateArmyMarchAnimation(dt) {
    const march = state.armyMarch;
    if (!march) return;
    const nowMs = (typeof performance !== "undefined" ? performance.now() : Date.now());
    if (!Number.isFinite(march.previewClockMs) || march.previewClockMs <= 0) {
      march.previewClockMs = nowMs;
    }
    let dtSec = Number(dt);
    if (!Number.isFinite(dtSec) || dtSec <= 0) {
      dtSec = Math.max(0, (nowMs - march.previewClockMs) / 1000);
    }
    march.previewClockMs = nowMs;
    const duration = Math.max(0.001, Number(march.dashDuration) || 1.4);
    const phase = (Number(march.previewPhase) || 0) + (dtSec / duration);
    march.previewPhase = phase % 1;
  }

  function getPreviewMarchLeg(rect) {
    const mapData = window.BattlechurchMapData;
    const progress = ensureProgress();
    if (!mapData?.districts?.length || !progress) return null;
    const districts = mapData.districts.filter((district) => district && district.id);
    if (!districts.length) return null;
    const completedIds = districts
      .filter((district) => progress.districts?.[district.id]?.p1?.completed === true)
      .map((district) => district.id);
    const lastCompletedId = completedIds.length ? completedIds[completedIds.length - 1] : null;
    const targetDistrict = districts.find((district) => progress.districts?.[district.id]?.p1?.completed !== true) || null;
    if (!targetDistrict) return null;
    const to = getDistrictPosition(targetDistrict, rect);
    let from = lastCompletedId
      ? getDistrictPosition(getDistrictById(lastCompletedId), rect)
      : getInitialMarchOrigin(rect);
    // If this is the first town in a district with no occupied towns yet in that district,
    // stage the attack from the nearest occupied town (frontline hop), not strictly last cleared.
    if (completedIds.length > 0) {
      const districtTowns = mapData.getDistrictsByFront?.(targetDistrict.frontId) || [];
      const isDistrictEntry = districtTowns.length > 0 && districtTowns[0]?.id === targetDistrict.id;
      const occupiedInTargetDistrict = districtTowns.some((district) => progress.districts?.[district.id]?.p1?.completed === true);
      if (isDistrictEntry && !occupiedInTargetDistrict) {
        let nearestFrom = null;
        let nearestDist = Infinity;
        for (const completedId of completedIds) {
          const occupiedDistrict = getDistrictById(completedId);
          if (!occupiedDistrict) continue;
          if (occupiedDistrict.type === "capital") continue;
          const pos = getDistrictPosition(occupiedDistrict, rect);
          if (!pos) continue;
          const dx = to.x - pos.x;
          const dy = to.y - pos.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < nearestDist) {
            nearestDist = d2;
            nearestFrom = pos;
          }
        }
        if (nearestFrom) from = nearestFrom;
      }
    }
    if (!from || !to) return null;
    return { from, to };
  }

  function resolveRouteStopPoint(stop, rect) {
    if (!stop) return null;
    if (stop.type === "origin") return getInitialMarchOrigin(rect);
    if (stop.type === "district" && stop.id) {
      const district = getDistrictById(stop.id);
      if (!district) return null;
      return getDistrictPosition(district, rect);
    }
    return null;
  }

  function drawCompletedArmyRoute(ctx) {
    const march = state.armyMarch;
    if (!Array.isArray(march?.routeStops) || march.routeStops.length < 2) return;
    const rect = state.mapRect;
    if (!rect || !Number.isFinite(rect.w) || rect.w <= 0) return;
    const pulse = 0.55 + 0.45 * Math.sin((typeof performance !== "undefined" ? performance.now() : Date.now()) * 0.012);
    ctx.save();
    ctx.lineCap = "butt";
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(255, 110, 96, 0.8)";
    ctx.shadowColor = "rgba(255, 56, 40, 0.7)";
    ctx.shadowBlur = 8;
    const dashSegments = Math.max(6, Math.floor(march.dashCount || 16));
    const dashSlots = dashSegments * 2;
    for (let i = 0; i < march.routeStops.length - 1; i += 1) {
      const from = resolveRouteStopPoint(march.routeStops[i], rect);
      const to = resolveRouteStopPoint(march.routeStops[i + 1], rect);
      if (!from || !to) continue;
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const lineLen = Math.hypot(dx, dy) || 1;
      const nx = dx / lineLen;
      const ny = dy / lineLen;
      const slotStepLen = lineLen / Math.max(1, dashSlots);
      const dashLen = Math.max(4, slotStepLen * 0.68);
      for (let slot = 0; slot < dashSlots; slot += 1) {
        if (slot % 2 === 1) continue;
        const p = (slot + 1) / dashSlots;
        const x = from.x + dx * p;
        const y = from.y + dy * p;
        const onLatestLeg = i === march.routeStops.length - 2;
        const leadPulse = onLatestLeg && slot >= dashSlots - 2 ? (0.76 + 0.16 * pulse) : 0.8;
        ctx.globalAlpha = leadPulse;
        ctx.beginPath();
        ctx.moveTo(x - nx * dashLen * 0.5, y - ny * dashLen * 0.5);
        ctx.lineTo(x + nx * dashLen * 0.5, y + ny * dashLen * 0.5);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawArmyMarchOverlay(ctx) {
    const march = state.armyMarch;
    const rect = state.mapRect;
    if (!march || !rect || !Number.isFinite(rect.w) || rect.w <= 0) return;
    const leg = getPreviewMarchLeg(rect);
    if (!leg) return;
    const fromX = leg.from.x;
    const fromY = leg.from.y;
    const toX = leg.to.x;
    const toY = leg.to.y;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const lineLen = Math.hypot(dx, dy) || 1;
    const nx = dx / lineLen;
    const ny = dy / lineLen;
    const marchProgress = Math.max(0, Math.min(1, Number(march.previewPhase) || 0));
    const pulse = 0.55 + 0.45 * Math.sin((typeof performance !== "undefined" ? performance.now() : Date.now()) * 0.012);
    ctx.save();
    ctx.lineCap = "butt";
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(255, 110, 96, 0.96)";
    ctx.shadowColor = "rgba(255, 56, 40, 0.85)";
    ctx.shadowBlur = 10;
    const dashSegments = Math.max(8, Math.floor(march.dashCount || 16));
    const dashSlots = dashSegments * 2; // every other slot is a gap
    const laidSlotCount = Math.max(0, Math.min(dashSlots, Math.floor(marchProgress * dashSlots)));
    for (let slot = 0; slot < laidSlotCount; slot += 1) {
      if (slot % 2 === 1) continue; // keep visible gap between dashes
      const p = (slot + 1) / dashSlots;
      const x = fromX + dx * p;
      const y = fromY + dy * p;
      const slotStepLen = lineLen / Math.max(1, dashSlots);
      const dashLen = Math.max(4, slotStepLen * 0.68);
      const isLeadingDash = slot >= laidSlotCount - 2;
      ctx.globalAlpha = isLeadingDash ? (0.75 + 0.25 * pulse) : 0.9;
      ctx.beginPath();
      ctx.moveTo(x - nx * dashLen * 0.5, y - ny * dashLen * 0.5);
      ctx.lineTo(x + nx * dashLen * 0.5, y + ny * dashLen * 0.5);
      ctx.stroke();
    }
    const oxSize = 15 + pulse * 3;
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(255, 188, 122, 0.95)";
    ctx.shadowColor = "rgba(255, 132, 72, 0.72)";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(fromX - oxSize, fromY - oxSize);
    ctx.lineTo(fromX + oxSize, fromY + oxSize);
    ctx.moveTo(fromX + oxSize, fromY - oxSize);
    ctx.lineTo(fromX - oxSize, fromY + oxSize);
    ctx.stroke();
    ctx.restore();
  }

  function getInitialMarchOrigin(rect) {
    const mapData = window.BattlechurchMapData;
    const safeRect = rect || state.mapRect || { x: 0, y: 0, w: 1280, h: 720 };
    const firstDistrictId = mapData?.getFirstDistrictId?.() || mapData?.districts?.[0]?.id;
    const firstDistrict = firstDistrictId ? getDistrictById(firstDistrictId) : null;
    const fallbackX = safeRect.x + safeRect.w * 0.2;
    const fallbackY = safeRect.y + safeRect.h * 0.25;
    const firstPos = firstDistrict ? getDistrictPosition(firstDistrict, safeRect) : { x: fallbackX, y: fallbackY };
    let x = firstPos.x - 95;
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
    if (!state.active) return;
    const progress = ensureProgress();
    const mapData = window.BattlechurchMapData;
    const hasAnyCompleted = !!(mapData?.districts || []).find((district) => progress?.districts?.[district.id]?.p1?.completed === true);
    if (hasAnyCompleted) return;
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
  // Does NOT save to Firebase. Automatically unlocks the capital via ensureNextDistrictUnlocked.
  function devUnlockAllDistricts() {
    const mapData = window.BattlechurchMapData;
    if (!mapData) return false;
    const progress = ensureProgress();
    if (!progress) return false;
    const regularDistricts = (mapData.districts || []).filter(function(t) { return t.type !== "capital"; });
    if (!progress.districts) progress.districts = {};
    regularDistricts.forEach(function(district) {
      if (!progress.districts[district.id]) progress.districts[district.id] = { p1: null, p2: null, p3: null };
      progress.districts[district.id].p1 = {
        completed: true,
        bestCount: 100,
        churchPowerupLevels: {},
      };
    });
    // Directly unlock every town (regular + capital) — don't rely on chain logic
    progress.unlockedDistrictIds = (mapData.districts || []).map(function(t) { return t.id; });
    // Close any open panel or overlay so WASD navigation works immediately
    state.panelOpen = false;
    state.denomUpgrade = null;
    if (typeof console !== "undefined") {
      console.log("[DEV] devUnlockAllDistricts: unlockedDistrictIds =", progress.unlockedDistrictIds.join(", "));
    }
    return true;
  }

  window.MapScreen = {
    open,
    close,
    update,
    draw,
    recordDistrictCompletion,
    devUnlockAllDistricts,
    getNextDistrictInOrder,
    selectDistrict,
    setAssets,
    getDistrictStartCount,
    ensureDistrictStartCount,
    getDistrictCampaignData,
    getTotalCongregationCount,
    getMapSavedTotal,
    saveMissionCheckpoint,
    clearMissionCheckpoint,
    getDenomPickCountForDistrict,
    devStartRunForDistrict,
    getNextCampaignForDistrict,
    isP2UnlockedForDistrict,
    isP3UnlockedForDistrict,
    reloadProgress,
    getSaveFileSummaries,
    setActiveSave,
    createSaveFile,
    resetSaveFile,
    renameSaveFile,
    updateSaveFileMetadata,
    deleteSaveFile,
    setClassForActiveSave,
    devAwardNextDistrict,
    setDemoProfile,
    clearDemoProfile,
    isCountyDone,
    isCapitalUnlocked,
    getCapitalScoreMultiplier,
    updateAmbient: updateMapAmbient,
    startAmbient: startMapAmbient,
    stopAmbient: stopMapAmbient,
    isLaunchTransitionActive: () => Boolean(state.mapLaunchTransition?.active),
    getLaunchTransitionProgress: () => {
      const transition = state.mapLaunchTransition;
      if (!transition?.active) return 0;
      const duration = Math.max(0.05, Number(transition.duration) || 1.25);
      return Math.max(0, Math.min(1, Number(transition.timer || 0) / duration));
    },
    isActive: () => state.active,
    get mapRect() { return { ...state.mapRect }; },
    getPlayerName: () => (getActiveSave()?.playerName?.trim() || "Pastor"),
    areDenominationsUnlocked: () => !!(ensureProgress()?.denominationsUnlocked),
    getProgress: () => ensureProgress(),
    setDenominationForActiveSave: (classId) => {
      if (typeof window.BattlechurchClasses?.setActive === "function") {
        window.BattlechurchClasses.setActive(classId);
      }
      const activeSave = getActiveSave();
      if (activeSave) activeSave.classId = classId;
      void persistPlayerDoc();
    },
  };
})(typeof window !== "undefined" ? window : null);
