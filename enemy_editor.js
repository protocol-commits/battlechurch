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
    "mini",
    "preferEdges",
    "closestAny",
  ];

  function deepClone(obj) {
    return obj ? JSON.parse(JSON.stringify(obj)) : obj;
  }

  const bindings = {
    getAssets: () => null,
  };

  function baseCatalog() {
    return deepClone((window.BattlechurchEnemyCatalog && window.BattlechurchEnemyCatalog.catalog) || {});
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
      cfg = { catalog: baseCatalog(), hiddenEnemies: [] };
    }
    const base = baseCatalog();
    cfg.catalog = cfg.catalog || base;
    const allowedKeys = new Set(Object.keys(base));
    const assetKeys = ["assetFolder", "assetBaseName", "assetPath", "assetFiles"];
    // Merge in any newly added enemies from the base catalog so they appear in the editor.
    Object.keys(base).forEach((key) => {
      if (!cfg.catalog[key]) {
        cfg.catalog[key] = deepClone(base[key]);
        return;
      }
      const baseEntry = base[key] || {};
      const localEntry = cfg.catalog[key] || {};
      const merged = { ...deepClone(baseEntry), ...deepClone(localEntry) };
      assetKeys.forEach((assetKey) => {
        if (baseEntry && baseEntry[assetKey] !== undefined) {
          merged[assetKey] = deepClone(baseEntry[assetKey]);
        }
      });
      cfg.catalog[key] = merged;
    });
    // Drop any catalog entries that no longer exist in the base catalog.
    Object.keys(cfg.catalog).forEach((key) => {
      if (!allowedKeys.has(key)) {
        delete cfg.catalog[key];
      }
    });
    cfg.hiddenEnemies = Array.isArray(cfg.hiddenEnemies) ? cfg.hiddenEnemies : [];
    cfg.hiddenEnemies = cfg.hiddenEnemies.filter(
      (key) =>
        !["armoredOrc", "armoredSkeleton", "armoredAxeman", "armoredEliteOrc", "orc"].includes(
          key,
        ),
    );
    cfg.hiddenEnemies = cfg.hiddenEnemies.filter((key) => allowedKeys.has(key));
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
    showHidden: false,
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
        width: ${SPRITE_CELL_SIZE}px;
        height: ${SPRITE_CELL_SIZE}px;
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
      #${OVERLAY_ID} .enemy-main {
        display: flex;
        flex-direction: column;
        gap: 12px;
        min-width: 0;
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
        grid-template-columns: repeat(6, minmax(90px, 1fr));
        gap: 10px 12px;
      }
      #${OVERLAY_ID} .field {
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 0;
      }
      #${OVERLAY_ID} .field--wide {
        grid-column: span 2;
      }
      #${OVERLAY_ID} .field-label {
        font: 700 10px "Trebuchet MS", Arial, sans-serif;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: rgba(232, 244, 255, 0.58);
      }
      #${OVERLAY_ID} input[type="number"],
      #${OVERLAY_ID} select,
      #${OVERLAY_ID} details summary {
        width: 100%;
        min-width: 0;
        padding: 9px 10px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,0.16);
        background: rgba(255,255,255,0.07);
        color: #e8f4ff;
        box-sizing: border-box;
        font: 600 13px "Trebuchet MS", Arial, sans-serif;
      }
      #${OVERLAY_ID} details.tags-dropdown summary {
        list-style: none;
        cursor: pointer;
      }
      #${OVERLAY_ID} details.tags-dropdown summary::-webkit-details-marker {
        display: none;
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
      #${OVERLAY_ID} .muted {
        color: rgba(232, 244, 255, 0.55);
      }
      @media (max-width: 1200px) {
        #${OVERLAY_ID} .field-grid {
          grid-template-columns: repeat(3, minmax(90px, 1fr));
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
          grid-template-columns: repeat(2, minmax(90px, 1fr));
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
            <label style="display:flex;align-items:center;gap:6px;font:600 12px Trebuchet MS, Arial, sans-serif;">
              <input type="checkbox" id="ee-showHidden">
              Show hidden
            </label>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button id="ee-save">Save</button>
              <button id="ee-export" class="secondary">Export file</button>
              <button id="ee-print-hidden" class="secondary">Print hidden</button>
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
    showHidden: overlay.querySelector("#ee-showHidden"),
    search: overlay.querySelector("#ee-search"),
    status: overlay.querySelector("#ee-status"),
    save: overlay.querySelector("#ee-save"),
    exportBtn: overlay.querySelector("#ee-export"),
    printHidden: overlay.querySelector("#ee-print-hidden"),
    close: overlay.querySelector("#ee-close"),
    list: overlay.querySelector("#ee-list"),
  };
  let spriteRafId = null;
  let spriteCells = new Map();

  function setStatus(text, isError = false) {
    if (!els.status) return;
    els.status.textContent = text || "";
    els.status.style.color = isError ? "#ffb3b3" : "#9bf0ff";
  }

  function markHidden(key, hidden) {
    const list = new Set(state.cfg.hiddenEnemies || []);
    if (hidden) list.add(key);
    else list.delete(key);
    state.cfg.hiddenEnemies = Array.from(list);
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

  function getEnemyScale(key) {
    const def = ensureEnemy(key);
    return def && Number.isFinite(def.scale) ? def.scale : 1;
  }

  function createSpriteCell(key) {
    const wrap = document.createElement("div");
    wrap.className = "sprite-frame";
    const canvas = document.createElement("canvas");
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const size = SPRITE_CELL_SIZE;
    canvas.width = Math.floor(size * dpr);
    canvas.height = Math.floor(size * dpr);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    wrap.appendChild(canvas);
    spriteCells.set(key, { key, canvas, ctx: canvas.getContext("2d"), size, dpr });
    return wrap;
  }

  function drawSpriteCell(entry, nowMs) {
    const { key, ctx, canvas, size, dpr } = entry;
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const clip = getClipForEnemy(key);
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
    const sx = (spriteFrame % cols) * clip.frameWidth;
    const sy = Math.floor(spriteFrame / cols) * clip.frameHeight;
    const cellSize = size * dpr;
    const maxDraw = cellSize - 6 * dpr;
    const baseScale = Number.isFinite(clip.renderScale) ? clip.renderScale : 1;
    const catalogScale = getEnemyScale(key);
    const maxScale = Math.min(
      maxDraw / clip.frameWidth,
      maxDraw / clip.frameHeight,
    );
    const finalScale = Math.min(baseScale * catalogScale, maxScale);
    const drawW = clip.frameWidth * finalScale;
    const drawH = clip.frameHeight * finalScale;
    const dx = (cellSize - drawW) / 2;
    const dy = (cellSize - drawH) / 2;
    ctx.drawImage(
      clip.image,
      sx,
      sy,
      clip.frameWidth,
      clip.frameHeight,
      dx,
      dy,
      drawW,
      drawH,
    );
  }

  function renderSprites(nowMs) {
    spriteCells.forEach((entry) => drawSpriteCell(entry, nowMs));
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

  function createField(label, modifierClass = "") {
    const field = document.createElement("div");
    field.className = `field${modifierClass ? ` ${modifierClass}` : ""}`;
    const labelEl = document.createElement("div");
    labelEl.className = "field-label";
    labelEl.textContent = label;
    field.appendChild(labelEl);
    return field;
  }

  function createNumberInput(key, field, label, modifierClass = "") {
    const enemy = ensureEnemy(key);
    const wrapper = createField(label, modifierClass);
    const input = document.createElement("input");
    input.type = "number";
    input.value = enemy[field] ?? "";
    input.addEventListener("change", () => {
      const val = input.value === "" ? null : Number(input.value);
      if (val === null || Number.isNaN(val)) delete enemy[field];
      else enemy[field] = val;
    });
    wrapper.appendChild(input);
    return wrapper;
  }

  function createDamageClassSelect(key) {
    const wrapper = createField("Class");
    const enemy = ensureEnemy(key);
    const select = document.createElement("select");
    ["normal", "tank", "armored"].forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value[0].toUpperCase() + value.slice(1);
      select.appendChild(option);
    });
    select.value = (enemy.damageClass || "normal").toLowerCase();
    select.addEventListener("change", () => {
      const next = (select.value || "normal").toLowerCase();
      if (next === "normal") {
        delete enemy.damageClass;
      } else {
        enemy.damageClass = next;
      }
    });
    wrapper.appendChild(select);
    return wrapper;
  }

  function createTagsCell(key) {
    const enemy = ensureEnemy(key);
    const tags = new Set(enemy.specialBehavior || []);
    if (enemy.ranged) tags.add("ranged");
    const wrapper = createField("Tags", "field--wide");
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
      cb.addEventListener("change", () => {
        if (cb.checked) tags.add(tag);
        else tags.delete(tag);
        enemy.specialBehavior = Array.from(tags);
        enemy.ranged = tags.has("ranged");
        const updated = Array.from(tags);
        summary.textContent = updated.length ? updated.join(", ") : "Select behavior tags";
        renderTable(); // refresh to reflect swarm spacing availability
      });
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

  function createHiddenToggle(key) {
    const wrap = document.createElement("label");
    wrap.className = "muted";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = (state.cfg.hiddenEnemies || []).includes(key);
    cb.addEventListener("change", () => {
      markHidden(key, cb.checked);
      renderTable();
    });
    wrap.appendChild(cb);
    wrap.append(" Hidden");
    return wrap;
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
    previewMeta.appendChild(name);
    previewMeta.appendChild(keyText);
    preview.appendChild(previewMeta);

    const main = document.createElement("div");
    main.className = "enemy-main";
    const topbar = document.createElement("div");
    topbar.className = "enemy-topbar";
    const toggles = document.createElement("div");
    toggles.className = "toggles";
    toggles.appendChild(createHiddenToggle(key));
    topbar.appendChild(toggles);
    main.appendChild(topbar);

    const grid = document.createElement("div");
    grid.className = "field-grid";
    grid.appendChild(createDamageClassSelect(key));
    grid.appendChild(createNumberInput(key, "health", "HP"));
    grid.appendChild(createNumberInput(key, "damage", "Damage"));
    grid.appendChild(createNumberInput(key, "speed", "Speed"));
    grid.appendChild(createNumberInput(key, "scale", "Scale"));
    grid.appendChild(createNumberInput(key, "baseRadius", "Hit Radius"));
    grid.appendChild(createNumberInput(key, "attackRange", "Attack Range"));
    grid.appendChild(createNumberInput(key, "cooldown", "Cooldown"));
    grid.appendChild(createSwarmSpacingCell(key));
    grid.appendChild(createTagsCell(key));
    main.appendChild(grid);

    card.appendChild(preview);
    card.appendChild(main);
    els.list.appendChild(card);
  }

  function renderTable() {
    spriteCells = new Map();
    els.list.innerHTML = "";
    const hidden = new Set(state.cfg.hiddenEnemies || []);
    const keys = Object.keys(state.cfg.catalog || {}).sort();
    keys.forEach((key) => {
      if (!state.showHidden && hidden.has(key)) return;
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
    state.showHidden = false;
    state.search = "";
    if (els.showHidden) els.showHidden.checked = false;
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

  if (els.showHidden) {
    els.showHidden.addEventListener("change", () => {
      state.showHidden = Boolean(els.showHidden.checked);
      renderTable();
    });
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
  if (els.printHidden) {
    els.printHidden.addEventListener("click", () => {
      const hidden = Array.isArray(state.cfg.hiddenEnemies) ? state.cfg.hiddenEnemies : [];
      console.log("EnemyEditor hiddenEnemies:", hidden);
      setStatus(`Hidden list printed to console (${hidden.length}).`);
    });
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
