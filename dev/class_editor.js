(function setupClassEditor(window, document) {
  if (!window || !document) return;

  const OVERLAY_ID = "classEditorOverlay";
  const STORAGE_KEY = "battlechurch.devClassConfigDraft";

  const FIELD_GROUPS = [
    {
      key: "player",
      label: "Player",
      fields: [
        "meleeDamageMultiplier",
        "projectileDamageMultiplier",
        "cooldownMultiplier",
        "moveSpeedMultiplier",
        "prayerGainMultiplier",
        "smiteChargeRateMultiplier",
        "smiteDamageMultiplier",
      ],
    },
    {
      key: "npc",
      label: "NPC",
      fields: ["rofMultiplier", "damageMultiplier", "faithGainMultiplier"],
    },
    {
      key: "powerups",
      label: "Powerups",
      fields: [
        "wisdomWeightMultiplier",
        "scriptureWeightMultiplier",
        "faithWeightMultiplier",
        "perseveranceWeightMultiplier",
      ],
    },
    {
      key: "churchUpgrades",
      label: "Church Upgrades",
      fields: ["costMultiplier", "effectMultiplier"],
    },
    {
      key: "economy",
      label: "Economy",
      fields: ["graceGainMultiplier"],
    },
  ];

  function deepClone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_e) {
      return null;
    }
  }

  function formatLabel(key) {
    return String(key || "")
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (s) => s.toUpperCase())
      .trim();
  }

  function readSourceConfig() {
    const cfg = window.BattlechurchClassConfig || {};
    return {
      defaultClassId: String(cfg.defaultClassId || "class1"),
      legacyIdMap: deepClone(cfg.legacyIdMap || {}),
      classes: deepClone(Array.isArray(cfg.classes) ? cfg.classes : []),
    };
  }

  function loadDraftOrSource() {
    const source = readSourceConfig();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return source;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return source;
      if (!Array.isArray(parsed.classes) || !parsed.classes.length) return source;
      return {
        defaultClassId: String(parsed.defaultClassId || source.defaultClassId || "class1"),
        legacyIdMap: deepClone(parsed.legacyIdMap || source.legacyIdMap || {}),
        classes: deepClone(parsed.classes),
      };
    } catch (_e) {
      return source;
    }
  }

  function saveDraft(state) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          defaultClassId: state.defaultClassId,
          legacyIdMap: state.legacyIdMap,
          classes: state.classes,
        }),
      );
      return true;
    } catch (_e) {
      return false;
    }
  }

  function buildConfigFileSource(state) {
    const body = `(function setupBattlechurchClasses(global) {\n` +
`  if (!global) return;\n\n` +
`  const DEFAULT_CLASS_ID = ${JSON.stringify(state.defaultClassId || "class1")};\n\n` +
`  const classes = ${JSON.stringify(state.classes, null, 2)};\n\n` +
`  const byId = Object.freeze(\n` +
`    classes.reduce((acc, entry) => {\n` +
`      if (!entry || !entry.id) return acc;\n` +
`      acc[entry.id] = Object.freeze(entry);\n` +
`      return acc;\n` +
`    }, {}),\n` +
`  );\n\n` +
`  const legacyIdMap = Object.freeze(${JSON.stringify(state.legacyIdMap || {}, null, 2)});\n\n` +
`  global.BattlechurchClassConfig = Object.freeze({\n` +
`    defaultClassId: DEFAULT_CLASS_ID,\n` +
`    classes: Object.freeze(classes.map((entry) => byId[entry.id])),\n` +
`    byId,\n` +
`    legacyIdMap,\n` +
`  });\n` +
`})(typeof window !== "undefined" ? window : null);\n`;
    return body;
  }

  const state = {
    open: false,
    config: loadDraftOrSource(),
    selectedClassId: null,
  };
  state.selectedClassId = state.config.classes[0]?.id || null;

  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.style.cssText = "position:fixed;inset:0;display:none;z-index:99999;background:rgba(6,10,16,.82);backdrop-filter:blur(2px);";
  overlay.innerHTML = `
    <div style="position:absolute;inset:26px;border:2px solid rgba(255,218,162,.34);border-radius:14px;background:linear-gradient(180deg,rgba(12,18,30,.96),rgba(7,10,18,.96));box-shadow:0 18px 40px rgba(0,0,0,.5);display:grid;grid-template-columns:280px 1fr;overflow:hidden;">
      <div style="border-right:1px solid rgba(255,214,148,.24);padding:14px;display:grid;grid-template-rows:auto auto 1fr auto;gap:10px;">
        <div style="font:700 20px Orbitron,sans-serif;color:#ffd978;">Class Dev</div>
        <label style="display:grid;gap:5px;font:600 12px Orbitron,sans-serif;color:#e8d2ae;">
          Active Class
          <select id="classEditorClassSelect" style="padding:8px;border-radius:8px;border:1px solid rgba(255,196,98,.42);background:rgba(16,20,28,.95);color:#f6e4c8;"></select>
        </label>
        <div id="classEditorClassMeta" style="font:500 12px Orbitron,sans-serif;color:rgba(231,176,102,.85);line-height:1.5;"></div>
        <div style="display:grid;gap:8px;">
          <button data-action="save-draft" style="padding:9px;border-radius:8px;border:1px solid rgba(255,196,98,.42);background:rgba(255,154,58,.16);color:#f6e4c8;font:600 13px Orbitron,sans-serif;">Save Draft (Local)</button>
          <button data-action="reset-class" style="padding:9px;border-radius:8px;border:1px solid rgba(255,196,98,.42);background:rgba(255,154,58,.10);color:#f6e4c8;font:600 13px Orbitron,sans-serif;">Reset Selected Class</button>
          <button data-action="reset-all" style="padding:9px;border-radius:8px;border:1px solid rgba(255,196,98,.42);background:rgba(255,154,58,.10);color:#f6e4c8;font:600 13px Orbitron,sans-serif;">Reset All Classes</button>
          <button data-action="save-file" style="padding:10px;border-radius:8px;border:1px solid #4f8d45;background:#254122;color:#e8edf7;font:700 13px Orbitron,sans-serif;">Save Config File</button>
          <button data-action="close" style="padding:9px;border-radius:8px;border:1px solid rgba(255,196,98,.42);background:rgba(24,20,24,.9);color:#f6e4c8;font:600 13px Orbitron,sans-serif;">Close</button>
          <div id="classEditorStatus" style="font:500 12px Orbitron,sans-serif;color:rgba(231,176,102,.9);min-height:16px;"></div>
        </div>
      </div>
      <div style="padding:14px;overflow:auto;">
        <div id="classEditorFieldRoot" style="display:grid;gap:14px;"></div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const classSelect = overlay.querySelector("#classEditorClassSelect");
  const classMeta = overlay.querySelector("#classEditorClassMeta");
  const fieldRoot = overlay.querySelector("#classEditorFieldRoot");
  const statusEl = overlay.querySelector("#classEditorStatus");

  function getSelectedClass() {
    return state.config.classes.find((entry) => entry.id === state.selectedClassId) || null;
  }

  function setStatus(text) {
    if (!statusEl) return;
    statusEl.textContent = String(text || "");
  }

  function clampNum(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return 1;
    return Math.max(0, Math.min(10, num));
  }

  function ensureTuningShape(entry) {
    if (!entry.tuning || typeof entry.tuning !== "object") entry.tuning = {};
    FIELD_GROUPS.forEach((group) => {
      if (!entry.tuning[group.key] || typeof entry.tuning[group.key] !== "object") {
        entry.tuning[group.key] = {};
      }
      group.fields.forEach((field) => {
        if (!Number.isFinite(entry.tuning[group.key][field])) {
          entry.tuning[group.key][field] = 1.0;
        }
      });
    });
  }

  function renderClassMeta() {
    const selected = getSelectedClass();
    if (!selected) {
      classMeta.textContent = "";
      return;
    }
    classMeta.innerHTML = `
      <div><strong>Name:</strong> ${selected.classTitle || selected.id}</div>
      <div><strong>Description:</strong> ${selected.classDescription || "-"}</div>
      <div><strong>Flavor:</strong> ${selected.classFlavor || "-"}</div>
    `;
  }

  function renderFields() {
    const selected = getSelectedClass();
    if (!selected || !fieldRoot) {
      fieldRoot.innerHTML = "";
      return;
    }
    ensureTuningShape(selected);
    const sections = FIELD_GROUPS.map((group) => {
      const rows = group.fields
        .map((field) => {
          const value = clampNum(selected.tuning[group.key][field]);
          return `
            <label style="display:grid;grid-template-columns:260px 120px;gap:10px;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,214,148,.12);">
              <span style="font:600 13px Orbitron,sans-serif;color:#f0dfc3;">${formatLabel(field)}</span>
              <input data-group="${group.key}" data-field="${field}" type="number" step="0.05" min="0" max="10" value="${value.toFixed(2)}"
                style="padding:6px 8px;border-radius:6px;border:1px solid rgba(255,196,98,.42);background:rgba(16,20,28,.95);color:#f6e4c8;font:600 13px Orbitron,sans-serif;" />
            </label>
          `;
        })
        .join("");
      return `
        <section style="border:1px solid rgba(255,214,148,.2);border-radius:10px;padding:10px 12px;background:rgba(10,14,22,.75);">
          <div style="font:700 14px Orbitron,sans-serif;color:#ffd978;margin-bottom:8px;">${group.label}</div>
          ${rows}
        </section>
      `;
    }).join("");
    fieldRoot.innerHTML = sections;
    fieldRoot.querySelectorAll("input[data-group][data-field]").forEach((input) => {
      input.addEventListener("input", () => {
        const cls = getSelectedClass();
        if (!cls) return;
        const group = String(input.getAttribute("data-group") || "");
        const field = String(input.getAttribute("data-field") || "");
        const next = clampNum(input.value);
        cls.tuning[group][field] = next;
      });
    });
  }

  function renderClassSelect() {
    if (!classSelect) return;
    const options = state.config.classes.map((entry) => {
      const selected = entry.id === state.selectedClassId ? " selected" : "";
      return `<option value="${entry.id}"${selected}>${entry.classTitle || entry.id}</option>`;
    }).join("");
    classSelect.innerHTML = options;
    classSelect.onchange = () => {
      state.selectedClassId = String(classSelect.value || "");
      renderClassMeta();
      renderFields();
    };
  }

  function resetClass(entry) {
    if (!entry) return;
    ensureTuningShape(entry);
    FIELD_GROUPS.forEach((group) => {
      group.fields.forEach((field) => {
        entry.tuning[group.key][field] = 1.0;
      });
    });
  }

  function saveConfigFile() {
    const body = buildConfigFileSource(state.config);
    const blob = new Blob([body], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "config_classes.js";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  overlay.addEventListener("click", (e) => {
    const action = e.target?.getAttribute?.("data-action");
    if (!action) return;
    if (action === "close") {
      api.hide();
      return;
    }
    if (action === "save-draft") {
      setStatus(saveDraft(state.config) ? "Draft saved locally." : "Draft save failed.");
      return;
    }
    if (action === "reset-class") {
      resetClass(getSelectedClass());
      renderFields();
      setStatus("Selected class reset to 1.00.");
      return;
    }
    if (action === "reset-all") {
      state.config.classes.forEach((entry) => resetClass(entry));
      renderFields();
      setStatus("All classes reset to 1.00.");
      return;
    }
    if (action === "save-file") {
      saveConfigFile();
      setStatus("Config file exported.");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (!state.open) return;
    if (e.key === "Escape") {
      e.preventDefault();
      api.hide();
    }
  }, true);

  const api = {
    show() {
      state.config = loadDraftOrSource();
      state.selectedClassId = state.config.classes[0]?.id || null;
      renderClassSelect();
      renderClassMeta();
      renderFields();
      setStatus("");
      overlay.style.display = "block";
      state.open = true;
    },
    hide() {
      overlay.style.display = "none";
      state.open = false;
    },
    isOpen() {
      return state.open;
    },
  };

  window.BattlechurchClassEditor = api;
})(typeof window !== "undefined" ? window : null, typeof document !== "undefined" ? document : null);

