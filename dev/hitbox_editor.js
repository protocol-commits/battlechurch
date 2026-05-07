(function setupHitboxEditor(window, document) {
  if (!window || !document) return;

  const OVERLAY_ID = "hitboxEditorOverlay";
  const STATUS_DELAY = 1800;
  const FILTERS = [
    { key: "all", label: "All" },
    { key: "enemy", label: "Enemies" },
    { key: "player", label: "Player" },
    { key: "npc", label: "NPC" },
    { key: "projectile", label: "Projectiles" },
  ];

  const state = {
    active: false,
    selectedId: null,
    filter: "all",
    search: "",
    playerPreviewState: "attackMelee",
    rafId: null,
    statusTimer: null,
  };

  const bindings = {
    getAssets: () => null,
    getEnemyCatalog: () => ({}),
    getEnemyTypes: () => ({}),
    getPlayerPreview: () => null,
    getPlayerConfig: () => null,
    getNpcPreview: () => null,
    getProjectileConfig: () => ({}),
    onHitboxChange: null,
    onPlayerHitboxChange: null,
    onPlayerWeaponHitboxChange: null,
    onPlayerDashSlashHitboxChange: null,
    onPlayerRushHitboxChange: null,
    onPlayerAttackHitFrameChange: null,
    onNpcRadiusChange: null,
    onProjectileRadiusChange: null,
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

  function getPlayerPreview() {
    return bindings.getPlayerPreview ? bindings.getPlayerPreview() : null;
  }

  function getPlayerConfig() {
    return bindings.getPlayerConfig ? bindings.getPlayerConfig() : null;
  }

  function getNpcPreview() {
    return bindings.getNpcPreview ? bindings.getNpcPreview() : null;
  }

  function getProjectileConfig() {
    return bindings.getProjectileConfig ? bindings.getProjectileConfig() : {};
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

  function setStatus(message, isError = false) {
    if (!els.status) return;
    els.status.textContent = message || "";
    els.status.style.color = isError ? "#ffb2b2" : "rgba(231, 176, 102, 0.82)";
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

  function getPlayerClip() {
    const player = getPlayerPreview();
    const clips = player?.animator?.clips || null;
    if (!clips) return player?.animator?.currentClip || null;
    const clipKey =
      state.playerPreviewState === "rushAttack" || state.playerPreviewState === "dashSlash"
        ? "attackMelee"
        : state.playerPreviewState;
    return clips[clipKey] || clips.attackMelee || clips.walk || clips.idle || player?.animator?.currentClip || null;
  }

  function getNpcClip() {
    const npc = getNpcPreview();
    return npc?.animator?.currentClip || npc?.animator?.clips?.walk || npc?.animator?.clips?.idle || null;
  }

  function getProjectileClip(key) {
    const assets = getAssets();
    const clip = assets?.projectiles?.[key] || null;
    return clip?.image ? clip : null;
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
    const fallback = {
      x: 0,
      y: 0,
      width: Math.max(1, clip?.frameWidth || 1),
      height: Math.max(1, clip?.frameHeight || 1),
    };
    if (!clip?.image || !clip.frameWidth || !clip.frameHeight) {
      spriteBoundsCache.set(cacheKey, fallback);
      return fallback;
    }
    try {
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
      const sampleFrames = Array.isArray(clip.frameMap) && clip.frameMap.length
        ? clip.frameMap.slice(0, Math.min(6, clip.frameMap.length))
        : [0];
      sampleFrames.forEach((frameIndex) => {
        sampleCtx.clearRect(0, 0, clip.frameWidth, clip.frameHeight);
        const cols = Math.max(1, Math.floor(clip.image.width / clip.frameWidth));
        const sx = (frameIndex % cols) * clip.frameWidth;
        const sy = Math.floor(frameIndex / cols) * clip.frameHeight;
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
      });
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
    } catch (error) {
      spriteBoundsCache.set(cacheKey, fallback);
      return fallback;
    }
  }

  function buildEntries() {
    const entries = [];
    entries.push({
      id: "player:hero",
      category: "player",
      key: "player",
      label: "Player",
      subtitle: "Hero body collision",
    });
    entries.push({
      id: "npc:default",
      category: "npc",
      key: "npc",
      label: "NPC",
      subtitle: "Congregation body collision",
    });

    const projectileConfig = getProjectileConfig();
    Object.keys(projectileConfig || {})
      .sort((a, b) => a.localeCompare(b))
      .forEach((key) => {
        entries.push({
          id: `projectile:${key}`,
          category: "projectile",
          key,
          label: key.replace(/_/g, " "),
          subtitle: "Projectile radius",
        });
      });

    const catalog = getEnemyCatalog();
    Object.keys(catalog || {})
      .sort((a, b) => a.localeCompare(b))
      .forEach((key) => {
        if (key.startsWith("boss")) return;
        const def = catalog[key] || {};
        entries.push({
          id: `enemy:${key}`,
          category: "enemy",
          key,
          label: def.displayName || key,
          subtitle: key,
        });
      });

    return entries;
  }

  function getFilteredEntries() {
    const search = String(state.search || "").trim().toLowerCase();
    return buildEntries().filter((entry) => {
      if (state.filter !== "all" && entry.category !== state.filter) return false;
      if (!search) return true;
      const haystack = `${entry.label} ${entry.subtitle} ${entry.key} ${entry.category}`.toLowerCase();
      return haystack.includes(search);
    });
  }

  function getSelectedEntry() {
    const entries = buildEntries();
    return entries.find((entry) => entry.id === state.selectedId) || null;
  }

  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.innerHTML = `
    <style>
      #${OVERLAY_ID} {
        --hb-shell-top: rgba(12, 18, 30, 0.95);
        --hb-shell-bottom: rgba(7, 10, 18, 0.95);
        --hb-shell-border: rgba(255, 218, 162, 0.34);
        --hb-divider: rgba(255, 214, 148, 0.22);
        --hb-title: #ffd978;
        --hb-body: #e8d2ae;
        --hb-hint: rgba(231, 176, 102, 0.82);
        --hb-button-bg: rgba(255, 154, 58, 0.16);
        --hb-button-border: rgba(255, 196, 98, 0.42);
        --hb-button-text: #f6e4c8;
        position: fixed;
        inset: 0;
        z-index: 10020;
        display: none;
        color: var(--hb-body);
        background: rgba(6, 10, 18, 0.9);
        font-family: var(--ui-font-family, "Orbitron"), sans-serif;
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
        background: linear-gradient(180deg, var(--hb-shell-top) 0%, var(--hb-shell-bottom) 100%);
        border: 2px solid var(--hb-shell-border);
        border-radius: 18px;
        box-shadow: 0 10px 24px rgba(0, 0, 0, 0.45);
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
        font: 700 28px var(--ui-font-family, "Orbitron"), sans-serif;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--hb-title);
      }
      #${OVERLAY_ID} .studio-subtitle {
        margin: 6px 0 0;
        color: var(--hb-body);
        opacity: 0.82;
        font-size: 14px;
      }
      #${OVERLAY_ID} .studio-actions,
      #${OVERLAY_ID} .studio-filters {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
      }
      #${OVERLAY_ID} button,
      #${OVERLAY_ID} .filter-pill {
        border-radius: 10px;
        padding: 10px 14px;
        cursor: pointer;
        font: 700 12px var(--ui-font-family, "Orbitron"), sans-serif;
        letter-spacing: 0.04em;
      }
      #${OVERLAY_ID} button {
        border: 1px solid var(--hb-button-border);
        background: var(--hb-button-bg);
        color: var(--hb-button-text);
        box-shadow: none;
      }
      #${OVERLAY_ID} button.secondary,
      #${OVERLAY_ID} .filter-pill {
        border: 1px solid var(--hb-shell-border);
        background: rgba(255, 222, 163, 0.1);
        color: var(--hb-button-text);
        box-shadow: none;
      }
      #${OVERLAY_ID} button:hover,
      #${OVERLAY_ID} .filter-pill:hover {
        background: rgba(255, 172, 78, 0.24);
      }
      #${OVERLAY_ID} .filter-pill.is-active {
        background: rgba(255, 176, 86, 0.2);
        color: #ffd978;
      }
      #${OVERLAY_ID} .studio-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        padding: 0 20px 18px;
      }
      #${OVERLAY_ID} .studio-search {
        min-width: 280px;
        padding: 11px 14px;
        border-radius: 999px;
        border: 1px solid var(--hb-shell-border);
        background: rgba(23, 16, 10, 0.58);
        color: #f3e2c1;
        font: 600 13px var(--ui-font-family, "Orbitron"), sans-serif;
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
        border: 1px solid rgba(255, 214, 148, 0.16);
        border-radius: 16px;
        padding: 12px 14px;
        background: rgba(10, 14, 24, 0.82);
        color: #f6e4c8;
        text-align: left;
      }
      #${OVERLAY_ID} .entity-card.is-active {
        border-color: rgba(255, 200, 106, 0.62);
        box-shadow: inset 0 0 0 1px rgba(255, 200, 106, 0.18);
      }
      #${OVERLAY_ID} .entity-card__top {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        align-items: baseline;
      }
      #${OVERLAY_ID} .entity-card__name {
        font: 700 15px var(--ui-font-family, "Orbitron"), sans-serif;
      }
      #${OVERLAY_ID} .entity-card__meta,
      #${OVERLAY_ID} .inspector-note,
      #${OVERLAY_ID} .studio-status {
        color: rgba(232, 244, 255, 0.68);
        font: 12px "Trebuchet MS", Arial, sans-serif;
      }
      #${OVERLAY_ID} .entity-card__tag {
        font: 700 10px var(--ui-font-family, "Orbitron"), sans-serif;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--hb-hint);
      }
      #${OVERLAY_ID} .preview-pane {
        padding: 14px;
      }
      #${OVERLAY_ID} .preview-stage {
        position: relative;
        flex: 1;
        min-height: 420px;
        border-radius: 20px;
        overflow: hidden;
        background:
          linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01)),
          radial-gradient(circle at top, rgba(255, 176, 86, 0.14), rgba(9, 16, 28, 0.96));
        border: 1px solid rgba(255, 214, 148, 0.18);
      }
      #${OVERLAY_ID} .preview-stage canvas {
        width: 100%;
        height: 100%;
        display: block;
      }
      #${OVERLAY_ID} .preview-caption {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 12px 4px 0;
        color: rgba(232, 244, 255, 0.72);
        font: 12px "Trebuchet MS", Arial, sans-serif;
      }
      #${OVERLAY_ID} .inspector {
        padding: 16px;
        overflow: auto;
        gap: 12px;
        display: flex;
        flex-direction: column;
      }
      #${OVERLAY_ID} .inspector-block {
        border: 1px solid rgba(255, 214, 148, 0.14);
        border-radius: 16px;
        padding: 14px;
        background: rgba(10, 14, 24, 0.86);
      }
      #${OVERLAY_ID} .inspector-block h3 {
        margin: 0 0 10px;
        font: 700 13px "Trebuchet MS", Arial, sans-serif;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: rgba(232, 244, 255, 0.72);
      }
      #${OVERLAY_ID} .inspector-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px 12px;
      }
      #${OVERLAY_ID} .inspector-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      #${OVERLAY_ID} .inspector-field--full {
        grid-column: 1 / -1;
      }
      #${OVERLAY_ID} .inspector-label {
        color: rgba(232, 244, 255, 0.58);
        font: 700 10px "Trebuchet MS", Arial, sans-serif;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      #${OVERLAY_ID} .inspector-value,
      #${OVERLAY_ID} input[type="number"] {
        width: 100%;
        min-width: 0;
        box-sizing: border-box;
        border-radius: 10px;
        border: 1px solid var(--hb-shell-border);
        background: rgba(23, 16, 10, 0.58);
        color: #f3e2c1;
        padding: 9px 10px;
        font: 600 13px var(--ui-font-family, "Orbitron"), sans-serif;
      }
      #${OVERLAY_ID} input[type="number"]:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
      #${OVERLAY_ID} .studio-footer {
        padding: 0 6px;
      }
      @media (max-width: 1220px) {
        #${OVERLAY_ID} .studio-body {
          grid-template-columns: 260px minmax(0, 1fr);
        }
        #${OVERLAY_ID} .inspector-pane {
          grid-column: 1 / -1;
        }
      }
      @media (max-width: 860px) {
        #${OVERLAY_ID} .studio-body {
          grid-template-columns: 1fr;
        }
        #${OVERLAY_ID} .studio-toolbar {
          flex-direction: column;
          align-items: stretch;
        }
        #${OVERLAY_ID} .studio-search {
          min-width: 0;
        }
      }
    </style>
    <div class="hitbox-studio">
      <div class="studio-panel">
        <div class="studio-header">
          <div>
            <h2 class="studio-title">Hitbox Studio</h2>
            <p class="studio-subtitle">Inspect enemies, player, NPCs, and projectiles in one place. Enemy editing stays live; player and projectile radius changes apply where supported.</p>
          </div>
          <div class="studio-actions">
            <button type="button" data-action="export">Export enemy_catalog.js</button>
            <button type="button" data-action="export-hitboxes">Export hitboxes.js</button>
            <button type="button" class="secondary" data-action="close">Close</button>
          </div>
        </div>
        <div class="studio-toolbar">
          <div class="studio-filters" data-filter-row></div>
          <input type="text" class="studio-search" data-search placeholder="Search entities...">
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
                  <div class="inspector-label">Entity</div>
                  <div class="inspector-value" data-info-name>None</div>
                </div>
                <div class="inspector-field">
                  <div class="inspector-label">Category</div>
                  <div class="inspector-value" data-info-category>-</div>
                </div>
                <div class="inspector-field">
                  <div class="inspector-label">Scale</div>
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
                <div class="inspector-field inspector-field--full" data-player-preview-row style="display:none;">
                  <div class="inspector-label">Player Preview Clip</div>
                  <select data-player-preview-select class="inspector-value">
                    <option value="idle">Idle</option>
                    <option value="walk">Walk</option>
                    <option value="attackMelee">Attack Melee</option>
                    <option value="dashSlash">Dash Slash</option>
                    <option value="rushAttack">Rush Attack</option>
                  </select>
                </div>
              </div>
            </div>
            <div class="inspector-block" data-block-shape>
              <h3 data-shape-title>Shape</h3>
              <div class="inspector-grid">
                <div class="inspector-field">
                  <div class="inspector-label" data-primary-label>Width</div>
                  <input type="number" step="1" data-primary-input>
                </div>
                <div class="inspector-field">
                  <div class="inspector-label" data-secondary-label>Height</div>
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
            <div class="inspector-block" data-block-enemy>
              <h3 data-timing-title>Enemy Timing & Damage</h3>
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
            <div class="inspector-block" data-block-weapon>
              <h3 data-weapon-title>Enemy Weapon Hitbox</h3>
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
              <div class="inspector-note" data-inspector-note>Select an entity to inspect or edit.</div>
              <div class="studio-actions" style="margin-top:12px;">
                <button type="button" class="secondary" data-action="reset">Reset Visible Fields</button>
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
    filterRow: overlay.querySelector("[data-filter-row]"),
    search: overlay.querySelector("[data-search]"),
    entityList: overlay.querySelector("[data-entity-list]"),
    previewCanvas: overlay.querySelector("[data-preview-canvas]"),
    previewTitle: overlay.querySelector("[data-preview-title]"),
    previewMeta: overlay.querySelector("[data-preview-meta]"),
    infoName: overlay.querySelector("[data-info-name]"),
    infoCategory: overlay.querySelector("[data-info-category]"),
    infoScale: overlay.querySelector("[data-info-scale]"),
    infoRadius: overlay.querySelector("[data-info-radius]"),
    infoFrames: overlay.querySelector("[data-info-frames]"),
    playerPreviewRow: overlay.querySelector("[data-player-preview-row]"),
    playerPreviewSelect: overlay.querySelector("[data-player-preview-select]"),
    blockShape: overlay.querySelector("[data-block-shape]"),
    blockEnemy: overlay.querySelector("[data-block-enemy]"),
    timingTitle: overlay.querySelector("[data-timing-title]"),
    blockWeapon: overlay.querySelector("[data-block-weapon]"),
    weaponTitle: overlay.querySelector("[data-weapon-title]"),
    shapeTitle: overlay.querySelector("[data-shape-title]"),
    primaryLabel: overlay.querySelector("[data-primary-label]"),
    secondaryLabel: overlay.querySelector("[data-secondary-label]"),
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
    exportHitboxesBtn: overlay.querySelector("[data-action='export-hitboxes']"),
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

  function renderFilters() {
    if (!els.filterRow) return;
    els.filterRow.innerHTML = "";
    FILTERS.forEach((filter) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `filter-pill${state.filter === filter.key ? " is-active" : ""}`;
      button.textContent = filter.label;
      button.addEventListener("click", () => {
        state.filter = filter.key;
        renderEntityList();
      });
      els.filterRow.appendChild(button);
    });
  }

  function ensureSelection() {
    const entries = getFilteredEntries();
    if (!entries.length) {
      state.selectedId = null;
      return;
    }
    if (!entries.some((entry) => entry.id === state.selectedId)) {
      state.selectedId = entries[0].id;
    }
  }

  function renderEntityList() {
    renderFilters();
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
          <div class="entity-card__tag">${entry.category}</div>
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

  function getEnemyInspectorData(key) {
    const def = getEnemyCatalog()?.[key] || null;
    if (!def) return null;
    const clip = getEnemyClip(key);
    const hitbox = resolveEnemyHitbox(def);
    return {
      entryType: "enemy",
      key,
      label: def.displayName || key,
      category: "Enemy",
      subtitle: key,
      scale: getEnemyScale(key),
      radius: Number.isFinite(def.baseRadius) ? def.baseRadius : Math.max(hitbox.width, hitbox.height) * 0.5,
      frameCount: getClipFrameCount(clip),
      clip,
      hitbox,
      weaponHitbox: def.weaponHitbox || null,
      attackHitFrame: Number.isFinite(def.attackHitFrame) ? def.attackHitFrame : null,
      attackHitDamage: Number.isFinite(def.attackHitDamage) ? def.attackHitDamage : null,
      collisionDamage: Number.isFinite(def.damage) ? def.damage : null,
      note: "Enemy body and weapon hitboxes update live for existing enemies and future spawns.",
    };
  }

  function getPlayerInspectorData() {
    const player = getPlayerPreview();
    const config = getPlayerConfig() || player?.config || null;
    const clip = getPlayerClip();
    const radius = Number.isFinite(player?.radius) ? player.radius : Number.isFinite(config?.radius) ? config.radius : 0;
    const scale = Number.isFinite(player?.animator?.scale) ? player.animator.scale : Number.isFinite(config?.scale) ? config.scale : 1;
    const hitbox = config?.hitbox || player?.config?.hitbox || null;
    return {
      entryType: "player",
      key: "player",
      label: "Player",
      category: "Player",
      subtitle: "Hero body collision",
      scale,
      radius,
      frameCount: getClipFrameCount(clip),
      clip,
      hitbox: hitbox
        ? {
            width: Number(hitbox.width) || 0,
            height: Number(hitbox.height) || 0,
            offsetX: Number(hitbox.offsetX) || 0,
            offsetY: Number(hitbox.offsetY) || 0,
          }
        : {
            width: Math.max(1, radius * 1.6),
            height: Math.max(1, radius * 2.2),
            offsetX: 0,
            offsetY: 0,
          },
      weaponHitbox: config?.weaponHitbox
        ? {
            width: Number(config.weaponHitbox.width) || 0,
            height: Number(config.weaponHitbox.height) || 0,
            offsetX: Number(config.weaponHitbox.offsetX) || 0,
            offsetY: Number(config.weaponHitbox.offsetY) || 0,
          }
        : null,
      dashSlashHitbox: config?.dashSlashHitbox
        ? {
            width: Number(config.dashSlashHitbox.width) || 0,
            height: Number(config.dashSlashHitbox.height) || 0,
            offsetX: Number(config.dashSlashHitbox.offsetX) || 0,
            offsetY: Number(config.dashSlashHitbox.offsetY) || 0,
          }
        : null,
      rushHitbox: config?.rushHitbox
        ? {
            width: Number(config.rushHitbox.width) || 0,
            height: Number(config.rushHitbox.height) || 0,
            offsetX: Number(config.rushHitbox.offsetX) || 0,
            offsetY: Number(config.rushHitbox.offsetY) || 0,
          }
        : null,
      attackHitFrame:
        Number.isFinite(config?.attackHitFrame) && config.attackHitFrame > 0
          ? Math.round(config.attackHitFrame)
          : 2,
      note: "Player body collision, Slash hitbox, and Rush Attack hitbox are editable here. Use Attack Melee to line Slash up against the swoosh art, and Rush Attack to tune the combo-rush reach separately.",
    };
  }

  function getNpcInspectorData() {
    const npc = getNpcPreview();
    const clip = getNpcClip();
    const radius = Number.isFinite(npc?.radius) ? npc.radius : 0;
    const scale = Number.isFinite(npc?.animator?.scale) ? npc.animator.scale : 1;
    return {
      entryType: "npc",
      key: "npc",
      label: "NPC",
      category: "NPC",
      subtitle: "Congregation body collision",
      scale,
      radius,
      frameCount: getClipFrameCount(clip),
      clip,
      note: typeof bindings.onNpcRadiusChange === "function"
        ? "NPCs use circular body collision. Radius edits affect live NPCs currently in the arena."
        : "NPCs use circular body collision. This entry is reference-only in the current build.",
    };
  }

  function getProjectileInspectorData(key) {
    const def = getProjectileConfig()?.[key] || {};
    const clip = getProjectileClip(key);
    return {
      entryType: "projectile",
      key,
      label: key.replace(/_/g, " "),
      category: "Projectile",
      subtitle: "Projectile radius",
      scale: Number.isFinite(def.scale) ? def.scale : 1,
      radius: Number.isFinite(def.radius) ? def.radius : 0,
      frameCount: getClipFrameCount(clip),
      clip,
      speed: Number.isFinite(def.speed) ? def.speed : null,
      note: "Projectile radius edits update the live projectile config and active projectiles of the same type.",
    };
  }

  function getInspectorData() {
    const entry = getSelectedEntry();
    if (!entry) return null;
    if (entry.category === "enemy") return getEnemyInspectorData(entry.key);
    if (entry.category === "player") return getPlayerInspectorData();
    if (entry.category === "npc") return getNpcInspectorData();
    if (entry.category === "projectile") return getProjectileInspectorData(entry.key);
    return null;
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
      els.infoCategory.textContent = "-";
      els.infoScale.textContent = "-";
      els.infoRadius.textContent = "-";
      els.infoFrames.textContent = "-";
      els.previewTitle.textContent = "Nothing selected";
      els.previewMeta.textContent = "";
      els.note.textContent = "Select an entity to inspect or edit.";
      return;
    }

    els.infoName.textContent = data.label;
    els.infoCategory.textContent = data.category;
    els.infoScale.textContent = Number.isFinite(data.scale) ? data.scale.toFixed(2) : "-";
    els.infoRadius.textContent = Number.isFinite(data.radius) ? Math.round(data.radius) : "-";
    els.infoFrames.textContent = Number.isFinite(data.frameCount) ? String(data.frameCount) : "-";
    els.previewTitle.textContent = data.label;
    els.previewMeta.textContent = data.subtitle || "";
    els.note.textContent = data.note || "";
    if (els.playerPreviewRow) {
      els.playerPreviewRow.style.display = data.entryType === "player" ? "" : "none";
    }
      if (els.playerPreviewSelect && data.entryType === "player") {
      els.playerPreviewSelect.value = state.playerPreviewState;
    }

    const isEnemy = data.entryType === "enemy";
    const isPlayerRect = data.entryType === "player";
    const isCircle = data.entryType === "npc" || data.entryType === "projectile";
    const isPlayerBodyMode =
      isPlayerRect &&
      (state.playerPreviewState === "idle" || state.playerPreviewState === "walk");
    const isPlayerAttackMode =
      isPlayerRect &&
      (state.playerPreviewState === "attackMelee" ||
        state.playerPreviewState === "dashSlash" ||
        state.playerPreviewState === "rushAttack");
    const circleEditable =
      (data.entryType === "npc" && typeof bindings.onNpcRadiusChange === "function") ||
      (data.entryType === "projectile" && typeof bindings.onProjectileRadiusChange === "function");

    els.blockShape.style.display = isEnemy || isPlayerBodyMode || isCircle ? "" : "none";
    els.blockEnemy.style.display = (isEnemy || isPlayerRect) ? "" : "none";
    els.blockWeapon.style.display = (isEnemy || isPlayerAttackMode) ? "" : "none";
    if (els.timingTitle) {
      els.timingTitle.textContent =
        isPlayerRect && state.playerPreviewState === "rushAttack"
          ? "Rush Timing"
          : isPlayerRect && state.playerPreviewState === "dashSlash"
            ? "Dash Slash Timing"
          : isPlayerRect
            ? "Slash Timing"
            : "Enemy Timing & Damage";
    }
    if (els.weaponTitle) {
      els.weaponTitle.textContent =
        isPlayerRect && state.playerPreviewState === "rushAttack"
          ? "Rush Hitbox"
          : isPlayerRect && state.playerPreviewState === "dashSlash"
            ? "Dash Slash Hitbox"
          : isPlayerRect
            ? "Slash Hitbox"
            : "Enemy Weapon Hitbox";
    }
    els.shapeTitle.textContent = isCircle ? "Collision Shape" : "Body Hitbox";
    els.primaryLabel.textContent = isCircle ? "Radius" : "Width";
    els.secondaryLabel.textContent = isCircle ? "Diameter" : "Height";

    if (isEnemy) {
      const hitbox = data.hitbox;
      setInputState(els.primaryInput, Math.round(hitbox.width));
      setInputState(els.secondaryInput, Math.round(hitbox.height));
      setInputState(els.offsetXInput, Math.round(hitbox.offsetX));
      setInputState(els.offsetYInput, Math.round(hitbox.offsetY));
      setInputState(els.attackHitFrameInput, data.attackHitFrame, { placeholder: "auto" });
      els.attackHitFrameInput.min = "1";
      els.attackHitFrameInput.max = String(Math.max(1, data.frameCount || 1));
      setInputState(els.attackHitDamageInput, data.attackHitDamage, { placeholder: "default" });
      setInputState(els.collisionDamageInput, data.collisionDamage, { placeholder: "default" });
      setInputState(els.weaponWidthInput, data.weaponHitbox?.width ?? "", { placeholder: "off" });
      setInputState(els.weaponHeightInput, data.weaponHitbox?.height ?? "", { placeholder: "off" });
      setInputState(els.weaponOffsetXInput, data.weaponHitbox?.offsetX ?? "");
      setInputState(els.weaponOffsetYInput, data.weaponHitbox?.offsetY ?? "");
    } else if (isPlayerRect) {
      const activeHitbox =
        state.playerPreviewState === "rushAttack" && data.rushHitbox
          ? data.rushHitbox
          : state.playerPreviewState === "dashSlash" && data.dashSlashHitbox
            ? data.dashSlashHitbox
          : data.weaponHitbox;
      const hitbox = data.hitbox;
      if (isPlayerBodyMode) {
        setInputState(els.primaryInput, Math.round(hitbox.width));
        setInputState(els.secondaryInput, Math.round(hitbox.height));
        setInputState(els.offsetXInput, Math.round(hitbox.offsetX));
        setInputState(els.offsetYInput, Math.round(hitbox.offsetY));
      } else {
        setInputState(els.primaryInput, "", { disabled: true });
        setInputState(els.secondaryInput, "", { disabled: true });
        setInputState(els.offsetXInput, "", { disabled: true });
        setInputState(els.offsetYInput, "", { disabled: true });
      }
      setInputState(
        els.attackHitFrameInput,
        state.playerPreviewState === "rushAttack" ? "" : data.attackHitFrame,
        { disabled: state.playerPreviewState === "rushAttack", placeholder: "2" },
      );
      els.attackHitFrameInput.min = "1";
      els.attackHitFrameInput.max = String(Math.max(1, data.frameCount || 1));
      setInputState(els.attackHitDamageInput, "", { disabled: true });
      setInputState(els.collisionDamageInput, "", { disabled: true });
      setInputState(els.weaponWidthInput, activeHitbox?.width ?? "", { placeholder: "off" });
      setInputState(els.weaponHeightInput, activeHitbox?.height ?? "", { placeholder: "off" });
      setInputState(els.weaponOffsetXInput, activeHitbox?.offsetX ?? "");
      setInputState(els.weaponOffsetYInput, activeHitbox?.offsetY ?? "");
    } else if (isCircle) {
      setInputState(els.primaryInput, Math.round(data.radius || 0), { disabled: !circleEditable });
      setInputState(els.secondaryInput, Math.round((data.radius || 0) * 2), { disabled: true });
      setInputState(els.offsetXInput, 0, { disabled: true, placeholder: "centered" });
      setInputState(els.offsetYInput, 0, { disabled: true, placeholder: "centered" });
      setInputState(els.attackHitFrameInput, "", { disabled: true });
      setInputState(els.attackHitDamageInput, "", { disabled: true });
      setInputState(els.collisionDamageInput, "", { disabled: true });
      setInputState(els.weaponWidthInput, "", { disabled: true });
      setInputState(els.weaponHeightInput, "", { disabled: true });
      setInputState(els.weaponOffsetXInput, "", { disabled: true });
      setInputState(els.weaponOffsetYInput, "", { disabled: true });
    }
  }

  function applyEnemyInputs(key) {
    const def = getEnemyCatalog()?.[key];
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

    if (window.BattlechurchEnemyDefinitions?.[key]) {
      Object.assign(window.BattlechurchEnemyDefinitions[key], {
        hitbox: deepClone(def.hitbox),
        attackHitFrame: def.attackHitFrame,
        attackHitDamage: def.attackHitDamage,
        damage: def.damage,
      });
      if (def.weaponHitbox) window.BattlechurchEnemyDefinitions[key].weaponHitbox = deepClone(def.weaponHitbox);
      else delete window.BattlechurchEnemyDefinitions[key].weaponHitbox;
    }
    bindings.onHitboxChange?.(key, deepClone(def.hitbox), deepClone(def.weaponHitbox || null));
    setStatus(`Updated ${key} hitbox.`);
  }

  function applyCircleInputs(data) {
    const radius = Number(els.primaryInput.value);
    if (!Number.isFinite(radius) || radius <= 0) return;
    if (data.entryType === "npc") {
      const npc = typeof bindings.getNpcPreview === "function" ? bindings.getNpcPreview() : null;
      if (npc) npc.radius = radius;
      if (typeof bindings.onNpcRadiusChange === "function") bindings.onNpcRadiusChange(radius);
      setStatus("Updated live NPC radius.");
    } else if (data.entryType === "projectile") {
      const config = getProjectileConfig();
      if (config?.[data.key]) config[data.key].radius = radius;
      if (typeof bindings.onProjectileRadiusChange === "function") bindings.onProjectileRadiusChange(data.key, radius);
      setStatus(`Updated ${data.key} radius.`);
    }
  }

  function applyPlayerHitboxInputs() {
    const isBodyMode =
      state.playerPreviewState === "idle" || state.playerPreviewState === "walk";
    if (isBodyMode) {
      const width = Number(els.primaryInput.value);
      const height = Number(els.secondaryInput.value);
      const offsetX = Number(els.offsetXInput.value);
      const offsetY = Number(els.offsetYInput.value);
      if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;
      bindings.onPlayerHitboxChange?.({
        width,
        height,
        offsetX: Number.isFinite(offsetX) ? offsetX : 0,
        offsetY: Number.isFinite(offsetY) ? offsetY : 0,
      });
    }
    const weaponWidth = Number(els.weaponWidthInput.value);
    const weaponHeight = Number(els.weaponHeightInput.value);
    const weaponOffsetX = Number(els.weaponOffsetXInput.value);
    const weaponOffsetY = Number(els.weaponOffsetYInput.value);
    if (Number.isFinite(weaponWidth) && Number.isFinite(weaponHeight) && weaponWidth > 0 && weaponHeight > 0) {
      const nextHitbox = {
        width: weaponWidth,
        height: weaponHeight,
        offsetX: Number.isFinite(weaponOffsetX) ? weaponOffsetX : 0,
        offsetY: Number.isFinite(weaponOffsetY) ? weaponOffsetY : 0,
      };
      if (state.playerPreviewState === "rushAttack") {
        bindings.onPlayerRushHitboxChange?.(nextHitbox);
      } else if (state.playerPreviewState === "dashSlash") {
        bindings.onPlayerDashSlashHitboxChange?.(nextHitbox);
      } else {
        bindings.onPlayerWeaponHitboxChange?.(nextHitbox);
      }
    }
    const attackHitFrame = Number(els.attackHitFrameInput.value);
    if (state.playerPreviewState !== "rushAttack" && Number.isFinite(attackHitFrame) && attackHitFrame > 0) {
      bindings.onPlayerAttackHitFrameChange?.(attackHitFrame);
    }
    setStatus("Updated player hitbox.");
  }

  function applyInputs() {
    const data = getInspectorData();
    if (!data) return;
    if (data.entryType === "enemy") {
      applyEnemyInputs(data.key);
    } else if (data.entryType === "player") {
      applyPlayerHitboxInputs();
    } else {
      applyCircleInputs(data);
    }
    syncInspector();
  }

  function resetVisibleFields() {
    const data = getInspectorData();
    if (!data) return;
    if (data.entryType === "enemy") {
      const def = getEnemyCatalog()?.[data.key];
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
      applyEnemyInputs(data.key);
    } else if (data.entryType === "player") {
      const fallback = data.hitbox;
      const activeHitbox =
        state.playerPreviewState === "rushAttack" && data.rushHitbox
          ? data.rushHitbox
          : state.playerPreviewState === "dashSlash" && data.dashSlashHitbox
            ? data.dashSlashHitbox
          : data.weaponHitbox;
      els.primaryInput.value = Math.round(fallback.width);
      els.secondaryInput.value = Math.round(fallback.height);
      els.offsetXInput.value = Math.round(fallback.offsetX);
      els.offsetYInput.value = Math.round(fallback.offsetY);
      els.weaponWidthInput.value = Math.round(activeHitbox?.width ?? 0) || "";
      els.weaponHeightInput.value = Math.round(activeHitbox?.height ?? 0) || "";
      els.weaponOffsetXInput.value = Math.round(activeHitbox?.offsetX ?? 0);
      els.weaponOffsetYInput.value = Math.round(activeHitbox?.offsetY ?? 0);
      applyPlayerHitboxInputs();
    } else if (data.entryType === "projectile") {
      const fallback = Number(getProjectileConfig()?.[data.key]?.radius) || 12;
      els.primaryInput.value = fallback;
      applyCircleInputs(data);
    } else if (data.entryType === "npc") {
      const fallback = Number(getNpcPreview()?.radius) || 20;
      els.primaryInput.value = fallback;
      applyCircleInputs(data);
    }
    syncInspector();
  }

  function exportCatalog() {
    const catalog = getEnemyCatalog();
    const base = baseCatalogSnapshot || catalog || {};
    const merged = deepClone(base || {});
    Object.keys(catalog || {}).forEach((key) => {
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

  function exportHitboxes() {
    const playerConfig = getPlayerConfig();
    const playerHitbox = playerConfig?.hitbox || null;
    const data = {
      player: {
        hitbox: playerHitbox
          ? {
              width: Number(playerHitbox.width) || 0,
              height: Number(playerHitbox.height) || 0,
              offsetX: Number(playerHitbox.offsetX) || 0,
              offsetY: Number(playerHitbox.offsetY) || 0,
            }
          : null,
        weaponHitbox: playerConfig?.weaponHitbox
          ? {
              width: Number(playerConfig.weaponHitbox.width) || 0,
              height: Number(playerConfig.weaponHitbox.height) || 0,
              offsetX: Number(playerConfig.weaponHitbox.offsetX) || 0,
              offsetY: Number(playerConfig.weaponHitbox.offsetY) || 0,
            }
          : null,
        dashSlashHitbox: playerConfig?.dashSlashHitbox
          ? {
              width: Number(playerConfig.dashSlashHitbox.width) || 0,
              height: Number(playerConfig.dashSlashHitbox.height) || 0,
              offsetX: Number(playerConfig.dashSlashHitbox.offsetX) || 0,
              offsetY: Number(playerConfig.dashSlashHitbox.offsetY) || 0,
            }
          : null,
        rushHitbox: playerConfig?.rushHitbox
          ? {
              width: Number(playerConfig.rushHitbox.width) || 0,
              height: Number(playerConfig.rushHitbox.height) || 0,
              offsetX: Number(playerConfig.rushHitbox.offsetX) || 0,
              offsetY: Number(playerConfig.rushHitbox.offsetY) || 0,
            }
          : null,
        attackHitFrame:
          Number.isFinite(playerConfig?.attackHitFrame) && playerConfig.attackHitFrame > 0
            ? Math.round(playerConfig.attackHitFrame)
            : 2,
      },
      npcs: {},
      projectiles: {},
    };
    const body = `(function(global) {\n  const HITBOXES = ${JSON.stringify(data, null, 2)};\n  global.BattlechurchHitboxes = HITBOXES;\n})(typeof window !== "undefined" ? window : globalThis);\n`;
    const blob = new Blob([body], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "hitboxes.js";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus("Exported hitboxes.js");
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
    ctx.fillStyle = "#0b111a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    const step = 28;
    for (let x = step; x < canvas.width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = step; y < canvas.height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(155, 217, 255, 0.22)";
    ctx.beginPath();
    ctx.moveTo(canvas.width * 0.5, 0);
    ctx.lineTo(canvas.width * 0.5, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, canvas.height * 0.62);
    ctx.lineTo(canvas.width, canvas.height * 0.62);
    ctx.stroke();
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
    ctx.drawImage(
      clip.image,
      frameRect.sx + sourceBounds.x,
      frameRect.sy + sourceBounds.y,
      sourceBounds.width,
      sourceBounds.height,
      drawX,
      drawY,
      drawW,
      drawH,
    );
    return { width: drawW, height: drawH, scale: fitScale * clipScale };
  }

  function drawPlayerPaperdollPreview(ctx, centerX, centerY) {
    const drawPaperdoll = window?.Entities?.drawPastorPaperdoll;
    const player = getPlayerPreview();
    if (typeof drawPaperdoll !== "function" || !player) return false;
    const prevState = player.state;
    const prevMoving = player._paperdollMoving;
    try {
      if (state.playerPreviewState === "idle") {
        player.state = "idle";
        player._paperdollMoving = false;
      } else if (state.playerPreviewState === "walk") {
        player.state = "walk";
        player._paperdollMoving = true;
      } else {
        player.state = "attackMelee";
        player._paperdollMoving = false;
      }
      return Boolean(drawPaperdoll(player, ctx, centerX, centerY, { alpha: 1 }));
    } catch (_e) {
      return false;
    } finally {
      player.state = prevState;
      player._paperdollMoving = prevMoving;
    }
  }

  function drawEnemyPreview(ctx, canvas, data) {
    const centerX = canvas.width * 0.5;
    const centerY = canvas.height * 0.58;
    const clip = data.clip;
    const baseScale = Number.isFinite(data.scale) && data.scale > 0 ? data.scale : 1;
    const worldScale = getWorldScale();
    const sourceBounds = clip ? getTrimmedSpriteBounds(data.key, clip) : null;
    const preview = drawSpritePreview(
      ctx,
      clip,
      centerX,
      centerY,
      baseScale * worldScale,
      Math.max(0, (Number(els.attackHitFrameInput.value) || 1) - 1),
      { sourceBounds },
    );
    const overlayScale = preview?.scale || (baseScale * worldScale);
    const hitbox = data.hitbox;
    const width = hitbox.width * overlayScale;
    const height = hitbox.height * overlayScale;
    const offsetX = hitbox.offsetX * overlayScale;
    const offsetY = hitbox.offsetY * overlayScale;
    ctx.save();
    ctx.strokeStyle = "rgba(255, 200, 106, 0.95)";
    ctx.fillStyle = "rgba(255, 200, 106, 0.12)";
    ctx.lineWidth = 2;
    drawRoundedRect(
      ctx,
      centerX + offsetX - width * 0.5,
      centerY + offsetY - height * 0.5,
      width,
      height,
      12,
      true,
      true,
    );
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

  function drawRectPreview(ctx, canvas, data, strokeColor, fillColor, { worldSized = false } = {}) {
    const centerX = canvas.width * 0.5;
    const centerY = canvas.height * 0.58;
    const clip = data.clip;
    const baseScale = Number.isFinite(data.scale) && data.scale > 0 ? data.scale : 1;
    const fitScale = clip
      ? Math.min(3.2, Math.max(0.35, Math.min((canvas.width * 0.38) / Math.max(1, clip.frameWidth * baseScale), (canvas.height * 0.46) / Math.max(1, clip.frameHeight * baseScale))))
      : 1;
    const preferredFrame =
      data.entryType === "player" &&
      (state.playerPreviewState === "attackMelee" || state.playerPreviewState === "dashSlash")
        ? Math.max(0, (Number(data.attackHitFrame) || 1) - 1)
        : 0;
    let preview = null;
    const usedPaperdoll =
      data.entryType === "player" &&
      drawPlayerPaperdollPreview(ctx, centerX, centerY);
    if (!usedPaperdoll) {
      preview = drawSpritePreview(ctx, clip, centerX, centerY, baseScale * fitScale, preferredFrame);
    }
    const overlayScale = worldSized ? fitScale : (preview?.scale || baseScale * fitScale);
    const hitbox = data.hitbox;
    const width = hitbox.width * overlayScale;
    const height = hitbox.height * overlayScale;
    const offsetX = hitbox.offsetX * overlayScale;
    const offsetY = hitbox.offsetY * overlayScale;
    const showBodyHitbox =
      data.entryType !== "player" ||
      state.playerPreviewState === "idle" ||
      state.playerPreviewState === "walk";
    if (showBodyHitbox) {
      ctx.save();
      ctx.strokeStyle = strokeColor;
      ctx.fillStyle = fillColor;
      ctx.lineWidth = 2;
      drawRoundedRect(
        ctx,
        centerX + offsetX - width * 0.5,
        centerY + offsetY - height * 0.5,
        width,
        height,
        12,
        true,
        true,
      );
      ctx.restore();
    }

    const activePlayerAttackHitbox =
      data.entryType === "player" && state.playerPreviewState === "rushAttack"
        ? data.rushHitbox
        : data.entryType === "player" && state.playerPreviewState === "dashSlash"
          ? data.dashSlashHitbox
        : data.weaponHitbox;
    if (activePlayerAttackHitbox) {
      const weapon = activePlayerAttackHitbox;
      const drawW = weapon.width * overlayScale;
      const drawH = weapon.height * overlayScale;
      const drawX = centerX + weapon.offsetX * overlayScale - drawW * 0.5;
      const drawY = centerY + weapon.offsetY * overlayScale - drawH * 0.5;
      const swooshImg =
        data.entryType === "player" &&
        (
          state.playerPreviewState === "attackMelee" ||
          state.playerPreviewState === "dashSlash" ||
          state.playerPreviewState === "rushAttack"
        )
          ? getAssets()?.effects?.meleeSwoosh || null
          : null;
      if (swooshImg && swooshImg.width && swooshImg.height) {
        ctx.save();
        ctx.globalAlpha = 0.72;
        ctx.drawImage(swooshImg, drawX, drawY, drawW, drawH);
        ctx.restore();
      }
      ctx.save();
      ctx.strokeStyle = "rgba(255, 107, 107, 0.95)";
      ctx.fillStyle = "rgba(255, 107, 107, 0.10)";
      ctx.lineWidth = 2;
      drawRoundedRect(ctx, drawX, drawY, drawW, drawH, 10, true, true);
      ctx.restore();
    }
  }

  function drawCirclePreview(ctx, canvas, data, color) {
    const centerX = canvas.width * 0.5;
    const centerY = canvas.height * 0.58;
    const clip = data.clip;
    const radius = Math.max(1, data.radius || 0);
    const entityScale = (Number.isFinite(data.scale) && data.scale > 0) ? data.scale : 1;
    // fitFactor: game-space → preview-space, same factor applied to both sprite and circle
    const fitFactor = clip
      ? Math.min(3.2, Math.max(0.4, Math.min(
          (canvas.width * 0.36) / Math.max(1, clip.frameWidth * entityScale),
          (canvas.height * 0.44) / Math.max(1, clip.frameHeight * entityScale),
        )))
      : (Math.min(canvas.width, canvas.height) * 0.18) / Math.max(1, radius * entityScale);
    const clipScale = fitFactor * entityScale;
    drawSpritePreview(ctx, clip, centerX, centerY, clipScale, 0);

    const drawRadius = radius * fitFactor;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color.replace("0.95", "0.12");
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, drawRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    if (!clip) {
      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.09)";
      ctx.beginPath();
      ctx.arc(centerX, centerY, Math.max(18, drawRadius * 0.55), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawProjectilePreview(ctx, canvas, data) {
    const clip = data.clip;
    if (clip) {
      drawCirclePreview(ctx, canvas, data, "rgba(155, 217, 255, 0.95)");
      return;
    }
    const centerX = canvas.width * 0.5;
    const centerY = canvas.height * 0.58;
    const radius = Math.max(6, data.radius || 12);
    const drawRadius = Math.min(canvas.width, canvas.height) * 0.16;
    ctx.save();
    const gradient = ctx.createRadialGradient(centerX, centerY, drawRadius * 0.2, centerX, centerY, drawRadius);
    gradient.addColorStop(0, "rgba(234, 246, 255, 0.95)");
    gradient.addColorStop(1, "rgba(91, 163, 216, 0.92)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, drawRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(255, 200, 106, 0.95)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * (drawRadius / radius), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawPreview() {
    updatePreviewCanvasSize();
    const canvas = els.previewCanvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawPreviewGrid(ctx, canvas);
    const data = getInspectorData();
    if (!data) return;
    if (data.entryType === "enemy") {
      drawEnemyPreview(ctx, canvas, data);
    } else if (data.entryType === "player") {
      drawRectPreview(
        ctx,
        canvas,
        data,
        "rgba(255, 200, 106, 0.95)",
        "rgba(255, 200, 106, 0.12)",
        { worldSized: true },
      );
    } else if (data.entryType === "npc") {
      drawCirclePreview(ctx, canvas, data, "rgba(95, 227, 192, 0.95)");
    } else if (data.entryType === "projectile") {
      drawProjectilePreview(ctx, canvas, data);
    }
  }

  function startRenderLoop() {
    if (state.rafId) return;
    const step = () => {
      if (!state.active) {
        state.rafId = null;
        return;
      }
      drawPreview();
      state.rafId = window.requestAnimationFrame(step);
    };
    state.rafId = window.requestAnimationFrame(step);
  }

  function setActive(active) {
    state.active = Boolean(active);
    overlay.style.display = state.active ? "block" : "none";
    window.__battlechurchHitboxEditorActive = state.active;
    if (state.active) {
      renderEntityList();
      startRenderLoop();
    }
  }

  function toggle() {
    setActive(!state.active);
    return state.active;
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
  els.playerPreviewSelect?.addEventListener("change", () => {
    state.playerPreviewState = String(els.playerPreviewSelect.value || "attackMelee");
    syncInspector();
  });
  els.reset.addEventListener("click", resetVisibleFields);
  els.exportBtn.addEventListener("click", exportCatalog);
  els.exportHitboxesBtn.addEventListener("click", exportHitboxes);
  els.closeBtn.addEventListener("click", () => setActive(false));

  window.addEventListener("resize", updatePreviewCanvasSize);

  window.BattlechurchHitboxEditor = {
    initialize(options = {}) {
      bindings.getAssets = options.getAssets || bindings.getAssets;
      bindings.getEnemyCatalog = options.getEnemyCatalog || bindings.getEnemyCatalog;
      bindings.getEnemyTypes = options.getEnemyTypes || bindings.getEnemyTypes;
      bindings.getPlayerPreview = options.getPlayerPreview || bindings.getPlayerPreview;
      bindings.getPlayerConfig = options.getPlayerConfig || bindings.getPlayerConfig;
      bindings.getNpcPreview = options.getNpcPreview || bindings.getNpcPreview;
      bindings.getProjectileConfig = options.getProjectileConfig || bindings.getProjectileConfig;
      bindings.onHitboxChange = options.onHitboxChange || bindings.onHitboxChange;
      bindings.onPlayerHitboxChange = options.onPlayerHitboxChange || bindings.onPlayerHitboxChange;
      bindings.onPlayerWeaponHitboxChange =
        options.onPlayerWeaponHitboxChange || bindings.onPlayerWeaponHitboxChange;
      bindings.onPlayerDashSlashHitboxChange =
        options.onPlayerDashSlashHitboxChange || bindings.onPlayerDashSlashHitboxChange;
      bindings.onPlayerRushHitboxChange =
        options.onPlayerRushHitboxChange || bindings.onPlayerRushHitboxChange;
      bindings.onPlayerAttackHitFrameChange =
        options.onPlayerAttackHitFrameChange || bindings.onPlayerAttackHitFrameChange;
      bindings.onNpcRadiusChange = options.onNpcRadiusChange || bindings.onNpcRadiusChange;
      bindings.onProjectileRadiusChange =
        options.onProjectileRadiusChange || bindings.onProjectileRadiusChange;
      baseCatalogSnapshot = deepClone(getEnemyCatalog());
      renderFilters();
      renderEntityList();
      setActive(false);
    },
    toggle,
    setActive,
    isActive: () => state.active,
  };
})(typeof window !== "undefined" ? window : null, typeof document !== "undefined" ? document : null);
