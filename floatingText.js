/* Floating text manager for Battlechurch */
(function setupFloatingTextModule(window) {
  if (!window) return;

  const activeTexts = [];
  let maxSpeechBubbles = 5;
  let playerResolver = () => (typeof window.player !== "undefined" ? window.player : null);
  const damageOffsetTrackers = new WeakMap();
  const DAMAGE_JITTER_TIMEOUT = 260; // milliseconds between bursts
  const DAMAGE_JITTER_RADIUS = 5;
  const HERO_SPEECH_PRIORITY = 220;
  const NPC_SPEECH_PRIORITY = 140;

  function getDamageJitter(entity) {
    if (!entity) return { x: 0, y: 0 };
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    let tracker = damageOffsetTrackers.get(entity);
    if (!tracker || now - tracker.lastTime > DAMAGE_JITTER_TIMEOUT) {
      tracker = { count: 0, lastTime: now };
    }
    const angle = (tracker.count % 6) * (Math.PI / 3);
    const radius = DAMAGE_JITTER_RADIUS + ((tracker.count % 2) * 2 - 1);
    const jitterX = Math.cos(angle) * radius;
    const jitterY = Math.sin(angle) * radius * 0.5;
    tracker.count += 1;
    tracker.lastTime = now;
    damageOffsetTrackers.set(entity, tracker);
    return { x: jitterX, y: jitterY };
  }

  function setPlayerGetter(fn) {
    if (typeof fn === "function") {
      playerResolver = fn;
    } else {
      const value = fn;
      playerResolver = () => value || null;
    }
  }

  function setMaxSpeechBubbles(value) {
    if (Number.isFinite(value) && value >= 0) {
      maxSpeechBubbles = value;
    }
  }

  function initialize(options = {}) {
    if (typeof options.getPlayer === "function") {
      setPlayerGetter(options.getPlayer);
    }
    if (Number.isFinite(options.maxSpeechBubbles)) {
      setMaxSpeechBubbles(options.maxSpeechBubbles);
    }
  }

  function getActive() {
    return activeTexts;
  }

  function pruneSpeechBubble() {
    if (maxSpeechBubbles <= 0) return false;
    let firstNonCriticalIndex = -1;
    let nonCriticalCount = 0;
    for (let i = 0; i < activeTexts.length; i += 1) {
      const ft = activeTexts[i];
      if (!ft || !ft.speechBubble || ft.critical) continue;
      if (firstNonCriticalIndex === -1) firstNonCriticalIndex = i;
      nonCriticalCount += 1;
    }
    if (nonCriticalCount >= maxSpeechBubbles && firstNonCriticalIndex !== -1) {
      const [removed] = activeTexts.splice(firstNonCriticalIndex, 1);
      if (removed?.entity?.statusBubble === removed) {
        removed.entity.statusBubble = null;
        if ("statusBubbleTimer" in removed.entity) removed.entity.statusBubbleTimer = 0;
        if ("statusBubblePersistent" in removed.entity) removed.entity.statusBubblePersistent = false;
        if ("statusBubbleCritical" in removed.entity) removed.entity.statusBubbleCritical = false;
      }
      return true;
    }
    return false;
  }

  function addAt(x, y, text, color = "#fff", options = {}) {
    const {
      speechBubble = false,
      vy = -20,
      life = 1.5,
      entity = null,
      offsetX = 0,
      offsetY = 0,
      persist = false,
      critical = false,
      priority = 0,
      style,
      bubbleTheme = "default",
      bgColor = null,
      fontSize = null,
      fontWeight = null,
      fontFamily = null,
      fadeDelay = 0,
      textAlign = null,
      detachOnEntityGone = false,
      bubbleMaxWidth = null,
    } = options;
    const finalStyle = style || (speechBubble ? "speech" : "plain");
    if (finalStyle === "speech" && !critical) {
      if (maxSpeechBubbles <= 0) return null;
      pruneSpeechBubble();
    }
    const finalFontSize =
      finalStyle === "speech"
        ? (fontSize || 13)
        : fontSize;
    const finalFontWeight =
      finalStyle === "speech"
        ? (fontWeight || "600")
        : fontWeight;
    const finalBubbleMaxWidth =
      finalStyle === "speech"
        ? (bubbleMaxWidth || 240)
        : bubbleMaxWidth;

    const fadeLength = Math.max(0.0001, life - fadeDelay);
    const payload = {
      text,
      color,
      life: fadeLength,
      initialLife: fadeLength,
      x,
      y,
      vy,
      speechBubble: finalStyle === "speech",
      entity,
      offsetX,
      offsetY,
      persist,
      critical,
      style: finalStyle,
      bubbleTheme,
      bgColor,
      fontSize: finalFontSize,
      fontWeight: finalFontWeight,
      fontFamily,
      textAlign,
      bubbleMaxWidth: finalBubbleMaxWidth,
      detachOnEntityGone,
      priority,
      fadeDelay,
      fadeLength,
      fadeDelayRemaining: fadeDelay,
    };
    activeTexts.push(payload);
    return payload;
  }

  function add(text, color = "#fff", options = {}) {
    const player = playerResolver();
    if (!player) return null;
    const {
      speechBubble = true,
      vy = -20,
      life = 1.5,
      offsetY = -60,
      style,
      bubbleTheme,
    } = options;
    const finalStyle = style || (speechBubble ? "speech" : "plain");
    return addAt(player.x, player.y + offsetY, text, color, {
      speechBubble: finalStyle === "speech",
      vy,
      life,
      entity: player,
      offsetY,
      style: finalStyle,
      bubbleTheme,
    });
  }

  function showDamage(entity, amount, {
    color = "#ff7f7f",
    offsetY = 0,
    fontSize = null,
    fontWeight = null,
    fadeDelay = 0,
    priority = 0,
  } = {}) {
    if (!entity) return;
    const rounded = Math.round(amount);
    if (!Number.isFinite(rounded) || rounded <= 0) return;
    const formatter =
      typeof window !== "undefined" && typeof window.formatNumberWithCommas === "function"
        ? window.formatNumberWithCommas
        : (value) => `${Math.round(Number.isFinite(value) ? value : 0)}`;
    const isFriendly = Boolean(entity.isPlayer || entity.isCozyNpc);
    const isPlayer = Boolean(entity.isPlayer);
    const damageClass = String(entity.config?.damageClass || entity.damageClass || "").toLowerCase();
    const radius = entity.radius || entity.config?.hitRadius || 24;
    const hitbox = entity.hitbox || entity.config?.hitbox || null;
    const hasHitbox =
      !isFriendly &&
      hitbox &&
      Number.isFinite(hitbox.width) &&
      Number.isFinite(hitbox.height) &&
      hitbox.width > 0 &&
      hitbox.height > 0;
    const hitboxOffsetX = hasHitbox && Number.isFinite(hitbox.offsetX) ? hitbox.offsetX : 0;
    const hitboxOffsetY = hasHitbox && Number.isFinite(hitbox.offsetY) ? hitbox.offsetY : 0;
    const textAnchorX = hasHitbox ? entity.x + hitboxOffsetX : entity.x;
    const textAnchorOffsetY = hasHitbox
      ? hitboxOffsetY - hitbox.height * 0.5
      : -radius;
    const finalFontSize =
      fontSize ??
      (isPlayer
        ? 72
        : entity.isCozyNpc
          ? 50
          : damageClass === "armored"
            ? 28
            : damageClass === "tank"
              ? 22
              : 18);
    const finalFontWeight = fontWeight ?? (isFriendly ? "700" : "500");
    const finalColor = isFriendly
      ? "#ffffff"
      : damageClass === "armored"
        ? "#FFE7A1"
        : damageClass === "tank"
          ? "#FFC86A"
          : color;
    const jitter = getDamageJitter(entity);
    const followEntity = Boolean(entity);
    const facingOffsetX = isPlayer
      ? ((entity.facing === "left" ? 1 : -1) * 10)
      : 0;
    const baseX = textAnchorX + jitter.x;
    const baseY = entity.y + textAnchorOffsetY + offsetY + jitter.y;
    addAt(
      baseX,
      baseY,
      formatter(rounded),
      finalColor,
      {
        speechBubble: false,
        vy: -26,
        life: 0.9,
        fontSize: finalFontSize,
        fontWeight: finalFontWeight,
        fadeDelay,
        priority,
        entity: followEntity ? entity : null,
        offsetX: followEntity ? (jitter.x + facingOffsetX + (hasHitbox ? hitboxOffsetX : 0)) : 0,
        offsetY: followEntity ? (textAnchorOffsetY + offsetY + jitter.y - 15) : 0,
        detachOnEntityGone: true,
      },
    );
  }

  function heroSay(line, { life = 1.8 } = {}) {
    const player = playerResolver();
    if (!player || !line) return;
    const bubbleLife = Math.max(0.1, life);
    const existing = activeTexts.find(
      (ft) => ft && ft.speechBubble && ft.bubbleTheme === "hero" && ft.life > 0,
    );
    if (existing) {
      existing.text = existing.text + " & " + line;
      existing.life = Math.max(existing.life, bubbleLife);
      existing.initialLife = Math.max(existing.initialLife, bubbleLife);
      existing.fadeLength = Math.max(existing.fadeLength, bubbleLife);
      existing.priority = HERO_SPEECH_PRIORITY;
      return;
    }
    const bubble = add(line, "#f1f5ff", {
      speechBubble: true,
      vy: 0,
      life: bubbleLife,
      offsetY: -player.radius - 30,
      bubbleTheme: "hero",
      priority: HERO_SPEECH_PRIORITY,
    });
    if (bubble) bubble.life = bubbleLife;
  }

  function heroComboCallout(line, { life = 2.1 } = {}) {
    const player = playerResolver();
    if (!player || !line) return;
    const bubbleLife = Math.max(0.1, life);
    const existing = activeTexts.find(
      (ft) => ft && ft.speechBubble && ft.bubbleTheme === "heroCombo" && ft.life > 0,
    );
    if (existing) {
      existing.text = line;
      existing.life = Math.max(existing.life, bubbleLife);
      existing.initialLife = Math.max(existing.initialLife, bubbleLife);
      existing.fadeLength = Math.max(existing.fadeLength, bubbleLife);
      existing.priority = HERO_SPEECH_PRIORITY + 5;
      return;
    }
    const bubble = add(line, "#fff4b8", {
      speechBubble: true,
      vy: 0,
      life: bubbleLife,
      offsetY: -player.radius - 44,
      bubbleTheme: "heroCombo",
      fontSize: 18,
      fontWeight: "800",
      priority: HERO_SPEECH_PRIORITY + 5,
    });
    if (bubble) bubble.life = bubbleLife;
  }

  function npcCheer(npc, line, color = "#c9ffe5", { life = 1.6, fadeDelay = 0 } = {}) {
    if (!npc || !line) return;
    const bubbleLife = Math.max(0.1, life);
    addAt(npc.x, npc.y - npc.radius - 20, line, color, {
      speechBubble: true,
      vy: 0,
      life: bubbleLife,
      entity: npc,
      offsetY: -npc.radius - 20,
      bubbleTheme: "npc",
      fadeDelay,
      priority: NPC_SPEECH_PRIORITY,
    });
  }

  function addStatusText(entity, text, {
    color = "#f4f8ff",
    bgColor = "rgba(40, 52, 70, 0.9)",
    life = 1.8,
    offsetY = null,
  } = {}) {
    if (!entity) return null;
    const yOffset = offsetY !== null ? offsetY : entity.radius + 26;
    return addAt(entity.x, entity.y + yOffset, text, color, {
      speechBubble: false,
      vy: 0,
      life,
      entity,
      offsetY: yOffset,
      style: "status",
      bgColor,
    });
  }

  function update(dt) {
    for (let i = activeTexts.length - 1; i >= 0; i -= 1) {
      const ft = activeTexts[i];
      if (ft.entity) {
        const subject = ft.entity;
        if (subject?.state === "death" || subject?.dead || subject?.removed || subject?.departed) {
          if (ft.detachOnEntityGone) {
            ft.entity = null;
          } else {
            activeTexts.splice(i, 1);
            continue;
          }
        }
        if (ft.entity) {
          ft.x = subject.x + (ft.offsetX || 0);
          ft.y = subject.y + (ft.offsetY || 0);
          if (!ft.persist && (!ft.fadeDelayRemaining || ft.fadeDelayRemaining <= 0)) {
            ft.life -= dt;
          }
          if (!ft.persist && ft.fadeDelayRemaining > 0) {
            ft.fadeDelayRemaining = Math.max(0, ft.fadeDelayRemaining - dt);
          }
        } else {
          if (!ft.persist && (!ft.fadeDelayRemaining || ft.fadeDelayRemaining <= 0)) {
            ft.life -= dt;
          }
          if (!ft.persist && ft.fadeDelayRemaining > 0) {
            ft.fadeDelayRemaining = Math.max(0, ft.fadeDelayRemaining - dt);
          }
          ft.y += ft.vy * dt;
        }
      } else {
        if (!ft.persist && (!ft.fadeDelayRemaining || ft.fadeDelayRemaining <= 0)) {
          ft.life -= dt;
        }
        if (!ft.persist && ft.fadeDelayRemaining > 0) {
          ft.fadeDelayRemaining = Math.max(0, ft.fadeDelayRemaining - dt);
        }
        ft.y += ft.vy * dt;
      }
      if (ft.life <= 0) activeTexts.splice(i, 1);
    }
  }

  function clear() {
    activeTexts.splice(0, activeTexts.length);
  }

  window.FloatingText = Object.assign(window.FloatingText || {}, {
    initialize,
    setPlayerGetter,
    setMaxSpeechBubbles,
    getActive,
    add,
    addAt,
    showDamage,
    heroSay,
    heroComboCallout,
    npcCheer,
    addStatusText,
    update,
    clear,
  });

  // Maintain backwards compatibility for legacy callers.
  window.showDamage = window.FloatingText.showDamage;
})(typeof window !== "undefined" ? window : null);
