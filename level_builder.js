(function setupLevelBuilder(window, document) {
  if (!window || !document) return;

  const STORAGE_KEY = "battlechurch.devLevelConfig";
  const SYNC_ENDPOINT = "http://localhost:4100/level-config";
  const IS_LOCALHOST = (() => {
    const host = String(window.location?.hostname || "").toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0";
  })();
  const DEFAULTS = {
    meta: { version: 1 },
    structure: {
      levels: 4,
      monthsPerLevel: 3,
      battlesPerMonth: 3,
      defaultHordesPerBattle: 24,
      defaultHordeDuration: 4,
    },
    globals: {
      enemyStats: {},
      enemyTags: {},
      mode: "explicit",
      hiddenEnemies: [],
    },
    levels: [],
  };
  const REMOVED_ENEMIES = new Set([
    "miniSkeleton",
    "miniSkeletonArcher",
    "miniZombie",
    "miniZombieButcher",
    "miniReaper",
    "miniGhost",
    "miniLich",
    "miniNecromancer",
    "miniDeathKnight",
    "miniDreadKnight",
  ]);

  function deepClone(obj) {
    return obj ? JSON.parse(JSON.stringify(obj)) : null;
  }

  function normalizeConfig(raw) {
    const cfg = raw && typeof raw === "object" ? raw : {};
    const merged = {
      meta: cfg.meta || deepClone(DEFAULTS.meta),
      structure: { ...deepClone(DEFAULTS.structure), ...(cfg.structure || {}) },
      globals: { ...deepClone(DEFAULTS.globals), ...(cfg.globals || {}) },
      levels: Array.isArray(cfg.levels) ? cfg.levels : [],
    };
    // Ensure new enemies show up even if they were hidden in older configs.
    if (Array.isArray(merged.globals.hiddenEnemies)) {
      merged.globals.hiddenEnemies = merged.globals.hiddenEnemies.filter(
        (key) => key !== "miniImpLevel3",
      );
      merged.globals.hiddenEnemies = merged.globals.hiddenEnemies.filter(
        (key) => !REMOVED_ENEMIES.has(key),
      );
    }
    return merged;
  }

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return normalizeConfig(DEFAULTS);
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return normalizeConfig(parsed);
    } catch (err) {
      console.warn("LevelBuilder: failed to parse storage", err);
    }
    return normalizeConfig(DEFAULTS);
  }

  function loadFromFileConfig() {
    const fileConfig =
      (typeof window !== "undefined" && window.BattlechurchLevelData) || null;
    if (fileConfig && typeof fileConfig === "object") {
      const normalized = normalizeConfig(fileConfig);
      state.config = normalized;
      saveToStorage(state.config);
      return true;
    }
    return false;
  }

  function saveToStorage(cfg) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg || {}));
    } catch (err) {
      console.warn("LevelBuilder: failed to save", err);
    }
  }

  function purgeEnemy(cfg, enemyKey) {
    if (!cfg || !enemyKey) return;
    // Remove from globals weights/delays
    if (cfg.globals?.enemyStats && cfg.globals.enemyStats[enemyKey]) {
      delete cfg.globals.enemyStats[enemyKey];
    }
    // Remove from structure if present in pools
    if (Array.isArray(cfg.structure?.hordeEnemyPools)) {
      cfg.structure.hordeEnemyPools = cfg.structure.hordeEnemyPools.map((pool) =>
        Array.isArray(pool) ? pool.filter((e) => e !== enemyKey) : pool,
      );
    }
    if (Array.isArray(cfg.globals?.hiddenEnemies)) {
      cfg.globals.hiddenEnemies = cfg.globals.hiddenEnemies.filter((key) => key !== enemyKey);
    }
    // Walk levels
    (cfg.levels || []).forEach((lvl) => {
      (lvl.months || []).forEach((m) => {
        (m.battles || []).forEach((b) => {
          (b.hordes || []).forEach((h) => {
            if (Array.isArray(h.entries)) {
              h.entries = h.entries
                .map((en) => (en && en.enemy === enemyKey ? { ...en, count: 0 } : en))
                .filter(Boolean);
            }
            if (h.weights && Object.prototype.hasOwnProperty.call(h.weights, enemyKey)) {
              h.weights[enemyKey] = 0;
            }
            if (h.delays && Object.prototype.hasOwnProperty.call(h.delays, enemyKey)) {
              h.delays[enemyKey] = 0;
            }
            if (
              h.delaysWeighted &&
              Object.prototype.hasOwnProperty.call(h.delaysWeighted, enemyKey)
            ) {
              h.delaysWeighted[enemyKey] = 0;
            }
            if (
              h.delaysExplicit &&
              Object.prototype.hasOwnProperty.call(h.delaysExplicit, enemyKey)
            ) {
              h.delaysExplicit[enemyKey] = 0;
            }
          });
        });
      });
    });
  }

  const state = {
    config: loadFromStorage(),
    scope: { level: 1, month: 1, battle: 1, horde: 1 },
    mode: "explicit",
    showHidden: false,
    copyBuffer: null, // holds a copied horde payload
  };
  REMOVED_ENEMIES.forEach((key) => purgeEnemy(state.config, key));
  const THUMB_SIZE = 48;
  const thumbCache = {};
  const thumbLoading = new Set();
  const thumbAnimState = { items: [], rafId: null, lastTime: 0 };
  const thumbFallbackImages = new Map();
  const thumbImageListeners = new WeakSet();
  const DEFAULT_HORDE_DURATION = 10;

  function updateScopeFromSelects() {
    state.scope = {
      level: Number(els.level.value) || 1,
      month: Number(els.month.value) || 1,
      battle: 1,
      horde: 1,
    };
  }

  function basePoolForScope(scope) {
    const levelData =
      (typeof window !== "undefined" && window.BattlechurchLevelData) || {};
    const pools = Array.isArray(levelData.hordeEnemyPools) ? levelData.hordeEnemyPools : [];
    if (!pools.length) return [];
    const tier = Math.max(0, Math.min(pools.length - 1, (scope.level || 1) - 1));
    return Array.isArray(pools[tier]) ? pools[tier] : [];
  }

  function ensureLevel(levelIdx) {
    const cfg = state.config;
    cfg.levels = cfg.levels || [];
    while (cfg.levels.length < levelIdx) {
      cfg.levels.push({ index: cfg.levels.length + 1, months: [] });
    }
    return cfg.levels[levelIdx - 1];
  }

  function ensureMonth(levelObj, monthIdx) {
    levelObj.months = levelObj.months || [];
    while (levelObj.months.length < monthIdx) {
    levelObj.months.push({ index: levelObj.months.length + 1, battles: [] });
    }
    return levelObj.months[monthIdx - 1];
  }

  function ensureBattle(monthObj, battleIdx) {
    monthObj.battles = monthObj.battles || [];
    while (monthObj.battles.length < battleIdx) {
      monthObj.battles.push({ index: monthObj.battles.length + 1, hordes: [] });
    }
    return monthObj.battles[battleIdx - 1];
  }

  function ensureHorde(battleObj, hordeIdx) {
    battleObj.hordes = battleObj.hordes || [];
    while (battleObj.hordes.length < hordeIdx) {
      battleObj.hordes.push({
        index: battleObj.hordes.length + 1,
        entries: [],
        weights: {},
        delays: {},
        delaysWeighted: {},
        delaysExplicit: {},
        mode: "explicit",
        allKill: false,
        duration: state.config.structure.defaultHordeDuration || DEFAULT_HORDE_DURATION,
      });
    }
    return battleObj.hordes[hordeIdx - 1];
  }

  function getOrCreateScope(scope) {
    const levelObj = ensureLevel(scope.level);
    const monthObj = ensureMonth(levelObj, scope.month);
    const battleObj = ensureBattle(monthObj, 1);
    const hordeObj = ensureHorde(battleObj, scope.horde);
    return { levelObj, monthObj, battleObj, hordeObj };
  }

  // UI scaffolding
  const overlay = document.createElement("div");
  overlay.id = "levelBuilderOverlay";
  overlay.innerHTML = `
    <style>
      #levelBuilderOverlay {
        position: fixed;
        inset: 0;
        background: rgba(6, 10, 18, 0.94);
        color: #e8f4ff;
        font-family: "Inter", Arial, sans-serif;
        z-index: 9999;
        display: none;
        padding: 16px;
        box-sizing: border-box;
      }
      #levelBuilderOverlay .lb-shell {
        display: flex;
        flex-direction: column;
        gap: 12px;
        height: 100%;
      }
      #levelBuilderOverlay .panel {
        background: rgba(18, 28, 44, 0.85);
        border: 1px solid rgba(120, 170, 220, 0.35);
        border-radius: 8px;
        padding: 10px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      #levelBuilderOverlay h3 {
        margin: 0 0 8px 0;
        font-size: 15px;
        letter-spacing: 0.3px;
      }
      #levelBuilderOverlay label {
        font-size: 12px;
        opacity: 0.9;
      }
      #levelBuilderOverlay input, #levelBuilderOverlay select, #levelBuilderOverlay textarea {
        width: 100%;
        padding: 6px 8px;
        margin: 4px 0 10px 0;
        border-radius: 6px;
        border: 1px solid rgba(255, 255, 255, 0.18);
        background: rgba(255, 255, 255, 0.06);
        color: #e8f4ff;
      }
      #levelBuilderOverlay .lb-topbar {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: flex-end;
      }
      #levelBuilderOverlay .lb-topbar .group {
        display: flex;
        gap: 8px;
        align-items: flex-end;
      }
      #levelBuilderOverlay .lb-topbar label {
        margin: 0 6px 0 0;
      }
      #levelBuilderOverlay .lb-topbar select,
      #levelBuilderOverlay .lb-topbar input {
        width: auto;
        min-width: 72px;
        margin: 0;
      }
      #levelBuilderOverlay table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
      }
      #levelBuilderOverlay th, #levelBuilderOverlay td {
        padding: 4px 6px;
        border-bottom: 1px solid rgba(255,255,255,0.08);
      }
      #levelBuilderOverlay .button-row {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: auto;
      }
      #levelBuilderOverlay button {
        background: #2b74ff;
        color: #fff;
        border: none;
        padding: 8px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
      }
      #levelBuilderOverlay button.secondary {
        background: rgba(255,255,255,0.08);
      }
      #levelBuilderOverlay .scroll {
        overflow: auto;
        flex: 1;
      }
      #levelBuilderOverlay .lb-table {
        width: max-content;
        border-collapse: collapse;
      }
      #levelBuilderOverlay .lb-table th,
      #levelBuilderOverlay .lb-table td {
        padding: 4px 6px;
        border-bottom: 1px solid rgba(120, 170, 220, 0.2);
      }
      #levelBuilderOverlay .lb-horde-cell {
        min-width: 36px;
        width: 36px;
        text-align: center;
      }
      #levelBuilderOverlay .lb-horde-input {
        width: 34px;
        text-align: center;
        padding: 2px 4px;
      }
      #levelBuilderOverlay .lb-sticky {
        position: sticky;
        left: 0;
        z-index: 2;
        background: rgba(18, 28, 44, 0.98);
      }
      #levelBuilderOverlay .lb-sticky--sprite {
        left: 0;
        min-width: 72px;
        max-width: 72px;
      }
      #levelBuilderOverlay .lb-sticky--enemy {
        left: 72px;
        min-width: 180px;
      }
    </style>
    <div class="lb-shell">
      <div class="panel" id="lb-topPanel">
        <div class="lb-topbar">
          <div class="group">
            <label>Level</label>
            <select id="lb-level"></select>
            <label>Month</label>
            <select id="lb-month"></select>
          </div>
          <div class="group">
            <label><input type="checkbox" id="lb-showHidden"> Show hidden enemies</label>
          </div>
          <div class="group">
            <label>Horde Duration (s)</label>
            <input type="number" id="lb-hordeDuration" min="1" step="1">
          </div>
          <div class="group">
            <button id="lb-close" class="secondary">Close (Esc)</button>
            <button id="lb-load" class="secondary" type="button">Load from file</button>
            <button id="lb-save" type="button">Save</button>
            <button id="lb-saveAs" type="button" class="secondary">Save As...</button>
          </div>
        </div>
        <div id="lb-status" style="margin-top:8px;font-size:12px;color:#9bf0ff;"></div>
      </div>
      <div class="panel" id="lb-mainPanel">
        <h3>Enemies</h3>
        <div class="scroll" id="lb-contentArea"></div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const els = {
    overlay,
    level: overlay.querySelector("#lb-level"),
    month: overlay.querySelector("#lb-month"),
    hordeDuration: overlay.querySelector("#lb-hordeDuration"),
    content: overlay.querySelector("#lb-contentArea"),
    load: overlay.querySelector("#lb-load"),
    save: overlay.querySelector("#lb-save"),
    saveAs: overlay.querySelector("#lb-saveAs"),
    status: overlay.querySelector("#lb-status"),
    close: overlay.querySelector("#lb-close"),
  };

  function populateSelect(select, count) {
    select.innerHTML = "";
    for (let i = 1; i <= count; i += 1) {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = String(i);
      select.appendChild(opt);
    }
  }

  function initScopeSelectors() {
    const s = state.config.structure;
    populateSelect(els.level, s.levels);
    populateSelect(els.month, s.monthsPerLevel);
    els.level.value = String(state.scope.level);
    els.month.value = String(state.scope.month);
  }

  function getActiveScope() {
    const scope = {
      level: Number(els.level.value) || 1,
      month: Number(els.month.value) || 1,
      battle: 1,
      horde: 1,
    };
    state.scope = scope;
    return getOrCreateScope(scope);
  }

  function renderModeAndWeights() {
    const { battleObj } = getActiveScope();
    const catalog = (window.BattlechurchEnemyCatalog && window.BattlechurchEnemyCatalog.catalog) || {};
    const hiddenSet = new Set(state.config.globals.hiddenEnemies || []);
    const hordeCount = state.config.structure.defaultHordesPerBattle || 10;
    const hordes = Array.isArray(battleObj?.hordes) ? battleObj.hordes : [];

    const table = document.createElement("table");
    table.className = "lb-table";
    const header = document.createElement("tr");
    const hordeHeaders = Array.from({ length: hordeCount }, (_, idx) => {
      const label = idx === hordeCount - 1 ? `H${idx + 1}*` : `H${idx + 1}`;
      return `<th class="lb-horde-cell">${label}</th>`;
    }).join("");
    header.innerHTML =
      `<th class="lb-sticky lb-sticky--sprite">Sprite</th><th class="lb-sticky lb-sticky--enemy">Enemy</th>${hordeHeaders}<th>Hide</th>`;
    table.appendChild(header);
    Object.keys(catalog).forEach((key) => {
      if (hiddenSet.has(key) && !state.showHidden) return;
      const row = document.createElement("tr");
      const thumb = getEnemyThumbnail(key);
      const cells = [];
      for (let i = 0; i < hordeCount; i += 1) {
        const horde = hordes[i];
        const entries = Array.isArray(horde?.entries) ? horde.entries : [];
        const match = entries.find((entry) => entry && entry.enemy === key);
        const countVal = match ? Number(match.count) || 0 : 0;
        cells.push(
          `<td class="lb-horde-cell"><input class="lb-horde-input" type="number" data-exp-count="${key}" data-horde="${i + 1}" value="${countVal}" min="0"></td>`,
        );
      }
      row.innerHTML = `
        <td class="lb-sticky lb-sticky--sprite"><div style="width:48px;height:48px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:6px;">
          <canvas class="enemy-thumb" data-thumb-key="${key}"${
            thumb ? ` data-thumb-fallback="${thumb}"` : ""
          } width="${THUMB_SIZE}" height="${THUMB_SIZE}" style="width:${THUMB_SIZE}px;height:${THUMB_SIZE}px;"></canvas>
        </div></td>
        <td class="lb-sticky lb-sticky--enemy">${key}${hiddenSet.has(key) ? " (hidden)" : ""}</td>
        ${cells.join("")}
        <td><button data-hide="${key}" class="secondary" style="padding:4px 8px;">${hiddenSet.has(key) ? "Unhide" : "Hide"}</button></td>
      `;
      table.appendChild(row);
    });
    els.content.innerHTML = "";
    els.content.appendChild(table);
    initThumbAnimations();
    els.content.querySelectorAll("input[data-exp-count]").forEach((input) => {
      input.addEventListener("change", () => {
        const key = input.getAttribute("data-exp-count");
        const val = Math.max(0, Number(input.value) || 0);
        const hordeIndex = Math.max(1, Number(input.getAttribute("data-horde") || 1));
        const horde = hordes[hordeIndex - 1];
        if (!horde) return;
        horde.entries = Array.isArray(horde.entries) ? horde.entries : [];
        const idx = horde.entries.findIndex((entry) => entry && entry.enemy === key);
        if (val > 0) {
          if (idx >= 0) horde.entries[idx].count = val;
          else horde.entries.push({ enemy: key, count: val });
        } else if (idx >= 0) {
          horde.entries.splice(idx, 1);
        }
        saveToStorage(state.config);
      });
    });
    els.content.querySelectorAll("button[data-hide]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.getAttribute("data-hide");
        toggleHiddenEnemy(key);
        renderModeAndWeights();
      });
    });
  }

  function getEnemyThumbnail(key) {
    const MAX_THUMB = 144; // 3x original 48px target
    if (thumbCache.hasOwnProperty(key)) return thumbCache[key];
    try {
      const assets = window.assets || {};
      const enemyAssets = assets.enemies?.[key];
      const clip = enemyAssets?.idle || enemyAssets?.walk;
      if (clip?.image) {
        const inferredSize = inferFrameSizeForClip(clip, key);
        const frameWidth = inferredSize.frameWidth || clip.frameWidth || clip.image.width;
        const frameHeight = inferredSize.frameHeight || clip.frameHeight || clip.image.height;
        const overrideMap = (window.__BATTLECHURCH_OVERRIDES && window.__BATTLECHURCH_OVERRIDES[key]) || {};
        const stateOverride = overrideMap.idle || overrideMap.walk || {};
        const mappedFrames =
          (Array.isArray(clip.frameMap) && clip.frameMap.length && clip.frameMap) ||
          stateOverride.frames ||
          null;
        const frameIndex = mappedFrames && mappedFrames.length ? mappedFrames[0] : 0;
        const cols = Math.max(1, Math.floor(clip.image.width / Math.max(1, frameWidth)));
        const sx = (frameIndex % cols) * frameWidth;
        const sy = Math.floor(frameIndex / cols) * frameHeight;
        const canvas = document.createElement("canvas");
        const scale = MAX_THUMB / Math.max(1, frameHeight);
        canvas.width = Math.max(1, Math.round(frameWidth * scale));
        canvas.height = Math.max(1, Math.round(frameHeight * scale));
        const ctx = canvas.getContext("2d");
        ctx.drawImage(
          clip.image,
          sx,
          sy,
          frameWidth,
          frameHeight,
          0,
          0,
          canvas.width,
          canvas.height,
        );
        const url = canvas.toDataURL();
        thumbCache[key] = url;
        return url;
      }
    } catch (e) {}
    const manifestEntry =
      (window.ASSET_MANIFEST && window.ASSET_MANIFEST.enemies && window.ASSET_MANIFEST.enemies[key]) ||
      null;
    if (manifestEntry && manifestEntry.idle && !thumbLoading.has(key)) {
      thumbLoading.add(key);
      const img = new Image();
      img.onload = () => {
        try {
          const entry = manifestEntry.idle;
          const inferredSize = inferFrameSizeForManifestEntry(entry, img, key);
          const frameW = inferredSize.frameWidth || entry.frameWidth || 100;
          const frameH = inferredSize.frameHeight || entry.frameHeight || 100;
          const overrideMap = (window.__BATTLECHURCH_OVERRIDES && window.__BATTLECHURCH_OVERRIDES[key]) || {};
          const stateOverride = overrideMap.idle || overrideMap.walk || {};
          const mappedFrames = stateOverride.frames || null;
          const frameIndex = mappedFrames && mappedFrames.length ? mappedFrames[0] : 0;
          const cols = Math.max(1, Math.floor(img.width / Math.max(1, frameW)));
          const sx = (frameIndex % cols) * frameW;
          const sy = Math.floor(frameIndex / cols) * frameH;
          const canvas = document.createElement("canvas");
          const scale = MAX_THUMB / Math.max(1, frameH);
          canvas.width = Math.max(1, Math.round(frameW * scale));
          canvas.height = Math.max(1, Math.round(frameH * scale));
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, sx, sy, frameW, frameH, 0, 0, canvas.width, canvas.height);
          thumbCache[key] = canvas.toDataURL();
          thumbLoading.delete(key);
          if (overlay.style.display === "block") {
            renderModeAndWeights();
          }
        } catch (err) {
          thumbLoading.delete(key);
        }
      };
      img.onerror = () => {
        thumbLoading.delete(key);
      };
      img.src = manifestEntry.idle.src;
    }
    return null;
  }

  function inferFrameSizeForManifestEntry(entry, image, key) {
    if (!entry || !image) return { frameWidth: 0, frameHeight: 0 };
    const fallbackClip = {
      image,
      frameWidth: entry.frameWidth || 0,
      frameHeight: entry.frameHeight || 0,
      src: entry.src,
    };
    return inferFrameSizeForClip(fallbackClip, key);
  }

  function inferFrameSizeForClip(clip, key) {
    const w = clip?.image?.width || 0;
    const h = clip?.image?.height || 0;
    let frameWidth = Number.isFinite(clip?.frameWidth) && clip.frameWidth > 0 ? clip.frameWidth : 0;
    let frameHeight = Number.isFinite(clip?.frameHeight) && clip.frameHeight > 0 ? clip.frameHeight : 0;
    if (frameWidth && frameHeight) return { frameWidth, frameHeight };
    if (!w || !h) return { frameWidth: 0, frameHeight: 0 };
    const overrideFrames = getOverrideFramesForKey(key);
    const overrideMax =
      Array.isArray(overrideFrames) && overrideFrames.length
        ? Math.max(...overrideFrames.map((v) => (Number.isFinite(v) ? v : -1)))
        : -1;
    const srcBase = (clip?.image?.src || clip?.src || "").split("/").pop() || "";
    const normalizedSrc = String(srcBase).trim().toLowerCase();
    const manualOverrides = {
      "minifireimp.png": { cols: 2, rows: 2 },
      "minihighdemon.png": { cols: 2, rows: 2 },
      "minidemonlord.png": { cols: 2, rows: 2 },
      "minidemonfirekeeper.png": { cols: 1, rows: 1 },
      "miniskeleton.png": { cols: 1, rows: 1 },
      "minizombie.png": { cols: 1, rows: 1 },
      "minizombiebutcher.png": { cols: 4, rows: 4 },
    };
    const override = manualOverrides[normalizedSrc];
    if (override) {
      if (override.frameWidth && override.frameHeight) {
        frameWidth = override.frameWidth;
        frameHeight = override.frameHeight;
      } else if (override.cols && override.rows) {
        frameWidth = Math.floor(w / override.cols);
        frameHeight = Math.floor(h / override.rows);
      }
    }
    if (!frameWidth || !frameHeight) {
      const neededFrames = overrideMax >= 0 ? overrideMax + 1 : 0;
      const maxCols = Math.max(1, Math.min(32, Math.floor(w / 8)));
      const maxRows = Math.max(1, Math.min(32, Math.floor(h / 8)));
      const colsCandidates = [];
      const rowsCandidates = [];
      for (let c = 1; c <= maxCols; c += 1) {
        if (w % c === 0) colsCandidates.push(c);
      }
      for (let r = 1; r <= maxRows; r += 1) {
        if (h % r === 0) rowsCandidates.push(r);
      }
      const commonCols = colsCandidates.length ? colsCandidates : [1, 2, 3, 4, 5, 6, 8, 10, 12];
      const commonRows = rowsCandidates.length ? rowsCandidates : [1, 2, 3, 4, 5, 6];
      let best = null;
      for (const cols of commonCols) {
        for (const rows of commonRows) {
          if (w % cols !== 0 || h % rows !== 0) continue;
          const fw = w / cols;
          const fh = h / rows;
          if (fw < 8 || fh < 8 || fw > 512 || fh > 512) continue;
          const frameCount = cols * rows;
          if (frameCount <= 1) continue;
          if (neededFrames && frameCount < neededFrames) continue;
          const extra = neededFrames ? frameCount - neededFrames : 0;
          const squareness = Math.abs(fw - fh);
          const score = extra * 3 + squareness + (fw + fh) / 256 - Math.log(frameCount);
          if (!best || score < best.score) {
            best = { fw: Math.floor(fw), fh: Math.floor(fh), score };
          }
        }
      }
      if (best) {
        frameWidth = best.fw;
        frameHeight = best.fh;
      }
    }
    if (!frameWidth || !frameHeight) {
      const gcd = (a, b) => {
        let x = Math.abs(a) | 0;
        let y = Math.abs(b) | 0;
        while (y) {
          const t = y;
          y = x % y;
          x = t;
        }
        return x || 1;
      };
      const g = gcd(w, h);
      if (g > 1 && w % g === 0 && h % g === 0) {
        frameWidth = g;
        frameHeight = g;
      } else {
        frameHeight = h;
        frameWidth = frameHeight;
      }
    }
    return { frameWidth, frameHeight };
  }

  function getOverrideFramesForKey(key) {
    if (!key) return null;
    const overrides = window.__BATTLECHURCH_OVERRIDES && window.__BATTLECHURCH_OVERRIDES[key];
    if (!overrides || typeof overrides !== "object") return null;
    if (overrides.walk && Array.isArray(overrides.walk.frames) && overrides.walk.frames.length) {
      return overrides.walk.frames;
    }
    if (overrides.idle && Array.isArray(overrides.idle.frames) && overrides.idle.frames.length) {
      return overrides.idle.frames;
    }
    return null;
  }

  function stopThumbAnimations() {
    if (thumbAnimState.rafId) {
      cancelAnimationFrame(thumbAnimState.rafId);
      thumbAnimState.rafId = null;
    }
    thumbAnimState.items = [];
  }

  function isImageReady(img) {
    return Boolean(img && img.complete && img.naturalWidth > 0);
  }

  function ensureThumbImageReady(img) {
    if (!img) return false;
    if (isImageReady(img)) return true;
    if (!thumbImageListeners.has(img)) {
      thumbImageListeners.add(img);
      img.addEventListener(
        "load",
        () => {
          if (overlay.style.display === "block") initThumbAnimations();
        },
        { once: true },
      );
    }
    return false;
  }

  function getThumbClipData(key) {
    const assets = window.assets || {};
    const enemyAssets = assets.enemies?.[key];
    const clip = enemyAssets?.idle || enemyAssets?.walk;
    if (!clip || !clip.image) return null;
    if (!ensureThumbImageReady(clip.image)) return null;
    const inferredSize = inferFrameSizeForClip(clip, key);
    const frameWidth = inferredSize.frameWidth || clip.frameWidth || clip.image.width;
    const frameHeight = inferredSize.frameHeight || clip.frameHeight || clip.image.height;
    const overrideMap = (window.__BATTLECHURCH_OVERRIDES && window.__BATTLECHURCH_OVERRIDES[key]) || {};
    const stateOverride = (enemyAssets?.idle && overrideMap.idle) || overrideMap.idle || overrideMap.walk || {};
    const frameMap =
      (Array.isArray(clip.frameMap) && clip.frameMap.length && clip.frameMap) ||
      (Array.isArray(stateOverride.frames) && stateOverride.frames.length ? stateOverride.frames : null);
    const cols = Math.max(1, Math.floor(clip.image.width / Math.max(1, frameWidth)));
    const rows = Math.max(1, Math.floor(clip.image.height / Math.max(1, frameHeight)));
    const frameCount = frameMap ? frameMap.length : Math.max(1, clip.frameCount || cols * rows);
    const frameRate = Number.isFinite(clip.frameRate) && clip.frameRate > 0 ? clip.frameRate : 6;
    const renderScale = Number.isFinite(clip.renderScale) && clip.renderScale > 0 ? clip.renderScale : 1;
    return {
      clip,
      frameMap,
      frameWidth,
      frameHeight,
      frameCount,
      frameRate,
      cols,
      renderScale,
    };
  }

  function drawFallbackThumb(canvas, url) {
    if (!canvas || !url) return;
    let img = thumbFallbackImages.get(url);
    if (!img) {
      img = new Image();
      img.src = url;
      thumbFallbackImages.set(url, img);
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    if (isImageReady(img)) draw();
    else {
      img.addEventListener(
        "load",
        () => {
          if (canvas.isConnected) draw();
        },
        { once: true },
      );
    }
  }

  function drawThumbFrame(item) {
    const { canvas, ctx, clip, frameWidth, frameHeight, cols, frameMap, renderScale } = item;
    const framePos = frameMap
      ? frameMap[item.frameIndex % frameMap.length]
      : item.frameIndex;
    const sx = (framePos % cols) * frameWidth;
    const sy = Math.floor(framePos / cols) * frameHeight;
    const baseSize = Math.max(frameWidth, frameHeight) * renderScale;
    const scale = THUMB_SIZE / Math.max(1, baseSize);
    const dw = frameWidth * renderScale * scale;
    const dh = frameHeight * renderScale * scale;
    const dx = (THUMB_SIZE - dw) / 2;
    const dy = (THUMB_SIZE - dh) / 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(clip.image, sx, sy, frameWidth, frameHeight, dx, dy, dw, dh);
  }

  function stepThumbAnimations(now) {
    if (!thumbAnimState.items.length) return;
    const delta = Math.max(0, now - thumbAnimState.lastTime);
    thumbAnimState.lastTime = now;
    thumbAnimState.items.forEach((item) => {
      if (!item.shouldAnimate) {
        drawThumbFrame(item);
        return;
      }
      item.accumulator += delta;
      while (item.accumulator >= item.frameDuration) {
        item.accumulator -= item.frameDuration;
        item.frameIndex = (item.frameIndex + 1) % item.frameCount;
      }
      drawThumbFrame(item);
    });
    thumbAnimState.rafId = requestAnimationFrame(stepThumbAnimations);
  }

  function initThumbAnimations() {
    stopThumbAnimations();
    if (!els || !els.content) return;
    const canvases = els.content.querySelectorAll("canvas[data-thumb-key]");
    const items = [];
    canvases.forEach((canvas) => {
      const key = canvas.getAttribute("data-thumb-key");
      if (!key) return;
      const data = getThumbClipData(key);
      if (!data) {
        const fallback = canvas.getAttribute("data-thumb-fallback");
        if (fallback) drawFallbackThumb(canvas, fallback);
        return;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const frameDuration = 1000 / Math.max(1, data.frameRate);
      const shouldAnimate = data.frameRate > 0 && data.frameCount > 1;
      const item = {
        canvas,
        ctx,
        clip: data.clip,
        frameMap: data.frameMap,
        frameWidth: data.frameWidth,
        frameHeight: data.frameHeight,
        cols: data.cols,
        frameCount: data.frameCount,
        frameDuration,
        frameIndex: 0,
        accumulator: 0,
        renderScale: data.renderScale,
        shouldAnimate,
      };
      drawThumbFrame(item);
      items.push(item);
    });
    thumbAnimState.items = items;
    if (items.some((item) => item.shouldAnimate)) {
      thumbAnimState.lastTime = performance.now();
      thumbAnimState.rafId = requestAnimationFrame(stepThumbAnimations);
    }
  }

  function toggleHiddenEnemy(key) {
    const hidden = state.config.globals.hiddenEnemies || [];
    const idx = hidden.indexOf(key);
    if (idx >= 0) hidden.splice(idx, 1);
    else hidden.push(key);
    state.config.globals.hiddenEnemies = hidden;
    // Remove stat overrides for hidden enemies
    if (idx < 0 && state.config.globals.enemyStats) {
      delete state.config.globals.enemyStats[key];
    }
    saveToStorage(state.config);
  }

  function setStatus(text, isError = false) {
    if (!els || !els.status) return;
    els.status.textContent = text || "";
    els.status.style.color = isError ? "#ffb3b3" : "#9bf0ff";
  }

  function formatNow() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  }

  async function fetchServerConfig() {
    if (!IS_LOCALHOST) return null;
    try {
      const res = await fetch(SYNC_ENDPOINT, { method: "GET" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = await res.json();
      const cfg =
        (payload && payload.config) ||
        (payload && payload.data && payload.data.devLevelConfig);
      if (cfg && typeof cfg === "object") return normalizeConfig(cfg);
    } catch (err) {
      console.warn("LevelBuilder: failed to pull file config", err);
    }
    return null;
  }

  async function saveConfigToServer(cfg) {
    if (!IS_LOCALHOST) return false;
    try {
      const res = await fetch(SYNC_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: cfg }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return true;
    } catch (err) {
      console.warn("LevelBuilder: failed to save file config", err);
      return false;
    }
  }

  async function syncFromServer(options = {}) {
    const { showStatus = false } = options;
    if (!IS_LOCALHOST) {
      if (showStatus) {
        setStatus("File sync disabled (not running locally)", true);
      }
      return false;
    }
    const cfg = await fetchServerConfig();
    if (cfg) {
      state.config = cfg;
      saveToStorage(state.config);
      refreshUI();
      if (showStatus) setStatus(`Loaded from level_data.js (${formatNow()})`);
      return true;
    }
    if (showStatus) {
      setStatus("File sync unavailable (run dev_level_server.js)", true);
    }
    return false;
  }

  async function persistConfig() {
    saveToStorage(state.config);
    const timestamp = formatNow();
    const savedMsg = `Saved locally ${timestamp}`;
    setStatus(savedMsg);
    if (!IS_LOCALHOST) return;
    const ok = await saveConfigToServer(state.config);
    if (ok) setStatus(`Saved to level_data.js ${timestamp}`);
    else setStatus(`${savedMsg} (run dev_level_server.js to sync)`, true);
  }

  function refreshUI() {
    const scopeBefore = { ...state.scope };
    initScopeSelectors();
    const { battleObj } = getActiveScope();
    const hpb = state.config.structure.defaultHordesPerBattle || 10;
    battleObj.hordesPerBattle = hpb;
    battleObj.hordes = battleObj.hordes || [];
    while (battleObj.hordes.length < hpb) {
      battleObj.hordes.push({
        index: battleObj.hordes.length + 1,
        entries: [],
        weights: {},
        delays: {},
        delaysWeighted: {},
        delaysExplicit: {},
        mode: "explicit",
        allKill: false,
        duration: state.config.structure.defaultHordeDuration || DEFAULT_HORDE_DURATION,
      });
    }
    battleObj.hordes = battleObj.hordes.slice(0, hpb);
    const defaultDuration = state.config.structure.defaultHordeDuration || DEFAULT_HORDE_DURATION;
    battleObj.hordes.forEach((horde, idx) => {
      horde.index = idx + 1;
      horde.mode = "explicit";
      horde.weights = {};
      horde.delays = {};
      horde.delaysWeighted = {};
      horde.delaysExplicit = {};
      horde.allKill = idx === hpb - 1;
      if (!Number.isFinite(horde.duration) || horde.duration <= 0) {
        horde.duration = defaultDuration;
      }
    });
    if (els.hordeDuration) {
      const baseDuration = battleObj.hordes[0]?.duration || defaultDuration;
      els.hordeDuration.value = Math.round(baseDuration);
    }
    renderModeAndWeights();
  }

  function attachEvents() {
    ["level", "month"].forEach((key) => {
      els[key].addEventListener("change", () => {
        updateScopeFromSelects();
        refreshUI();
      });
    });
    const showHiddenCheckbox = overlay.querySelector("#lb-showHidden");
    if (showHiddenCheckbox) {
      showHiddenCheckbox.addEventListener("change", () => {
        state.showHidden = showHiddenCheckbox.checked;
        renderModeAndWeights();
      });
    }
    els.hordeDuration.addEventListener("change", () => {
      const val = Math.max(1, Number(els.hordeDuration.value) || DEFAULT_HORDE_DURATION);
      const { battleObj } = getActiveScope();
      if (!battleObj || !Array.isArray(battleObj.hordes)) return;
      battleObj.hordes.forEach((horde) => {
        horde.duration = val;
      });
      saveToStorage(state.config);
    });
    if (els.load) {
      els.load.addEventListener("click", () => {
        syncFromServer({ showStatus: true });
      });
    }
    els.save.addEventListener("click", () => {
      persistConfig();
    });
    if (els.saveAs) {
      els.saveAs.addEventListener("click", () => {
        try {
          const blob = new Blob(
            [
              "// Auto-generated by Level Builder\n",
              "window.BattlechurchLevelData = ",
              JSON.stringify(state.config, null, 2),
              ";",
            ],
            { type: "application/javascript" },
          );
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "level_data.js";
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 0);
          setStatus("Downloaded level_data.js");
        } catch (err) {
          console.error("LevelBuilder: save as failed", err);
          setStatus("Save As failed", true);
        }
      });
    }
    els.close.addEventListener("click", hide);
  }

  function show() {
    loadFromFileConfig();
    refreshUI();
    overlay.style.display = "block";
  }

  function hide() {
    overlay.style.display = "none";
    stopThumbAnimations();
  }

  function toggle() {
    if (overlay.style.display === "block") hide();
    else show();
  }

  function isTypingTarget(el) {
    if (!el) return false;
    const tag = (el.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return true;
    if (el.isContentEditable) return true;
    return false;
  }

  document.addEventListener("keydown", (e) => {
    if (typeof window !== "undefined" && window.__BC_ENEMY_EDITOR_ACTIVE) return;
    if (isTypingTarget(e.target)) return;
    if (e.key && e.key.toLowerCase() === "l" && !overlay.contains(document.activeElement)) {
      e.preventDefault();
      toggle();
    }
    if (e.key === "Escape" && overlay.style.display === "block") {
      hide();
    }
  });

  attachEvents();
  syncFromServer();

  window.BattlechurchLevelBuilder = {
    getConfig: () => state.config,
    save: () => saveToStorage(state.config),
    load: () => loadFromStorage(),
    show,
    hide,
    toggle,
  };
})(typeof window !== "undefined" ? window : null, typeof document !== "undefined" ? document : null);
