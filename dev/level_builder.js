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
      towns: 10,
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
    // Pad to 10 towns.
    while (towns.length < 10) {
      towns.push({ index: towns.length + 1, battles: [] });
    }
    const oldStruct = cfg.structure || {};
    return {
      meta: { version: 2 },
      structure: {
        towns: 10,
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
    const targetTowns = merged.structure.towns || 10;
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
      clearUndoHistory();
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
    updateUndoButtonState();
  }

  const state = {
    config: loadFromStorage(),
    scope: { town: 1, battle: 1, mission: 1 },
    mode: "explicit",
    clipboard: null, // { type: 'horde'|'wave'|'mission'|'battle', data: deepClone }
    enemyFilter: "all",
    undoStack: [],
  };
  const MAX_UNDO_STEPS = 50;
  const HIDDEN_ENEMY_FILTER_TAGS = new Set([
    "all",
    "closestAny",
    "preferEdges",
    "npcPriority",
  ]);

  // Classify enemies into filter tags based on catalog properties.
  function getEnemyType(key, catalog) {
    const def = catalog[key];
    if (!def) return "normal";
    if (def.damageClass === "armored") return "armored";
    if (def.damageClass === "tank") return "tank";
    return "normal";
  }

  function getEnemyFilterTags(key, catalog) {
    const def = catalog[key] || {};
    const tags = new Set();
    tags.add("all");
    tags.add(getEnemyType(key, catalog));
    if (def.ranged === true) tags.add("ranged");
    const behaviors = Array.isArray(def.specialBehavior) ? def.specialBehavior : [];
    behaviors.forEach((tag) => {
      if (!tag) return;
      const normalized = String(tag).trim();
      if (!normalized || ["popcorn", "elite", "axe"].includes(normalized)) return;
      // Legacy behavior tag: route "heavy" to modern tank classification.
      if (normalized.toLowerCase() === "heavy") {
        tags.add("tank");
        return;
      }
      // Legacy behavior tag: route "projectile" to the unified ranged category.
      if (normalized.toLowerCase() === "projectile") {
        tags.add("ranged");
        return;
      }
      tags.add(normalized);
    });
    return tags;
  }

  function formatEnemyFilterLabel(tag) {
    if (tag === "all") return "All";
    if (tag === "npcPriority") return "NPC Priority";
    return String(tag || "")
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (s) => s.toUpperCase())
      .trim();
  }

  function buildEnemyFilterOptions(catalog) {
    const baseOrder = ["all", "normal", "tank", "armored", "ranged"];
    const options = [];
    const seen = new Set();
    baseOrder.forEach((tag) => {
      seen.add(tag);
      options.push(tag);
    });
    Object.keys(catalog || {}).forEach((key) => {
      getEnemyFilterTags(key, catalog).forEach((tag) => {
        if (!seen.has(tag) && !HIDDEN_ENEMY_FILTER_TAGS.has(tag)) {
          seen.add(tag);
          options.push(tag);
        }
      });
    });
    return options;
  }

  function formatEnemyLabel(key, catalog) {
    const displayName = String(catalog?.[key]?.displayName || "").trim();
    if (displayName) return displayName;
    const base = String(key || "")
      .replace(/^mini(?=[A-Z])/, "")
      .replace(/([A-Z])/g, " $1")
      .trim();
    return base || String(key || "");
  }

  function isBossEnemy(key, catalog) {
    const def = catalog?.[key] || {};
    const tier = Number(def.bossTier) || 0;
    if (tier > 0) return true;
    const behaviors = Array.isArray(def.specialBehavior) ? def.specialBehavior : [];
    return behaviors.includes("boss");
  }

  function hasBossPrefix(key) {
    return /^boss/i.test(String(key || ""));
  }

  function isEditorHiddenEnemy(key) {
    const normalized = String(key || "").trim();
    if (!normalized) return false;
    if (hasBossPrefix(normalized)) return true;
    return normalized === "tormentorFlame";
  }

  function compareEnemyKeys(a, b, catalog) {
    if (a === b) return 0;
    if (a === "miniImp") return -1;
    if (b === "miniImp") return 1;

    const aIsMiniImpVariant = /^miniimp/i.test(String(a || ""));
    const bIsMiniImpVariant = /^miniimp/i.test(String(b || ""));
    if (aIsMiniImpVariant !== bIsMiniImpVariant) return aIsMiniImpVariant ? -1 : 1;

    const aType = getEnemyType(a, catalog);
    const bType = getEnemyType(b, catalog);
    if (aType !== bType) {
      if (aType === "normal") return -1;
      if (bType === "normal") return 1;
    }

    const aIsBoss = isBossEnemy(a, catalog);
    const bIsBoss = isBossEnemy(b, catalog);
    if (aIsBoss !== bIsBoss) return aIsBoss ? 1 : -1;

    const aLabel = formatEnemyLabel(a, catalog).toLowerCase();
    const bLabel = formatEnemyLabel(b, catalog).toLowerCase();
    if (aLabel < bLabel) return -1;
    if (aLabel > bLabel) return 1;
    return String(a).localeCompare(String(b));
  }

  const THUMB_SIZE = 26;
  const ASSUMED_UPGRADE_MAX_LEVEL = 10;
  const thumbAnimState = { items: [], rafId: null, lastTime: 0 };
  const manifestThumbImages = new Map();
  const thumbImageListeners = new WeakSet();
  const spriteBoundsCache = new Map();
  const DEFAULT_HORDE_DURATION = 10;
  const bindings = {
    getAssets: () => null,
  };

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
      entries: [{ enemy: "miniImp", count: 1 }],
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
    const count = hordesPerWave || 1;
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
        assumedChurchPowerupLevels: {},
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

  function clearEnemyFromMission(missionObj, enemyKey) {
    const waves = Array.isArray(missionObj?.waves) ? missionObj.waves : [];
    waves.forEach((wave) => {
      const hordes = Array.isArray(wave?.hordes) ? wave.hordes : [];
      hordes.forEach((horde) => {
        if (!Array.isArray(horde?.entries)) return;
        horde.entries = horde.entries.filter((entry) => entry && entry.enemy !== enemyKey);
      });
    });
  }

  function getOrCreateMission() {
    const { town, battle, mission } = state.scope;
    const townObj    = ensureTown(town);
    const battleObj  = ensureBattle(townObj, battle);
    const missionObj = ensureMission(battleObj, mission);
    if (typeof missionObj.editorNotes !== "string") missionObj.editorNotes = "";
    return { townObj, battleObj, missionObj };
  }

  // UI scaffolding
  const overlay = document.createElement("div");
  overlay.id = "levelBuilderOverlay";
  overlay.innerHTML = `
    <style>
      #levelBuilderOverlay {
        --lb-shell-top: rgba(12, 18, 30, 0.95);
        --lb-shell-bottom: rgba(7, 10, 18, 0.95);
        --lb-shell-border: rgba(255, 218, 162, 0.34);
        --lb-divider: rgba(255, 214, 148, 0.22);
        --lb-title: #ffd978;
        --lb-body: #e8d2ae;
        --lb-hint: rgba(231, 176, 102, 0.82);
        --lb-button-bg: rgba(255, 154, 58, 0.16);
        --lb-button-border: rgba(255, 196, 98, 0.42);
        --lb-button-text: #f6e4c8;
        position: fixed; inset: 0;
        background: rgba(6, 10, 18, 0.9);
        color: var(--lb-body);
        font-family: var(--ui-font-family, "Orbitron"), sans-serif;
        z-index: 9999; display: none;
        padding: 16px; box-sizing: border-box;
      }
      #levelBuilderOverlay *, #levelBuilderOverlay *::before, #levelBuilderOverlay *::after {
        box-sizing: border-box;
      }
      #levelBuilderOverlay .lb-shell {
        display:flex;
        flex-direction:column;
        gap:12px;
        height:100%;
        max-width: 1380px;
        margin: 0 auto;
      }
      #levelBuilderOverlay .panel {
        background: linear-gradient(180deg, var(--lb-shell-top) 0%, var(--lb-shell-bottom) 100%);
        border: 2px solid var(--lb-shell-border);
        border-radius: 18px; padding: 10px;
        box-shadow: 0 10px 24px rgba(0, 0, 0, 0.45);
        overflow: hidden; display: flex; flex-direction: column;
      }
      #levelBuilderOverlay #lb-topPanel {
        overflow: visible;
        position: relative;
        z-index: 30;
      }
      #levelBuilderOverlay h3 { margin:0 0 8px 0; font-size:15px; letter-spacing:0.3px; color: var(--lb-title); }
      #levelBuilderOverlay label { font-size:12px; opacity:0.9; color: var(--lb-body); }
      #levelBuilderOverlay input, #levelBuilderOverlay select, #levelBuilderOverlay textarea {
        width:100%; padding:6px 8px; margin:4px 0 10px 0;
        border-radius:8px;
        border:1px solid var(--lb-shell-border);
        background: rgba(23, 16, 10, 0.58);
        color: #f3e2c1;
      }
      #levelBuilderOverlay .lb-topbar { display:flex; flex-wrap:nowrap; gap:12px; align-items:flex-end; }
      #levelBuilderOverlay .lb-topbar .group { display:flex; gap:8px; align-items:flex-end; }
      #levelBuilderOverlay .lb-topbar label { margin:0 6px 0 0; }
      #levelBuilderOverlay .lb-topbar select, #levelBuilderOverlay .lb-topbar input
        { width:auto; min-width:72px; margin:0; }
      #levelBuilderOverlay .lb-topbar--secondary { margin-top:8px; }
      #levelBuilderOverlay .lb-topbar--secondary .group { align-items:center; width:100%; }
      #levelBuilderOverlay .lb-upgrades-label {
        font-size:11px;
        color: var(--lb-title);
        white-space: nowrap;
        margin-right: 2px;
      }
      #levelBuilderOverlay .lb-upgrade-grid {
        display:flex;
        align-items:center;
        gap:6px;
        overflow-x:auto;
        padding-bottom:2px;
        flex:1;
        min-height:30px;
      }
      #levelBuilderOverlay .lb-upgrade-pill {
        display:inline-flex;
        align-items:center;
        gap:5px;
        background:rgba(255, 188, 102, 0.1);
        border:1px solid rgba(255, 206, 135, 0.34);
        border-radius:999px;
        padding:4px 7px;
        white-space:nowrap;
      }
      #levelBuilderOverlay .lb-upgrade-pill span {
        font-size:10px;
        color:#ffe6b6;
      }
      #levelBuilderOverlay .lb-upgrade-pill input[type=number] {
        width:44px;
        min-width:44px;
        padding:2px 4px;
        margin:0;
        font-size:11px;
        text-align:center;
      }
      #levelBuilderOverlay button {
        background: var(--lb-button-bg);
        color: var(--lb-button-text);
        border:1px solid var(--lb-button-border);
        padding:8px 12px; border-radius:6px; cursor:pointer; font-weight:600;
      }
      #levelBuilderOverlay button.secondary { background:rgba(255, 222, 163, 0.1); }
      #levelBuilderOverlay button.danger { background:rgba(200,50,50,0.7); }
      #levelBuilderOverlay button:hover { background: rgba(255, 172, 78, 0.24); }
      #levelBuilderOverlay button:disabled {
        opacity:0.45; cursor:not-allowed;
      }
      #levelBuilderOverlay .scroll { overflow:auto; flex:1; }
      /* Mission column layout */
      #levelBuilderOverlay .lb-mission-cols { display:flex; gap:0; width:max-content; }
      #levelBuilderOverlay .lb-label-col {
        position:sticky; left:0; z-index:5;
        background:rgba(12, 18, 30, 0.98);
        display:flex; flex-direction:column;
        width:max-content; min-width:0;
        border-right:1px solid var(--lb-divider);
      }
      #levelBuilderOverlay .lb-label-col .lb-label-header {
        height:64px; display:flex; align-items:center;
        padding:0 8px; font-size:11px; font-weight:700;
        border-bottom:1px solid var(--lb-divider);
        background:rgba(12, 18, 30, 0.98);
      }
      #levelBuilderOverlay .lb-label-row {
        display:flex; align-items:center; gap:6px;
        height:32px; padding:0 6px;
        border-bottom:1px solid rgba(255, 214, 148, 0.1); font-size:11px;
      }
      #levelBuilderOverlay .lb-label-row canvas { flex-shrink:0; }
      #levelBuilderOverlay .lb-wave-col {
        min-width:64px; max-width:64px;
        background:rgba(255, 176, 86, 0.08);
        border-right:2px solid rgba(255, 214, 148, 0.26);
        display:flex; flex-direction:column;
      }
      #levelBuilderOverlay .lb-wave-header {
        height:64px; display:flex; align-items:center; justify-content:center;
        padding:0 6px; font-size:11px; font-weight:700;
        color:var(--lb-title);
        border-bottom:1px solid var(--lb-divider);
        background:rgba(255, 176, 86, 0.12);
      }
      #levelBuilderOverlay .lb-wave-menu-btn {
        width:58px;
        background:rgba(255,255,255,0.1);
        border:1px solid rgba(255,255,255,0.22);
        color:#f3e2c1;
        border-radius:4px;
        padding:3px 4px;
        font-size:10px;
        font-weight:700;
        cursor:pointer;
      }
      #levelBuilderOverlay .lb-wave-menu-btn:hover {
        background:rgba(255,255,255,0.16);
      }
      #levelBuilderOverlay .lb-wave-body { padding:0; flex:1; display:flex; flex-direction:column; }
      #levelBuilderOverlay .lb-col-menu-field {
        display:flex; align-items:center; justify-content:space-between; gap:8px;
        padding:6px 14px 4px 14px; font-size:11px; color:#cfe6ff;
      }
      #levelBuilderOverlay .lb-col-menu-field input[type=number] {
        width:64px; margin:0; padding:3px 5px;
      }
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
        display:flex; flex-direction:column; font-size:10px;
        border-bottom:1px solid rgba(120,170,220,0.1);
      }
      #levelBuilderOverlay .lb-horde-footer-row {
        height:32px; display:flex; align-items:center; justify-content:center;
        border-bottom:1px solid rgba(120,170,220,0.1);
        padding:0 4px;
      }
      #levelBuilderOverlay .lb-horde-footer-row:last-child { border-bottom:none; }
      #levelBuilderOverlay .lb-horde-footer label { display:flex; align-items:center; gap:4px; margin:0; }
      #levelBuilderOverlay .lb-horde-footer input[type=number] { width:52px; margin:0; padding:3px 4px; }
      #levelBuilderOverlay .lb-horde-footer input[type=checkbox] { width:auto; margin:0; }
      /* Column context menu */
      #levelBuilderOverlay .lb-col-menu {
        position:absolute; top:100%; right:0; z-index:20;
        background:rgba(12, 18, 30, 0.98);
        border:1px solid var(--lb-shell-border);
        border-radius:6px; padding:4px 0; min-width:130px;
        box-shadow:0 4px 16px rgba(0,0,0,0.5); display:none;
      }
      #levelBuilderOverlay .lb-col-menu.open { display:block; }
      #levelBuilderOverlay .lb-col-menu-item {
        display:block; width:100%; text-align:left;
        background:none; border:none; color:#f3e2c1;
        padding:6px 14px; font-size:11px; cursor:pointer; font-weight:normal;
        border-radius:0;
      }
      #levelBuilderOverlay .lb-col-menu-item:hover { background:rgba(255, 172, 78, 0.2); }
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
            <label>Mission</label>
            <select id="lb-battle"></select>
            <label>Battle</label>
            <select id="lb-mission"></select>
          </div>
          <div class="group">
            <div id="lb-copyMenuWrap" style="position:relative;display:inline-block;">
              <button id="lb-copyMenuButton" class="secondary" type="button">Copy ▾</button>
              <div id="lb-copyMenu" class="lb-col-menu" style="top:calc(100% + 4px);left:0;right:auto;min-width:120px;">
                <button class="lb-col-menu-item" data-copy-type="town" type="button">Copy Town</button>
                <button class="lb-col-menu-item" data-copy-type="battle" type="button">Copy Mission</button>
                <button class="lb-col-menu-item" data-copy-type="mission" type="button">Copy Battle</button>
              </div>
            </div>
            <button id="lb-paste" class="secondary" type="button">Paste</button>
          </div>
          <div class="group">
            <button id="lb-undo" class="secondary" type="button" disabled>Undo</button>
            <button id="lb-playtest" type="button">Play Test</button>
            <button id="lb-close" class="secondary">Close (Esc)</button>
            <button id="lb-saveAs" type="button" class="secondary">Save As...</button>
          </div>
          <div class="group" style="align-items:center;gap:8px;margin-left:auto;min-width:0;flex:1;justify-content:flex-end;">
            <label for="lb-battleNotes" style="font-size:11px;white-space:nowrap;">Battle Notes</label>
            <input
              id="lb-battleNotes"
              type="text"
              placeholder="Notes for this battle (editor only)"
              style="min-width:120px;flex:1;max-width:420px;"
            >
          </div>
        </div>
        <div class="lb-topbar lb-topbar--secondary">
          <div class="group">
            <span class="lb-upgrades-label">Assumed Upgrades</span>
            <div id="lb-assumedUpgrades" class="lb-upgrade-grid"></div>
            <button id="lb-clearAssumedUpgrades" class="secondary" type="button">Reset Upgrades</button>
          </div>
        </div>
        <div id="lb-status" style="margin-top:8px;font-size:12px;color:var(--lb-hint);"></div>
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
    saveAs:      overlay.querySelector("#lb-saveAs"),
    undo:        overlay.querySelector("#lb-undo"),
    playtest:    overlay.querySelector("#lb-playtest"),
    battleNotes: overlay.querySelector("#lb-battleNotes"),
    assumedUpgrades: overlay.querySelector("#lb-assumedUpgrades"),
    clearAssumedUpgrades: overlay.querySelector("#lb-clearAssumedUpgrades"),
    status:      overlay.querySelector("#lb-status"),
    close:       overlay.querySelector("#lb-close"),
    copyMenuWrap: overlay.querySelector("#lb-copyMenuWrap"),
    copyMenuButton: overlay.querySelector("#lb-copyMenuButton"),
    copyMenu:    overlay.querySelector("#lb-copyMenu"),
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
    populateSelect(els.town,    s.towns           || 10);
    populateSelect(els.battle,  s.battlesPerTown  || 3);
    populateSelect(els.mission, s.missionsPerBattle || 3);
    els.town.value    = String(state.scope.town);
    els.battle.value  = String(state.scope.battle);
    els.mission.value = String(state.scope.mission);
  }

  function clearUndoHistory() {
    state.undoStack = [];
    updateUndoButtonState();
  }

  function updateUndoButtonState() {
    if (!els || !els.undo) return;
    els.undo.disabled = state.undoStack.length === 0;
    els.undo.title = state.undoStack.length ? "Undo last edit" : "Nothing to undo";
  }

  function updatePasteButtonState() {
    if (!els || !els.paste) return;
    const type = state.clipboard?.type;
    if (type === "town") {
      els.paste.textContent = "Paste Town";
      els.paste.title = "Paste copied town";
    } else if (type === "battle") {
      els.paste.textContent = "Paste Mission";
      els.paste.title = "Paste copied mission";
    } else if (type === "mission") {
      els.paste.textContent = "Paste Battle";
      els.paste.title = "Paste copied battle";
    } else {
      els.paste.textContent = "Paste";
      els.paste.title = "Paste";
    }
  }

  function pushUndoSnapshot() {
    state.undoStack.push(deepClone(state.config));
    if (state.undoStack.length > MAX_UNDO_STEPS) {
      state.undoStack.splice(0, state.undoStack.length - MAX_UNDO_STEPS);
    }
    updateUndoButtonState();
  }

  function undoLastEdit() {
    if (!state.undoStack.length) {
      setStatus("Nothing to undo", true);
      return false;
    }
    const previous = state.undoStack.pop();
    state.config = normalizeConfig(previous);
    saveToStorage(state.config);
    refreshUI();
    updateUndoButtonState();
    setStatus(`Undid last edit ${formatNow()}`);
    return true;
  }

  // Render the full column-based mission view.
  function renderMissionView() {
    updateScopeFromSelects();
    const { missionObj } = getOrCreateMission();
    if (els.battleNotes) {
      const notes = typeof missionObj.editorNotes === "string" ? missionObj.editorNotes : "";
      if (els.battleNotes !== document.activeElement) {
        els.battleNotes.value = notes;
      } else if (els.battleNotes.value !== notes) {
        missionObj.editorNotes = els.battleNotes.value;
      }
    }
    renderAssumedUpgradeInputs(missionObj);
    const catalog = (window.BattlechurchEnemyCatalog && window.BattlechurchEnemyCatalog.catalog) || {};
    const enemyKeys = Object.keys(catalog);
    const filterOptions = buildEnemyFilterOptions(catalog);
    if (!filterOptions.includes(state.enemyFilter)) state.enemyFilter = "all";
    const visibleKeys = enemyKeys.filter((key) => {
      if (isEditorHiddenEnemy(key)) return false;
      return getEnemyFilterTags(key, catalog).has(state.enemyFilter);
    }).sort((a, b) => compareEnemyKeys(a, b, catalog));

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
    const labelHeader = document.createElement("div");
    labelHeader.className = "lb-label-header";
    labelHeader.innerHTML = `<span>Enemy</span>
      <select class="lb-filter-select" style="font-size:10px;padding:1px 3px;margin-left:auto;"></select>`;
    const filterSelect = labelHeader.querySelector(".lb-filter-select");
    filterOptions.forEach((tag) => {
      const option = document.createElement("option");
      option.value = tag;
      option.textContent = formatEnemyFilterLabel(tag);
      option.selected = state.enemyFilter === tag;
      filterSelect.appendChild(option);
    });
    filterSelect.addEventListener("change", (e) => {
      state.enemyFilter = e.target.value;
      renderMissionView();
    });
    labelCol.appendChild(labelHeader);
    // Top-aligned settings labels for wave/horde controls
    const settingsSpacer = document.createElement("div");
    settingsSpacer.style.cssText =
      "font-size:10px;color:rgba(255,255,255,0.5);border-bottom:1px solid rgba(120,170,220,0.2);";
    settingsSpacer.innerHTML =
      `<div style="height:32px;line-height:32px;padding:0 8px;border-bottom:1px solid rgba(120,170,220,0.1);">Duration (s)</div><div style="height:32px;line-height:32px;padding:0 8px;">All Kill</div>`;
    labelCol.appendChild(settingsSpacer);
    const TYPE_COLORS = { normal: "#8cb4e0", tank: "#e0a040", armored: "#a0a0b0" };
    const enemyBattleTotals = {};
    waves.forEach((wave) => {
      const hordes = Array.isArray(wave?.hordes) ? wave.hordes : [];
      hordes.forEach((horde) => {
        const entries = Array.isArray(horde?.entries) ? horde.entries : [];
        entries.forEach((entry) => {
          if (!entry?.enemy) return;
          enemyBattleTotals[entry.enemy] =
            (enemyBattleTotals[entry.enemy] || 0) + Math.max(0, Number(entry.count) || 0);
        });
      });
    });

    visibleKeys.forEach((key) => {
      const row = document.createElement("div");
      row.className = "lb-label-row";
      const displayLabel = formatEnemyLabel(key, catalog);
      const totalCount = enemyBattleTotals[key] || 0;
      const typeColor = TYPE_COLORS[getEnemyType(key, catalog)] || "#e8f4ff";
      row.innerHTML = `
        <div style="width:${THUMB_SIZE}px;height:${THUMB_SIZE}px;overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:4px;">
          <canvas class="enemy-thumb" data-thumb-key="${key}" width="${THUMB_SIZE}" height="${THUMB_SIZE}" style="width:${THUMB_SIZE}px;height:${THUMB_SIZE}px;"></canvas>
        </div>
        <span title="${key}" style="font-size:10px;white-space:nowrap;color:${typeColor};">${displayLabel}</span>
        <button data-clear-key="${key}" title="Clear this enemy from all hordes in this battle" style="font-size:9px;padding:1px 4px;opacity:0.7;flex-shrink:0;">${totalCount}</button>
      `;
      const clearBtn = row.querySelector(`[data-clear-key="${key}"]`);
      if (clearBtn) {
        clearBtn.addEventListener("click", () => {
          pushUndoSnapshot();
          clearEnemyFromMission(missionObj, key);
          saveToStorage(state.config);
          renderMissionView();
        });
      }
      labelCol.appendChild(row);
    });
    container.appendChild(labelCol);

    // ── Wave + horde columns ─────────────────────────────────────────────────
    // Pre-compute total horde columns so tabIndex can go across rows (same enemy, next horde)
    const totalHordeCols = waves.reduce((sum, w) => sum + (w.hordes?.length || 0), 0);
    let globalColIdx = 0;
    waves.forEach((wave, wIdx) => {
      // Wave header column
      const waveCol = document.createElement("div");
      waveCol.className = "lb-wave-col";
      const waveHeader = document.createElement("div");
      waveHeader.className = "lb-wave-header";
      waveHeader.style.position = "relative";
      const waveMenuBtn = document.createElement("button");
      waveMenuBtn.className = "lb-wave-menu-btn";
      waveMenuBtn.textContent = `W${wIdx + 1} ▾`;
      const waveMenu = document.createElement("div");
      waveMenu.className = "lb-col-menu";
      waveMenu.style.cssText = "min-width:150px;";
      // Disabled states for boundary-shift actions
      const canShiftLeft  = wIdx > 0 && wave.hordes.length > 0;
      const canShiftRight = wIdx > 0 && waves[wIdx - 1].hordes.length > 0;
      waveMenu.innerHTML = `
        <button class="lb-col-menu-item" data-action="insert-before">Insert Wave Before</button>
        <button class="lb-col-menu-item" data-action="insert-after">Insert Wave After</button>
        <button class="lb-col-menu-item" data-action="add-horde">Add Horde</button>
        <button class="lb-col-menu-item" data-action="move-left"${!canShiftLeft ? " disabled" : ""}>← Shift Break Left</button>
        <button class="lb-col-menu-item" data-action="move-right"${!canShiftRight ? " disabled" : ""}>Shift Break Right →</button>
        <button class="lb-col-menu-item danger" data-action="delete-wave">Remove Wave Break</button>
        <div class="lb-col-menu-field">
          <span>Breaker (s)</span>
          <input type="number" data-action="breaker-duration" min="0" step="0.5" value="${String(wave.breakerDuration ?? 3)}">
        </div>
      `;
      waveMenuBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const wasOpen = waveMenu.classList.contains("open");
        closeMenus();
        if (!wasOpen) waveMenu.classList.add("open");
      });
      waveMenu.addEventListener("click", (e) => e.stopPropagation());
      const breakerMenuInput = waveMenu.querySelector('[data-action="breaker-duration"]');
      if (breakerMenuInput) {
        breakerMenuInput.addEventListener("click", (e) => e.stopPropagation());
        breakerMenuInput.addEventListener("keydown", (e) => e.stopPropagation());
        breakerMenuInput.addEventListener("change", () => {
          pushUndoSnapshot();
          wave.breakerDuration = Math.max(0, Number(breakerMenuInput.value) || 0);
          saveToStorage(state.config);
        });
      }
      waveMenu.querySelectorAll(".lb-col-menu-item").forEach((item) => {
        item.addEventListener("click", (e) => {
          e.stopPropagation();
          if (item.hasAttribute("disabled")) return;
          waveMenu.classList.remove("open");
          const action = item.getAttribute("data-action");
          if (action === "insert-before") {
            pushUndoSnapshot();
            // Empty wave break — no default hordes, just a separator with text/duration
            missionObj.waves.splice(wIdx, 0, { index: 0, introText: "", breakerDuration: 3, hordes: [] });
            missionObj.waves.forEach((w, i) => { w.index = i + 1; });
            saveToStorage(state.config); renderMissionView();
          } else if (action === "insert-after") {
            pushUndoSnapshot();
            missionObj.waves.splice(wIdx + 1, 0, { index: 0, introText: "", breakerDuration: 3, hordes: [] });
            missionObj.waves.forEach((w, i) => { w.index = i + 1; });
            saveToStorage(state.config); renderMissionView();
          } else if (action === "add-horde") {
            pushUndoSnapshot();
            const newIdx = wave.hordes.length + 1;
            wave.hordes.push(makeDefaultHorde(newIdx));
            saveToStorage(state.config); renderMissionView();
          } else if (action === "move-left" && canShiftLeft) {
            pushUndoSnapshot();
            // Shift the break left: move the first horde of this wave to the end of the previous wave
            const movedHorde = missionObj.waves[wIdx].hordes.shift();
            missionObj.waves[wIdx - 1].hordes.push(movedHorde);
            missionObj.waves[wIdx - 1].hordes.forEach((h, i) => { h.index = i + 1; });
            missionObj.waves[wIdx].hordes.forEach((h, i) => { h.index = i + 1; });
            saveToStorage(state.config); renderMissionView();
          } else if (action === "move-right" && canShiftRight) {
            pushUndoSnapshot();
            // Shift the break right: move the last horde of the previous wave to the start of this wave
            const movedHorde = missionObj.waves[wIdx - 1].hordes.pop();
            missionObj.waves[wIdx].hordes.unshift(movedHorde);
            missionObj.waves[wIdx - 1].hordes.forEach((h, i) => { h.index = i + 1; });
            missionObj.waves[wIdx].hordes.forEach((h, i) => { h.index = i + 1; });
            saveToStorage(state.config); renderMissionView();
          } else if (action === "delete-wave") {
            pushUndoSnapshot();
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
      // Enemy rows spacer — must match lb-horde-cell-row heights exactly (no gap/padding)
      visibleKeys.forEach(() => {
        const spacer = document.createElement("div");
        spacer.style.cssText = "height:32px;border-bottom:1px solid rgba(120,170,220,0.1);";
        waveBody.appendChild(spacer);
      });
      waveCol.appendChild(waveBody);
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
          const wasOpen = menu.classList.contains("open");
          closeMenus();
          if (!wasOpen) menu.classList.add("open");
        });
        menu.addEventListener("click", (e) => e.stopPropagation());
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
                pushUndoSnapshot();
                const pasted = deepClone(state.clipboard.data);
                pasted.index = horde.index;
                wave.hordes[hIdx] = pasted;
                saveToStorage(state.config); renderMissionView();
              }
            } else if (action === "insert-before") {
              pushUndoSnapshot();
              wave.hordes.splice(hIdx, 0, makeDefaultHorde(0));
              wave.hordes.forEach((h, i) => { h.index = i + 1; });
              saveToStorage(state.config); renderMissionView();
            } else if (action === "insert-after") {
              pushUndoSnapshot();
              wave.hordes.splice(hIdx + 1, 0, makeDefaultHorde(0));
              wave.hordes.forEach((h, i) => { h.index = i + 1; });
              saveToStorage(state.config); renderMissionView();
            } else if (action === "split-wave" && hIdx > 0) {
              pushUndoSnapshot();
              // Pull hordes from this position onward into a new wave
              const splitHordes = wave.hordes.splice(hIdx);
              splitHordes.forEach((h, i) => { h.index = i + 1; });
              const newWave = makeDefaultWave(0);
              newWave.hordes = splitHordes;
              missionObj.waves.splice(wIdx + 1, 0, newWave);
              missionObj.waves.forEach((w, i) => { w.index = i + 1; });
              saveToStorage(state.config); renderMissionView();
            } else if (action === "delete") {
              pushUndoSnapshot();
              wave.hordes.splice(hIdx, 1);
              wave.hordes.forEach((h, i) => { h.index = i + 1; });
              saveToStorage(state.config); renderMissionView();
            }
          });
        });
        hordeHeader.appendChild(menuBtn);
        hordeHeader.appendChild(menu);
        hordeCol.appendChild(hordeHeader);

        // Top-aligned horde settings
        const footer = document.createElement("div");
        footer.className = "lb-horde-footer";
        const durationRow = document.createElement("div");
        durationRow.className = "lb-horde-footer-row";
        const durInput = document.createElement("input");
        durInput.type = "number"; durInput.min = "1"; durInput.step = "1";
        durInput.value = String(horde.duration || state.config.structure.defaultHordeDuration || 4);
        durInput.addEventListener("change", () => {
          pushUndoSnapshot();
          horde.duration = Math.max(1, Number(durInput.value) || 1);
          saveToStorage(state.config);
        });
        durationRow.appendChild(durInput);
        const allKillRow = document.createElement("div");
        allKillRow.className = "lb-horde-footer-row";
        const akLabel = document.createElement("label");
        const akBox = document.createElement("input");
        akBox.type = "checkbox"; akBox.checked = !!horde.allKill;
        akBox.addEventListener("change", () => {
          pushUndoSnapshot();
          horde.allKill = akBox.checked;
          saveToStorage(state.config);
        });
        akLabel.appendChild(akBox);
        akLabel.appendChild(document.createTextNode(" ☠"));
        allKillRow.appendChild(akLabel);
        footer.appendChild(durationRow);
        footer.appendChild(allKillRow);
        hordeCol.appendChild(footer);

        // Enemy count rows
        const currentCol = globalColIdx;
        visibleKeys.forEach((key, enemyIdx) => {
          const cellRow = document.createElement("div");
          cellRow.className = "lb-horde-cell-row";
          const entries = Array.isArray(horde.entries) ? horde.entries : [];
          const match = entries.find((e) => e && e.enemy === key);
          const countVal = match ? Number(match.count) || 0 : 0;
          const input = document.createElement("input");
          input.className = "lb-horde-input";
          input.type = "number"; input.min = "0"; input.value = String(countVal);
          // Tab goes across the row (same enemy, next horde) instead of down the column
          input.tabIndex = enemyIdx * totalHordeCols + currentCol + 1;
          input.addEventListener("change", () => {
            const val = Math.max(0, Number(input.value) || 0);
            if (val === countVal) return;
            pushUndoSnapshot();
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
        globalColIdx += 1;
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
      pushUndoSnapshot();
      missionObj.waves.push(makeDefaultWave(missionObj.waves.length + 1));
      saveToStorage(state.config);
      renderMissionView();
    });
    addWaveCol.appendChild(addWaveBtn);
    container.appendChild(addWaveCol);

    els.content.innerHTML = "";
    els.content.appendChild(container);
    els.content.onclick = (e) => {
      if (e.target.closest(".lb-col-menu") || e.target.closest(".lb-col-menu-btn")) return;
      closeMenus();
    };
    initThumbAnimations();
  }

  function getChurchPowerupDefs() {
    const defs =
      (typeof window !== "undefined" &&
        window.BattlechurchPowerupDefinitions?.churchPowerupDefs) ||
      {};
    return defs && typeof defs === "object" ? defs : {};
  }

  function getPowerupLabel(key, def) {
    const display = String(def?.displayName || "").trim();
    if (display) return display;
    return String(key || "")
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (s) => s.toUpperCase())
      .trim();
  }

  function clampAssumedUpgradeLevel(value) {
    const parsed = Math.floor(Number(value) || 0);
    return Math.max(0, Math.min(ASSUMED_UPGRADE_MAX_LEVEL, parsed));
  }

  function getMissionAssumedLevels(missionObj) {
    const raw = missionObj?.assumedChurchPowerupLevels;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    return raw;
  }

  function setMissionAssumedLevel(missionObj, powerupKey, level) {
    const nextLevel = clampAssumedUpgradeLevel(level);
    const current =
      missionObj?.assumedChurchPowerupLevels &&
      typeof missionObj.assumedChurchPowerupLevels === "object" &&
      !Array.isArray(missionObj.assumedChurchPowerupLevels)
        ? missionObj.assumedChurchPowerupLevels
        : {};
    if (nextLevel > 0) current[powerupKey] = nextLevel;
    else delete current[powerupKey];
    if (Object.keys(current).length) missionObj.assumedChurchPowerupLevels = current;
    else delete missionObj.assumedChurchPowerupLevels;
  }

  function renderAssumedUpgradeInputs(missionObj) {
    if (!els?.assumedUpgrades) return;
    const defs = getChurchPowerupDefs();
    const powerupKeys = Object.keys(defs)
      .filter((key) => !defs[key]?.disabled)
      .sort((a, b) => getPowerupLabel(a, defs[a]).localeCompare(getPowerupLabel(b, defs[b])));
    const assumed = getMissionAssumedLevels(missionObj);
    els.assumedUpgrades.innerHTML = "";
    if (!powerupKeys.length) {
      const empty = document.createElement("span");
      empty.style.cssText = "font-size:10px;opacity:0.72;white-space:nowrap;";
      empty.textContent = "No church powerup definitions found.";
      els.assumedUpgrades.appendChild(empty);
      return;
    }
    const fragment = document.createDocumentFragment();
    powerupKeys.forEach((key) => {
      const def = defs[key] || {};
      const pill = document.createElement("label");
      pill.className = "lb-upgrade-pill";
      const name = document.createElement("span");
      name.textContent = getPowerupLabel(key, def);
      name.title = key;
      const input = document.createElement("input");
      input.type = "number";
      input.min = "0";
      input.max = String(ASSUMED_UPGRADE_MAX_LEVEL);
      input.step = "1";
      input.value = String(clampAssumedUpgradeLevel(assumed[key] || 0));
      input.addEventListener("change", () => {
        const nextLevel = clampAssumedUpgradeLevel(input.value);
        input.value = String(nextLevel);
        const currentLevel = clampAssumedUpgradeLevel(assumed[key] || 0);
        if (nextLevel === currentLevel) return;
        pushUndoSnapshot();
        setMissionAssumedLevel(missionObj, key, nextLevel);
        saveToStorage(state.config);
      });
      pill.appendChild(name);
      pill.appendChild(input);
      fragment.appendChild(pill);
    });
    els.assumedUpgrades.appendChild(fragment);
  }

  function inferFrameSizeForManifestEntry(entry, image, key) {
    if (!entry || !image) return { frameWidth: 0, frameHeight: 0 };
    const fallbackClip = {
      image,
      frameWidth: entry.frameWidth || 0,
      frameHeight: entry.frameHeight || 0,
      frameMap: Array.isArray(entry.frameMap) ? entry.frameMap.slice() : null,
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
    const declaredFrameMap =
      Array.isArray(clip?.frameMap) && clip.frameMap.length ? clip.frameMap : null;
    const overrideMax =
      declaredFrameMap && declaredFrameMap.length
        ? Math.max(...declaredFrameMap.map((v) => (Number.isFinite(v) ? v : -1)))
        : -1;
    const srcBase = (clip?.image?.src || clip?.src || "").split("/").pop() || "";
    const normalizedSrc = String(srcBase).trim().toLowerCase();
    const manualGridOverrides =
      (typeof window !== "undefined" && window.__BATTLECHURCH_MANUAL_GRIDS) || {};
    const manualOverrides = {
      "minifireimp.png": { cols: 2, rows: 2 },
      "minihighdemon.png": { cols: 2, rows: 2 },
      "minidemonlord.png": { cols: 10, rows: 8 },
      "minidemonfirekeeper.png": { cols: 8, rows: 8 },
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
    const entry = manifestEntry?.idle || manifestEntry?.walk || manifestEntry?.attack || null;
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
    const frameMap =
      Array.isArray(entry.frameMap) && entry.frameMap.length ? entry.frameMap.slice() : null;
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
    const assets =
      (typeof bindings.getAssets === "function" && bindings.getAssets()) ||
      window.assets ||
      {};
    const enemyAssets = assets.enemies?.[key];
    const clip = enemyAssets?.idle || enemyAssets?.walk || enemyAssets?.attack || null;
    if (!clip || !clip.image) {
      return getManifestClipData(key);
    }
    if (!ensureThumbImageReady(clip.image)) {
      return getManifestClipData(key);
    }
    const inferredSize =
      Number.isFinite(clip.frameWidth) && clip.frameWidth > 0 &&
      Number.isFinite(clip.frameHeight) && clip.frameHeight > 0
        ? { frameWidth: clip.frameWidth, frameHeight: clip.frameHeight }
        : inferFrameSizeForClip(clip, key);
    const frameWidth = inferredSize.frameWidth || clip.frameWidth || clip.image.width;
    const frameHeight = inferredSize.frameHeight || clip.frameHeight || clip.image.height;
    const frameMap =
      Array.isArray(clip.frameMap) && clip.frameMap.length ? clip.frameMap.slice() : null;
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

  function getTrimmedSpriteBounds(key, clip) {
    const cacheKey = `${key}:${clip?.image?.src || "no-image"}:${clip?.frameWidth || 0}:${clip?.frameHeight || 0}`;
    if (spriteBoundsCache.has(cacheKey)) return spriteBoundsCache.get(cacheKey);
    const fallback = {
      x: 0,
      y: 0,
      width: clip?.frameWidth || THUMB_SIZE,
      height: clip?.frameHeight || THUMB_SIZE,
    };
    if (
      !clip ||
      !clip.image ||
      !clip.frameWidth ||
      !clip.frameHeight ||
      typeof document === "undefined"
    ) {
      spriteBoundsCache.set(cacheKey, fallback);
      return fallback;
    }
    try {
      const frameMap = Array.isArray(clip.frameMap) && clip.frameMap.length ? clip.frameMap : null;
      const frameCount = Math.max(1, frameMap ? frameMap.length : (clip.frameCount || 1));
      const cols = Math.max(1, Math.floor(clip.image.width / clip.frameWidth));
      const sampleCanvas = document.createElement("canvas");
      sampleCanvas.width = clip.frameWidth;
      sampleCanvas.height = clip.frameHeight;
      const sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });
      if (!sampleCtx) {
        spriteBoundsCache.set(cacheKey, fallback);
        return fallback;
      }
      let minX = clip.frameWidth;
      let minY = clip.frameHeight;
      let maxX = -1;
      let maxY = -1;
      for (let i = 0; i < frameCount; i += 1) {
        const spriteFrame = frameMap ? frameMap[i] : i;
        const sx = (spriteFrame % cols) * clip.frameWidth;
        const sy = Math.floor(spriteFrame / cols) * clip.frameHeight;
        sampleCtx.clearRect(0, 0, clip.frameWidth, clip.frameHeight);
        sampleCtx.drawImage(
          clip.image,
          sx,
          sy,
          clip.frameWidth,
          clip.frameHeight,
          0,
          0,
          clip.frameWidth,
          clip.frameHeight,
        );
        const imageData = sampleCtx.getImageData(0, 0, clip.frameWidth, clip.frameHeight).data;
        for (let y = 0; y < clip.frameHeight; y += 1) {
          for (let x = 0; x < clip.frameWidth; x += 1) {
            const alpha = imageData[(y * clip.frameWidth + x) * 4 + 3];
            if (alpha <= 8) continue;
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
      }
      const trimmed =
        maxX >= minX && maxY >= minY
          ? {
              x: minX,
              y: minY,
              width: maxX - minX + 1,
              height: maxY - minY + 1,
            }
          : fallback;
      spriteBoundsCache.set(cacheKey, trimmed);
      return trimmed;
    } catch (err) {
      spriteBoundsCache.set(cacheKey, fallback);
      return fallback;
    }
  }

  function drawThumbFrame(item) {
    const { canvas, ctx, clip, frameWidth, frameHeight, cols, frameMap, renderScale, sourceBounds } = item;
    const framePos = frameMap
      ? frameMap[item.frameIndex % frameMap.length]
      : item.frameIndex;
    const sx = (framePos % cols) * frameWidth + (sourceBounds?.x || 0);
    const sy = Math.floor(framePos / cols) * frameHeight + (sourceBounds?.y || 0);
    const sourceWidth = sourceBounds?.width || frameWidth;
    const sourceHeight = sourceBounds?.height || frameHeight;
    const baseSize = Math.max(sourceWidth, sourceHeight) * renderScale;
    const scale = THUMB_SIZE / Math.max(1, baseSize);
    const dw = sourceWidth * renderScale * scale;
    const dh = sourceHeight * renderScale * scale;
    const dx = (THUMB_SIZE - dw) / 2;
    const dy = (THUMB_SIZE - dh) / 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(clip.image, sx, sy, sourceWidth, sourceHeight, dx, dy, dw, dh);
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
        sourceBounds: getTrimmedSpriteBounds(key, data.clip),
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
      clearUndoHistory();
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
    updatePasteButtonState();
  }

  function attachEvents() {
    const closeTopMenus = () => {
      els.copyMenu?.classList.remove("open");
    };

    // Scope dropdowns
    ["town", "battle", "mission"].forEach((key) => {
      els[key].addEventListener("change", () => {
        updateScopeFromSelects();
        refreshUI();
      });
    });

    if (els.battleNotes) {
      els.battleNotes.addEventListener("change", () => {
        const { missionObj } = getOrCreateMission();
        const nextValue = String(els.battleNotes.value || "");
        if (missionObj.editorNotes === nextValue) return;
        pushUndoSnapshot();
        missionObj.editorNotes = nextValue;
        saveToStorage(state.config);
      });
    }
    if (els.clearAssumedUpgrades) {
      els.clearAssumedUpgrades.addEventListener("click", () => {
        const { missionObj } = getOrCreateMission();
        const existing = getMissionAssumedLevels(missionObj);
        if (!Object.keys(existing).length) return;
        pushUndoSnapshot();
        delete missionObj.assumedChurchPowerupLevels;
        saveToStorage(state.config);
        renderAssumedUpgradeInputs(missionObj);
        setStatus("Cleared assumed upgrades for this battle");
      });
    }

    if (els.copyMenuButton && els.copyMenu) {
      els.copyMenuButton.addEventListener("click", (e) => {
        e.stopPropagation();
        const wasOpen = els.copyMenu.classList.contains("open");
        closeTopMenus();
        if (!wasOpen) els.copyMenu.classList.add("open");
      });
      els.copyMenu.addEventListener("click", (e) => {
        e.stopPropagation();
      });
      els.copyMenu.querySelectorAll("[data-copy-type]").forEach((item) => {
        item.addEventListener("click", () => {
          const copyType = item.getAttribute("data-copy-type");
          if (copyType === "town") {
            const { town: townIdx } = state.scope;
            const townObj = ensureTown(townIdx);
            state.clipboard = { type: "town", data: JSON.parse(JSON.stringify(townObj)) };
            setStatus(`Copied Town ${townIdx}`);
          } else if (copyType === "battle") {
            const { town: townIdx, battle: battleIdx } = state.scope;
            const townObj = ensureTown(townIdx);
            const battleObj = ensureBattle(townObj, battleIdx);
            state.clipboard = { type: "battle", data: JSON.parse(JSON.stringify(battleObj)) };
            setStatus(`Copied Mission ${battleIdx}`);
          } else if (copyType === "mission") {
            const { missionObj } = getOrCreateMission();
            const { battle: battleIdx, mission: missionIdx } = state.scope;
            state.clipboard = { type: "mission", data: JSON.parse(JSON.stringify(missionObj)) };
            setStatus(`Copied Battle ${missionIdx} from Mission ${battleIdx}`);
          }
          updatePasteButtonState();
          closeTopMenus();
        });
      });
    }

    // Paste
    if (els.paste) {
      els.paste.addEventListener("click", () => {
        if (!state.clipboard) { setStatus("Nothing to paste", true); return; }
        const { town: townIdx, battle: battleIdx, mission: missionIdx } = state.scope;
        const townObj = ensureTown(townIdx);
        if (state.clipboard.type === "town") {
          pushUndoSnapshot();
          const pasted = JSON.parse(JSON.stringify(state.clipboard.data));
          pasted.index = townIdx;
          state.config.towns[townIdx - 1] = pasted;
          saveToStorage(state.config);
          refreshUI();
          setStatus(`Pasted Town ${townIdx}`);
        } else if (state.clipboard.type === "battle") {
          pushUndoSnapshot();
          const pasted = JSON.parse(JSON.stringify(state.clipboard.data));
          pasted.index = battleIdx;
          const bList = townObj.battles;
          const existingIdx = bList.findIndex((b) => b.index === battleIdx);
          if (existingIdx >= 0) bList[existingIdx] = pasted;
          else bList.push(pasted);
          saveToStorage(state.config);
          refreshUI();
          setStatus(`Pasted Mission into Town ${townIdx} Mission ${battleIdx}`);
        } else if (state.clipboard.type === "mission") {
          pushUndoSnapshot();
          const battleObj = ensureBattle(townObj, battleIdx);
          const pasted = JSON.parse(JSON.stringify(state.clipboard.data));
          pasted.index = missionIdx;
          const mList = battleObj.missions;
          const existingIdx = mList.findIndex((m) => m.index === missionIdx);
          if (existingIdx >= 0) mList[existingIdx] = pasted;
          else mList.push(pasted);
          saveToStorage(state.config);
          refreshUI();
          setStatus(`Pasted Battle ${missionIdx} into Town ${townIdx} Mission ${battleIdx}`);
        } else if (state.clipboard.type === "horde" || state.clipboard.type === "wave") {
          setStatus("Use the column ▾ menu to paste hordes/waves", true);
        }
      });
    }

    if (els.undo) {
      els.undo.addEventListener("click", () => {
        undoLastEdit();
      });
    }

    if (els.playtest) {
      els.playtest.addEventListener("click", () => {
        if (typeof window.startDevLevelTestFromEditor !== "function") {
          setStatus("Play Test unavailable", true);
          return;
        }
        const townNum = Number(state.scope.town) || 1;
        const missionNum = Number(state.scope.battle) || 1;
        const battleNum = Number(state.scope.mission) || 1;
        window.startDevLevelTestFromEditor({
          town: townNum,
          mission: missionNum,
          battle: battleNum,
        });
      });
    }

    overlay.addEventListener("click", (e) => {
      if (e.target.closest("#lb-copyMenuWrap")) return;
      closeTopMenus();
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
    updateUndoButtonState();
    updatePasteButtonState();
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

  function clampInt(value, min, max, fallback) {
    const raw = Number.isFinite(Number(value)) ? Number(value) : fallback;
    return Math.max(min, Math.min(max, Math.floor(raw)));
  }

  // Public scope shape uses UI labels:
  // { town, mission, battle } where mission maps to internal state.scope.battle
  // and battle maps to internal state.scope.mission.
  function setScope(scope = {}) {
    const s = state.config?.structure || {};
    const maxTown = Math.max(1, Number(s.towns) || 10);
    const maxMission = Math.max(1, Number(s.battlesPerTown) || 3);
    const maxBattle = Math.max(1, Number(s.missionsPerBattle) || 3);
    const town = clampInt(scope.town, 1, maxTown, state.scope.town || 1);
    const mission = clampInt(scope.mission, 1, maxMission, state.scope.battle || 1);
    const battle = clampInt(scope.battle, 1, maxBattle, state.scope.mission || 1);
    state.scope = {
      town,
      battle: mission,
      mission: battle,
    };
    refreshUI();
  }

  function getScope() {
    return {
      town: Number(state.scope.town) || 1,
      mission: Number(state.scope.battle) || 1,
      battle: Number(state.scope.mission) || 1,
    };
  }

  function isVisible() {
    return overlay.style.display === "block";
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
      overlay.style.display === "block" &&
      e.key &&
      e.key.toLowerCase() === "z" &&
      (e.metaKey || e.ctrlKey) &&
      !e.shiftKey &&
      !e.altKey
    ) {
      e.preventDefault();
      undoLastEdit();
      return;
    }
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
    initialize(options = {}) {
      bindings.getAssets = options.getAssets || bindings.getAssets;
    },
    getConfig: () => state.config,
    save: () => saveToStorage(state.config),
    saveAndSync: () => persistConfig(),
    load: () => loadFromStorage(),
    getScope,
    setScope,
    show,
    showAtScope(scope = {}) {
      setScope(scope);
      show();
    },
    hide,
    toggle,
    isVisible,
  };
})(typeof window !== "undefined" ? window : null, typeof document !== "undefined" ? document : null);
