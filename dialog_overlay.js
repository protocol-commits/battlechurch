(function (window, document) {
  if (!window || !document) return;

  const overlay = document.createElement("div");
  overlay.className = "dialog-overlay hidden";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = `
    <div class="dialog-overlay__panel">
      <h2 class="dialog-overlay__title"></h2>
      <div class="dialog-overlay__body"></div>
      <button type="button" class="dialog-overlay__button">Continue</button>
    </div>
  `;

  const root = document.getElementById("appRoot") || document.body;
  root.appendChild(overlay);

  const titleEl = overlay.querySelector(".dialog-overlay__title");
  const bodyEl = overlay.querySelector(".dialog-overlay__body");
  const button = overlay.querySelector(".dialog-overlay__button");
  let continueCallback = null;
  let variantClass = null;
  let consumedAction = false;
  let visible = false;
  let hideTimer = null;
  let focusedControlIndex = 0;
  let navHoldDir = 0;
  let navNextTime = 0;
  let confirmHeld = false;
  let backHeld = false;
  let boundsRafId = null;
  let lastBoundsKey = "";
  const PANEL_DEFAULT_CSS_VARS = [
    "--hellfire-default-panel-width-max",
    "--hellfire-default-panel-width-ratio",
    "--hellfire-default-title-transform",
    "--hellfire-default-title-align",
    "--hellfire-default-title-color",
    "--hellfire-default-title-size",
    "--hellfire-default-divider-inset-x",
    "--hellfire-default-divider-margin-top",
  ];

  function getFrameRect() {
    const canvas = document.getElementById("gameCanvas");
    if (canvas && typeof canvas.getBoundingClientRect === "function") {
      const rect = canvas.getBoundingClientRect();
      if (rect && rect.width > 0 && rect.height > 0) {
        return rect;
      }
    }
    const rootRect = root && typeof root.getBoundingClientRect === "function"
      ? root.getBoundingClientRect()
      : null;
    if (rootRect && rootRect.width > 0 && rootRect.height > 0) {
      return rootRect;
    }
    return {
      left: 0,
      top: 0,
      width: window.innerWidth || 0,
      height: window.innerHeight || 0,
    };
  }

  function syncOverlayBounds() {
    const rect = getFrameRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const left = Math.round(rect.left);
    const top = Math.round(rect.top);
    const boundsKey = `${left}|${top}|${width}|${height}`;
    if (boundsKey === lastBoundsKey) return;
    lastBoundsKey = boundsKey;
    overlay.style.left = `${left}px`;
    overlay.style.top = `${top}px`;
    overlay.style.width = `${width}px`;
    overlay.style.height = `${height}px`;
    const scale = Math.max(0.65, Math.min(1.25, width / 1280));
    overlay.style.setProperty("--dialog-frame-scale", String(scale));
  }

  function startBoundsSync() {
    if (boundsRafId !== null) return;
    const tick = () => {
      boundsRafId = window.requestAnimationFrame(tick);
      syncOverlayBounds();
    };
    boundsRafId = window.requestAnimationFrame(tick);
  }

  function stopBoundsSync() {
    if (boundsRafId === null) return;
    window.cancelAnimationFrame(boundsRafId);
    boundsRafId = null;
    lastBoundsKey = "";
  }

  function getNavigableControls() {
    return Array.from(
      overlay.querySelectorAll(
        "button, input, select, textarea"
      )
    ).filter((el) => {
      if (!el || el.disabled) return false;
      if (el.offsetParent === null) return false;
      return true;
    });
  }

  function focusControl(index, { playSound = false } = {}) {
    const controls = getNavigableControls();
    if (!controls.length) return null;
    const nextIndex = Math.max(0, Math.min(controls.length - 1, index));
    const nextControl = controls[nextIndex];
    const previousControl = controls[focusedControlIndex] || null;
    focusedControlIndex = nextIndex;
    if (playSound && previousControl !== nextControl && typeof window?.playMenuMoveSfx === "function") {
      window.playMenuMoveSfx(0.45);
    }
    try {
      nextControl.focus({ preventScroll: true });
    } catch (e) {
      nextControl.focus();
    }
    return nextControl;
  }

  function syncFocusedControl() {
    const controls = getNavigableControls();
    if (!controls.length) {
      focusedControlIndex = 0;
      return null;
    }
    const activeIndex = controls.indexOf(document.activeElement);
    if (activeIndex >= 0) {
      focusedControlIndex = activeIndex;
      return controls[activeIndex];
    }
    return focusControl(Math.min(focusedControlIndex, controls.length - 1));
  }

  function moveFocus(direction) {
    const controls = getNavigableControls();
    if (!controls.length) return false;
    syncFocusedControl();
    const nextIndex = (focusedControlIndex + direction + controls.length) % controls.length;
    focusControl(nextIndex, { playSound: true });
    return true;
  }

  function activateFocusedControl() {
    const activeControl = syncFocusedControl();
    if (!activeControl || activeControl.disabled) return false;
    if (activeControl.tagName === "BUTTON") {
      activeControl.click();
      return true;
    }
    if (activeControl.type === "checkbox") {
      activeControl.click();
      return true;
    }
    if (activeControl.type === "range") {
      return true;
    }
    activeControl.click?.();
    return true;
  }

  function adjustFocusedControl(direction) {
    const activeControl = syncFocusedControl();
    if (!activeControl || activeControl.disabled) return false;
    if (activeControl.type === "checkbox") {
      const nextChecked = direction > 0;
      if (Boolean(activeControl.checked) !== nextChecked) {
        activeControl.checked = nextChecked;
        activeControl.dispatchEvent(new Event("change", { bubbles: true }));
      }
      return true;
    }
    if (activeControl.type === "range") {
      const current = Number(activeControl.value);
      const step = Number(activeControl.step) || 1;
      const min = Number(activeControl.min);
      const max = Number(activeControl.max);
      const next = Math.max(
        Number.isFinite(min) ? min : current - step,
        Math.min(Number.isFinite(max) ? max : current + step, current + step * direction)
      );
      if (next !== current) {
        activeControl.value = String(next);
        activeControl.dispatchEvent(new Event("input", { bubbles: true }));
        activeControl.dispatchEvent(new Event("change", { bubbles: true }));
      }
      return true;
    }
    return true;
  }

  function show({
    title = "",
    body = "",
    bodyHtml = "",
    buttonText = "Continue",
    onContinue = null,
    variant = "",
    onRender = null,
  }) {
    if (!overlay) return;
    overlay.classList.remove("dialog-overlay--panel-default");
    PANEL_DEFAULT_CSS_VARS.forEach((key) => overlay.style.removeProperty(key));
    if (titleEl) titleEl.style.cssText = "";
    if (bodyEl) bodyEl.style.cssText = "";
    titleEl.textContent = title;
    if (bodyHtml) {
      bodyEl.innerHTML = bodyHtml;
    } else {
      bodyEl.textContent = body;
    }
    button.textContent = buttonText;
    button.style.display = buttonText ? "inline-block" : "none";
    button.disabled = false;
    continueCallback = typeof onContinue === "function" ? onContinue : null;
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    overlay.classList.remove("hidden");
    overlay.classList.add("visible");
    overlay.setAttribute("aria-hidden", "false");
    if (variantClass) {
      overlay.classList.remove(variantClass);
      variantClass = null;
    }
    if (variant) {
      variantClass = `dialog-overlay--${variant}`;
      overlay.classList.add(variantClass);
    }
    syncOverlayBounds();
    startBoundsSync();
    if (typeof onRender === "function") {
      try {
        onRender({ overlay, bodyEl, buttonEl: button, variant });
      } catch (e) {}
    }
    const keysPressed = window.Input?.keysPressed;
    confirmHeld = Boolean(
      keysPressed && (keysPressed.has(" ") || keysPressed.has("enter") || keysPressed.has("Enter"))
    );
    backHeld = Boolean(
      keysPressed && (keysPressed.has("escape") || keysPressed.has("Escape"))
    );
    focusedControlIndex = 0;
    navHoldDir = 0;
    navNextTime = 0;
    syncFocusedControl();
    visible = true;
  }

  function hide() {
    if (!overlay || !visible) return;
    const activeElement = document.activeElement;
    if (activeElement && overlay.contains(activeElement) && typeof activeElement.blur === "function") {
      activeElement.blur();
    }
    overlay.classList.remove("visible");
    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden", "true");
    if (document.body && typeof document.body.focus === "function") {
      try {
        document.body.focus({ preventScroll: true });
      } catch (e) {
        document.body.focus();
      }
    }
    visible = false;
    stopBoundsSync();
    if (variantClass) {
      const classToRemove = variantClass;
      hideTimer = setTimeout(() => {
        overlay.classList.remove(classToRemove);
        if (variantClass === classToRemove) {
          variantClass = null;
        }
        hideTimer = null;
      }, 200);
    }
  }

  function handleContinue() {
    if (button.disabled) return;
    consumedAction = true;
    const keysPressed = window.Input?.keysPressed;
    if (keysPressed && (keysPressed.has("enter") || keysPressed.has("Enter") || keysPressed.has(" "))) {
      window.__battlechurchSuppressMenuConfirmUntilRelease = true;
    }
    if (window.Input?.keysJustPressed) {
      window.Input.keysJustPressed.delete(" ");
      window.Input.keysJustPressed.delete("enter");
      window.Input.keysJustPressed.delete("Enter");
      window.Input.keysJustPressed.delete("escape");
      window.Input.keysJustPressed.delete("Escape");
    }
    if (typeof window !== "undefined" && typeof window.playMenuAdvanceSfx === "function") {
      window.playMenuAdvanceSfx(0.55);
    }
    if (continueCallback) continueCallback();
    hide();
  }

  function handleKeyDown(event) {
    if (!visible) return;
    const target = event?.target;
    const tagName = String(target?.tagName || "").toLowerCase();
    const inputType = String(target?.type || "").toLowerCase();
    const isTextEntryTarget =
      (tagName === "input" &&
        !["button", "checkbox", "radio", "range", "submit", "reset"].includes(inputType)) ||
      tagName === "textarea";
    // While typing in text fields, do not hijack WASD/arrow/space for menu nav.
    if (isTextEntryTarget) {
      return;
    }
    const key = String(event.key || "");
    if (key === "ArrowUp" || key === "w" || key === "W") {
      event.preventDefault();
      moveFocus(-1);
      return;
    }
    if (key === "ArrowDown" || key === "s" || key === "S") {
      event.preventDefault();
      moveFocus(1);
      return;
    }
    if (key === "ArrowLeft" || key === "a" || key === "A") {
      event.preventDefault();
      if (!adjustFocusedControl(-1)) moveFocus(-1);
      return;
    }
    if (key === "ArrowRight" || key === "d" || key === "D") {
      event.preventDefault();
      if (!adjustFocusedControl(1)) moveFocus(1);
      return;
    }
    if (event.code === "Enter" || key === "Enter" || event.code === "Space" || event.keyCode === 32) {
      event.preventDefault();
      activateFocusedControl();
      return;
    }
    if (key === "Escape") {
      if (button.disabled) return;
      event.preventDefault();
      handleContinue();
    }
  }

  function updateNavigation() {
    if (visible && window.Input && typeof window.Input.isActionActive === "function") {
      const activeEl = document?.activeElement;
      const activeTag = String(activeEl?.tagName || "").toLowerCase();
      const activeType = String(activeEl?.type || "").toLowerCase();
      const textEntryFocused =
        (activeTag === "input" &&
          !["button", "checkbox", "radio", "range", "submit", "reset"].includes(activeType)) ||
        activeTag === "textarea";
      if (textEntryFocused) {
        navHoldDir = null;
        navNextTime = 0;
        confirmHeld = false;
        backHeld = false;
        window.requestAnimationFrame(updateNavigation);
        return;
      }
      const keysPressed = window.Input.keysPressed;
      if (keysPressed) {
        const confirmPressed =
          keysPressed.has(" ") || keysPressed.has("enter") || keysPressed.has("Enter");
        if (confirmPressed && !confirmHeld) {
          activateFocusedControl();
        }
        confirmHeld = confirmPressed;
        const backPressed = keysPressed.has("escape") || keysPressed.has("Escape");
        if (backPressed && !backHeld) {
          if (!button.disabled) {
            handleContinue();
          }
        }
        backHeld = backPressed;
      } else {
        confirmHeld = false;
        backHeld = false;
      }
      const hasHoldInputSource =
        Boolean(window.Input.virtualInput?.enabled) || Boolean(window.Input.gamepadState?.movement?.active);
      if (hasHoldInputSource) {
        const previousFocused = focusedControlIndex;
        const upActive = window.Input.isActionActive("up");
        const downActive = window.Input.isActionActive("down");
        const leftActive = window.Input.isActionActive("left");
        const rightActive = window.Input.isActionActive("right");
        const nextDir =
          upActive ? "up" :
          downActive ? "down" :
          leftActive ? "left" :
          rightActive ? "right" :
          null;
        if (!nextDir) {
          navHoldDir = null;
          navNextTime = 0;
        } else {
          const now = typeof performance !== "undefined" ? performance.now() : Date.now();
          const initialDelayMs = 280;
          const repeatDelayMs = 140;
          if (navHoldDir !== nextDir) {
            navHoldDir = nextDir;
            navNextTime = now + initialDelayMs;
            if (nextDir === "up") moveFocus(-1);
            else if (nextDir === "down") moveFocus(1);
            else if (!adjustFocusedControl(nextDir === "left" ? -1 : 1)) moveFocus(nextDir === "left" ? -1 : 1);
          } else if (now >= navNextTime) {
            navNextTime = now + repeatDelayMs;
            if (nextDir === "up") moveFocus(-1);
            else if (nextDir === "down") moveFocus(1);
            else if (!adjustFocusedControl(nextDir === "left" ? -1 : 1)) moveFocus(nextDir === "left" ? -1 : 1);
          }
        }
        if (previousFocused !== focusedControlIndex) {
          syncFocusedControl();
        }
      } else {
        navHoldDir = null;
        navNextTime = 0;
      }
    } else {
      navHoldDir = null;
      navNextTime = 0;
      confirmHeld = false;
      backHeld = false;
    }
    window.requestAnimationFrame(updateNavigation);
  }

  button.addEventListener("click", handleContinue);
  window.addEventListener("keydown", handleKeyDown, { passive: false });
  window.addEventListener("resize", syncOverlayBounds, { passive: true });
  window.addEventListener("orientationchange", syncOverlayBounds, { passive: true });
  window.requestAnimationFrame(updateNavigation);

  window.DialogOverlay = {
    show,
    hide,
    isVisible: () => visible,
    consumeAction() {
      const wasConsumed = consumedAction;
      consumedAction = false;
      return wasConsumed;
    },
  };
})(typeof window !== "undefined" ? window : null, typeof document !== "undefined" ? document : null);
