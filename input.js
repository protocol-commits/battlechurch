/* Input management module for Battlechurch */
(function setupInputModule(window) {
  if (!window) return;

  const ACTION_MAP = {
    up: ["w"],
    down: ["s"],
    left: ["a"],
    right: ["d"],
  // Removed right joystick and arrow button controls for future A/B button implementation
    pause: [" "],
    restart: [" "],
  };

  const PREVENT_DEFAULT_KEYS = new Set([
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    " ",
  ]);

  const keysDown = new Set();
  const keysJustPressed = new Set();

    // NES 'A' button test: true if left arrow is held
    let nesAButtonActive = false;

      // Track player's movement direction for melee weapon
        let movementDirection = { x: 0, y: 0 };
        let lastMovementDirection = { x: 1, y: 0 }; // Default facing right

  const pointerState = {
    x: 0,
    y: 0,
    active: false,
  };

  const virtualInput = {
    enabled: false,
    deadZone: 0.18,
    movement: { x: 0, y: 0, active: false, pointerId: null },
    aim: { x: 0, y: 0, active: false, pointerId: null },
  };

  const aimState = {
    x: 0,
    y: 1,
    usingPointer: false,
    triggerPress: false,
  };

  const FORCE_TOUCH_CONTROLS = (() => {
    try {
      if (window.__BATTLECHURCH_FORCE_VIRTUAL_CONTROLS) return true;
      const query = String(window.location.search || "").toLowerCase();
      return /\btouchcontrols=1\b/.test(query) || /\bshowtouch=1\b/.test(query);
    } catch (e) {
      return false;
    }
  })();

  const isTouchCapable = false;

  let canvas = null;
  let touchControlsRoot = null;
  let moveStickBase = null;
  let aimStickBase = null;
  let virtualSpaceButton = null;
  let onAnyKeyDown = null;
  let shouldUpdatePointer = null;
  let shouldHandleInspectorClick = null;
  let onInspectorClick = null;

  let listenersAttached = false;
  let prayerBombClickQueued = false;
  let canvasClickQueued = false;
  let canvasClickPos = null;

  function normalizeKey(key) {
    if (typeof key !== "string") return key;
    return key.length === 1 ? key.toLowerCase() : key;
  }

  function normalizeVector(x, y) {
    const length = Math.hypot(x, y) || 1;
    return { x: x / length, y: y / length };
  }

  function getCanvasCoordinates(event) {
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width ? canvas.width / rect.width : 1;
    const scaleY = rect.height ? canvas.height / rect.height : 1;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    return { x, y };
  }

  function handleKeyDown(event) {
    if (PREVENT_DEFAULT_KEYS.has(event.key)) event.preventDefault();
    const key = normalizeKey(event.key);
    if (!keysDown.has(key)) keysJustPressed.add(key);
    keysDown.add(key);
    // NES 'B' button: right arrow triggers prayer bomb
    if (event.key === "ArrowRight") {
      prayerBombClickQueued = true;
      event.preventDefault();
    }
      // NES 'A' button test: left arrow
      if (event.key === "ArrowLeft") {
        nesAButtonActive = true;
      }
    // Update movement direction for WASD
    let changed = false;
    if (key === "w") { movementDirection.y = -1; changed = true; }
    if (key === "s") { movementDirection.y = 1; changed = true; }
    if (key === "a") { movementDirection.x = -1; changed = true; }
    if (key === "d") { movementDirection.x = 1; changed = true; }
    if (changed && (movementDirection.x !== 0 || movementDirection.y !== 0)) {
      lastMovementDirection.x = movementDirection.x;
      lastMovementDirection.y = movementDirection.y;
    }
    if (typeof onAnyKeyDown === "function") {
      try {
        onAnyKeyDown(key, event);
      } catch (e) {
        console.warn("Input.onAnyKeyDown callback failed", e);
      }
    }
  }

  function handleKeyUp(event) {
    const key = normalizeKey(event.key);
    keysDown.delete(key);
      if (event.key === "ArrowLeft") {
        nesAButtonActive = false;
      }
    // Reset movement direction if WASD released
    let changed = false;
    if (key === "w" && movementDirection.y === -1) { movementDirection.y = 0; changed = true; }
    if (key === "s" && movementDirection.y === 1) { movementDirection.y = 0; changed = true; }
    if (key === "a" && movementDirection.x === -1) { movementDirection.x = 0; changed = true; }
    if (key === "d" && movementDirection.x === 1) { movementDirection.x = 0; changed = true; }
    // If direction changed and still nonzero, update lastMovementDirection
    if (changed && (movementDirection.x !== 0 || movementDirection.y !== 0)) {
      lastMovementDirection.x = movementDirection.x;
      lastMovementDirection.y = movementDirection.y;
    }
  }

  function handleMouseMove(event) {
    if (typeof shouldUpdatePointer === "function" && !shouldUpdatePointer()) return;
    const coords = getCanvasCoordinates(event);
    pointerState.x = coords.x;
    pointerState.y = coords.y;
    pointerState.active = true;
    aimState.usingPointer = true;
  }

  function handleMouseLeave() {
    pointerState.active = false;
    aimState.usingPointer = false;
    aimState.triggerPress = false;
  }

  function preventContextMenu(event) {
    event.preventDefault();
  }

  function handleCanvasClick(event, isPointer) {
    if (event.button === 0 || typeof event.button === "undefined") {
      const coords = getCanvasCoordinates(event);
      canvasClickQueued = true;
      canvasClickPos = coords;
    }
    if (event.button === 2) {
      prayerBombClickQueued = true;
    }
    if (typeof shouldHandleInspectorClick === "function" && !shouldHandleInspectorClick()) return;
    if (typeof onInspectorClick !== "function") return;
    const coords = getCanvasCoordinates(event);
    try {
      onInspectorClick(coords, event, isPointer);
    } catch (e) {
      console.warn("Input.onInspectorClick callback failed", e);
    }
    event.preventDefault();
  }

  function handleMouseDown(event) {
    handleCanvasClick(event, false);
  }

  function handlePointerDown(event) {
    handleCanvasClick(event, true);
  }

  function resetVirtualJoystick(handle, state) {
    if (handle) handle.style.transform = "translate(-50%, -50%)";
    state.pointerId = null;
    state.x = 0;
    state.y = 0;
    state.active = false;
  }

  function updateVirtualJoystick(baseEl, handle, state, event) {
    const rect = baseEl.getBoundingClientRect();
    const radius = rect.width / 2;
    const centerX = rect.left + radius;
    const centerY = rect.top + radius;
    let dx = event.clientX - centerX;
    let dy = event.clientY - centerY;
    const distance = Math.hypot(dx, dy);
    let offsetX = 0;
    let offsetY = 0;
    if (distance > 0) {
      const clampDistance = Math.min(distance, radius);
      const scale = clampDistance / distance;
      offsetX = dx * scale;
      offsetY = dy * scale;
    }
    handle.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
    const normalizedX = radius > 0 ? offsetX / radius : 0;
    const normalizedY = radius > 0 ? offsetY / radius : 0;
    const magnitude = Math.min(1, Math.hypot(normalizedX, normalizedY));
    if (magnitude > virtualInput.deadZone) {
      const normalized = normalizeVector(normalizedX, normalizedY);
      state.x = normalized.x * magnitude;
      state.y = normalized.y * magnitude;
      state.active = true;
      // Update movementDirection and lastMovementDirection for joystick
      if (state === virtualInput.movement) {
        movementDirection.x = state.x;
        movementDirection.y = state.y;
        // Only update lastMovementDirection if joystick is nonzero
        if (state.x !== 0 || state.y !== 0) {
          lastMovementDirection.x = state.x;
          lastMovementDirection.y = state.y;
        }
      }
    } else {
      state.x = 0;
      state.y = 0;
      state.active = false;
      // Reset movementDirection for joystick
      if (state === virtualInput.movement) {
        movementDirection.x = 0;
        movementDirection.y = 0;
      }
    }
    if (state === virtualInput.aim && state.active) {
      aimState.usingPointer = false;
      aimState.x = state.x;
      aimState.y = state.y;
    }
  }

  function configureVirtualJoystick(baseEl, controlKey) {
    const handle = baseEl?.querySelector(".joystick-handle");
    if (!baseEl || !handle) return;
    const state = virtualInput[controlKey];
    const reset = () => resetVirtualJoystick(handle, state);

    baseEl.addEventListener("pointerdown", (event) => {
      if (!virtualInput.enabled) return;
      if (state.pointerId !== null) return;
      state.pointerId = event.pointerId;
      try {
        baseEl.setPointerCapture(event.pointerId);
      } catch (e) {}
      updateVirtualJoystick(baseEl, handle, state, event);
      event.preventDefault();
    });

    baseEl.addEventListener("pointermove", (event) => {
      if (state.pointerId !== event.pointerId) return;
      updateVirtualJoystick(baseEl, handle, state, event);
      event.preventDefault();
    });

    const release = (event) => {
      if (state.pointerId !== event.pointerId) return;
      try {
        baseEl.releasePointerCapture(event.pointerId);
      } catch (e) {}
      reset();
      event.preventDefault();
    };

    baseEl.addEventListener("pointerup", release);
    baseEl.addEventListener("pointercancel", release);
    baseEl.addEventListener("pointerleave", (event) => {
      if (state.pointerId !== event.pointerId) return;
      release(event);
    });
  }

  function initializeVirtualControls() {
    if (virtualInput.enabled) return;
    if (!touchControlsRoot) return;
    const shouldEnable = FORCE_TOUCH_CONTROLS || isTouchCapable;
    if (!shouldEnable) {
      touchControlsRoot.setAttribute("aria-hidden", "true");
      return;
    }
    virtualInput.enabled = true;
    touchControlsRoot.setAttribute("aria-hidden", "false");
    if (moveStickBase) {
      configureVirtualJoystick(moveStickBase, "movement");
    }
    if (aimStickBase) {
      configureVirtualJoystick(aimStickBase, "aim");
    }
    if (virtualSpaceButton) {
      virtualSpaceButton.addEventListener("click", () => {
        triggerVirtualKeyPress(" ");
      });
    }
    updateTouchLayout();
  }

  function updateTouchLayout() {
    if (!virtualInput.enabled) return;
    if (!document || !document.body) return;
    document.body.classList.add("touch-enabled");
    const viewportWidth = window.innerWidth;
    const isMobileLayout = viewportWidth <= 720;
    document.body.classList.toggle("touch-mobile", isMobileLayout);
    document.body.classList.toggle("touch-tablet", !isMobileLayout);
  }

  function isActionActive(action) {
    const bindings = ACTION_MAP[action] || [];
    if (bindings.some((key) => keysDown.has(key))) return true;
    if (!virtualInput.enabled) return false;
    const threshold = Math.max(virtualInput.deadZone, 0.25);
    switch (action) {
      case "up":
        return virtualInput.movement.active && virtualInput.movement.y < -threshold;
      case "down":
        return virtualInput.movement.active && virtualInput.movement.y > threshold;
      case "left":
        return virtualInput.movement.active && virtualInput.movement.x < -threshold;
      case "right":
        return virtualInput.movement.active && virtualInput.movement.x > threshold;
      default:
        return false;
    }
  }

  function wasActionJustPressed(action) {
    const bindings = ACTION_MAP[action] || [];
    return bindings.some((key) => keysJustPressed.has(key));
  }

  function triggerVirtualKeyPress(key) {
    const normalized = normalizeKey(key);
    keysJustPressed.add(normalized);
    keysDown.add(normalized);
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => {
        keysDown.delete(normalized);
      });
    } else {
      keysDown.delete(normalized);
    }
  }

  function consumePrayerBombClick() {
    if (!prayerBombClickQueued) return false;
    prayerBombClickQueued = false;
    return true;
  }

  function consumeCanvasClick() {
    if (!canvasClickQueued) return null;
    canvasClickQueued = false;
    const pos = canvasClickPos;
    canvasClickPos = null;
    return pos;
  }

  function clearJustPressed() {
    keysJustPressed.clear();
  }

  function initialize(options = {}) {
    if (options.canvas) canvas = options.canvas;
    if (!canvas) throw new Error("Input.initialize requires a canvas element");
    touchControlsRoot = options.touchControlsRoot || touchControlsRoot;
    moveStickBase = options.moveStickBase || moveStickBase;
    aimStickBase = options.aimStickBase || aimStickBase;
    virtualSpaceButton = options.virtualSpaceButton || virtualSpaceButton;
    onAnyKeyDown = typeof options.onAnyKeyDown === "function" ? options.onAnyKeyDown : onAnyKeyDown;
    shouldUpdatePointer = typeof options.shouldUpdatePointer === "function" ? options.shouldUpdatePointer : shouldUpdatePointer;
    shouldHandleInspectorClick = typeof options.shouldHandleInspectorClick === "function"
      ? options.shouldHandleInspectorClick
      : shouldHandleInspectorClick;
    onInspectorClick = typeof options.onInspectorClick === "function" ? options.onInspectorClick : onInspectorClick;

    if (typeof options.initialPointerX === "number") pointerState.x = options.initialPointerX;
    else if (!listenersAttached && canvas.width) pointerState.x = canvas.width / 2;
    if (typeof options.initialPointerY === "number") pointerState.y = options.initialPointerY;
    else if (!listenersAttached && canvas.height) pointerState.y = canvas.height / 2;

    if (!listenersAttached) {
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
      canvas.addEventListener("mousemove", handleMouseMove);
      canvas.addEventListener("mouseleave", handleMouseLeave);
      canvas.addEventListener("contextmenu", preventContextMenu);
      canvas.addEventListener("mousedown", handleMouseDown);
      canvas.addEventListener("pointerdown", handlePointerDown);
      listenersAttached = true;
    }

    if (!virtualInput.enabled) {
      initializeVirtualControls();
    }
  }

  window.Input = {
    initialize,
    initializeVirtualControls,
    updateTouchLayout,
    isActionActive,
    wasActionJustPressed,
    triggerVirtualKeyPress,
    consumePrayerBombClick,
    consumeCanvasClick,
    clearJustPressed,
    get keysJustPressed() {
      return keysJustPressed;
    },
    get pointerState() {
      return pointerState;
    },
    get aimState() {
      return aimState;
    },
    get virtualInput() {
      return virtualInput;
    },
      // NES 'A' button test flag
      get nesAButtonActive() {
        return nesAButtonActive;
      },
      set nesAButtonActive(val) {
        nesAButtonActive = Boolean(val);
      },
        // Player movement direction for melee weapon
        get movementDirection() {
          return { ...movementDirection };
        },
        // Last nonzero movement direction for melee weapon
        get lastMovementDirection() {
          return { ...lastMovementDirection };
        },
        get prayerBombClickQueued() {
          return prayerBombClickQueued;
        },
        set prayerBombClickQueued(val) {
          prayerBombClickQueued = Boolean(val);
        },
  };
})(typeof window !== "undefined" ? window : null);
