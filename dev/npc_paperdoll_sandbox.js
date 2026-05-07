(function setupNpcPaperdollSandbox(window, document) {
  if (!window || !document) return;

  const OVERLAY_ID = "npcPaperdollSandboxOverlay";
  const BASE_ROOT = "assets/sprites/npcs/npcs-pixel-line";
  const PRESET_STORAGE_KEY = "battlechurch.npcPaperdollPresets.v1";
  const MAX_PRESET_SLOTS = 32;
  const FRAME_W = 34;
  const FRAME_H = 36;
  const SHEET_COLS = 6;

  const GENDERS = ["male", "female"];
  const TONES = ["pale", "pinkish", "medium", "tanned", "dark"];
  const DIRECTIONS = [
    { key: "front", rowOffset: 0, mirror: false },
    { key: "back", rowOffset: 1, mirror: false },
    { key: "right", rowOffset: 2, mirror: false },
    { key: "left", rowOffset: 2, mirror: true },
  ];

  const ANIMATIONS = [
    { key: "idle", rowBase: 0, rows: 3, frames: 6, timings: [180, 180, 180, 180, 180, 180] },
    { key: "walk", rowBase: 3, rows: 3, frames: 6, timings: [120, 120, 120, 120, 120, 120] },
    { key: "mine", rowBase: 6, rows: 3, frames: 6, timings: [120, 120, 120, 120, 120, 120] },
    { key: "swing", rowBase: 9, rows: 3, frames: 6, timings: [95, 95, 95, 95, 95, 95] },
    { key: "pickup", rowBase: 12, rows: 3, frames: 6, timings: [130, 130, 130, 130, 130, 130] },
    { key: "walk_hold", rowBase: 15, rows: 3, frames: 6, timings: [120, 120, 120, 120, 120, 120] },
    { key: "interact", rowBase: 18, rows: 3, frames: 6, timings: [120, 120, 120, 120, 120, 120] },
  ];

  const maleBases = {
    pale: "Base_character_Itchio_all_Male_Pale.png",
    pinkish: "Base_character_Itchio_all_Male_Pinkish.png",
    medium: "Base_character_Itchio_all_Male_medium.png",
    tanned: "Base_character_Itchio_all_Male_tanned.png",
    dark: "Base_character_Itchio_all_Male_dark.png",
  };

  const femaleBases = {
    pale: "Base_character_Itchio_all_Female_Pale.png",
    pinkish: "Base_character_Itchio_all_Female_Pinkish.png",
    medium: "Base_character_Itchio_all_Female_Medium.png",
    tanned: "Base_character_Itchio_all_Female_Tanned.png",
    dark: "Base_character_Itchio_all_Female_Dark.png",
  };

  const hairByGender = {
    male: [
      "none",
      "Hair Male/Base_character_Male_Short_Brown.png",
      "Hair Male/Base_character_Male_Short_Dark_Blonde.png",
      "Hair Male/Base_character_Male_Long_Hair_Black_Unisex.png",
      "Hair Male/Base_character_Male_Hair_Blonde_with_beard.png",
      "Hair Male/Base_character_Male_Old_Man_Hair_Elegant.png",
    ],
    female: [
      "none",
      "Hair Female/Base_character_Female_Hair_Bun_Peasant_Brown.png",
      "Hair Female/Base_character_Female_Hair_Gray_Bun.png",
      "Hair Female/Base_character_Female_Hair_Long_Blond_Glossy.png",
      "Hair Female/Base_character_Female_Hair_Long_Purple_witchy.png",
      "Hair Female/Base_character_Female_Hair_Long_Unisex_Black.png",
      "Hair Female/Base_character_Female_Hair_Queen_Crown_Bun.png",
      "Hair Female/Base_character_Female_Hair_Short_Pixie.png",
    ],
  };

  const headByGender = {
    male: [
      "none",
      "Clothes Male/Head/Base_character_Male_Hat_Adventurer.png",
      "Clothes Male/Head/Base_character_Male_Hat_Wizard.png",
      "Clothes Male/Head/Base_character_Male_Helmet_Knight_Closed.png",
      "Clothes Male/Head/Base_character_Male_King_Crown.png",
      "Clothes Male/Head/Base_character_Male_Spooky_Pumpkin.png",
    ],
    female: [
      "none",
      "Clothes Female/Head/Base_character_Female_Crown.png",
      "Clothes Female/Head/Base_character_Female_Hat_Adventurer.png",
      "Clothes Female/Head/Base_character_Female_Hat_Light_Brown_Turqoiuse.png",
      "Clothes Female/Head/Base_character_Female_Hat_White_red.png",
      "Clothes Female/Head/Base_character_Female_Hat_Witch.png",
      "Clothes Female/Head/Base_character_Female_Spooky_Pumpkin.png",
    ],
  };

  const chestByGender = {
    male: [
      "none",
      "Clothes Male/Chest/Base_character_Male_Cape_Black.png",
      "Clothes Male/Chest/Base_character_Male_Cape_Green_Ranger.png",
      "Clothes Male/Chest/Base_character_Male_Fur_Armor.png",
      "Clothes Male/Chest/Base_character_Male_King_Cloak.png",
      "Clothes Male/Chest/Base_character_Male_Knight_Cape.png",
      "Clothes Male/Chest/Base_character_Male_Shirt_Royal_Blue.png",
      "Clothes Male/Chest/Base_character_Male_Shirt_Royal_Red.png",
      "Clothes Male/Chest/Base_character_Male_Shirt_beige.png",
      "Clothes Male/Chest/Base_character_Male_Shirt_with_Vest_RED_Elegant.png",
      "Clothes Male/Chest/Base_character_Male_Shirt_with_Vest_brown.png",
      "Clothes Male/Chest/Base_character_Male_Steel_Armor_Chest.png",
    ],
    female: [
      "none",
      "Clothes Female/Chest/Base_character_Female_Beige_Shirt_Adventurer.png",
      "Clothes Female/Chest/Base_character_Female_Black_Cape.png",
      "Clothes Female/Chest/Base_character_Female_Dress_Royal_Blue.png",
      "Clothes Female/Chest/Base_character_Female_Fur_Armor_Chest.png",
      "Clothes Female/Chest/Base_character_Female_Green_Ranger_Cape.png",
      "Clothes Female/Chest/Base_character_Female_Peasant_Red_Shirt.png",
      "Clothes Female/Chest/Base_character_Female_Peasant_White_Shirt.png",
      "Clothes Female/Chest/Base_character_Female_Purple_Witch_Dress.png",
      "Clothes Female/Chest/Base_character_Female_Villager_Pink_Skirt.png",
    ],
  };

  const legsByGender = {
    male: [
      "none",
      "Clothes Male/Pants/Base_character_Male_Pants_Fur_Pants.png",
      "Clothes Male/Pants/Base_character_Male_Pants_Noble_Gold.png",
      "Clothes Male/Pants/Base_character_Male_Pants_Peasant.png",
      "Clothes Male/Pants/Base_character_Male_Pants_Villager.png",
      "Clothes Male/Pants/Base_character_Male_Pants_Villager_red.png",
      "Clothes Male/Pants/Base_character_Male_Steel_Armor_Legs.png",
    ],
    female: [
      "none",
      "Clothes Female/Legs/Base_character_Female_Fur_Armor_Pants.png",
      "Clothes Female/Legs/Base_character_Female_Gold_Pants.png",
      "Clothes Female/Legs/Base_character_Female_Pants_Peasant.png",
      "Clothes Female/Legs/Base_character_Female_Pants_Villager.png",
      "Clothes Female/Legs/Base_character_Female_Peasant_Skirt_with_Apron.png",
    ],
  };

  const weaponByGender = {
    male: [
      "none",
      "Tools and Weapons/Weapons/Base_character_Male_Swing_Sword.png",
      "Tools and Weapons/Tools/Base_character_Male_Swing_Axe.png",
      "Tools and Weapons/Tools/Base_character_Male_Swing_Hoe.png",
    ],
    female: [
      "none",
      "Tools and Weapons/Weapons/Base_character_Female_Swing_Sword.png",
      "Tools and Weapons/Tools/Base_character_Female_Swing_Axe.png",
      "Tools and Weapons/Tools/Base_character_Female_Swing_Hoe.png",
    ],
  };

  const LAYERS = ["base", "legs", "chest", "hair", "head", "weapon"];
  const LABELS = {
    base: "Base",
    legs: "Legs",
    chest: "Chest",
    hair: "Hair",
    head: "Head",
    weapon: "Weapon/Tool",
  };

  const state = {
    open: false,
    genderIndex: 0,
    toneIndex: 0,
    animationIndex: 0,
    directionIndex: 0,
    speed: 1,
    loop: true,
    paused: false,
    frame: 0,
    frameElapsed: 0,
    layerVisible: Object.fromEntries(LAYERS.map((k) => [k, true])),
    layerSel: Object.fromEntries(LAYERS.map((k) => [k, 0])),
    assetPolicy: Object.fromEntries(
      LAYERS.map((k) => [k, { include: [], exclude: [] }]),
    ),
    focusLayerIndex: 0,
    presets: [],
    selectedPresetIndex: 0,
    imageCache: new Map(),
    missingCache: new Set(),
    raf: 0,
  };

  let overlay = null;
  let canvas = null;
  let ctx = null;
  let controlsRoot = null;

  function currentGender() { return GENDERS[state.genderIndex] || "male"; }
  function currentTone() { return TONES[state.toneIndex] || "pale"; }
  function currentAnim() { return ANIMATIONS[state.animationIndex] || ANIMATIONS[0]; }
  function currentDirection() { return DIRECTIONS[state.directionIndex] || DIRECTIONS[0]; }
  function focusedLayer() { return LAYERS[state.focusLayerIndex] || LAYERS[0]; }

  function clampWrap(i, len) {
    if (!len) return 0;
    let v = i % len;
    if (v < 0) v += len;
    return v;
  }

  function isTextInputTarget(target) {
    if (!target) return false;
    const tag = String(target.tagName || "").toLowerCase();
    return tag === "input" || tag === "textarea" || Boolean(target.isContentEditable);
  }

  function catalogForLayer(layerKey) {
    const g = currentGender();
    if (layerKey === "base") {
      const byTone = g === "female" ? femaleBases : maleBases;
      return TONES.map((tone) => byTone[tone]).filter(Boolean);
    }
    if (layerKey === "hair") return hairByGender[g] || ["none"];
    if (layerKey === "head") return headByGender[g] || ["none"];
    if (layerKey === "chest") return chestByGender[g] || ["none"];
    if (layerKey === "legs") return legsByGender[g] || ["none"];
    if (layerKey === "weapon") return weaponByGender[g] || ["none"];
    return ["none"];
  }

  function getLayerToken(layerKey) {
    const list = catalogForLayer(layerKey);
    return list[clampWrap(state.layerSel[layerKey] || 0, list.length)] || "none";
  }

  function uniqueStrings(values) {
    const out = [];
    const seen = new Set();
    for (const value of values || []) {
      const s = String(value || "").trim();
      if (!s || seen.has(s)) continue;
      seen.add(s);
      out.push(s);
    }
    return out;
  }

  function policyFor(layerKey) {
    if (!state.assetPolicy[layerKey] || typeof state.assetPolicy[layerKey] !== "object") {
      state.assetPolicy[layerKey] = { include: [], exclude: [] };
    }
    const p = state.assetPolicy[layerKey];
    if (!Array.isArray(p.include)) p.include = [];
    if (!Array.isArray(p.exclude)) p.exclude = [];
    return p;
  }

  function policyMode(layerKey) {
    const p = policyFor(layerKey);
    return uniqueStrings(p.include).length > 0 ? "include" : "exclude";
  }

  function isTokenAllowed(layerKey, token) {
    const t = String(token || "");
    if (!t || t === "none") return true;
    const p = policyFor(layerKey);
    const include = uniqueStrings(p.include);
    const exclude = uniqueStrings(p.exclude);
    if (include.length) return include.includes(t);
    return !exclude.includes(t);
  }

  function setTokenAllowed(layerKey, token, allowed) {
    const t = String(token || "");
    if (!t || t === "none") return;
    const p = policyFor(layerKey);
    p.include = uniqueStrings(p.include).filter((x) => x !== t);
    p.exclude = uniqueStrings(p.exclude).filter((x) => x !== t);
    if (allowed) {
      if (policyMode(layerKey) === "include") p.include = uniqueStrings([...p.include, t]);
      return;
    }
    if (policyMode(layerKey) === "include") {
      p.include = uniqueStrings(p.include).filter((x) => x !== t);
      return;
    }
    p.exclude = uniqueStrings([...p.exclude, t]);
  }

  function setPolicyMode(layerKey, mode) {
    const p = policyFor(layerKey);
    if (mode === "include") {
      p.exclude = [];
      p.include = uniqueStrings(p.include);
      return;
    }
    p.include = [];
    p.exclude = uniqueStrings(p.exclude);
  }

  function setLayerAllowAll(layerKey) {
    const p = policyFor(layerKey);
    p.include = [];
    p.exclude = [];
  }

  function setLayerBlockAll(layerKey) {
    const p = policyFor(layerKey);
    const list = catalogForLayer(layerKey).filter((t) => t && t !== "none");
    if (policyMode(layerKey) === "include") {
      p.include = [];
      p.exclude = [];
      return;
    }
    p.exclude = uniqueStrings(list);
  }

  function invertLayerPolicy(layerKey) {
    const p = policyFor(layerKey);
    const list = catalogForLayer(layerKey).filter((t) => t && t !== "none");
    const allowed = list.filter((t) => isTokenAllowed(layerKey, t));
    if (policyMode(layerKey) === "include") {
      p.include = uniqueStrings(list.filter((t) => !allowed.includes(t)));
      p.exclude = [];
      return;
    }
    p.include = [];
    p.exclude = uniqueStrings(allowed);
  }

  function ensureLayerSelectionsInBounds() {
    for (const key of LAYERS) {
      const list = catalogForLayer(key);
      state.layerSel[key] = clampWrap(state.layerSel[key] || 0, Math.max(1, list.length));
    }
  }

  function imageFor(path) {
    if (!path || path === "none" || state.missingCache.has(path)) return null;
    if (state.imageCache.has(path)) return state.imageCache.get(path);
    const img = new Image();
    img.src = `${BASE_ROOT}/${path}`;
    img.onerror = () => state.missingCache.add(path);
    state.imageCache.set(path, img);
    return img;
  }

  function sheetFrameRect(anim, direction, frameIndex) {
    const row = anim.rowBase + direction.rowOffset;
    const col = clampWrap(frameIndex, anim.frames);
    return {
      sx: col * FRAME_W,
      sy: row * FRAME_H,
      sw: FRAME_W,
      sh: FRAME_H,
    };
  }

  function drawLayerImage(path, rect, drawX, drawY, drawW, drawH, mirror) {
    const img = imageFor(path);
    if (!img || !img.complete || !img.naturalWidth) return;
    if (rect.sx + rect.sw > img.naturalWidth || rect.sy + rect.sh > img.naturalHeight) return;
    ctx.save();
    if (mirror) {
      ctx.translate(drawX + drawW / 2, 0);
      ctx.scale(-1, 1);
      ctx.translate(-(drawX + drawW / 2), 0);
    }
    ctx.drawImage(img, rect.sx, rect.sy, rect.sw, rect.sh, drawX, drawY, drawW, drawH);
    ctx.restore();
  }

  function prettyName(path) {
    if (!path || path === "none") return "none";
    const file = path.split("/").pop() || path;
    return file.replace(/^Base_character_/i, "").replace(/\.png$/i, "").replace(/_/g, " ");
  }

  function renderControls() {
    if (!controlsRoot) return;
    const parts = [];
    const row = (label, value, prevAction, nextAction) => {
      parts.push(`
        <div style="display:grid;grid-template-columns:100px 32px 1fr 32px;gap:6px;align-items:center;margin-bottom:6px;">
          <div style="opacity:.9;">${label}</div>
          <button data-action="${prevAction}" style="padding:4px;border:1px solid #3a4b72;background:#1b2740;color:#e8edf7;border-radius:6px;">◀</button>
          <div style="padding:4px 6px;border:1px solid #2a334a;background:#0d1220;border-radius:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${value}</div>
          <button data-action="${nextAction}" style="padding:4px;border:1px solid #3a4b72;background:#1b2740;color:#e8edf7;border-radius:6px;">▶</button>
        </div>
      `);
    };

    row("Gender", currentGender(), "gender:-1", "gender:1");
    row("Skin Tone", currentTone(), "tone:-1", "tone:1");
    row("Animation", currentAnim().key, "anim:-1", "anim:1");
    row("Direction", currentDirection().key, "dir:-1", "dir:1");

    parts.push(`<div style="margin:8px 0 4px;font-weight:700;">Layers</div>`);
    for (const key of LAYERS) {
      const value = prettyName(getLayerToken(key));
      const token = getLayerToken(key);
      const allowed = isTokenAllowed(key, token);
      const mode = policyMode(key);
      const policy = policyFor(key);
      const includeCount = uniqueStrings(policy.include).length;
      const excludeCount = uniqueStrings(policy.exclude).length;
      parts.push(`
        <div style="display:grid;grid-template-columns:100px 32px 1fr 32px 62px 86px;gap:6px;align-items:center;margin-bottom:6px;">
          <div>${LABELS[key]}</div>
          <button data-action="layer:${key}:-1" style="padding:4px;border:1px solid #3a4b72;background:#1b2740;color:#e8edf7;border-radius:6px;">◀</button>
          <div style="padding:4px 6px;border:1px solid #2a334a;background:#0d1220;border-radius:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${value}</div>
          <button data-action="layer:${key}:1" style="padding:4px;border:1px solid #3a4b72;background:#1b2740;color:#e8edf7;border-radius:6px;">▶</button>
          <button data-action="toggle:${key}" style="padding:4px;border:1px solid #3a4b72;background:${state.layerVisible[key] ? "#1f3d2a" : "#3a1f24"};color:#e8edf7;border-radius:6px;">${state.layerVisible[key] ? "On" : "Off"}</button>
          <button data-action="allow:${key}:${allowed ? 0 : 1}" style="padding:4px;border:1px solid #3a4b72;background:${allowed ? "#1f3d2a" : "#4a2328"};color:#e8edf7;border-radius:6px;">${allowed ? "Use: Yes" : "Use: No"}</button>
        </div>
        <div style="display:grid;grid-template-columns:100px 88px 88px 88px 1fr;gap:6px;align-items:center;margin-top:-2px;margin-bottom:8px;">
          <div style="opacity:.75;font-size:11px;">Pool (${mode})</div>
          <button data-action="mode:${key}:exclude" style="padding:3px;border:1px solid #3a4b72;background:${mode === "exclude" ? "#294063" : "#1b2740"};color:#e8edf7;border-radius:6px;font-size:11px;">Blocklist</button>
          <button data-action="mode:${key}:include" style="padding:3px;border:1px solid #3a4b72;background:${mode === "include" ? "#294063" : "#1b2740"};color:#e8edf7;border-radius:6px;font-size:11px;">Allowlist</button>
          <button data-action="layer-policy:${key}:invert" style="padding:3px;border:1px solid #3a4b72;background:#1b2740;color:#e8edf7;border-radius:6px;font-size:11px;">Invert</button>
          <div style="font-size:11px;opacity:.85;">inc:${includeCount} / exc:${excludeCount}</div>
        </div>
        <div style="display:grid;grid-template-columns:100px 88px 88px 88px 1fr;gap:6px;align-items:center;margin-top:-4px;margin-bottom:10px;">
          <div style="opacity:.75;font-size:11px;">Quick</div>
          <button data-action="layer-policy:${key}:allowall" style="padding:3px;border:1px solid #3a4b72;background:#1b2740;color:#e8edf7;border-radius:6px;font-size:11px;">Allow All</button>
          <button data-action="layer-policy:${key}:blockall" style="padding:3px;border:1px solid #3a4b72;background:#1b2740;color:#e8edf7;border-radius:6px;font-size:11px;">Block All</button>
          <button data-action="layer-policy:${key}:clear" style="padding:3px;border:1px solid #3a4b72;background:#1b2740;color:#e8edf7;border-radius:6px;font-size:11px;">Clear Rules</button>
          <div></div>
        </div>
      `);
    }

    row("Playback", `${state.speed.toFixed(2)}x`, "speed:-1", "speed:1");

    parts.push(`
      <div style="display:flex;gap:8px;margin-top:8px;">
        <button data-action="pause" style="flex:1;padding:6px;border:1px solid #3a4b72;background:#1b2740;color:#e8edf7;border-radius:6px;">${state.paused ? "Resume" : "Pause"}</button>
        <button data-action="restart" style="flex:1;padding:6px;border:1px solid #3a4b72;background:#1b2740;color:#e8edf7;border-radius:6px;">Restart</button>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px;">
        <button data-action="frame:-1" style="flex:1;padding:6px;border:1px solid #3a4b72;background:#1b2740;color:#e8edf7;border-radius:6px;">Prev Frame</button>
        <button data-action="frame:1" style="flex:1;padding:6px;border:1px solid #3a4b72;background:#1b2740;color:#e8edf7;border-radius:6px;">Next Frame</button>
      </div>
    `);

    const activePreset = state.presets[state.selectedPresetIndex] || null;
    const presetName = activePreset?.name || "";

    controlsRoot.innerHTML = `
      <div style="font-size:18px;font-weight:700;margin-bottom:8px;">NPC Pixel-Line Sandbox</div>
      ${parts.join("")}
      <div style="margin-top:10px;padding:8px;border:1px solid #2a334a;border-radius:8px;background:#0d1220;">
        <div style="font-weight:700;margin-bottom:6px;">Current Config</div>
        <pre style="margin:0;white-space:pre-wrap;font-size:11px;line-height:1.35;max-height:140px;overflow:auto;">${escapeHtml(JSON.stringify(buildCurrentSpec(), null, 2))}</pre>
      </div>
      <div style="margin-top:10px;font-weight:700;">NPC Presets (Local)</div>
      <div style="display:flex;gap:8px;align-items:center;margin:6px 0;">
        <input id="npcPresetName" type="text" value="${escapeHtml(presetName || "NPC Preset")}" style="flex:1;background:#0d1220;color:#e8edf7;border:1px solid #2a334a;border-radius:6px;padding:6px;font-size:12px;">
      </div>
      <div id="npcPresetRows" style="display:grid;grid-template-columns:1fr;gap:6px;max-height:220px;overflow:auto;"></div>
      <div style="display:flex;gap:8px;margin-top:8px;">
        <button data-action="save-config" style="flex:1;padding:8px;border:1px solid #4f8d45;background:#254122;color:#e8edf7;border-radius:8px;">Save Config File</button>
      </div>
    `;

    renderPresetRows();
  }

  function renderPresetRows() {
    const root = overlay?.querySelector?.("#npcPresetRows");
    if (!root) return;
    const rows = [];
    for (let i = 0; i < MAX_PRESET_SLOTS; i += 1) {
      const p = state.presets[i];
      const label = p?.name || `Empty Slot ${i + 1}`;
      const selected = i === state.selectedPresetIndex;
      rows.push(`
        <div style="display:grid;grid-template-columns:1fr 58px 58px 28px;gap:6px;align-items:center;">
          <div style="padding:4px 6px;border:1px solid ${selected ? "#5f78b5" : "#2a334a"};border-radius:6px;background:${selected ? "#16213a" : "#0d1220"};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(label)}</div>
          <button data-action="preset-save:${i}" style="padding:4px;border:1px solid #3a4b72;background:#1b2740;color:#e8edf7;border-radius:6px;">Save</button>
          <button data-action="preset-load:${i}" style="padding:4px;border:1px solid #3a4b72;background:#1b2740;color:#e8edf7;border-radius:6px;">Load</button>
          <button data-action="preset-del:${i}" style="padding:4px;border:1px solid #3a4b72;background:#1b2740;color:#e8edf7;border-radius:6px;">×</button>
        </div>
      `);
    }
    root.innerHTML = rows.join("");
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function ensureOverlay() {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.style.cssText = [
      "position:fixed", "inset:0", "z-index:99999", "display:none",
      "background:radial-gradient(circle at 30% 20%, #20263a 0%, #121620 60%, #0b0e14 100%)",
      "color:#e8edf7", "font-family: ui-monospace, SFMono-Regular, Menlo, monospace",
    ].join(";");

    overlay.innerHTML = `
      <div style="display:grid;grid-template-columns:520px 1fr;gap:16px;height:100%;padding:16px;box-sizing:border-box;">
        <div style="background:rgba(12,16,24,0.86);border:1px solid #2a334a;border-radius:10px;padding:12px;overflow:auto;">
          <div id="npcPaperdollControls"></div>
        </div>
        <div style="display:flex;align-items:center;justify-content:center;background:rgba(12,16,24,0.6);border:1px solid #2a334a;border-radius:10px;position:relative;overflow:hidden;">
          <canvas id="npcPaperdollCanvas" width="900" height="620" style="width:auto;height:auto;max-width:100%;max-height:100%;aspect-ratio:900/620;image-rendering:pixelated;"></canvas>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    canvas = overlay.querySelector("#npcPaperdollCanvas");
    ctx = canvas.getContext("2d");
    if (ctx) ctx.imageSmoothingEnabled = false;
    controlsRoot = overlay.querySelector("#npcPaperdollControls");

    overlay.addEventListener("click", onOverlayClick);
  }

  function onOverlayClick(e) {
    const button = e.target?.closest?.("button[data-action]");
    if (!button) return;
    e.preventDefault();
    e.stopPropagation();
    const action = String(button.getAttribute("data-action") || "");
    if (!action) return;

    if (action === "pause") {
      state.paused = !state.paused;
    } else if (action === "restart") {
      state.frame = 0;
      state.frameElapsed = 0;
    } else if (action === "frame:-1") {
      state.paused = true;
      state.frame = clampWrap(state.frame - 1, currentAnim().frames);
    } else if (action === "frame:1") {
      state.paused = true;
      state.frame = clampWrap(state.frame + 1, currentAnim().frames);
    } else if (action.startsWith("gender:")) {
      state.genderIndex = clampWrap(state.genderIndex + Number(action.split(":")[1] || 0), GENDERS.length);
      ensureLayerSelectionsInBounds();
    } else if (action.startsWith("tone:")) {
      state.toneIndex = clampWrap(state.toneIndex + Number(action.split(":")[1] || 0), TONES.length);
      state.layerSel.base = state.toneIndex;
    } else if (action.startsWith("anim:")) {
      state.animationIndex = clampWrap(state.animationIndex + Number(action.split(":")[1] || 0), ANIMATIONS.length);
      state.frame = 0;
      state.frameElapsed = 0;
    } else if (action.startsWith("dir:")) {
      state.directionIndex = clampWrap(state.directionIndex + Number(action.split(":")[1] || 0), DIRECTIONS.length);
    } else if (action.startsWith("speed:")) {
      const delta = Number(action.split(":")[1] || 0);
      state.speed = Math.max(0.25, Math.min(4, state.speed + (delta > 0 ? 0.1 : -0.1)));
    } else if (action.startsWith("layer:")) {
      const [, key, deltaRaw] = action.split(":");
      const list = catalogForLayer(key);
      if (list.length) {
        state.layerSel[key] = clampWrap((state.layerSel[key] || 0) + Number(deltaRaw || 0), list.length);
      }
    } else if (action.startsWith("toggle:")) {
      const key = action.split(":")[1];
      state.layerVisible[key] = !state.layerVisible[key];
    } else if (action.startsWith("allow:")) {
      const [, key, allowRaw] = action.split(":");
      setTokenAllowed(key, getLayerToken(key), Number(allowRaw) === 1);
    } else if (action.startsWith("mode:")) {
      const [, key, mode] = action.split(":");
      setPolicyMode(key, mode);
    } else if (action.startsWith("layer-policy:")) {
      const [, key, cmd] = action.split(":");
      if (cmd === "allowall" || cmd === "clear") setLayerAllowAll(key);
      else if (cmd === "blockall") setLayerBlockAll(key);
      else if (cmd === "invert") invertLayerPolicy(key);
    } else if (action.startsWith("preset-save:")) {
      savePresetSlot(Number(action.split(":")[1] || 0));
    } else if (action.startsWith("preset-load:")) {
      loadPresetSlot(Number(action.split(":")[1] || 0));
    } else if (action.startsWith("preset-del:")) {
      deletePresetSlot(Number(action.split(":")[1] || 0));
    } else if (action === "save-config") {
      saveConfigFileWithPrompt();
    }

    renderControls();
    render();
  }

  function buildCurrentSpec() {
    return {
      gender: currentGender(),
      skinTone: currentTone(),
      animation: currentAnim().key,
      direction: currentDirection().key,
      speed: Number(state.speed.toFixed(2)),
      loop: Boolean(state.loop),
      frame: state.frame,
      layers: Object.fromEntries(LAYERS.map((key) => [key, {
        visible: Boolean(state.layerVisible[key]),
        asset: getLayerToken(key),
      }])),
      assetPool: Object.fromEntries(LAYERS.map((key) => {
        const p = policyFor(key);
        return [key, {
          mode: policyMode(key),
          include: uniqueStrings(p.include),
          exclude: uniqueStrings(p.exclude),
        }];
      })),
    };
  }

  function exportPreset(name) {
    return {
      name: String(name || "NPC Preset").trim() || "NPC Preset",
      genderIndex: state.genderIndex,
      toneIndex: state.toneIndex,
      animationIndex: state.animationIndex,
      directionIndex: state.directionIndex,
      speed: state.speed,
      loop: state.loop,
      layerSel: { ...state.layerSel },
      layerVisible: { ...state.layerVisible },
      assetPolicy: JSON.parse(JSON.stringify(state.assetPolicy || {})),
      savedAt: Date.now(),
    };
  }

  function applyPreset(p) {
    if (!p || typeof p !== "object") return false;
    state.genderIndex = clampWrap(Number(p.genderIndex) || 0, GENDERS.length);
    state.toneIndex = clampWrap(Number(p.toneIndex) || 0, TONES.length);
    state.animationIndex = clampWrap(Number(p.animationIndex) || 0, ANIMATIONS.length);
    state.directionIndex = clampWrap(Number(p.directionIndex) || 0, DIRECTIONS.length);
    state.speed = Math.max(0.25, Math.min(4, Number(p.speed) || 1));
    state.loop = p.loop !== false;
    const sel = p.layerSel && typeof p.layerSel === "object" ? p.layerSel : {};
    const vis = p.layerVisible && typeof p.layerVisible === "object" ? p.layerVisible : {};
    const pol = p.assetPolicy && typeof p.assetPolicy === "object" ? p.assetPolicy : {};
    for (const key of LAYERS) {
      const list = catalogForLayer(key);
      state.layerSel[key] = clampWrap(Number(sel[key]) || 0, Math.max(1, list.length));
      state.layerVisible[key] = vis[key] !== false;
      const src = pol[key] && typeof pol[key] === "object" ? pol[key] : {};
      policyFor(key).include = uniqueStrings(src.include || []);
      policyFor(key).exclude = uniqueStrings(src.exclude || []);
    }
    state.frame = 0;
    state.frameElapsed = 0;
    state.paused = false;
    return true;
  }

  function presetNameInput() {
    return overlay?.querySelector?.("#npcPresetName") || null;
  }

  function loadPresets() {
    const raw = window.localStorage?.getItem?.(PRESET_STORAGE_KEY);
    if (!raw) {
      state.presets = [];
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      state.presets = Array.isArray(parsed) ? parsed.slice(0, MAX_PRESET_SLOTS) : [];
    } catch (_) {
      state.presets = [];
    }
  }

  function savePresets() {
    if (!window.localStorage?.setItem) return;
    window.localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(state.presets || []));
  }

  function savePresetSlot(idx) {
    const index = Math.max(0, Math.floor(Number(idx) || 0));
    while (state.presets.length <= index) state.presets.push(null);
    const name = presetNameInput()?.value || `Preset ${index + 1}`;
    state.presets[index] = exportPreset(name);
    state.selectedPresetIndex = index;
    savePresets();
  }

  function loadPresetSlot(idx) {
    const index = Math.max(0, Math.floor(Number(idx) || 0));
    const p = state.presets[index];
    if (!p) return;
    if (!applyPreset(p)) return;
    state.selectedPresetIndex = index;
    const input = presetNameInput();
    if (input) input.value = String(p.name || `Preset ${index + 1}`);
  }

  function deletePresetSlot(idx) {
    const index = Math.max(0, Math.floor(Number(idx) || 0));
    if (!state.presets[index]) return;
    state.presets[index] = null;
    savePresets();
  }

  function buildConfigObject() {
    const slots = [];
    for (let i = 0; i < MAX_PRESET_SLOTS; i += 1) {
      const p = state.presets[i];
      if (!p || typeof p !== "object") continue;
      slots.push({
        slot: i + 1,
        name: String(p.name || `Preset ${i + 1}`).trim() || `Preset ${i + 1}`,
        gender: GENDERS[clampWrap(Number(p.genderIndex) || 0, GENDERS.length)] || "male",
        skinTone: TONES[clampWrap(Number(p.toneIndex) || 0, TONES.length)] || "pale",
        animation: ANIMATIONS[clampWrap(Number(p.animationIndex) || 0, ANIMATIONS.length)]?.key || "idle",
        direction: DIRECTIONS[clampWrap(Number(p.directionIndex) || 0, DIRECTIONS.length)]?.key || "front",
        speed: Math.max(0.25, Math.min(4, Number(p.speed) || 1)),
        loop: p.loop !== false,
        layers: Object.fromEntries(LAYERS.map((key) => {
          const list = key === "base"
            ? (GENDERS[clampWrap(Number(p.genderIndex) || 0, GENDERS.length)] === "female" ? femaleBases : maleBases)
            : null;
          const arr = key === "base"
            ? TONES.map((tone) => list[tone]).filter(Boolean)
            : (key === "hair"
                ? hairByGender[GENDERS[clampWrap(Number(p.genderIndex) || 0, GENDERS.length)]]
                : key === "head"
                  ? headByGender[GENDERS[clampWrap(Number(p.genderIndex) || 0, GENDERS.length)]]
                  : key === "chest"
                    ? chestByGender[GENDERS[clampWrap(Number(p.genderIndex) || 0, GENDERS.length)]]
                    : key === "legs"
                      ? legsByGender[GENDERS[clampWrap(Number(p.genderIndex) || 0, GENDERS.length)]]
                      : weaponByGender[GENDERS[clampWrap(Number(p.genderIndex) || 0, GENDERS.length)]]) || ["none"];
          const token = arr[clampWrap(Number(p.layerSel?.[key]) || 0, arr.length)] || "none";
          return [key, { visible: p.layerVisible?.[key] !== false, asset: token }];
        })),
        assetPool: Object.fromEntries(LAYERS.map((key) => {
          const src = p.assetPolicy?.[key] && typeof p.assetPolicy[key] === "object" ? p.assetPolicy[key] : {};
          const include = uniqueStrings(src.include || []);
          const exclude = uniqueStrings(src.exclude || []);
          return [key, {
            mode: include.length ? "include" : "exclude",
            include,
            exclude,
          }];
        })),
      });
    }

    return {
      source: "npcs-pixel-line",
      frameGrid: { width: FRAME_W, height: FRAME_H, columns: SHEET_COLS },
      directionRows: { front: 0, back: 1, right: 2, left: 2 },
      leftMirrorsRight: true,
      presets: slots,
    };
  }

  function buildConfigJs() {
    const cfg = buildConfigObject();
    return [
      "// Generated from dev/npc_paperdoll_sandbox.js",
      "(function initNpcPaperdollConfig(global) {",
      "  const FILE_DEFAULT = " + JSON.stringify(cfg, null, 2) + ";",
      "  global.BATTLECHURCH_NPC_PAPERDOLL = FILE_DEFAULT;",
      "})(typeof window !== \"undefined\" ? window : globalThis);",
      "",
    ].join("\n");
  }

  async function saveConfigFileWithPrompt() {
    const text = buildConfigJs();
    if (typeof window.showSaveFilePicker === "function") {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: "config_npc_paperdoll.js",
          types: [{ description: "JavaScript", accept: { "application/javascript": [".js"] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(text);
        await writable.close();
        return;
      } catch (_) {}
    }
    const blob = new Blob([text], { type: "application/javascript;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "config_npc_paperdoll.js";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function update(dtMs) {
    if (state.paused) return;
    const anim = currentAnim();
    const timings = anim.timings || [120];
    const duration = timings[Math.min(state.frame, timings.length - 1)] || 120;
    state.frameElapsed += Math.max(0, dtMs) * state.speed;
    if (state.frameElapsed >= duration) {
      state.frameElapsed = 0;
      state.frame += 1;
      if (state.frame >= anim.frames) {
        state.frame = state.loop ? 0 : anim.frames - 1;
      }
    }
  }

  function render() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0a0f1f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const anim = currentAnim();
    const dir = currentDirection();
    const rect = sheetFrameRect(anim, dir, state.frame);

    const scale = 7;
    const drawW = FRAME_W * scale;
    const drawH = FRAME_H * scale;
    const x = Math.round(canvas.width * 0.5 - drawW * 0.5);
    const y = Math.round(canvas.height * 0.5 - drawH * 0.5);

    const drawOrder = ["base", "legs", "chest", "hair", "head", "weapon"];
    for (const key of drawOrder) {
      if (!state.layerVisible[key]) continue;
      drawLayerImage(getLayerToken(key), rect, x, y, drawW, drawH, dir.mirror);
    }

    ctx.fillStyle = "rgba(232,237,247,0.95)";
    ctx.font = "16px ui-monospace, Menlo, monospace";
    ctx.fillText(`Anim: ${anim.key} | Dir: ${dir.key} | Frame: ${state.frame + 1}/${anim.frames}`, 16, 26);
  }

  function tick(lastTs) {
    if (!state.open) return;
    const now = performance.now();
    update(now - lastTs);
    render();
    state.raf = requestAnimationFrame(() => tick(now));
  }

  function open() {
    ensureOverlay();
    if (!overlay || state.open) return;
    loadPresets();
    state.open = true;
    overlay.style.display = "block";
    ensureLayerSelectionsInBounds();
    renderControls();
    render();
    state.raf = requestAnimationFrame(() => tick(performance.now()));
  }

  function close() {
    if (!state.open) return;
    state.open = false;
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = 0;
    if (overlay) overlay.style.display = "none";
  }

  function toggle() {
    if (state.open) close();
    else open();
  }

  function onKeyDown(e) {
    if (isTextInputTarget(e.target)) return;
    const key = String(e.key || "");
    const lower = key.length === 1 ? key.toLowerCase() : key;

    if (key === "Escape") {
      e.preventDefault();
      close();
      return;
    }

    if (key === "ArrowUp") state.focusLayerIndex = clampWrap(state.focusLayerIndex - 1, LAYERS.length);
    else if (key === "ArrowDown") state.focusLayerIndex = clampWrap(state.focusLayerIndex + 1, LAYERS.length);
    else if (key === "ArrowLeft") {
      const layer = focusedLayer();
      const list = catalogForLayer(layer);
      state.layerSel[layer] = clampWrap((state.layerSel[layer] || 0) - 1, Math.max(1, list.length));
    } else if (key === "ArrowRight") {
      const layer = focusedLayer();
      const list = catalogForLayer(layer);
      state.layerSel[layer] = clampWrap((state.layerSel[layer] || 0) + 1, Math.max(1, list.length));
    } else if (lower === "w") state.animationIndex = clampWrap(state.animationIndex - 1, ANIMATIONS.length);
    else if (lower === "s") state.animationIndex = clampWrap(state.animationIndex + 1, ANIMATIONS.length);
    else if (lower === "a") state.directionIndex = clampWrap(state.directionIndex - 1, DIRECTIONS.length);
    else if (lower === "d") state.directionIndex = clampWrap(state.directionIndex + 1, DIRECTIONS.length);
    else if (key === " ") state.paused = !state.paused;
    else if (key === "Enter") {
      state.frame = 0;
      state.frameElapsed = 0;
      state.paused = false;
    }

    renderControls();
    render();
  }

  document.addEventListener("keydown", (e) => {
    const key = String(e.key || "");
    const lower = key.length === 1 ? key.toLowerCase() : key;

    if (e.shiftKey && lower === "n") {
      e.preventDefault();
      e.stopPropagation();
      toggle();
      return;
    }

    if (state.open) onKeyDown(e);
  }, true);

  window.NpcPaperdollSandbox = { open, close, toggle, isOpen: () => state.open };
})(typeof window !== "undefined" ? window : null, typeof document !== "undefined" ? document : null);
