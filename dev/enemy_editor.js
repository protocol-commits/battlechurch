(function setupEnemyEditor(window, document) {
  if (!window || !document) return;

  const STORAGE_KEY = "battlechurch.devEnemyCatalog";
  const OVERLAY_ID = "enemyEditorOverlay";
  const HOTKEY = "e";
  const SPRITE_CELL_SIZE = 112;
  const SPRITE_FRAME_RATE = 6;
  const TAGS = [
    "swarmable",
    "ranged",
    "npcPriority",
    "preferEdges",
    "closestAny",
  ];

  function sanitizeSpecialBehavior(value) {
    const tags = Array.isArray(value) ? value : [];
    return tags.filter((tag) => tag && !["popcorn", "elite", "axe", "mini"].includes(tag));
  }

  function deepClone(obj) {
    return obj ? JSON.parse(JSON.stringify(obj)) : obj;
  }

  const SOURCE_CATALOG = deepClone(
    (window.BattlechurchEnemyCatalog && window.BattlechurchEnemyCatalog.catalog) || {},
  );

  const IMMUTABLE_CATALOG_KEYS = [
    "spriteSrc",
    "assetFolder",
    "assetBaseName",
    "assetPath",
    "assetFiles",
    "assetGrid",
    "animationFrameMaps",
  ];

  const bindings = {
    getAssets: () => null,
  };

  const SPECIAL_CATALOG_LOCKS = {
    miniDemonLord: [
      "projectileType",
      "desiredRange",
      "projectileCooldown",
      "bossTier",
      "preferredTarget",
      "specialBehavior",
      "damageClass",
      "attackHitFrame",
      "attackHitDamage",
      "hitbox",
      "weaponHitbox",
    ],
    miniDemonFireThrower: [
      "ranged",
      "preferEdges",
      "desiredRange",
      "projectileCooldown",
      "bossTier",
      "preferredTarget",
      "specialBehavior",
      "attackHitFrame",
      "hitbox",
      "weaponHitbox",
    ],
    miniDemonFireKeeper: [
      "ranged",
      "preferEdges",
      "desiredRange",
      "projectileCooldown",
      "bossTier",
      "preferredTarget",
      "specialBehavior",
      "attackHitFrame",
      "hitbox",
      "weaponHitbox",
    ],
    miniDemoness: [
      "ranged",
      "projectileType",
      "preferEdges",
      "desiredRange",
      "projectileCooldown",
      "preferredTarget",
      "specialBehavior",
      "hitbox",
      "weaponHitbox",
    ],
  };

  function baseCatalog() {
    return deepClone(SOURCE_CATALOG);
  }

  function applyProtectedCatalogFields(entry, baseEntry, key) {
    if (!entry || !baseEntry) return entry;
    const lockedKeys = SPECIAL_CATALOG_LOCKS[key];
    if (!Array.isArray(lockedKeys) || !lockedKeys.length) return entry;
    lockedKeys.forEach((fieldKey) => {
      if (baseEntry[fieldKey] === undefined) {
        delete entry[fieldKey];
      } else {
        entry[fieldKey] = deepClone(baseEntry[fieldKey]);
      }
    });
    return entry;
  }

  function isProtectedCatalogField(key, field) {
    const lockedKeys = SPECIAL_CATALOG_LOCKS[key];
    return Array.isArray(lockedKeys) && lockedKeys.includes(field);
  }

  function loadConfig() {
    let cfg = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") cfg = parsed;
      }
    } catch (e) {
      console.warn("EnemyEditor: failed to load from localStorage", e);
    }
    if (!cfg) {
      cfg = { catalog: baseCatalog() };
    }
    const base = baseCatalog();
    cfg.catalog = cfg.catalog || base;
    const allowedKeys = new Set(Object.keys(base));
    // Merge in any newly added enemies from the base catalog so they appear in the editor.
    Object.keys(base).forEach((key) => {
      if (!cfg.catalog[key]) {
        cfg.catalog[key] = deepClone(base[key]);
        return;
      }
      const baseEntry = base[key] || {};
      const localEntry = cfg.catalog[key] || {};
      const merged = { ...deepClone(baseEntry), ...deepClone(localEntry) };
      IMMUTABLE_CATALOG_KEYS.forEach((assetKey) => {
        if (baseEntry && baseEntry[assetKey] !== undefined) {
          merged[assetKey] = deepClone(baseEntry[assetKey]);
        }
      });
      applyProtectedCatalogFields(merged, baseEntry, key);
      merged.specialBehavior = sanitizeSpecialBehavior(merged.specialBehavior);
      cfg.catalog[key] = merged;
    });
    // Drop any catalog entries that no longer exist in the base catalog.
    Object.keys(cfg.catalog).forEach((key) => {
      if (!allowedKeys.has(key)) {
        delete cfg.catalog[key];
      }
    });
    delete cfg.hiddenEnemies;
    return cfg;
  }

  function applyRuntime(cfg) {
    try {
      if (window.BattlechurchEnemyCatalog) {
        window.BattlechurchEnemyCatalog.catalog = deepClone(cfg.catalog);
      }
      if (window.BattlechurchEnemyDefinitions) {
        Object.assign(window.BattlechurchEnemyDefinitions, deepClone(cfg.catalog));
      }
    } catch (e) {
      console.warn("EnemyEditor: failed to apply runtime catalog", e);
    }
  }

  function saveConfig(cfg) {
    const next = deepClone(cfg);
    const base = baseCatalog();
    Object.keys(next.catalog || {}).forEach((key) => {
      if (!next.catalog[key]) return;
      const baseEntry = base[key] || {};
      IMMUTABLE_CATALOG_KEYS.forEach((assetKey) => {
        if (baseEntry[assetKey] !== undefined) {
          next.catalog[key][assetKey] = deepClone(baseEntry[assetKey]);
        }
      });
      applyProtectedCatalogFields(next.catalog[key], baseEntry, key);
      next.catalog[key].specialBehavior = sanitizeSpecialBehavior(next.catalog[key].specialBehavior);
    });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn("EnemyEditor: failed to save to localStorage", e);
      return false;
    }
    applyRuntime(next);
    return true;
  }

  function exportFile(cfg) {
    const data = deepClone(cfg.catalog || {});
    const base = baseCatalog();
    Object.keys(data).forEach((key) => {
      const baseEntry = base[key] || {};
      IMMUTABLE_CATALOG_KEYS.forEach((assetKey) => {
        if (baseEntry[assetKey] !== undefined) {
          data[key][assetKey] = deepClone(baseEntry[assetKey]);
        }
      });
      applyProtectedCatalogFields(data[key], baseEntry, key);
      data[key].specialBehavior = sanitizeSpecialBehavior(data[key].specialBehavior);
    });
    const body = `(function(global) {\n  const ENEMY_CATALOG = ${JSON.stringify(data, null, 2)};\n  const ns = global.BattlechurchEnemyCatalog || (global.BattlechurchEnemyCatalog = {});\n  ns.catalog = ENEMY_CATALOG;\n  const defs = global.BattlechurchEnemyDefinitions || (global.BattlechurchEnemyDefinitions = {});\n  Object.assign(defs, ENEMY_CATALOG);\n})(typeof window !== "undefined" ? window : globalThis);\n`;
    const blob = new Blob([body], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "enemy_catalog.js";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  let state = {
    cfg: loadConfig(),
    search: "",
  };

  // UI
  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.innerHTML = `
    <style>
      #${OVERLAY_ID} {
        position: fixed;
        inset: 0;
        background:
          radial-gradient(circle at top, rgba(72, 122, 196, 0.18), transparent 32%),
          linear-gradient(180deg, rgba(7, 12, 24, 0.98), rgba(4, 8, 18, 0.99));
        color: #e8f4ff;
        font-family: Georgia, "Times New Roman", serif;
        z-index: 10000;
        display: none;
        padding: 22px;
        box-sizing: border-box;
      }
      #${OVERLAY_ID} .grid {
        display: flex;
        flex-direction: column;
        gap: 16px;
        height: 100%;
      }
      #${OVERLAY_ID} .panel {
        background:
          linear-gradient(180deg, rgba(18, 28, 44, 0.96), rgba(12, 20, 34, 0.94));
        border: 1px solid rgba(160, 198, 238, 0.2);
        border-radius: 20px;
        box-shadow:
          0 24px 80px rgba(0, 0, 0, 0.42),
          inset 0 1px 0 rgba(255, 255, 255, 0.06);
        padding: 18px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      #${OVERLAY_ID} h3 {
        margin: 0;
        font-size: 28px;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        font-family: "Trebuchet MS", Georgia, serif;
      }
      #${OVERLAY_ID} button {
        background: linear-gradient(180deg, #8fd5ff, #5299d7);
        color: #07101c;
        border: none;
        padding: 10px 14px;
        border-radius: 999px;
        cursor: pointer;
        font-weight: 700;
        font-family: "Trebuchet MS", Arial, sans-serif;
        letter-spacing: 0.02em;
        box-shadow: 0 8px 22px rgba(37, 94, 147, 0.35);
      }
      #${OVERLAY_ID} button.secondary {
        background: rgba(255,255,255,0.08);
        color: #e8f4ff;
        box-shadow: none;
      }
      #${OVERLAY_ID} .controls,
      #${OVERLAY_ID} .toolbar-left,
      #${OVERLAY_ID} .toolbar-right {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px 14px;
      }
      #${OVERLAY_ID} .header-row,
      #${OVERLAY_ID} .toolbar {
        display: flex;
        justify-content: space-between;
        gap: 18px;
        flex-wrap: wrap;
      }
      #${OVERLAY_ID} .header-row {
        align-items: flex-start;
        margin-bottom: 14px;
      }
      #${OVERLAY_ID} .headline {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      #${OVERLAY_ID} .headline p {
        margin: 0;
        color: rgba(232, 244, 255, 0.72);
        font: 14px "Trebuchet MS", Arial, sans-serif;
      }
      #${OVERLAY_ID} .status {
        min-height: 18px;
        color: #9bf0ff;
        font: 12px "Trebuchet MS", Arial, sans-serif;
      }
      #${OVERLAY_ID} .search {
        min-width: 240px;
        padding: 10px 14px;
        border-radius: 999px;
        border: 1px solid rgba(155, 217, 255, 0.24);
        background: rgba(255, 255, 255, 0.06);
        color: #e8f4ff;
        font: 600 13px "Trebuchet MS", Arial, sans-serif;
      }
      #${OVERLAY_ID} .list-wrap {
        overflow: auto;
        flex: 1;
        max-height: 100%;
        padding-right: 4px;
      }
      #${OVERLAY_ID} .enemy-list {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      #${OVERLAY_ID} .enemy-card {
        display: grid;
        grid-template-columns: 160px minmax(0, 1fr);
        gap: 16px;
        padding: 16px;
        border-radius: 18px;
        background:
          linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02)),
          rgba(9, 16, 28, 0.9);
        border: 1px solid rgba(155, 217, 255, 0.16);
      }
      #${OVERLAY_ID} .enemy-preview {
        display: flex;
        flex-direction: column;
        gap: 10px;
        align-items: flex-start;
      }
      #${OVERLAY_ID} .sprite-frame {
        min-width: ${SPRITE_CELL_SIZE}px;
        min-height: ${SPRITE_CELL_SIZE}px;
        border-radius: 16px;
        border: 1px solid rgba(255,255,255,0.12);
        background:
          linear-gradient(45deg, rgba(255,255,255,0.03) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.03) 75%),
          linear-gradient(45deg, rgba(255,255,255,0.03) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.03) 75%),
          radial-gradient(circle at top, rgba(155, 217, 255, 0.14), rgba(7, 12, 22, 0.92));
        background-size: 18px 18px, 18px 18px, auto;
        background-position: 0 0, 9px 9px, 0 0;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 10px;
        box-sizing: border-box;
      }
      #${OVERLAY_ID} .preview-meta {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      #${OVERLAY_ID} .enemy-name {
        font: 700 16px "Trebuchet MS", Arial, sans-serif;
        color: #f5fbff;
      }
      #${OVERLAY_ID} .enemy-key {
        font: 12px "Trebuchet MS", Arial, sans-serif;
        color: rgba(232, 244, 255, 0.58);
      }
      #${OVERLAY_ID} .enemy-scale-note {
        font: 11px "Trebuchet MS", Arial, sans-serif;
        color: rgba(155, 217, 255, 0.84);
      }
      #${OVERLAY_ID} .enemy-main {
        display: flex;
        flex-direction: column;
        gap: 12px;
        min-width: 0;
      }
      #${OVERLAY_ID} .enemy-summary {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 10px 12px;
        border-radius: 14px;
        border: 1px solid rgba(155, 217, 255, 0.14);
        background: rgba(255, 255, 255, 0.04);
      }
      #${OVERLAY_ID} .enemy-summary-title {
        font: 700 10px "Trebuchet MS", Arial, sans-serif;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: rgba(232, 244, 255, 0.58);
      }
      #${OVERLAY_ID} .enemy-summary-text {
        color: rgba(232, 244, 255, 0.82);
        font: 12px/1.45 "Trebuchet MS", Arial, sans-serif;
      }
      #${OVERLAY_ID} .enemy-summary-badges {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      #${OVERLAY_ID} .enemy-badge {
        display: inline-flex;
        align-items: center;
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(143, 213, 255, 0.12);
        border: 1px solid rgba(143, 213, 255, 0.16);
        color: #dff4ff;
        font: 700 11px "Trebuchet MS", Arial, sans-serif;
        letter-spacing: 0.02em;
        white-space: nowrap;
      }
      #${OVERLAY_ID} .enemy-topbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 14px;
        flex-wrap: wrap;
      }
      #${OVERLAY_ID} .toggles {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        font: 600 12px "Trebuchet MS", Arial, sans-serif;
        color: rgba(232, 244, 255, 0.78);
      }
      #${OVERLAY_ID} .toggles label {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      #${OVERLAY_ID} .field-grid {
        display: grid;
        grid-template-columns: repeat(8, minmax(68px, 1fr));
        gap: 8px 10px;
      }
      #${OVERLAY_ID} .field {
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 0;
      }
      #${OVERLAY_ID} .field.is-locked {
        opacity: 0.82;
      }
      #${OVERLAY_ID} .field--wide {
        grid-column: span 2;
      }
      #${OVERLAY_ID} .field--quarter {
        grid-column: span 2;
      }
      #${OVERLAY_ID} .field-label {
        font: 700 10px "Trebuchet MS", Arial, sans-serif;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: rgba(232, 244, 255, 0.58);
      }
      #${OVERLAY_ID} .field-lock {
        display: inline-flex;
        align-items: center;
        margin-left: 6px;
        padding: 2px 7px;
        border-radius: 999px;
        border: 1px solid rgba(255, 210, 122, 0.28);
        background: rgba(255, 210, 122, 0.1);
        color: #ffd98f;
        font: 700 9px "Trebuchet MS", Arial, sans-serif;
        letter-spacing: 0.04em;
        vertical-align: middle;
      }
      #${OVERLAY_ID} input[type="number"],
      #${OVERLAY_ID} select,
      #${OVERLAY_ID} details summary {
        width: 100%;
        min-width: 0;
        padding: 7px 8px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,0.16);
        background: rgba(255,255,255,0.07);
        color: #e8f4ff;
        box-sizing: border-box;
        font: 600 12px "Trebuchet MS", Arial, sans-serif;
      }
      #${OVERLAY_ID} input[type="number"]:disabled,
      #${OVERLAY_ID} select:disabled {
        cursor: not-allowed;
        border-color: rgba(255, 210, 122, 0.22);
        background: rgba(255, 210, 122, 0.08);
        color: rgba(255, 236, 199, 0.9);
      }
      #${OVERLAY_ID} .field.is-locked details summary {
        cursor: not-allowed;
        border-color: rgba(255, 210, 122, 0.22);
        background: rgba(255, 210, 122, 0.08);
        color: rgba(255, 236, 199, 0.9);
      }
      #${OVERLAY_ID} .field-note {
        color: rgba(255, 217, 143, 0.88);
        font: 11px/1.35 "Trebuchet MS", Arial, sans-serif;
      }
      #${OVERLAY_ID} .special-details {
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.1);
        background: rgba(255,255,255,0.04);
        overflow: hidden;
      }
      #${OVERLAY_ID} .special-details summary {
        cursor: pointer;
      }
      #${OVERLAY_ID} .special-list {
        margin: 0;
        padding: 0 12px 12px 28px;
        color: rgba(232, 244, 255, 0.84);
        font: 12px/1.45 "Trebuchet MS", Arial, sans-serif;
      }
      #${OVERLAY_ID} .special-list li + li {
        margin-top: 4px;
      }
      #${OVERLAY_ID} details.tags-dropdown summary {
        list-style: none;
        cursor: pointer;
        position: relative;
        padding-right: 28px;
      }
      #${OVERLAY_ID} details.tags-dropdown summary::-webkit-details-marker {
        display: none;
      }
      #${OVERLAY_ID} details.tags-dropdown summary::after {
        content: "";
        position: absolute;
        right: 12px;
        top: 50%;
        width: 8px;
        height: 8px;
        border-right: 2px solid rgba(232, 244, 255, 0.78);
        border-bottom: 2px solid rgba(232, 244, 255, 0.78);
        transform: translateY(-65%) rotate(45deg);
        transition: transform 120ms ease;
        pointer-events: none;
      }
      #${OVERLAY_ID} details.tags-dropdown[open] summary::after {
        transform: translateY(-35%) rotate(225deg);
      }
      #${OVERLAY_ID} .tag-panel {
        margin-top: 8px;
        padding: 12px;
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,0.1);
        background: rgba(7, 12, 22, 0.98);
        display: grid;
        grid-template-columns: repeat(2, minmax(110px, 1fr));
        gap: 8px 10px;
      }
      #${OVERLAY_ID} .tag-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 7px 9px;
        border-radius: 999px;
        background: rgba(255,255,255,0.05);
        font: 600 12px "Trebuchet MS", Arial, sans-serif;
        white-space: nowrap;
      }
      #${OVERLAY_ID} .projectile-picker summary {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      #${OVERLAY_ID} .projectile-picker summary .projectile-picker-label {
        flex: 1;
        min-width: 0;
      }
      #${OVERLAY_ID} .projectile-picker-panel {
        margin-top: 8px;
        padding: 10px;
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,0.1);
        background: rgba(7, 12, 22, 0.98);
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 280px;
        overflow: auto;
      }
      #${OVERLAY_ID} .projectile-option {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        padding: 8px 10px;
        border-radius: 12px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.08);
        color: #e8f4ff;
        text-align: left;
        box-shadow: none;
      }
      #${OVERLAY_ID} .projectile-option:hover {
        background: rgba(143, 213, 255, 0.12);
      }
      #${OVERLAY_ID} .projectile-option.is-selected {
        border-color: rgba(143, 213, 255, 0.35);
        background: rgba(143, 213, 255, 0.12);
      }
      #${OVERLAY_ID} .projectile-option-text {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }
      #${OVERLAY_ID} .projectile-option-title {
        font: 700 12px "Trebuchet MS", Arial, sans-serif;
        color: #f5fbff;
      }
      #${OVERLAY_ID} .projectile-option-key {
        font: 11px "Trebuchet MS", Arial, sans-serif;
        color: rgba(232, 244, 255, 0.55);
      }
      #${OVERLAY_ID} .projectile-thumb {
        width: 34px;
        height: 34px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,0.08);
        background: radial-gradient(circle at top, rgba(155, 217, 255, 0.14), rgba(7, 12, 22, 0.92));
        overflow: hidden;
      }
      #${OVERLAY_ID} .projectile-thumb canvas {
        width: 100%;
        height: 100%;
        display: block;
      }
      #${OVERLAY_ID} .muted {
        color: rgba(232, 244, 255, 0.55);
      }
      @media (max-width: 1200px) {
        #${OVERLAY_ID} .field-grid {
          grid-template-columns: repeat(4, minmax(68px, 1fr));
        }
      }
      @media (max-width: 860px) {
        #${OVERLAY_ID} {
          padding: 12px;
        }
        #${OVERLAY_ID} .enemy-card {
          grid-template-columns: 1fr;
        }
        #${OVERLAY_ID} .enemy-preview {
          flex-direction: row;
          align-items: center;
        }
        #${OVERLAY_ID} .field-grid {
          grid-template-columns: repeat(3, minmax(68px, 1fr));
        }
      }
    </style>
    <div class="grid">
      <div class="panel">
        <div class="header-row">
          <div class="headline">
            <h3>Enemy Editor</h3>
            <p>Tune combat stats, preview sprites clearly, and manage tags without spreadsheet clutter.</p>
          </div>
          <div class="controls">
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button id="ee-save">Save</button>
              <button id="ee-export" class="secondary">Export file</button>
              <button id="ee-close" class="secondary">Close (Esc)</button>
            </div>
          </div>
        </div>
        <div class="toolbar">
          <div class="toolbar-left">
            <input type="text" id="ee-search" class="search" placeholder="Search enemies...">
            <div class="status" id="ee-status"></div>
          </div>
        </div>
        <div class="list-wrap">
          <div id="ee-list" class="enemy-list"></div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const els = {
    search: overlay.querySelector("#ee-search"),
    status: overlay.querySelector("#ee-status"),
    save: overlay.querySelector("#ee-save"),
    exportBtn: overlay.querySelector("#ee-export"),
    close: overlay.querySelector("#ee-close"),
    list: overlay.querySelector("#ee-list"),
  };
  let spriteRafId = null;
  let spriteCells = new Map();
  let projectileThumbCells = new Map();
  let projectileThumbCounter = 0;
  const spriteBoundsCache = new Map();

  function setStatus(text, isError = false) {
    if (!els.status) return;
    els.status.textContent = text || "";
    els.status.style.color = isError ? "#ffb3b3" : "#9bf0ff";
  }

  function ensureEnemy(key) {
    state.cfg.catalog = state.cfg.catalog || {};
    if (!state.cfg.catalog[key]) {
      const base = (baseCatalog() || {})[key] || {};
      state.cfg.catalog[key] = deepClone(base);
    }
    return state.cfg.catalog[key];
  }

  function getClipForEnemy(key) {
    const assets = bindings.getAssets ? bindings.getAssets() : null;
    const enemyClips = assets?.enemies?.[key] || null;
    if (!enemyClips) return null;
    return enemyClips.idle || enemyClips.walk || enemyClips.attack || null;
  }

  function getClipForProjectile(key) {
    if (!key) return null;
    const assets = bindings.getAssets ? bindings.getAssets() : null;
    return assets?.projectiles?.[key] || null;
  }

  function getEnemyScale(key) {
    const def = ensureEnemy(key);
    return def && Number.isFinite(def.scale) ? def.scale : 1;
  }

  function getWorldScale() {
    const projectileSettings =
      (typeof window !== "undefined" && window.BattlechurchProjectileConfig) || {};
    const explicitScale =
      projectileSettings.worldScale ??
      ((typeof window !== "undefined" && window.__BATTLECHURCH_WORLD_SCALE !== undefined)
        ? Number(window.__BATTLECHURCH_WORLD_SCALE)
        : NaN);
    return Number.isFinite(explicitScale) && explicitScale > 0 ? explicitScale : 0.75;
  }

  function getTrimmedSpriteBounds(key, clip) {
    const cacheKey = `${key}:${clip?.image?.src || "no-image"}:${clip?.frameWidth || 0}:${clip?.frameHeight || 0}`;
    if (spriteBoundsCache.has(cacheKey)) return spriteBoundsCache.get(cacheKey);
    const fallback = {
      x: 0,
      y: 0,
      width: clip?.frameWidth || SPRITE_CELL_SIZE,
      height: clip?.frameHeight || SPRITE_CELL_SIZE,
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

  function getTrueScaleMetrics(key) {
    const clip = getClipForEnemy(key);
    if (!clip || !clip.frameWidth || !clip.frameHeight) {
      return {
        clip,
        bounds: { x: 0, y: 0, width: SPRITE_CELL_SIZE, height: SPRITE_CELL_SIZE },
        baseScale: 1,
        catalogScale: getEnemyScale(key),
        worldScale: getWorldScale(),
        finalScale: 1,
        drawW: SPRITE_CELL_SIZE,
        drawH: SPRITE_CELL_SIZE,
      };
    }
    const bounds = getTrimmedSpriteBounds(key, clip);
    const baseScale = Number.isFinite(clip.renderScale) ? clip.renderScale : 1;
    const catalogScale = getEnemyScale(key);
    const worldScale = getWorldScale();
    const finalScale = baseScale * catalogScale * worldScale;
    return {
      clip,
      bounds,
      baseScale,
      catalogScale,
      worldScale,
      finalScale,
      drawW: Math.max(1, bounds.width * finalScale),
      drawH: Math.max(1, bounds.height * finalScale),
    };
  }

  function createSpriteCell(key) {
    const wrap = document.createElement("div");
    wrap.className = "sprite-frame";
    const canvas = document.createElement("canvas");
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const metrics = getTrueScaleMetrics(key);
    const frameWidth = Math.max(SPRITE_CELL_SIZE, Math.ceil(metrics.drawW) + 24);
    const frameHeight = Math.max(SPRITE_CELL_SIZE, Math.ceil(metrics.drawH) + 24);
    canvas.width = Math.floor(frameWidth * dpr);
    canvas.height = Math.floor(frameHeight * dpr);
    canvas.style.width = `${frameWidth}px`;
    canvas.style.height = `${frameHeight}px`;
    wrap.style.width = `${frameWidth}px`;
    wrap.style.height = `${frameHeight}px`;
    wrap.appendChild(canvas);
    spriteCells.set(key, {
      key,
      canvas,
      ctx: canvas.getContext("2d"),
      width: frameWidth,
      height: frameHeight,
      dpr,
    });
    return wrap;
  }

  function drawSpriteCell(entry, nowMs) {
    const { key, ctx, canvas, width, height, dpr } = entry;
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const metrics = getTrueScaleMetrics(key);
    const clip = metrics.clip;
    if (!clip || !clip.image || !clip.frameWidth || !clip.frameHeight) {
      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
      return;
    }
    const frameMap = Array.isArray(clip.frameMap) && clip.frameMap.length ? clip.frameMap : null;
    const frameCount = frameMap ? frameMap.length : clip.frameCount || 1;
    const rate = clip.frameRate && clip.frameRate > 0 ? clip.frameRate : SPRITE_FRAME_RATE;
    const frameIndex = Math.floor((nowMs / 1000) * rate) % Math.max(1, frameCount);
    const spriteFrame = frameMap ? frameMap[frameIndex] : frameIndex;
    const cols = Math.max(1, Math.floor(clip.image.width / clip.frameWidth));
    const sx = (spriteFrame % cols) * clip.frameWidth + metrics.bounds.x;
    const sy = Math.floor(spriteFrame / cols) * clip.frameHeight + metrics.bounds.y;
    const cellWidth = width * dpr;
    const cellHeight = height * dpr;
    const drawW = metrics.drawW * dpr;
    const drawH = metrics.drawH * dpr;
    const dx = (cellWidth - drawW) / 2;
    const dy = (cellHeight - drawH) / 2;
    ctx.drawImage(
      clip.image,
      sx,
      sy,
      metrics.bounds.width,
      metrics.bounds.height,
      dx,
      dy,
      drawW,
      drawH,
    );
  }

  function renderSprites(nowMs) {
    spriteCells.forEach((entry) => drawSpriteCell(entry, nowMs));
    projectileThumbCells.forEach((entry) => drawProjectileThumb(entry, nowMs));
  }

  function startSpriteLoop() {
    if (spriteRafId) return;
    const tick = (nowMs) => {
      if (overlay.style.display !== "block") {
        spriteRafId = null;
        return;
      }
      renderSprites(nowMs);
      spriteRafId = requestAnimationFrame(tick);
    };
    spriteRafId = requestAnimationFrame(tick);
  }

  function stopSpriteLoop() {
    if (!spriteRafId) return;
    cancelAnimationFrame(spriteRafId);
    spriteRafId = null;
  }

  function createProjectileThumbCell(projectileKey, size = 34) {
    const wrap = document.createElement("div");
    wrap.className = "projectile-thumb";
    const canvas = document.createElement("canvas");
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.floor(size * dpr);
    canvas.height = Math.floor(size * dpr);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    wrap.appendChild(canvas);
    const id = `projectile-${projectileThumbCounter += 1}`;
    projectileThumbCells.set(id, {
      id,
      projectileKey,
      canvas,
      ctx: canvas.getContext("2d"),
      size,
      dpr,
    });
    return wrap;
  }

  function drawProjectileThumb(entry, nowMs) {
    const { projectileKey, ctx, canvas, size, dpr } = entry;
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const clip = getClipForProjectile(projectileKey);
    const cellSize = size * dpr;
    if (!clip) {
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }
    if (Array.isArray(clip.frames) && clip.frames.length) {
      const rate = clip.frameRate && clip.frameRate > 0 ? clip.frameRate : SPRITE_FRAME_RATE;
      const frameIndex = Math.floor((nowMs / 1000) * rate) % Math.max(1, clip.frames.length);
      const frame = clip.frames[frameIndex];
      if (!frame) return;
      const scale = Math.min(cellSize / Math.max(1, frame.width), cellSize / Math.max(1, frame.height)) * 0.9;
      const drawW = frame.width * scale;
      const drawH = frame.height * scale;
      ctx.drawImage(frame, (cellSize - drawW) / 2, (cellSize - drawH) / 2, drawW, drawH);
      return;
    }
    if (!clip.image || !clip.frameWidth || !clip.frameHeight) {
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }
    const frameMap = Array.isArray(clip.frameMap) && clip.frameMap.length ? clip.frameMap : null;
    const cols = Math.max(1, Math.floor(clip.image.width / clip.frameWidth));
    const totalFrames = frameMap ? frameMap.length : Math.max(1, clip.frameCount || cols * Math.max(1, Math.floor(clip.image.height / clip.frameHeight)));
    const rate = clip.frameRate && clip.frameRate > 0 ? clip.frameRate : SPRITE_FRAME_RATE;
    const frameIndex = Math.floor((nowMs / 1000) * rate) % Math.max(1, totalFrames);
    const spriteFrame = frameMap ? frameMap[frameIndex] : frameIndex;
    const sx = (spriteFrame % cols) * clip.frameWidth;
    const sy = Math.floor(spriteFrame / cols) * clip.frameHeight;
    const scale = Math.min(cellSize / Math.max(1, clip.frameWidth), cellSize / Math.max(1, clip.frameHeight)) * 0.9;
    const drawW = clip.frameWidth * scale;
    const drawH = clip.frameHeight * scale;
    ctx.drawImage(
      clip.image,
      sx,
      sy,
      clip.frameWidth,
      clip.frameHeight,
      (cellSize - drawW) / 2,
      (cellSize - drawH) / 2,
      drawW,
      drawH,
    );
  }

  function createField(label, modifierClass = "", options = {}) {
    const field = document.createElement("div");
    field.className = `field${modifierClass ? ` ${modifierClass}` : ""}`;
    const labelEl = document.createElement("div");
    labelEl.className = "field-label";
    labelEl.textContent = label;
    if (options.locked) {
      field.classList.add("is-locked");
      const lock = document.createElement("span");
      lock.className = "field-lock";
      lock.textContent = "Code";
      labelEl.appendChild(lock);
    }
    field.appendChild(labelEl);
    if (options.note) {
      const note = document.createElement("div");
      note.className = "field-note";
      note.textContent = options.note;
      field.appendChild(note);
    }
    return field;
  }

  function createNumberInput(key, field, label, modifierClass = "") {
    const enemy = ensureEnemy(key);
    const locked = isProtectedCatalogField(key, field);
    const wrapper = createField(label, modifierClass, {
      locked,
      note: locked ? "Controlled by enemy-specific code." : "",
    });
    const input = document.createElement("input");
    input.type = "number";
    input.value = enemy[field] ?? "";
    input.disabled = locked;
    input.addEventListener("change", () => {
      const val = input.value === "" ? null : Number(input.value);
      if (val === null || Number.isNaN(val)) delete enemy[field];
      else enemy[field] = val;
    });
    wrapper.appendChild(input);
    return wrapper;
  }

  function createDamageInput(key, field, label, fallbackField = "damage", modifierClass = "") {
    const enemy = ensureEnemy(key);
    const locked = isProtectedCatalogField(key, field);
    const wrapper = createField(label, modifierClass, {
      locked,
      note: locked ? "Controlled by enemy-specific code." : "",
    });
    const input = document.createElement("input");
    input.type = "number";
    const initialValue =
      enemy[field] ?? (fallbackField && enemy[fallbackField] !== undefined ? enemy[fallbackField] : "");
    input.value = initialValue;
    input.disabled = locked;
    input.addEventListener("change", () => {
      const val = input.value === "" ? null : Number(input.value);
      if (val === null || Number.isNaN(val)) delete enemy[field];
      else enemy[field] = val;
    });
    wrapper.appendChild(input);
    return wrapper;
  }

  function getProjectileKeys() {
    const cfg = (typeof window !== "undefined" && window.BattlechurchProjectileConfig?.config) || {};
    return Object.keys(cfg).sort();
  }

  function getProjectileConfig() {
    return (typeof window !== "undefined" && window.BattlechurchProjectileConfig?.config) || {};
  }

  function formatProjectileLabel(projectileKey) {
    if (!projectileKey) return "Default";
    const cfg = getProjectileConfig();
    const displayName = cfg?.[projectileKey]?.displayName;
    if (displayName) return displayName;
    return String(projectileKey)
      .replace(/_/g, " ")
      .replace(/([A-Z])/g, " $1")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^./, (s) => s.toUpperCase());
  }

  function getProjectileBehaviorNote(key, enemy) {
    if (!enemy?.ranged) {
      return "Projectile selection only applies to ranged enemies.";
    }
    if (key === "miniDemonLord") {
      return "Uses the selected projectile type as a base, but the actual attack is a custom charging fire orb with specialized throw timing and jump behavior.";
    }
    if (key === "miniDemonFireThrower") {
      return "Uses the selected projectile visuals from the dropdown, but keeps custom lob, landing, and arming behavior in code.";
    }
    if (key === "miniDemonFireKeeper") {
      return "Uses the selected projectile type as a base, but release timing and projectile presentation are customized in code.";
    }
    return "Pick the projectile this ranged enemy fires. Specialized enemies may still override timing or visuals in code.";
  }

  function formatEnemyRoleLabel(enemy) {
    if (!enemy) return "Normal";
    if (enemy.ranged) return "Ranged";
    const damageClass = String(enemy.damageClass || "").toLowerCase();
    if (damageClass === "tank") return "Tank";
    if (damageClass === "armored") return "Armored";
    return "Melee";
  }

  function getEnemySpecialWiringLabels(key, enemy) {
    const labels = [];
    const behaviors = new Set(Array.isArray(enemy?.specialBehavior) ? enemy.specialBehavior : []);
    if (enemy?.ranged) labels.push("Projectile user");
    if (behaviors.has("boss")) labels.push("Boss behavior");
    if (behaviors.has("closestAny")) labels.push("Targets player or NPCs");
    if (behaviors.has("preferEdges")) labels.push("Prefers arena edges");
    if (behaviors.has("swarmable")) labels.push("Swarm spacing logic");
    if (key === "miniDemonLord") labels.push("Custom charge orb + jump");
    if (key === "miniDemonFireThrower") labels.push("Custom lob arc + arming");
    if (key === "miniDemonFireKeeper") labels.push("Custom materialize + cast phases");
    if (key === "miniDemoness") labels.push("Custom grab / whip behavior");
    if (key === "tormentorFlame" || behaviors.has("tormentorFlame")) labels.push("Custom flame visuals");
    return labels;
  }

  function getEnemySummaryText(key, enemy) {
    const role = formatEnemyRoleLabel(enemy);
    const projectile = enemy?.ranged
      ? formatProjectileLabel(enemy?.projectileType || "")
      : "no projectile";
    const damageClass = String(enemy?.damageClass || "normal").toLowerCase();
    const parts = [
      `${role} enemy`,
      enemy?.ranged ? `fires ${projectile.toLowerCase()}` : "uses direct contact / attack damage",
    ];
    if (damageClass !== "normal") {
      parts.push(`${damageClass} damage class`);
    }
    const specialLabels = getEnemySpecialWiringLabels(key, enemy).filter((label) =>
      label.startsWith("Custom") || label.endsWith("behavior") || label.endsWith("phases"),
    );
    if (specialLabels.length) {
      parts.push(`special wiring: ${specialLabels.join(", ").toLowerCase()}`);
    }
    return parts.join(" • ");
  }

  function getSpecialMovementLines(key, enemy) {
    const lines = [];
    if (key === "miniDemonLord") {
      lines.push("Jump reposition after fireball release.");
      lines.push("Jump cooldown: 2.4s.");
      lines.push("Jump duration: 0.58s with arc lift 22px.");
      lines.push("Jump target distance: 220-400px around target.");
      lines.push(`Combat spacing envelope: ${enemy?.desiredRange || 0}px desired range.`);
    }
    if (key === "miniDemonFireThrower") {
      lines.push("Prefers edge positions while kiting.");
      lines.push(`Keeps distance around ${enemy?.desiredRange || 0}px before lobbing.`);
      lines.push("One active bomb at a time.");
    }
    if (key === "miniDemonFireKeeper") {
      lines.push("Cycles through hidden, materialize, casting, linger, and dematerialize phases.");
      lines.push("Hidden phase: 0.95s base, then teleports to a new edge position.");
      lines.push("Materialize: 0.24s.");
      lines.push("Pre-cast hold: 0.8s.");
      lines.push("Post-cast linger: 1.15s.");
      lines.push("Dematerialize: 0.62s.");
      lines.push(`Cast range check: about ${Math.round((enemy?.desiredRange || 360) * 1.2)}px.`);
    }
    if (key === "miniDemoness") {
      lines.push("No special movement routine; behavior is attack-state driven.");
      lines.push(`Approaches whip targets until about ${240}px.`);
      lines.push("Drags lassoed targets inward at 86px/s.");
      lines.push("Maintains drain contact around 34px.");
    }
    return lines;
  }

  function getSpecialAttackLines(key, enemy) {
    const lines = [];
    if (key === "miniDemonLord") {
      lines.push("Charge orb attack uses attack frames 1-7 and releases on frame 8.");
      lines.push(`Projectile base type: ${formatProjectileLabel(enemy?.projectileType || "")}.`);
      lines.push("Thrown orb deals 5 damage and uses reduced projectile speed.");
    }
    if (key === "miniDemonFireThrower") {
      lines.push("Lobs a bomb using the selected projectile as the visual/base payload.");
      lines.push(`Release frame: ${enemy?.attackHitFrame ?? 5}.`);
      lines.push("Flight duration: 0.58s.");
      lines.push("Arming duration after landing: 2.1s.");
      lines.push("Landing explosion damage: 5.");
      lines.push("Landing explosion radius: max(projectile radius x2.1, 34px).");
    }
    if (key === "miniDemonFireKeeper") {
      lines.push("Uses the selected projectile with custom cast timing and optional visual override.");
      lines.push(`Release frame: ${enemy?.attackHitFrame ?? 5}.`);
      lines.push("Cannot be damaged while hidden.");
      lines.push("If projectile type is Faith Cannon, cast visuals are replaced with custom frames and speed is reduced to 82%.");
    }
    if (key === "miniDemoness") {
      lines.push("Whip lasso attack uses a custom attack clip.");
      lines.push("Whip hit frame: 5.");
      lines.push("Whip range: 240px plus target radius padding.");
      lines.push("Drain tick interval: 0.34s.");
      lines.push("Drain total before release: 30 faith.");
      lines.push("Break cooldown after melee interruption: 3.0s.");
      lines.push("Current drain effect: target loses 1 faith per tick sequence until release threshold, not HP damage.");
    }
    return lines;
  }

  function createSpecialBehaviorDetails(label, lines) {
    const wrapper = createField(label, "field--quarter");
    const details = document.createElement("details");
    details.className = "special-details";
    const summary = document.createElement("summary");
    summary.textContent = `${label} (${lines.length})`;
    details.appendChild(summary);
    const list = document.createElement("ul");
    list.className = "special-list";
    if (!lines.length) {
      const item = document.createElement("li");
      item.textContent = "None";
      list.appendChild(item);
    } else {
      lines.forEach((line) => {
        const item = document.createElement("li");
        item.textContent = line;
        list.appendChild(item);
      });
    }
    details.appendChild(list);
    wrapper.appendChild(details);
    return wrapper;
  }

  function createEnemySummary(key) {
    const enemy = ensureEnemy(key);
    const wrapper = document.createElement("div");
    wrapper.className = "enemy-summary";
    const title = document.createElement("div");
    title.className = "enemy-summary-title";
    title.textContent = "At a Glance";
    wrapper.appendChild(title);

    const badgeRow = document.createElement("div");
    badgeRow.className = "enemy-summary-badges";
    const badges = [
      formatEnemyRoleLabel(enemy),
      enemy?.ranged ? `Projectile: ${formatProjectileLabel(enemy.projectileType || "")}` : "Projectile: none",
      ...getEnemySpecialWiringLabels(key, enemy),
    ];
    badges.forEach((label) => {
      const badge = document.createElement("div");
      badge.className = "enemy-badge";
      badge.textContent = label;
      badgeRow.appendChild(badge);
    });
    wrapper.appendChild(badgeRow);

    const text = document.createElement("div");
    text.className = "enemy-summary-text";
    text.textContent = getEnemySummaryText(key, enemy);
    wrapper.appendChild(text);
    return wrapper;
  }

  function createProjectileSelect(key) {
    const locked = isProtectedCatalogField(key, "projectileType");
    const wrapper = createField("Projectile", "field--wide", {
      locked,
      note: locked ? "Projectile behavior is code-owned for this enemy." : "",
    });
    const enemy = ensureEnemy(key);
    const details = document.createElement("details");
    details.className = "tags-dropdown projectile-picker";
    const summary = document.createElement("summary");
    const summaryThumb = createProjectileThumbCell(enemy.projectileType || "", 34);
    const summaryLabel = document.createElement("div");
    summaryLabel.className = "projectile-picker-label";
    summaryLabel.textContent = formatProjectileLabel(enemy.projectileType || "");
    summary.appendChild(summaryThumb);
    summary.appendChild(summaryLabel);
    details.appendChild(summary);

    const panel = document.createElement("div");
    panel.className = "projectile-picker-panel";
    const options = ["", ...getProjectileKeys()];
    options.forEach((projectileKey) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "projectile-option";
      if ((enemy.projectileType || "") === projectileKey) {
        button.classList.add("is-selected");
      }
      button.appendChild(createProjectileThumbCell(projectileKey || "", 34));
      const textWrap = document.createElement("div");
      textWrap.className = "projectile-option-text";
      const title = document.createElement("div");
      title.className = "projectile-option-title";
      title.textContent = formatProjectileLabel(projectileKey);
      const keyText = document.createElement("div");
      keyText.className = "projectile-option-key";
      keyText.textContent = projectileKey || "(uses enemy default)";
      textWrap.appendChild(title);
      textWrap.appendChild(keyText);
      button.appendChild(textWrap);
      button.disabled = locked;
      if (!locked) {
        button.addEventListener("click", () => {
          enemy.projectileType = projectileKey || null;
          details.open = false;
          renderTable();
        });
      }
      panel.appendChild(button);
    });
    details.appendChild(panel);
    wrapper.appendChild(details);
    const note = document.createElement("div");
    note.className = locked ? "field-note" : "muted";
    note.style.fontSize = "11px";
    note.style.lineHeight = "1.35";
    note.textContent = locked
      ? "Editor saves preserve the source projectile definition for this enemy."
      : getProjectileBehaviorNote(key, enemy);
    wrapper.appendChild(note);
    return wrapper;
  }

  function createDamageClassSelect(key) {
    const locked = isProtectedCatalogField(key, "damageClass");
    const wrapper = createField("Class", "", {
      locked,
      note: locked ? "Controlled by enemy-specific code." : "",
    });
    const enemy = ensureEnemy(key);
    const select = document.createElement("select");
    ["normal", "tank", "armored"].forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value[0].toUpperCase() + value.slice(1);
      select.appendChild(option);
    });
    select.value = (enemy.damageClass || "normal").toLowerCase();
    select.disabled = locked;
    if (!locked) {
      select.addEventListener("change", () => {
        const next = (select.value || "normal").toLowerCase();
        if (next === "normal") {
          delete enemy.damageClass;
        } else {
          enemy.damageClass = next;
        }
      });
    }
    wrapper.appendChild(select);
    return wrapper;
  }

  function createTagsCell(key) {
    const enemy = ensureEnemy(key);
    const tags = new Set(sanitizeSpecialBehavior(enemy.specialBehavior));
    if (enemy.ranged) tags.add("ranged");
    const locked = isProtectedCatalogField(key, "specialBehavior");
    const wrapper = createField("Tags", "field--wide", {
      locked,
      note: locked ? "Behavior tags are code-owned for this enemy." : "",
    });
    const details = document.createElement("details");
    details.className = "tags-dropdown";
    const summary = document.createElement("summary");
    const selected = Array.from(tags);
    summary.textContent = selected.length ? selected.join(", ") : "Select behavior tags";
    details.appendChild(summary);
    const panel = document.createElement("div");
    panel.className = "tag-panel";
    TAGS.forEach((tag) => {
      const label = document.createElement("label");
      label.className = "tag-chip";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = tags.has(tag);
      cb.disabled = locked;
      if (!locked) {
        cb.addEventListener("change", () => {
          if (cb.checked) tags.add(tag);
          else tags.delete(tag);
          enemy.specialBehavior = sanitizeSpecialBehavior(Array.from(tags));
          enemy.ranged = tags.has("ranged");
          const updated = sanitizeSpecialBehavior(Array.from(tags));
          summary.textContent = updated.length ? updated.join(", ") : "Select behavior tags";
          renderTable(); // refresh to reflect swarm spacing availability
        });
      }
      label.appendChild(cb);
      label.append(" " + tag);
      panel.appendChild(label);
    });
    details.appendChild(panel);
    wrapper.appendChild(details);
    return wrapper;
  }

  function createSwarmSpacingCell(key) {
    const enemy = ensureEnemy(key);
    const tags = new Set(enemy.specialBehavior || []);
    const isSwarmable = tags.has("swarmable");
    const wrapper = createField("Swarm Spacing");
    const input = document.createElement("input");
    input.type = "number";
    input.min = "0.1";
    input.max = "5";
    input.step = "0.05";
    input.placeholder = isSwarmable ? "1" : "n/a";
    input.disabled = !isSwarmable;
    input.value = isSwarmable && enemy.swarmSpacing !== undefined ? enemy.swarmSpacing : "";
    input.addEventListener("change", () => {
      const val = input.value === "" ? null : Number(input.value);
      if (val === null || Number.isNaN(val)) {
        delete enemy.swarmSpacing;
      } else {
        enemy.swarmSpacing = Math.max(0.1, Math.min(5, val));
      }
    });
    wrapper.appendChild(input);
    return wrapper;
  }

  function renderRow(key) {
    const enemy = ensureEnemy(key);
    if (!enemy) return;
    const card = document.createElement("div");
    card.className = "enemy-card";

    const preview = document.createElement("div");
    preview.className = "enemy-preview";
    preview.appendChild(createSpriteCell(key));
    const previewMeta = document.createElement("div");
    previewMeta.className = "preview-meta";
    const name = document.createElement("div");
    name.className = "enemy-name";
    name.textContent = (enemy.displayName || key).replace(/([A-Z])/g, " $1").trim();
    const keyText = document.createElement("div");
    keyText.className = "enemy-key";
    keyText.textContent = key;
    const scaleNote = document.createElement("div");
    scaleNote.className = "enemy-scale-note";
    const metrics = getTrueScaleMetrics(key);
    scaleNote.textContent = `True scale ${metrics.finalScale.toFixed(2)}x`;
    previewMeta.appendChild(name);
    previewMeta.appendChild(keyText);
    previewMeta.appendChild(scaleNote);
    preview.appendChild(previewMeta);

    const main = document.createElement("div");
    main.className = "enemy-main";
    main.appendChild(createEnemySummary(key));

    const grid = document.createElement("div");
    grid.className = "field-grid";
    grid.appendChild(createDamageClassSelect(key));
    grid.appendChild(createNumberInput(key, "health", "HP"));
    grid.appendChild(createDamageInput(key, "contactDamage", "Contact"));
    grid.appendChild(createDamageInput(key, "attackDamage", "Attack"));
    grid.appendChild(createNumberInput(key, "speed", "Speed"));
    grid.appendChild(createNumberInput(key, "cooldown", "Cooldown"));
    grid.appendChild(createNumberInput(key, "scale", "Scale"));
    grid.appendChild(createSwarmSpacingCell(key));
    grid.appendChild(createTagsCell(key));
    if (enemy.ranged) {
      grid.appendChild(createProjectileSelect(key));
    }
    grid.appendChild(createSpecialBehaviorDetails("Special Movement", getSpecialMovementLines(key, enemy)));
    grid.appendChild(createSpecialBehaviorDetails("Special Attack", getSpecialAttackLines(key, enemy)));
    main.appendChild(grid);

    card.appendChild(preview);
    card.appendChild(main);
    els.list.appendChild(card);
  }

  function renderTable() {
    spriteCells = new Map();
    projectileThumbCells = new Map();
    els.list.innerHTML = "";
    const keys = Object.keys(state.cfg.catalog || {}).sort();
    keys.forEach((key) => {
      if (state.search) {
        const haystack = `${key} ${(state.cfg.catalog[key]?.displayName || "")}`.toLowerCase();
        if (!haystack.includes(state.search)) return;
      }
      renderRow(key);
    });
    startSpriteLoop();
  }

  function show() {
    state.cfg = loadConfig();
    state.search = "";
    if (els.search) els.search.value = "";
    overlay.style.display = "block";
    renderTable();
    setStatus("");
  }

  function hide() {
    overlay.style.display = "none";
    setStatus("");
    stopSpriteLoop();
  }

  function handleSave() {
    const ok = saveConfig(state.cfg);
    if (ok) {
      const now = new Date();
      const stamp = `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes(),
      ).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
      setStatus(`Saved ${stamp} — exporting enemy_catalog.js`);
      exportFile(state.cfg);
      renderTable();
    } else {
      setStatus("Save failed", true);
    }
  }

  if (els.search) {
    els.search.addEventListener("input", () => {
      state.search = String(els.search.value || "").trim().toLowerCase();
      renderTable();
    });
  }
  if (els.save) els.save.addEventListener("click", handleSave);
  if (els.exportBtn) {
    els.exportBtn.addEventListener("click", () => exportFile(state.cfg));
  }
  if (els.close) els.close.addEventListener("click", hide);

  document.addEventListener("keydown", (e) => {
    if (
      e.key &&
      e.key.toLowerCase() === HOTKEY &&
      e.shiftKey &&
      e.ctrlKey &&
      !overlay.contains(document.activeElement)
    ) {
      e.preventDefault();
      show();
    }
    if (e.key === "Escape" && overlay.style.display === "block") {
      hide();
    }
  });

  window.BattlechurchEnemyEditor = {
    initialize(options = {}) {
      bindings.getAssets = options.getAssets || bindings.getAssets;
    },
    show,
    hide,
    getConfig: () => state.cfg,
    save: handleSave,
  };
})(typeof window !== "undefined" ? window : null, typeof document !== "undefined" ? document : null);
