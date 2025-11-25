(function setupEnemyEditor(window, document) {
  if (!window || !document) return;

  const STORAGE_KEY = "battlechurch.devLevelConfig";
  const OVERLAY_ID = "enemyEditorOverlay";
  const HOTKEY = "e";

  function loadConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    } catch (e) {
      console.warn("EnemyEditor: failed to load config", e);
    }
    return {};
  }

  function saveConfig(cfg) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg || {}));
      return true;
    } catch (e) {
      console.warn("EnemyEditor: failed to save", e);
      return false;
    }
  }

  function getOverrides(cfg) {
    cfg.globals = cfg.globals || {};
    cfg.globals.enemyStats = cfg.globals.enemyStats || {};
    return cfg.globals.enemyStats;
  }

  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.innerHTML = `
    <style>
      #${OVERLAY_ID} {
        position: fixed;
        inset: 0;
        background: rgba(6,10,18,0.94);
        color: #e8f4ff;
        font-family: "Inter", Arial, sans-serif;
        z-index: 10000;
        display: none;
        padding: 16px;
        box-sizing: border-box;
      }
      #${OVERLAY_ID} .header {
        display: flex;
        gap: 8px;
        align-items: center;
        margin-bottom: 10px;
      }
      #${OVERLAY_ID} input, #${OVERLAY_ID} select {
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.14);
        border-radius: 6px;
        color: #e8f4ff;
        padding: 6px 8px;
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
      #${OVERLAY_ID} table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
      }
      #${OVERLAY_ID} th, #${OVERLAY_ID} td {
        border-bottom: 1px solid rgba(255,255,255,0.08);
        padding: 6px;
        text-align: left;
      }
      #${OVERLAY_ID} .thumb {
        width: 72px;
        height: 72px;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }
      #${OVERLAY_ID} .scroll {
        overflow: auto;
        height: calc(100vh - 110px);
      }
      #${OVERLAY_ID} .status {
        font-size: 12px;
        color: #9bf0ff;
      }
    </style>
    <div class="header">
      <button id="ee-close" class="secondary">Close (Esc)</button>
      <button id="ee-save">Save</button>
      <div id="ee-status" class="status"></div>
    </div>
    <div class="scroll">
      <table id="ee-table">
        <thead>
          <tr>
            <th>Sprite</th>
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
            <th>Tags</th>
            <th>Reset</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
  `;
  document.body.appendChild(overlay);

  const els = {
    close: overlay.querySelector("#ee-close"),
    save: overlay.querySelector("#ee-save"),
    status: overlay.querySelector("#ee-status"),
    tbody: overlay.querySelector("#ee-table tbody"),
  };

  let cfg = loadConfig();
  let overrides = getOverrides(cfg);
  let catalog =
    (window.BattlechurchEnemyCatalog && window.BattlechurchEnemyCatalog.catalog) ||
    {};
  let currentCatalog = catalog;

  const rows = {};
  const animTimers = {};
  const imageCache = new Map(); // key -> { image, frameWidth, frameHeight, frameMap }
  let assetRefreshTimer = null;

  function setStatus(text) {
    if (!els.status) return;
    els.status.textContent = text;
  }

  function getBaseDef(key) {
    return catalog[key] || {};
  }

  function getEffective(key) {
    return Object.assign({}, getBaseDef(key), overrides[key] || {});
  }

  function resetEnemy(key) {
    delete overrides[key];
    renderRow(key);
    saveConfig(cfg);
  }

  function applyValue(key, field, value) {
    overrides[key] = overrides[key] || {};
    if (value === "" || value === null || Number.isNaN(value)) {
      delete overrides[key][field];
    } else {
      overrides[key][field] = value;
    }
  }

  function createCellInput(key, field, type = "number") {
    const td = document.createElement("td");
    const eff = getEffective(key);
    const base = eff[field];
    const input = document.createElement("input");
    input.type = type;
    input.value = base ?? "";
    input.style.width = "80px";
    input.addEventListener("change", () => {
      const val = input.value === "" ? null : Number(input.value);
      applyValue(key, field, val);
    });
    td.appendChild(input);
    return td;
  }

  function createTagsCell(key) {
    const td = document.createElement("td");
    const eff = getEffective(key);
    const tags = new Set(eff.specialBehavior || []);
    const tagList = ["swarmable", "ranged", "npcPriority", "mini", "popcorn", "elite", "bossImmune", "preferEdges"];
    tagList.forEach((tag) => {
      const label = document.createElement("label");
      label.style.display = "block";
      label.style.fontSize = "11px";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = tags.has(tag);
      cb.addEventListener("change", () => {
        const next = new Set(tags);
        if (cb.checked) next.add(tag);
        else next.delete(tag);
        overrides[key] = overrides[key] || {};
        overrides[key].specialBehavior = Array.from(next);
      });
      label.appendChild(cb);
      label.append(" " + tag);
      td.appendChild(label);
    });
    return td;
  }

  function renderSpriteCell(key) {
    const td = document.createElement("td");
    const wrap = document.createElement("div");
    wrap.className = "thumb";
    wrap.dataset.key = key;
    td.appendChild(wrap);

    // animate using existing assets or manifest fallback
    try {
      const assets = window.assets || {};
      const enemyAssets = assets.enemies?.[key];
      let clip = enemyAssets?.walk || enemyAssets?.idle;

      const manifestEntry =
        (window.ASSET_MANIFEST && window.ASSET_MANIFEST.enemies && window.ASSET_MANIFEST.enemies[key]) ||
        null;

      const cached = imageCache.get(key);

      // If clip missing, try manifest + cached image
      if ((!clip || !clip.image) && manifestEntry) {
        if (cached && cached.image) {
          clip = {
            image: cached.image,
            frameWidth: manifestEntry.idle?.frameWidth || cached.frameWidth || 100,
            frameHeight: manifestEntry.idle?.frameHeight || cached.frameHeight || 100,
            frameMap: cached.frameMap || manifestEntry.idle?.frameMap,
            frameCount: manifestEntry.idle?.frameCount,
            renderScale: manifestEntry.idle?.renderScale,
          };
        } else if (!thumbLoading.has(key) && manifestEntry.idle?.src) {
          thumbLoading.add(key);
          const img = new Image();
          img.onload = () => {
            imageCache.set(key, {
              image: img,
              frameWidth: manifestEntry.idle.frameWidth || 100,
              frameHeight: manifestEntry.idle.frameHeight || 100,
              frameMap: manifestEntry.idle.frameMap || null,
            });
            thumbLoading.delete(key);
            renderRow(key);
          };
          img.onerror = () => {
            thumbLoading.delete(key);
          };
          img.src = manifestEntry.idle.src;
        }
      }

      if (clip?.image && clip.frameWidth && clip.frameHeight) {
        const canvas = document.createElement("canvas");
        canvas.width = 72;
        canvas.height = 72;
        wrap.appendChild(canvas);
        let frame = 0;
        let frames = [];
        if (clip.frameMap && clip.frameMap.length) frames = clip.frameMap;
        else if (cached?.frameMap && cached.frameMap.length) frames = cached.frameMap;
        else {
          const cols = Math.max(1, Math.floor(clip.image.width / clip.frameWidth));
          const rows = Math.max(1, Math.floor(clip.image.height / clip.frameHeight));
          const count = Math.max(1, cols * rows);
          frames = Array.from({ length: count }, (_, i) => i);
        }
        const ctx = canvas.getContext("2d");
        const draw = () => {
          const idx = frames[frame % frames.length] || 0;
          const cols = Math.max(1, Math.floor(clip.image.width / clip.frameWidth));
          const sx = (idx % cols) * clip.frameWidth;
          const sy = Math.floor(idx / cols) * clip.frameHeight;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const eff = getEffective(key);
          const scale = eff.scale || 1;
          const renderScale = (clip.renderScale && clip.renderScale > 0 ? clip.renderScale : 1) * scale;
          const dw = clip.frameWidth * renderScale;
          const dh = clip.frameHeight * renderScale;
          ctx.drawImage(
            clip.image,
            sx,
            sy,
            clip.frameWidth,
            clip.frameHeight,
            (canvas.width - dw) / 2,
            (canvas.height - dh) / 2,
            dw,
            dh,
          );
          frame += 1;
        };
        draw();
        const timer = setInterval(draw, 100);
        animTimers[key] = timer;
      } else {
        wrap.textContent = "N/A";
      }
    } catch (e) {
      // ignore
    }

    return td;
  }

  function renderRow(key) {
    let tr = rows[key];
    if (!tr) {
      tr = document.createElement("tr");
      rows[key] = tr;
      els.tbody.appendChild(tr);
    } else {
      tr.innerHTML = "";
    }
    tr.appendChild(renderSpriteCell(key));
    const nameTd = document.createElement("td");
    nameTd.textContent = key;
    tr.appendChild(nameTd);
    tr.appendChild(createCellInput(key, "health"));
    tr.appendChild(createCellInput(key, "damage"));
    tr.appendChild(createCellInput(key, "speed"));
    tr.appendChild(createCellInput(key, "scale"));
    tr.appendChild(createCellInput(key, "baseRadius"));
    tr.appendChild(createCellInput(key, "attackRange"));
    tr.appendChild(createCellInput(key, "cooldown"));
    tr.appendChild(createCellInput(key, "score"));
    tr.appendChild(createCellInput(key, "bossTier"));
    tr.appendChild(createTagsCell(key));

    const resetTd = document.createElement("td");
    const resetBtn = document.createElement("button");
    resetBtn.textContent = "Reset";
    resetBtn.className = "secondary";
    resetBtn.style.padding = "6px 8px";
    resetBtn.addEventListener("click", () => resetEnemy(key));
    resetTd.appendChild(resetBtn);
    tr.appendChild(resetTd);
  }

  function renderTable() {
    els.tbody.innerHTML = "";
    Object.keys(animTimers).forEach((k) => {
      clearInterval(animTimers[k]);
      delete animTimers[k];
    });
    currentCatalog =
      (window.BattlechurchEnemyCatalog && window.BattlechurchEnemyCatalog.catalog) ||
      catalog ||
      {};
    Object.keys(currentCatalog).forEach((key) => renderRow(key));
  }

  function show() {
    cfg = loadConfig();
    overrides = getOverrides(cfg);
    catalog =
      (window.BattlechurchEnemyCatalog && window.BattlechurchEnemyCatalog.catalog) ||
      {};
    renderTable();
    overlay.style.display = "block";
    setStatus("");
    window.__BC_ENEMY_EDITOR_ACTIVE = true;
    if (!assetRefreshTimer) {
      assetRefreshTimer = setInterval(() => {
        const ready = window.assets?.enemies && Object.keys(window.assets.enemies).length > 0;
        if (ready) {
          clearInterval(assetRefreshTimer);
          assetRefreshTimer = null;
          renderTable();
        }
      }, 400);
    }
  }

  function hide() {
    Object.keys(animTimers).forEach((k) => clearInterval(animTimers[k]));
    overlay.style.display = "none";
    window.__BC_ENEMY_EDITOR_ACTIVE = false;
    if (assetRefreshTimer) {
      clearInterval(assetRefreshTimer);
      assetRefreshTimer = null;
    }
  }

  function save() {
    cfg.globals = cfg.globals || {};
    cfg.globals.enemyStats = overrides;
    const ok = saveConfig(cfg);
    if (ok) {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const ss = String(now.getSeconds()).padStart(2, "0");
      setStatus(`Saved ${hh}:${mm}:${ss}`);
      // Apply to runtime definitions if possible
      if (window.BattlechurchEnemyDefinitions && typeof window.applyDevEnemyOverrides === "function") {
        try {
          window.BattlechurchEnemyDefinitions = window.applyDevEnemyOverrides(
            window.BattlechurchEnemyDefinitions,
          );
        } catch (e) {}
      }
    } else {
      setStatus("Save failed");
    }
  }

  // filter removed
  els.close.addEventListener("click", hide);
  els.save.addEventListener("click", save);

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
    getConfig: () => cfg,
  };
})(typeof window !== "undefined" ? window : null, typeof document !== "undefined" ? document : null);
