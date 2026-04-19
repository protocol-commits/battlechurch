(function setupBossHitboxEditor(window, document) {
  if (!window || !document) return;

  const OVERLAY_ID = "bossHitboxEditorOverlay";
  const STATUS_DELAY = 1800;

  const state = {
    active: false,
    selectedId: null,
    search: "",
    rafId: null,
    statusTimer: null,
  };

  const bindings = {
    getAssets: () => null,
    getEnemyCatalog: () => ({}),
    getEnemyTypes: () => ({}),
    onHitboxChange: null,
  };

  let baseCatalogSnapshot = null;
  const spriteBoundsCache = new Map();

  function deepClone(obj) {
    return obj ? JSON.parse(JSON.stringify(obj)) : obj;
  }

  function getAssets() {
    return bindings.getAssets ? bindings.getAssets() : null;
  }

  function getEnemyCatalog() {
    return bindings.getEnemyCatalog ? bindings.getEnemyCatalog() : {};
  }

  function getEnemyTypes() {
    return bindings.getEnemyTypes ? bindings.getEnemyTypes() : {};
  }

  function getWorldScale() {
    const explicitScale =
      (typeof window !== "undefined" && window.__BATTLECHURCH_WORLD_SCALE !== undefined)
        ? Number(window.__BATTLECHURCH_WORLD_SCALE)
        : NaN;
    return Number.isFinite(explicitScale) && explicitScale > 0 ? explicitScale : 0.75;
  }

  function setStatus(message, isError = false) {
    if (!els.status) return;
    els.status.textContent = message || "";
    els.status.style.color = isError ? "#ffb2b2" : "#9bd9ff";
    if (state.statusTimer) {
      clearTimeout(state.statusTimer);
      state.statusTimer = null;
    }
    if (message) {
      state.statusTimer = setTimeout(() => {
        els.status.textContent = "";
      }, STATUS_DELAY);
    }
  }

  function defaultEnemyHitbox(def) {
    const baseRadius = Number(def?.baseRadius);
    const radius = Number.isFinite(baseRadius) && baseRadius > 0 ? baseRadius : 14;
    return { width: radius * 2, height: radius * 2, offsetX: 0, offsetY: 0 };
  }

  function resolveEnemyHitbox(def) {
    const fallback = defaultEnemyHitbox(def);
    const hitbox = def?.hitbox || {};
    return {
      width: Number.isFinite(hitbox.width) ? hitbox.width : fallback.width,
      height: Number.isFinite(hitbox.height) ? hitbox.height : fallback.height,
      offsetX: Number.isFinite(hitbox.offsetX) ? hitbox.offsetX : fallback.offsetX,
      offsetY: Number.isFinite(hitbox.offsetY) ? hitbox.offsetY : fallback.offsetY,
    };
  }

  function getEnemyScale(key) {
    const types = getEnemyTypes();
    const live = types ? types[key] : null;
    if (live && Number.isFinite(live.scale)) return live.scale;
    if (live && Number.isFinite(live.catalogScale)) return live.catalogScale;
    const def = getEnemyCatalog()?.[key];
    return def && Number.isFinite(def.scale) ? def.scale : 1;
  }

  function getEnemyClip(key) {
    const assets = getAssets();
    const clips = assets?.enemies?.[key] || null;
    return clips?.attack || clips?.walk || clips?.idle || null;
  }

  function getClipFrameCount(clip) {
    if (!clip || !clip.image || !clip.frameWidth || !clip.frameHeight) return 1;
    if (Array.isArray(clip.frameMap) && clip.frameMap.length) return clip.frameMap.length;
    const cols = Math.max(1, Math.floor(clip.image.width / clip.frameWidth));
    const rows = Math.max(1, Math.floor(clip.image.height / clip.frameHeight));
    return Math.max(1, cols * rows);
  }

  function getFrameSourceRect(clip, preferredFrame = 0) {
    if (!clip || !clip.image || !clip.frameWidth || !clip.frameHeight) return null;
    let frameIndex = preferredFrame;
    if (Array.isArray(clip.frameMap) && clip.frameMap.length) {
      frameIndex = clip.frameMap[Math.max(0, Math.min(clip.frameMap.length - 1, preferredFrame))] || 0;
    }
    const cols = Math.max(1, Math.floor(clip.image.width / clip.frameWidth));
    return {
      sx: (frameIndex % cols) * clip.frameWidth,
      sy: Math.floor(frameIndex / cols) * clip.frameHeight,
      sw: clip.frameWidth,
      sh: clip.frameHeight,
    };
  }

  function getTrimmedSpriteBounds(key, clip) {
    const cacheKey = `${key}:${clip?.image?.src || "no-image"}:${clip?.frameWidth || 0}:${clip?.frameHeight || 0}`;
    if (spriteBoundsCache.has(cacheKey)) return spriteBoundsCache.get(cacheKey);
    const fallback = { x: 0, y: 0, width: Math.max(1, clip?.frameWidth || 1), height: Math.max(1, clip?.frameHeight || 1) };
    if (!clip?.image || !clip.frameWidth || !clip.frameHeight) {
      spriteBoundsCache.set(cacheKey, fallback);
      return fallback;
    }
    try {
      const sampleCanvas = document.createElement("canvas");
      sampleCanvas.width = clip.frameWidth;
      sampleCanvas.height = clip.frameHeight;
      const sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });
      if (!sampleCtx) { spriteBoundsCache.set(cacheKey, fallback); return fallback; }
      let minX = clip.frameWidth, minY = clip.frameHeight, maxX = -1, maxY = -1;
      const sampleFrames = Array.isArray(clip.frameMap) && clip.frameMap.length
        ? clip.frameMap.slice(0, Math.min(6, clip.frameMap.length))
        : [0];
      sampleFrames.forEach((frameIndex) => {
        sampleCtx.clearRect(0, 0, clip.frameWidth, clip.frameHeight);
        const cols = Math.max(1, Math.floor(clip.image.width / clip.frameWidth));
        sampleCtx.drawImage(clip.image, (frameIndex % cols) * clip.frameWidth, Math.floor(frameIndex / cols) * clip.frameHeight, clip.frameWidth, clip.frameHeight, 0, 0, clip.frameWidth, clip.frameHeight);
        const imageData = sampleCtx.getImageData(0, 0, clip.frameWidth, clip.frameHeight).data;
        for (let y = 0; y < clip.frameHeight; y += 1) {
          for (let x = 0; x < clip.frameWidth; x += 1) {
            if (imageData[(y * clip.frameWidth + x) * 4 + 3] <= 8) continue;
            if (x < minX) minX = x; if (y < minY) minY = y;
            if (x > maxX) maxX = x; if (y > maxY) maxY = y;
          }
        }
      });
      const trimmed = maxX >= minX && maxY >= minY ? { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 } : fallback;
      spriteBoundsCache.set(cacheKey, trimmed);
      return trimmed;
    } catch (_) {
      spriteBoundsCache.set(cacheKey, fallback);
      return fallback;
    }
  }

  function buildEntries() {
    const catalog = getEnemyCatalog();
    return Object.keys(catalog || {})
      .filter((key) => key.startsWith("boss"))
      .sort((a, b) => a.localeCompare(b))
      .map((key) => {
        const def = catalog[key] || {};
        return { id: `boss:${key}`, key, label: def.displayName || key, subtitle: key };
      });
  }

  function getFilteredEntries() {
    const search = String(state.search || "").trim().toLowerCase();
    if (!search) return buildEntries();
    return buildEntries().filter((entry) => {
      const haystack = `${entry.label} ${entry.subtitle} ${entry.key}`.toLowerCase();
      return haystack.includes(search);
    });
  }

  function getSelectedEntry() {
    return buildEntries().find((entry) => entry.id === state.selectedId) || null;
  }

  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.innerHTML = `
    <style>
      #${OVERLAY_ID} {
        position: fixed;
        inset: 0;
        z-index: 10021;
        display: none;
        color: #eaf6ff;
        background:
          radial-gradient(circle at top, rgba(214, 140, 90, 0.14), transparent 28%),
          linear-gradient(180deg, rgba(7, 12, 24, 0.985), rgba(4, 8, 18, 0.995));
        font-family: Georgia, "Times New Roman", serif;
      }
      #${OVERLAY_ID} .hitbox-studio {
        display: grid;
        grid-template-rows: auto auto 1fr auto;
        gap: 14px;
        height: 100%;
        padding: 18px;
        box-sizing: border-box;
      }
      #${OVERLAY_ID} .studio-panel {
        background: linear-gradient(180deg, rgba(28, 18, 14, 0.96), rgba(18, 12, 10, 0.94));
        border: 1px solid rgba(238, 170, 100, 0.18);
        border-radius: 22px;
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.05);
      }
      #${OVERLAY_ID} .studio-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 18px;
        padding: 18px 20px 0;
      }
      #${OVERLAY_ID} .studio-title {
        margin: 0;
        font: 700 28px "Trebuchet MS", Georgia, serif;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: #ffc86a;
      }
      #${OVERLAY_ID} .studio-subtitle {
        margin: 6px 0 0;
        color: rgba(255, 210, 160, 0.72);
        font: 14px "Trebuchet MS", Arial, sans-serif;
      }
      #${OVERLAY_ID} .studio-actions {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
      }
      #${OVERLAY_ID} button {
        border: none;
        border-radius: 999px;
        padding: 10px 14px;
        cursor: pointer;
        font: 700 12px "Trebuchet MS", Arial, sans-serif;
        letter-spacing: 0.04em;
      }
      #${OVERLAY_ID} button.primary {
        background: linear-gradient(180deg, #ffc86a, #d97c2a);
        color: #1a0a00;
        box-shadow: 0 8px 22px rgba(180, 80, 20, 0.35);
      }
      #${OVERLAY_ID} button.secondary {
        background: rgba(255, 255, 255, 0.08);
        color: #eaf6ff;
        box-shadow: none;
      }
      #${OVERLAY_ID} .studio-toolbar {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 16px;
        padding: 0 20px 18px;
      }
      #${OVERLAY_ID} .studio-search {
        min-width: 280px;
        padding: 11px 14px;
        border-radius: 999px;
        border: 1px solid rgba(255, 200, 106, 0.24);
        background: rgba(255, 255, 255, 0.06);
        color: #eaf6ff;
        font: 600 13px "Trebuchet MS", Arial, sans-serif;
      }
      #${OVERLAY_ID} .studio-body {
        display: grid;
        grid-template-columns: 300px minmax(0, 1fr) 320px;
        gap: 14px;
        min-height: 0;
      }
      #${OVERLAY_ID} .studio-pane {
        display: flex;
        flex-direction: column;
        min-height: 0;
      }
      #${OVERLAY_ID} .entity-list {
        padding: 14px;
        overflow: auto;
        gap: 10px;
        display: flex;
        flex-direction: column;
      }
      #${OVERLAY_ID} .entity-card {
        border: 1px solid rgba(255, 200, 106, 0.14);
        border-radius: 16px;
        padding: 12px 14px;
        background: rgba(20, 10, 6, 0.78);
        color: #eaf6ff;
        text-align: left;
        cursor: pointer;
        width: 100%;
      }
      #${OVERLAY_ID} .entity-card.is-active {
        border-color: rgba(255, 160, 60, 0.7);
        box-shadow: inset 0 0 0 1px rgba(255, 160, 60, 0.22);
      }
      #${OVERLAY_ID} .entity-card__top { display: flex; justify-content: space-between; gap: 10px; align-items: baseline; }
      #${OVERLAY_ID} .entity-card__name { font: 700 15px "Trebuchet MS", Arial, sans-serif; }
      #${OVERLAY_ID} .entity-card__meta,
      #${OVERLAY_ID} .inspector-note,
      #${OVERLAY_ID} .studio-status { color: rgba(232, 244, 255, 0.68); font: 12px "Trebuchet MS", Arial, sans-serif; }
      #${OVERLAY_ID} .entity-card__tag { font: 700 10px "Trebuchet MS", Arial, sans-serif; letter-spacing: 0.08em; text-transform: uppercase; color: #ffc86a; }
      #${OVERLAY_ID} .preview-pane { padding: 14px; }
      #${OVERLAY_ID} .preview-stage { position: relative; flex: 1; min-height: 420px; border-radius: 20px; overflow: hidden; background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01)), radial-gradient(circle at top, rgba(255, 160, 80, 0.1), rgba(9, 16, 28, 0.96)); border: 1px solid rgba(255, 200, 106, 0.16); }
      #${OVERLAY_ID} .preview-stage canvas { width: 100%; height: 100%; display: block; }
      #${OVERLAY_ID} .preview-caption { display: flex; justify-content: space-between; gap: 12px; padding: 12px 4px 0; color: rgba(232, 244, 255, 0.72); font: 12px "Trebuchet MS", Arial, sans-serif; }
      #${OVERLAY_ID} .inspector { padding: 16px; overflow: auto; gap: 12px; display: flex; flex-direction: column; }
      #${OVERLAY_ID} .inspector-block { border: 1px solid rgba(255, 200, 106, 0.12); border-radius: 16px; padding: 14px; background: rgba(16, 8, 4, 0.82); }
      #${OVERLAY_ID} .inspector-block h3 { margin: 0 0 10px; font: 700 13px "Trebuchet MS", Arial, sans-serif; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255, 200, 106, 0.72); }
      #${OVERLAY_ID} .inspector-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 12px; }
      #${OVERLAY_ID} .inspector-field { display: flex; flex-direction: column; gap: 6px; }
      #${OVERLAY_ID} .inspector-field--full { grid-column: 1 / -1; }
      #${OVERLAY_ID} .inspector-label { color: rgba(232, 244, 255, 0.58); font: 700 10px "Trebuchet MS", Arial, sans-serif; letter-spacing: 0.08em; text-transform: uppercase; }
      #${OVERLAY_ID} .inspector-value,
      #${OVERLAY_ID} input[type="number"] { width: 100%; min-width: 0; box-sizing: border-box; border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.15); background: rgba(255, 255, 255, 0.07); color: #eaf6ff; padding: 9px 10px; font: 600 13px "Trebuchet MS", Arial, sans-serif; }
      #${OVERLAY_ID} input[type="number"]:disabled { opacity: 0.45; cursor: not-allowed; }
      #${OVERLAY_ID} .studio-footer { padding: 0 6px; }
      @media (max-width: 1220px) {
        #${OVERLAY_ID} .studio-body { grid-template-columns: 260px minmax(0, 1fr); }
        #${OVERLAY_ID} .inspector-pane { grid-column: 1 / -1; }
      }
      @media (max-width: 860px) {
        #${OVERLAY_ID} .studio-body { grid-template-columns: 1fr; }
        #${OVERLAY_ID} .studio-toolbar { flex-direction: column; align-items: stretch; }
        #${OVERLAY_ID} .studio-search { min-width: 0; }
      }
    </style>
    <div class="hitbox-studio">
      <div class="studio-panel">
        <div class="studio-header">
          <div>
            <h2 class="studio-title">Boss Hitbox Studio</h2>
            <p class="studio-subtitle">Boss-only hitbox editor. Values here are the <strong>final dimensions</strong> — boss catalog entries define their own scale and hitbox size directly.</p>
          </div>
          <div class="studio-actions">
            <button type="button" class="primary" data-action="export">Export enemy_catalog.js</button>
            <button type="button" class="secondary" data-action="close">Close</button>
          </div>
        </div>
        <div class="studio-toolbar">
          <input type="text" class="studio-search" data-search placeholder="Search bosses...">
        </div>
      </div>
      <div class="studio-body">
        <div class="studio-pane studio-panel entity-list" data-entity-list></div>
        <div class="studio-pane studio-panel preview-pane">
          <div class="preview-stage">
            <canvas data-preview-canvas></canvas>
          </div>
          <div class="preview-caption">
            <div data-preview-title>Nothing selected</div>
            <div data-preview-meta></div>
          </div>
        </div>
        <div class="studio-pane studio-panel inspector-pane">
          <div class="inspector" data-inspector>
            <div class="inspector-block">
              <h3>Selection</h3>
              <div class="inspector-grid">
                <div class="inspector-field inspector-field--full">
                  <div class="inspector-label">Boss</div>
                  <div class="inspector-value" data-info-name>None</div>
                </div>
                <div class="inspector-field">
                  <div class="inspector-label">Base Scale</div>
                  <div class="inspector-value" data-info-scale>-</div>
                </div>
                <div class="inspector-field">
                  <div class="inspector-label">Body Radius</div>
                  <div class="inspector-value" data-info-radius>-</div>
                </div>
                <div class="inspector-field">
                  <div class="inspector-label">Frame Count</div>
                  <div class="inspector-value" data-info-frames>-</div>
                </div>
              </div>
            </div>
            <div class="inspector-block">
              <h3>Body Hitbox</h3>
              <div class="inspector-grid">
                <div class="inspector-field">
                  <div class="inspector-label">Width</div>
                  <input type="number" step="1" data-primary-input>
                </div>
                <div class="inspector-field">
                  <div class="inspector-label">Height</div>
                  <input type="number" step="1" data-secondary-input>
                </div>
                <div class="inspector-field">
                  <div class="inspector-label">Offset X</div>
                  <input type="number" step="1" data-offset-x-input>
                </div>
                <div class="inspector-field">
                  <div class="inspector-label">Offset Y</div>
                  <input type="number" step="1" data-offset-y-input>
                </div>
              </div>
            </div>
            <div class="inspector-block">
              <h3>Timing & Damage</h3>
              <div class="inspector-grid">
                <div class="inspector-field">
                  <div class="inspector-label">Attack Hit Frame</div>
                  <input type="number" min="1" step="1" data-attack-hit-frame-input>
                </div>
                <div class="inspector-field">
                  <div class="inspector-label">Attack Hit Damage</div>
                  <input type="number" min="0" step="1" data-attack-hit-damage-input>
                </div>
                <div class="inspector-field inspector-field--full">
                  <div class="inspector-label">Collision Damage</div>
                  <input type="number" min="0" step="1" data-collision-damage-input>
                </div>
              </div>
            </div>
            <div class="inspector-block">
              <h3>Weapon Hitbox</h3>
              <div class="inspector-grid">
                <div class="inspector-field">
                  <div class="inspector-label">Width</div>
                  <input type="number" min="1" step="1" data-weapon-width-input>
                </div>
                <div class="inspector-field">
                  <div class="inspector-label">Height</div>
                  <input type="number" min="1" step="1" data-weapon-height-input>
                </div>
                <div class="inspector-field">
                  <div class="inspector-label">Offset X</div>
                  <input type="number" step="1" data-weapon-offset-x-input>
                </div>
                <div class="inspector-field">
                  <div class="inspector-label">Offset Y</div>
                  <input type="number" step="1" data-weapon-offset-y-input>
                </div>
              </div>
            </div>
            <div class="inspector-block">
              <h3>Notes</h3>
              <div class="inspector-note" data-inspector-note>Select a boss to inspect or edit.</div>
              <div class="studio-actions" style="margin-top:12px;">
                <button type="button" class="secondary" data-action="reset">Reset to Defaults</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="studio-footer studio-status" data-status></div>
    </div>
  `;
  document.body.appendChild(overlay);

  const els = {
    search: overlay.querySelector("[data-search]"),
    entityList: overlay.querySelector("[data-entity-list]"),
    previewCanvas: overlay.querySelector("[data-preview-canvas]"),
    previewTitle: overlay.querySelector("[data-preview-title]"),
    previewMeta: overlay.querySelector("[data-preview-meta]"),
    infoName: overlay.querySelector("[data-info-name]"),
    infoScale: overlay.querySelector("[data-info-scale]"),
    infoRadius: overlay.querySelector("[data-info-radius]"),
    infoFrames: overlay.querySelector("[data-info-frames]"),
    primaryInput: overlay.querySelector("[data-primary-input]"),
    secondaryInput: overlay.querySelector("[data-secondary-input]"),
    offsetXInput: overlay.querySelector("[data-offset-x-input]"),
    offsetYInput: overlay.querySelector("[data-offset-y-input]"),
    attackHitFrameInput: overlay.querySelector("[data-attack-hit-frame-input]"),
    attackHitDamageInput: overlay.querySelector("[data-attack-hit-damage-input]"),
    collisionDamageInput: overlay.querySelector("[data-collision-damage-input]"),
    weaponWidthInput: overlay.querySelector("[data-weapon-width-input]"),
    weaponHeightInput: overlay.querySelector("[data-weapon-height-input]"),
    weaponOffsetXInput: overlay.querySelector("[data-weapon-offset-x-input]"),
    weaponOffsetYInput: overlay.querySelector("[data-weapon-offset-y-input]"),
    note: overlay.querySelector("[data-inspector-note]"),
    status: overlay.querySelector("[data-status]"),
    reset: overlay.querySelector("[data-action='reset']"),
    exportBtn: overlay.querySelector("[data-action='export']"),
    closeBtn: overlay.querySelector("[data-action='close']"),
  };

  function updatePreviewCanvasSize() {
    const canvas = els.previewCanvas;
    if (!canvas || !canvas.parentElement) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  function ensureSelection() {
    const entries = getFilteredEntries();
    if (!entries.length) { state.selectedId = null; return; }
    if (!entries.some((e) => e.id === state.selectedId)) state.selectedId = entries[0].id;
  }

  function renderEntityList() {
    ensureSelection();
    if (!els.entityList) return;
    els.entityList.innerHTML = "";
    const entries = getFilteredEntries();
    entries.forEach((entry) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `entity-card${entry.id === state.selectedId ? " is-active" : ""}`;
      button.innerHTML = `
        <div class="entity-card__top">
          <div class="entity-card__name">${entry.label}</div>
          <div class="entity-card__tag">boss</div>
        </div>
        <div class="entity-card__meta">${entry.subtitle}</div>
      `;
      button.addEventListener("click", () => {
        state.selectedId = entry.id;
        syncInspector();
        renderEntityList();
      });
      els.entityList.appendChild(button);
    });
    syncInspector();
  }

  function getInspectorData() {
    const entry = getSelectedEntry();
    if (!entry) return null;
    const def = getEnemyCatalog()?.[entry.key] || null;
    if (!def) return null;
    const clip = getEnemyClip(entry.key);
    const hitbox = resolveEnemyHitbox(def);
    return {
      key: entry.key,
      label: def.displayName || entry.key,
      scale: getEnemyScale(entry.key),
      radius: Number.isFinite(def.baseRadius) ? def.baseRadius : Math.max(hitbox.width, hitbox.height) * 0.5,
      frameCount: getClipFrameCount(clip),
      clip,
      hitbox,
      weaponHitbox: def.weaponHitbox || null,
      attackHitFrame: Number.isFinite(def.attackHitFrame) ? def.attackHitFrame : null,
      attackHitDamage: Number.isFinite(def.attackHitDamage) ? def.attackHitDamage : null,
      collisionDamage: Number.isFinite(def.damage) ? def.damage : null,
    };
  }

  function setInputState(input, value, { disabled = false, placeholder = "" } = {}) {
    if (!input) return;
    input.disabled = Boolean(disabled);
    input.placeholder = placeholder;
    input.value = value === null || value === undefined || value === "" ? "" : String(value);
  }

  function syncInspector() {
    const data = getInspectorData();
    if (!data) {
      els.infoName.textContent = "None";
      els.infoScale.textContent = "-";
      els.infoRadius.textContent = "-";
      els.infoFrames.textContent = "-";
      els.previewTitle.textContent = "Nothing selected";
      els.previewMeta.textContent = "";
      els.note.textContent = "Select a boss to inspect or edit.";
      return;
    }
    els.infoName.textContent = data.label;
    els.infoScale.textContent = Number.isFinite(data.scale) ? data.scale.toFixed(2) : "-";
    els.infoRadius.textContent = Number.isFinite(data.radius) ? Math.round(data.radius) : "-";
    els.infoFrames.textContent = Number.isFinite(data.frameCount) ? String(data.frameCount) : "-";
    els.previewTitle.textContent = data.label;
    els.previewMeta.textContent = data.key;
    els.note.textContent = "Boss hitbox values are final dimensions — they are used directly at runtime with no additional scaling.";

    const hitbox = data.hitbox;
    setInputState(els.primaryInput, Math.round(hitbox.width));
    setInputState(els.secondaryInput, Math.round(hitbox.height));
    setInputState(els.offsetXInput, Math.round(hitbox.offsetX));
    setInputState(els.offsetYInput, Math.round(hitbox.offsetY));
    setInputState(els.attackHitFrameInput, data.attackHitFrame, { placeholder: "auto" });
    if (els.attackHitFrameInput) {
      els.attackHitFrameInput.min = "1";
      els.attackHitFrameInput.max = String(Math.max(1, data.frameCount || 1));
    }
    setInputState(els.attackHitDamageInput, data.attackHitDamage, { placeholder: "default" });
    setInputState(els.collisionDamageInput, data.collisionDamage, { placeholder: "default" });
    setInputState(els.weaponWidthInput, data.weaponHitbox?.width ?? "", { placeholder: "off" });
    setInputState(els.weaponHeightInput, data.weaponHitbox?.height ?? "", { placeholder: "off" });
    setInputState(els.weaponOffsetXInput, data.weaponHitbox?.offsetX ?? "");
    setInputState(els.weaponOffsetYInput, data.weaponHitbox?.offsetY ?? "");
  }

  function applyInputs() {
    const entry = getSelectedEntry();
    if (!entry) return;
    const def = getEnemyCatalog()?.[entry.key];
    if (!def) return;
    const width = Number(els.primaryInput.value);
    const height = Number(els.secondaryInput.value);
    const offsetX = Number(els.offsetXInput.value);
    const offsetY = Number(els.offsetYInput.value);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;

    def.hitbox = {
      width,
      height,
      offsetX: Number.isFinite(offsetX) ? offsetX : 0,
      offsetY: Number.isFinite(offsetY) ? offsetY : 0,
    };

    if (els.attackHitFrameInput.value === "") delete def.attackHitFrame;
    else if (Number.isFinite(Number(els.attackHitFrameInput.value))) def.attackHitFrame = Math.round(Number(els.attackHitFrameInput.value));

    if (els.attackHitDamageInput.value === "") delete def.attackHitDamage;
    else if (Number.isFinite(Number(els.attackHitDamageInput.value))) def.attackHitDamage = Math.round(Number(els.attackHitDamageInput.value));

    if (els.collisionDamageInput.value === "") delete def.damage;
    else if (Number.isFinite(Number(els.collisionDamageInput.value))) def.damage = Math.round(Number(els.collisionDamageInput.value));

    const weaponWidth = Number(els.weaponWidthInput.value);
    const weaponHeight = Number(els.weaponHeightInput.value);
    const weaponOffsetX = Number(els.weaponOffsetXInput.value);
    const weaponOffsetY = Number(els.weaponOffsetYInput.value);
    if (Number.isFinite(weaponWidth) && Number.isFinite(weaponHeight) && weaponWidth > 0 && weaponHeight > 0) {
      def.weaponHitbox = {
        width: weaponWidth,
        height: weaponHeight,
        offsetX: Number.isFinite(weaponOffsetX) ? weaponOffsetX : 0,
        offsetY: Number.isFinite(weaponOffsetY) ? weaponOffsetY : 0,
      };
    } else {
      delete def.weaponHitbox;
    }

    if (window.BattlechurchEnemyDefinitions?.[entry.key]) {
      Object.assign(window.BattlechurchEnemyDefinitions[entry.key], {
        hitbox: deepClone(def.hitbox),
        attackHitFrame: def.attackHitFrame,
        attackHitDamage: def.attackHitDamage,
        damage: def.damage,
      });
      if (def.weaponHitbox) window.BattlechurchEnemyDefinitions[entry.key].weaponHitbox = deepClone(def.weaponHitbox);
      else delete window.BattlechurchEnemyDefinitions[entry.key].weaponHitbox;
    }
    bindings.onHitboxChange?.(entry.key, deepClone(def.hitbox), deepClone(def.weaponHitbox || null));
    setStatus(`Updated ${entry.key} hitbox (pre-scale).`);
  }

  function resetVisibleFields() {
    const entry = getSelectedEntry();
    if (!entry) return;
    const def = getEnemyCatalog()?.[entry.key];
    if (!def) return;
    const fallback = defaultEnemyHitbox(def);
    els.primaryInput.value = Math.round(fallback.width);
    els.secondaryInput.value = Math.round(fallback.height);
    els.offsetXInput.value = 0;
    els.offsetYInput.value = 0;
    els.weaponWidthInput.value = "";
    els.weaponHeightInput.value = "";
    els.weaponOffsetXInput.value = "";
    els.weaponOffsetYInput.value = "";
    applyInputs();
  }

  function exportCatalog() {
    const catalog = getEnemyCatalog();
    const base = baseCatalogSnapshot || catalog || {};
    const merged = deepClone(base || {});
    Object.keys(catalog || {}).forEach((key) => {
      if (!key.startsWith("boss")) return;
      const live = catalog[key];
      if (!live || typeof live !== "object") return;
      merged[key] = merged[key] || {};
      Object.keys(live).forEach((prop) => {
        const value = live[prop];
        if (value === undefined || value === null) return;
        merged[key][prop] = deepClone(value);
      });
    });
    const data = deepClone(merged);
    const body = `(function(global) {\n  const ENEMY_CATALOG = ${JSON.stringify(data, null, 2)};\n  const ns = global.BattlechurchEnemyCatalog || (global.BattlechurchEnemyCatalog = {});\n  ns.catalog = ENEMY_CATALOG;\n  const defs = global.BattlechurchEnemyDefinitions || (global.BattlechurchEnemyDefinitions = {});\n  Object.assign(defs, ENEMY_CATALOG);\n})(typeof window !== "undefined" ? window : globalThis);\n`;
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

  function drawRoundedRect(ctx, x, y, width, height, radius, fill = true, stroke = false) {
    const r = typeof radius === "number" ? { tl: radius, tr: radius, br: radius, bl: radius } : radius;
    ctx.beginPath();
    ctx.moveTo(x + r.tl, y);
    ctx.lineTo(x + width - r.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r.tr);
    ctx.lineTo(x + width, y + height - r.br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r.br, y + height);
    ctx.lineTo(x + r.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r.bl);
    ctx.lineTo(x, y + r.tl);
    ctx.quadraticCurveTo(x, y, x + r.tl, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  function drawPreviewGrid(ctx, canvas) {
    ctx.save();
    ctx.fillStyle = "#100808";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    const step = 28;
    for (let x = step; x < canvas.width; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = step; y < canvas.height; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255, 160, 60, 0.22)";
    ctx.beginPath(); ctx.moveTo(canvas.width * 0.5, 0); ctx.lineTo(canvas.width * 0.5, canvas.height); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, canvas.height * 0.62); ctx.lineTo(canvas.width, canvas.height * 0.62); ctx.stroke();
    ctx.restore();
  }

  function drawSpritePreview(ctx, clip, centerX, centerY, fitScale, preferredFrame, options = {}) {
    if (!clip || !clip.image || !clip.frameWidth || !clip.frameHeight) return null;
    const frameRect = getFrameSourceRect(clip, preferredFrame || 0);
    if (!frameRect) return null;
    const clipScale = Number.isFinite(clip.renderScale) && clip.renderScale > 0 ? clip.renderScale : 1;
    const sourceBounds = options.sourceBounds || { x: 0, y: 0, width: clip.frameWidth, height: clip.frameHeight };
    const drawW = sourceBounds.width * fitScale * clipScale;
    const drawH = sourceBounds.height * fitScale * clipScale;
    const frameCenterX = clip.frameWidth * 0.5;
    const frameCenterY = clip.frameHeight * 0.5;
    const boundsCenterX = sourceBounds.x + sourceBounds.width * 0.5;
    const boundsCenterY = sourceBounds.y + sourceBounds.height * 0.5;
    const drawX = centerX + (boundsCenterX - frameCenterX) * fitScale * clipScale - drawW * 0.5;
    const drawY = centerY + (boundsCenterY - frameCenterY) * fitScale * clipScale - drawH * 0.5;
    ctx.drawImage(clip.image, frameRect.sx + sourceBounds.x, frameRect.sy + sourceBounds.y, sourceBounds.width, sourceBounds.height, drawX, drawY, drawW, drawH);
    return { width: drawW, height: drawH, scale: fitScale * clipScale };
  }

  function drawPreview() {
    updatePreviewCanvasSize();
    const canvas = els.previewCanvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawPreviewGrid(ctx, canvas);
    const data = getInspectorData();
    if (!data) return;

    const centerX = canvas.width * 0.5;
    const centerY = canvas.height * 0.58;
    const clip = data.clip;
    const baseScale = Number.isFinite(data.scale) && data.scale > 0 ? data.scale : 1;
    const worldScale = getWorldScale();
    const sourceBounds = clip ? getTrimmedSpriteBounds(data.key, clip) : null;
    const preview = drawSpritePreview(ctx, clip, centerX, centerY, baseScale * worldScale, Math.max(0, (Number(els.attackHitFrameInput.value) || 1) - 1), { sourceBounds });
    const overlayScale = preview?.scale || (baseScale * worldScale);
    const hitbox = data.hitbox;
    const width = hitbox.width * overlayScale;
    const height = hitbox.height * overlayScale;
    const offsetX = hitbox.offsetX * overlayScale;
    const offsetY = hitbox.offsetY * overlayScale;

    ctx.save();
    ctx.strokeStyle = "rgba(255, 160, 60, 0.95)";
    ctx.fillStyle = "rgba(255, 160, 60, 0.12)";
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, centerX + offsetX - width * 0.5, centerY + offsetY - height * 0.5, width, height, 12, true, true);
    ctx.restore();

    if (data.weaponHitbox) {
      const weapon = data.weaponHitbox;
      const drawW = weapon.width * overlayScale;
      const drawH = weapon.height * overlayScale;
      const drawX = centerX + hitbox.offsetX * overlayScale + (weapon.offsetX || 0) * overlayScale - drawW * 0.5;
      const drawY = centerY + hitbox.offsetY * overlayScale + (weapon.offsetY || 0) * overlayScale - drawH * 0.5;
      ctx.save();
      ctx.strokeStyle = "rgba(255, 107, 107, 0.95)";
      ctx.fillStyle = "rgba(255, 107, 107, 0.10)";
      ctx.lineWidth = 2;
      drawRoundedRect(ctx, drawX, drawY, drawW, drawH, 10, true, true);
      ctx.restore();
    }

  }

  function startRenderLoop() {
    if (state.rafId) return;
    const step = () => {
      if (!state.active) { state.rafId = null; return; }
      drawPreview();
      state.rafId = window.requestAnimationFrame(step);
    };
    state.rafId = window.requestAnimationFrame(step);
  }

  function setActive(active) {
    state.active = Boolean(active);
    overlay.style.display = state.active ? "block" : "none";
    window.__battlechurchBossHitboxEditorActive = state.active;
    if (state.active) {
      renderEntityList();
      startRenderLoop();
    }
  }

  els.search.addEventListener("input", () => {
    state.search = String(els.search.value || "");
    renderEntityList();
  });
  els.primaryInput.addEventListener("input", applyInputs);
  els.secondaryInput.addEventListener("input", applyInputs);
  els.offsetXInput.addEventListener("input", applyInputs);
  els.offsetYInput.addEventListener("input", applyInputs);
  els.attackHitFrameInput.addEventListener("input", applyInputs);
  els.attackHitDamageInput.addEventListener("input", applyInputs);
  els.collisionDamageInput.addEventListener("input", applyInputs);
  els.weaponWidthInput.addEventListener("input", applyInputs);
  els.weaponHeightInput.addEventListener("input", applyInputs);
  els.weaponOffsetXInput.addEventListener("input", applyInputs);
  els.weaponOffsetYInput.addEventListener("input", applyInputs);
  els.reset.addEventListener("click", resetVisibleFields);
  els.exportBtn.addEventListener("click", exportCatalog);
  els.closeBtn.addEventListener("click", () => setActive(false));

  window.addEventListener("resize", updatePreviewCanvasSize);

  window.BattlechurchBossHitboxEditor = {
    initialize(options = {}) {
      bindings.getAssets = options.getAssets || bindings.getAssets;
      bindings.getEnemyCatalog = options.getEnemyCatalog || bindings.getEnemyCatalog;
      bindings.getEnemyTypes = options.getEnemyTypes || bindings.getEnemyTypes;
      bindings.onHitboxChange = options.onHitboxChange || bindings.onHitboxChange;
      baseCatalogSnapshot = deepClone(getEnemyCatalog());
      renderEntityList();
      setActive(false);
    },
    setActive,
    isActive: () => state.active,
  };
})(typeof window !== "undefined" ? window : null, typeof document !== "undefined" ? document : null);
