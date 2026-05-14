(function (window, document) {
  if (!window || !document) return;

  let onCloseCallback = null;
  let visible = false;
  let consumedAction = false;
  let focusedIndex = 0;
  let navHoldDir = null;
  let navHoldTimer = 0;
  let navCooldown = 0;
  let purchaseHistory = [];

  function getGraceCount() {
    return typeof window.getGraceCount === "function" ? window.getGraceCount() : 0;
  }

  function getStats() {
    const powerupManager = window.ChurchPowerups;
    if (powerupManager && typeof powerupManager.getOptions === "function") {
      return powerupManager.getOptions();
    }
    return [];
  }

  function attemptPurchase(statKey) {
    const powerupManager = window.ChurchPowerups;
    if (powerupManager && typeof powerupManager.purchase === "function") {
      return powerupManager.purchase(statKey);
    }
    return false;
  }

  function attemptRefund(statKey) {
    const powerupManager = window.ChurchPowerups;
    if (powerupManager && typeof powerupManager.refund === "function") {
      return powerupManager.refund(statKey);
    }
    return false;
  }

  function undoLastPurchase() {
    const lastKey = purchaseHistory.pop();
    if (!lastKey) return false;
    const refunded = attemptRefund(lastKey);
    if (!refunded) {
      purchaseHistory.push(lastKey);
      return false;
    }
    if (typeof window.playMenuItemPickSfx === "function") {
      window.playMenuItemPickSfx(0.45);
    }
    return true;
  }

  function resetPurchases() {
    let refundedAny = false;
    while (purchaseHistory.length > 0) {
      const key = purchaseHistory[purchaseHistory.length - 1];
      if (!attemptRefund(key)) break;
      purchaseHistory.pop();
      refundedAny = true;
    }
    if (refundedAny && typeof window.playMenuItemPickSfx === "function") {
      window.playMenuItemPickSfx(0.45);
    }
    return refundedAny;
  }

  function canPurchaseStat(stat, graceCount) {
    const level = Number.isFinite(stat?.level) ? stat.level : (stat?.owned ? 1 : 0);
    const maxLevel = Number.isFinite(stat?.maxLevel) ? stat.maxLevel : 1;
    const maxed = level >= maxLevel;
    return Boolean(stat && !stat.disabled && !maxed && graceCount >= stat.cost);
  }

  function show(callback) {
    onCloseCallback = typeof callback === "function" ? callback : null;
    visible = true;
    focusedIndex = 0;
    navHoldDir = null;
    navHoldTimer = 0;
    purchaseHistory = [];
    if (typeof window !== "undefined") {
      window.__churchUpgradeScreenActive = true;
      window.__announcementFocus = { key: "churchUpgradeScreen", index: 0 };
    }
  }

  function hide() {
    if (!visible) return;
    visible = false;
    navHoldDir = null;
    navHoldTimer = 0;
    if (typeof window !== "undefined") {
      window.__churchUpgradeScreenActive = false;
      window.__churchUpgradeScreenButtons = null;
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
    const uiFontFamily = window.UI_FONT_FAMILY || "'VT323', 'Press Start 2P', monospace";

    // Use renderer's drawChurchUpgradeScreen
    if (window.Renderer?.drawChurchUpgradeScreen) {
      window.Renderer.drawChurchUpgradeScreen(ctx, canvas, {
        graceCount,
        stats,
        uiFontFamily,
        backgroundMode: "transparent",
        dimAlpha: 0.5,
        undoAvailable: purchaseHistory.length > 0,
      });
    }
  }

  function handleKeyDown(event) {
    if (!visible) return;
    const stats = getStats();
    const statCount = stats.length;
    const continueIndex = statCount;
    const resetIndex = statCount + 1;
    const isOnContinue = focusedIndex === continueIndex;
    const isOnReset = focusedIndex === resetIndex;

    if (event.code === "ArrowLeft" || event.code === "KeyA") {
      event.preventDefault();
      if (isOnContinue) {
        focusedIndex = resetIndex;
        window.__announcementFocus = { key: "churchUpgradeScreen", index: focusedIndex };
        if (typeof window.playMenuMoveSfx === "function") window.playMenuMoveSfx(0.4);
        navCooldown = 0.18;
      } else if (isOnReset) {
        focusedIndex = continueIndex;
        window.__announcementFocus = { key: "churchUpgradeScreen", index: focusedIndex };
        if (typeof window.playMenuMoveSfx === "function") window.playMenuMoveSfx(0.4);
        navCooldown = 0.18;
      } else if (statCount > 0) {
        // Cycle within upgrade buttons
        focusedIndex = (focusedIndex - 1 + statCount) % statCount;
        window.__announcementFocus = { key: "churchUpgradeScreen", index: focusedIndex };
        if (typeof window.playMenuMoveSfx === "function") window.playMenuMoveSfx(0.4);
        navCooldown = 0.18;
      }
    } else if (event.code === "ArrowRight" || event.code === "KeyD") {
      event.preventDefault();
      if (isOnContinue) {
        focusedIndex = resetIndex;
        window.__announcementFocus = { key: "churchUpgradeScreen", index: focusedIndex };
        if (typeof window.playMenuMoveSfx === "function") window.playMenuMoveSfx(0.4);
        navCooldown = 0.18;
      } else if (isOnReset) {
        focusedIndex = continueIndex;
        window.__announcementFocus = { key: "churchUpgradeScreen", index: focusedIndex };
        if (typeof window.playMenuMoveSfx === "function") window.playMenuMoveSfx(0.4);
        navCooldown = 0.18;
      } else if (statCount > 0) {
        // Cycle within upgrade buttons
        focusedIndex = (focusedIndex + 1) % statCount;
        window.__announcementFocus = { key: "churchUpgradeScreen", index: focusedIndex };
        if (typeof window.playMenuMoveSfx === "function") window.playMenuMoveSfx(0.4);
        navCooldown = 0.18;
      }
    } else if (event.code === "ArrowDown" || event.code === "KeyS") {
      event.preventDefault();
      if (!isOnReset && !isOnContinue) {
        // Move to Continue button
        focusedIndex = continueIndex;
        window.__announcementFocus = { key: "churchUpgradeScreen", index: focusedIndex };
        if (typeof window.playMenuMoveSfx === "function") window.playMenuMoveSfx(0.4);
        navCooldown = 0.18;
      }
    } else if (event.code === "ArrowUp" || event.code === "KeyW") {
      event.preventDefault();
      if ((isOnContinue || isOnReset) && statCount > 0) {
        // Move back to first upgrade button
        focusedIndex = 0;
        window.__announcementFocus = { key: "churchUpgradeScreen", index: focusedIndex };
        if (typeof window.playMenuMoveSfx === "function") window.playMenuMoveSfx(0.4);
        navCooldown = 0.18;
      }
    } else if (event.code === "Space" || event.code === "Enter" || event.keyCode === 32) {
      // Confirm is handled in update() via Input.keysJustPressed so one key press
      // cannot trigger both keydown + update purchases.
      event.preventDefault();
    }
  }

  function moveFocus(direction) {
    if (!visible) return;
    const stats = getStats();
    const statCount = stats.length;
    const continueIndex = statCount;
    const resetIndex = statCount + 1;
    const isOnContinue = focusedIndex === continueIndex;
    const isOnReset = focusedIndex === resetIndex;
    let moved = false;

    if (direction === "left") {
      if (isOnContinue) {
        focusedIndex = resetIndex;
      } else if (isOnReset) {
        focusedIndex = continueIndex;
      } else if (statCount > 0) {
        focusedIndex = (focusedIndex - 1 + statCount) % statCount;
      }
      moved = true;
    } else if (direction === "right") {
      if (isOnContinue) {
        focusedIndex = resetIndex;
      } else if (isOnReset) {
        focusedIndex = continueIndex;
      } else if (statCount > 0) {
        focusedIndex = (focusedIndex + 1) % statCount;
      }
      moved = true;
    } else if (direction === "down" && !isOnReset && !isOnContinue) {
      focusedIndex = continueIndex;
      moved = true;
    } else if (direction === "up" && (isOnContinue || isOnReset) && statCount > 0) {
      focusedIndex = 0;
      moved = true;
    }

    if (moved) {
      window.__announcementFocus = { key: "churchUpgradeScreen", index: focusedIndex };
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
    const stats = getStats();
    const graceCount = getGraceCount();
    const statCount = stats.length;
    const continueIndex = statCount;
    const resetIndex = statCount + 1;
    const anyPurchasable = stats.some((stat) => canPurchaseStat(stat, graceCount));
    if (!anyPurchasable && focusedIndex < statCount) {
      focusedIndex = continueIndex;
      window.__announcementFocus = { key: "churchUpgradeScreen", index: focusedIndex };
    } else if (focusedIndex === resetIndex && purchaseHistory.length <= 0) {
      focusedIndex = continueIndex;
      window.__announcementFocus = { key: "churchUpgradeScreen", index: focusedIndex };
    }
    const confirmKeys = [" ", "enter", "Enter"];
    if (confirmKeys.some((k) => input.keysJustPressed?.has(k))) {
      confirmKeys.forEach((k) => input.keysJustPressed?.delete(k));
      activateFocused();
      return;
    }
    const undoKeys = ["escape", "Escape"];
    if (undoKeys.some((k) => input.keysJustPressed?.has(k))) {
      undoKeys.forEach((k) => input.keysJustPressed?.delete(k));
      undoLastPurchase();
      return;
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
    const continueIndex = statCount;
    const resetIndex = statCount + 1;
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
        if (purchased) {
          purchaseHistory.push(stat.key);
        }
      }
      return;
    }
    if (focusedIndex === resetIndex) {
      resetPurchases();
      return;
    }
    if (typeof window.playMenuAdvanceSfx === "function") {
      window.playMenuAdvanceSfx(0.55);
    }
    hide();
  }

  function handleCanvasPoint(x, y) {
    if (!visible) return;
    const buttons = window.__churchUpgradeScreenButtons?.buttons;
    if (!Array.isArray(buttons) || !buttons.length) return;

    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i];
      if (x >= btn.x && x <= btn.x + btn.width && y >= btn.y && y <= btn.y + btn.height) {
        if (btn.key === "continue") {
          if (typeof window.playMenuAdvanceSfx === "function") {
            window.playMenuAdvanceSfx(0.55);
          }
          hide();
        } else if (btn.key === "reset") {
          resetPurchases();
        } else if (btn.canAfford !== false) {
          const purchased = attemptPurchase(btn.key);
          if (purchased && typeof window.playMenuItemPickSfx === "function") {
            window.playMenuItemPickSfx(0.55);
          }
          if (purchased) {
            purchaseHistory.push(btn.key);
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
