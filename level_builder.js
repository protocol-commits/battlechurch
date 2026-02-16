(function setupLevelBuilder(window, document) {
  if (!window || !document) return;

  const STORAGE_KEY = "battlechurch.devLevelConfig";
  const SYNC_ENDPOINT = "http://localhost:4100/level-config";
  const IS_LOCALHOST = (() => {
    const host = String(window.location?.hostname || "").toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0";
  })();
  const ENABLE_FILE_SYNC =
    IS_LOCALHOST &&
    (window.__levelBuilderEnableSync === true ||
      localStorage.getItem("battlechurch.enableLevelSync") === "true");
  const DEFAULTS = {
    meta: { version: 2 },
    structure: {
      towns: 13,
      battlesPerTown: 3,
      missionsPerBattle: 3,
      defaultWavesPerMission: 3,
      defaultHordesPerWave: 7,
      defaultHordeDuration: 4,
    },
    globals: {
      enemyStats: {},
      enemyTags: {},
      mode: "explicit",
      hiddenEnemies: [],
    },
    towns: [],
  };
const WALK_FIRST_KEYS = new Set(["miniImp", "miniImpLevel2", "miniImpLevel3"]);

  function deepClone(obj) {
    return obj ? JSON.parse(JSON.stringify(obj)) : null;
  }

  function migrateV1toV2(cfg) {
    // Migrate old keys: levels→towns, months→battles, battles→missions
    // Group flat hordes[] into waves[] using allKill boundaries.
    const oldLevels = Array.isArray(cfg.levels) ? cfg.levels : [];
    const towns = oldLevels.map((lvl) => {
      const oldMonths = Array.isArray(lvl.months) ? lvl.months : [];
      const battles = oldMonths.map((month) => {
        const oldBattles = Array.isArray(month.battles) ? month.battles : [];
        const missions = oldBattles.map((battle) => {
          const oldHordes = Array.isArray(battle.hordes) ? battle.hordes : [];
          // Group hordes into waves at each allKill boundary.
          const waves = [];
          let currentWave = null;
          let waveIdx = 1;
          oldHordes.forEach((horde) => {
            if (!currentWave) {
              currentWave = { index: waveIdx++, introText: "", breakerDuration: 3, hordes: [] };
            }
            currentWave.hordes.push(horde);
            if (horde.allKill) {
              waves.push(currentWave);
              currentWave = null;
            }
          });
          if (currentWave && currentWave.hordes.length) waves.push(currentWave);
          return { index: battle.index, waves };
        });
        return { index: month.index, missions };
      });
      return { index: lvl.index, battles };
    });
    // Pad to 13 towns.
    while (towns.length < 13) {
      towns.push({ index: towns.length + 1, battles: [] });
    }
    const oldStruct = cfg.structure || {};
    return {
      meta: { version: 2 },
      structure: {
        towns: 13,
        battlesPerTown: oldStruct.monthsPerLevel || 3,
        missionsPerBattle: oldStruct.battlesPerMonth || 3,
        defaultWavesPerMission: DEFAULTS.structure.defaultWavesPerMission,
        defaultHordesPerWave: DEFAULTS.structure.defaultHordesPerWave,
        defaultHordeDuration: oldStruct.defaultHordeDuration || 4,
      },
      globals: cfg.globals || deepClone(DEFAULTS.globals),
      towns,
    };
  }

  function normalizeConfig(raw) {
    const cfg = raw && typeof raw === "object" ? raw : {};
    // Migrate v1 data (has `levels` key, no `towns` key) to v2.
    if (Array.isArray(cfg.levels) && !Array.isArray(cfg.towns)) {
      return normalizeConfig(migrateV1toV2(cfg));
    }
    const merged = {
      meta: { version: 2 },
      structure: { ...deepClone(DEFAULTS.structure), ...(cfg.structure || {}) },
      globals: { ...deepClone(DEFAULTS.globals), ...(cfg.globals || {}) },
      towns: Array.isArray(cfg.towns) ? cfg.towns : [],
    };
    // Pad towns array to at least structure.towns entries.
    const targetTowns = merged.structure.towns || 13;
    while (merged.towns.length < targetTowns) {
      merged.towns.push({ index: merged.towns.length + 1, battles: [] });
    }
    // Ensure new enemies show up even if they were hidden in older configs.
    if (Array.isArray(merged.globals.hiddenEnemies)) {
      merged.globals.hiddenEnemies = merged.globals.hiddenEnemies.filter(
        (key) =>
          ![
            "miniImpLevel3",
            "armoredOrc",
            "armoredSkeleton",
            "armoredAxeman",
            "armoredEliteOrc",
            "orc",
          ].includes(key),
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

  const state = {
    config: loadFromStorage(),
    scope: { town: 1, battle: 1, mission: 1 },
    mode: "explicit",
    showHidden: false,
    clipboard: null, // { type: 'horde'|'wave'|'mission'|'battle', data: deepClone }
  };
  const THUMB_SIZE = 48;
  const thumbAnimState = { items: [], rafId: null, lastTime: 0 };
  const manifestThumbImages = new Map();
  const thumbImageListeners = new WeakSet();
  const DEFAULT_HORDE_DURATION = 10;

  function updateScopeFromSelects() {
    state.scope = {
      town:    Number(els.town?.value)    || 1,
      battle:  Number(els.battle?.value)  || 1,
      mission: Number(els.mission?.value) || 1,
    };
  }

  function makeDefaultHorde(idx) {
    return {
      index: idx,
      entries: [],
      weights: {},
      delays: {},
      delaysWeighted: {},
      delaysExplicit: {},
      mode: "explicit",
      allKill: false,
      duration: state.config.structure.defaultHordeDuration || DEFAULT_HORDE_DURATION,
    };
  }

  function makeDefaultWave(idx, hordesPerWave) {
    const count = hordesPerWave || state.config.structure.defaultHordesPerWave || 7;
    const hordes = Array.from({ length: count }, (_, i) => makeDefaultHorde(i + 1));
    return { index: idx, introText: "", breakerDuration: 3, hordes };
  }

  function ensureTown(townIdx) {
    const cfg = state.config;
    cfg.towns = cfg.towns || [];
    while (cfg.towns.length < townIdx) {
      cfg.towns.push({ index: cfg.towns.length + 1, battles: [] });
    }
    return cfg.towns[townIdx - 1];
  }

  function ensureBattle(townObj, battleIdx) {
    townObj.battles = townObj.battles || [];
    while (townObj.battles.length < battleIdx) {
      townObj.battles.push({ index: townObj.battles.length + 1, missions: [] });
    }
    return townObj.battles[battleIdx - 1];
  }

  function ensureMission(battleObj, missionIdx) {
    battleObj.missions = battleObj.missions || [];
    while (battleObj.missions.length < missionIdx) {
      const idx = battleObj.missions.length + 1;
      const wavesPerMission = state.config.structure.defaultWavesPerMission || 3;
      battleObj.missions.push({
        index: idx,
        waves: Array.from({ length: wavesPerMission }, (_, i) => makeDefaultWave(i + 1)),
      });
    }
    return battleObj.missions[missionIdx - 1];
  }

  function ensureWave(missionObj, waveIdx) {
    missionObj.waves = missionObj.waves || [];
    while (missionObj.waves.length < waveIdx) {
      missionObj.waves.push(makeDefaultWave(missionObj.waves.length + 1));
    }
    return missionObj.waves[waveIdx - 1];
  }

  function ensureHorde(waveObj, hordeIdx) {
    waveObj.hordes = waveObj.hordes || [];
    while (waveObj.hordes.length < hordeIdx) {
      waveObj.hordes.push(makeDefaultHorde(waveObj.hordes.length + 1));
    }
    return waveObj.hordes[hordeIdx - 1];
  }

  function getOrCreateMission() {
    const { town, battle, mission } = state.scope;
    const townObj    = ensureTown(town);
    const battleObj  = ensureBattle(townObj, battle);
    const missionObj = ensureMission(battleObj, mission);
    return { townObj, battleObj, missionObj };
  }

  // UI scaffolding
  const overlay = document.createElement("div");
  overlay.id = "levelBuilderOverlay";
  overlay.innerHTML = `
    <style>
      #levelBuilderOverlay {
        position: fixed; inset: 0;
        background: rgba(6, 10, 18, 0.94);
        color: #e8f4ff;
        font-family: "Inter", Arial, sans-serif;
        z-index: 9999; display: none;
        padding: 16px; box-sizing: border-box;
      }
      #levelBuilderOverlay .lb-shell { display:flex; flex-direction:column; gap:12px; height:100%; }
      #levelBuilderOverlay .panel {
        background: rgba(18,28,44,0.85);
        border: 1px solid rgba(120,170,220,0.35);
        border-radius: 8px; padding: 10px;
        overflow: hidden; display: flex; flex-direction: column;
      }
      #levelBuilderOverlay h3 { margin:0 0 8px 0; font-size:15px; letter-spacing:0.3px; }
      #levelBuilderOverlay label { font-size:12px; opacity:0.9; }
      #levelBuilderOverlay input, #levelBuilderOverlay select, #levelBuilderOverlay textarea {
        width:100%; padding:6px 8px; margin:4px 0 10px 0;
        border-radius:6px; border:1px solid rgba(255,255,255,0.18);
        background:rgba(255,255,255,0.06); color:#e8f4ff;
      }
      #levelBuilderOverlay .lb-topbar { display:flex; flex-wrap:wrap; gap:12px; align-items:flex-end; }
      #levelBuilderOverlay .lb-topbar .group { display:flex; gap:8px; align-items:flex-end; }
      #levelBuilderOverlay .lb-topbar label { margin:0 6px 0 0; }
      #levelBuilderOverlay .lb-topbar select, #levelBuilderOverlay .lb-topbar input
        { width:auto; min-width:72px; margin:0; }
      #levelBuilderOverlay button {
        background:#2b74ff; color:#fff; border:none;
        padding:8px 12px; border-radius:6px; cursor:pointer; font-weight:600;
      }
      #levelBuilderOverlay button.secondary { background:rgba(255,255,255,0.08); }
      #levelBuilderOverlay button.danger { background:rgba(200,50,50,0.7); }
      #levelBuilderOverlay .scroll { overflow:auto; flex:1; }
      /* Mission column layout */
      #levelBuilderOverlay .lb-mission-cols { display:flex; gap:0; width:max-content; }
      #levelBuilderOverlay .lb-label-col {
        position:sticky; left:0; z-index:5;
        background:rgba(18,28,44,0.98);
        display:flex; flex-direction:column;
        min-width:220px; border-right:1px solid rgba(120,170,220,0.25);
      }
      #levelBuilderOverlay .lb-label-col .lb-label-header {
        height:64px; display:flex; align-items:center;
        padding:0 8px; font-size:11px; font-weight:700;
        border-bottom:1px solid rgba(120,170,220,0.2);
        background:rgba(18,28,44,0.98);
      }
      #levelBuilderOverlay .lb-label-row {
        display:flex; align-items:center; gap:6px;
        height:32px; padding:0 6px;
        border-bottom:1px solid rgba(120,170,220,0.1); font-size:11px;
      }
      #levelBuilderOverlay .lb-label-row canvas { flex-shrink:0; }
      #levelBuilderOverlay .lb-wave-col {
        min-width:120px; max-width:120px;
        background:rgba(255,200,80,0.07);
        border-right:2px solid rgba(255,200,80,0.3);
        display:flex; flex-direction:column;
      }
      #levelBuilderOverlay .lb-wave-header {
        padding:6px 8px; font-size:11px; font-weight:700;
        color:#ffd060; border-bottom:1px solid rgba(255,200,80,0.25);
        background:rgba(255,200,80,0.12);
      }
      #levelBuilderOverlay .lb-wave-body { padding:6px 8px; flex:1; display:flex; flex-direction:column; gap:4px; }
      #levelBuilderOverlay .lb-wave-body textarea {
        width:100%; resize:vertical; font-size:10px; min-height:48px;
        margin:0; padding:4px;
      }
      #levelBuilderOverlay .lb-wave-body label { font-size:10px; }
      #levelBuilderOverlay .lb-wave-body input[type=number] { width:60px; margin:0; padding:3px 5px; }
      #levelBuilderOverlay .lb-wave-footer { padding:6px 8px; display:flex; gap:4px; }
      #levelBuilderOverlay .lb-horde-col {
        min-width:70px; max-width:70px;
        border-right:1px solid rgba(120,170,220,0.15);
        display:flex; flex-direction:column;
      }
      #levelBuilderOverlay .lb-horde-header {
        height:64px; display:flex; flex-direction:column;
        align-items:center; justify-content:center; gap:3px;
        padding:4px 2px; font-size:10px; font-weight:700;
        border-bottom:1px solid rgba(120,170,220,0.2);
        background:rgba(255,255,255,0.03); position:relative;
      }
      #levelBuilderOverlay .lb-horde-header .lb-col-menu-btn {
        position:absolute; top:4px; right:4px;
        background:rgba(255,255,255,0.1); border:none;
        color:#e8f4ff; padding:1px 5px; border-radius:3px;
        font-size:10px; cursor:pointer; font-weight:normal;
      }
      #levelBuilderOverlay .lb-horde-cell-row {
        height:32px; display:flex; align-items:center; justify-content:center;
        border-bottom:1px solid rgba(120,170,220,0.1);
      }
      #levelBuilderOverlay .lb-horde-input {
        width:56px; text-align:center; padding:2px 4px; margin:0; font-size:11px;
      }
      #levelBuilderOverlay .lb-horde-footer {
        padding:6px 4px; display:flex; flex-direction:column; gap:4px; font-size:10px;
      }
      #levelBuilderOverlay .lb-horde-footer label { display:flex; align-items:center; gap:4px; }
      #levelBuilderOverlay .lb-horde-footer input[type=number] { width:52px; margin:0; padding:3px 4px; }
      #levelBuilderOverlay .lb-horde-footer input[type=checkbox] { width:auto; margin:0; }
      /* Column context menu */
      #levelBuilderOverlay .lb-col-menu {
        position:absolute; top:100%; right:0; z-index:20;
        background:rgba(18,28,44,0.98);
        border:1px solid rgba(120,170,220,0.4);
        border-radius:6px; padding:4px 0; min-width:130px;
        box-shadow:0 4px 16px rgba(0,0,0,0.5); display:none;
      }
      #levelBuilderOverlay .lb-col-menu.open { display:block; }
      #levelBuilderOverlay .lb-col-menu-item {
        display:block; width:100%; text-align:left;
        background:none; border:none; color:#e8f4ff;
        padding:6px 14px; font-size:11px; cursor:pointer; font-weight:normal;
        border-radius:0;
      }
      #levelBuilderOverlay .lb-col-menu-item:hover { background:rgba(255,255,255,0.1); }
      #levelBuilderOverlay .lb-add-wave-col {
        min-width:48px; display:flex; align-items:center; justify-content:center;
        padding:0 8px;
      }
    </style>
    <div class="lb-shell">
      <div class="panel" id="lb-topPanel">
        <div class="lb-topbar">
          <div class="group">
            <label>Town</label>
            <select id="lb-town"></select>
            <label>Battle</label>
            <select id="lb-battle"></select>
            <label>Mission</label>
            <select id="lb-mission"></select>
          </div>
          <div class="group">
            <label><input type="checkbox" id="lb-showHidden"> Show hidden</label>
          </div>
          <div class="group">
            <button id="lb-copyBattle" class="secondary" type="button">Copy Battle</button>
            <button id="lb-copyMission" class="secondary" type="button">Copy Mission</button>
            <button id="lb-paste" class="secondary" type="button">Paste</button>
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
        <div class="scroll" id="lb-contentArea"></div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const els = {
    overlay,
    town:        overlay.querySelector("#lb-town"),
    battle:      overlay.querySelector("#lb-battle"),
    mission:     overlay.querySelector("#lb-mission"),
    content:     overlay.querySelector("#lb-contentArea"),
    load:        overlay.querySelector("#lb-load"),
    save:        overlay.querySelector("#lb-save"),
    saveAs:      overlay.querySelector("#lb-saveAs"),
    status:      overlay.querySelector("#lb-status"),
    close:       overlay.querySelector("#lb-close"),
    copyBattle:  overlay.querySelector("#lb-copyBattle"),
    copyMission: overlay.querySelector("#lb-copyMission"),
    paste:       overlay.querySelector("#lb-paste"),
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
    populateSelect(els.town,    s.towns           || 13);
    populateSelect(els.battle,  s.battlesPerTown  || 3);
    populateSelect(els.mission, s.missionsPerBattle || 3);
    els.town.value    = String(state.scope.town);
    els.battle.value  = String(state.scope.battle);
    els.mission.value = String(state.scope.mission);
  }

  // Render the full column-based mission view.
  function renderMissionView() {
    updateScopeFromSelects();
    const { missionObj } = getOrCreateMission();
    const catalog = (window.BattlechurchEnemyCatalog && window.BattlechurchEnemyCatalog.catalog) || {};
    const enemyKeys = Object.keys(catalog);
    const hiddenSet = new Set(state.config.globals.hiddenEnemies || []);
    const visibleKeys = enemyKeys.filter((k) => !hiddenSet.has(k) || state.showHidden);

    // Close any open column menus on outside click.
    const closeMenus = () => {
      els.content.querySelectorAll(".lb-col-menu.open").forEach((m) => m.classList.remove("open"));
    };

    const waves = Array.isArray(missionObj.waves) ? missionObj.waves : [];
    const container = document.createElement("div");
    container.className = "lb-mission-cols";

    // ── Sticky left label column ──────────────────────────────────────────────
    const labelCol = document.createElement("div");
    labelCol.className = "lb-label-col";
    labelCol.innerHTML = `<div class="lb-label-header">Enemy</div>`;
    visibleKeys.forEach((key) => {
      const row = document.createElement("div");
      row.className = "lb-label-row";
      const isHidden = hiddenSet.has(key);
      row.innerHTML = `
        <div style="width:${THUMB_SIZE}px;height:${THUMB_SIZE}px;overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:4px;">
          <canvas class="enemy-thumb" data-thumb-key="${key}" width="${THUMB_SIZE}" height="${THUMB_SIZE}" style="width:${THUMB_SIZE}px;height:${THUMB_SIZE}px;"></canvas>
        </div>
        <span style="font-size:10px;flex:1;opacity:${isHidden ? "0.45" : "1"};">${key}</span>
        <button data-hide-key="${key}" title="${isHidden ? "Show" : "Hide"}" style="font-size:9px;padding:1px 4px;opacity:0.6;flex-shrink:0;">${isHidden ? "👁" : "—"}</button>
      `;
      const hideBtn = row.querySelector(`[data-hide-key="${key}"]`);
      if (hideBtn) {
        hideBtn.addEventListener("click", () => {
          toggleHiddenEnemy(key);
          renderMissionView();
        });
      }
      labelCol.appendChild(row);
    });
    // Footer rows for duration / allKill labels
    const footerSpacer = document.createElement("div");
    footerSpacer.style.cssText = "padding:6px 8px;font-size:10px;color:rgba(255,255,255,0.5);border-top:1px solid rgba(120,170,220,0.2);";
    footerSpacer.innerHTML = `<div style="height:24px;line-height:24px;">Duration (s)</div><div style="height:24px;line-height:24px;">All Kill</div>`;
    labelCol.appendChild(footerSpacer);
    container.appendChild(labelCol);

    // ── Wave + horde columns ─────────────────────────────────────────────────
    waves.forEach((wave, wIdx) => {
      // Wave header column
      const waveCol = document.createElement("div");
      waveCol.className = "lb-wave-col";
      const waveHeader = document.createElement("div");
      waveHeader.className = "lb-wave-header";
      waveHeader.style.cssText = "display:flex;align-items:center;justify-content:space-between;position:relative;";
      const waveTitleSpan = document.createElement("span");
      waveTitleSpan.textContent = `Wave ${wIdx + 1}`;
      waveHeader.appendChild(waveTitleSpan);
      const waveMenuBtn = document.createElement("button");
      waveMenuBtn.className = "lb-col-menu-btn";
      waveMenuBtn.textContent = "▾";
      const waveMenu = document.createElement("div");
      waveMenu.className = "lb-col-menu";
      waveMenu.style.cssText = "min-width:150px;";
      // Disabled states for boundary-shift actions
      const canShiftLeft  = wIdx > 0 && wave.hordes.length > 0;
      const canShiftRight = wIdx > 0 && waves[wIdx - 1].hordes.length > 0;
      waveMenu.innerHTML = `
        <button class="lb-col-menu-item" data-action="insert-before">Insert Wave Before</button>
        <button class="lb-col-menu-item" data-action="insert-after">Insert Wave After</button>
        <button class="lb-col-menu-item" data-action="move-left"${!canShiftLeft ? " disabled" : ""}>← Shift Break Left</button>
        <button class="lb-col-menu-item" data-action="move-right"${!canShiftRight ? " disabled" : ""}>Shift Break Right →</button>
        <button class="lb-col-menu-item danger" data-action="delete-wave">Remove Wave Break</button>
      `;
      waveMenuBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        closeMenus();
        waveMenu.classList.toggle("open");
      });
      waveMenu.querySelectorAll(".lb-col-menu-item").forEach((item) => {
        item.addEventListener("click", (e) => {
          e.stopPropagation();
          if (item.hasAttribute("disabled")) return;
          waveMenu.classList.remove("open");
          const action = item.getAttribute("data-action");
          if (action === "insert-before") {
            // Empty wave break — no default hordes, just a separator with text/duration
            missionObj.waves.splice(wIdx, 0, { index: 0, introText: "", breakerDuration: 3, hordes: [] });
            missionObj.waves.forEach((w, i) => { w.index = i + 1; });
            saveToStorage(state.config); renderMissionView();
          } else if (action === "insert-after") {
            missionObj.waves.splice(wIdx + 1, 0, { index: 0, introText: "", breakerDuration: 3, hordes: [] });
            missionObj.waves.forEach((w, i) => { w.index = i + 1; });
            saveToStorage(state.config); renderMissionView();
          } else if (action === "move-left" && canShiftLeft) {
            // Shift the break left: move the first horde of this wave to the end of the previous wave
            const movedHorde = missionObj.waves[wIdx].hordes.shift();
            missionObj.waves[wIdx - 1].hordes.push(movedHorde);
            missionObj.waves[wIdx - 1].hordes.forEach((h, i) => { h.index = i + 1; });
            missionObj.waves[wIdx].hordes.forEach((h, i) => { h.index = i + 1; });
            saveToStorage(state.config); renderMissionView();
          } else if (action === "move-right" && canShiftRight) {
            // Shift the break right: move the last horde of the previous wave to the start of this wave
            const movedHorde = missionObj.waves[wIdx - 1].hordes.pop();
            missionObj.waves[wIdx].hordes.unshift(movedHorde);
            missionObj.waves[wIdx - 1].hordes.forEach((h, i) => { h.index = i + 1; });
            missionObj.waves[wIdx].hordes.forEach((h, i) => { h.index = i + 1; });
            saveToStorage(state.config); renderMissionView();
          } else if (action === "delete-wave") {
            // Merge this wave's hordes into adjacent wave, preserve the hordes
            if (wIdx > 0) {
              missionObj.waves[wIdx - 1].hordes.push(...missionObj.waves[wIdx].hordes);
              missionObj.waves[wIdx - 1].hordes.forEach((h, i) => { h.index = i + 1; });
            } else if (missionObj.waves.length > 1) {
              missionObj.waves[1].hordes.unshift(...missionObj.waves[0].hordes);
              missionObj.waves[1].hordes.forEach((h, i) => { h.index = i + 1; });
            }
            missionObj.waves.splice(wIdx, 1);
            missionObj.waves.forEach((w, i) => { w.index = i + 1; });
            saveToStorage(state.config); renderMissionView();
          }
        });
      });
      waveHeader.appendChild(waveMenuBtn);
      waveHeader.appendChild(waveMenu);
      waveCol.appendChild(waveHeader);

      const waveBody = document.createElement("div");
      waveBody.className = "lb-wave-body";
      // Enemy rows spacer
      visibleKeys.forEach(() => {
        const spacer = document.createElement("div");
        spacer.style.cssText = "height:32px;border-bottom:1px solid rgba(120,170,220,0.1);";
        waveBody.appendChild(spacer);
      });
      // Intro text
      const introLabel = document.createElement("label");
      introLabel.textContent = "Intro text";
      const introTA = document.createElement("textarea");
      introTA.value = wave.introText || "";
      introTA.addEventListener("change", () => {
        wave.introText = introTA.value;
        saveToStorage(state.config);
      });
      // Breaker duration
      const breakerLabel = document.createElement("label");
      breakerLabel.textContent = "Breaker (s)";
      const breakerInput = document.createElement("input");
      breakerInput.type = "number"; breakerInput.min = "0"; breakerInput.step = "0.5";
      breakerInput.value = String(wave.breakerDuration ?? 3);
      breakerInput.addEventListener("change", () => {
        wave.breakerDuration = Math.max(0, Number(breakerInput.value) || 0);
        saveToStorage(state.config);
      });
      waveBody.appendChild(introLabel);
      waveBody.appendChild(introTA);
      waveBody.appendChild(breakerLabel);
      waveBody.appendChild(breakerInput);
      waveCol.appendChild(waveBody);

      const waveFooter = document.createElement("div");
      waveFooter.className = "lb-wave-footer";
      const addHordeBtn = document.createElement("button");
      addHordeBtn.className = "secondary";
      addHordeBtn.style.cssText = "padding:3px 6px;font-size:10px;width:100%;";
      addHordeBtn.textContent = "+ Horde";
      addHordeBtn.addEventListener("click", () => {
        const newIdx = wave.hordes.length + 1;
        wave.hordes.push(makeDefaultHorde(newIdx));
        saveToStorage(state.config);
        renderMissionView();
      });
      waveFooter.appendChild(addHordeBtn);
      waveCol.appendChild(waveFooter);
      container.appendChild(waveCol);

      // Horde columns within this wave
      const hordes = Array.isArray(wave.hordes) ? wave.hordes : [];
      hordes.forEach((horde, hIdx) => {
        const hordeCol = document.createElement("div");
        hordeCol.className = "lb-horde-col";

        // Header with dropdown menu
        const hordeHeader = document.createElement("div");
        hordeHeader.className = "lb-horde-header";
        hordeHeader.style.position = "relative";
        hordeHeader.innerHTML = `<span style="font-size:11px;font-weight:700;">H${hIdx + 1}</span>`;
        const menuBtn = document.createElement("button");
        menuBtn.className = "lb-col-menu-btn";
        menuBtn.textContent = "▾";
        const menu = document.createElement("div");
        menu.className = "lb-col-menu";
        menu.innerHTML = `
          <button class="lb-col-menu-item" data-action="copy">Copy</button>
          <button class="lb-col-menu-item" data-action="paste">Paste</button>
          <button class="lb-col-menu-item" data-action="insert-before">Insert Before</button>
          <button class="lb-col-menu-item" data-action="insert-after">Insert After</button>
          <button class="lb-col-menu-item" data-action="split-wave"${hIdx === 0 ? " disabled" : ""}>Split Wave Here</button>
          <button class="lb-col-menu-item danger" data-action="delete">Delete</button>
        `;
        menuBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          closeMenus();
          menu.classList.toggle("open");
        });
        menu.querySelectorAll(".lb-col-menu-item").forEach((item) => {
          item.addEventListener("click", (e) => {
            e.stopPropagation();
            menu.classList.remove("open");
            const action = item.getAttribute("data-action");
            if (action === "copy") {
              state.clipboard = { type: "horde", data: deepClone(horde) };
              setStatus("Horde copied");
            } else if (action === "paste") {
              if (state.clipboard?.type === "horde") {
                const pasted = deepClone(state.clipboard.data);
                pasted.index = horde.index;
                wave.hordes[hIdx] = pasted;
                saveToStorage(state.config); renderMissionView();
              }
            } else if (action === "insert-before") {
              wave.hordes.splice(hIdx, 0, makeDefaultHorde(0));
              wave.hordes.forEach((h, i) => { h.index = i + 1; });
              saveToStorage(state.config); renderMissionView();
            } else if (action === "insert-after") {
              wave.hordes.splice(hIdx + 1, 0, makeDefaultHorde(0));
              wave.hordes.forEach((h, i) => { h.index = i + 1; });
              saveToStorage(state.config); renderMissionView();
            } else if (action === "split-wave" && hIdx > 0) {
              // Pull hordes from this position onward into a new wave
              const splitHordes = wave.hordes.splice(hIdx);
              splitHordes.forEach((h, i) => { h.index = i + 1; });
              const newWave = makeDefaultWave(0);
              newWave.hordes = splitHordes;
              missionObj.waves.splice(wIdx + 1, 0, newWave);
              missionObj.waves.forEach((w, i) => { w.index = i + 1; });
              saveToStorage(state.config); renderMissionView();
            } else if (action === "delete") {
              wave.hordes.splice(hIdx, 1);
              wave.hordes.forEach((h, i) => { h.index = i + 1; });
              saveToStorage(state.config); renderMissionView();
            }
          });
        });
        hordeHeader.appendChild(menuBtn);
        hordeHeader.appendChild(menu);
        hordeCol.appendChild(hordeHeader);

        // Enemy count rows
        visibleKeys.forEach((key) => {
          const cellRow = document.createElement("div");
          cellRow.className = "lb-horde-cell-row";
          const entries = Array.isArray(horde.entries) ? horde.entries : [];
          const match = entries.find((e) => e && e.enemy === key);
          const countVal = match ? Number(match.count) || 0 : 0;
          const input = document.createElement("input");
          input.className = "lb-horde-input";
          input.type = "number"; input.min = "0"; input.value = String(countVal);
          input.addEventListener("change", () => {
            const val = Math.max(0, Number(input.value) || 0);
            horde.entries = Array.isArray(horde.entries) ? horde.entries : [];
            const idx = horde.entries.findIndex((e) => e && e.enemy === key);
            if (val > 0) {
              if (idx >= 0) horde.entries[idx].count = val;
              else horde.entries.push({ enemy: key, count: val });
            } else if (idx >= 0) {
              horde.entries.splice(idx, 1);
            }
            saveToStorage(state.config);
          });
          cellRow.appendChild(input);
          hordeCol.appendChild(cellRow);
        });

        // Footer: duration + allKill
        const footer = document.createElement("div");
        footer.className = "lb-horde-footer";
        const durInput = document.createElement("input");
        durInput.type = "number"; durInput.min = "1"; durInput.step = "1";
        durInput.value = String(horde.duration || state.config.structure.defaultHordeDuration || 4);
        durInput.addEventListener("change", () => {
          horde.duration = Math.max(1, Number(durInput.value) || 1);
          saveToStorage(state.config);
        });
        const akLabel = document.createElement("label");
        const akBox = document.createElement("input");
        akBox.type = "checkbox"; akBox.checked = !!horde.allKill;
        akBox.addEventListener("change", () => {
          horde.allKill = akBox.checked;
          saveToStorage(state.config);
        });
        akLabel.appendChild(akBox);
        akLabel.appendChild(document.createTextNode(" ☠"));
        footer.appendChild(durInput);
        footer.appendChild(akLabel);
        hordeCol.appendChild(footer);
        container.appendChild(hordeCol);
      });
    });

    // ── Add Wave button column ────────────────────────────────────────────────
    const addWaveCol = document.createElement("div");
    addWaveCol.className = "lb-add-wave-col";
    const addWaveBtn = document.createElement("button");
    addWaveBtn.className = "secondary";
    addWaveBtn.style.cssText = "writing-mode:vertical-rl;padding:8px 4px;font-size:11px;";
    addWaveBtn.textContent = "+ Wave";
    addWaveBtn.addEventListener("click", () => {
      missionObj.waves.push(makeDefaultWave(missionObj.waves.length + 1));
      saveToStorage(state.config);
      renderMissionView();
    });
    addWaveCol.appendChild(addWaveBtn);
    container.appendChild(addWaveCol);

    els.content.innerHTML = "";
    els.content.appendChild(container);
    document.addEventListener("click", closeMenus, { once: true });
    initThumbAnimations();
  }

  function inferFrameSizeForManifestEntry(entry, image, key) {
    if (!entry || !image) return { frameWidth: 0, frameHeight: 0 };
    const overrideFrames = getOverrideFramesForKey(key);
    const useOverrideSizing = Array.isArray(overrideFrames) && overrideFrames.length > 0;
    const fallbackClip = {
      image,
      frameWidth: useOverrideSizing ? 0 : entry.frameWidth || 0,
      frameHeight: useOverrideSizing ? 0 : entry.frameHeight || 0,
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
    const manualGridOverrides =
      (typeof window !== "undefined" && window.__BATTLECHURCH_MANUAL_GRIDS) || {};
    const manualOverrides = {
      "minifireimp.png": { cols: 2, rows: 2 },
      "minihighdemon.png": { cols: 2, rows: 2 },
      "minidemonlord.png": { cols: 2, rows: 2 },
      "minidemonfirekeeper.png": { cols: 1, rows: 1 },
      "miniskeleton.png": { cols: 1, rows: 1 },
      "minizombie.png": { cols: 1, rows: 1 },
      "minizombiebutcher.png": { cols: 4, rows: 4 },
    };
    const override = manualGridOverrides[normalizedSrc] || manualOverrides[normalizedSrc];
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

  function getManifestClipData(key) {
    const manifestEntry =
      (window.ASSET_MANIFEST && window.ASSET_MANIFEST.enemies && window.ASSET_MANIFEST.enemies[key]) ||
      null;
    const prefersWalk = WALK_FIRST_KEYS.has(key);
    const entry = prefersWalk
      ? manifestEntry?.walk || manifestEntry?.idle || null
      : manifestEntry?.idle || manifestEntry?.walk || null;
    if (!entry?.src) return null;
    let img = manifestThumbImages.get(entry.src);
    if (!img) {
      img = new Image();
      img.src = entry.src;
      manifestThumbImages.set(entry.src, img);
    }
    if (!ensureThumbImageReady(img)) return null;
    const inferred = inferFrameSizeForManifestEntry(entry, img, key);
    const frameWidth = inferred.frameWidth || entry.frameWidth || 100;
    const frameHeight = inferred.frameHeight || entry.frameHeight || 100;
    const overrideMap = (window.__BATTLECHURCH_OVERRIDES && window.__BATTLECHURCH_OVERRIDES[key]) || {};
    const stateOverride = prefersWalk
      ? overrideMap.walk || overrideMap.idle || {}
      : overrideMap.idle || overrideMap.walk || {};
    const frameMap =
      (Array.isArray(stateOverride.frames) && stateOverride.frames.length ? stateOverride.frames : null);
    const cols = Math.max(1, Math.floor(img.width / Math.max(1, frameWidth)));
    const rows = Math.max(1, Math.floor(img.height / Math.max(1, frameHeight)));
    const frameCount = frameMap ? frameMap.length : Math.max(1, entry.frameCount || cols * rows);
    const frameRate = Number.isFinite(entry.frameRate) && entry.frameRate > 0 ? entry.frameRate : 6;
    const renderScale =
      Number.isFinite(entry.renderScale) && entry.renderScale > 0 ? entry.renderScale : 1;
    return {
      clip: { image: img, frameWidth, frameHeight, frameRate, renderScale },
      frameMap,
      frameWidth,
      frameHeight,
      frameCount,
      frameRate,
      cols,
      renderScale,
    };
  }

  function getThumbClipData(key) {
    const assets = window.assets || {};
    const enemyAssets = assets.enemies?.[key];
    const prefersWalk = WALK_FIRST_KEYS.has(key);
    const clip = prefersWalk ? enemyAssets?.walk || enemyAssets?.idle : enemyAssets?.idle || enemyAssets?.walk;
    if (!clip || !clip.image) {
      return getManifestClipData(key);
    }
    if (!ensureThumbImageReady(clip.image)) {
      return getManifestClipData(key);
    }
    const inferredSize = inferFrameSizeForClip(clip, key);
    const frameWidth = inferredSize.frameWidth || clip.frameWidth || clip.image.width;
    const frameHeight = inferredSize.frameHeight || clip.frameHeight || clip.image.height;
    const overrideMap = (window.__BATTLECHURCH_OVERRIDES && window.__BATTLECHURCH_OVERRIDES[key]) || {};
    const stateOverride = prefersWalk
      ? overrideMap.walk || overrideMap.idle || {}
      : (enemyAssets?.idle && overrideMap.idle) || overrideMap.idle || overrideMap.walk || {};
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
      if (!data) return;
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
    if (!ENABLE_FILE_SYNC) return null;
    try {
      const res = await fetch(SYNC_ENDPOINT, { method: "GET" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = await res.json();
      const cfg =
        (payload && payload.config) ||
        (payload && payload.data && payload.data.devLevelConfig);
      if (cfg && typeof cfg === "object") return normalizeConfig(cfg);
    } catch (err) {}
    return null;
  }

  async function saveConfigToServer(cfg) {
    if (!ENABLE_FILE_SYNC) return false;
    try {
      const res = await fetch(SYNC_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: cfg }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return true;
    } catch (err) {}
    return false;
  }

  async function syncFromServer(options = {}) {
    const { showStatus = false } = options;
    if (!ENABLE_FILE_SYNC) {
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
    initScopeSelectors();
    renderMissionView();
  }

  function attachEvents() {
    // Scope dropdowns
    ["town", "battle", "mission"].forEach((key) => {
      els[key].addEventListener("change", () => {
        updateScopeFromSelects();
        refreshUI();
      });
    });

    // Show Hidden checkbox
    const showHiddenCheckbox = overlay.querySelector("#lb-showHidden");
    if (showHiddenCheckbox) {
      showHiddenCheckbox.addEventListener("change", () => {
        state.showHidden = showHiddenCheckbox.checked;
        renderMissionView();
      });
    }

    // Copy Battle
    if (els.copyBattle) {
      els.copyBattle.addEventListener("click", () => {
        const { town: townIdx, battle: battleIdx } = state.scope;
        const townObj = ensureTown(townIdx);
        const battleObj = ensureBattle(townObj, battleIdx);
        state.clipboard = { type: "battle", data: JSON.parse(JSON.stringify(battleObj)) };
        setStatus(`Copied Battle ${battleIdx}`);
      });
    }

    // Copy Mission
    if (els.copyMission) {
      els.copyMission.addEventListener("click", () => {
        const { missionObj } = getOrCreateMission();
        state.clipboard = { type: "mission", data: JSON.parse(JSON.stringify(missionObj)) };
        const { battle: battleIdx, mission: missionIdx } = state.scope;
        setStatus(`Copied Battle ${battleIdx} Mission ${missionIdx}`);
      });
    }

    // Paste
    if (els.paste) {
      els.paste.addEventListener("click", () => {
        if (!state.clipboard) { setStatus("Nothing to paste", true); return; }
        const { town: townIdx, battle: battleIdx, mission: missionIdx } = state.scope;
        const townObj = ensureTown(townIdx);
        if (state.clipboard.type === "battle") {
          const pasted = JSON.parse(JSON.stringify(state.clipboard.data));
          pasted.index = battleIdx;
          const bList = townObj.battles;
          const existingIdx = bList.findIndex((b) => b.index === battleIdx);
          if (existingIdx >= 0) bList[existingIdx] = pasted;
          else bList.push(pasted);
          saveToStorage(state.config);
          refreshUI();
          setStatus(`Pasted battle into Town ${townIdx} Battle ${battleIdx}`);
        } else if (state.clipboard.type === "mission") {
          const battleObj = ensureBattle(townObj, battleIdx);
          const pasted = JSON.parse(JSON.stringify(state.clipboard.data));
          pasted.index = missionIdx;
          const mList = battleObj.missions;
          const existingIdx = mList.findIndex((m) => m.index === missionIdx);
          if (existingIdx >= 0) mList[existingIdx] = pasted;
          else mList.push(pasted);
          saveToStorage(state.config);
          refreshUI();
          setStatus(`Pasted mission into Town ${townIdx} Battle ${battleIdx} Mission ${missionIdx}`);
        } else if (state.clipboard.type === "horde" || state.clipboard.type === "wave") {
          setStatus("Use the column ▾ menu to paste hordes/waves", true);
        }
      });
    }

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
    if (
      e.key &&
      e.key.toLowerCase() === "l" &&
      e.shiftKey &&
      e.ctrlKey &&
      !overlay.contains(document.activeElement)
    ) {
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
