(function setupEnemyEditor(window, document) {
  if (!window || !document) return;

  const STORAGE_KEY = "battlechurch.devEnemyCatalog";
  const OVERLAY_ID = "enemyEditorOverlay";
  const HOTKEY = "e";
  const TAGS = [
    "swarmable",
    "ranged",
    "npcPriority",
    "mini",
    "popcorn",
    "elite",
    "bossImmune",
    "preferEdges",
    "closestAny",
  ];

  function deepClone(obj) {
    return obj ? JSON.parse(JSON.stringify(obj)) : obj;
  }

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
    // Merge in any newly added enemies from the base catalog so they appear in the editor.
    Object.keys(base).forEach((key) => {
      if (!cfg.catalog[key]) {
        cfg.catalog[key] = deepClone(base[key]);
      }
    });
    cfg.hiddenEnemies = Array.isArray(cfg.hiddenEnemies) ? cfg.hiddenEnemies : [];
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
  };

  // UI
  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.innerHTML = `
    <style>
      #${OVERLAY_ID} {
        position: fixed;
        inset: 0;
        background: rgba(6, 10, 18, 0.94);
        color: #e8f4ff;
        font-family: "Inter", Arial, sans-serif;
        z-index: 10000;
        display: none;
        padding: 16px;
        box-sizing: border-box;
      }
      #${OVERLAY_ID} .grid {
        display: grid;
        grid-template-columns: 260px 1fr;
        gap: 12px;
        height: 100%;
      }
      #${OVERLAY_ID} .panel {
        background: rgba(18, 28, 44, 0.85);
        border: 1px solid rgba(120, 170, 220, 0.35);
        border-radius: 8px;
        padding: 10px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      #${OVERLAY_ID} h3 {
        margin: 0 0 10px 0;
        font-size: 15px;
        letter-spacing: 0.3px;
      }
      #${OVERLAY_ID} button {
        background: #2b74ff;
        color: #fff;
        border: none;
        padding: 8px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
      }
      #${OVERLAY_ID} button.secondary {
        background: rgba(255,255,255,0.08);
      }
      #${OVERLAY_ID} .controls {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      #${OVERLAY_ID} .status {
        font-size: 12px;
        color: #9bf0ff;
        min-height: 18px;
      }
      #${OVERLAY_ID} .table-wrap {
        overflow: auto;
        flex: 1;
        max-height: 100%;
      }
      #${OVERLAY_ID} table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
        table-layout: fixed;
      }
      #${OVERLAY_ID} th, #${OVERLAY_ID} td {
        padding: 4px 6px;
        border-bottom: 1px solid rgba(255,255,255,0.08);
        text-align: left;
        vertical-align: middle;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      #${OVERLAY_ID} thead th {
        position: sticky;
        top: 0;
        background: rgba(18, 28, 44, 0.95);
        z-index: 2;
      }
      #${OVERLAY_ID} input[type="number"] {
        width: 70px;
        padding: 4px 6px;
        border-radius: 4px;
        border: 1px solid rgba(255,255,255,0.18);
        background: rgba(255,255,255,0.06);
        color: #e8f4ff;
      }
      #${OVERLAY_ID} .tag-list {
        display: flex;
        flex-wrap: wrap;
        gap: 6px 10px;
      }
      #${OVERLAY_ID} .tag-list label {
        white-space: nowrap;
      }
      #${OVERLAY_ID} th:first-child, #${OVERLAY_ID} td:first-child { width: 46px; text-align:center; }
      #${OVERLAY_ID} th:nth-child(2), #${OVERLAY_ID} td:nth-child(2) { width: 120px; }
      #${OVERLAY_ID} th:nth-child(3), #${OVERLAY_ID} td:nth-child(3) { width: 60px; }
      #${OVERLAY_ID} th:nth-child(4), #${OVERLAY_ID} td:nth-child(4) { width: 60px; }
      #${OVERLAY_ID} th:nth-child(5), #${OVERLAY_ID} td:nth-child(5) { width: 60px; }
      #${OVERLAY_ID} th:nth-child(6), #${OVERLAY_ID} td:nth-child(6) { width: 60px; }
      #${OVERLAY_ID} th:nth-child(7), #${OVERLAY_ID} td:nth-child(7) { width: 70px; }
      #${OVERLAY_ID} th:nth-child(8), #${OVERLAY_ID} td:nth-child(8) { width: 70px; }
      #${OVERLAY_ID} th:nth-child(9), #${OVERLAY_ID} td:nth-child(9) { width: 70px; }
      #${OVERLAY_ID} th:nth-child(10), #${OVERLAY_ID} td:nth-child(10) { width: 70px; }
      #${OVERLAY_ID} th:nth-child(11), #${OVERLAY_ID} td:nth-child(11) { width: 60px; }
      #${OVERLAY_ID} th:nth-child(12), #${OVERLAY_ID} td:nth-child(12) { width: 80px; }
      #${OVERLAY_ID} th:nth-child(13), #${OVERLAY_ID} td:nth-child(13) { width: 260px; }
    </style>
    <div class="grid">
      <div class="panel">
        <h3>Enemy Editor</h3>
        <div class="controls">
          <label style="display:flex;align-items:center;gap:6px;font-size:12px;">
            <input type="checkbox" id="ee-showHidden">
            Show hidden
          </label>
          <div class="status" id="ee-status"></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button id="ee-save">Save</button>
            <button id="ee-export" class="secondary">Export file</button>
            <button id="ee-close" class="secondary">Close (Esc)</button>
          </div>
        </div>
      </div>
      <div class="panel">
        <div class="table-wrap">
          <table id="ee-table">
            <thead>
              <tr>
                <th>Hide</th>
                <th>Name</th>
                <th>HP</th>
                <th>DMG</th>
                <th>Speed</th>
                <th>Scale</th>
                <th>Hit Radius</th>
                <th>Atk Range</th>
                <th>Cooldown</th>
                <th>Score</th>
                <th>Boss</th>
                <th>Swarm Spacing</th>
                <th>Tags</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const els = {
    showHidden: overlay.querySelector("#ee-showHidden"),
    status: overlay.querySelector("#ee-status"),
    save: overlay.querySelector("#ee-save"),
    exportBtn: overlay.querySelector("#ee-export"),
    close: overlay.querySelector("#ee-close"),
    tbody: overlay.querySelector("#ee-table tbody"),
  };

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

  function createNumberInput(key, field) {
    const td = document.createElement("td");
    const enemy = ensureEnemy(key);
    const input = document.createElement("input");
    input.type = "number";
    input.value = enemy[field] ?? "";
    input.addEventListener("change", () => {
      const val = input.value === "" ? null : Number(input.value);
      if (val === null || Number.isNaN(val)) delete enemy[field];
      else enemy[field] = val;
    });
    td.appendChild(input);
    return td;
  }

  function createTagsCell(key) {
    const td = document.createElement("td");
    const enemy = ensureEnemy(key);
    const tags = new Set(enemy.specialBehavior || []);
    const wrap = document.createElement("div");
    wrap.className = "tag-list";
    TAGS.forEach((tag) => {
      const label = document.createElement("label");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = tags.has(tag);
      cb.addEventListener("change", () => {
        if (cb.checked) tags.add(tag);
        else tags.delete(tag);
        enemy.specialBehavior = Array.from(tags);
        renderTable(); // refresh to reflect swarm spacing availability
      });
      label.appendChild(cb);
      label.append(" " + tag);
      wrap.appendChild(label);
    });
    td.appendChild(wrap);
    return td;
  }

  function createSwarmSpacingCell(key) {
    const td = document.createElement("td");
    const enemy = ensureEnemy(key);
    const tags = new Set(enemy.specialBehavior || []);
    const isSwarmable = tags.has("swarmable");
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
    td.appendChild(input);
    return td;
  }

  function createHiddenCell(key) {
    const td = document.createElement("td");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = (state.cfg.hiddenEnemies || []).includes(key);
    cb.addEventListener("change", () => {
      markHidden(key, cb.checked);
      renderTable();
    });
    td.appendChild(cb);
    return td;
  }

  function renderRow(key) {
    const enemy = ensureEnemy(key);
    if (!enemy) return;
    const tr = document.createElement("tr");
    tr.appendChild(createHiddenCell(key));
    const nameTd = document.createElement("td");
    nameTd.textContent = key;
    tr.appendChild(nameTd);
    tr.appendChild(createNumberInput(key, "health"));
    tr.appendChild(createNumberInput(key, "damage"));
    tr.appendChild(createNumberInput(key, "speed"));
    tr.appendChild(createNumberInput(key, "scale"));
    tr.appendChild(createNumberInput(key, "baseRadius"));
    tr.appendChild(createNumberInput(key, "attackRange"));
    tr.appendChild(createNumberInput(key, "cooldown"));
    tr.appendChild(createNumberInput(key, "score"));
    tr.appendChild(createNumberInput(key, "bossTier"));
    tr.appendChild(createSwarmSpacingCell(key));
    tr.appendChild(createTagsCell(key));
    els.tbody.appendChild(tr);
  }

  function renderTable() {
    els.tbody.innerHTML = "";
    const hidden = new Set(state.cfg.hiddenEnemies || []);
    const keys = Object.keys(state.cfg.catalog || {}).sort();
    keys.forEach((key) => {
      if (!state.showHidden && hidden.has(key)) return;
      renderRow(key);
    });
  }

  function show() {
    state.cfg = loadConfig();
    state.showHidden = false;
    if (els.showHidden) els.showHidden.checked = false;
    renderTable();
    overlay.style.display = "block";
    setStatus("");
  }

  function hide() {
    overlay.style.display = "none";
    setStatus("");
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
  if (els.save) els.save.addEventListener("click", handleSave);
  if (els.exportBtn) {
    els.exportBtn.addEventListener("click", () => exportFile(state.cfg));
  }
  if (els.close) els.close.addEventListener("click", hide);

  document.addEventListener("keydown", (e) => {
    if (e.key && e.key.toLowerCase() === HOTKEY && !overlay.contains(document.activeElement)) {
      e.preventDefault();
      show();
    }
    if (e.key === "Escape" && overlay.style.display === "block") {
      hide();
    }
  });

  window.BattlechurchEnemyEditor = {
    show,
    hide,
    getConfig: () => state.cfg,
    save: handleSave,
  };
})(typeof window !== "undefined" ? window : null, typeof document !== "undefined" ? document : null);
