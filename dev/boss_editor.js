(function setupBossEditor(window, document) {
  if (!window || !document) return;

  const STORAGE_KEY = "battlechurch.devBossCatalog";
  const OVERLAY_ID = "bossEditorOverlay";
  const HOTKEY = "b";

  // Minion enemy options shown in the dropdown
  const MINION_TYPES = [
    { value: "miniFireImp",   label: "Mini Fire Imp" },
    { value: "skeleton",      label: "Skeleton" },
    { value: "imp",           label: "Imp" },
    { value: "demon",         label: "Demon" },
    { value: "tormentor",     label: "Tormentor" },
    { value: "bat",           label: "Bat" },
  ];

  const PROJECTILE_TYPES = [
    { value: "fire",    label: "Fire" },
    { value: "arrow",   label: "Arrow" },
    { value: "demonLordFireball", label: "Demon Lord Fireball" },
  ];

  // Numeric fields — shown for every boss
  const BOSS_NUMERIC_FIELDS = [
    { key: "health",             label: "Max Health",                    min: 1 },
    { key: "speed",              label: "Move Speed",                    min: 0 },
    { key: "contactDamage",      label: "Contact Damage",                min: 0 },
    { key: "attackDamage",       label: "Attack / Proj Damage (base)",   min: 0 },
    { key: "attackHitDamage",    label: "Melee Hit Damage",              min: 0 },
    { key: "attackHitFrame",     label: "Melee Hit Frame",               min: 1 },
    { key: "cooldown",           label: "Melee Attack Cooldown (s)",     min: 0, step: 0.1 },
    { key: "projectileCooldown", label: "Projectile Cooldown (s)",       min: 0, step: 0.1 },
    { key: "desiredRange",       label: "Engagement Range (px)",         min: 0 },
    { key: "score",              label: "Score Value",                   min: 0 },
  ];

  // Phase 2 fields
  const PHASE2_NUMERIC_FIELDS = [
    { key: "p2MinionCount", label: "Minions Per Summon", min: 1, max: 10, defaultVal: 3 },
  ];

  // Phase 3 sunburst fields
  const PHASE3_NUMERIC_FIELDS = [
    { key: "p3SunburstDamage",   label: "Sunburst Projectile Damage", min: 0, defaultVal: null },
    { key: "p3SunburstCooldown", label: "Sunburst Cooldown (s)",      min: 0.5, step: 0.5, defaultVal: 7 },
    { key: "p3SunburstCount",    label: "Sunburst Ray Count",         min: 2, max: 24, defaultVal: 6 },
  ];

  const BOSS_KEYS = ["bossHighDemon", "bossDemonLord"];

  function deepClone(obj) {
    return obj ? JSON.parse(JSON.stringify(obj)) : obj;
  }

  function getSourceCatalog() {
    return (window.BattlechurchEnemyCatalog && window.BattlechurchEnemyCatalog.catalog) || {};
  }

  function allFieldKeys() {
    const keys = BOSS_NUMERIC_FIELDS.map((f) => f.key);
    keys.push("ranged", "projectileType");
    keys.push("p2SummonEnabled", "p2MinionType");
    PHASE2_NUMERIC_FIELDS.forEach((f) => keys.push(f.key));
    keys.push("p3SunburstEnabled");
    PHASE3_NUMERIC_FIELDS.forEach((f) => keys.push(f.key));
    return keys;
  }

  function loadConfig() {
    let saved = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) saved = JSON.parse(raw);
    } catch (e) {}
    const source = getSourceCatalog();
    const cfg = {};
    BOSS_KEYS.forEach((key) => {
      const base = source[key] || {};
      const overrides = (saved && saved[key]) || {};
      cfg[key] = {};
      allFieldKeys().forEach((field) => {
        cfg[key][field] = field in overrides ? overrides[field] : base[field];
      });
    });
    return cfg;
  }

  function saveConfig(cfg) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    } catch (e) {
      console.warn("BossEditor: failed to save", e);
      return false;
    }
    applyRuntime(cfg);
    return true;
  }

  function applyRuntime(cfg) {
    BOSS_KEYS.forEach((key) => {
      const overrides = cfg[key] || {};
      const cat = window.BattlechurchEnemyCatalog?.catalog;
      if (cat && cat[key]) {
        Object.assign(cat[key], overrides);
      }
      if (window.BattlechurchEnemyDefinitions?.[key]) {
        Object.assign(window.BattlechurchEnemyDefinitions[key], overrides);
      }
      if (typeof window.__battlechurchApplyHitboxChange === "function") {
        const fullDef = Object.assign({}, (cat && cat[key]) || {}, overrides);
        window.__battlechurchApplyHitboxChange(key, fullDef.hitbox || null, fullDef.weaponHitbox || null);
      }
    });
  }

  function exportFile(cfg) {
    const source = getSourceCatalog();
    const merged = deepClone(source);
    BOSS_KEYS.forEach((key) => {
      if (!merged[key]) return;
      Object.assign(merged[key], cfg[key] || {});
    });
    const body = `(function(global) {\n  const ENEMY_CATALOG = ${JSON.stringify(merged, null, 2)};\n  const ns = global.BattlechurchEnemyCatalog || (global.BattlechurchEnemyCatalog = {});\n  ns.catalog = ENEMY_CATALOG;\n  const defs = global.BattlechurchEnemyDefinitions || (global.BattlechurchEnemyDefinitions = {});\n  Object.assign(defs, ENEMY_CATALOG);\n})(typeof window !== "undefined" ? window : globalThis);\n`;
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

  // ── UI ───────────────────────────────────────────────────────────────────

  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.style.display = "none";
  overlay.innerHTML = `
    <style>
      #${OVERLAY_ID} {
        position: fixed; inset: 0; z-index: 99999;
        background: rgba(6, 9, 18, 0.96);
        font-family: system-ui, sans-serif;
        color: #e8d2ae;
        display: flex; flex-direction: column;
        overflow: hidden;
      }
      #${OVERLAY_ID} .be-header {
        display: flex; align-items: center; gap: 16px;
        padding: 14px 20px;
        background: rgba(255, 214, 148, 0.07);
        border-bottom: 1px solid rgba(255, 214, 148, 0.18);
        flex-shrink: 0;
      }
      #${OVERLAY_ID} .be-title {
        font-size: 18px; font-weight: 700; color: #ffd978; flex: 1;
      }
      #${OVERLAY_ID} .be-btn {
        padding: 7px 18px; border-radius: 8px; border: none; cursor: pointer;
        font-size: 13px; font-weight: 600;
      }
      #${OVERLAY_ID} .be-btn--save   { background: rgba(180,100,20,0.9); color: #fff5e0; }
      #${OVERLAY_ID} .be-btn--export { background: rgba(40,80,40,0.9); color: #d0f0c0; }
      #${OVERLAY_ID} .be-btn--close  { background: rgba(60,40,30,0.9); color: #ccc; }
      #${OVERLAY_ID} .be-body {
        flex: 1; overflow-y: auto; padding: 20px;
        display: flex; gap: 24px; flex-wrap: wrap; align-items: flex-start;
      }
      #${OVERLAY_ID} .be-boss-panel {
        flex: 1; min-width: 300px; max-width: 500px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,214,148,0.18);
        border-radius: 12px; padding: 18px;
      }
      #${OVERLAY_ID} .be-boss-name {
        font-size: 16px; font-weight: 700; color: #ffd978;
        margin-bottom: 16px; padding-bottom: 10px;
        border-bottom: 1px solid rgba(255,214,148,0.15);
      }
      #${OVERLAY_ID} .be-section-label {
        font-size: 11px; font-weight: 700; color: #ffa040;
        text-transform: uppercase; letter-spacing: 0.06em;
        margin: 14px 0 8px;
        padding-top: 10px;
        border-top: 1px solid rgba(255,214,148,0.1);
      }
      #${OVERLAY_ID} .be-field {
        display: flex; align-items: center; justify-content: space-between;
        margin-bottom: 10px; gap: 12px;
      }
      #${OVERLAY_ID} .be-field label {
        font-size: 12px; color: #c8b080; flex: 1;
      }
      #${OVERLAY_ID} .be-field input[type=number] {
        width: 90px; padding: 5px 8px; border-radius: 6px;
        border: 1px solid rgba(255,214,148,0.3);
        background: rgba(0,0,0,0.4); color: #f5e0b0;
        font-size: 13px; text-align: right;
      }
      #${OVERLAY_ID} .be-field input[type=number]:focus {
        outline: none; border-color: rgba(255,214,148,0.7);
      }
      #${OVERLAY_ID} .be-field input[type=checkbox] {
        width: 18px; height: 18px; cursor: pointer; accent-color: #ffd978;
      }
      #${OVERLAY_ID} .be-field select {
        padding: 5px 8px; border-radius: 6px;
        border: 1px solid rgba(255,214,148,0.3);
        background: rgba(0,0,0,0.6); color: #f5e0b0;
        font-size: 13px; cursor: pointer;
      }
      #${OVERLAY_ID} .be-field select:focus { outline: none; border-color: rgba(255,214,148,0.7); }
      #${OVERLAY_ID} .be-status {
        padding: 8px 20px; font-size: 12px; color: #8fc08f;
        flex-shrink: 0; min-height: 28px;
      }
      #${OVERLAY_ID} .be-hint {
        font-size: 11px; color: rgba(200,176,128,0.55);
        margin-top: 14px; line-height: 1.5;
      }
      #${OVERLAY_ID} .be-phase-note {
        font-size: 11px; color: rgba(200,176,128,0.5);
        margin-top: 16px; padding-top: 10px;
        border-top: 1px solid rgba(255,214,148,0.1);
        line-height: 1.6;
      }
    </style>
    <div class="be-header">
      <div class="be-title">Boss Editor</div>
      <button class="be-btn be-btn--save" id="be-save">Save &amp; Apply</button>
      <button class="be-btn be-btn--export" id="be-export">Export enemy_catalog.js</button>
      <button class="be-btn be-btn--close" id="be-close">✕ Close</button>
    </div>
    <div class="be-body" id="be-body"></div>
    <div class="be-status" id="be-status"></div>
  `;
  document.body.appendChild(overlay);

  let state = { cfg: loadConfig() };

  function setStatus(msg, isError = false) {
    const el = overlay.querySelector("#be-status");
    if (el) { el.textContent = msg; el.style.color = isError ? "#e08080" : "#8fc08f"; }
  }

  function getBossDisplayName(key) {
    const cat = getSourceCatalog();
    return (cat[key] && cat[key].displayName) || key;
  }

  function addSectionLabel(panel, text) {
    const el = document.createElement("div");
    el.className = "be-section-label";
    el.textContent = text;
    panel.appendChild(el);
  }

  function addNumberField(panel, bossKey, fieldDef) {
    const { key: field, label, min, max, step, defaultVal } = fieldDef;
    const row = document.createElement("div");
    row.className = "be-field";

    const lbl = document.createElement("label");
    lbl.textContent = label;

    const input = document.createElement("input");
    input.type = "number";
    if (min !== undefined) input.min = min;
    if (max !== undefined) input.max = max;
    if (step !== undefined) input.step = step;
    const val = state.cfg[bossKey]?.[field];
    input.value = (val !== undefined && val !== null) ? val : (defaultVal !== undefined && defaultVal !== null ? defaultVal : "");
    input.dataset.boss = bossKey;
    input.dataset.field = field;
    input.addEventListener("input", () => {
      const raw = input.value.trim();
      const parsed = raw === "" ? undefined : Number(raw);
      if (!state.cfg[bossKey]) state.cfg[bossKey] = {};
      state.cfg[bossKey][field] = parsed;
    });

    row.appendChild(lbl);
    row.appendChild(input);
    panel.appendChild(row);
  }

  function addCheckboxField(panel, bossKey, field, label, defaultChecked = false) {
    const row = document.createElement("div");
    row.className = "be-field";

    const lbl = document.createElement("label");
    lbl.textContent = label;

    const input = document.createElement("input");
    input.type = "checkbox";
    const val = state.cfg[bossKey]?.[field];
    input.checked = val !== undefined && val !== null ? Boolean(val) : defaultChecked;
    input.dataset.boss = bossKey;
    input.dataset.field = field;
    input.addEventListener("change", () => {
      if (!state.cfg[bossKey]) state.cfg[bossKey] = {};
      state.cfg[bossKey][field] = input.checked;
    });

    row.appendChild(lbl);
    row.appendChild(input);
    panel.appendChild(row);
  }

  function addSelectField(panel, bossKey, field, label, options) {
    const row = document.createElement("div");
    row.className = "be-field";

    const lbl = document.createElement("label");
    lbl.textContent = label;

    const sel = document.createElement("select");
    const currentVal = state.cfg[bossKey]?.[field];
    options.forEach(({ value, label: optLabel }) => {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = optLabel;
      if (value === currentVal) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.dataset.boss = bossKey;
    sel.dataset.field = field;
    sel.addEventListener("change", () => {
      if (!state.cfg[bossKey]) state.cfg[bossKey] = {};
      state.cfg[bossKey][field] = sel.value;
    });

    row.appendChild(lbl);
    row.appendChild(sel);
    panel.appendChild(row);
  }

  function renderBody() {
    const body = overlay.querySelector("#be-body");
    if (!body) return;
    body.innerHTML = "";

    BOSS_KEYS.forEach((bossKey) => {
      const panel = document.createElement("div");
      panel.className = "be-boss-panel";

      const nameEl = document.createElement("div");
      nameEl.className = "be-boss-name";
      nameEl.textContent = getBossDisplayName(bossKey);
      panel.appendChild(nameEl);

      // ── Core stats ───────────────────────────────────────────────────
      addSectionLabel(panel, "Core Stats");
      BOSS_NUMERIC_FIELDS.forEach((fieldDef) => addNumberField(panel, bossKey, fieldDef));

      // ── Projectiles ──────────────────────────────────────────────────
      addSectionLabel(panel, "Projectiles");
      addCheckboxField(panel, bossKey, "ranged", "Fires Projectiles");
      addSelectField(panel, bossKey, "projectileType", "Projectile Type", PROJECTILE_TYPES);

      // ── Phase 2 — Summons ────────────────────────────────────────────
      addSectionLabel(panel, "Phase 2 — Summons");
      addCheckboxField(panel, bossKey, "p2SummonEnabled", "Summon Minions in Phase 2", true);
      addSelectField(panel, bossKey, "p2MinionType", "Minion Type", MINION_TYPES);
      PHASE2_NUMERIC_FIELDS.forEach((fieldDef) => addNumberField(panel, bossKey, fieldDef));

      // ── Phase 3 — Sunburst ───────────────────────────────────────────
      addSectionLabel(panel, "Phase 3 — Sunburst");
      addCheckboxField(panel, bossKey, "p3SunburstEnabled", "Sunburst Projectile Attack", true);
      addCheckboxField(panel, bossKey, "p3SummonEnabled", "Continue Summoning in Phase 3", true);
      PHASE3_NUMERIC_FIELDS.forEach((fieldDef) => addNumberField(panel, bossKey, fieldDef));

      // Phase scaling note
      const note = document.createElement("div");
      note.className = "be-phase-note";
      const isRanged = Boolean(state.cfg[bossKey]?.ranged);
      if (isRanged) {
        note.innerHTML =
          "<strong>Phase scaling (projectile damage):</strong><br>" +
          "Phase 1: ×1.0 &nbsp; Phase 2: ×1.25 &nbsp; Phase 3: ×1.75<br>" +
          "<strong>Projectile cooldown:</strong><br>" +
          "Phase 1: base &nbsp; Phase 2: ×0.67 &nbsp; Phase 3: ×0.46<br>" +
          "<strong>Contact/melee damage:</strong><br>" +
          "Phase 1–2: base &nbsp; Phase 3: ×1.5<br>" +
          "<strong>Speed:</strong><br>" +
          "Phase 1: ×0.55 &nbsp; Phase 2: ×0.75 &nbsp; Phase 3: ×1.05";
      } else {
        note.innerHTML =
          "<strong>Phase scaling (melee hit damage):</strong><br>" +
          "Phase 1–2: base &nbsp; Phase 3: ×1.5<br>" +
          "<strong>Contact damage:</strong><br>" +
          "Phase 1–2: base &nbsp; Phase 3: ×1.5<br>" +
          "<strong>Speed:</strong><br>" +
          "Phase 1: ×0.55 &nbsp; Phase 2: ×0.75 &nbsp; Phase 3: ×1.05";
      }
      panel.appendChild(note);

      const hint = document.createElement("div");
      hint.className = "be-hint";
      hint.textContent = "Save & Apply updates the live boss instantly. Export writes enemy_catalog.js to disk for permanence.";
      panel.appendChild(hint);

      body.appendChild(panel);
    });
  }

  function show() {
    state.cfg = loadConfig();
    renderBody();
    setStatus("");
    overlay.style.display = "flex";
  }

  function hide() {
    overlay.style.display = "none";
    setStatus("");
  }

  overlay.querySelector("#be-save").addEventListener("click", () => {
    const ok = saveConfig(state.cfg);
    if (ok) {
      const t = new Date();
      setStatus(`Applied ${String(t.getHours()).padStart(2,"0")}:${String(t.getMinutes()).padStart(2,"0")}:${String(t.getSeconds()).padStart(2,"0")}`);
    } else {
      setStatus("Save failed.", true);
    }
  });

  overlay.querySelector("#be-export").addEventListener("click", () => {
    exportFile(state.cfg);
    setStatus("Exported enemy_catalog.js — replace the file on disk and reload.");
  });

  overlay.querySelector("#be-close").addEventListener("click", hide);

  document.addEventListener("keydown", (e) => {
    if (e.key && e.key.toLowerCase() === HOTKEY && e.shiftKey && e.ctrlKey && overlay.style.display !== "flex") {
      e.preventDefault();
      show();
    }
    if (e.key === "Escape" && overlay.style.display === "flex") hide();
  });

  window.BattlechurchBossEditor = { show, hide };

})(typeof window !== "undefined" ? window : null, typeof document !== "undefined" ? document : null);
