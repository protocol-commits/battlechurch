(function (window, document) {
  if (!window || !document) return;

  const overlay = document.createElement("div");
  overlay.className = "dialog-overlay hidden";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = `
    <div class="dialog-overlay__panel">
      <h2 class="dialog-overlay__title"></h2>
      <div class="dialog-overlay__body"></div>
      <button type="button" class="dialog-overlay__button">Continue (Space)</button>
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
  let focusedButtonIndex = 0;
  let navHoldDir = 0;
  let navNextTime = 0;

  function getNavigableButtons() {
    return Array.from(overlay.querySelectorAll("button.dialog-overlay__button")).filter((el) => {
      if (!el || el.disabled) return false;
      if (el.offsetParent === null && el !== button) return false;
      return true;
    });
  }

  function focusButton(index, { playSound = false } = {}) {
    const buttons = getNavigableButtons();
    if (!buttons.length) return null;
    const nextIndex = Math.max(0, Math.min(buttons.length - 1, index));
    const nextButton = buttons[nextIndex];
    const previousButton = buttons[focusedButtonIndex] || null;
    focusedButtonIndex = nextIndex;
    if (playSound && previousButton !== nextButton && typeof window?.playMenuMoveSfx === "function") {
      window.playMenuMoveSfx(0.45);
    }
    try {
      nextButton.focus({ preventScroll: true });
    } catch (e) {
      nextButton.focus();
    }
    return nextButton;
  }

  function syncFocusedButton() {
    const buttons = getNavigableButtons();
    if (!buttons.length) {
      focusedButtonIndex = 0;
      return null;
    }
    const activeIndex = buttons.indexOf(document.activeElement);
    if (activeIndex >= 0) {
      focusedButtonIndex = activeIndex;
      return buttons[activeIndex];
    }
    return focusButton(Math.min(focusedButtonIndex, buttons.length - 1));
  }

  function moveFocus(direction) {
    const buttons = getNavigableButtons();
    if (!buttons.length) return false;
    syncFocusedButton();
    const nextIndex = (focusedButtonIndex + direction + buttons.length) % buttons.length;
    focusButton(nextIndex, { playSound: true });
    return true;
  }

  function activateFocusedButton() {
    const activeButton = syncFocusedButton();
    if (!activeButton || activeButton.disabled) return false;
    activeButton.click();
    return true;
  }

  function show({
    title = "",
    body = "",
    bodyHtml = "",
    buttonText = "Continue (Space)",
    onContinue = null,
    variant = "",
    onRender = null,
  }) {
    if (!overlay) return;
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
    if (typeof onRender === "function") {
      try {
        onRender({ overlay, bodyEl, buttonEl: button, variant });
      } catch (e) {}
    }
    focusedButtonIndex = 0;
    navHoldDir = 0;
    navNextTime = 0;
    syncFocusedButton();
    visible = true;
  }

  function hide() {
    if (!overlay || !visible) return;
    overlay.classList.remove("visible");
    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden", "true");
    visible = false;
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
    if (typeof window !== "undefined" && typeof window.playMenuAdvanceSfx === "function") {
      window.playMenuAdvanceSfx(0.55);
    }
    if (continueCallback) continueCallback();
    hide();
  }

  function handleKeyDown(event) {
    if (!visible) return;
    const key = String(event.key || "");
    if (key === "ArrowUp" || key === "ArrowLeft" || key === "w" || key === "W" || key === "a" || key === "A") {
      event.preventDefault();
      moveFocus(-1);
      return;
    }
    if (key === "ArrowDown" || key === "ArrowRight" || key === "s" || key === "S" || key === "d" || key === "D") {
      event.preventDefault();
      moveFocus(1);
      return;
    }
    if (event.code === "Enter" || key === "Enter" || event.code === "Space" || event.keyCode === 32) {
      event.preventDefault();
      activateFocusedButton();
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
      const hasHoldInputSource =
        Boolean(window.Input.virtualInput?.enabled) || Boolean(window.Input.gamepadState?.movement?.active);
      if (hasHoldInputSource) {
        const previousFocused = focusedButtonIndex;
        const leftActive = window.Input.isActionActive("left") || window.Input.isActionActive("up");
        const rightActive = window.Input.isActionActive("right") || window.Input.isActionActive("down");
        const nextDir = leftActive ? -1 : rightActive ? 1 : 0;
        if (!nextDir) {
          navHoldDir = 0;
          navNextTime = 0;
        } else {
          const now = typeof performance !== "undefined" ? performance.now() : Date.now();
          const initialDelayMs = 280;
          const repeatDelayMs = 140;
          if (navHoldDir !== nextDir) {
            navHoldDir = nextDir;
            navNextTime = now + initialDelayMs;
            moveFocus(nextDir);
          } else if (now >= navNextTime) {
            navNextTime = now + repeatDelayMs;
            moveFocus(nextDir);
          }
        }
        if (previousFocused !== focusedButtonIndex) {
          syncFocusedButton();
        }
      } else {
        navHoldDir = 0;
        navNextTime = 0;
      }
    } else {
      navHoldDir = 0;
      navNextTime = 0;
    }
    window.requestAnimationFrame(updateNavigation);
  }

  button.addEventListener("click", handleContinue);
  window.addEventListener("keydown", handleKeyDown, { passive: false });
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
