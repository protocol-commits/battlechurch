(function (window, document) {
  if (!window || !document) return;

  const overlay = document.createElement("div");
  overlay.className = "dialog-overlay hidden";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = `
    <div class="dialog-overlay__panel">
      <div class="dialog-overlay__header">
        <h2 class="dialog-overlay__title"></h2>
        <p class="dialog-overlay__body"></p>
      </div>
      <canvas class="dialog-overlay__portrait-canvas" width="360" height="160"></canvas>
      <div class="dialog-overlay__actions">
        <button type="button" class="dialog-overlay__button">Continue (Space)</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const titleEl = overlay.querySelector(".dialog-overlay__title");
  const bodyEl = overlay.querySelector(".dialog-overlay__body");
  const portraitCanvas = overlay.querySelector(".dialog-overlay__portrait-canvas");
  const button = overlay.querySelector(".dialog-overlay__button");
  let continueCallback = null;
  let variantClass = null;
  let consumedAction = false;
  let visible = false;

  function show({
    title = "",
    body = "",
    bodyHtml = "",
    buttonText = "Continue (Space)",
    onContinue = null,
    variant = "",
    portraits = null,
  }) {
    if (!overlay) return;
    titleEl.textContent = title;
    if (bodyHtml) {
      bodyEl.innerHTML = bodyHtml;
    } else {
      bodyEl.textContent = body;
    }
    button.textContent = buttonText;
    continueCallback = typeof onContinue === "function" ? onContinue : null;
    overlay.classList.remove("hidden");
    overlay.classList.add("visible");
    overlay.setAttribute("aria-hidden", "false");
    if (variant) {
      variantClass = `dialog-overlay--${variant}`;
      overlay.classList.add(variantClass);
    }
    if (variant === "summary" && portraits && portraitCanvas) {
      portraitCanvas.classList.remove("hidden");
      drawPortraits(portraitCanvas, portraits.saved, portraits.lost);
    } else if (portraitCanvas) {
      portraitCanvas.classList.add("hidden");
    }
    if (variant === "recap" && portraitCanvas) {
      portraitCanvas.classList.add("hidden");
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
      overlay.classList.remove(variantClass);
      variantClass = null;
    }
  }

  function handleContinue() {
    consumedAction = true;
    if (continueCallback) continueCallback();
    hide();
  }

  function drawPortraits(canvas, saved = [], lost = []) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const padding = 12;
    const iconSize = 48;
    const gap = 8;
    const maxPerRow = Math.max(1, Math.floor((canvas.width - padding * 2 + gap) / (iconSize + gap)));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const drawGrid = (items = [], startY = padding, label = "") => {
      if (!items.length) return startY;
      ctx.save();
      ctx.font = "10px 'Press Start 2P', monospace";
      ctx.fillStyle = "#ffd978";
      ctx.fillText(label, padding, startY - 4);
      ctx.restore();
      let x = padding;
      let y = startY;
      items.forEach((portrait, index) => {
        if (!portrait) return;
        if (index > 0 && index % maxPerRow === 0) {
          x = padding;
          y += iconSize + gap;
        }
        try {
          ctx.drawImage(portrait, x, y, iconSize, iconSize);
        } catch (e) {}
        x += iconSize + gap;
      });
      return y + iconSize + gap;
    };
    let yOffset = padding;
    yOffset = drawGrid(saved, yOffset, "Saved");
    drawGrid(lost, yOffset, "Lost");
  }

  function handleKeyDown(event) {
    if (!visible) return;
    if (event.code === "Space" || event.keyCode === 32) {
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
