(function (window, document) {
  if (!window || !document) return;

  let onCloseCallback = null;
  let visible = false;
  let consumedAction = false;
  let focusedIndex = 0;
  let navHoldDir = null;
  let navHoldTimer = 0;
  let navCooldown = 0;

  function getGraceCount() {
    return typeof window.getGraceCount === "function" ? window.getGraceCount() : 0;
  }

  function getStats() {
    const upgradeManager = window.UpgradePowerups;
    if (upgradeManager && typeof upgradeManager.getOptions === "function") {
      return upgradeManager.getOptions();
    }
    return [];
  }

  function attemptPurchase(statKey) {
    const upgradeManager = window.UpgradePowerups;
    if (upgradeManager && typeof upgradeManager.purchase === "function") {
      return upgradeManager.purchase(statKey);
    }
    return false;
  }

  function show(callback) {
    onCloseCallback = typeof callback === "function" ? callback : null;
    visible = true;
    focusedIndex = 0;
    navHoldDir = null;
    navHoldTimer = 0;
    if (typeof window !== "undefined") {
      window.__upgradeScreenActive = true;
      window.__announcementFocus = { key: "upgradeScreen", index: 0 };
    }
  }

  function hide() {
    if (!visible) return;
    visible = false;
    navHoldDir = null;
    navHoldTimer = 0;
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
        backgroundMode: "transparent",
      });
    }
  }

  function handleKeyDown(event) {
    if (!visible) return;
    const stats = getStats();
    const statCount = stats.length;
    const continueIndex = statCount; // Continue button is after all stats
    const isOnContinue = focusedIndex === continueIndex;

    if (event.code === "ArrowLeft" || event.code === "KeyA") {
      event.preventDefault();
      if (!isOnContinue && statCount > 0) {
        // Cycle within upgrade buttons
        focusedIndex = (focusedIndex - 1 + statCount) % statCount;
        window.__announcementFocus = { key: "upgradeScreen", index: focusedIndex };
        if (typeof window.playMenuMoveSfx === "function") window.playMenuMoveSfx(0.4);
        navCooldown = 0.18;
      }
    } else if (event.code === "ArrowRight" || event.code === "KeyD") {
      event.preventDefault();
      if (!isOnContinue && statCount > 0) {
        // Cycle within upgrade buttons
        focusedIndex = (focusedIndex + 1) % statCount;
        window.__announcementFocus = { key: "upgradeScreen", index: focusedIndex };
        if (typeof window.playMenuMoveSfx === "function") window.playMenuMoveSfx(0.4);
        navCooldown = 0.18;
      }
    } else if (event.code === "ArrowDown" || event.code === "KeyS") {
      event.preventDefault();
      if (!isOnContinue) {
        // Move to Continue button
        focusedIndex = continueIndex;
        window.__announcementFocus = { key: "upgradeScreen", index: focusedIndex };
        if (typeof window.playMenuMoveSfx === "function") window.playMenuMoveSfx(0.4);
        navCooldown = 0.18;
      }
    } else if (event.code === "ArrowUp" || event.code === "KeyW") {
      event.preventDefault();
      if (isOnContinue && statCount > 0) {
        // Move back to first upgrade button
        focusedIndex = 0;
        window.__announcementFocus = { key: "upgradeScreen", index: focusedIndex };
        if (typeof window.playMenuMoveSfx === "function") window.playMenuMoveSfx(0.4);
        navCooldown = 0.18;
      }
    } else if (event.code === "Space" || event.code === "Enter" || event.keyCode === 32) {
      event.preventDefault();
      activateFocused();
    }
  }

  function moveFocus(direction) {
    if (!visible) return;
    const stats = getStats();
    const statCount = stats.length;
    const continueIndex = statCount;
    const isOnContinue = focusedIndex === continueIndex;
    let moved = false;

    if (direction === "left" && !isOnContinue && statCount > 0) {
      focusedIndex = (focusedIndex - 1 + statCount) % statCount;
      moved = true;
    } else if (direction === "right" && !isOnContinue && statCount > 0) {
      focusedIndex = (focusedIndex + 1) % statCount;
      moved = true;
    } else if (direction === "down" && !isOnContinue) {
      focusedIndex = continueIndex;
      moved = true;
    } else if (direction === "up" && isOnContinue && statCount > 0) {
      focusedIndex = 0;
      moved = true;
    }

    if (moved) {
      window.__announcementFocus = { key: "upgradeScreen", index: focusedIndex };
      if (typeof window.playMenuMoveSfx === "function") {
        window.playMenuMoveSfx(0.4);
      }
    }
  }

  function update(dt) {
    if (!visible) return;
    const input = window.Input;
    if (!input || typeof input.isActionActive !== "function") return;
    if (navCooldown > 0) {
      navCooldown = Math.max(0, navCooldown - dt);
      return;
    }
    if (input.virtualInput?.enabled) {
      const confirmKeys = [" ", "enter"];
      if (confirmKeys.some((k) => input.keysJustPressed?.has(k))) {
        confirmKeys.forEach((k) => input.keysJustPressed?.delete(k));
        activateFocused();
        return;
      }
    }
    let dir = null;
    if (input.isActionActive("left")) dir = "left";
    else if (input.isActionActive("right")) dir = "right";
    else if (input.isActionActive("down")) dir = "down";
    else if (input.isActionActive("up")) dir = "up";

    if (!dir) {
      navHoldDir = null;
      navHoldTimer = 0;
      return;
    }

    const initialDelay = 0.28;
    const repeatDelay = 0.14;
    if (dir !== navHoldDir) {
      navHoldDir = dir;
      navHoldTimer = -initialDelay;
      moveFocus(dir);
      return;
    }

    navHoldTimer += dt;
    if (navHoldTimer >= 0) {
      moveFocus(dir);
      navHoldTimer -= repeatDelay;
    }
  }

  function activateFocused() {
    if (!visible) return;
    const stats = getStats();
    const statCount = stats.length;
    consumedAction = true;
    if (focusedIndex < statCount) {
      const stat = stats[focusedIndex];
      const level = Number.isFinite(stat?.level) ? stat.level : (stat?.owned ? 1 : 0);
      const maxLevel = Number.isFinite(stat?.maxLevel) ? stat.maxLevel : 1;
      const maxed = level >= maxLevel;
      const canPurchase = stat && !stat.disabled && !maxed && getGraceCount() >= stat.cost;
      if (canPurchase) {
        const purchased = attemptPurchase(stat.key);
        if (purchased && typeof window.playMenuItemPickSfx === "function") {
          window.playMenuItemPickSfx(0.55);
        }
      }
      return;
    }
    if (typeof window.playMenuAdvanceSfx === "function") {
      window.playMenuAdvanceSfx(0.55);
    }
    hide();
  }

  function handleCanvasPoint(x, y) {
    if (!visible) return;
    const buttons = window.__upgradeScreenButtons?.buttons;
    if (!Array.isArray(buttons) || !buttons.length) return;

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

  function handleClick(event) {
    if (!visible) return;
    const canvas = document.getElementById("gameCanvas");
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    handleCanvasPoint(x, y);
  }

  function handleCanvasClick(pos) {
    if (!pos || typeof pos.x !== "number" || typeof pos.y !== "number") return;
    handleCanvasPoint(pos.x, pos.y);
  }

  window.addEventListener("keydown", handleKeyDown, { passive: false });
  document.addEventListener("click", handleClick);

  window.UpgradeScreen = {
    show,
    hide,
    draw,
    isVisible: () => visible,
    refresh: () => {},
    selectFocused: activateFocused,
    update,
    handleCanvasClick,
    consumeAction() {
      const wasConsumed = consumedAction;
      consumedAction = false;
      return wasConsumed;
    },
  };
})(typeof window !== "undefined" ? window : null, typeof document !== "undefined" ? document : null);
