(function (window, document) {
  if (!window || !document) return;
  const StatsManager = window.StatsManager;

  let onCloseCallback = null;
  let visible = false;
  let consumedAction = false;
  let focusedIndex = 0;

  function getGraceCount() {
    return typeof window.getGraceCount === "function" ? window.getGraceCount() : 0;
  }

  function getStats() {
    if (!StatsManager) return [];
    return StatsManager.getStatKeys()
      .filter((key) => key !== "damage_resistance")
      .map((key) => ({
        key,
        label: StatsManager.getStatLabel(key),
        description: StatsManager.getStatDescription(key),
        value: StatsManager.getStatDisplayString(key),
        cost: StatsManager.getUpgradeCost(key),
      }));
  }

  function attemptPurchase(statKey) {
    if (!StatsManager) return false;
    const cost = StatsManager.getUpgradeCost(statKey);
    const currentGrace = getGraceCount();
    if (currentGrace < cost) return false;
    window.addGrace?.(-cost);
    StatsManager.applyUpgrade(statKey);
    return true;
  }

  function show(callback) {
    onCloseCallback = typeof callback === "function" ? callback : null;
    visible = true;
    focusedIndex = 0;
    if (typeof window !== "undefined") {
      window.__upgradeScreenActive = true;
      window.__announcementFocus = { key: "upgradeScreen", index: 0 };
    }
  }

  function hide() {
    if (!visible) return;
    visible = false;
    if (typeof window !== "undefined") {
      window.__upgradeScreenActive = false;
      window.__upgradeScreenButtons = null;
      window.__announcementFocus = null;
    }
    if (typeof window.consumePauseAction === "function") {
      window.consumePauseAction();
    }
    if (typeof onCloseCallback === "function") {
      const cb = onCloseCallback;
      onCloseCallback = null;
      cb();
    }
  }

  function draw() {
    if (!visible) return;
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    const stats = getStats();
    const graceCount = getGraceCount();
    const uiFontFamily = window.UI_FONT_FAMILY || "'Orbitron', sans-serif";

    // Use renderer's drawUpgradeScreen
    if (window.Renderer?.drawUpgradeScreen) {
      window.Renderer.drawUpgradeScreen(ctx, canvas, {
        graceCount,
        stats,
        uiFontFamily,
      });
    }
  }

  function handleKeyDown(event) {
    if (!visible) return;
    const stats = getStats();
    const totalButtons = stats.length + 1; // stats + continue

    if (event.code === "ArrowLeft" || event.code === "KeyA") {
      event.preventDefault();
      focusedIndex = (focusedIndex - 1 + totalButtons) % totalButtons;
      window.__announcementFocus = { key: "upgradeScreen", index: focusedIndex };
      if (typeof window.playMenuMoveSfx === "function") window.playMenuMoveSfx(0.4);
    } else if (event.code === "ArrowRight" || event.code === "KeyD") {
      event.preventDefault();
      focusedIndex = (focusedIndex + 1) % totalButtons;
      window.__announcementFocus = { key: "upgradeScreen", index: focusedIndex };
      if (typeof window.playMenuMoveSfx === "function") window.playMenuMoveSfx(0.4);
    } else if (event.code === "Space" || event.code === "Enter" || event.keyCode === 32) {
      event.preventDefault();
      consumedAction = true;

      if (focusedIndex < stats.length) {
        // Upgrade stat
        const stat = stats[focusedIndex];
        if (stat && getGraceCount() >= stat.cost) {
          const purchased = attemptPurchase(stat.key);
          if (purchased && typeof window.playMenuItemPickSfx === "function") {
            window.playMenuItemPickSfx(0.55);
          }
        }
      } else {
        // Continue button
        if (typeof window.playMenuAdvanceSfx === "function") {
          window.playMenuAdvanceSfx(0.55);
        }
        hide();
      }
    }
  }

  function handleClick(event) {
    if (!visible) return;
    const buttons = window.__upgradeScreenButtons?.buttons;
    if (!Array.isArray(buttons) || !buttons.length) return;

    const canvas = document.getElementById("gameCanvas");
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i];
      if (x >= btn.x && x <= btn.x + btn.width && y >= btn.y && y <= btn.y + btn.height) {
        if (btn.key === "continue") {
          if (typeof window.playMenuAdvanceSfx === "function") {
            window.playMenuAdvanceSfx(0.55);
          }
          hide();
        } else if (btn.canAfford !== false) {
          const purchased = attemptPurchase(btn.key);
          if (purchased && typeof window.playMenuItemPickSfx === "function") {
            window.playMenuItemPickSfx(0.55);
          }
        }
        break;
      }
    }
  }

  window.addEventListener("keydown", handleKeyDown, { passive: false });
  document.addEventListener("click", handleClick);

  window.UpgradeScreen = {
    show,
    hide,
    draw,
    isVisible: () => visible,
    refresh: () => {},
    consumeAction() {
      const wasConsumed = consumedAction;
      consumedAction = false;
      return wasConsumed;
    },
  };
})(typeof window !== "undefined" ? window : null, typeof document !== "undefined" ? document : null);
