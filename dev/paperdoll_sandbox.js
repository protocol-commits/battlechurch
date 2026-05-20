(function setupPaperdollSandbox(window, document) {
  if (!window || !document) return;

  const OVERLAY_ID = "paperdollSandboxOverlay";
  const BASE_ROOT = "assets/sprites/npcs/mana-seed";
  const PRESET_STORAGE_KEY = "battlechurch.pastorPaperdollPresets.v1";
  const CUSTOM_FACE_STORAGE_KEY = "battlechurch.pastorPaperdollCustomFace.v1";
  const CUSTOMIZE_PRESET_STORAGE_KEY = "battlechurch.pastorCustomizePresets.v1";
  const CUSTOMIZE_PRESET_SLOTS = 5;
  const MAX_PRESET_SLOTS = 24;
  const PAGE_KEYS = ["p1", "pONE1", "pONE2", "pONE3"];
  const LAYERS = ["0bas", "1out", "4har", "5hat", "6tla", "7tlb"];
  const APPEARANCE_LAYERS = ["0bas", "1out", "4har", "5hat"];
  const LAYER_LABELS = Object.freeze({
    "0bas": "Body",
    "1out": "Outfit",
    "4har": "Hair",
    "5hat": "Hat",
    "6tla": "Main Hand",
    "7tlb": "Off Hand",
  });
  const FACING_KEYS = ["south", "north", "east", "west"];
  const FRAME_SIZE = 64;
  const deepClone = (value, fallback = null) => {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_) {
      return fallback;
    }
  };

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
    uiMode: "dev", // "dev" | "customize"
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
    customizePresets: [],
    customizeStatus: "",
    customFace: {
      enabled: false,
      front: null,
      side: null,
      back: null,
      frontName: "",
      sideName: "",
      backName: "",
      offsetX: 0,
      offsetXNorthSouth: 0,
      offsetXEastWest: 0,
      offsetY: -12,
      width: 22,
      height: 20,
      cropX: 0,
      cropY: 0,
      cropW: 100,
      cropH: 100,
      flipSideForEast: true,
      invertSideDirections: false,
      northFaceMode: "back", // "back" | "side_west" | "side_east"
      status: "No face images loaded.",
    },
  };
  const NORTH_FACE_MODES = ["back", "side_west", "side_east"];
  const NORTH_FACE_MODE_LABELS = {
    back: "Back",
    side_west: "Side-West",
    side_east: "Side-East",
  };
  const FILE_DEFAULT_FACE_PROFILE = deepClone(
    window.BATTLECHURCH_PASTOR_PAPERDOLL?.customFace || null,
    null,
  );
  function getDefaultAppearanceFromIdlePreset() {
    const cfg = window.BATTLECHURCH_PASTOR_PAPERDOLL;
    const presets = Array.isArray(cfg?.presets) ? cfg.presets : [];
    const idle = presets.find((p) => String(p?.name || "").trim().toLowerCase() === "idle");
    const out = {};
    APPEARANCE_LAYERS.forEach((layerKey) => {
      const token = String(idle?.layers?.[layerKey]?.asset || "").trim();
      if (token) out[layerKey] = token;
    });
    if (Object.keys(out).length) return out;
    return deepClone(cfg?.appearanceLayers || null, null);
  }
  const FILE_DEFAULT_APPEARANCE_LAYERS = getDefaultAppearanceFromIdlePreset();

  let overlay = null;
  let canvas = null;
  let ctx = null;
  let controlsRoot = null;
  let controlsDirty = true;
  let presetsDirty = true;
  let faceCropOverlay = null;
  const faceCropState = {
    slot: null, // "front" | "side" | "back"
    img: null,
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    dragging: false,
    lastX: 0,
    lastY: 0,
  };

  function buttonHtml(action, label, title = "") {
    const safeTitle = String(title || "").replace(/"/g, "&quot;");
    return `<button type="button" data-action="${action}" title="${safeTitle}" style="padding:4px 8px;background:#1b2740;color:#e8edf7;border:1px solid #3a4b72;border-radius:6px;cursor:pointer;">${label}</button>`;
  }

  function ensureFaceCropOverlay() {
    if (faceCropOverlay) return faceCropOverlay;
    const root = document.createElement("div");
    root.id = "paperdollFaceCropOverlay";
    root.style.cssText = [
      "position:fixed",
      "inset:0",
      "z-index:100000",
      "display:none",
      "background:rgba(5,8,14,0.88)",
      "color:#e8edf7",
      "font-family: ui-monospace, SFMono-Regular, Menlo, monospace",
    ].join(";");
    root.innerHTML = `
      <div style="max-width:760px;margin:36px auto;background:#0f1627;border:1px solid #2a334a;border-radius:12px;padding:14px;">
        <div style="font-size:16px;font-weight:700;margin-bottom:8px;">Face Crop</div>
        <div style="font-size:12px;opacity:.9;margin-bottom:10px;">Drag image to position. Mouse wheel or slider to zoom. Oval area is what gets used.</div>
        <div style="display:grid;grid-template-columns:1fr 220px;gap:12px;align-items:start;">
          <div style="display:flex;align-items:center;justify-content:center;background:#0a1020;border:1px solid #2a334a;border-radius:10px;min-height:460px;">
            <canvas id="paperdollFaceCropCanvas" width="420" height="420" style="image-rendering:pixelated;background:#0a1020;border-radius:8px;"></canvas>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            <label style="font-size:12px;opacity:.9;">Zoom</label>
            <input id="paperdollFaceCropZoom" type="range" min="0.5" max="4" step="0.01" value="1">
            <div id="paperdollFaceCropZoomLabel" style="font-size:12px;opacity:.9;">100%</div>
            <div style="display:flex;gap:8px;margin-top:10px;">
              <button type="button" id="paperdollFaceCropApply" style="flex:1;padding:8px;background:#254122;color:#e8edf7;border:1px solid #4f8d45;border-radius:8px;cursor:pointer;">Apply</button>
              <button type="button" id="paperdollFaceCropCancel" style="flex:1;padding:8px;background:#2a334a;color:#e8edf7;border:1px solid #4a5a7c;border-radius:8px;cursor:pointer;">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(root);
    faceCropOverlay = root;

    const cropCanvas = root.querySelector("#paperdollFaceCropCanvas");
    const cropCtx = cropCanvas?.getContext("2d");
    const zoomInput = root.querySelector("#paperdollFaceCropZoom");
    const zoomLabel = root.querySelector("#paperdollFaceCropZoomLabel");
    const renderCrop = () => {
      if (!cropCtx || !cropCanvas) return;
      cropCtx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
      cropCtx.fillStyle = "#0b1220";
      cropCtx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);
      const img = faceCropState.img;
      if (img && img.complete && img.naturalWidth) {
        const base = Math.min(cropCanvas.width / img.naturalWidth, cropCanvas.height / img.naturalHeight);
        const scale = base * Math.max(0.5, Math.min(4, faceCropState.zoom || 1));
        const dw = img.naturalWidth * scale;
        const dh = img.naturalHeight * scale;
        const dx = Math.round((cropCanvas.width - dw) * 0.5 + (faceCropState.offsetX || 0));
        const dy = Math.round((cropCanvas.height - dh) * 0.5 + (faceCropState.offsetY || 0));
        cropCtx.drawImage(img, dx, dy, dw, dh);
      }
      // Darken outside oval
      cropCtx.save();
      cropCtx.fillStyle = "rgba(0,0,0,0.55)";
      cropCtx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);
      cropCtx.globalCompositeOperation = "destination-out";
      cropCtx.beginPath();
      cropCtx.ellipse(cropCanvas.width / 2, cropCanvas.height / 2, 138, 176, 0, 0, Math.PI * 2);
      cropCtx.fill();
      cropCtx.restore();
      // Oval guide
      cropCtx.strokeStyle = "rgba(230,244,255,0.9)";
      cropCtx.lineWidth = 2;
      cropCtx.beginPath();
      cropCtx.ellipse(cropCanvas.width / 2, cropCanvas.height / 2, 138, 176, 0, 0, Math.PI * 2);
      cropCtx.stroke();
      if (zoomLabel) zoomLabel.textContent = `${Math.round((faceCropState.zoom || 1) * 100)}%`;
    };

    cropCanvas?.addEventListener("pointerdown", (e) => {
      faceCropState.dragging = true;
      faceCropState.lastX = e.clientX;
      faceCropState.lastY = e.clientY;
      cropCanvas.setPointerCapture?.(e.pointerId);
    });
    cropCanvas?.addEventListener("pointermove", (e) => {
      if (!faceCropState.dragging) return;
      const dx = e.clientX - faceCropState.lastX;
      const dy = e.clientY - faceCropState.lastY;
      faceCropState.lastX = e.clientX;
      faceCropState.lastY = e.clientY;
      faceCropState.offsetX += dx;
      faceCropState.offsetY += dy;
      renderCrop();
    });
    const endDrag = () => { faceCropState.dragging = false; };
    cropCanvas?.addEventListener("pointerup", endDrag);
    cropCanvas?.addEventListener("pointercancel", endDrag);
    cropCanvas?.addEventListener("wheel", (e) => {
      e.preventDefault();
      const step = e.deltaY > 0 ? -0.08 : 0.08;
      faceCropState.zoom = Math.max(0.5, Math.min(4, (faceCropState.zoom || 1) + step));
      if (zoomInput) zoomInput.value = String(faceCropState.zoom);
      renderCrop();
    }, { passive: false });
    zoomInput?.addEventListener("input", () => {
      faceCropState.zoom = Math.max(0.5, Math.min(4, Number(zoomInput.value) || 1));
      renderCrop();
    });
    root.querySelector("#paperdollFaceCropCancel")?.addEventListener("click", () => {
      root.style.display = "none";
      faceCropState.slot = null;
      faceCropState.img = null;
    });
    root.querySelector("#paperdollFaceCropApply")?.addEventListener("click", () => {
      const img = faceCropState.img;
      const slot = faceCropState.slot;
      if (!img || !slot) return;
      const out = document.createElement("canvas");
      out.width = 256;
      out.height = 256;
      const octx = out.getContext("2d");
      if (!octx) return;
      const base = Math.min(cropCanvas.width / img.naturalWidth, cropCanvas.height / img.naturalHeight);
      const scale = base * Math.max(0.5, Math.min(4, faceCropState.zoom || 1));
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      const dx = Math.round((cropCanvas.width - dw) * 0.5 + (faceCropState.offsetX || 0));
      const dy = Math.round((cropCanvas.height - dh) * 0.5 + (faceCropState.offsetY || 0));
      octx.save();
      octx.beginPath();
      octx.ellipse(out.width / 2, out.height / 2, 84, 108, 0, 0, Math.PI * 2);
      octx.clip();
      // map 420-space to 256-space
      const map = out.width / cropCanvas.width;
      octx.setTransform(map, 0, 0, map, 0, 0);
      octx.drawImage(img, dx, dy, dw, dh);
      octx.restore();
      const result = out.toDataURL("image/png");
      if (slot === "front") state.customFace.front = result;
      else if (slot === "side") state.customFace.side = result;
      else if (slot === "back") state.customFace.back = result;
      state.customFace.enabled = true;
      state.customFace.status = `Applied oval crop to ${slot}.`;
      saveCustomFaceToStorage();
      controlsDirty = true;
      refreshPanels();
      render();
      root.style.display = "none";
      faceCropState.slot = null;
      faceCropState.img = null;
    });

    root._renderFaceCrop = renderCrop;
    return root;
  }

  function openFaceCropEditor(slot) {
    const source =
      slot === "front" ? state.customFace.front :
      slot === "side" ? state.customFace.side :
      slot === "back" ? state.customFace.back : null;
    if (!source) {
      state.customFace.status = `Upload ${slot} image first.`;
      controlsDirty = true;
      refreshPanels();
      render();
      return;
    }
    const root = ensureFaceCropOverlay();
    const img = new Image();
    img.onload = () => {
      faceCropState.slot = slot;
      faceCropState.img = img;
      faceCropState.zoom = 1;
      faceCropState.offsetX = 0;
      faceCropState.offsetY = 0;
      const zoomInput = root.querySelector("#paperdollFaceCropZoom");
      if (zoomInput) zoomInput.value = "1";
      root.style.display = "block";
      root._renderFaceCrop?.();
    };
    img.src = source;
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
      <div id="paperdollSandboxGrid" style="display:grid;grid-template-columns:440px 1fr 300px;gap:12px;height:100%;padding:12px;box-sizing:border-box;">
        <div style="background:rgba(12,16,24,0.86);border:1px solid #2a334a;border-radius:10px;padding:12px;overflow:auto;">
          <div style="font-size:18px;font-weight:700;margin-bottom:8px;">Paperdoll Sandbox</div>
          <div id="paperdollSandboxControls" style="margin-top:10px;background:#0d1220;border:1px solid #2a334a;padding:10px;border-radius:8px;font-size:12px;max-height:76vh;overflow:auto;"></div>
        </div>
        <div id="paperdollPreviewCol" style="display:flex;align-items:center;justify-content:center;background:rgba(12,16,24,0.6);border:1px solid #2a334a;border-radius:10px;position:relative;overflow:hidden;">
          <canvas id="paperdollSandboxCanvas" width="700" height="520" style="width:auto;height:auto;max-width:100%;max-height:100%;aspect-ratio:700/520;image-rendering:pixelated;"></canvas>
        </div>
        <div id="paperdollRightCol" style="background:rgba(12,16,24,0.86);border:1px solid #2a334a;border-radius:10px;padding:12px;display:flex;flex-direction:column;min-height:0;">
          <div style="font-size:14px;font-weight:700;margin-bottom:6px;">Pastor Presets</div>
          <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
            <label for="paperdollPresetName" style="font-size:12px;opacity:.9;">Preset name</label>
            <input id="paperdollPresetName" type="text" value="Pastor Preset" style="flex:1;background:#0d1220;color:#e8edf7;border:1px solid #2a334a;border-radius:6px;padding:6px;font-size:12px;">
          </div>
          <div id="paperdollPresetControls" style="display:flex;flex-direction:column;gap:6px;margin-bottom:8px;flex:1;min-height:200px;overflow:auto;"></div>
          <div style="display:flex;gap:8px;margin-top:8px;">
            <button id="paperdollSaveGameConfig" type="button" style="flex:1;padding:8px;background:#254122;color:#e8edf7;border:1px solid #4f8d45;border-radius:8px;cursor:pointer;">Save Config File</button>
          </div>
          <div style="display:flex;gap:8px;margin-top:6px;">
            <button id="paperdollExportPresets" type="button" style="flex:1;padding:6px;background:#1a2340;color:#e8edf7;border:1px solid #3a4a6a;border-radius:8px;cursor:pointer;font-size:11px;">Export Presets</button>
            <button id="paperdollImportPresets" type="button" style="flex:1;padding:6px;background:#1a2340;color:#e8edf7;border:1px solid #3a4a6a;border-radius:8px;cursor:pointer;font-size:11px;">Import Presets</button>
            <input id="paperdollImportPresetsFile" type="file" accept=".json" style="display:none;">
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
    overlay.querySelector("#paperdollExportPresets")?.addEventListener("click", exportPresetsToFile);
    overlay.querySelector("#paperdollImportPresets")?.addEventListener("click", () => overlay.querySelector("#paperdollImportPresetsFile")?.click());
    overlay.querySelector("#paperdollImportPresetsFile")?.addEventListener("change", onImportPresetsFileChange);
    controlsRoot?.addEventListener("click", onControlsClick);
    controlsRoot?.addEventListener("change", onControlsInput);
    overlay.addEventListener("click", onPresetControlsClick);
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
    presetsDirty = true;
  }

  function getAppearanceSelectionFromState() {
    return Object.fromEntries(
      APPEARANCE_LAYERS.map((layerKey) => [layerKey, getLayerToken(layerKey)]),
    );
  }

  function applyAppearanceSelectionToState(selection) {
    if (!selection || typeof selection !== "object") return;
    APPEARANCE_LAYERS.forEach((layerKey) => {
      const token = String(selection[layerKey] || "").trim();
      if (!token) return;
      const list = layerCatalog[layerKey] || [];
      const idx = list.indexOf(token);
      if (idx >= 0) state.layerSelection[layerKey] = idx;
    });
  }

  function savePresetsToStorage() {
    if (!window.localStorage?.setItem) return;
    window.localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(state.presets || []));
  }

  function loadCustomizePresetsFromStorage() {
    const raw = window.localStorage?.getItem?.(CUSTOMIZE_PRESET_STORAGE_KEY);
    const parsed = safeParse(raw, []);
    const rows = Array.isArray(parsed) ? parsed.slice(0, CUSTOMIZE_PRESET_SLOTS) : [];
    // Migrate older heavy slots that stored full image blobs.
    state.customizePresets = rows.map((entry) => {
      if (!entry || typeof entry !== "object") return entry;
      const face = entry.customFace && typeof entry.customFace === "object" ? entry.customFace : {};
      return {
        ...entry,
        customFace: {
          enabled: Boolean(face.enabled),
          offsetX: Number(face.offsetX || 0),
          offsetXNorthSouth: Number(face.offsetXNorthSouth ?? face.offsetX ?? 0),
          offsetXEastWest: Number(face.offsetXEastWest ?? face.offsetX ?? 0),
          offsetY: Number(face.offsetY || -12),
          width: Math.max(8, Number(face.width || 22)),
          height: Math.max(8, Number(face.height || 20)),
          cropX: Math.max(0, Math.min(95, Number(face.cropX || 0))),
          cropY: Math.max(0, Math.min(95, Number(face.cropY || 0))),
          cropW: Math.max(5, Math.min(100, Number(face.cropW || 100))),
          cropH: Math.max(5, Math.min(100, Number(face.cropH || 100))),
          flipSideForEast: face.flipSideForEast !== false,
          invertSideDirections: Boolean(face.invertSideDirections),
          northFaceMode: NORTH_FACE_MODES.includes(String(face.northFaceMode || ""))
            ? String(face.northFaceMode)
            : "back",
        },
      };
    });
  }

  function saveCustomizePresetsToStorage() {
    if (!window.localStorage?.setItem) return;
    try {
      window.localStorage.setItem(
        CUSTOMIZE_PRESET_STORAGE_KEY,
        JSON.stringify((state.customizePresets || []).slice(0, CUSTOMIZE_PRESET_SLOTS)),
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  function buildCustomizePresetPayload(name = "") {
    return {
      name: String(name || "").trim() || "",
      appearanceLayers: getAppearanceSelectionFromState(),
      // Keep slots lightweight; image blobs are saved once in global customFace storage.
      customFace: {
        enabled: Boolean(state.customFace.enabled),
        offsetX: Number(state.customFace.offsetX || 0),
        offsetXNorthSouth: Number(state.customFace.offsetXNorthSouth ?? state.customFace.offsetX ?? 0),
        offsetXEastWest: Number(state.customFace.offsetXEastWest ?? state.customFace.offsetX ?? 0),
        offsetY: Number(state.customFace.offsetY || -12),
        width: Math.max(8, Number(state.customFace.width || 22)),
        height: Math.max(8, Number(state.customFace.height || 20)),
        cropX: Math.max(0, Math.min(95, Number(state.customFace.cropX || 0))),
        cropY: Math.max(0, Math.min(95, Number(state.customFace.cropY || 0))),
        cropW: Math.max(5, Math.min(100, Number(state.customFace.cropW || 100))),
        cropH: Math.max(5, Math.min(100, Number(state.customFace.cropH || 100))),
        flipSideForEast: state.customFace.flipSideForEast !== false,
        invertSideDirections: Boolean(state.customFace.invertSideDirections),
        northFaceMode: NORTH_FACE_MODES.includes(String(state.customFace.northFaceMode || ""))
          ? String(state.customFace.northFaceMode)
          : "back",
      },
      savedAt: Date.now(),
    };
  }

  function saveCurrentToCustomizeSlot(slotIndex) {
    const idx = Math.max(0, Math.min(CUSTOMIZE_PRESET_SLOTS - 1, Math.floor(Number(slotIndex) || 0)));
    while (state.customizePresets.length <= idx) state.customizePresets.push(null);
    const existingName = String(state.customizePresets[idx]?.name || "").trim();
    const payload = buildCustomizePresetPayload(existingName || `Custom ${idx + 1}`);
    state.customizePresets[idx] = payload;
    const ok = saveCustomizePresetsToStorage();
    state.customizeStatus = ok
      ? `Saved to custom slot ${idx + 1}.`
      : `Save failed for slot ${idx + 1} (storage full).`;
    state.customFace.status = state.customizeStatus;
    if (ok) saveCustomFaceToStorage();
  }

  function loadCustomizeSlot(slotIndex) {
    const idx = Math.max(0, Math.min(CUSTOMIZE_PRESET_SLOTS - 1, Math.floor(Number(slotIndex) || 0)));
    const entry = state.customizePresets[idx];
    if (!entry || typeof entry !== "object") return false;
    applyAppearanceSelectionToState(entry.appearanceLayers || null);
    const current = getCustomFaceProfileFromState();
    applyCustomFaceProfileToState({
      ...current,
      ...(entry.customFace || {}),
      // preserve currently uploaded images across slot loads
      front: current.front,
      side: current.side,
      back: current.back,
      frontName: current.frontName,
      sideName: current.sideName,
      backName: current.backName,
    });
    state.customizeStatus = `Loaded custom slot ${idx + 1}.`;
    state.customFace.status = state.customizeStatus;
    saveCustomFaceToStorage();
    return true;
  }

  function clearCustomizeSlot(slotIndex) {
    const idx = Math.max(0, Math.min(CUSTOMIZE_PRESET_SLOTS - 1, Math.floor(Number(slotIndex) || 0)));
    if (!state.customizePresets[idx]) return;
    state.customizePresets[idx] = null;
    const ok = saveCustomizePresetsToStorage();
    state.customizeStatus = ok
      ? `Cleared custom slot ${idx + 1}.`
      : `Clear failed for slot ${idx + 1} (storage full).`;
    state.customFace.status = state.customizeStatus;
  }

  function renderCustomizePresetRows() {
    const rows = [];
    for (let i = 0; i < CUSTOMIZE_PRESET_SLOTS; i += 1) {
      const entry = state.customizePresets[i];
      const label = String(entry?.name || `Empty Slot ${i + 1}`);
      rows.push(`
        <div style="display:grid;grid-template-columns:1fr 58px 58px 28px;gap:6px;align-items:center;margin-bottom:6px;">
          <div style="padding:4px 6px;border:1px solid #2a334a;border-radius:6px;background:#0d1220;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:12px;" title="${label}">${label}</div>
          ${buttonHtml(`custom-slot-save:${i}`, "Save", `Save customize preset ${i + 1}`)}
          ${buttonHtml(`custom-slot-load:${i}`, "Load", `Load customize preset ${i + 1}`)}
          ${buttonHtml(`custom-slot-del:${i}`, "×", `Clear customize preset ${i + 1}`)}
        </div>
      `);
    }
    return `
      <div style="font-weight:700;margin:10px 0 6px;">Custom Presets (Local)</div>
      ${rows.join("")}
      <div style="font-size:11px;line-height:1.35;color:#9fb2d9;opacity:.95;min-height:16px;margin-bottom:6px;">
        ${String(state.customizeStatus || "")}
      </div>
    `;
  }

  function getCustomFaceProfileFromState() {
    return {
      enabled: Boolean(state.customFace.enabled),
      front: state.customFace.front || null,
      side: state.customFace.side || null,
      back: state.customFace.back || null,
      frontName: state.customFace.frontName || "",
      sideName: state.customFace.sideName || "",
      backName: state.customFace.backName || "",
      offsetX: Number(state.customFace.offsetX || 0),
      offsetXNorthSouth: Number(state.customFace.offsetXNorthSouth ?? state.customFace.offsetX ?? 0),
      offsetXEastWest: Number(state.customFace.offsetXEastWest ?? state.customFace.offsetX ?? 0),
      offsetY: Number(state.customFace.offsetY || -12),
      width: Math.max(8, Number(state.customFace.width || 22)),
      height: Math.max(8, Number(state.customFace.height || 20)),
      cropX: Math.max(0, Math.min(95, Number(state.customFace.cropX || 0))),
      cropY: Math.max(0, Math.min(95, Number(state.customFace.cropY || 0))),
      cropW: Math.max(5, Math.min(100, Number(state.customFace.cropW || 100))),
      cropH: Math.max(5, Math.min(100, Number(state.customFace.cropH || 100))),
      flipSideForEast: state.customFace.flipSideForEast !== false,
      invertSideDirections: Boolean(state.customFace.invertSideDirections),
      northFaceMode: NORTH_FACE_MODES.includes(String(state.customFace.northFaceMode || ""))
        ? String(state.customFace.northFaceMode)
        : "back",
      appearanceLayers: getAppearanceSelectionFromState(),
    };
  }

  function applyCustomFaceProfileToState(profile) {
    if (!profile || typeof profile !== "object") return false;
    state.customFace.enabled = Boolean(profile.enabled);
    state.customFace.front = profile.front || null;
    state.customFace.side = profile.side || null;
    state.customFace.back = profile.back || null;
    state.customFace.frontName = profile.frontName || "";
    state.customFace.sideName = profile.sideName || "";
    state.customFace.backName = profile.backName || "";
    state.customFace.offsetX = Number(profile.offsetX || 0);
    state.customFace.offsetXNorthSouth = Number(profile.offsetXNorthSouth ?? profile.offsetX ?? 0);
    state.customFace.offsetXEastWest = Number(profile.offsetXEastWest ?? profile.offsetX ?? 0);
    state.customFace.offsetY = Number(profile.offsetY || -12);
    state.customFace.width = Math.max(8, Number(profile.width || 22));
    state.customFace.height = Math.max(8, Number(profile.height || 20));
    state.customFace.cropX = Math.max(0, Math.min(95, Number(profile.cropX || 0)));
    state.customFace.cropY = Math.max(0, Math.min(95, Number(profile.cropY || 0)));
    state.customFace.cropW = Math.max(5, Math.min(100, Number(profile.cropW || 100)));
    state.customFace.cropH = Math.max(5, Math.min(100, Number(profile.cropH || 100)));
    state.customFace.flipSideForEast = profile.flipSideForEast !== false;
    state.customFace.invertSideDirections = Boolean(profile.invertSideDirections);
    state.customFace.northFaceMode = NORTH_FACE_MODES.includes(String(profile.northFaceMode || ""))
      ? String(profile.northFaceMode)
      : "back";
    applyAppearanceSelectionToState(profile.appearanceLayers || null);
    return true;
  }

  function applyCustomFaceProfileToGlobalConfig(profile) {
    if (typeof window === "undefined") return;
    if (!window.BATTLECHURCH_PASTOR_PAPERDOLL || typeof window.BATTLECHURCH_PASTOR_PAPERDOLL !== "object") {
      window.BATTLECHURCH_PASTOR_PAPERDOLL = {};
    }
    window.BATTLECHURCH_PASTOR_PAPERDOLL.customFace = {
      ...(window.BATTLECHURCH_PASTOR_PAPERDOLL.customFace || {}),
      ...(profile || {}),
    };
    window.BATTLECHURCH_PASTOR_PAPERDOLL.appearanceLayers = {
      ...(window.BATTLECHURCH_PASTOR_PAPERDOLL.appearanceLayers || {}),
      ...(profile?.appearanceLayers || {}),
    };
  }

  function saveCustomFaceToStorage() {
    if (!window.localStorage?.setItem) return;
    try {
      const profile = getCustomFaceProfileFromState();
      window.localStorage.setItem(CUSTOM_FACE_STORAGE_KEY, JSON.stringify(profile));
      applyCustomFaceProfileToGlobalConfig(profile);
    } catch (_) {}
  }

  function loadCustomFaceFromStorage() {
    return false;
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
    presetsDirty = true;
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
    presetsDirty = true;
    return true;
  }

  function deletePresetSlot(slotIndex) {
    const idx = Math.max(0, Math.floor(Number(slotIndex) || 0));
    if (!state.presets[idx]) return;
    state.presets[idx] = null;
    savePresetsToStorage();
    presetsDirty = true;
  }

  function renderPresetControls() {
    const root = overlay?.querySelector?.("#paperdollPresetControls");
    if (!root) return;
    if (state.uiMode === "customize") {
      root.innerHTML = "";
      root.style.display = "none";
      return;
    }
    root.style.display = "flex";
    if (!presetsDirty) return;
    presetsDirty = false;
    root.innerHTML = '<div style="font-size:12px;opacity:.9;margin-bottom:4px;">Pastor Presets (local)</div>';
    const btnStyle = "padding:3px 6px;background:#1b2740;color:#e8edf7;border:1px solid #3a4b72;border-radius:6px;cursor:pointer;font-size:11px;";
    for (let i = 0; i < MAX_PRESET_SLOTS; i += 1) {
      const preset = state.presets[i];
      const selected = state.selectedPresetIndex === i;
      const label = preset?.name || `Empty Slot ${i + 1}`;
      const row = document.createElement("div");
      row.style.cssText = "display:grid;grid-template-columns:1fr 44px 44px 22px;gap:3px;align-items:center;";
      const nameDiv = document.createElement("div");
      nameDiv.style.cssText = `padding:3px 5px;border:1px solid ${selected ? "#5f78b5" : "#2a334a"};border-radius:6px;background:${selected ? "#16213a" : "#0d1220"};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:11px;`;
      nameDiv.title = label;
      nameDiv.textContent = label;
      const makeBtn = (text, title, handler) => {
        const b = document.createElement("button");
        b.type = "button";
        b.style.cssText = btnStyle;
        b.textContent = text;
        b.title = title;
        b.addEventListener("click", (e) => { e.stopPropagation(); handler(); });
        return b;
      };
      const idx = i;
      row.appendChild(nameDiv);
      row.appendChild(makeBtn("Save", `Save to slot ${idx + 1}`, () => {
        saveCurrentToPresetSlot(idx);
        controlsDirty = true;
        refreshPanels();
        render();
      }));
      row.appendChild(makeBtn("Load", `Load slot ${idx + 1}`, () => {
        console.log("[PaperdollSandbox] Load clicked slot", idx, state.presets[idx]);
        const ok = loadPresetSlot(idx);
        console.log("[PaperdollSandbox] loadPresetSlot result:", ok);
        controlsDirty = true;
        refreshPanels();
        render();
      }));
      row.appendChild(makeBtn("×", `Delete slot ${idx + 1}`, () => {
        deletePresetSlot(idx);
        controlsDirty = true;
        refreshPanels();
        render();
      }));
      root.appendChild(row);
    }
  }

  function onPresetControlsClick(e) {
    e.preventDefault();
    e.stopPropagation();
    const btn = e.target?.closest?.("button[data-action]");
    if (!btn) return;
    const action = String(btn.getAttribute("data-action") || "");
    console.log("[PaperdollSandbox] preset click action:", action);
    if (!action) return;
    if (action.startsWith("preset-save:")) {
      const idx = Number(action.slice("preset-save:".length)) || 0;
      saveCurrentToPresetSlot(idx);
    } else if (action.startsWith("preset-load:")) {
      const idx = Number(action.slice("preset-load:".length));
      console.log("[PaperdollSandbox] loading slot", idx, "entry:", state.presets[idx]);
      const ok = loadPresetSlot(idx);
      console.log("[PaperdollSandbox] loadPresetSlot result:", ok, "layerSelection after:", JSON.stringify(state.layerSelection));
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
    const showAppearanceOnly = state.uiMode === "customize";
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

    const visibleLayers = showAppearanceOnly ? APPEARANCE_LAYERS : LAYERS;
    const layerRowsHtml = visibleLayers.map((layerKey) => {
      const layerName = layerLabel(layerKey);
      const unsupported = !pageSupportsLayer(getPageKey(), layerKey);
      const value = unsupported ? "(not on this page)" : currentLayerDisplayValue(layerKey);
      const vis = state.layerVisible[layerKey] ? "Visible" : "Hidden";
      const showVisibilityToggle = !showAppearanceOnly;
      return `
        <div style="display:grid;grid-template-columns:${showVisibilityToggle ? "88px 28px 1fr 28px 64px" : "88px 28px 1fr 28px"};gap:6px;align-items:center;margin-bottom:6px;">
          <div style="opacity:.9;">${layerName}</div>
          ${buttonHtml(`layer-prev:${layerKey}`, "◀", `Previous ${layerName.toLowerCase()}`)}
          <div style="padding:3px 6px;background:#121a2f;border:1px solid #253252;border-radius:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${value}</div>
          ${buttonHtml(`layer-next:${layerKey}`, "▶", `Next ${layerName.toLowerCase()}`)}
          ${showVisibilityToggle ? buttonHtml(`layer-toggle:${layerKey}`, vis, `Toggle ${layerName.toLowerCase()} visibility`) : ""}
        </div>
      `;
    }).join("");

    if (showAppearanceOnly) {
      controlsRoot.innerHTML = `
      <div style="font-weight:700;margin-bottom:6px;">Customize Character</div>
      <div style="font-size:12px;opacity:.9;margin-bottom:8px;">Pick your look. Weapon/attack settings are hidden in this mode.</div>
      <div style="display:flex;gap:6px;margin-bottom:10px;">
        ${buttonHtml("custom-close", "Back to Title", "Close customize screen")}
        ${buttonHtml("custom-play", "Play", "Close and start game")}
      </div>
      ${renderCustomizePresetRows()}
      <div style="font-weight:700;margin-bottom:6px;">Appearance</div>
      ${layerRowsHtml}

    `;
      bindFaceControlListeners();
      controlsDirty = false;
      return;
    }

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
    bindFaceControlListeners();
    controlsDirty = false;
  }

  function bindFaceControlListeners() {
    const enabled = controlsRoot?.querySelector?.("#paperdollFaceEnabled");
    const front = controlsRoot?.querySelector?.("#paperdollFaceFront");
    const side = controlsRoot?.querySelector?.("#paperdollFaceSide");
    const back = controlsRoot?.querySelector?.("#paperdollFaceBack");
    const flipEast = controlsRoot?.querySelector?.("#paperdollFaceFlipEast");
    const invertSides = controlsRoot?.querySelector?.("#paperdollFaceInvertSides");
    if (enabled) {
      enabled.onchange = onControlsInput;
    }
    if (front) {
      front.onchange = onControlsInput;
    }
    if (side) {
      side.onchange = onControlsInput;
    }
    if (back) {
      back.onchange = onControlsInput;
    }
    if (flipEast) {
      flipEast.onchange = onControlsInput;
    }
    if (invertSides) {
      invertSides.onchange = onControlsInput;
    }
  }

  async function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  async function compressFaceDataUrl(dataUrl, maxEdge = 256, quality = 0.82) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const sw = Math.max(1, Number(img.naturalWidth) || 1);
          const sh = Math.max(1, Number(img.naturalHeight) || 1);
          const scale = Math.min(1, maxEdge / Math.max(sw, sh));
          const tw = Math.max(1, Math.round(sw * scale));
          const th = Math.max(1, Math.round(sh * scale));
          const c = document.createElement("canvas");
          c.width = tw;
          c.height = th;
          const cctx = c.getContext("2d");
          if (!cctx) return resolve(dataUrl);
          cctx.imageSmoothingEnabled = true;
          cctx.drawImage(img, 0, 0, tw, th);
          let out = "";
          try {
            out = c.toDataURL("image/webp", quality);
          } catch (_) {}
          if (!out || !out.startsWith("data:image/")) {
            try {
              out = c.toDataURL("image/jpeg", quality);
            } catch (_) {}
          }
          resolve(out && out.startsWith("data:image/") ? out : dataUrl);
        } catch (_) {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  async function validateImageDataUrl(dataUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ ok: true, width: img.naturalWidth || 0, height: img.naturalHeight || 0 });
      img.onerror = () => resolve({ ok: false, width: 0, height: 0 });
      img.src = dataUrl;
    });
  }

  async function onControlsInput(e) {
    const target = e?.target;
    if (!target) return;
    const id = String(target.id || "");
    if (id === "paperdollFaceEnabled") {
      state.customFace.enabled = Boolean(target.checked);
      state.customFace.status = state.customFace.enabled
        ? "Face overlay enabled."
        : "Face overlay disabled.";
      saveCustomFaceToStorage();
      controlsDirty = true;
      refreshPanels();
      render();
      return;
    }
    if (id === "paperdollFaceFlipEast") {
      state.customFace.flipSideForEast = Boolean(target.checked);
      state.customFace.status = `Flip on East: ${state.customFace.flipSideForEast ? "ON" : "OFF"}`;
      saveCustomFaceToStorage();
      controlsDirty = true;
      refreshPanels();
      render();
      return;
    }
    if (id === "paperdollFaceInvertSides") {
      state.customFace.invertSideDirections = Boolean(target.checked);
      state.customFace.status = `Invert side directions: ${state.customFace.invertSideDirections ? "ON" : "OFF"}`;
      saveCustomFaceToStorage();
      controlsDirty = true;
      refreshPanels();
      render();
      return;
    }
    if (id === "paperdollFaceFront" || id === "paperdollFaceSide" || id === "paperdollFaceBack") {
      const file = target.files && target.files[0];
      if (!file) return;
      try {
        const dataUrl = await fileToDataUrl(file);
        const compactDataUrl = await compressFaceDataUrl(dataUrl, 256, 0.82);
        const valid = await validateImageDataUrl(compactDataUrl);
        if (!valid.ok) {
          state.customFace.status = `Failed to decode ${file.name}. Try PNG or JPG.`;
          controlsDirty = true;
          refreshPanels();
          render();
          return;
        }
        if (id === "paperdollFaceFront") state.customFace.front = compactDataUrl;
        else if (id === "paperdollFaceSide") state.customFace.side = compactDataUrl;
        else state.customFace.back = compactDataUrl;
        if (id === "paperdollFaceFront") state.customFace.frontName = file.name || "";
        else if (id === "paperdollFaceSide") state.customFace.sideName = file.name || "";
        else state.customFace.backName = file.name || "";
        state.customFace.enabled = true;
        const slot = id === "paperdollFaceFront" ? "front" : id === "paperdollFaceSide" ? "side" : "back";
        state.customFace.status = `Loaded ${slot}: ${file.name} (${valid.width}x${valid.height})`;
        saveCustomFaceToStorage();
        controlsDirty = true;
        refreshPanels();
        render();
      } catch (_) {
        state.customFace.status = "Face upload failed while reading file.";
        controlsDirty = true;
        refreshPanels();
        render();
      }
    }
  }

  function cycleLayerSelection(layerKey, delta) {
    const list = layerCatalog[layerKey] || [];
    if (!list.length) return;
    let next = clampWrap((state.layerSelection[layerKey] || 0) + delta, list.length);
    if (state.uiMode === "customize" && layerKey === "1out" && list.length > 1) {
      if (String(list[next] || "").toLowerCase() === "none") {
        next = clampWrap(next + (delta >= 0 ? 1 : -1), list.length);
      }
      if (String(list[next] || "").toLowerCase() === "none") {
        const firstReal = list.findIndex((token) => String(token || "").toLowerCase() !== "none");
        if (firstReal >= 0) next = firstReal;
      }
    }
    state.layerSelection[layerKey] = next;
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
    } else if (action === "custom-close") {
      close();
      return;
    } else if (action === "custom-play") {
      close();
      if (typeof window?.startGameFromTitle === "function") {
        window.startGameFromTitle();
      }
      return;
    } else if (action.startsWith("custom-slot-save:")) {
      const idx = Number(action.slice("custom-slot-save:".length)) || 0;
      saveCurrentToCustomizeSlot(idx);
    } else if (action.startsWith("custom-slot-load:")) {
      const idx = Number(action.slice("custom-slot-load:".length)) || 0;
      loadCustomizeSlot(idx);
    } else if (action.startsWith("custom-slot-del:")) {
      const idx = Number(action.slice("custom-slot-del:".length)) || 0;
      clearCustomizeSlot(idx);
    } else if (action.startsWith("layer-prev:")) {
      const layerKey = action.slice("layer-prev:".length);
      if (state.uiMode === "customize" && !APPEARANCE_LAYERS.includes(layerKey)) return;
      cycleLayerSelection(layerKey, -1);
      if ((layerKey === "6tla" || layerKey === "7tlb") && getPageKey() === "p1") {
        state.pageIndex = 1; // pONE1
        ensureAnimationMatchesPage();
      }
      saveCustomFaceToStorage();
    } else if (action.startsWith("layer-next:")) {
      const layerKey = action.slice("layer-next:".length);
      if (state.uiMode === "customize" && !APPEARANCE_LAYERS.includes(layerKey)) return;
      cycleLayerSelection(layerKey, 1);
      if ((layerKey === "6tla" || layerKey === "7tlb") && getPageKey() === "p1") {
        state.pageIndex = 1; // pONE1
        ensureAnimationMatchesPage();
      }
      saveCustomFaceToStorage();
    } else if (action.startsWith("layer-toggle:")) {
      const layerKey = action.slice("layer-toggle:".length);
      if (state.uiMode === "customize") return;
      if (layerKey in state.layerVisible) state.layerVisible[layerKey] = !state.layerVisible[layerKey];
    } else if (action === "face-xns-down") {
      state.customFace.offsetXNorthSouth = Math.max(-24, Number(state.customFace.offsetXNorthSouth ?? state.customFace.offsetX ?? 0) - 1);
      state.customFace.offsetX = Number(state.customFace.offsetXNorthSouth || 0);
    } else if (action === "face-xns-up") {
      state.customFace.offsetXNorthSouth = Math.min(24, Number(state.customFace.offsetXNorthSouth ?? state.customFace.offsetX ?? 0) + 1);
      state.customFace.offsetX = Number(state.customFace.offsetXNorthSouth || 0);
    } else if (action === "face-xew-down") {
      state.customFace.offsetXEastWest = Math.max(-24, Number(state.customFace.offsetXEastWest ?? state.customFace.offsetX ?? 0) - 1);
    } else if (action === "face-xew-up") {
      state.customFace.offsetXEastWest = Math.min(24, Number(state.customFace.offsetXEastWest ?? state.customFace.offsetX ?? 0) + 1);
    } else if (action === "face-north-mode-cycle") {
      const current = String(state.customFace.northFaceMode || "back");
      const idx = NORTH_FACE_MODES.indexOf(current);
      const next = NORTH_FACE_MODES[(idx + 1 + NORTH_FACE_MODES.length) % NORTH_FACE_MODES.length] || "back";
      state.customFace.northFaceMode = next;
      state.customFace.status = `North face source: ${NORTH_FACE_MODE_LABELS[next] || "Back"}`;
    } else if (action === "face-y-down") {
      state.customFace.offsetY = Math.max(-32, Number(state.customFace.offsetY || 0) - 1);
    } else if (action === "face-y-up") {
      state.customFace.offsetY = Math.min(24, Number(state.customFace.offsetY || 0) + 1);
    } else if (action === "face-w-down") {
      state.customFace.width = Math.max(8, Number(state.customFace.width || 0) - 1);
    } else if (action === "face-w-up") {
      state.customFace.width = Math.min(40, Number(state.customFace.width || 0) + 1);
    } else if (action === "face-h-down") {
      state.customFace.height = Math.max(8, Number(state.customFace.height || 0) - 1);
    } else if (action === "face-h-up") {
      state.customFace.height = Math.min(40, Number(state.customFace.height || 0) + 1);
    } else if (action === "face-cx-down") {
      state.customFace.cropX = Math.max(0, Number(state.customFace.cropX || 0) - 1);
    } else if (action === "face-cx-up") {
      state.customFace.cropX = Math.min(95, Number(state.customFace.cropX || 0) + 1);
    } else if (action === "face-cy-down") {
      state.customFace.cropY = Math.max(0, Number(state.customFace.cropY || 0) - 1);
    } else if (action === "face-cy-up") {
      state.customFace.cropY = Math.min(95, Number(state.customFace.cropY || 0) + 1);
    } else if (action === "face-cw-down") {
      state.customFace.cropW = Math.max(5, Number(state.customFace.cropW || 100) - 1);
    } else if (action === "face-cw-up") {
      state.customFace.cropW = Math.min(100, Number(state.customFace.cropW || 100) + 1);
    } else if (action === "face-ch-down") {
      state.customFace.cropH = Math.max(5, Number(state.customFace.cropH || 100) - 1);
    } else if (action === "face-ch-up") {
      state.customFace.cropH = Math.min(100, Number(state.customFace.cropH || 100) + 1);
    } else if (action === "face-edit-front") {
      openFaceCropEditor("front");
      return;
    } else if (action === "face-edit-side") {
      openFaceCropEditor("side");
      return;
    } else if (action === "face-edit-back") {
      openFaceCropEditor("back");
      return;
    } else if (action === "face-clear") {
      state.customFace.front = null;
      state.customFace.side = null;
      state.customFace.back = null;
      state.customFace.frontName = "";
      state.customFace.sideName = "";
      state.customFace.backName = "";
      state.customFace.enabled = false;
      state.customFace.status = "No face images loaded.";
    } else if (action === "face-load-default") {
      if (FILE_DEFAULT_FACE_PROFILE && typeof FILE_DEFAULT_FACE_PROFILE === "object") {
        applyCustomFaceProfileToState(FILE_DEFAULT_FACE_PROFILE);
      }
      if (FILE_DEFAULT_APPEARANCE_LAYERS && typeof FILE_DEFAULT_APPEARANCE_LAYERS === "object") {
        applyAppearanceSelectionToState(FILE_DEFAULT_APPEARANCE_LAYERS);
      }
      state.customFace.status = "Loaded default pastor from config file.";
    }
    state.customFace.cropX = Math.max(0, Math.min(95, Number(state.customFace.cropX || 0)));
    state.customFace.cropY = Math.max(0, Math.min(95, Number(state.customFace.cropY || 0)));
    state.customFace.cropW = Math.max(5, Math.min(100, Number(state.customFace.cropW || 100)));
    state.customFace.cropH = Math.max(5, Math.min(100, Number(state.customFace.cropH || 100)));
    if (state.customFace.cropX + state.customFace.cropW > 100) {
      state.customFace.cropW = Math.max(5, 100 - state.customFace.cropX);
    }
    if (state.customFace.cropY + state.customFace.cropH > 100) {
      state.customFace.cropH = Math.max(5, 100 - state.customFace.cropY);
    }
    if (action.startsWith("face-")) {
      saveCustomFaceToStorage();
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

  function faceImageForFacing() {
    const facing = FACING_KEYS[state.facingIndex] || "south";
    const northMode = String(state.customFace.northFaceMode || "back");
    const effectiveFacing =
      facing === "north"
        ? (northMode === "side_east" ? "east" : northMode === "side_west" ? "west" : "north")
        : facing;
    const source =
      effectiveFacing === "south"
        ? state.customFace.front
        : effectiveFacing === "north"
          ? state.customFace.back
          : state.customFace.side;
    if (!source) return null;
    return imageForPath(source);
  }

  function shouldMirrorFaceForFacing() {
    const facing = FACING_KEYS[state.facingIndex] || "south";
    const northMode = String(state.customFace.northFaceMode || "back");
    const effectiveFacing =
      facing === "north"
        ? (northMode === "side_east" ? "east" : northMode === "side_west" ? "west" : "north")
        : facing;
    if (effectiveFacing !== "east" && effectiveFacing !== "west") return false;
    const invert = Boolean(state.customFace.invertSideDirections);
    const flipEast = state.customFace.flipSideForEast !== false;
    const sideFacingUsesOriginal = invert ? "east" : "west";
    if (effectiveFacing === sideFacingUsesOriginal) return false;
    return flipEast;
  }

  function drawCustomFacePreview(cx, cy, scale = 4) {
    if (!state.customFace.enabled) return;
    const img = faceImageForFacing();
    if (!img || !img.complete || !img.naturalWidth) return;
    const FACE_SCALE = 1.44;
    const w = Math.max(8, Number(state.customFace.width || 22)) * FACE_SCALE;
    const h = Math.max(8, Number(state.customFace.height || 20)) * FACE_SCALE;
    const facing = FACING_KEYS[state.facingIndex] || "south";
    const northMode = String(state.customFace.northFaceMode || "back");
    const effectiveFacing =
      facing === "north"
        ? (northMode === "side_east" ? "east" : northMode === "side_west" ? "west" : "north")
        : facing;
    const xNs = Number(state.customFace.offsetXNorthSouth ?? state.customFace.offsetX ?? 0);
    const xEwBase = Number(state.customFace.offsetXEastWest ?? state.customFace.offsetX ?? 0);
    const ox =
      effectiveFacing === "east" ? xEwBase
      : effectiveFacing === "west" ? -xEwBase
      : xNs;
    const oy = Number(state.customFace.offsetY || -12);
    const mirror = shouldMirrorFaceForFacing();
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const dx = Math.floor(cx + ox * scale - (w * scale) / 2);
    const dy = Math.floor(cy + oy * scale - (h * scale) / 2);
    const dw = Math.floor(w * scale);
    const dh = Math.floor(h * scale);
    const cropX01 = Math.max(0, Math.min(1, Number(state.customFace.cropX || 0) / 100));
    const cropY01 = Math.max(0, Math.min(1, Number(state.customFace.cropY || 0) / 100));
    const cropW01 = Math.max(0.05, Math.min(1, Number(state.customFace.cropW || 100) / 100));
    const cropH01 = Math.max(0.05, Math.min(1, Number(state.customFace.cropH || 100) / 100));
    const sx = Math.floor(cropX01 * img.naturalWidth);
    const sy = Math.floor(cropY01 * img.naturalHeight);
    const sw = Math.max(1, Math.floor(cropW01 * img.naturalWidth));
    const sh = Math.max(1, Math.floor(cropH01 * img.naturalHeight));
    const safeSw = Math.min(sw, Math.max(1, img.naturalWidth - sx));
    const safeSh = Math.min(sh, Math.max(1, img.naturalHeight - sy));
    const fit = Math.min(dw / safeSw, dh / safeSh);
    const fitW = Math.max(1, Math.floor(safeSw * fit));
    const fitH = Math.max(1, Math.floor(safeSh * fit));
    const fitX = dx + Math.floor((dw - fitW) / 2);
    const fitY = dy + Math.floor((dh - fitH) / 2);
    if (mirror) {
      ctx.translate(fitX + fitW, fitY);
      ctx.scale(-1, 1);
      ctx.drawImage(img, sx, sy, safeSw, safeSh, 0, 0, fitW, fitH);
    } else {
      ctx.drawImage(img, sx, sy, safeSw, safeSh, fitX, fitY, fitW, fitH);
    }
    ctx.restore();
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
    const drawLayerForFacing = (layerKey, facingIndex, drawCx, drawCy, drawScale = 4) => {
      if (!state.layerVisible[layerKey]) return;
      if (!pageSupportsLayer(page, layerKey)) return;
      const path = getLayerPath(layerKey);
      const img = imageForPath(path);
      const cols = Math.max(1, Math.floor((img?.naturalWidth || 0) / FRAME_SIZE));
      if (!img || !img.complete || !img.naturalWidth || cols < 1) return;
      const sx = (frameIdx % cols) * FRAME_SIZE;
      const sy = Math.floor(frameIdx / cols) * FRAME_SIZE;
      const dw = FRAME_SIZE * drawScale;
      const dh = FRAME_SIZE * drawScale;
      ctx.drawImage(img, sx, sy, FRAME_SIZE, FRAME_SIZE, drawCx - dw / 2, drawCy - dh / 2, dw, dh);
    };

    const drawSingleFacing = (facingIndex, drawCx, drawCy, drawScale = 4, label = "") => {
      const prevFacing = state.facingIndex;
      state.facingIndex = facingIndex;
      const facingFrames = computeAnimFrames();
      const localFrameIdx = facingFrames[clampWrap(state.frameCursor, facingFrames.length)] || 0;
      const localDrawOrder = layerDrawOrderForFrame(localFrameIdx);
      const shieldFront = isShieldFrontFrame(page, localFrameIdx);
      const drawLayer = (layerKey) => {
        if (!state.layerVisible[layerKey]) return;
        if (!pageSupportsLayer(page, layerKey)) return;
        const path = getLayerPath(layerKey);
        const img = imageForPath(path);
        drawFrameFromSheet(img, localFrameIdx, drawCx, drawCy, drawScale);
      };
      if (!shieldFront) drawLayer("7tlb");
      localDrawOrder.forEach((layerKey) => {
        if (layerKey === "7tlb") return;
        drawLayer(layerKey);
      });
      if (shieldFront) drawLayer("7tlb");
      drawCustomFacePreview(drawCx, drawCy, drawScale);
      if (label) {
        ctx.fillStyle = "#9fb2d9";
        ctx.font = "12px ui-monospace, Menlo, monospace";
        ctx.textAlign = "center";
        ctx.fillText(label, drawCx, drawCy + FRAME_SIZE * drawScale * 0.58);
      }
      state.facingIndex = prevFacing;
    };

    if (state.uiMode === "customize") {
      const positions = [
        { idx: 0, label: "South", x: Math.floor(w * 0.30), y: Math.floor(h * 0.36) },
        { idx: 1, label: "North", x: Math.floor(w * 0.70), y: Math.floor(h * 0.36) },
        { idx: 2, label: "East", x: Math.floor(w * 0.30), y: Math.floor(h * 0.72) },
        { idx: 3, label: "West", x: Math.floor(w * 0.70), y: Math.floor(h * 0.72) },
      ];
      positions.forEach((p) => drawSingleFacing(p.idx, p.x, p.y, 3, p.label));
      ctx.fillStyle = "#9fb2d9";
      ctx.font = "14px ui-monospace, Menlo, monospace";
      ctx.textAlign = "left";
      ctx.fillText("Customize Preview (all directions)", 22, 28);
      return;
    }

    const shieldFront = isShieldFrontFrame(page, frameIdx);
    const drawLayer = (layerKey) => drawLayerForFacing(layerKey, state.facingIndex, cx, cy, 4);
    if (!shieldFront) drawLayer("7tlb");
    drawOrder.forEach((layerKey) => {
      if (layerKey === "7tlb") return;
      drawLayer(layerKey);
    });
    if (shieldFront) drawLayer("7tlb");
    drawCustomFacePreview(cx, cy, 4);

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
    const existingCfg =
      window.BATTLECHURCH_PASTOR_PAPERDOLL &&
      typeof window.BATTLECHURCH_PASTOR_PAPERDOLL === "object"
        ? window.BATTLECHURCH_PASTOR_PAPERDOLL
        : {};
    const cloneValue = (value, fallback) => {
      try {
        return JSON.parse(JSON.stringify(value));
      } catch (_) {
        return fallback;
      }
    };
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
    const knownTopLevelKeys = new Set([
      "source",
      "page",
      "facing",
      "animation",
      "playbackSpeed",
      "loop",
      "behavior",
      "layers",
      "presets",
      "animationPresetMap",
      "powerupPresetMap",
      "appearanceLayers",
    ]);
    const preservedTopLevel = {};
    for (const [key, value] of Object.entries(existingCfg || {})) {
      if (knownTopLevelKeys.has(key)) continue;
      preservedTopLevel[key] = cloneValue(value, value);
    }
    return {
      ...preservedTopLevel,
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
      animationPresetMap: cloneValue(existingCfg.animationPresetMap, {}) || {},
      // Edit this map to switch pastor preset by powerup key.
      // Example: { powerupX: "Holy Fire Form", speedAura: "Sprint Form" }
      powerupPresetMap: cloneValue(existingCfg.powerupPresetMap, {}) || {},
      // Per-player appearance override for base look layers.
      appearanceLayers: getAppearanceSelectionFromState(),
      customFace: {
        enabled: Boolean(state.customFace.enabled),
        front: state.customFace.front || null,
        side: state.customFace.side || null,
        back: state.customFace.back || null,
        frontName: state.customFace.frontName || "",
        sideName: state.customFace.sideName || "",
        backName: state.customFace.backName || "",
        offsetX: Number(state.customFace.offsetX || 0),
        offsetXNorthSouth: Number(state.customFace.offsetXNorthSouth ?? state.customFace.offsetX ?? 0),
        offsetXEastWest: Number(state.customFace.offsetXEastWest ?? state.customFace.offsetX ?? 0),
        offsetY: Number(state.customFace.offsetY || 0),
        width: Math.max(8, Number(state.customFace.width || 22)),
        height: Math.max(8, Number(state.customFace.height || 20)),
        cropX: Math.max(0, Math.min(95, Number(state.customFace.cropX || 0))),
        cropY: Math.max(0, Math.min(95, Number(state.customFace.cropY || 0))),
        cropW: Math.max(5, Math.min(100, Number(state.customFace.cropW || 100))),
        cropH: Math.max(5, Math.min(100, Number(state.customFace.cropH || 100))),
        flipSideForEast: state.customFace.flipSideForEast !== false,
        invertSideDirections: Boolean(state.customFace.invertSideDirections),
        northFaceMode: NORTH_FACE_MODES.includes(String(state.customFace.northFaceMode || ""))
          ? String(state.customFace.northFaceMode)
          : "back",
      },
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

  function exportPresetsToFile() {
    const data = { presets: deepClone(state.presets, []) };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pastor-presets.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function onImportPresetsFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      let parsed;
      try { parsed = JSON.parse(ev.target.result); } catch (_) {
        alert("Could not read preset file — make sure it's a valid .json file exported from this tool.");
        return;
      }
      const incoming = Array.isArray(parsed?.presets) ? parsed.presets : [];
      if (!incoming.length) { alert("No presets found in that file."); return; }

      // Merge: for each slot, keep existing preset if it's non-null; fill empty slots with incoming ones.
      // Incoming presets that have no matching empty slot are appended up to MAX_PRESET_SLOTS.
      const merged = deepClone(state.presets, []);
      const pending = incoming.filter((p) => p != null);
      // First pass: fill null/empty slots in order
      for (let i = 0; i < MAX_PRESET_SLOTS && pending.length; i++) {
        if (merged[i] == null) merged[i] = pending.shift();
      }
      // Second pass: append any remaining into new slots
      while (merged.length < MAX_PRESET_SLOTS && pending.length) {
        merged.push(pending.shift());
      }
      state.presets = merged.slice(0, MAX_PRESET_SLOTS);
      savePresetsToStorage();
      presetsDirty = true;
      renderPresetControls();
      const added = incoming.filter((p) => p != null).length - pending.length;
      alert(`Imported ${added} preset(s). Your existing presets were kept in their slots.`);
    };
    reader.readAsText(file);
  }

  async function saveConfigFileWithPrompt() {
    const text = buildGameConfigJs();
    const defaultFilename =
      state.uiMode === "customize"
        ? "custom-pastor-paperdoll.js"
        : "default-pastor-paperdoll.js";
    if (typeof window.showSaveFilePicker === "function") {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: defaultFilename,
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
    a.download = defaultFilename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function refreshPanels() {
    if (!overlay) return;
    const grid = overlay.querySelector("#paperdollSandboxGrid");
    const rightCol = overlay.querySelector("#paperdollRightCol");
    const presetNameInput = overlay.querySelector("#paperdollPresetName");
    const presetNameRow = presetNameInput?.closest("div");
    const saveConfigButton = overlay.querySelector("#paperdollSaveGameConfig");
    if (state.uiMode === "customize") {
      if (grid) grid.style.gridTemplateColumns = "460px minmax(560px, 1fr)";
      if (rightCol) rightCol.style.display = "none";
      if (presetNameRow) presetNameRow.style.display = "none";
      if (saveConfigButton) saveConfigButton.style.display = "none";
    } else {
      if (grid) grid.style.gridTemplateColumns = "440px 1fr 300px";
      if (rightCol) rightCol.style.display = "";
      if (presetNameRow) presetNameRow.style.display = "";
      if (saveConfigButton) saveConfigButton.style.display = "";
    }
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
    const activeEl = document?.activeElement || null;
    const target = e.target || activeEl;
    const tag = String(target?.tagName || "").toLowerCase();
    const activeTag = String(activeEl?.tagName || "").toLowerCase();
    const isTypingTarget =
      tag === "input" ||
      tag === "select" ||
      tag === "textarea" ||
      target?.isContentEditable === true ||
      activeTag === "input" ||
      activeTag === "select" ||
      activeTag === "textarea" ||
      activeEl?.isContentEditable === true;
    if (isTypingTarget) {
      // Allow normal typing/editing in preset name and any future text fields.
      // Keep Escape available to close the sandbox quickly.
      if (String(e.key || "") !== "Escape") {
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
        return;
      }
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

  function openWithMode(mode = "dev") {
    ensureOverlay();
    if (!overlay || state.open) return;
    state.uiMode = mode === "customize" ? "customize" : "dev";
    loadPresetsFromStorage();
    loadCustomizePresetsFromStorage();
    loadPresetSlot(0);
    const cfg =
      window.BATTLECHURCH_PASTOR_PAPERDOLL &&
      typeof window.BATTLECHURCH_PASTOR_PAPERDOLL === "object"
        ? window.BATTLECHURCH_PASTOR_PAPERDOLL
        : null;
    if (cfg?.customFace && typeof cfg.customFace === "object") {
      state.customFace.enabled = Boolean(cfg.customFace.enabled);
      state.customFace.front = cfg.customFace.front || null;
      state.customFace.side = cfg.customFace.side || null;
      state.customFace.back = cfg.customFace.back || null;
      state.customFace.frontName = cfg.customFace.frontName || "";
      state.customFace.sideName = cfg.customFace.sideName || "";
      state.customFace.backName = cfg.customFace.backName || "";
      state.customFace.offsetX = Number(cfg.customFace.offsetX || 0);
      state.customFace.offsetXNorthSouth = Number(cfg.customFace.offsetXNorthSouth ?? cfg.customFace.offsetX ?? 0);
      state.customFace.offsetXEastWest = Number(cfg.customFace.offsetXEastWest ?? cfg.customFace.offsetX ?? 0);
      state.customFace.offsetY = Number(cfg.customFace.offsetY || -12);
      state.customFace.width = Math.max(8, Number(cfg.customFace.width || 22));
      state.customFace.height = Math.max(8, Number(cfg.customFace.height || 20));
      state.customFace.cropX = Math.max(0, Math.min(95, Number(cfg.customFace.cropX || 0)));
      state.customFace.cropY = Math.max(0, Math.min(95, Number(cfg.customFace.cropY || 0)));
      state.customFace.cropW = Math.max(5, Math.min(100, Number(cfg.customFace.cropW || 100)));
      state.customFace.cropH = Math.max(5, Math.min(100, Number(cfg.customFace.cropH || 100)));
      state.customFace.flipSideForEast = cfg.customFace.flipSideForEast !== false;
      state.customFace.invertSideDirections = Boolean(cfg.customFace.invertSideDirections);
      state.customFace.northFaceMode = NORTH_FACE_MODES.includes(String(cfg.customFace.northFaceMode || ""))
        ? String(cfg.customFace.northFaceMode)
        : "back";
    }
    if (cfg?.appearanceLayers && typeof cfg.appearanceLayers === "object") {
      applyAppearanceSelectionToState(cfg.appearanceLayers);
    }
    const loadedLocalCustomization = loadCustomFaceFromStorage();
    if (state.uiMode === "customize") {
      if (!loadedLocalCustomization) {
        if (FILE_DEFAULT_FACE_PROFILE && typeof FILE_DEFAULT_FACE_PROFILE === "object") {
          applyCustomFaceProfileToState(FILE_DEFAULT_FACE_PROFILE);
        }
        if (FILE_DEFAULT_APPEARANCE_LAYERS && typeof FILE_DEFAULT_APPEARANCE_LAYERS === "object") {
          applyAppearanceSelectionToState(FILE_DEFAULT_APPEARANCE_LAYERS);
        }
      }
      state.pageIndex = 2; // pONE2
      state.animIndex = animDefs.findIndex((a) => a.key === "combat_idle");
      if (state.animIndex < 0) state.animIndex = 0;
      state.facingIndex = 0; // south
      state.behaviorIndex = 0;
      state.playbackSpeed = 1;
      state.holdFrame = false;
      state.frameCursor = 0;
      state.frameElapsed = 0;
      state.layerVisible["0bas"] = true;
      state.layerVisible["1out"] = true;
      state.layerVisible["4har"] = true;
      state.layerVisible["5hat"] = true;
      state.layerVisible["6tla"] = false;
      state.layerVisible["7tlb"] = false;
      const outfitList = layerCatalog["1out"] || [];
      const outfitToken = String(outfitList[state.layerSelection["1out"]] || "").toLowerCase();
      if (outfitToken === "none") {
        const firstRealOutfit = outfitList.findIndex((token) => String(token || "").toLowerCase() !== "none");
        if (firstRealOutfit >= 0) state.layerSelection["1out"] = firstRealOutfit;
      }
    }
    state.open = true;
    overlay.style.display = "block";
    controlsDirty = true;
    refreshPanels();
    render();
    state.rafId = requestAnimationFrame(() => tick(performance.now()));
  }

  function open() {
    openWithMode("dev");
  }

  function openCustomize() {
    openWithMode("customize");
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
    const target = e?.target;
    const tag = String(target?.tagName || "").toLowerCase();
    const inputType = String(target?.type || "").toLowerCase();
    const typingIntoField =
      (tag === "input" && !["button", "checkbox", "radio", "range", "submit", "reset"].includes(inputType)) ||
      tag === "textarea" ||
      tag === "select";
    if (typingIntoField || window?.DialogOverlay?.isVisible?.()) {
      if (state.open) onKeyDown(e);
      return;
    }

    if ((e.shiftKey && lower === "x") || (key === "X" && e.shiftKey)) {
      e.preventDefault();
      e.stopPropagation();
      if (state.open) close();
      else openCustomize();
      return;
    }

    if (state.open) onKeyDown(e);
  }, true);

  const api = {
    open,
    openCustomize,
    close,
    toggle,
    isOpen: () => state.open,
    consumeAction: () => state.open,
    getSpec: () => buildSpecObject(),
    saveCustomFaceToStorage,
    loadCustomFaceFromStorage,
  };

  loadCustomFaceFromStorage();
  window.PaperdollSandbox = api;
})(typeof window !== "undefined" ? window : null, typeof document !== "undefined" ? document : null);
