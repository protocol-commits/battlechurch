(function (window, document) {
  if (!window || !document) return;
  const StatsManager = window.StatsManager;

  const overlay = document.createElement("div");
  overlay.className = "upgrade-overlay hidden magazine-overlay";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = `
    <div class="upgrade-overlay__panel magazine-panel">
      <div class="upgrade-overlay__header">
        <h1>Stat Upgrade</h1>
      </div>
      <div class="upgrade-overlay__keys">
        <span class="keys-label">Keys</span>
        <span class="keys-value" data-upgrade-keys>0</span>
      </div>
      <div class="upgrade-overlay__grid" data-upgrade-grid></div>
      <div class="upgrade-overlay__actions">
        <button type="button" class="upgrade-overlay__confirm" data-upgrade-confirm>Continue (Space)</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const gridElement = overlay.querySelector("[data-upgrade-grid]");
  const keysElement = overlay.querySelector("[data-upgrade-keys]");
  const confirmButton = overlay.querySelector("[data-upgrade-confirm]");
  const headerTitle = overlay.querySelector(".upgrade-overlay__header h1");

  let onCloseCallback = null;
  let visible = false;
  let consumedAction = false;

  function getKeyCount() {
    return typeof window.getKeyCount === "function" ? window.getKeyCount() : 0;
  }

  function attemptPurchase(statKey) {
    if (!StatsManager) return;
    const cost = StatsManager.getUpgradeCost(statKey);
    const currentKeys = getKeyCount();
    if (currentKeys < cost) {
      return false;
    }
    window.addKeys?.(-cost);
    StatsManager.applyUpgrade(statKey);
    renderRows();
    updateKeyDisplay();
    return true;
  }

  function createRow(statKey) {
    if (!StatsManager) return "";
    const label = StatsManager.getStatLabel(statKey);
    const description = StatsManager.getStatDescription(statKey);
    const value = StatsManager.getStatDisplayString(statKey);
    const cost = StatsManager.getUpgradeCost(statKey);
    const canAfford = getKeyCount() >= cost;
    const isDisabled = !canAfford ? "disabled" : "";
    return `
      <div class="upgrade-row">
        <div class="upgrade-row__info">
          <div class="upgrade-row__label">${label}</div>
          <div class="upgrade-row__desc">${description}</div>
        </div>
        <div class="upgrade-row__value">${value}</div>
        <button type="button" class="upgrade-row__button" ${isDisabled} data-stat="${statKey}">
          Upgrade +${cost} keys
        </button>
      </div>
    `;
  }

  function renderRows() {
    if (!gridElement || !StatsManager) return;
    const rows = StatsManager.getStatKeys().map((key) => createRow(key)).join("");
    gridElement.innerHTML = rows;
  }

  function updateKeyDisplay() {
    if (!keysElement) return;
    keysElement.textContent = getKeyCount();
  }

  function typewriter(el, text, msPerChar = 18) {
    if (!el) return;
    if (el.__typeTimer) clearInterval(el.__typeTimer);
    el.textContent = "";
    let idx = 0;
    const payload = String(text || "");
    el.__typeTimer = setInterval(() => {
      idx += 1;
      el.textContent = payload.slice(0, idx);
      if (idx >= payload.length) {
        clearInterval(el.__typeTimer);
        el.__typeTimer = null;
      }
    }, msPerChar);
  }

  function show(callback) {
    if (!overlay) return;
    renderRows();
    updateKeyDisplay();
    onCloseCallback = typeof callback === "function" ? callback : null;
    overlay.classList.remove("hidden");
    overlay.classList.add("visible");
    overlay.setAttribute("aria-hidden", "false");
    visible = true;
    if (headerTitle) typewriter(headerTitle, headerTitle.textContent || "", 18);
  }

  function hide() {
    if (!overlay || !visible) return;
    overlay.classList.remove("visible");
    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden", "true");
    visible = false;
    if (typeof window.consumePauseAction === "function") {
      window.consumePauseAction();
    }
    if (typeof onCloseCallback === "function") {
      const cb = onCloseCallback;
      onCloseCallback = null;
      cb();
    }
  }

  function handleKeyDown(event) {
    if (!visible) return;
    if (event.code === "Space" || event.keyCode === 32) {
      event.preventDefault();
      consumedAction = true;
      if (typeof window !== "undefined" && typeof window.playMenuAdvanceSfx === "function") {
        window.playMenuAdvanceSfx(0.55);
      }
      hide();
    }
  }

  function handleGridClick(event) {
    const button = event.target.closest(".upgrade-row__button");
    if (!button || !visible) return;
    const statKey = button.getAttribute("data-stat");
    if (!statKey) return;
    const purchased = attemptPurchase(statKey);
    if (purchased && typeof window !== "undefined" && typeof window.playMenuItemPickSfx === "function") {
      window.playMenuItemPickSfx(0.55);
    }
  }

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      return;
    }
  });

  gridElement.addEventListener("click", handleGridClick);
  confirmButton.addEventListener("click", () => {
    if (typeof window !== "undefined" && typeof window.playMenuAdvanceSfx === "function") {
      window.playMenuAdvanceSfx(0.55);
    }
    hide();
  });
  window.addEventListener("keydown", handleKeyDown, { passive: false });

  window.UpgradeScreen = {
    show,
    hide,
    isVisible: () => visible,
    refresh: () => {
      if (visible) {
        renderRows();
        updateKeyDisplay();
      }
    },
    consumeAction() {
      const wasConsumed = consumedAction;
      consumedAction = false;
      return wasConsumed;
    },
  };
})(typeof window !== "undefined" ? window : null, typeof document !== "undefined" ? document : null);
