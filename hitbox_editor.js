(function setupHitboxEditor(window, document) {
  if (!window || !document) return;

  const OVERLAY_ID = "hitboxEditorOverlay";
  const STATUS_DELAY = 1600;
  const state = {
    active: false,
    selectedKey: null,
    layout: [],
    contentHeight: 0,
    scrollY: 0,
    rafId: null,
    layoutDirty: true,
    statusTimer: null,
  };

  const bindings = {
    getAssets: () => null,
    getEnemyCatalog: () => ({}),
    getEnemyTypes: () => ({}),
    onHitboxChange: null,
  };
  let baseCatalogSnapshot = null;

  function deepClone(obj) {
    return obj ? JSON.parse(JSON.stringify(obj)) : obj;
  }

  function getCatalog() {
    return bindings.getEnemyCatalog ? bindings.getEnemyCatalog() : {};
  }

  function getEnemyDef(key) {
    const catalog = getCatalog();
    return catalog ? catalog[key] : null;
  }

  function defaultHitbox(def) {
    const baseRadius = Number(def?.baseRadius);
    const radius = Number.isFinite(baseRadius) && baseRadius > 0 ? baseRadius : 14;
    return { width: radius * 2, height: radius * 2, offsetX: 0, offsetY: 0 };
  }

  function resolveHitbox(def) {
    const fallback = defaultHitbox(def);
    const hitbox = def?.hitbox || {};
    return {
      width: Number.isFinite(hitbox.width) ? hitbox.width : fallback.width,
      height: Number.isFinite(hitbox.height) ? hitbox.height : fallback.height,
      offsetX: Number.isFinite(hitbox.offsetX) ? hitbox.offsetX : fallback.offsetX,
      offsetY: Number.isFinite(hitbox.offsetY) ? hitbox.offsetY : fallback.offsetY,
    };
  }

  function setStatus(message) {
    if (!statusEl) return;
    statusEl.textContent = message || "";
    if (state.statusTimer) {
      clearTimeout(state.statusTimer);
      state.statusTimer = null;
    }
    if (message) {
      state.statusTimer = setTimeout(() => {
        statusEl.textContent = "";
      }, STATUS_DELAY);
    }
  }

  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.innerHTML = `
    <style>
      #${OVERLAY_ID} {
        position: fixed;
        inset: 0;
        background: rgba(8, 12, 22, 0.96);
        color: #e6f1ff;
        z-index: 10020;
        display: none;
        font-family: "IBM Plex Mono", "SF Mono", Menlo, monospace;
      }
      #${OVERLAY_ID} .hitbox-editor__panel {
        display: flex;
        flex-direction: column;
        height: 100%;
        padding: 14px 16px;
        box-sizing: border-box;
        gap: 12px;
      }
      #${OVERLAY_ID} .hitbox-editor__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      #${OVERLAY_ID} .hitbox-editor__title {
        font-size: 18px;
        letter-spacing: 0.4px;
        margin: 0;
      }
      #${OVERLAY_ID} .hitbox-editor__actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      #${OVERLAY_ID} button {
        background: #2f74ff;
        color: #fff;
        border: none;
        border-radius: 6px;
        padding: 6px 10px;
        font-weight: 600;
        cursor: pointer;
        font-family: inherit;
      }
      #${OVERLAY_ID} button.secondary {
        background: rgba(255, 255, 255, 0.12);
      }
      #${OVERLAY_ID} .hitbox-editor__body {
        flex: 1;
        display: grid;
        grid-template-columns: 280px 1fr;
        gap: 12px;
        min-height: 0;
      }
      #${OVERLAY_ID} .hitbox-editor__sidebar {
        background: rgba(18, 26, 42, 0.9);
        border: 1px solid rgba(120, 170, 220, 0.35);
        border-radius: 8px;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        overflow: auto;
      }
      #${OVERLAY_ID} .hitbox-editor__sidebar label {
        font-size: 12px;
        color: #9bb3cf;
        display: block;
        margin-bottom: 4px;
      }
      #${OVERLAY_ID} .hitbox-editor__field {
        display: flex;
        flex-direction: column;
      }
      #${OVERLAY_ID} .hitbox-editor__value {
        font-size: 13px;
        color: #fff;
      }
      #${OVERLAY_ID} input[type="number"] {
        width: 100%;
        padding: 6px 8px;
        border-radius: 6px;
        border: 1px solid rgba(255, 255, 255, 0.15);
        background: rgba(255, 255, 255, 0.08);
        color: #fff;
        font-family: inherit;
        box-sizing: border-box;
      }
      #${OVERLAY_ID} .hitbox-editor__canvas-wrap {
        background: rgba(7, 10, 18, 0.9);
        border: 1px solid rgba(120, 170, 220, 0.2);
        border-radius: 10px;
        position: relative;
        overflow: hidden;
      }
      #${OVERLAY_ID} canvas {
        display: block;
        width: 100%;
        height: 100%;
      }
      #${OVERLAY_ID} .hitbox-editor__footer {
        font-size: 12px;
        color: #88c3ff;
        min-height: 18px;
      }
      #${OVERLAY_ID} .hitbox-editor__hint {
        font-size: 11px;
        color: #8aa3c5;
      }
    </style>
    <div class="hitbox-editor__panel">
      <div class="hitbox-editor__header">
        <h2 class="hitbox-editor__title">Enemy Hitbox Editor</h2>
        <div class="hitbox-editor__actions">
          <button type="button" data-action="export">Export enemy_catalog.js</button>
          <button type="button" class="secondary" data-action="close">Close (H)</button>
        </div>
      </div>
      <div class="hitbox-editor__body">
        <div class="hitbox-editor__sidebar">
          <div class="hitbox-editor__field">
            <label>Selected Enemy</label>
            <div class="hitbox-editor__value" data-enemy-name>None</div>
          </div>
          <div class="hitbox-editor__field">
            <label>Scale (catalog)</label>
            <div class="hitbox-editor__value" data-enemy-scale>-</div>
          </div>
          <div class="hitbox-editor__field">
            <label>Base Radius</label>
            <div class="hitbox-editor__value" data-enemy-radius>-</div>
          </div>
          <div class="hitbox-editor__field">
            <label>Hitbox Width (source px)</label>
            <input type="number" step="1" data-hitbox-width>
          </div>
          <div class="hitbox-editor__field">
            <label>Hitbox Height (source px)</label>
            <input type="number" step="1" data-hitbox-height>
          </div>
          <div class="hitbox-editor__field">
            <label>Offset X (source px)</label>
            <input type="number" step="1" data-hitbox-offset-x>
          </div>
          <div class="hitbox-editor__field">
            <label>Offset Y (source px)</label>
            <input type="number" step="1" data-hitbox-offset-y>
          </div>
          <button type="button" class="secondary" data-action="reset">Reset To Default</button>
          <div class="hitbox-editor__hint">
            Click an enemy in the grid to edit. Values apply live to in-game enemies.
          </div>
        </div>
        <div class="hitbox-editor__canvas-wrap">
          <canvas data-hitbox-canvas></canvas>
        </div>
      </div>
      <div class="hitbox-editor__footer" data-status></div>
    </div>
  `;

  document.body.appendChild(overlay);

  const canvas = overlay.querySelector("[data-hitbox-canvas]");
  const statusEl = overlay.querySelector("[data-status]");
  const nameEl = overlay.querySelector("[data-enemy-name]");
  const scaleEl = overlay.querySelector("[data-enemy-scale]");
  const radiusEl = overlay.querySelector("[data-enemy-radius]");
  const widthInput = overlay.querySelector("[data-hitbox-width]");
  const heightInput = overlay.querySelector("[data-hitbox-height]");
  const offsetXInput = overlay.querySelector("[data-hitbox-offset-x]");
  const offsetYInput = overlay.querySelector("[data-hitbox-offset-y]");
  const resetButton = overlay.querySelector("[data-action='reset']");
  const exportButton = overlay.querySelector("[data-action='export']");
  const closeButton = overlay.querySelector("[data-action='close']");

  function updateCanvasSize() {
    if (!canvas || !canvas.parentElement) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      state.layoutDirty = true;
    }
  }

  function getClipForEnemy(key) {
    const assets = bindings.getAssets ? bindings.getAssets() : null;
    const enemyClips = assets?.enemies?.[key] || null;
    if (!enemyClips) return null;
    return enemyClips.idle || enemyClips.walk || enemyClips.attack || null;
  }

  function getEnemyScale(key) {
    const types = bindings.getEnemyTypes ? bindings.getEnemyTypes() : null;
    const type = types ? types[key] : null;
    if (type && Number.isFinite(type.scale)) return type.scale;
    if (type && Number.isFinite(type.catalogScale)) return type.catalogScale;
    const def = getEnemyDef(key);
    return def && Number.isFinite(def.scale) ? def.scale : 1;
  }

  function buildLayout() {
    const catalog = getCatalog();
    const keys = Object.keys(catalog || {});
    keys.sort((a, b) => a.localeCompare(b));
    const padding = 18;
    const labelHeight = 16;
    const bounds = [];
    let x = padding;
    let y = padding;
    let rowHeight = 0;

    keys.forEach((key) => {
      const def = catalog[key];
      const clip = getClipForEnemy(key);
      const frameWidth = clip?.frameWidth || clip?.image?.width || 0;
      const frameHeight = clip?.frameHeight || clip?.image?.height || 0;
      const scale = getEnemyScale(key);
      const spriteW = Math.max(24, frameWidth * scale);
      const spriteH = Math.max(24, frameHeight * scale);
      const cellW = spriteW + padding * 2;
      const cellH = spriteH + labelHeight + padding * 2;

      if (x + cellW > canvas.width - padding) {
        x = padding;
        y += rowHeight;
        rowHeight = 0;
      }

      bounds.push({
        key,
        x,
        y,
        width: cellW,
        height: cellH,
        spriteW,
        spriteH,
        scale,
      });

      x += cellW;
      rowHeight = Math.max(rowHeight, cellH);
    });

    state.layout = bounds;
    state.contentHeight = y + rowHeight + padding;
    state.layoutDirty = false;
  }

  function clampScroll() {
    const maxScroll = Math.max(0, state.contentHeight - canvas.height);
    state.scrollY = Math.max(0, Math.min(maxScroll, state.scrollY));
  }

  function selectEnemy(key) {
    state.selectedKey = key;
    const def = getEnemyDef(key);
    if (!def) return;
    const hitbox = resolveHitbox(def);
    nameEl.textContent = def.displayName ? `${def.displayName} (${key})` : key;
    scaleEl.textContent = String(def.scale ?? "-");
    radiusEl.textContent = String(def.baseRadius ?? "-");
    widthInput.value = Math.round(hitbox.width);
    heightInput.value = Math.round(hitbox.height);
    offsetXInput.value = Math.round(hitbox.offsetX);
    offsetYInput.value = Math.round(hitbox.offsetY);
    setStatus("");
  }

  function applyInputsToEnemy() {
    const key = state.selectedKey;
    if (!key) return;
    const def = getEnemyDef(key);
    if (!def) return;
    const width = Number(widthInput.value);
    const height = Number(heightInput.value);
    const offsetX = Number(offsetXInput.value);
    const offsetY = Number(offsetYInput.value);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;
    def.hitbox = {
      width,
      height,
      offsetX: Number.isFinite(offsetX) ? offsetX : 0,
      offsetY: Number.isFinite(offsetY) ? offsetY : 0,
    };
    if (window.BattlechurchEnemyDefinitions && window.BattlechurchEnemyDefinitions[key]) {
      window.BattlechurchEnemyDefinitions[key].hitbox = deepClone(def.hitbox);
    }
    if (typeof bindings.onHitboxChange === "function") {
      bindings.onHitboxChange(key, deepClone(def.hitbox));
    }
    setStatus(`Updated ${key} hitbox.`);
  }

  function resetToDefault() {
    const key = state.selectedKey;
    if (!key) return;
    const def = getEnemyDef(key);
    if (!def) return;
    const fallback = defaultHitbox(def);
    widthInput.value = Math.round(fallback.width);
    heightInput.value = Math.round(fallback.height);
    offsetXInput.value = 0;
    offsetYInput.value = 0;
    applyInputsToEnemy();
  }

  function exportCatalog() {
    const catalog = getCatalog();
    const base = baseCatalogSnapshot || catalog || {};
    const merged = deepClone(base || {});
    const numericKeys = new Set([
      "health",
      "maxHealth",
      "damage",
      "speed",
      "baseRadius",
      "scale",
      "attackBonus",
      "cooldown",
      "desiredRange",
      "projectileCooldown",
      "score",
      "bossTier",
    ]);
    Object.keys(catalog || {}).forEach((key) => {
      const live = catalog[key];
      if (!merged[key]) merged[key] = deepClone(live);
      if (!live || typeof live !== "object") return;
      Object.keys(live).forEach((prop) => {
        const value = live[prop];
        if (value === null || value === undefined) return;
        if (numericKeys.has(prop) && !Number.isFinite(Number(value))) return;
        merged[key][prop] = value;
      });
      if (live.hitbox && typeof live.hitbox === "object") {
        merged[key].hitbox = deepClone(live.hitbox);
      }
    });
    const data = deepClone(merged || {});
    const body = `(function(global) {
  const ENEMY_CATALOG = ${JSON.stringify(data, null, 2)};
  const ns = global.BattlechurchEnemyCatalog || (global.BattlechurchEnemyCatalog = {});
  ns.catalog = ENEMY_CATALOG;
  const defs = global.BattlechurchEnemyDefinitions || (global.BattlechurchEnemyDefinitions = {});
  Object.assign(defs, ENEMY_CATALOG);
})(typeof window !== "undefined" ? window : globalThis);
`;
    const blob = new Blob([body], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "enemy_catalog.js";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus("Exported enemy_catalog.js");
  }

  function drawHitbox(ctx, centerX, centerY, def, scale) {
    const hitbox = resolveHitbox(def);
    const width = hitbox.width * scale;
    const height = hitbox.height * scale;
    const offsetX = hitbox.offsetX * scale;
    const offsetY = hitbox.offsetY * scale;
    const x = centerX + offsetX - width / 2;
    const y = centerY + offsetY - height / 2;
    ctx.save();
    ctx.strokeStyle = "rgba(255, 210, 120, 0.95)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(x, y, width, height);
    ctx.restore();
  }

  function drawLayout() {
    updateCanvasSize();
    if (state.layoutDirty) buildLayout();
    clampScroll();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0b0f1a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.translate(0, -state.scrollY);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = "12px 'IBM Plex Mono', monospace";

    state.layout.forEach((entry) => {
      const def = getEnemyDef(entry.key);
      if (!def) return;
      const isSelected = entry.key === state.selectedKey;
      const cellX = entry.x;
      const cellY = entry.y;
      const centerX = cellX + entry.width / 2;
      const spriteY = cellY + 18 + entry.spriteH / 2;

      ctx.save();
      ctx.strokeStyle = isSelected ? "rgba(255, 216, 120, 0.9)" : "rgba(255,255,255,0.08)";
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.strokeRect(cellX + 6, cellY + 6, entry.width - 12, entry.height - 12);
      ctx.restore();

      const clip = getClipForEnemy(entry.key);
      if (clip && clip.image && clip.frameWidth && clip.frameHeight) {
        const frameIndex =
          Array.isArray(clip.frameMap) && clip.frameMap.length ? clip.frameMap[0] : 0;
        const cols = Math.max(1, Math.floor(clip.image.width / clip.frameWidth));
        const sx = (frameIndex % cols) * clip.frameWidth;
        const sy = Math.floor(frameIndex / cols) * clip.frameHeight;
        const drawW = clip.frameWidth * entry.scale;
        const drawH = clip.frameHeight * entry.scale;
        ctx.drawImage(
          clip.image,
          sx,
          sy,
          clip.frameWidth,
          clip.frameHeight,
          centerX - drawW / 2,
          spriteY - drawH / 2,
          drawW,
          drawH,
        );
      } else {
        ctx.save();
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.fillRect(centerX - entry.spriteW / 2, spriteY - entry.spriteH / 2, entry.spriteW, entry.spriteH);
        ctx.restore();
      }

      ctx.fillStyle = isSelected ? "#ffe3a6" : "#d7e5ff";
      ctx.fillText(def.displayName || entry.key, centerX, cellY + entry.height - 18);

      if (isSelected) {
        drawHitbox(ctx, centerX, spriteY, def, entry.scale);
      }
    });
    ctx.restore();
  }

  function startRenderLoop() {
    if (state.rafId) return;
    const step = () => {
      if (!state.active) {
        state.rafId = null;
        return;
      }
      drawLayout();
      state.rafId = window.requestAnimationFrame(step);
    };
    state.rafId = window.requestAnimationFrame(step);
  }

  function setActive(active) {
    state.active = Boolean(active);
    overlay.style.display = state.active ? "block" : "none";
    window.__battlechurchHitboxEditorActive = state.active;
    if (state.active) {
      state.layoutDirty = true;
      updateCanvasSize();
      const keys = Object.keys(getCatalog() || {});
      if (!state.selectedKey && keys.length) {
        selectEnemy(keys[0]);
      }
      startRenderLoop();
    }
  }

  function toggle() {
    setActive(!state.active);
    return state.active;
  }

  function handleCanvasClick(event) {
    if (!state.layout.length) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width ? canvas.width / rect.width : 1;
    const scaleY = rect.height ? canvas.height / rect.height : 1;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY + state.scrollY;
    const entry = state.layout.find(
      (item) => x >= item.x && x <= item.x + item.width && y >= item.y && y <= item.y + item.height,
    );
    if (entry) {
      selectEnemy(entry.key);
    }
  }

  function handleWheel(event) {
    if (!state.active) return;
    state.scrollY += event.deltaY;
    clampScroll();
    event.preventDefault();
  }

  widthInput.addEventListener("input", applyInputsToEnemy);
  heightInput.addEventListener("input", applyInputsToEnemy);
  offsetXInput.addEventListener("input", applyInputsToEnemy);
  offsetYInput.addEventListener("input", applyInputsToEnemy);
  resetButton.addEventListener("click", resetToDefault);
  exportButton.addEventListener("click", exportCatalog);
  closeButton.addEventListener("click", () => setActive(false));
  canvas.addEventListener("click", handleCanvasClick);
  canvas.addEventListener("wheel", handleWheel, { passive: false });

  window.addEventListener("resize", () => {
    state.layoutDirty = true;
    updateCanvasSize();
  });

  window.BattlechurchHitboxEditor = {
    initialize(options = {}) {
      bindings.getAssets = options.getAssets || bindings.getAssets;
      bindings.getEnemyCatalog = options.getEnemyCatalog || bindings.getEnemyCatalog;
      bindings.getEnemyTypes = options.getEnemyTypes || bindings.getEnemyTypes;
      bindings.onHitboxChange = options.onHitboxChange || bindings.onHitboxChange;
      baseCatalogSnapshot = deepClone(bindings.getEnemyCatalog());
      setActive(false);
    },
    toggle,
    setActive,
    isActive: () => state.active,
  };
})(typeof window !== "undefined" ? window : null, typeof document !== "undefined" ? document : null);
