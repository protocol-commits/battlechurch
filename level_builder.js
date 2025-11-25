(function setupLevelBuilder(window, document) {
  if (!window || !document) return;

  const STORAGE_KEY = "battlechurch.devLevelConfig";
  const DEFAULTS = {
    meta: { version: 1 },
    structure: {
      levels: 4,
      monthsPerLevel: 3,
      battlesPerMonth: 3,
      defaultHordesPerBattle: 6,
    },
    globals: {
      enemyStats: {},
      enemyTags: {},
      mode: "weighted",
      hiddenEnemies: [],
    },
    levels: [],
  };

  function deepClone(obj) {
    return obj ? JSON.parse(JSON.stringify(obj)) : null;
  }

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return deepClone(DEFAULTS);
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    } catch (err) {
      console.warn("LevelBuilder: failed to parse storage", err);
    }
    return deepClone(DEFAULTS);
  }

  function saveToStorage(cfg) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg || {}));
    } catch (err) {
      console.warn("LevelBuilder: failed to save", err);
    }
  }

  const state = {
    config: loadFromStorage(),
    scope: { level: 1, month: 1, battle: 1, horde: 1 },
    mode: "weighted",
    showHidden: false,
  };
  const thumbCache = {};
  const thumbLoading = new Set();

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
      battleObj.hordes.push({ index: battleObj.hordes.length + 1, entries: [], weights: {} });
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
      #levelBuilderOverlay .lb-grid {
        display: grid;
        grid-template-columns: 260px 1fr 340px;
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
    <div class="lb-grid">
      <div class="panel" id="lb-navPanel">
        <h3>Scope</h3>
        <label>Level</label>
        <select id="lb-level"></select>
        <label>Month</label>
        <select id="lb-month"></select>
        <label>Battle</label>
        <select id="lb-battle"></select>
        <label>Horde</label>
        <select id="lb-horde"></select>
        <label>Hordes per Battle</label>
        <input type="number" id="lb-hordesPerBattle" min="1" max="12" step="1">
        <div class="button-row" style="margin-top:12px;">
          <button id="lb-close" class="secondary">Close (Esc)</button>
        </div>
      </div>
      <div class="panel" id="lb-mainPanel">
        <h3>Mode & Enemies</h3>
        <label><input type="checkbox" id="lb-showHidden"> Show hidden enemies</label>
        <label>Mode</label>
        <select id="lb-mode">
          <option value="weighted">Weighted (random)</option>
          <option value="explicit">Explicit (fixed groups)</option>
        </select>
        <div class="scroll" id="lb-contentArea"></div>
      </div>
      <div class="panel" id="lb-sidePanel">
        <h3>Export / Import</h3>
        <textarea id="lb-json" rows="16" placeholder="Config JSON"></textarea>
        <div class="button-row">
          <button id="lb-save" type="button">Save</button>
          <button id="lb-load" class="secondary" type="button">Load JSON</button>
        </div>
        <div id="lb-status" style="margin-top:8px;font-size:12px;color:#9bf0ff;"></div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const els = {
    overlay,
    level: overlay.querySelector("#lb-level"),
    month: overlay.querySelector("#lb-month"),
    battle: overlay.querySelector("#lb-battle"),
    horde: overlay.querySelector("#lb-horde"),
    mode: overlay.querySelector("#lb-mode"),
    hordesPerBattle: overlay.querySelector("#lb-hordesPerBattle"),
    content: overlay.querySelector("#lb-contentArea"),
    json: overlay.querySelector("#lb-json"),
    save: overlay.querySelector("#lb-save"),
    load: overlay.querySelector("#lb-load"),
    close: overlay.querySelector("#lb-close"),
    status: overlay.querySelector("#lb-status"),
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
    populateSelect(els.horde, Math.max(1, s.defaultHordesPerBattle));
    els.level.value = String(state.scope.level);
    els.month.value = String(state.scope.month);
    els.battle.value = String(state.scope.battle);
    els.horde.value = String(state.scope.horde);
  }

  function getActiveScope() {
    const scope = {
      level: Number(els.level.value) || 1,
      month: Number(els.month.value) || 1,
      battle: Number(els.battle.value) || 1,
      horde: Number(els.horde.value) || 1,
    };
    state.scope = scope;
    return getOrCreateScope(scope);
  }

  function renderModeAndWeights() {
    const { battleObj, hordeObj } = getActiveScope();
    const scopeMode = hordeObj.mode || battleObj.mode || state.config.globals.mode || "weighted";
    els.mode.value = scopeMode;
    const catalog = (window.BattlechurchEnemyCatalog && window.BattlechurchEnemyCatalog.catalog) || {};
    if (!hordeObj.weights || Object.keys(hordeObj.weights).length === 0) {
      const basePool = basePoolForScope(state.scope);
      if (basePool.length) {
        hordeObj.weights = {};
        basePool.forEach((name) => {
          hordeObj.weights[name] = 1;
        });
        saveToStorage(state.config);
      }
    }
    const weights = hordeObj.weights || {};
    const entries = hordeObj.entries || [];
    const hiddenSet = new Set(state.config.globals.hiddenEnemies || []);

    if (scopeMode === "weighted") {
      const table = document.createElement("table");
      const header = document.createElement("tr");
      header.innerHTML = "<th style=\"width:60px;\">Sprite</th><th>Enemy</th><th>Weight</th><th>Hide</th>";
      table.appendChild(header);
      Object.keys(catalog).forEach((key) => {
        if (hiddenSet.has(key) && !state.showHidden) return;
        const row = document.createElement("tr");
        const w = weights[key] ?? "";
        const thumb = getEnemyThumbnail(key);
        row.innerHTML = `
          <td><div style="width:48px;height:48px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:6px;">
            ${thumb ? `<img src="${thumb}" style="max-width:100%;max-height:100%;">` : ""}
          </div></td>
          <td>${key}${hiddenSet.has(key) ? " (hidden)" : ""}</td>
          <td><input type="number" data-weight="${key}" value="${w}" min="0" style="width:80px;"></td>
          <td><button data-hide="${key}" class="secondary" style="padding:4px 8px;">${hiddenSet.has(key) ? "Unhide" : "Hide"}</button></td>
        `;
        table.appendChild(row);
      });
      els.content.innerHTML = "";
      els.content.appendChild(table);
      els.content.querySelectorAll("input[data-weight]").forEach((input) => {
        input.addEventListener("change", () => {
          const key = input.getAttribute("data-weight");
          const val = Number(input.value);
          hordeObj.weights = hordeObj.weights || {};
          if (Number.isNaN(val)) delete hordeObj.weights[key];
          else hordeObj.weights[key] = val;
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
    } else {
      const container = document.createElement("div");
      container.innerHTML = `<div style="margin-bottom:8px;">Explicit groups (enemy + count). Formation data saved but not fully previewed here.</div>`;
      const list = document.createElement("div");
      entries.forEach((entry, idx) => {
        const row = document.createElement("div");
        row.style.display = "grid";
        row.style.gridTemplateColumns = "1fr 80px 60px";
        row.style.gap = "6px";
        row.style.marginBottom = "6px";
        row.innerHTML = `
          <input data-exp="enemy" data-idx="${idx}" value="${entry.enemy || ""}" placeholder="enemy key">
          <input type="number" data-exp="count" data-idx="${idx}" value="${entry.count ?? 1}" min="1">
          <button data-exp="del" data-idx="${idx}" class="secondary" style="padding:6px;">✕</button>
        `;
        list.appendChild(row);
      });
      const addBtn = document.createElement("button");
      addBtn.textContent = "Add Entry";
      addBtn.className = "secondary";
      addBtn.addEventListener("click", () => {
        hordeObj.entries = hordeObj.entries || [];
        hordeObj.entries.push({ enemy: "skeleton", count: 1 });
        renderModeAndWeights();
        saveToStorage(state.config);
      });
      container.appendChild(list);
      container.appendChild(addBtn);
      els.content.innerHTML = "";
      els.content.appendChild(container);

    els.content.querySelectorAll("input[data-exp]").forEach((input) => {
      input.addEventListener("change", () => {
        const idx = Number(input.getAttribute("data-idx"));
        const kind = input.getAttribute("data-exp");
        hordeObj.entries = hordeObj.entries || [];
        if (!hordeObj.entries[idx]) hordeObj.entries[idx] = {};
        if (kind === "enemy") hordeObj.entries[idx].enemy = input.value;
        if (kind === "count") hordeObj.entries[idx].count = Math.max(1, Number(input.value) || 1);
        saveToStorage(state.config);
      });
    });
      els.content.querySelectorAll("button[data-exp='del']").forEach((btn) => {
        btn.addEventListener("click", () => {
          const idx = Number(btn.getAttribute("data-idx"));
          hordeObj.entries.splice(idx, 1);
          saveToStorage(state.config);
          renderModeAndWeights();
        });
      });
    }
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

  function refreshUI() {
    initScopeSelectors();
    const { battleObj } = getActiveScope();
    const hpb =
      battleObj.hordesPerBattle ||
      state.config.structure.defaultHordesPerBattle ||
      6;
    populateSelect(els.horde, hpb);
    els.hordesPerBattle.value = hpb;
    renderModeAndWeights();
  }

  function attachEvents() {
    ["level", "month", "battle", "horde"].forEach((key) => {
      els[key].addEventListener("change", refreshUI);
    });
    const showHiddenCheckbox = overlay.querySelector("#lb-showHidden");
    if (showHiddenCheckbox) {
      showHiddenCheckbox.addEventListener("change", () => {
        state.showHidden = showHiddenCheckbox.checked;
        renderModeAndWeights();
      });
    }
    els.mode.addEventListener("change", () => {
      const { hordeObj } = getActiveScope();
      hordeObj.mode = els.mode.value;
      saveToStorage(state.config);
      renderModeAndWeights();
    });
    els.hordesPerBattle.addEventListener("change", () => {
      const val = Math.max(1, Number(els.hordesPerBattle.value) || 1);
      const { battleObj } = getActiveScope();
      battleObj.hordesPerBattle = val;
      saveToStorage(state.config);
      refreshUI();
    });
    els.save.addEventListener("click", () => {
      saveToStorage(state.config);
      els.json.value = JSON.stringify(state.config, null, 2);
      if (els.status) {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, "0");
        const mm = String(now.getMinutes()).padStart(2, "0");
        const ss = String(now.getSeconds()).padStart(2, "0");
        els.status.textContent = `Saved ${hh}:${mm}:${ss}`;
      }
    });
    els.load.addEventListener("click", () => {
      try {
        const parsed = JSON.parse(els.json.value || "{}");
        state.config = parsed;
        saveToStorage(state.config);
        refreshUI();
      } catch (err) {
        alert("Invalid JSON");
      }
    });
    els.close.addEventListener("click", hide);
  }

  function show() {
    refreshUI();
    els.json.value = JSON.stringify(state.config, null, 2);
    overlay.style.display = "block";
  }

  function hide() {
    overlay.style.display = "none";
  }

  function toggle() {
    if (overlay.style.display === "block") hide();
    else show();
  }

  document.addEventListener("keydown", (e) => {
    if (e.key && e.key.toLowerCase() === "l" && !overlay.contains(document.activeElement)) {
      e.preventDefault();
      toggle();
    }
    if (e.key === "Escape" && overlay.style.display === "block") {
      hide();
    }
  });

  attachEvents();

  window.BattlechurchLevelBuilder = {
    getConfig: () => state.config,
    save: () => saveToStorage(state.config),
    load: () => loadFromStorage(),
    show,
    hide,
    toggle,
  };
})(typeof window !== "undefined" ? window : null, typeof document !== "undefined" ? document : null);
