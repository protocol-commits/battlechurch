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
      defaultHordesPerBattle: 10,
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
  const thumbCache = {};
  const thumbLoading = new Set();
  const DEFAULT_HORDE_DURATION = 10;

  function updateScopeFromSelects() {
    state.scope = {
      level: Number(els.level.value) || 1,
      month: Number(els.month.value) || 1,
      battle: Number(els.battle.value) || 1,
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
    const battleObj = ensureBattle(monthObj, scope.battle);
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
    </style>
    <div class="lb-shell">
      <div class="panel" id="lb-topPanel">
        <div class="lb-topbar">
          <div class="group">
            <label>Level</label>
            <select id="lb-level"></select>
            <label>Month</label>
            <select id="lb-month"></select>
            <label>Battle</label>
            <select id="lb-battle"></select>
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
    battle: overlay.querySelector("#lb-battle"),
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
    populateSelect(els.battle, s.battlesPerMonth);
    els.level.value = String(state.scope.level);
    els.month.value = String(state.scope.month);
    els.battle.value = String(state.scope.battle);
  }

  function getActiveScope() {
    const scope = {
      level: Number(els.level.value) || 1,
      month: Number(els.month.value) || 1,
      battle: Number(els.battle.value) || 1,
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
    const header = document.createElement("tr");
    const hordeHeaders = Array.from({ length: hordeCount }, (_, idx) => {
      const label = idx === hordeCount - 1 ? `H${idx + 1}*` : `H${idx + 1}`;
      return `<th style="min-width:64px;text-align:center;">${label}</th>`;
    }).join("");
    header.innerHTML =
      `<th style="width:60px;">Sprite</th><th>Enemy</th>${hordeHeaders}<th>Hide</th>`;
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
          `<td style="text-align:center;"><input type="number" data-exp-count="${key}" data-horde="${i + 1}" value="${countVal}" min="0" style="width:60px;"></td>`,
        );
      }
      row.innerHTML = `
        <td><div style="width:48px;height:48px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:6px;">
          ${thumb ? `<img src="${thumb}" style="max-width:100%;max-height:100%;">` : ""}
        </div></td>
        <td>${key}${hiddenSet.has(key) ? " (hidden)" : ""}</td>
        ${cells.join("")}
        <td><button data-hide="${key}" class="secondary" style="padding:4px 8px;">${hiddenSet.has(key) ? "Unhide" : "Hide"}</button></td>
      `;
      table.appendChild(row);
    });
    els.content.innerHTML = "";
    els.content.appendChild(table);
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
        const overrideMap = (window.__BATTLECHURCH_OVERRIDES && window.__BATTLECHURCH_OVERRIDES[key]) || {};
        const stateOverride = overrideMap.idle || overrideMap.walk || {};
        const mappedFrames =
          (Array.isArray(clip.frameMap) && clip.frameMap.length && clip.frameMap) ||
          stateOverride.frames ||
          null;
        const frameIndex = mappedFrames && mappedFrames.length ? mappedFrames[0] : 0;
        const frameWidth = clip.frameWidth || clip.image.width;
        const frameHeight = clip.frameHeight || clip.image.height;
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
          const frameW = entry.frameWidth || 100;
          const frameH = entry.frameHeight || 100;
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
    ["level", "month", "battle"].forEach((key) => {
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
