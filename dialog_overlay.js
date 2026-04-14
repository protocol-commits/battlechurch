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
    if (event.code === "Space" || event.keyCode === 32 || event.key === "Escape") {
      if (button.disabled) return;
      event.preventDefault();
      handleContinue();
    }
  }

  button.addEventListener("click", handleContinue);
  window.addEventListener("keydown", handleKeyDown, { passive: false });

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
