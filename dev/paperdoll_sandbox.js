(function setupPaperdollSandbox(window, document) {
  if (!window || !document) return;

  const OVERLAY_ID = "paperdollSandboxOverlay";
  const BASE_ROOT = "assets/sprites/npcs/mana-seed";
  const PRESET_STORAGE_KEY = "battlechurch.pastorPaperdollPresets.v1";
  const MAX_PRESET_SLOTS = 24;
  const PAGE_KEYS = ["p1", "pONE1", "pONE2", "pONE3"];
  const LAYERS = ["0bas", "1out", "4har", "5hat", "6tla", "7tlb"];
  const LAYER_LABELS = Object.freeze({
    "0bas": "Body",
    "1out": "Outfit",
    "4har": "Hair",
    "5hat": "Hat",
    "6tla": "Main Hand",
    "7tlb": "Off Hand",
  });
  const FACING_KEYS = ["south", "west", "east", "north"];
  const FRAME_SIZE = 64;

  const layerCatalog = {
    "0bas": [
      ...Array.from({ length: 11 }, (_, i) => `humn_v${String(i).padStart(2, "0")}`),
    ],
    "1out": [
      "none",
      "pfpn_v01", "pfpn_v02", "pfpn_v03", "pfpn_v04", "pfpn_v05",
      "fstr_v01", "fstr_v02", "fstr_v03", "fstr_v04", "fstr_v05",
      "undi_v01", "boxr_v01",
    ],
    "4har": [
      "none",
      ...Array.from({ length: 14 }, (_, i) => `bob1_v${String(i).padStart(2, "0")}`),
      ...Array.from({ length: 14 }, (_, i) => `dap1_v${String(i).padStart(2, "0")}`),
    ],
    "5hat": [
      "none",
      "pfht_v01", "pfht_v02", "pfht_v03", "pfht_v04", "pfht_v05",
      "pnty_v01", "pnty_v02", "pnty_v03", "pnty_v04", "pnty_v05",
    ],
    "6tla": [
      "none",
      "sw01_v01", "sw01_v02", "sw01_v03", "sw01_v04", "sw01_v05",
      "ax01_v01", "ax01_v02", "ax01_v03", "ax01_v04", "ax01_v05",
      "mc01_v01", "mc01_v02", "mc01_v03", "mc01_v04", "mc01_v05",
    ],
    "7tlb": [
      "none",
      "sh01_v01", "sh01_v02", "sh01_v03", "sh01_v04", "sh01_v05",
      "sh02_v01", "sh02_v02", "sh02_v03", "sh02_v04", "sh02_v05",
      "sh03_v01", "sh03_v02", "sh03_v03", "sh03_v04", "sh03_v05",
    ],
  };

  // 8x8 sheet assumptions from the included guides/docs.
  const animDefs = [
    { key: "walk", page: "p1", framesByFacing: [ [32,33,34,35,36,37], [40,41,42,43,44,45], [48,49,50,51,52,53], [56,57,58,59,60,61] ], timingMs: [135,135,135,135,135,135] },
    { key: "run", page: "p1", framesByFacing: [ [32,33,38,35,36,39], [40,41,46,43,44,47], [48,49,54,51,52,55], [56,57,62,59,60,63] ], timingMs: [80,55,125,80,55,125] },
    { key: "push", page: "p1", framesByFacing: [ [1,2], [9,10], [17,18], [25,26] ], timingMs: [300,300] },
    { key: "pull", page: "p1", framesByFacing: [ [3,4], [11,12], [19,20], [27,28] ], timingMs: [400,400] },
    { key: "jump", page: "p1", framesByFacing: [ [5,6,7,5], [13,14,15,13], [21,22,23,21], [29,30,31,29] ], timingMs: [300,150,100,300], oneShot: true },

    { key: "draw_sheath", page: "pONE1", framesByFacing: [ [0,1,2], [8,9,10], [16,17,18], [24,25,26] ], timingMs: [160,120,180], oneShot: true },
    { key: "combat_idle", page: "pONE2", framesByFacing: [ [0,1,2,3], [8,9,10,11], [16,17,18,19], [24,25,26,27] ], timingMs: [200,200,200,200] },
    { key: "combat_move", page: "pONE2", framesByFacing: [ [4,5], [12,13], [20,21], [28,29] ], timingMs: [140,140] },
    { key: "parry", page: "pONE1", framesByFacing: [ [3], [11], [19], [27] ], timingMs: [260], oneShot: true },
    { key: "evade", page: "pONE1", framesByFacing: [ [4], [12], [20], [28] ], timingMs: [220], oneShot: true },
    { key: "hit", page: "pONE1", framesByFacing: [ [5], [13], [21], [29] ], timingMs: [220], oneShot: true },
    { key: "knockdown", page: "pONE1", framesByFacing: [ [5,6,7], [13,14,15], [21,22,23], [29,30,31] ], timingMs: [120,120,220], oneShot: true },

    { key: "slash_1", page: "pONE3", framesByFacing: [ [0,1,2,3], [8,9,10,11], [16,17,18,19], [24,25,26,27] ], timingMs: [160,65,65,200], oneShot: true },
    { key: "slash_2", page: "pONE3", framesByFacing: [ [4,5,6,7], [12,13,14,15], [20,21,22,23], [28,29,30,31] ], timingMs: [160,65,65,200], oneShot: true },
    { key: "thrust", page: "pONE3", framesByFacing: [ [32,33,34,35], [40,41,42,43], [48,49,50,51], [56,57,58,59] ], timingMs: [160,65,65,200], oneShot: true },
    { key: "shield_bash", page: "pONE3", framesByFacing: [ [36,37,38,39], [44,45,46,47], [52,53,54,55], [60,61,62,63] ], timingMs: [160,65,65,200], oneShot: true },
  ];

  const behaviorProfiles = [
    { key: "melee_slash", melee_style: "slash_1", projectile_style: "none", movement_set: "combat" },
    { key: "melee_thrust", melee_style: "thrust", projectile_style: "none", movement_set: "combat" },
    { key: "projectile_cast", melee_style: "slash_1", projectile_style: "cast", movement_set: "combat" },
    { key: "projectile_throw", melee_style: "thrust", projectile_style: "throw", movement_set: "combat" },
  ];

  function defaultIndexFor(layerKey, token) {
    const list = layerCatalog[layerKey] || [];
    const idx = list.indexOf(token);
    return idx >= 0 ? idx : 0;
  }

  function createDefaultLayerSelection() {
    const out = Object.fromEntries(LAYERS.map((k) => [k, 0]));
    // Start with visible combat setup so main/off hand are immediately testable.
    out["6tla"] = defaultIndexFor("6tla", "sw01_v01");
    out["7tlb"] = defaultIndexFor("7tlb", "sh01_v01");
    return out;
  }

  const state = {
    open: false,
    focusedLayerIndex: 0,
    pageIndex: 2, // pONE2 by default (combat idle page)
    facingIndex: 0,
    animIndex: 6, // combat_idle
    behaviorIndex: 0,
    playbackSpeed: 1,
    frameCursor: 0,
    frameElapsed: 0,
    loop: true,
    holdFrame: false,
    transientAction: null, // { returnAnimIndex, returnPageIndex }
    layerSelection: createDefaultLayerSelection(),
    layerVisible: Object.fromEntries(LAYERS.map((k) => [k, true])),
    imageCache: new Map(),
    missingCache: new Set(),
    rafId: 0,
    presets: [],
    selectedPresetIndex: 0,
  };

  let overlay = null;
  let canvas = null;
  let ctx = null;
  let controlsRoot = null;
  let controlsDirty = true;

  function buttonHtml(action, label, title = "") {
    const safeTitle = String(title || "").replace(/"/g, "&quot;");
    return `<button type="button" data-action="${action}" title="${safeTitle}" style="padding:4px 8px;background:#1b2740;color:#e8edf7;border:1px solid #3a4b72;border-radius:6px;cursor:pointer;">${label}</button>`;
  }

  function safeParse(json, fallback) {
    try {
      const parsed = JSON.parse(String(json || ""));
      return parsed && typeof parsed === "object" ? parsed : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function getAnimDef() {
    return animDefs[state.animIndex] || animDefs[0];
  }

  function focusedLayer() {
    return LAYERS[state.focusedLayerIndex] || LAYERS[0];
  }

  function layerLabel(layerKey) {
    return LAYER_LABELS[layerKey] || layerKey;
  }

  function getPageKey() {
    return PAGE_KEYS[state.pageIndex] || PAGE_KEYS[0];
  }

  function clampWrap(i, len) {
    if (!len) return 0;
    let v = i % len;
    if (v < 0) v += len;
    return v;
  }

  function computeAnimFrames() {
    const def = getAnimDef();
    const facingFrames = def.framesByFacing[state.facingIndex] || def.framesByFacing[0] || [0];
    return facingFrames;
  }

  function getLayerFilename(layerKey) {
    const list = layerCatalog[layerKey] || [];
    const idx = clampWrap(state.layerSelection[layerKey] || 0, list.length);
    const token = list[idx] || "";
    if (!token || token === "none") return null;
    const page = getPageKey();
    return `char_a_${page}_${layerKey}_${token}.png`;
  }

  function getLayerToken(layerKey) {
    const list = layerCatalog[layerKey] || [];
    const idx = clampWrap(state.layerSelection[layerKey] || 0, list.length);
    return list[idx] || "none";
  }

  function prettyLayerToken(layerKey, token) {
    if (!token || token === "none") return "none";
    if (layerKey === "6tla") {
      const m = /^([a-z]{2}\d{2})_v(\d{2})$/i.exec(token);
      if (!m) return token;
      const group = m[1].toLowerCase();
      const color = Number(m[2]) || 0;
      const name =
        group === "sw01" ? "Sword"
        : group === "ax01" ? "Axe"
        : group === "mc01" ? "Mace"
        : group;
      return `${name} ${color}`;
    }
    if (layerKey === "7tlb") {
      const m = /^(sh0[123])_v(\d{2})$/i.exec(token);
      if (!m) return token;
      const shield = m[1].toLowerCase();
      const color = Number(m[2]) || 0;
      const style =
        shield === "sh01" ? "Shield 1"
        : shield === "sh02" ? "Shield 2"
        : "Shield 3";
      const darkHint = shield === "sh03" ? " (dark)" : "";
      return `${style} ${color}${darkHint}`;
    }
    return token;
  }

  function currentLayerDisplayValue(layerKey) {
    const token = (layerCatalog[layerKey] || [])[clampWrap(state.layerSelection[layerKey] || 0, (layerCatalog[layerKey] || []).length)] || "";
    return prettyLayerToken(layerKey, token);
  }

  function getLayerPath(layerKey) {
    const filename = getLayerFilename(layerKey);
    if (!filename) return null;
    const page = getPageKey();
    if (layerKey === "0bas") {
      return `${BASE_ROOT}/char_a_${page}/${filename}`;
    }
    return `${BASE_ROOT}/char_a_${page}/${layerKey}/${filename}`;
  }

  function pageSupportsLayer(pageKey, layerKey) {
    if (pageKey === "p1" && (layerKey === "6tla" || layerKey === "7tlb")) return false;
    return true;
  }

  function layerDrawOrderForFrame(frameIndex) {
    // Base order; weapon/shield can swap for north-facing upper rows.
    const order = ["0bas", "1out", "4har", "5hat", "6tla", "7tlb"];
    const facing = FACING_KEYS[state.facingIndex] || "south";
    if (facing === "north" && frameIndex >= 0) {
      // Basic fallback: keep tools under hats/hair on north-facing to reduce clipping.
      return ["0bas", "1out", "6tla", "7tlb", "4har", "5hat"];
    }
    return order;
  }

  const SHIELD_FRONT_FRAMES = Object.freeze({
    pONE1: new Set([1, 4, 8, 10, 11, 13, 19, 20, 27, 28]),
    pONE2: new Set([0, 1, 2, 3, 4, 5, 6, 7, 32, 33, 34]),
    pONE3: new Set([0, 3, 6, 7, 10, 11, 13, 32, 35, 36, 42, 43, 45, 46, 47, 54, 55, 60, 62, 63]),
  });

  function isShieldFrontFrame(pageKey, frameIndex) {
    const set = SHIELD_FRONT_FRAMES[pageKey];
    if (!set) return true;
    return set.has(frameIndex);
  }

  function ensureOverlay() {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.style.cssText = [
      "position:fixed",
      "inset:0",
      "z-index:99999",
      "display:none",
      "background:radial-gradient(circle at 30% 20%, #20263a 0%, #121620 60%, #0b0e14 100%)",
      "color:#e8edf7",
      "font-family: ui-monospace, SFMono-Regular, Menlo, monospace",
    ].join(";");

    overlay.innerHTML = `
      <div style="display:grid;grid-template-columns:460px minmax(380px, 0.8fr) 380px;gap:16px;height:100%;padding:16px;box-sizing:border-box;">
        <div style="background:rgba(12,16,24,0.86);border:1px solid #2a334a;border-radius:10px;padding:12px;overflow:auto;">
          <div style="font-size:18px;font-weight:700;margin-bottom:8px;">Paperdoll Sandbox</div>
          <div id="paperdollSandboxControls" style="margin-top:10px;background:#0d1220;border:1px solid #2a334a;padding:10px;border-radius:8px;font-size:12px;max-height:76vh;overflow:auto;"></div>
        </div>
        <div style="display:flex;align-items:center;justify-content:center;background:rgba(12,16,24,0.6);border:1px solid #2a334a;border-radius:10px;position:relative;overflow:hidden;">
          <canvas id="paperdollSandboxCanvas" width="700" height="520" style="width:auto;height:auto;max-width:100%;max-height:100%;aspect-ratio:700/520;image-rendering:pixelated;"></canvas>
        </div>
        <div style="background:rgba(12,16,24,0.86);border:1px solid #2a334a;border-radius:10px;padding:12px;display:flex;flex-direction:column;min-height:0;">
          <div style="font-size:14px;font-weight:700;margin-bottom:6px;">Pastor Presets</div>
          <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
            <label for="paperdollPresetName" style="font-size:12px;opacity:.9;">Preset name</label>
            <input id="paperdollPresetName" type="text" value="Pastor Preset" style="flex:1;background:#0d1220;color:#e8edf7;border:1px solid #2a334a;border-radius:6px;padding:6px;font-size:12px;">
          </div>
          <div id="paperdollPresetControls" style="display:flex;flex-direction:column;gap:6px;margin-bottom:8px;flex:1;min-height:200px;overflow:auto;"></div>
          <div style="display:flex;gap:8px;margin-top:8px;">
            <button id="paperdollSaveGameConfig" type="button" style="flex:1;padding:8px;background:#254122;color:#e8edf7;border:1px solid #4f8d45;border-radius:8px;cursor:pointer;">Save Config File</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    canvas = overlay.querySelector("#paperdollSandboxCanvas");
    ctx = canvas.getContext("2d");
    if (ctx) ctx.imageSmoothingEnabled = false;
    controlsRoot = overlay.querySelector("#paperdollSandboxControls");

    overlay.querySelector("#paperdollSaveGameConfig")?.addEventListener("click", saveConfigFileWithPrompt);
    controlsRoot?.addEventListener("pointerdown", onControlsClick);
    controlsRoot?.addEventListener("click", onControlsClick);
    overlay.querySelector("#paperdollPresetControls")?.addEventListener("pointerdown", onPresetControlsClick);
    overlay.querySelector("#paperdollPresetControls")?.addEventListener("click", onPresetControlsClick);
  }

  function getPresetNameInput() {
    return overlay?.querySelector?.("#paperdollPresetName") || null;
  }

  function exportStateForPreset(name = "") {
    return {
      name: String(name || "Pastor Preset").trim() || "Pastor Preset",
      pageIndex: state.pageIndex,
      facingIndex: state.facingIndex,
      animIndex: state.animIndex,
      behaviorIndex: state.behaviorIndex,
      playbackSpeed: state.playbackSpeed,
      loop: Boolean(state.loop),
      layerSelection: { ...state.layerSelection },
      layerVisible: { ...state.layerVisible },
      savedAt: Date.now(),
    };
  }

  function applyPresetData(preset) {
    if (!preset || typeof preset !== "object") return false;
    state.pageIndex = clampWrap(Number(preset.pageIndex) || 0, PAGE_KEYS.length);
    state.facingIndex = clampWrap(Number(preset.facingIndex) || 0, FACING_KEYS.length);
    state.animIndex = clampWrap(Number(preset.animIndex) || 0, animDefs.length);
    state.behaviorIndex = clampWrap(Number(preset.behaviorIndex) || 0, behaviorProfiles.length);
    state.playbackSpeed = Math.max(0.25, Math.min(4, Number(preset.playbackSpeed) || 1));
    state.loop = Boolean(preset.loop);
    const sel = preset.layerSelection && typeof preset.layerSelection === "object" ? preset.layerSelection : {};
    const vis = preset.layerVisible && typeof preset.layerVisible === "object" ? preset.layerVisible : {};
    LAYERS.forEach((k) => {
      const listLen = (layerCatalog[k] || []).length || 1;
      state.layerSelection[k] = clampWrap(Number(sel[k]) || 0, listLen);
      state.layerVisible[k] = vis[k] !== false;
    });
    state.frameCursor = 0;
    state.frameElapsed = 0;
    state.holdFrame = false;
    return true;
  }

  function loadPresetsFromStorage() {
    const raw = window.localStorage?.getItem?.(PRESET_STORAGE_KEY);
    const parsed = safeParse(raw, []);
    state.presets = Array.isArray(parsed) ? parsed.slice(0, MAX_PRESET_SLOTS) : [];
    state.selectedPresetIndex = clampWrap(state.selectedPresetIndex, Math.max(1, state.presets.length || 1));
  }

  function savePresetsToStorage() {
    if (!window.localStorage?.setItem) return;
    window.localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(state.presets || []));
  }

  function saveCurrentToPresetSlot(slotIndex) {
    const nameInput = getPresetNameInput();
    const name = nameInput ? nameInput.value : "Pastor Preset";
    const entry = exportStateForPreset(name);
    const idx = Math.max(0, Math.floor(Number(slotIndex) || 0));
    while (state.presets.length <= idx) state.presets.push(null);
    state.presets[idx] = entry;
    state.selectedPresetIndex = idx;
    savePresetsToStorage();
  }

  function loadPresetSlot(slotIndex) {
    const idx = Math.max(0, Math.floor(Number(slotIndex) || 0));
    const entry = state.presets[idx];
    if (!entry) return false;
    const ok = applyPresetData(entry);
    if (!ok) return false;
    state.selectedPresetIndex = idx;
    const nameInput = getPresetNameInput();
    if (nameInput) nameInput.value = String(entry.name || `Preset ${idx + 1}`);
    return true;
  }

  function deletePresetSlot(slotIndex) {
    const idx = Math.max(0, Math.floor(Number(slotIndex) || 0));
    if (!state.presets[idx]) return;
    state.presets[idx] = null;
    savePresetsToStorage();
  }

  function renderPresetControls() {
    const root = overlay?.querySelector?.("#paperdollPresetControls");
    if (!root) return;
    const rows = [];
    for (let i = 0; i < MAX_PRESET_SLOTS; i += 1) {
      const preset = state.presets[i];
      const selected = state.selectedPresetIndex === i;
      const label = preset?.name || `Empty Slot ${i + 1}`;
      rows.push(`
        <div style="display:grid;grid-template-columns:1fr 58px 58px 28px;gap:6px;align-items:center;">
          <div style="padding:4px 6px;border:1px solid ${selected ? "#5f78b5" : "#2a334a"};border-radius:6px;background:${selected ? "#16213a" : "#0d1220"};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:12px;" title="${label}">${label}</div>
          ${buttonHtml(`preset-save:${i}`, "Save", `Save to slot ${i + 1}`)}
          ${buttonHtml(`preset-load:${i}`, "Load", `Load slot ${i + 1}`)}
          ${buttonHtml(`preset-del:${i}`, "×", `Delete slot ${i + 1}`)}
        </div>
      `);
    }
    root.innerHTML = `
      <div style="font-size:12px;opacity:.9;margin-bottom:4px;">Pastor Presets (local)</div>
      ${rows.join("")}
    `;
  }

  function onPresetControlsClick(e) {
    e.preventDefault();
    e.stopPropagation();
    const btn = e.target?.closest?.("button[data-action]");
    if (!btn) return;
    const action = String(btn.getAttribute("data-action") || "");
    if (!action) return;
    if (action.startsWith("preset-save:")) {
      const idx = Number(action.slice("preset-save:".length)) || 0;
      saveCurrentToPresetSlot(idx);
    } else if (action.startsWith("preset-load:")) {
      const idx = Number(action.slice("preset-load:".length)) || 0;
      loadPresetSlot(idx);
    } else if (action.startsWith("preset-del:")) {
      const idx = Number(action.slice("preset-del:".length)) || 0;
      deletePresetSlot(idx);
    }
    controlsDirty = true;
    refreshPanels();
    render();
  }

  function renderControls() {
    if (!controlsRoot) return;
    const behavior = behaviorProfiles[state.behaviorIndex] || behaviorProfiles[0];
    const globalRows = [
      { label: "Page", value: getPageKey(), prev: "page-prev", next: "page-next" },
      { label: "Animation", value: getAnimDef().key, prev: "anim-prev", next: "anim-next" },
      { label: "Facing", value: FACING_KEYS[state.facingIndex], prev: "facing-prev", next: "facing-next" },
      { label: "Behavior", value: behavior.key, prev: "behavior-prev", next: "behavior-next" },
      { label: "Speed", value: `${state.playbackSpeed.toFixed(2)}x`, prev: "speed-down", next: "speed-up" },
    ];

    const rowsHtml = globalRows.map((row) => `
      <div style="display:grid;grid-template-columns:88px 28px 1fr 28px;gap:6px;align-items:center;margin-bottom:6px;">
        <div style="opacity:.85;">${row.label}</div>
        ${buttonHtml(row.prev, "◀", `Previous ${row.label.toLowerCase()}`)}
        <div style="padding:3px 6px;background:#121a2f;border:1px solid #253252;border-radius:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${row.value}</div>
        ${buttonHtml(row.next, "▶", `Next ${row.label.toLowerCase()}`)}
      </div>
    `).join("");

    const layerRowsHtml = LAYERS.map((layerKey) => {
      const layerName = layerLabel(layerKey);
      const unsupported = !pageSupportsLayer(getPageKey(), layerKey);
      const value = unsupported ? "(not on this page)" : currentLayerDisplayValue(layerKey);
      const vis = state.layerVisible[layerKey] ? "Visible" : "Hidden";
      return `
        <div style="display:grid;grid-template-columns:88px 28px 1fr 28px 64px;gap:6px;align-items:center;margin-bottom:6px;">
          <div style="opacity:.9;">${layerName}</div>
          ${buttonHtml(`layer-prev:${layerKey}`, "◀", `Previous ${layerName.toLowerCase()}`)}
          <div style="padding:3px 6px;background:#121a2f;border:1px solid #253252;border-radius:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${value}</div>
          ${buttonHtml(`layer-next:${layerKey}`, "▶", `Next ${layerName.toLowerCase()}`)}
          ${buttonHtml(`layer-toggle:${layerKey}`, vis, `Toggle ${layerName.toLowerCase()} visibility`)}
        </div>
      `;
    }).join("");

    controlsRoot.innerHTML = `
      <div style="font-weight:700;margin-bottom:6px;">Mouse Controls</div>
      ${rowsHtml}
      <div style="display:flex;gap:6px;margin-top:8px;margin-bottom:8px;">
        ${buttonHtml("play-toggle", state.holdFrame ? "Play" : "Pause", "Toggle playback")}
        ${buttonHtml("anim-restart", "Restart", "Restart current animation")}
      </div>
      <div style="display:flex;gap:6px;margin-top:0;margin-bottom:8px;">
        ${buttonHtml("frame-prev", "Prev Frame", "Step one frame backward (works best while paused)")}
        ${buttonHtml("frame-next", "Next Frame", "Step one frame forward (works best while paused)")}
      </div>
      <div style="font-weight:700;margin-bottom:6px;">Behavior Preview</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">
        ${buttonHtml("behavior-trigger", "Use Behavior", "Play behavior profile action, then return")}
        ${buttonHtml("attack-slash1", "Slash 1", "Play Slash 1, then return")}
        ${buttonHtml("attack-slash2", "Slash 2", "Play Slash 2, then return")}
        ${buttonHtml("attack-thrust", "Thrust", "Play Thrust, then return")}
        ${buttonHtml("attack-bash", "Shield Bash", "Play Shield Bash, then return")}
      </div>
      <div style="font-weight:700;margin-bottom:6px;">Layers</div>
      ${layerRowsHtml}
    `;
    controlsDirty = false;
  }

  function onControlsClick(e) {
    const btn = e.target?.closest?.("button[data-action]");
    if (!btn) return;
    e.preventDefault();
    const action = String(btn.getAttribute("data-action") || "");
    if (!action) return;

    let keepFrameCursor = false;
    if (action === "page-prev") stepPage(-1);
    else if (action === "page-next") stepPage(1);
    else if (action === "anim-prev") stepAnim(-1);
    else if (action === "anim-next") stepAnim(1);
    else if (action === "facing-prev") stepFacing(-1);
    else if (action === "facing-next") stepFacing(1);
    else if (action === "behavior-prev") state.behaviorIndex = clampWrap(state.behaviorIndex - 1, behaviorProfiles.length);
    else if (action === "behavior-next") state.behaviorIndex = clampWrap(state.behaviorIndex + 1, behaviorProfiles.length);
    else if (action === "speed-down") state.playbackSpeed = Math.max(0.25, state.playbackSpeed - 0.1);
    else if (action === "speed-up") state.playbackSpeed = Math.min(4.0, state.playbackSpeed + 0.1);
    else if (action === "play-toggle") state.holdFrame = !state.holdFrame;
    else if (action === "anim-restart") {
      state.frameCursor = 0;
      state.frameElapsed = 0;
      state.holdFrame = false;
      state.transientAction = null;
    } else if (action === "frame-prev") {
      stepFrame(-1);
      keepFrameCursor = true;
    } else if (action === "frame-next") {
      stepFrame(1);
      keepFrameCursor = true;
    } else if (action === "behavior-trigger") {
      const behavior = behaviorProfiles[state.behaviorIndex] || behaviorProfiles[0];
      triggerTransientAction(behavior?.melee_style || "slash_1");
    } else if (action === "attack-slash1") {
      triggerTransientAction("slash_1");
    } else if (action === "attack-slash2") {
      triggerTransientAction("slash_2");
    } else if (action === "attack-thrust") {
      triggerTransientAction("thrust");
    } else if (action === "attack-bash") {
      triggerTransientAction("shield_bash");
    } else if (action.startsWith("layer-prev:")) {
      const layerKey = action.slice("layer-prev:".length);
      const list = layerCatalog[layerKey] || [];
      if (list.length) state.layerSelection[layerKey] = clampWrap((state.layerSelection[layerKey] || 0) - 1, list.length);
      if ((layerKey === "6tla" || layerKey === "7tlb") && getPageKey() === "p1") {
        state.pageIndex = 1; // pONE1
        ensureAnimationMatchesPage();
      }
    } else if (action.startsWith("layer-next:")) {
      const layerKey = action.slice("layer-next:".length);
      const list = layerCatalog[layerKey] || [];
      if (list.length) state.layerSelection[layerKey] = clampWrap((state.layerSelection[layerKey] || 0) + 1, list.length);
      if ((layerKey === "6tla" || layerKey === "7tlb") && getPageKey() === "p1") {
        state.pageIndex = 1; // pONE1
        ensureAnimationMatchesPage();
      }
    } else if (action.startsWith("layer-toggle:")) {
      const layerKey = action.slice("layer-toggle:".length);
      if (layerKey in state.layerVisible) state.layerVisible[layerKey] = !state.layerVisible[layerKey];
    }

    if (!keepFrameCursor) {
      state.frameCursor = 0;
      state.frameElapsed = 0;
    }
    controlsDirty = true;
    refreshPanels();
    render();
  }

  function stepFrame(delta) {
    const frames = computeAnimFrames();
    if (!frames.length) return;
    state.frameCursor = clampWrap((state.frameCursor || 0) + delta, frames.length);
    state.frameElapsed = 0;
  }

  function triggerTransientAction(animKey) {
    const idx = animDefs.findIndex((a) => a?.key === animKey);
    if (idx < 0) return false;
    const target = animDefs[idx];
    state.transientAction = {
      returnAnimIndex: state.animIndex,
      returnPageIndex: state.pageIndex,
    };
    state.animIndex = idx;
    const pageIdx = PAGE_KEYS.indexOf(target.page);
    if (pageIdx >= 0) state.pageIndex = pageIdx;
    state.frameCursor = 0;
    state.frameElapsed = 0;
    state.holdFrame = false;
    controlsDirty = true;
    return true;
  }

  function imageForPath(path) {
    if (!path) return null;
    if (state.missingCache.has(path)) return null;
    if (state.imageCache.has(path)) return state.imageCache.get(path);
    const img = new Image();
    img.src = path;
    img.onerror = () => {
      state.missingCache.add(path);
    };
    state.imageCache.set(path, img);
    return img;
  }

  function drawFrameFromSheet(img, frameIndex, x, y, scale = 4) {
    if (!ctx || !img || !img.complete || !img.naturalWidth) return;
    const cols = Math.max(1, Math.floor(img.naturalWidth / FRAME_SIZE));
    const sx = (frameIndex % cols) * FRAME_SIZE;
    const sy = Math.floor(frameIndex / cols) * FRAME_SIZE;
    const dw = FRAME_SIZE * scale;
    const dh = FRAME_SIZE * scale;
    ctx.drawImage(img, sx, sy, FRAME_SIZE, FRAME_SIZE, x - dw / 2, y - dh / 2, dw, dh);
  }

  function render() {
    if (!state.open || !ctx || !canvas) return;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0c1323";
    ctx.fillRect(0, 0, w, h);

    // Ground line
    ctx.strokeStyle = "#263652";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, h - 120);
    ctx.lineTo(w - 40, h - 120);
    ctx.stroke();

    const frames = computeAnimFrames();
    const frameIdx = frames[clampWrap(state.frameCursor, frames.length)] || 0;
    const cx = Math.floor(w * 0.5);
    const cy = Math.floor(h * 0.56);

    const drawOrder = layerDrawOrderForFrame(frameIdx);
    const page = getPageKey();
    const shieldFront = isShieldFrontFrame(page, frameIdx);
    const drawLayer = (layerKey) => {
      if (!state.layerVisible[layerKey]) return;
      if (!pageSupportsLayer(page, layerKey)) return;
      const path = getLayerPath(layerKey);
      const img = imageForPath(path);
      drawFrameFromSheet(img, frameIdx, cx, cy, 4);
    };

    // Pass 1: behind-only shield frames (prevents dark shield overlay across torso).
    if (!shieldFront) drawLayer("7tlb");

    // Pass 2: main body stack and non-shield layers.
    drawOrder.forEach((layerKey) => {
      if (layerKey === "7tlb") return;
      drawLayer(layerKey);
    });

    // Pass 3: shield when this frame is marked as front-facing.
    if (shieldFront) drawLayer("7tlb");

    ctx.fillStyle = "#9fb2d9";
    ctx.font = "14px ui-monospace, Menlo, monospace";
    ctx.fillText(`Page: ${getPageKey()}  |  Anim: ${getAnimDef().key}  |  Facing: ${FACING_KEYS[state.facingIndex]}`, 22, 28);
    ctx.fillText(`Frame: ${frameIdx} (${state.frameCursor + 1}/${frames.length})  |  Speed: ${state.playbackSpeed.toFixed(2)}x`, 22, 48);
    ctx.fillText(`Focused Layer: ${layerLabel(focusedLayer())}`, 22, 68);
    if (getPageKey() === "p1" && (getLayerFilename("6tla") || getLayerFilename("7tlb"))) {
      ctx.fillStyle = "#f6c85f";
      ctx.fillText("Main/Off Hand are unavailable on page p1 for this asset set.", 22, 90);
    }
  }

  function update(dtMs) {
    if (!state.open) return;
    if (state.holdFrame) return;
    const def = getAnimDef();
    const frames = computeAnimFrames();
    if (!frames.length) return;

    state.frameElapsed += dtMs * state.playbackSpeed;
    const timing = def.timingMs[clampWrap(state.frameCursor, def.timingMs.length)] || 120;
    if (state.frameElapsed < timing) return;
    state.frameElapsed = 0;
    state.frameCursor += 1;

    if (state.frameCursor >= frames.length) {
      if (state.transientAction) {
        state.animIndex = state.transientAction.returnAnimIndex;
        state.pageIndex = state.transientAction.returnPageIndex;
        state.transientAction = null;
        ensureAnimationMatchesPage();
        state.frameCursor = 0;
        state.frameElapsed = 0;
        state.holdFrame = false;
        controlsDirty = true;
        return;
      }
      if (def.oneShot && !state.loop) {
        state.frameCursor = frames.length - 1;
        state.holdFrame = true;
      } else {
        state.frameCursor = 0;
      }
    }
  }

  function buildSpecObject() {
    const def = getAnimDef();
    const behavior = behaviorProfiles[state.behaviorIndex] || behaviorProfiles[0];
      const layers = {};
    LAYERS.forEach((k) => {
      layers[layerLabel(k)] = state.layerVisible[k] ? (getLayerFilename(k) || "none") : "hidden";
    });
    const rawLayers = {};
    LAYERS.forEach((k) => {
      rawLayers[k] = state.layerVisible[k] ? (getLayerFilename(k) || "none") : "hidden";
    });
    return {
      source: "mana-seed",
      page: getPageKey(),
      facing: FACING_KEYS[state.facingIndex],
      animation: def.key,
      timing_ms: def.timingMs,
      loop: state.loop,
      frame_index: state.frameCursor,
      behavior_profile: behavior,
      layers,
      raw_layers: rawLayers,
      layer_visibility: Object.fromEntries(LAYERS.map((k) => [layerLabel(k), Boolean(state.layerVisible[k])])),
      raw_layer_visibility: Object.fromEntries(LAYERS.map((k) => [k, Boolean(state.layerVisible[k])])),
      paths: Object.fromEntries(LAYERS.map((k) => [layerLabel(k), getLayerPath(k) || "none"])),
      raw_paths: Object.fromEntries(LAYERS.map((k) => [k, getLayerPath(k) || "none"])),
    };
  }

  function buildSpecJson() {
    return JSON.stringify(buildSpecObject(), null, 2);
  }

  function buildSpecShort() {
    const obj = buildSpecObject();
    return [
      `page=${obj.page}`,
      `facing=${obj.facing}`,
      `anim=${obj.animation}`,
      `melee=${obj.behavior_profile.melee_style}`,
      `projectile=${obj.behavior_profile.projectile_style}`,
      `Body=${obj.layers["Body"]}`,
      `Outfit=${obj.layers["Outfit"]}`,
      `Hair=${obj.layers["Hair"]}`,
      `Hat=${obj.layers["Hat"]}`,
      `MainHand=${obj.layers["Main Hand"]}`,
      `OffHand=${obj.layers["Off Hand"]}`,
    ].join(" | ");
  }

  function buildGameConfigObject() {
    const behavior = behaviorProfiles[state.behaviorIndex] || behaviorProfiles[0];
    const presetSlots = [];
    for (let i = 0; i < MAX_PRESET_SLOTS; i += 1) {
      const p = state.presets?.[i];
      if (!p || typeof p !== "object") continue;
      const name = String(p.name || `Preset ${i + 1}`).trim() || `Preset ${i + 1}`;
      presetSlots.push({
        slot: i + 1,
        name,
        page: PAGE_KEYS[clampWrap(Number(p.pageIndex) || 0, PAGE_KEYS.length)] || "pONE2",
        facing: FACING_KEYS[clampWrap(Number(p.facingIndex) || 0, FACING_KEYS.length)] || "south",
        animation: (animDefs[clampWrap(Number(p.animIndex) || 0, animDefs.length)] || animDefs[0]).key,
        behavior: (behaviorProfiles[clampWrap(Number(p.behaviorIndex) || 0, behaviorProfiles.length)] || behaviorProfiles[0]).key,
        playbackSpeed: Math.max(0.25, Math.min(4, Number(p.playbackSpeed) || 1)),
        loop: Boolean(p.loop),
        layers: Object.fromEntries(
          LAYERS.map((k) => {
            const list = layerCatalog[k] || [];
            const idx = clampWrap(Number(p.layerSelection?.[k]) || 0, Math.max(1, list.length));
            const token = list[idx] || "none";
            return [k, {
              label: layerLabel(k),
              asset: token === "none" ? "none" : token,
              visible: p.layerVisible?.[k] !== false,
            }];
          }),
        ),
      });
    }
    return {
      source: "mana-seed",
      page: getPageKey(),
      facing: FACING_KEYS[state.facingIndex],
      animation: getAnimDef().key,
      playbackSpeed: Number(state.playbackSpeed.toFixed(2)),
      loop: Boolean(state.loop),
      behavior: {
        key: behavior.key,
        melee_style: behavior.melee_style,
        projectile_style: behavior.projectile_style,
        movement_set: behavior.movement_set,
      },
      layers: Object.fromEntries(
        LAYERS.map((k) => [
          k,
          {
            label: layerLabel(k),
            asset: getLayerToken(k) || "none",
            visible: Boolean(state.layerVisible[k]),
          },
        ]),
      ),
      presets: presetSlots,
      // Edit this map in config_pastor_paperdoll.js to pick a saved preset name per movement/animation.
      // Example: { walk: "Town Walk", combat_idle: "Sword Idle", slash_1: "Sword Attack A" }
      animationPresetMap: {},
      // Edit this map to switch pastor preset by powerup key.
      // Example: { powerupX: "Holy Fire Form", speedAura: "Sprint Form" }
      powerupPresetMap: {},
    };
  }

  function buildGameConfigJs() {
    const cfg = buildGameConfigObject();
    return [
      "// Generated from dev/paperdoll_sandbox.js",
      "(function initPastorPaperdollConfig(global) {",
      "  const FILE_DEFAULT = " + JSON.stringify(cfg, null, 2) + ";",
      "  global.BATTLECHURCH_PASTOR_PAPERDOLL = FILE_DEFAULT;",
      "})(typeof window !== \"undefined\" ? window : globalThis);",
      "",
    ].join("\n");
  }

  async function saveConfigFileWithPrompt() {
    const text = buildGameConfigJs();
    if (typeof window.showSaveFilePicker === "function") {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: "config_pastor_paperdoll.js",
          types: [
            {
              description: "JavaScript",
              accept: { "application/javascript": [".js"] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(text);
        await writable.close();
        return;
      } catch (_) {
        // user cancel or unsupported context; fallback below
      }
    }
    const blob = new Blob([text], { type: "application/javascript;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "config_pastor_paperdoll.js";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function refreshPanels() {
    if (!overlay) return;
    renderPresetControls();
    if (controlsDirty) {
      renderControls();
    }
  }

  function stepLayer(delta) {
    const key = focusedLayer();
    const list = layerCatalog[key] || [];
    if (!list.length) return;
    const next = clampWrap((state.layerSelection[key] || 0) + delta, list.length);
    state.layerSelection[key] = next;
    if ((key === "6tla" || key === "7tlb") && getPageKey() === "p1") {
      state.pageIndex = 1; // pONE1
      ensureAnimationMatchesPage();
    }
    state.frameCursor = 0;
    state.frameElapsed = 0;
  }

  function stepAnim(delta) {
    state.animIndex = clampWrap(state.animIndex + delta, animDefs.length);
    const newPage = animDefs[state.animIndex]?.page;
    const pageIdx = PAGE_KEYS.indexOf(newPage);
    if (pageIdx >= 0) state.pageIndex = pageIdx;
    state.frameCursor = 0;
    state.frameElapsed = 0;
    state.holdFrame = false;
  }

  function ensureAnimationMatchesPage() {
    const page = getPageKey();
    const current = getAnimDef();
    if (current?.page === page) return;
    const fallbackByPage = {
      p1: "walk",
      pONE1: "draw_sheath",
      pONE2: "combat_idle",
      pONE3: "slash_1",
    };
    const preferred = fallbackByPage[page] || "walk";
    let idx = animDefs.findIndex((a) => a?.page === page && a?.key === preferred);
    if (idx < 0) idx = animDefs.findIndex((a) => a?.page === page);
    if (idx >= 0) state.animIndex = idx;
    state.frameCursor = 0;
    state.frameElapsed = 0;
    state.holdFrame = false;
  }

  function stepFacing(delta) {
    state.facingIndex = clampWrap(state.facingIndex + delta, FACING_KEYS.length);
    state.frameCursor = 0;
    state.frameElapsed = 0;
  }

  function stepPage(delta) {
    state.pageIndex = clampWrap(state.pageIndex + delta, PAGE_KEYS.length);
    ensureAnimationMatchesPage();
    state.frameCursor = 0;
    state.frameElapsed = 0;
  }

  function onKeyDown(e) {
    if (!state.open) return;
    const target = e.target;
    const tag = String(target?.tagName || "").toLowerCase();
    const isTypingTarget =
      tag === "input" ||
      tag === "textarea" ||
      target?.isContentEditable === true;
    if (isTypingTarget) {
      // Allow normal typing/editing in preset name and any future text fields.
      // Keep Escape available to close the sandbox quickly.
      if (String(e.key || "") !== "Escape") return;
    }
    const key = String(e.key || "");
    const lower = key.length === 1 ? key.toLowerCase() : key;

    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Escape", "Enter", "w", "s", "a", "d", "q", "e", "[", "]"].includes(key) ||
        ["w", "s", "a", "d", "q", "e", "[", "]"].includes(lower)) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (key === "Escape") {
      close();
      return;
    }
    if (key === "ArrowUp") {
      state.focusedLayerIndex = clampWrap(state.focusedLayerIndex - 1, LAYERS.length);
    } else if (key === "ArrowDown") {
      state.focusedLayerIndex = clampWrap(state.focusedLayerIndex + 1, LAYERS.length);
    } else if (key === "ArrowLeft") {
      if (state.holdFrame) stepFrame(-1);
      else stepLayer(-1);
    } else if (key === "ArrowRight") {
      if (state.holdFrame) stepFrame(1);
      else stepLayer(1);
    } else if (lower === "w") {
      stepAnim(-1);
    } else if (lower === "s") {
      stepAnim(1);
    } else if (lower === "a") {
      stepFacing(-1);
    } else if (lower === "d") {
      stepFacing(1);
    } else if (lower === "q") {
      stepPage(-1);
    } else if (lower === "e") {
      stepPage(1);
    } else if (key === " ") {
      state.holdFrame = !state.holdFrame;
    } else if (key === "Enter") {
      state.frameCursor = 0;
      state.frameElapsed = 0;
      state.holdFrame = false;
    } else if (key === "[") {
      state.playbackSpeed = Math.max(0.25, state.playbackSpeed - 0.1);
    } else if (key === "]") {
      state.playbackSpeed = Math.min(4.0, state.playbackSpeed + 0.1);
    } else if (key === "Tab") {
      state.behaviorIndex = clampWrap(state.behaviorIndex + 1, behaviorProfiles.length);
    } else if (lower === "v") {
      const layer = focusedLayer();
      state.layerVisible[layer] = !state.layerVisible[layer];
    }
    controlsDirty = true;
    refreshPanels();
    render();
  }

  function tick(lastTs) {
    if (!state.open) return;
    const now = performance.now();
    const dt = Math.max(0, now - lastTs);
    update(dt);
    render();
    refreshPanels();
    state.rafId = requestAnimationFrame(() => tick(now));
  }

  function open() {
    ensureOverlay();
    if (!overlay || state.open) return;
    loadPresetsFromStorage();
    loadPresetSlot(0);
    state.open = true;
    overlay.style.display = "block";
    controlsDirty = true;
    refreshPanels();
    render();
    state.rafId = requestAnimationFrame(() => tick(performance.now()));
  }

  function close() {
    if (!state.open) return;
    state.open = false;
    if (state.rafId) cancelAnimationFrame(state.rafId);
    state.rafId = 0;
    if (overlay) overlay.style.display = "none";
  }

  function toggle() {
    if (state.open) close();
    else open();
  }

  document.addEventListener("keydown", (e) => {
    const key = String(e.key || "");
    const lower = key.length === 1 ? key.toLowerCase() : key;

    if ((e.shiftKey && lower === "x") || (key === "X" && e.shiftKey)) {
      e.preventDefault();
      e.stopPropagation();
      toggle();
      return;
    }

    if (state.open) onKeyDown(e);
  }, true);

  const api = {
    open,
    close,
    toggle,
    isOpen: () => state.open,
    consumeAction: () => state.open,
    getSpec: () => buildSpecObject(),
  };

  window.PaperdollSandbox = api;
})(typeof window !== "undefined" ? window : null, typeof document !== "undefined" ? document : null);
