  // --- Mini-boss preview feature ---
  // Shows the next boss at the top center of the screen on mid-bg layer during the third battle.
  // The boss walks side to side, scaled down, as a visual teaser.
  // Use existing levelManager reference, do not redeclare.
  let lm = typeof levelManager !== 'undefined' ? levelManager : (window.levelManager || (typeof requireBindings === 'function' ? requireBindings().levelManager : null));
  if (lm && typeof lm.getStatus === 'function') {
    const status = lm.getStatus();
    // Only show preview during the third battle of a level (battleIndex === 2)
    if (status.battleIndex === 2 && typeof lm.getNextBoss === 'function') {
      const bossDef = lm.getNextBoss();
      if (bossDef && bossDef.sprite) {
        const bossImg = assets?.sprites?.[bossDef.sprite] || null;
        console.debug && console.debug('[MiniBossPreview] bossDef:', bossDef);
        console.debug && console.debug('[MiniBossPreview] bossImg:', bossImg);
        if (bossImg) {
          // Animate side-to-side walk
          // Make boss huge and start at the very top center for visibility testing
          const previewWidth = bossImg.width * 2.0;
          const previewHeight = bossImg.height * 2.0;
          const t = Date.now() / 1000;
          const walkRange = Math.min(canvas.width * 0.25, 180);
          const centerX = canvas.width / 2;
          const topY = previewHeight / 2; // very top
          const walkX = centerX + Math.sin(t * 0.7) * walkRange;
          ctx.save();
          ctx.globalAlpha = 0.3;
          ctx.strokeStyle = 'red';
          ctx.lineWidth = 4;
          ctx.strokeRect(walkX - previewWidth / 2, topY - previewHeight / 2, previewWidth, previewHeight);
          ctx.globalAlpha = 0.85;
          ctx.drawImage(bossImg, walkX - previewWidth / 2, topY - previewHeight / 2, previewWidth, previewHeight);
          ctx.restore();
        } else {
          // Debug: draw a yellow rectangle where the boss would appear
          const previewWidth = 200;
          const previewHeight = 200;
          const t = Date.now() / 1000;
          const walkRange = Math.min(canvas.width * 0.25, 180);
          const centerX = canvas.width / 2;
          const topY = previewHeight / 2;
          const walkX = centerX + Math.sin(t * 0.7) * walkRange;
          ctx.save();
          ctx.globalAlpha = 0.3;
          ctx.strokeStyle = 'yellow';
          ctx.lineWidth = 4;
          ctx.strokeRect(walkX - previewWidth / 2, topY - previewHeight / 2, previewWidth, previewHeight);
          ctx.restore();
          console.warn && console.warn('[MiniBossPreview] bossImg not found for sprite:', bossDef.sprite);
        }
      } else {
        console.warn && console.warn('[MiniBossPreview] bossDef missing or no sprite:', bossDef);
      }
    }
  }
  /*
   =============================
   MISSION BRIEF POPUP LOGIC
   =============================
   This section handles the Mission Brief popup, which appears BEFORE the first battle of each month.
   Purpose:
     - Emotional connection: Shows the names of NPCs (congregation) the player will help this month.
     - Context: Explains WHY the player is helping (random scenario from missionBriefScenarios).
   Differences from other popups:
     - NOT a battle summary or post-battle tally (those show stats, portraits, and results).
     - NOT a tutorial or how-to-play overlay.
     - Only appears once per month, before the first battle.
   Key code responsibilities:
     - Title: Always displays 'Mission Brief' (see fallbackTitle logic).
     - NPC Names: Formats and lists all NPCs for the month in a natural sentence.
     - Scenario: Randomly selects a scenario from missionBriefScenarios and persists it for the popup duration.
     - Month: Displays the current month name.
     - Rendering: Uses ctx.fillText to draw the Mission Brief sentence and title.
   To update scenarios: Edit the mission brief array defined in mission_brief_data.js.
   To change title logic: See fallbackTitle assignment near ctx.fillText.
   To change when this appears: See stage checks for 'briefing' in drawGame and drawLevelAnnouncements.
   =============================
  */
  /*
    MISSION BRIEF SCENARIO DATA
    ---------------------------
    This array now lives in mission_brief_data.js, which exports the list as `BattlechurchMissionBrief.scenarios`.
  */
  const missionBriefScenarios =
    (typeof window !== "undefined" &&
      window.BattlechurchMissionBrief &&
      window.BattlechurchMissionBrief.scenarios) ||
    [];

  function getScenarioTitle(scenario) {
    if (!scenario) return "";
    if (typeof scenario === "string") return scenario;
    if (typeof scenario === "object" && typeof scenario.title === "string") return scenario.title;
    return "";
  }

  function formatScenarioForSentence(text) {
    if (!text) return "";
    const trimmed = String(text).trim();
    if (!trimmed) return "";
    return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
  }

  function formatScenarioForTitle(text) {
    if (!text) return "";
    const trimmed = String(text).trim();
    if (!trimmed) return "";
    return trimmed.replace(/\b([a-z])/gi, (match) => match.toUpperCase());
  }

  /*
   MISSION BRIEF SCREEN
   --------------------
   This section handles the "Mission Brief" popup that appears before each month's battles.
   The Mission Brief creates an emotional connection from the player to the NPCs (the congregation)
   by naming the church members the player will be helping that month and why.

   - Appears before the month's battle (e.g., Level 1 - January)
   - Shows a list of NPC names for that month's battles
   - Purpose: Emotional connection, context for the player's mission

   Future plans:
   - The Mission Brief will eventually display:
     "Jon, Sally, etc. need your help with [insert one of many scenarios - such as 'dealing with the loss of a loved one' or 'forgiving a family member']"

   End Mission Brief comment section.
  */
// ...existing code...
// --- Restricted Zones System ---
// Define areas where entities cannot go (player, enemies, powerups, grace, etc.)
// Each zone is a function: (x, y) => true if point is inside restricted area
const restrictedZones = [
  // Upper-left diagonal zone: from (0,0) down to (0,266), up to (475,0)
  function upperLeftDiagonal(x, y) {
    // Check if point is inside triangle (0,0)-(0,266)-(475,0)
    // Use barycentric coordinates or area method
    const x1 = 0, y1 = 0;
    const x2 = 0, y2 = 266;
    const x3 = 475, y3 = 0;
    const denominator = ((y2 - y3)*(x1 - x3) + (x3 - x2)*(y1 - y3));
    const a = ((y2 - y3)*(x - x3) + (x3 - x2)*(y - y3)) / denominator;
    const b = ((y3 - y1)*(x - x3) + (x1 - x3)*(y - y3)) / denominator;
    const c = 1 - a - b;
    return a >= 0 && b >= 0 && c >= 0;
  }
  // Add more zones here as needed
];

// Utility: Check if a point is in any restricted zone
function isInRestrictedZone(x, y) {
  return restrictedZones.some(zone => zone(x, y));
}

// Example usage: Prevent entities from entering restricted zones
// (You will need to call isInRestrictedZone(x, y) in movement, spawn, and collision logic for player, enemies, powerups, grace, etc.)
// Example:
// if (isInRestrictedZone(player.x, player.y)) { /* prevent movement or reposition */ }
// ...existing code...
// MAJOR FEATURE: Weapon power-up timer (meter above player's head)
// The duration is set in game.js when picking up Scripture, Wisdom, or Faith power-ups:
//   player.weaponPowerTimer = def.duration || 8;
//   player.weaponPowerDuration = def.duration || 8;
// Default duration is 8 seconds if not specified in the power-up definition.
// ...existing code...
// Move all requireBindings usage inside drawCongregationScene after requireBindings is defined
/* Rendering module for Battlechurch */
const MELEE_SWING_DURATION = 0.2;
const MELEE_SWING_LENGTH = 260;

(function setupRenderer(window) {
  // Draws a name tag at (x, y)
  function drawNameTag(ctx, name, x, y, fontFamily) {
    if (!name) return;
    ctx.save();
    ctx.font = `12px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFC86A';
    ctx.fillText(name, x, y);
    ctx.restore();
  }
  if (!window) return;

  let bindings = null;

  function requireBindings() {
    if (!bindings) {
      throw new Error("Renderer.initialize must be called before rendering.");
    }
    return bindings;
  }


  function drawNpcProfileIcon(ctx, member, x, y, size = 34) {
    if (!ctx || !member) return;
    const clip = member.animator?.currentClip;
    if (clip?.image) {
      const frameWidth = clip.frameWidth || clip.image.width;
      const frameHeight = clip.frameHeight || clip.image.height;
      const frameIndex = member.animator?.frameIndex || 0;
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(
        clip.image,
        (frameIndex % (clip.frameMap?.length || frameWidth)) * frameWidth,
        0,
        frameWidth,
        frameHeight,
        x - size / 2,
        y - size / 2,
        size,
        size,
      );
      ctx.restore();
    } else {
      ctx.save();
      ctx.fillStyle = "#f7f7f7";
      ctx.beginPath();
      ctx.arc(x, y - 6, size / 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y + 6, size / 2.8, Math.PI, 0, false);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawHaloBlade(ctx, haloState) {
    if (!haloState || !haloState.active) return;
    const { player } = requireBindings();
    const haloRemaining = player?.haloTimer ?? null;
    if (Number.isFinite(haloRemaining) && haloRemaining <= 0) return;
    let fadeAlpha = 1;
    if (Number.isFinite(haloRemaining) && haloRemaining <= 1) {
      fadeAlpha = Math.max(0, Math.min(1, haloRemaining / 1));
      if (fadeAlpha <= 0) return;
    }
    const sprite = haloState.sprite;
    if (!sprite) return;
    if (Array.isArray(haloState.trail) && haloState.trail.length) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha *= fadeAlpha;
      ctx.shadowColor = "#FFE45C";
      ctx.shadowBlur = spearState.glowBlur || 14;
      ctx.lineCap = "round";
      const now = (typeof performance !== "undefined" ? performance.now() : Date.now()) * 0.001;
      ctx.beginPath();
      haloState.trail.forEach((point, idx) => {
        const jitter = Math.sin(now * 16 + idx * 1.1) * 1.2;
        if (idx === 0) {
          ctx.moveTo(point.x + jitter, point.y - jitter);
        } else {
          ctx.lineTo(point.x + jitter, point.y - jitter);
        }
      });
      ctx.strokeStyle = spearState.trailOuterColor || "#FFD94A";
      ctx.lineWidth = spearState.trailOuterWidth || 5;
      ctx.stroke();

      ctx.beginPath();
      haloState.trail.forEach((point, idx) => {
        const jitter = Math.sin(now * 16 + idx * 1.1) * 0.6;
        if (idx === 0) {
          ctx.moveTo(point.x + jitter, point.y - jitter);
        } else {
          ctx.lineTo(point.x + jitter, point.y - jitter);
        }
      });
      ctx.strokeStyle = spearState.trailInnerColor || "#FFF7A8";
      ctx.lineWidth = spearState.trailInnerWidth || 2.2;
      ctx.stroke();
      ctx.restore();
    }
    const size = Math.max(12, sprite.width || 12) * (haloState.scale || 1);
    const now = (typeof performance !== "undefined" ? performance.now() : Date.now()) * 0.001;
    const spin = now * 20;
    ctx.save();
    ctx.translate(haloState.x, haloState.y);
    ctx.rotate((haloState.angle || 0) + Math.PI / 2 + spin);
    ctx.globalAlpha = 0.95 * fadeAlpha;
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowColor = "#9BD9FF";
    ctx.shadowBlur = 28;
    ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
    ctx.shadowColor = "#E6F6FF";
    ctx.shadowBlur = 46;
    ctx.globalAlpha = 0.85 * fadeAlpha;
    ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  function drawSpearDart(ctx, spearState) {
    if (!spearState || !spearState.active) return;
    const { player } = requireBindings();
    const spearRemaining = player?.spearTimer ?? null;
    if (Number.isFinite(spearRemaining) && spearRemaining <= 0) return;
    let fadeAlpha = 1;
    if (Number.isFinite(spearRemaining) && spearRemaining <= 1) {
      fadeAlpha = Math.max(0, Math.min(1, spearRemaining / 1));
      if (fadeAlpha <= 0) return;
    }
    const sprite = spearState.sprite;
    if (!sprite) return;
    if (Array.isArray(spearState.trail) && spearState.trail.length) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha *= fadeAlpha;
      ctx.shadowColor = spearState.trailOuterColor || "#FFE45C";
      ctx.shadowBlur = spearState.glowBlur || 14;
      ctx.lineCap = "round";
      const now = (typeof performance !== "undefined" ? performance.now() : Date.now()) * 0.001;
      ctx.beginPath();
      spearState.trail.forEach((point, idx) => {
        const jitter = Math.sin(now * 16 + idx * 1.1) * 1.2;
        if (idx === 0) {
          ctx.moveTo(point.x + jitter, point.y - jitter);
        } else {
          ctx.lineTo(point.x + jitter, point.y - jitter);
        }
      });
      ctx.strokeStyle = spearState.trailOuterColor || "#FFD94A";
      ctx.lineWidth = spearState.trailOuterWidth || 5;
      ctx.stroke();

      ctx.beginPath();
      spearState.trail.forEach((point, idx) => {
        const jitter = Math.sin(now * 16 + idx * 1.1) * 0.6;
        if (idx === 0) {
          ctx.moveTo(point.x + jitter, point.y - jitter);
        } else {
          ctx.lineTo(point.x + jitter, point.y - jitter);
        }
      });
      ctx.strokeStyle = spearState.trailInnerColor || "#FFF7A8";
      ctx.lineWidth = spearState.trailInnerWidth || 2.2;
      ctx.stroke();
      ctx.restore();
    }
    const size = Math.max(12, sprite.width || 12) * (spearState.scale || 1);
    ctx.save();
    ctx.translate(spearState.x, spearState.y);
    ctx.rotate((spearState.angle || 0) + Math.PI / 4);
    const now = (typeof performance !== "undefined" ? performance.now() : Date.now()) * 0.001;
    const pauseFlash =
      spearState.pauseTimer > 0
        ? 0.6 + Math.abs(Math.sin(now * 18)) * 0.4
        : 0;
    if (pauseFlash > 0) {
      ctx.globalCompositeOperation = "lighter";
      ctx.shadowColor = spearState.pauseFlashColor || "#FFF6A5";
      ctx.shadowBlur = spearState.pauseFlashBlur || 28;
      ctx.globalAlpha = pauseFlash * fadeAlpha;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.75, 0, Math.PI * 2);
      ctx.fillStyle = spearState.pauseFlashColor || "#FFF0A0";
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    }
    ctx.shadowColor = spearState.glowColor || "#FFE86B";
    ctx.shadowBlur = spearState.glowBlur || 18;
    ctx.globalAlpha = 0.98 * fadeAlpha;
    ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  function drawSentryTurret(ctx, sentryState) {
    if (!sentryState || !sentryState.active) return;
    const sprite = sentryState.sprite;
    const fadeAlpha = Number.isFinite(sentryState.fadeAlpha)
      ? Math.max(0, Math.min(1, sentryState.fadeAlpha))
      : 1;
    const hasBeam =
      sentryState.beamActive &&
      Number.isFinite(sentryState.beamLength) &&
      sentryState.beamLength > 2;
    if (hasBeam) {
      const startX = sentryState.x;
      const startY = sentryState.y;
      const endX = sentryState.beamEndX;
      const endY = sentryState.beamEndY;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = fadeAlpha;
      ctx.lineCap = "round";
      ctx.shadowColor = "rgba(255, 220, 160, 0.8)";
      ctx.shadowBlur = 22;
      const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
      gradient.addColorStop(0, sentryState.beamOuterColor || "rgba(255, 214, 140, 0.85)");
      gradient.addColorStop(1, "rgba(255, 140, 80, 0.2)");
      ctx.strokeStyle = gradient;
      ctx.lineWidth = sentryState.beamOuterWidth || 10;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      ctx.shadowColor = "rgba(255, 245, 210, 0.95)";
      ctx.shadowBlur = 14;
      ctx.strokeStyle = sentryState.beamInnerColor || "rgba(255, 250, 220, 0.95)";
      ctx.lineWidth = sentryState.beamInnerWidth || 4;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.restore();
    }

    if (sprite) {
      const size = Math.max(14, sprite.width || 14) * (sentryState.scale || 1);
      ctx.save();
      ctx.translate(sentryState.x, sentryState.y);
      ctx.globalCompositeOperation = "lighter";
      ctx.shadowColor = sentryState.glowColor || "rgba(255, 220, 140, 0.7)";
      ctx.shadowBlur = sentryState.glowBlur || 14;
      ctx.globalAlpha = fadeAlpha;
      ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
      ctx.shadowColor = sentryState.glowColor || "rgba(255, 245, 210, 0.7)";
      ctx.shadowBlur = sentryState.glowBlur ? sentryState.glowBlur + 6 : 20;
      ctx.globalAlpha = 0.8 * fadeAlpha;
      ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
      ctx.restore();
    }
  }

  function initialize(stateBindings) {
    bindings = stateBindings || null;
  }

  // Internal state for level-summary reveal animation
  const summaryReveal = {
    currentAnnouncementId: null,
    textProgress: 0,
    lastTime: 0,
    revealedSaved: 0,
    revealedLost: 0,
    portraitTimer: 0,
  };
  let recapCongregationPreviewBuilt = false;
  let recapCongregationLastTime = 0;
  const recapTallyState = {
    id: null,
    stepIndex: 0,
    phase: "line",
    lineValue: 0,
    lineTarget: null,
    totalValue: 0,
    totalTarget: null,
    stepProgress: 0,
    lastUpdate: 0,
    done: false,
    finalSfxPlayed: false,
    pauseTimer: 0,
    flashTimer: 0,
    graceEffects: [],
    lastAppliedIndex: -1,
    ghostEffects: [],
    pendingGhost: null,
    graceFlySfxPlayed: false,
    showContinue: false,
    continueTimer: 0,
    headerPhase: "title",
    headerTimer: 0,
    showCount: false,
    allowLines: false,
    titleSfxPlayed: false,
    countSfxPlayed: false,
    lineSfxIndex: -1,
  };
  const RECAP_LINE_PAUSE = 1.0;
  const RECAP_FIRST_LINE_PAUSE = 1.0;
  const RECAP_FLASH_DURATION = 0.6;
  const RECAP_CONTINUE_DELAY = 1.0;
  const SHOW_TEXT_SOURCE_LABELS = false;
  const TEXT_STYLES = {
    h1: { size: 56, weight: 900, lineHeight: 1.05 },
    h2: { size: 40, weight: 800, lineHeight: 1.2 },
    h3: { size: 28, weight: 700, lineHeight: 1.2 },
    body: { size: 20, weight: 600, lineHeight: 1.3 },
  };
  const announcementReveal = new Map();

  function isAnnouncementRevealComplete(title, subtitle = "") {
    const key = `${String(title || "")}||${String(subtitle || "")}`;
    const entry = announcementReveal.get(key);
    if (!entry) return false;
    const titleDone = entry.titleProgress >= String(title || "").length;
    const subtitleDone = String(subtitle || "").length
      ? entry.subtitleProgress >= String(subtitle || "").length
      : true;
    return titleDone && subtitleDone;
  }

  function drawDevLabel(ctx, text, x, y, alpha, fontFamily) {
    if (!SHOW_TEXT_SOURCE_LABELS || !text) return;
    ctx.save();
    ctx.font = `11px ${fontFamily}`;
    ctx.textAlign = "center";
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width || 0;
    const paddingX = 6;
    const paddingY = 4;
    const boxWidth = textWidth + paddingX * 2;
    const boxHeight = 14 + paddingY;
    ctx.fillStyle = `rgba(5, 10, 18, ${0.6 * alpha})`;
    ctx.fillRect(x - boxWidth / 2, y - boxHeight + 2, boxWidth, boxHeight);
    ctx.fillStyle = `rgba(200, 220, 245, ${0.95 * alpha})`;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  const ANNOUNCEMENT_FONT_FAMILY = "'Orbitron', sans-serif";
  const waveClearWipes = [];
  let lastStageForWipe = null;

  function updateWaveClearWipe(levelStatus, nowMs, levelAnnouncements) {
    if (!levelStatus) {
      lastStageForWipe = null;
      waveClearWipes.length = 0;
      return;
    }
    const stage = levelStatus.stage || "";
    const announcementTitle = String(levelAnnouncements?.[0]?.title || "");
    const isFinalWaveClear = Boolean(levelStatus.finalWaveCleared) ||
      announcementTitle.toLowerCase().includes("final wave cleared");
    if (stage === "waveCleared" && lastStageForWipe !== "waveCleared") {
      if (!isFinalWaveClear) {
        const delay = 1000;
        waveClearWipes.push({ start: nowMs + delay });
      }
    }
    lastStageForWipe = stage;
  }

  function drawWaveClearWipe(ctx, canvas, nowMs) {
    if (!waveClearWipes.length) return;
    const duration = 750;
    const bandWidth = canvas.width * 0.75;
    const diag = Math.hypot(canvas.width, canvas.height);
    const travel = diag + bandWidth;
    for (let i = waveClearWipes.length - 1; i >= 0; i -= 1) {
      const wipe = waveClearWipes[i];
      const elapsed = nowMs - wipe.start;
      if (elapsed < 0) continue;
      if (elapsed >= duration) {
        waveClearWipes.splice(i, 1);
        continue;
      }
      const t = Math.min(1, Math.max(0, elapsed / duration));
      const ease = t * t * (3 - 2 * t);
      const offset = -bandWidth + ease * travel;
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.translate(canvas.width * 0.5, canvas.height * 0.5);
      ctx.rotate(-Math.PI / 6);
      ctx.translate(-canvas.width * 0.5, -canvas.height * 0.5);
      ctx.fillStyle = "rgba(200, 40, 40, 1)";
      ctx.beginPath();
      ctx.moveTo(offset, -diag);
      ctx.lineTo(offset + bandWidth, -diag);
      ctx.lineTo(offset + bandWidth + bandWidth * 0.25, diag * 2);
      ctx.lineTo(offset + bandWidth * 0.25, diag * 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function isAnnouncementButtonFocused(screenKey, index) {
    if (typeof window === "undefined") return false;
    const focus = window.__announcementFocus;
    return Boolean(focus && focus.key === screenKey && focus.index === index);
  }

  function wrapAnnouncementText(ctx, text, maxWidth) {
    const paragraphs = String(text || "").split("\n");
    const lines = [];
    paragraphs.forEach((para, index) => {
      const words = para.split(/\s+/).filter(Boolean);
      let line = "";
      words.forEach((word) => {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width <= maxWidth || !line) {
          line = test;
        } else {
          lines.push(line);
          line = word;
        }
      });
      if (line) lines.push(line);
      if (index < paragraphs.length - 1) {
        lines.push("");
      }
    });
    return lines;
  }

  function getAnnouncementTextLayout(ctx, canvas, {
    title,
    subtitle,
    titleSize = TEXT_STYLES.h2.size,
    subtitleSize = TEXT_STYLES.body.size,
    lineGap = Math.round(TEXT_STYLES.h2.size * TEXT_STYLES.h2.lineHeight),
    weight = TEXT_STYLES.h2.weight,
    maxWidthScale = 0.96,
  }) {
    const scaleHint = Math.min(
      1,
      Math.max(0.6, Math.min(canvas.width / 1280, canvas.height / 720)),
    );
    const effectiveTitleSize = Math.round(titleSize * scaleHint);
    const effectiveSubtitleSize = Math.round(subtitleSize * scaleHint);
    const effectiveLineGap = Math.round(lineGap * scaleHint);
    const maxWidth = canvas.width * maxWidthScale;
    ctx.save();
    ctx.font = `${weight} ${effectiveTitleSize}px ${ANNOUNCEMENT_FONT_FAMILY}`;
    const titleLines = title ? wrapAnnouncementText(ctx, title, maxWidth) : [];
    const subtitleLines = subtitle ? wrapAnnouncementText(ctx, subtitle, maxWidth) : [];
    ctx.restore();
    const titleLineHeight = Math.round(effectiveTitleSize * TEXT_STYLES.h2.lineHeight);
    const subtitleLineHeight = Math.round(effectiveSubtitleSize * TEXT_STYLES.body.lineHeight);
    const gapAfterTitle = subtitleLines.length ? Math.max(0, effectiveLineGap - titleLineHeight) : 0;
    const textBlockHeight =
      titleLines.length * titleLineHeight +
      gapAfterTitle +
      subtitleLines.length * subtitleLineHeight;
    return {
      effectiveTitleSize,
      effectiveSubtitleSize,
      effectiveLineGap,
      titleLines,
      subtitleLines,
      titleLineHeight,
      subtitleLineHeight,
      gapAfterTitle,
      textBlockHeight,
      maxWidth,
    };
  }

  function getAnnouncementScreenLayout(ctx, canvas, options = {}) {
    const {
      title = "",
      subtitle = "",
      titleSize = TEXT_STYLES.h2.size,
      subtitleSize = TEXT_STYLES.body.size,
      lineGap = Math.round(TEXT_STYLES.h2.size * TEXT_STYLES.h2.lineHeight),
      weight = TEXT_STYLES.h2.weight,
      maxWidthScale = 0.96,
      virtualWidth = 1280,
      virtualHeight = 720,
      position = "lowerThird",
      topMargin = 90,
      bottomMargin = 70,
      rowGap = 40,
      buttonHeight = 64,
      buttonCount = 0,
      promptSize = 0,
      promptGap = 18,
      HUD_HEIGHT = 54,
    } = options;
    const scale = Math.min(canvas.width / virtualWidth, canvas.height / virtualHeight);
    const offsetX = Math.round((canvas.width - virtualWidth * scale) / 2);
    const offsetY = Math.round((canvas.height - virtualHeight * scale) / 2);
    const virtualCanvas = { width: virtualWidth, height: virtualHeight };
    const textLayout = getAnnouncementTextLayout(ctx, virtualCanvas, {
      title,
      subtitle,
      titleSize,
      subtitleSize,
      lineGap,
      weight,
      maxWidthScale,
    });
    const promptLineHeight = promptSize
      ? Math.round(promptSize * TEXT_STYLES.h2.lineHeight)
      : 0;
    const buttonBlockHeight = buttonCount
      ? (promptLineHeight
          ? promptLineHeight + promptGap + buttonHeight
          : rowGap + buttonHeight)
      : 0;
    const stackHeight = textLayout.textBlockHeight + buttonBlockHeight;
    const stackTopY = getAnnouncementScreenTopY({
      canvasHeight: virtualHeight,
      HUD_HEIGHT,
      blockHeight: stackHeight,
      position,
      topMargin,
      bottomMargin,
    });
    const titleY = stackTopY + textLayout.titleLineHeight;
    const promptY = promptLineHeight
      ? stackTopY + textLayout.textBlockHeight + promptLineHeight
      : null;
    const buttonY = buttonCount
      ? stackTopY +
        textLayout.textBlockHeight +
        (promptLineHeight ? promptLineHeight + promptGap : rowGap)
      : null;
    return {
      scale,
      offsetX,
      offsetY,
      virtualCanvas,
      titleY,
      promptY,
      buttonY,
      textLayout,
    };
  }

  function drawAnnouncementText(ctx, canvas, {
    title,
    subtitle,
    yBase,
    alpha = 1,
    titleSize = TEXT_STYLES.h2.size,
    subtitleSize = TEXT_STYLES.body.size,
    lineGap = Math.round(TEXT_STYLES.h2.size * TEXT_STYLES.h2.lineHeight),
    weight = TEXT_STYLES.h2.weight,
    subtitleWeight = TEXT_STYLES.body.weight,
    typewriter = false,
    highlight = null,
    maxWidthScale = 0.96,
    blockAlign = "center",
  }) {
    const scaleHint = Math.min(
      1,
      Math.max(0.6, Math.min(canvas.width / 1280, canvas.height / 720)),
    );
    const effectiveTitleSize = Math.round(titleSize * scaleHint);
    const effectiveSubtitleSize = Math.round(subtitleSize * scaleHint);
    const effectiveLineGap = Math.round(lineGap * scaleHint);
    // "Announcement Text" refers to this renderer's font/size/wrap style.
    // "Announcement Text Engine" means this renderer at full-width on the main canvas.
    const wrapText = (text, maxWidth) => wrapAnnouncementText(ctx, text, maxWidth);
    ctx.save();
    ctx.globalAlpha = 0.98 * alpha;
    ctx.fillStyle = "#EAF6FF";
    ctx.font = `${weight} ${effectiveTitleSize}px ${ANNOUNCEMENT_FONT_FAMILY}`;
    ctx.shadowColor = "rgba(6, 10, 18, 0.85)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    const titleText = String(title || "");
    const subtitleText = String(subtitle || "");
    const fullBlockPadding = (blockAlign === "full" || blockAlign === "fullCenter") ? 48 : 24;
    let maxWidth = canvas.width * maxWidthScale;
    if (blockAlign === "full" || blockAlign === "fullCenter") {
      maxWidth = Math.max(0, canvas.width * maxWidthScale - fullBlockPadding * 2);
    }
    const titleLineHeight = Math.round(effectiveTitleSize * TEXT_STYLES.h2.lineHeight);
    const subtitleLineHeight = Math.round(effectiveSubtitleSize * TEXT_STYLES.body.lineHeight);
    ctx.font = `${weight} ${effectiveTitleSize}px ${ANNOUNCEMENT_FONT_FAMILY}`;
    const titleLines = titleText ? wrapText(titleText, maxWidth) : [];
    ctx.font = `${subtitleWeight} ${effectiveSubtitleSize}px ${ANNOUNCEMENT_FONT_FAMILY}`;
    const subtitleLines = subtitleText ? wrapText(subtitleText, maxWidth) : [];
    let displayTitle = titleText;
    let displaySubtitle = subtitleText;
    if (typewriter) {
      const now = performance.now();
      const key = `${titleText}||${subtitleText}`;
      let entry = announcementReveal.get(key);
      if (!entry) {
        entry = { titleProgress: 0, subtitleProgress: 0, lastTime: now };
        announcementReveal.set(key, entry);
      }
      const dt = Math.max(0, now - (entry.lastTime || now));
      entry.lastTime = now;
      const titleRate = 18;
      const subtitleRate = 18;
      if (entry.titleProgress < titleText.length) {
        entry.titleTimer = (entry.titleTimer || 0) + dt;
        while (entry.titleTimer >= titleRate && entry.titleProgress < titleText.length) {
          entry.titleProgress += 1;
          entry.titleTimer -= titleRate;
        }
      } else if (subtitleText) {
        entry.subtitleTimer = (entry.subtitleTimer || 0) + dt;
        while (entry.subtitleTimer >= subtitleRate && entry.subtitleProgress < subtitleText.length) {
          entry.subtitleProgress += 1;
          entry.subtitleTimer -= subtitleRate;
        }
      }
      displayTitle = titleText.slice(0, entry.titleProgress);
      displaySubtitle = subtitleText.slice(0, entry.subtitleProgress);
    }
    ctx.textAlign = "left";
    const blockLeft = (blockAlign === "full" || blockAlign === "fullCenter")
      ? fullBlockPadding
      : Math.round(canvas.width / 2 - maxWidth / 2);
    let titleX = blockLeft;
    let subtitleX = blockLeft;
    const centerLines = blockAlign === "fullCenter";
    if (blockAlign === "center") {
      ctx.font = `${weight} ${effectiveTitleSize}px ${ANNOUNCEMENT_FONT_FAMILY}`;
      const fullTitleWidths = titleLines.map((line) => ctx.measureText(line).width || 0);
      const titleBlockWidth = fullTitleWidths.length ? Math.max(...fullTitleWidths) : 0;
      titleX = canvas.width / 2 - titleBlockWidth / 2;
    }
    let remainingTitle = displayTitle.length;
    let currentY = yBase;
    titleLines.forEach((line) => {
      if (!line) return;
      const visible = remainingTitle <= 0 ? "" : line.slice(0, remainingTitle);
      remainingTitle = Math.max(0, remainingTitle - line.length);
      if (visible) {
        const lineX = centerLines
          ? canvas.width / 2 - (ctx.measureText(visible).width || 0) / 2
          : titleX;
        ctx.fillText(visible, lineX, currentY);
      }
      currentY += titleLineHeight;
    });
    if (subtitleLines.length) {
      currentY += Math.max(0, effectiveLineGap - titleLineHeight);
    ctx.font = `${subtitleWeight} ${effectiveSubtitleSize}px ${ANNOUNCEMENT_FONT_FAMILY}`;
      if (blockAlign === "center") {
        const fullSubtitleWidths = subtitleLines.map((line) => ctx.measureText(line).width || 0);
        const subtitleBlockWidth = fullSubtitleWidths.length ? Math.max(...fullSubtitleWidths) : 0;
        subtitleX = canvas.width / 2 - subtitleBlockWidth / 2;
      }
      let remainingSubtitle = displaySubtitle.length;
      const highlightText = highlight?.text ? String(highlight.text) : "";
      const highlightColor = highlight?.color || "#ffd978";
      const fullSubtitleText = subtitleText;
      let highlightStart = -1;
      let highlightEnd = -1;
      if (highlightText) {
        highlightStart = fullSubtitleText.indexOf(highlightText);
        if (highlightStart >= 0) {
          highlightEnd = highlightStart + highlightText.length;
        }
      }
      let globalIndex = 0;
      subtitleLines.forEach((line) => {
        const visible = remainingSubtitle <= 0 ? "" : line.slice(0, remainingSubtitle);
        remainingSubtitle = Math.max(0, remainingSubtitle - line.length);
        const lineBaseX = centerLines
          ? canvas.width / 2 - (ctx.measureText(visible).width || 0) / 2
          : subtitleX;
        if (visible) {
          if (highlightStart >= 0 && highlightEnd > globalIndex && highlightStart < globalIndex + visible.length) {
            const localStart = Math.max(0, highlightStart - globalIndex);
            const localEnd = Math.min(visible.length, highlightEnd - globalIndex);
            const before = visible.slice(0, localStart);
            const mid = visible.slice(localStart, localEnd);
            const after = visible.slice(localEnd);
            let cursorX = lineBaseX;
            ctx.fillStyle = "#EAF6FF";
            if (before) {
              ctx.fillText(before, cursorX, currentY);
              cursorX += ctx.measureText(before).width || 0;
            }
            if (mid) {
              ctx.fillStyle = highlightColor;
              ctx.fillText(mid, cursorX, currentY);
              cursorX += ctx.measureText(mid).width || 0;
            }
            if (after) {
              ctx.fillStyle = "#EAF6FF";
              ctx.fillText(after, cursorX, currentY);
            }
          } else {
            ctx.fillStyle = "#EAF6FF";
            ctx.fillText(visible, lineBaseX, currentY);
          }
        }
        currentY += subtitleLineHeight;
        globalIndex += line.length + 1;
      });
    }
    ctx.restore();
  }

  function getAnnouncementYBase(HUD_HEIGHT) {
    const { canvas } = requireBindings();
    const lowerThird = Math.floor(canvas.height * 0.84);
    return Math.max(HUD_HEIGHT + 120, lowerThird);
  }

  function getAnnouncementTitleY(HUD_HEIGHT, boxHeight) {
    let yBase = getAnnouncementYBase(HUD_HEIGHT);
    const boxY = yBase - boxHeight / 2;
    return boxY + 46;
  }

  function getAnnouncementTitleYForCanvas(canvasHeight, HUD_HEIGHT, boxHeight) {
    const lowerThird = Math.floor(canvasHeight * 0.84);
    const yBase = Math.max(HUD_HEIGHT + 120, lowerThird);
    const boxY = yBase - boxHeight / 2;
    return boxY + 46;
  }

  // Announcement Screen Engine position presets for future screens.
  function getAnnouncementScreenTopY({
    canvasHeight,
    HUD_HEIGHT = 54,
    blockHeight,
    position = "lowerThird",
    topMargin = 90,
    bottomMargin = 90,
  }) {
    if (position === "top") {
      return topMargin;
    }
    if (position === "bottom") {
      return Math.max(topMargin, canvasHeight - bottomMargin - blockHeight);
    }
    if (position === "center") {
      return Math.max(topMargin, Math.round(canvasHeight / 2 - blockHeight / 2));
    }
    // Default: lower third.
    const lowerThirdY = Math.floor(canvasHeight * 0.84) - blockHeight;
    return Math.max(topMargin, Math.round(lowerThirdY));
  }

  function resolveCameraX(explicitValue) {
    const { cameraOffsetX } = requireBindings();
    return typeof explicitValue === "number" ? explicitValue : cameraOffsetX;
  }

  const missionBriefOverlayState = {
    id: null,
    shown: false,
    active: false,
  };

function showMissionBriefDialog(title, body, identifier, highlight = null, options = {}) {
  if (!window.DialogOverlay) return false;
  if (missionBriefOverlayState.id === identifier && missionBriefOverlayState.shown) return false;
  if (missionBriefOverlayState.active) return true;
  missionBriefOverlayState.id = identifier;
  missionBriefOverlayState.shown = false;
  missionBriefOverlayState.active = true;
  window.isMissionBriefOverlayActive = true;
  window.__missionBriefRevealKey = identifier;
  window.__missionBriefFormationShown = false;
  const devTitle = title;
  if (typeof window.stopIntroMusic === "function") {
    window.stopIntroMusic();
  }
  if (typeof window.clearFormationSelection === "function") {
    window.clearFormationSelection();
  }
  const showFormation = options?.showFormation !== false;
  const useAnnouncementText = options?.useAnnouncementText === true;
  const formationOptions = [
    {
      key: "circle",
      label: "GUIDED COURSE",
      desc: "Focused teaching and practical insight",
      stat: "+Damage",
    },
    {
      key: "line",
      label: "BIBLE STUDY",
      desc: "Scripture study and shared prayer",
      stat: "+Rate of Fire",
    },
    {
      key: "crescent",
      label: "CARE CIRCLE",
      desc: "Guided group sharing and mutual support",
      stat: "+Power-up duration",
    },
  ];
  const escapeHtml = (value) =>
    String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  const buttonsHtml = formationOptions
    .map(
      (opt) =>
        `<button class="formation-option" data-formation="${opt.key}">
          <span class="formation-option__label">${opt.label}</span>
          <span class="formation-option__desc">${opt.desc}</span>
          <span class="formation-option__stat"><strong>${opt.stat || ""}</strong></span>
        </button>`,
    )
    .join("");
  const bodyHtml = `
    <div class="mission-brief-prompt">How will you focus them?</div>
    <div class="formation-picker">${buttonsHtml}</div>
  `;
  const finishMissionBrief = (shouldHide = false) => {
    missionBriefOverlayState.active = false;
    missionBriefOverlayState.shown = true;
    dismissCurrentLevelAnnouncement();
    window.isMissionBriefOverlayActive = false;
    if (shouldHide && window.DialogOverlay?.hide) {
      window.DialogOverlay.hide();
    }
  };
  window.DialogOverlay.show({
    title: devTitle,
    bodyHtml,
    buttonText: showFormation ? "" : "Continue (Space)",
    variant: "mission",
    devLabel: "",
    onRender: ({ overlay, buttonEl }) => {
      if (buttonEl) buttonEl.style.display = showFormation ? "none" : "inline-flex";
      if (useAnnouncementText) {
        overlay.style.setProperty("background", "transparent", "important");
        overlay.style.setProperty("background-image", "none", "important");
      } else {
        overlay.style.removeProperty("background");
        overlay.style.removeProperty("background-image");
      }
      const bodyEl = overlay.querySelector(".dialog-overlay__body");
      if (bodyEl && useAnnouncementText) {
        bodyEl.style.display = "flex";
        bodyEl.style.flexDirection = "column";
        bodyEl.style.alignItems = "center";
        bodyEl.style.paddingTop = "0";
        bodyEl.style.width = "100%";
        bodyEl.style.boxSizing = "border-box";
        bodyEl.style.marginTop = "0";
        bodyEl.style.position = "absolute";
        bodyEl.style.left = "0";
        bodyEl.style.right = "0";
        bodyEl.style.bottom = "6vh";
        bodyEl.style.paddingLeft = "6%";
        bodyEl.style.paddingRight = "6%";
      } else if (bodyEl) {
        bodyEl.style.display = "";
        bodyEl.style.flexDirection = "";
        bodyEl.style.alignItems = "";
        bodyEl.style.paddingTop = "";
        bodyEl.style.boxSizing = "";
        bodyEl.style.position = "";
        bodyEl.style.left = "";
        bodyEl.style.right = "";
        bodyEl.style.bottom = "";
        bodyEl.style.paddingLeft = "";
        bodyEl.style.paddingRight = "";
      }
      const titleEl = overlay.querySelector(".dialog-overlay__title");
      if (titleEl) {
        titleEl.style.marginTop = "12px";
        if (useAnnouncementText) {
          titleEl.style.display = "none";
        }
      }
      const prompt = overlay.querySelector(".mission-brief-prompt");
      const picker = overlay.querySelector(".formation-picker");
      const contentWidth = "84%";
      if (picker) {
        picker.style.display = showFormation ? "grid" : "none";
        picker.style.gridTemplateColumns = "repeat(3, minmax(0, 1fr))";
        picker.style.gap = "10px";
        picker.style.width = contentWidth;
        picker.style.margin = "0 auto";
      }
      const typeText = (el, text, msPerChar = 8) =>
        new Promise((resolve) => {
          if (!el) {
            resolve();
            return;
          }
          el.textContent = text;
          const fullHeight = el.scrollHeight;
          if (fullHeight) {
            el.style.minHeight = `${fullHeight}px`;
          }
          el.textContent = "";
          let idx = 0;
          const timer = setInterval(() => {
            idx += 1;
            el.textContent = text.slice(0, idx);
            if (idx >= text.length) {
              clearInterval(timer);
              resolve();
            }
          }, msPerChar);
          el.__typeTimer = timer;
        });
      if (overlay.__missionBriefTypeTimer) clearInterval(overlay.__missionBriefTypeTimer);
      if (overlay.__missionBriefDelayTimer) clearTimeout(overlay.__missionBriefDelayTimer);
      if (useAnnouncementText) {
        if (prompt) {
          prompt.style.display = "none";
          prompt.style.width = contentWidth;
          prompt.style.margin = "0 auto 12px";
        }
        if (picker) picker.style.display = "none";
        window.__missionBriefRevealFormation = () => {
          if (window.__missionBriefFormationShown) return;
          window.__missionBriefFormationShown = true;
          if (prompt) prompt.style.display = showFormation ? "block" : "none";
          if (picker) picker.style.display = showFormation ? "grid" : "none";
        };
        if (window.__missionBriefFormationTimer) {
          clearTimeout(window.__missionBriefFormationTimer);
        }
        const estimateMs = (String(title || "").length + String(body || "").length) * 18 + 600;
        window.__missionBriefFormationTimer = setTimeout(() => {
          window.__missionBriefRevealFormation?.();
        }, Math.min(8000, Math.max(1200, estimateMs)));
      }
      if (!picker || !showFormation) return;
      picker.querySelectorAll(".formation-option").forEach((btn) => {
        btn.addEventListener("click", () => {
          const key = btn.getAttribute("data-formation");
          if (typeof window !== "undefined" && typeof window.playMenuItemPickSfx === "function") {
            window.playMenuItemPickSfx(0.55);
          }
          if (typeof window.selectFormation === "function") {
            window.selectFormation(key);
          }
          if (typeof window.startBattleMusicFromFormation === "function") {
            window.startBattleMusicFromFormation();
          }
          if (typeof window.applyFormationAnchors === "function") {
            try { window.applyFormationAnchors(); } catch (e) {}
          }
          // Auto-advance once a formation is picked so Space is not required.
          finishMissionBrief(true);
        });
      });
    },
    onContinue: () => {
      finishMissionBrief(false);
    },
  });
  return true;
}

function drawMissionBriefScreen(ctx, canvas, options = {}) {
  const {
    title = "",
    subtitle = "",
    highlight = null,
    showFormation = true,
    showButtons = true,
    uiFontFamily = "sans-serif",
    buttonKey = "missionBrief",
    setMissionBriefActive = true,
    titleSize = TEXT_STYLES.h1.size,
    titleWeight = TEXT_STYLES.h1.weight,
    bodySize = TEXT_STYLES.h2.size,
    bodyWeight = TEXT_STYLES.h2.weight,
  } = options;
  const promptText = "How will you focus them?";
  const combinedSubtitle = showFormation ? `${subtitle}\n${promptText}` : subtitle;
  const promptSize = 0;
  const displayButtons = showButtons !== false;
  const buttonHeight = displayButtons ? (showFormation ? 120 : 72) : 0;
  const layoutButtonCount = displayButtons ? (showFormation ? 3 : 1) : 0;
  ctx.save();
  const layout = getAnnouncementScreenLayout(ctx, canvas, {
    title,
    subtitle: combinedSubtitle,
    titleSize,
    subtitleSize: bodySize,
    lineGap: Math.round(titleSize * TEXT_STYLES.h1.lineHeight),
    weight: titleWeight,
    maxWidthScale: 0.96,
    position: "top",
    topMargin: 90,
    bottomMargin: showFormation ? 70 : 100,
    rowGap: showFormation ? 40 : 60,
    buttonHeight,
    buttonCount: layoutButtonCount,
    promptSize,
    promptGap: 18,
  });
  ctx.translate(layout.offsetX, layout.offsetY);
  ctx.scale(layout.scale, layout.scale);

  drawAnnouncementText(ctx, layout.virtualCanvas, {
    title,
    subtitle: combinedSubtitle,
    yBase: layout.titleY,
    titleSize,
    subtitleSize: bodySize,
    weight: titleWeight,
    subtitleWeight: bodyWeight,
    lineGap: Math.round(titleSize * TEXT_STYLES.h1.lineHeight),
    alpha: 1,
    typewriter: true,
    highlight,
    maxWidthScale: 0.96,
    blockAlign: showFormation ? "center" : "full",
  });

  const revealComplete = isAnnouncementRevealComplete(title, combinedSubtitle);
  if (!revealComplete) {
    if (typeof window !== "undefined") {
      if (setMissionBriefActive) {
        window.__missionBriefActive = false;
        window.__missionBriefButtonBounds = null;
      }
      window.__announcementButtons = { key: buttonKey, buttons: [] };
    }
    ctx.restore();
    return;
  }
  if (!displayButtons) {
    if (typeof window !== "undefined") {
      if (setMissionBriefActive) {
        window.__missionBriefActive = false;
        window.__missionBriefButtonBounds = null;
      }
      window.__announcementButtons = { key: buttonKey, buttons: [] };
    }
    ctx.restore();
    return;
  }

  const buttonConfigs = showFormation
    ? [
        {
          key: "circle",
          label: "GUIDED COURSE",
          desc: "Focused teaching and practical insight",
          stat: "+Damage",
        },
        {
          key: "line",
          label: "BIBLE STUDY",
          desc: "Scripture study and shared prayer",
          stat: "+Rate of Fire",
        },
        {
          key: "crescent",
          label: "CARE CIRCLE",
          desc: "Guided group sharing and mutual support",
          stat: "+Power-up duration",
        },
      ]
    : [
        {
          key: "continue",
          label: "Continue (Space)",
          desc: "",
          stat: "",
        },
      ];
  const buttonCount = buttonConfigs.length;
  const buttonGap = showFormation ? 22 : 0;
  const sidePadding = 90;
  const totalAvailable = layout.virtualCanvas.width - sidePadding * 2;
  const buttonWidth = showFormation
    ? Math.floor((totalAvailable - buttonGap * (buttonCount - 1)) / buttonCount)
    : Math.min(420, totalAvailable);
  const buttonRowWidth = showFormation
    ? buttonWidth * buttonCount + buttonGap * (buttonCount - 1)
    : buttonWidth;
  const buttonStartX = Math.round((layout.virtualCanvas.width - buttonRowWidth) / 2);
  const buttonY = Math.round(layout.buttonY || 0);
  const promptY = layout.promptY;

  if (!showFormation && promptText && promptY) {
    ctx.save();
    ctx.fillStyle = "#EAF6FF";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = `${TEXT_STYLES.h2.weight} ${promptSize}px 'Orbitron', sans-serif`;
    ctx.shadowColor = "rgba(6, 10, 18, 0.85)";
    ctx.shadowBlur = 18;
    ctx.fillText(promptText, layout.virtualCanvas.width / 2, promptY);
    ctx.restore();
  }

  const bounds = [];
    buttonConfigs.forEach((config, index) => {
      const x = showFormation ? buttonStartX + index * (buttonWidth + buttonGap) : buttonStartX;
      ctx.save();
      ctx.fillStyle = "#9BD9FF";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 2;
      roundRect(ctx, x, buttonY, buttonWidth, buttonHeight, 18, true, true);
      if (isAnnouncementButtonFocused("missionBrief", index)) {
        drawFocusRing(ctx, x - 3, buttonY - 3, buttonWidth + 6, buttonHeight + 6, 20);
        drawButtonReflection(ctx, x, buttonY, buttonWidth, buttonHeight, 18, 0.45);
      }
      ctx.fillStyle = "#0b111a";
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.font = `600 ${showFormation ? 28 : 24}px ${uiFontFamily}`;
    ctx.fillText(config.label, x + buttonWidth / 2, buttonY + 40);
    if (config.desc) {
      ctx.font = `16px ${uiFontFamily}`;
      ctx.fillStyle = "rgba(11, 17, 26, 0.78)";
      ctx.fillText(config.desc, x + buttonWidth / 2, buttonY + 66);
    }
    if (config.stat) {
      ctx.font = `700 15px ${uiFontFamily}`;
      ctx.fillStyle = "rgba(11, 17, 26, 0.7)";
      ctx.fillText(config.stat, x + buttonWidth / 2, buttonY + 90);
    }
    ctx.restore();

    bounds.push({
      key: config.key,
      x: layout.offsetX + x * layout.scale,
      y: layout.offsetY + buttonY * layout.scale,
      width: buttonWidth * layout.scale,
      height: buttonHeight * layout.scale,
    });
  });

  if (typeof window !== "undefined") {
    if (setMissionBriefActive) {
      window.__missionBriefActive = true;
      window.__missionBriefButtonBounds = bounds;
    }
    window.__announcementButtons = { key: buttonKey, buttons: bounds };
  }

  ctx.restore();
}

function resetRecapTallyState(recapData) {
  recapTallyState.id = recapData?.id || null;
  recapTallyState.stepIndex = 0;
  recapTallyState.phase = "line";
  recapTallyState.lineValue = 0;
  recapTallyState.lineTarget = null;
  recapTallyState.totalValue = Number.isFinite(recapData?.startCount) ? recapData.startCount : 0;
  recapTallyState.totalTarget = null;
  recapTallyState.stepProgress = 0;
  recapTallyState.lastUpdate = performance.now();
  recapTallyState.done = false;
  recapTallyState.finalSfxPlayed = false;
  recapTallyState.pauseTimer = 0;
  recapTallyState.flashTimer = 0;
  recapTallyState.graceEffects = [];
  recapTallyState.lastAppliedIndex = -1;
  recapTallyState.ghostEffects = [];
  recapTallyState.pendingGhost = null;
  recapTallyState.graceFlySfxPlayed = false;
  recapTallyState.showContinue = false;
  recapTallyState.continueTimer = 0;
  recapTallyState.headerPhase = "title";
  recapTallyState.headerTimer = 0;
  recapTallyState.showCount = false;
  recapTallyState.allowLines = false;
  recapTallyState.titleSfxPlayed = false;
  recapTallyState.countSfxPlayed = false;
  recapTallyState.lineSfxIndex = -1;
  recapTallyState.revealedCount = Math.min(30, CONGREGATION_MEMBER_COUNT);
  recapTallyState.visibleBonusCount = 0;
  recapTallyState.lastRevealIndex = -1;
  recapTallyState.bonusNpcs = [];
  recapTallyState.healthBonusAnim = null;
  recapTallyState.performanceBonusAnim = null;
}

function spawnRecapGraceEffects(count, spawnBounds) {
  const target = typeof window !== "undefined" ? window.__hudGraceIconPos : null;
  if (!target || !Number.isFinite(count) || count <= 0) return;
  const safeCount = Math.max(0, Math.round(count));
  const bounds = spawnBounds || { x: 0, y: 0, width: 0, height: 0 };
  const baseX = bounds.x + bounds.width / 2;
  const baseY = bounds.y + bounds.height / 2;
  const targetX = Number.isFinite(bounds.targetX) ? bounds.targetX : target.x;
  const targetY = Number.isFinite(bounds.targetY) ? bounds.targetY : target.y;
  const effects = [];
  for (let i = 0; i < safeCount; i += 1) {
    const jitterX = (Math.random() - 0.5) * Math.max(120, bounds.width * 0.8);
    const jitterY = (Math.random() - 0.5) * Math.max(120, bounds.height * 0.8);
    const startX = baseX + jitterX;
    const startY = baseY + jitterY;
    const dist = Math.hypot(targetX - startX, targetY - startY);
    effects.push({
      x: startX,
      y: startY,
      startX,
      startY,
      targetX,
      targetY,
      timer: 0,
      delay: 0,
      duration: 0.55 + Math.random() * 0.2,
      size: 18,
      alpha: 1,
      applied: false,
      dist,
    });
  }
  const maxDist = effects.reduce((max, effect) => Math.max(max, effect.dist || 0), 0) || 1;
  effects.forEach((effect) => {
    const distFactor = Math.min(1, Math.max(0, effect.dist / maxDist));
    effect.delay = 0.4 + distFactor * 0.8;
    delete effect.dist;
    recapTallyState.graceEffects.push(effect);
  });
  recapTallyState.graceFlySfxPlayed = false;
}

function updateRecapGraceEffects(dt, recapData) {
  if (!recapTallyState.graceEffects.length) return;
  if (!recapTallyState.graceFlySfxPlayed) {
    const anyMoving = recapTallyState.graceEffects.some((effect) => effect && effect.delay <= 0);
    if (anyMoving && typeof window?.playRecapGraceFlySfx === "function") {
      window.playRecapGraceFlySfx(0.6);
      recapTallyState.graceFlySfxPlayed = true;
    }
  }
  for (let i = recapTallyState.graceEffects.length - 1; i >= 0; i -= 1) {
    const effect = recapTallyState.graceEffects[i];
    if (!effect) continue;
    if (effect.delay > 0) {
      effect.delay = Math.max(0, effect.delay - dt);
      continue;
    }
    effect.timer += dt;
    const t = Math.min(1, effect.timer / Math.max(0.001, effect.duration));
    const ease = 1 - Math.pow(1 - t, 3);
    effect.x = effect.startX + (effect.targetX - effect.startX) * ease;
    effect.y = effect.startY + (effect.targetY - effect.startY) * ease;
    effect.alpha = Math.max(0, 1 - t * 0.15);
    if (t >= 1) {
      if (!effect.applied && recapData) {
        effect.applied = true;
        if (typeof window?.addGrace === "function") {
          window.addGrace(1);
        }
        recapData.graceAppliedCount = (recapData.graceAppliedCount || 0) + 1;
        if (recapData.graceAppliedCount >= recapData.graceBonus) {
          recapData.graceApplied = true;
        }
      }
      recapTallyState.graceEffects.splice(i, 1);
    }
  }
}

function spawnRecapGhostEffect(text, startX, startY, endX, endY) {
  if (!text) return;
  recapTallyState.ghostEffects.push({
    text,
    startX,
    startY,
    endX,
    endY,
    timer: 0,
    duration: 0.55,
    alpha: 1,
  });
}

function updateRecapGhostEffects(dt) {
  if (!recapTallyState.ghostEffects.length) return;
  for (let i = recapTallyState.ghostEffects.length - 1; i >= 0; i -= 1) {
    const effect = recapTallyState.ghostEffects[i];
    if (!effect) continue;
    effect.timer += dt;
    const t = Math.min(1, effect.timer / Math.max(0.001, effect.duration));
    const ease = 1 - Math.pow(1 - t, 3);
    const arc = 18 * Math.sin(Math.PI * t);
    effect.x = effect.startX + (effect.endX - effect.startX) * ease;
    effect.y = effect.startY + (effect.endY - effect.startY) * ease - arc;
    effect.alpha = Math.max(0, 1 - t * 0.65);
    if (t >= 1) {
      recapTallyState.ghostEffects.splice(i, 1);
    }
  }
}

function updateRecapTallyState(recapData, allowAdvance, spawnBounds) {
  if (!recapData) return;
  if (typeof window !== "undefined" && window.__recapSkipRequested) {
    window.__recapSkipRequested = false;
    const lines = Array.isArray(recapData.lines) ? recapData.lines : [];
    let totalValue = Number.isFinite(recapData?.startCount) ? recapData.startCount : 0;
    let bonusCount = 0;
    lines.forEach((line) => {
      const delta = Number.isFinite(line.delta) ? Math.round(line.delta) : 0;
      if (line.affectsTotal !== false) {
        totalValue += delta;
      }
      if (line.kind === "congregation" && delta > 0) {
        bonusCount += delta;
      }
    });
    recapTallyState.id = recapData.id || recapTallyState.id;
    recapTallyState.stepIndex = lines.length;
    recapTallyState.phase = "post";
    recapTallyState.lineValue = 0;
    recapTallyState.lineTarget = null;
    recapTallyState.totalValue = totalValue;
    recapTallyState.totalTarget = null;
    recapTallyState.stepProgress = 0;
    recapTallyState.done = true;
    recapTallyState.showContinue = true;
    recapTallyState.allowLines = true;
    recapTallyState.showCount = true;
    recapTallyState.headerPhase = "lines";
    recapTallyState.pauseTimer = 0;
    recapTallyState.flashTimer = 0;
    recapTallyState.visibleBonusCount = bonusCount;
    recapTallyState.ghostEffects = [];
    recapTallyState.graceEffects = [];
    recapTallyState.pendingGhost = null;
    recapTallyState.healthBonusAnim = null;
    recapTallyState.performanceBonusAnim = null;
    recapTallyState.graceFlySfxPlayed = true;
    if (recapData.graceBonus > 0) {
      recapData.graceAppliedCount = recapData.graceBonus;
      recapData.graceApplied = true;
      recapData.graceSpawned = true;
    }
  }
  const now = performance.now();
  if (recapTallyState.id !== recapData.id) {
    resetRecapTallyState(recapData);
  }
  if (!allowAdvance) {
    recapTallyState.lastUpdate = now;
    return;
  }
  const lines = Array.isArray(recapData.lines) ? recapData.lines : [];
  const current = lines[recapTallyState.stepIndex];
  const dt = Math.max(0, (now - (recapTallyState.lastUpdate || now)) / 1000);
  recapTallyState.lastUpdate = now;
  if (recapTallyState.flashTimer > 0) {
    recapTallyState.flashTimer = Math.max(0, recapTallyState.flashTimer - dt);
  }
  if (!recapTallyState.allowLines) {
    if (allowAdvance && !recapTallyState.titleSfxPlayed) {
      if (typeof window?.playRecapFinalSfx === "function") {
        window.playRecapFinalSfx(0.7);
      }
      recapTallyState.titleSfxPlayed = true;
      recapTallyState.headerPhase = "titleHold";
      recapTallyState.headerTimer = 1.0;
    }
    if (recapTallyState.headerPhase === "titleHold") {
      recapTallyState.headerTimer = Math.max(0, recapTallyState.headerTimer - dt);
      if (recapTallyState.headerTimer <= 0) {
        recapTallyState.showCount = true;
        if (!recapTallyState.countSfxPlayed && typeof window?.playRecapFinalSfx === "function") {
          window.playRecapFinalSfx(0.7);
          recapTallyState.countSfxPlayed = true;
        }
        recapTallyState.headerPhase = "countHold";
        recapTallyState.headerTimer = 1.0;
      }
    } else if (recapTallyState.headerPhase === "countHold") {
      recapTallyState.headerTimer = Math.max(0, recapTallyState.headerTimer - dt);
      if (recapTallyState.headerTimer <= 0) {
        recapTallyState.allowLines = true;
        recapTallyState.headerPhase = "lines";
      }
    }
    updateRecapGraceEffects(dt, recapData);
    updateRecapGhostEffects(dt);
    return;
  }
  updateRecapGraceEffects(dt, recapData);
  updateRecapGhostEffects(dt);
  if (!recapTallyState.showContinue) {
    const graceDone =
      recapData?.graceBonus > 0 ? recapData.graceAppliedCount >= recapData.graceBonus : true;
    if (recapTallyState.done && graceDone) {
      recapTallyState.continueTimer += dt;
      if (recapTallyState.continueTimer >= RECAP_CONTINUE_DELAY) {
        recapTallyState.showContinue = true;
      }
    }
  }
  if (!current) {
    if (
      !recapTallyState.finalSfxPlayed &&
      typeof window?.playRecapFinalSfx === "function" &&
      !(recapData && recapData.graceBonus > 0)
    ) {
      window.playRecapFinalSfx(0.7);
      recapTallyState.finalSfxPlayed = true;
    } else {
      recapTallyState.finalSfxPlayed = true;
    }
    recapTallyState.done = true;
    return;
  }
  if (recapTallyState.done) {
    return;
  }
  if (recapTallyState.pauseTimer > 0) {
    recapTallyState.pauseTimer = Math.max(0, recapTallyState.pauseTimer - dt);
    return;
  }

  const advanceStep = () => {
    recapTallyState.stepIndex += 1;
    recapTallyState.phase = "line";
    recapTallyState.lineValue = 0;
    recapTallyState.lineTarget = null;
    recapTallyState.totalTarget = null;
    recapTallyState.stepProgress = 0;
    recapTallyState.pauseTimer = 0;
    recapTallyState.healthBonusAnim = null;
    recapTallyState.performanceBonusAnim = null;
    if (recapTallyState.stepIndex >= lines.length) {
      recapTallyState.done = true;
      if (!recapTallyState.finalSfxPlayed && typeof window?.playRecapFinalSfx === "function") {
        window.playRecapFinalSfx(0.7);
        recapTallyState.finalSfxPlayed = true;
      }
    }
  };

  const targetValue = Number.isFinite(current.delta) ? Math.round(current.delta) : 0;
  if (recapTallyState.phase === "line") {
    if (
      recapTallyState.lineSfxIndex !== recapTallyState.stepIndex &&
      typeof window?.playRecapFinalSfx === "function"
    ) {
      window.playRecapFinalSfx(0.7);
      recapTallyState.lineSfxIndex = recapTallyState.stepIndex;
    }
    recapTallyState.pauseTimer =
      recapTallyState.stepIndex === 0 ? RECAP_FIRST_LINE_PAUSE : RECAP_LINE_PAUSE;
    recapTallyState.phase = "lineHold";
    return;
  }
  if (recapTallyState.phase === "lineHold") {
    if (current && current.skipValue) {
      recapTallyState.pauseTimer = RECAP_LINE_PAUSE;
      recapTallyState.phase = "post";
      return;
    }
    recapTallyState.phase = "value";
  }
  if (recapTallyState.phase === "value") {
    const affectsTotal = current.affectsTotal !== false;
    if (current.kind === "npcHealthBonus") {
      const entries = Array.isArray(current?.npcHealthBreakdown)
        ? current.npcHealthBreakdown.slice(0, 5)
        : [];
      let anim = recapTallyState.healthBonusAnim;
      if (!anim || anim.index !== recapTallyState.stepIndex) {
        anim = {
          index: recapTallyState.stepIndex,
          entries: entries.map((entry) => ({
            name: entry?.name || "",
            portrait: entry?.portrait || null,
            target: Number.isFinite(entry?.faith) ? Math.max(0, Math.round(entry.faith)) : 0,
            penaltyApplied: false,
          })),
          activeNpcIndex: 0,
          activeHealth: Number.isFinite(entries?.[0]?.faith) ? Math.max(0, Math.round(entries[0].faith)) : 0,
          totalHealth: 0,
          congregationAwarded: 0,
          congregationPenaltyApplied: 0,
          lastGhostAward: 0,
          lastGhostPenalty: 0,
          bumpTimer: 0,
          holdTimer: 0,
          thresholdHoldTimer: 0,
          thresholdValue: null,
          advanceNpcAfterThresholdHold: false,
          finished: false,
        };
        recapTallyState.healthBonusAnim = anim;
      }
      if (anim.bumpTimer > 0) {
        anim.bumpTimer = Math.max(0, anim.bumpTimer - dt);
      }
      const advanceToNextHealthBonusNpc = () => {
        anim.activeNpcIndex += 1;
        anim.holdTimer = 0;
        if (anim.activeNpcIndex >= anim.entries.length) {
          anim.finished = true;
        } else {
          const nextEntry = anim.entries[anim.activeNpcIndex];
          anim.activeHealth = Number.isFinite(nextEntry?.target) ? nextEntry.target : 0;
        }
      };
      if (anim.thresholdHoldTimer > 0) {
        anim.thresholdHoldTimer = Math.max(0, anim.thresholdHoldTimer - dt);
        anim.totalHealth = Number.isFinite(anim.thresholdValue)
          ? anim.thresholdValue
          : anim.totalHealth;
        if (anim.thresholdHoldTimer <= 0 && anim.advanceNpcAfterThresholdHold) {
          anim.advanceNpcAfterThresholdHold = false;
          advanceToNextHealthBonusNpc();
          return;
        }
      }
      if (anim.finished || !anim.entries.length) {
        anim.finished = true;
        anim.totalHealth = Number.isFinite(current?.totalHealth)
          ? Math.max(0, Math.round(current.totalHealth))
          : 0;
        anim.congregationAwarded = Math.max(0, Math.round(current.positiveHealthBonus || 0));
        anim.congregationPenaltyApplied = Math.max(0, Math.round(current.zeroHealthPenaltyCount || 0));
        anim.lastGhostAward = anim.congregationAwarded;
        anim.lastGhostPenalty = anim.congregationPenaltyApplied;
        recapTallyState.lastAppliedIndex = recapTallyState.stepIndex;
        recapTallyState.pauseTimer = RECAP_LINE_PAUSE;
        recapTallyState.phase = "post";
        return;
      }

      const getDisplayedTotalForAnim = () => {
        const visiblePriorTotal = anim.entries
          .slice(0, anim.activeNpcIndex)
          .reduce((sum, entry) => sum + (Number.isFinite(entry.target) ? entry.target : 0), 0);
        const visibleActiveEntry = anim.entries[anim.activeNpcIndex];
        const visibleTargetHealth = Number.isFinite(visibleActiveEntry?.target) ? visibleActiveEntry.target : 0;
        return Math.min(
          maxDisplayTotal,
          Math.round(visiblePriorTotal + Math.max(0, visibleTargetHealth - (anim.activeHealth || 0))),
        );
      };
      const priorTotal = anim.entries
        .slice(0, anim.activeNpcIndex)
        .reduce((sum, entry) => sum + (Number.isFinite(entry.target) ? entry.target : 0), 0);
      const activeEntry = anim.entries[anim.activeNpcIndex];
      const targetHealth = Number.isFinite(activeEntry?.target) ? activeEntry.target : 0;
      const countRate = Math.min(140, Math.max(70, targetHealth * 1.2));
      const currentTotalBeforeStep = Math.round(anim.totalHealth || 0);
      const maxDisplayTotal = Number.isFinite(current?.totalHealth)
        ? Math.max(0, Math.round(current.totalHealth))
        : 0;

      if (anim.thresholdHoldTimer > 0) {
        // Freeze both the active NPC remainder and the total at the threshold.
      } else if (anim.activeHealth > 0) {
        const drainAmount = dt * countRate;
        const rawNextActiveHealth = Math.max(0, anim.activeHealth - drainAmount);
        const npcFinalDisplayedTotal = Math.min(
          maxDisplayTotal,
          Math.round(priorTotal + targetHealth),
        );
        const projectedDisplayedTotal = Math.min(
          maxDisplayTotal,
          Math.round(priorTotal + Math.max(0, targetHealth - rawNextActiveHealth)),
        );
        const nextThreshold = Math.min(
          Math.max(0, Math.round(current.positiveHealthBonus || 0)) * 100,
          (Math.floor(currentTotalBeforeStep / 100) + 1) * 100,
        );
        const thresholdAvailable =
          nextThreshold > currentTotalBeforeStep &&
          nextThreshold <= maxDisplayTotal;
        if (thresholdAvailable && projectedDisplayedTotal >= nextThreshold) {
          const amountToThreshold = nextThreshold - currentTotalBeforeStep;
          const thresholdConsumesNpc = npcFinalDisplayedTotal === nextThreshold;
          const remainingHealthAfterThreshold = thresholdConsumesNpc
            ? 0
            : Math.max(0, anim.activeHealth - amountToThreshold);
          anim.activeHealth = remainingHealthAfterThreshold;
          anim.totalHealth = nextThreshold;
          anim.thresholdValue = nextThreshold;
          anim.thresholdHoldTimer = 1.0;
          if (thresholdConsumesNpc) {
            // Let the threshold hold fully replace the between-NPC pause.
            anim.advanceNpcAfterThresholdHold = true;
            anim.holdTimer = 0;
          }
          anim.bumpTimer = 0.5;
        } else {
          anim.activeHealth = Math.max(0, anim.activeHealth - drainAmount);
        }
      } else {
        if (anim.advanceNpcAfterThresholdHold) {
          anim.advanceNpcAfterThresholdHold = false;
          advanceToNextHealthBonusNpc();
          return;
        }
        if (!activeEntry?.penaltyApplied && targetHealth <= 0) {
          activeEntry.penaltyApplied = true;
          anim.congregationPenaltyApplied += 1;
          if (affectsTotal) {
            recapTallyState.totalValue -= 1;
            recapTallyState.flashTimer = RECAP_FLASH_DURATION;
          }
          if (typeof window?.playCongregationCountPopSfx === "function") {
            window.playCongregationCountPopSfx(0.7, "down");
          }
          if (typeof window?.playRecapFinalSfx === "function") {
            window.playRecapFinalSfx(0.8);
          }
          anim.bumpTimer = 0.55;
        }
        anim.holdTimer += dt;
        if (anim.holdTimer >= 1.0) {
          advanceToNextHealthBonusNpc();
        }
      }

      if (anim.thresholdHoldTimer <= 0) {
        anim.totalHealth = getDisplayedTotalForAnim();
      }
      const nextAward = Math.min(
        Math.max(0, Math.round(current.positiveHealthBonus || 0)),
        Math.floor(anim.totalHealth / 100),
      );
      if (nextAward > anim.congregationAwarded) {
        const gained = nextAward - anim.congregationAwarded;
        anim.congregationAwarded = nextAward;
        if (affectsTotal) {
          recapTallyState.totalValue += gained;
          recapTallyState.flashTimer = RECAP_FLASH_DURATION;
        }
        if (typeof window?.playCongregationCountPopSfx === "function") {
          window.playCongregationCountPopSfx(0.7, "up");
        }
        if (typeof window?.playRecapFinalSfx === "function") {
          window.playRecapFinalSfx(0.8);
        }
        anim.bumpTimer = 0.55;
      }

      recapTallyState.lastAppliedIndex = recapTallyState.stepIndex;
      if (anim.finished) {
        anim.totalHealth = Number.isFinite(current?.totalHealth)
          ? Math.max(0, Math.round(current.totalHealth))
          : anim.totalHealth;
        anim.congregationAwarded = Math.max(0, Math.round(current.positiveHealthBonus || 0));
        anim.congregationPenaltyApplied = Math.max(0, Math.round(current.zeroHealthPenaltyCount || 0));
        anim.lastGhostAward = anim.congregationAwarded;
        anim.lastGhostPenalty = anim.congregationPenaltyApplied;
        recapTallyState.pauseTimer = RECAP_LINE_PAUSE;
        recapTallyState.phase = "post";
      }
      return;
    }
    if (current.kind === "performanceBonuses") {
      const entries = Array.isArray(current?.performanceBadgeBreakdown)
        ? current.performanceBadgeBreakdown.slice(0, 8)
        : [];
      let anim = recapTallyState.performanceBonusAnim;
      if (!anim || anim.index !== recapTallyState.stepIndex) {
        anim = {
          index: recapTallyState.stepIndex,
          entries: entries.map((entry) => ({
            id: entry?.id || "",
            label: entry?.label || "",
            iconSrc: entry?.iconSrc || "",
            target: Number.isFinite(entry?.value) ? Math.max(0, Math.round(entry.value)) : 0,
          })),
          activeBadgeIndex: 0,
          activeValue: Number.isFinite(entries?.[0]?.value) ? Math.max(0, Math.round(entries[0].value)) : 0,
          totalPerformance: 0,
          congregationAwarded: 0,
          lastGhostAward: 0,
          bumpTimer: 0,
          holdTimer: 0,
          revealHoldTimer: 0.3,
          thresholdHoldTimer: 0,
          thresholdValue: null,
          advanceBadgeAfterThresholdHold: false,
          finished: false,
        };
        recapTallyState.performanceBonusAnim = anim;
      }
      if (anim.bumpTimer > 0) {
        anim.bumpTimer = Math.max(0, anim.bumpTimer - dt);
      }
      if (anim.revealHoldTimer > 0) {
        anim.revealHoldTimer = Math.max(0, anim.revealHoldTimer - dt);
      }
      const advanceToNextPerformanceBadge = () => {
        anim.activeBadgeIndex += 1;
        anim.holdTimer = 0;
        if (anim.activeBadgeIndex >= anim.entries.length) {
          anim.finished = true;
        } else {
          const nextEntry = anim.entries[anim.activeBadgeIndex];
          anim.activeValue = Number.isFinite(nextEntry?.target) ? nextEntry.target : 0;
          anim.revealHoldTimer = 0.3;
        }
      };
      if (anim.thresholdHoldTimer > 0) {
        anim.thresholdHoldTimer = Math.max(0, anim.thresholdHoldTimer - dt);
        anim.totalPerformance = Number.isFinite(anim.thresholdValue)
          ? anim.thresholdValue
          : anim.totalPerformance;
        if (anim.thresholdHoldTimer <= 0 && anim.advanceBadgeAfterThresholdHold) {
          anim.advanceBadgeAfterThresholdHold = false;
          advanceToNextPerformanceBadge();
          return;
        }
      }
      if (anim.finished || !anim.entries.length) {
        anim.finished = true;
        anim.totalPerformance = Number.isFinite(current?.totalPerformance)
          ? Math.max(0, Math.round(current.totalPerformance))
          : 0;
        anim.congregationAwarded = Math.max(
          0,
          Math.round(current?.performanceCongregationReward || targetValue || 0),
        );
        anim.lastGhostAward = anim.congregationAwarded;
        recapTallyState.lastAppliedIndex = recapTallyState.stepIndex;
        recapTallyState.pauseTimer = RECAP_LINE_PAUSE;
        recapTallyState.phase = "post";
        return;
      }

      const maxPerformanceTotal = Number.isFinite(current?.totalPerformance)
        ? Math.max(0, Math.round(current.totalPerformance))
        : 0;
      const getDisplayedPerformanceTotal = () => {
        const visiblePriorTotal = anim.entries
          .slice(0, anim.activeBadgeIndex)
          .reduce((sum, entry) => sum + (Number.isFinite(entry.target) ? entry.target : 0), 0);
        const visibleActiveEntry = anim.entries[anim.activeBadgeIndex];
        const visibleTargetValue = Number.isFinite(visibleActiveEntry?.target) ? visibleActiveEntry.target : 0;
        return Math.min(
          maxPerformanceTotal,
          Math.round(visiblePriorTotal + Math.max(0, visibleTargetValue - (anim.activeValue || 0))),
        );
      };
      const priorTotal = anim.entries
        .slice(0, anim.activeBadgeIndex)
        .reduce((sum, entry) => sum + (Number.isFinite(entry.target) ? entry.target : 0), 0);
      const activeEntry = anim.entries[anim.activeBadgeIndex];
      const targetPerformanceValue = Number.isFinite(activeEntry?.target) ? activeEntry.target : 0;
      const countRate = Math.min(180, Math.max(80, targetPerformanceValue * 1.25));
      const currentTotalBeforeStep = Math.round(anim.totalPerformance || 0);

      if (anim.thresholdHoldTimer > 0) {
        // Hold at threshold before proceeding.
      } else if (anim.revealHoldTimer > 0) {
        // Keep the starting badge value visible briefly before draining.
      } else if (anim.activeValue > 0) {
        const drainAmount = dt * countRate;
        const rawNextActiveValue = Math.max(0, anim.activeValue - drainAmount);
        const badgeFinalDisplayedTotal = Math.min(
          maxPerformanceTotal,
          Math.round(priorTotal + targetPerformanceValue),
        );
        const projectedDisplayedTotal = Math.min(
          maxPerformanceTotal,
          Math.round(priorTotal + Math.max(0, targetPerformanceValue - rawNextActiveValue)),
        );
        const nextThreshold = Math.min(
          Math.max(0, Math.round(current?.performanceCongregationReward || targetValue || 0)) * 100,
          (Math.floor(currentTotalBeforeStep / 100) + 1) * 100,
        );
        const thresholdAvailable =
          nextThreshold > currentTotalBeforeStep &&
          nextThreshold <= maxPerformanceTotal;
        if (thresholdAvailable && projectedDisplayedTotal >= nextThreshold) {
          const amountToThreshold = nextThreshold - currentTotalBeforeStep;
          const thresholdConsumesBadge = badgeFinalDisplayedTotal === nextThreshold;
          const remainingValueAfterThreshold = thresholdConsumesBadge
            ? 0
            : Math.max(0, anim.activeValue - amountToThreshold);
          anim.activeValue = remainingValueAfterThreshold;
          anim.totalPerformance = nextThreshold;
          anim.thresholdValue = nextThreshold;
          anim.thresholdHoldTimer = 1.0;
          if (thresholdConsumesBadge) {
            anim.advanceBadgeAfterThresholdHold = true;
            anim.holdTimer = 0;
          }
          anim.bumpTimer = 0.5;
        } else {
          anim.activeValue = Math.max(0, anim.activeValue - drainAmount);
        }
      } else {
        if (anim.advanceBadgeAfterThresholdHold) {
          anim.advanceBadgeAfterThresholdHold = false;
          advanceToNextPerformanceBadge();
          return;
        }
        anim.holdTimer += dt;
        if (anim.holdTimer >= 0.75) {
          advanceToNextPerformanceBadge();
        }
      }

      if (anim.thresholdHoldTimer <= 0) {
        anim.totalPerformance = getDisplayedPerformanceTotal();
      }
      const nextAward = Math.min(
        Math.max(0, Math.round(current?.performanceCongregationReward || targetValue || 0)),
        Math.floor(anim.totalPerformance / 100),
      );
      if (nextAward > anim.congregationAwarded) {
        const gained = nextAward - anim.congregationAwarded;
        anim.congregationAwarded = nextAward;
        if (affectsTotal) {
          recapTallyState.totalValue += gained;
          recapTallyState.flashTimer = RECAP_FLASH_DURATION;
        }
        if (typeof window?.playCongregationCountPopSfx === "function") {
          window.playCongregationCountPopSfx(0.7, "up");
        }
        if (typeof window?.playRecapFinalSfx === "function") {
          window.playRecapFinalSfx(0.8);
        }
        anim.bumpTimer = 0.55;
      }
      recapTallyState.lastAppliedIndex = recapTallyState.stepIndex;
      if (anim.finished) {
        anim.finished = true;
        anim.totalPerformance = Number.isFinite(current?.totalPerformance)
          ? Math.max(0, Math.round(current.totalPerformance))
          : anim.totalPerformance;
        anim.congregationAwarded = Math.max(
          0,
          Math.round(current?.performanceCongregationReward || targetValue || 0),
        );
        anim.lastGhostAward = anim.congregationAwarded;
        recapTallyState.pauseTimer = RECAP_LINE_PAUSE;
        recapTallyState.phase = "post";
      }
      return;
    }
    if (affectsTotal) {
      recapTallyState.totalValue += targetValue;
    }
    recapTallyState.lastAppliedIndex = recapTallyState.stepIndex;
    if (
      affectsTotal &&
      current.kind === "congregation" &&
      targetValue > 0 &&
      recapTallyState.lastRevealIndex !== recapTallyState.stepIndex
    ) {
      recapTallyState.visibleBonusCount = Math.max(
        0,
        (recapTallyState.visibleBonusCount || 0) + targetValue,
      );
      recapTallyState.lastRevealIndex = recapTallyState.stepIndex;
    }
    if (affectsTotal) {
      recapTallyState.pendingGhost = {
        index: recapTallyState.stepIndex,
        value: targetValue,
      };
    }
    if (affectsTotal) {
      recapTallyState.flashTimer = RECAP_FLASH_DURATION;
    }
    if (typeof window?.playRecapFinalSfx === "function") {
      window.playRecapFinalSfx(0.7);
    }
    if (current.kind === "grace" && recapData.graceBonus > 0 && !recapData.graceSpawned) {
      spawnRecapGraceEffects(recapData.graceBonus, spawnBounds);
      recapData.graceSpawned = true;
      recapTallyState.finalSfxPlayed = true;
    }
    // Skip the extra pause if value is shown inline (not on its own line)
    if (current.forceValueLine) {
      recapTallyState.pauseTimer = RECAP_LINE_PAUSE;
    }
    recapTallyState.phase = "post";
    return;
  }
  advanceStep();
}

function drawRecapBonusScreen(ctx, canvas, options = {}) {
  const {
    title = "",
    recapData = null,
    uiFontFamily = "sans-serif",
    buttonKey = "recap",
  } = options;

  const titleSize = 38;
  const bodySize = 28;
  const lineGap = Math.round(titleSize * 1.08);
  ctx.save();
  const layout = getAnnouncementScreenLayout(ctx, canvas, {
    title,
    subtitle: "",
    titleSize,
    subtitleSize: TEXT_STYLES.h2.size,
    lineGap,
    weight: TEXT_STYLES.h1.weight,
    maxWidthScale: 0.84,
    position: "top",
    topMargin: 72,
    bottomMargin: 88,
    rowGap: 36,
    buttonHeight: 72,
    buttonCount: 1,
  });
  ctx.translate(layout.offsetX, layout.offsetY);
  ctx.scale(layout.scale, layout.scale);

  if (recapData && !recapData.id) {
    const lineCount = Array.isArray(recapData.lines) ? recapData.lines.length : 0;
    recapData.id = `recap-${title}-${recapData.startCount || 0}-${recapData.totalCount || 0}-${lineCount}`;
  }
  const revealComplete = true;
  const canShowContinue = recapTallyState.showContinue;
  const contentWidth = Math.round(layout.virtualCanvas.width * 0.76);
  const contentX = Math.round((layout.virtualCanvas.width - contentWidth) / 2);
  const lineSpacing = Math.round(bodySize * 1.4);
  const sectionGap = Math.round(bodySize * 0.35);
  const lines = Array.isArray(recapData?.lines) ? recapData.lines : [];
  const headingTitle = `${title || "Battle Report"}:`;
  const headingProblem = String(recapData?.problemTitle || "").trim();
  const headingCombined = headingProblem ? `${headingTitle} ${headingProblem}` : headingTitle;
  let cursorY = Math.round(layout.titleY);
  const panelPaddingX = 36;
  const panelTop = 54;
  const panelBottom = layout.virtualCanvas.height - 54;
  const panelX = contentX - panelPaddingX;
  const panelWidth = contentWidth + panelPaddingX * 2;
  const panelHeight = panelBottom - panelTop;
  const spawnBounds = {
    x: contentX,
    y: Math.round(layout.virtualCanvas.height * 0.67),
    width: contentWidth,
    height: Math.round(layout.virtualCanvas.height * 0.28),
    targetX: null,
    targetY: null,
  };
  const graceTarget = typeof window !== "undefined" ? window.__hudGraceIconPos : null;
  if (graceTarget) {
    spawnBounds.targetX = (graceTarget.x - layout.offsetX) / layout.scale;
    spawnBounds.targetY = (graceTarget.y - layout.offsetY) / layout.scale;
  }
  updateRecapTallyState(recapData, revealComplete, spawnBounds);
  if (typeof window !== "undefined") {
    window.__recapAllowContinue = recapTallyState.showContinue;
  }

  const formatNumber =
    typeof requireBindings().formatNumberWithCommas === "function"
      ? requireBindings().formatNumberWithCommas
      : (value) => {
          const numeric = Number.isFinite(value) ? Math.round(value) : 0;
          const sign = numeric < 0 ? "-" : "";
          const digits = String(Math.abs(numeric));
          return `${sign}${digits.replace(/\\B(?=(\\d{3})+(?!\\d))/g, ",")}`;
        };
  const formatSigned = (value) => {
    const numeric = Number.isFinite(value) ? Math.round(value) : 0;
    const sign = numeric >= 0 ? "+" : "-";
    return `${sign}${formatNumber(Math.abs(numeric))}`;
  };
  const baseLabelColor = "#EAF6FF";
  const highlightLabelColor = "#FFD978";
  const highlightValueColor = "#FFD978";
  const highlightValueFlash = "#FFE5A6";
  const dividerColor = "rgba(255, 217, 120, 0.5)";
  const recapTotalBlockWidth = 220;
  const recapColumnGap = 34;
  const recapLeftColumnX = contentX + 6;
  const recapTotalColumnX = contentX + contentWidth - recapTotalBlockWidth;
  const recapLeftColumnWidth = Math.max(
    180,
    recapTotalColumnX - recapColumnGap - recapLeftColumnX,
  );
  const congregationMembers = Array.isArray(requireBindings().congregationMembers)
    ? requireBindings().congregationMembers
    : [];
  const drawInlineCongregationSprites = (startX, baselineY, count, memberOffset = 0) => {
    const safeCount = Math.max(0, Math.round(count || 0));
    if (!safeCount || !congregationMembers.length) return 0;
    const spriteScale = 1;
    const spriteWidth = Math.round(32 * spriteScale);
    const spriteGap = 16;
    const drawY = baselineY - 18;
    const framePadX = 4;
    const framePadY = 3;
    const frameStepX = spriteWidth + framePadX * 2 + spriteGap;
    const rowStepY = spriteWidth + framePadY * 2 + 8;
    const maxRowWidth = Math.max(frameStepX, contentX + contentWidth - startX);
    const maxPerRow = Math.max(1, Math.floor(maxRowWidth / frameStepX));
    let maxDrawX = startX;
    let maxDrawY = drawY;
    for (let spriteIndex = 0; spriteIndex < safeCount; spriteIndex += 1) {
      const member =
        congregationMembers[(memberOffset + spriteIndex) % congregationMembers.length];
      if (!member) continue;
      const col = spriteIndex % maxPerRow;
      const row = Math.floor(spriteIndex / maxPerRow);
      const spriteDrawX = startX + col * frameStepX;
      const spriteDrawY = drawY + row * rowStepY;
      const animator = member.animator;
      const frameX = spriteDrawX - framePadX;
      const frameY = spriteDrawY - spriteWidth / 2 - framePadY;
      const frameWidth = spriteWidth + framePadX * 2;
      const frameHeight = spriteWidth + framePadY * 2;
      ctx.save();
      ctx.fillStyle = "rgba(8, 12, 20, 0.72)";
      ctx.strokeStyle = "rgba(255, 217, 120, 0.5)";
      ctx.lineWidth = 1.5;
      roundRect(ctx, frameX, frameY, frameWidth, frameHeight, 6, true, true);
      ctx.restore();
      if (animator && typeof animator.draw === "function") {
        const previousScale = animator.scale;
        const previousDirection = animator.direction;
        const previousMoving = animator.moving;
        animator.scale = spriteScale;
        animator.setMoving(false);
        animator.direction = "down";
        animator.draw(ctx, spriteDrawX + spriteWidth / 2, spriteDrawY, { alpha: 1 });
        animator.direction = previousDirection;
        animator.setMoving(previousMoving);
        animator.scale = previousScale;
      }
      maxDrawX = Math.max(maxDrawX, spriteDrawX + frameWidth);
      maxDrawY = Math.max(maxDrawY, spriteDrawY + spriteWidth / 2 + framePadY);
    }
    return {
      width: Math.max(0, maxDrawX - startX),
      height: Math.max(rowStepY, maxDrawY - (drawY - spriteWidth / 2 - framePadY)),
    };
  };

  const drawNpcHealthBonusRow = (line, lineIndex, x, y, maxWidth, isHighlighted) => {
    const entries = Array.isArray(line?.npcHealthBreakdown)
      ? line.npcHealthBreakdown.slice(0, 5)
      : [];
    const finalTotalHealth = Number.isFinite(line?.totalHealth)
      ? Math.max(0, Math.round(line.totalHealth))
      : 0;
    const finalAddedCongregation = Number.isFinite(line?.delta)
      ? Math.max(0, Math.round(line.delta))
      : 0;
    const finalPositiveBonus = Number.isFinite(line?.positiveHealthBonus)
      ? Math.max(0, Math.round(line.positiveHealthBonus))
      : finalAddedCongregation;
    const finalZeroPenalty = Number.isFinite(line?.zeroHealthPenaltyCount)
      ? Math.max(0, Math.round(line.zeroHealthPenaltyCount))
      : 0;
    const anim = (
      recapTallyState.healthBonusAnim &&
      recapTallyState.healthBonusAnim.index === recapTallyState.stepIndex
    )
      ? recapTallyState.healthBonusAnim
      : null;
    const totalHealth = anim
      ? Math.max(0, Math.round(anim.totalHealth || 0))
      : (
          recapTallyState.lastAppliedIndex >= lineIndex ||
          recapTallyState.done
            ? finalTotalHealth
            : 0
        );
    const addedCongregation = anim ? Math.max(0, Math.round(anim.congregationAwarded || 0)) : finalAddedCongregation;
    const appliedPenaltyCount = anim ? Math.max(0, Math.round(anim.congregationPenaltyApplied || 0)) : finalZeroPenalty;
    const activeNpcIndex = anim
      ? Math.min(entries.length - 1, Math.max(0, anim.activeNpcIndex || 0))
      : Math.max(0, entries.length - 1);
    const bumpPulse = anim ? Math.max(0, anim.bumpTimer || 0) : 0;

    const labelY = y;
    const blockTopY = labelY + 20;
    const labelRowHeight = 0;
    const npcHealthRowHeight = 144;
    const rowGap = 18;
    const npcRowTopY = blockTopY + labelRowHeight + rowGap;
    const rowBottomY = npcRowTopY + npcHealthRowHeight;

    ctx.fillStyle = baseLabelColor;
    drawHighlightedLabel(line.label || "", x, labelY, line.highlightText);

    const stripSlotSize = 64;
    const stripGap = 16;
    const stripStartX = recapLeftColumnX;
    const totalBlockX = recapTotalColumnX;
    entries.forEach((entry, index) => {
      const slotX = stripStartX + index * (stripSlotSize + stripGap);
      const isPast = anim ? index < activeNpcIndex : true;
      const isCurrent = index === activeNpcIndex;
      const displayedHealth = anim
        ? (
            isCurrent
              ? Math.max(0, Math.round(anim.activeHealth || 0))
              : (isPast ? null : (Number.isFinite(entry?.faith) ? Math.max(0, Math.round(entry.faith)) : 0))
          )
        : (Number.isFinite(entry?.faith) ? Math.max(0, Math.round(entry.faith)) : 0);
      const healthBaselineY = npcRowTopY + 18;
      const portraitStripY = npcRowTopY + 30;
      if (displayedHealth !== null) {
        ctx.save();
        ctx.fillStyle = isCurrent ? highlightValueColor : "rgba(234, 246, 255, 0.82)";
        ctx.font = `700 24px ${ANNOUNCEMENT_FONT_FAMILY}`;
        ctx.textAlign = "center";
        ctx.fillText(`${displayedHealth}`, slotX + stripSlotSize / 2, healthBaselineY);
        ctx.restore();
      }
      const slotCenterX = slotX + stripSlotSize / 2;
      const slotCenterY = portraitStripY + stripSlotSize / 2;
      ctx.save();
      ctx.translate(slotCenterX, slotCenterY);
      drawChurchBadgeSurface(ctx, stripSlotSize, {
        shape: "square",
        color: "#314B77",
        accent: "#4769A1",
      });
      ctx.restore();
      if (entry?.portrait) {
        const portraitInset = 8;
        const portraitSize = stripSlotSize - portraitInset * 2;
        const portraitRadius = Math.max(8, Math.round(portraitSize * 0.16));
        const portraitYOffset = Math.round(portraitSize * 0.12);
        ctx.save();
        ctx.beginPath();
        roundRect(
          ctx,
          slotX + portraitInset,
          portraitStripY + portraitInset,
          portraitSize,
          portraitSize,
          portraitRadius,
          false,
          false,
        );
        ctx.clip();
        ctx.drawImage(
          entry.portrait,
          slotX + portraitInset,
          portraitStripY + portraitInset - portraitYOffset,
          portraitSize,
          portraitSize,
        );
        ctx.restore();
      }
      if (!entry?.active) {
        ctx.save();
        ctx.strokeStyle = "rgba(255, 120, 120, 0.98)";
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(slotX + 12, portraitStripY + 12);
        ctx.lineTo(slotX + stripSlotSize - 12, portraitStripY + stripSlotSize - 12);
        ctx.moveTo(slotX + stripSlotSize - 12, portraitStripY + 12);
        ctx.lineTo(slotX + 12, portraitStripY + stripSlotSize - 12);
        ctx.stroke();
        ctx.restore();
      }
      const npcNameBaselineY = portraitStripY + stripSlotSize + 18;
      ctx.save();
      ctx.fillStyle = isCurrent ? highlightValueColor : "rgba(234, 246, 255, 0.85)";
      ctx.font = `600 12px ${ANNOUNCEMENT_FONT_FAMILY}`;
      ctx.textAlign = "center";
      ctx.fillText(entry?.name || "", slotX + stripSlotSize / 2, npcNameBaselineY);
      ctx.restore();
    });

    const thresholdPulse = anim && anim.thresholdHoldTimer > 0 ? anim.thresholdHoldTimer : 0;
    const totalGlow = bumpPulse > 0
      ? 18 + bumpPulse * 14
      : (thresholdPulse > 0 ? 20 + thresholdPulse * 18 : 0);
    const totalValueBaselineY = npcRowTopY + 64;
    ctx.save();
    ctx.fillStyle = thresholdPulse > 0 ? highlightValueFlash : highlightValueColor;
    ctx.font = `700 42px ${ANNOUNCEMENT_FONT_FAMILY}`;
    ctx.textAlign = "left";
    ctx.shadowColor = "rgba(255, 217, 120, 0.7)";
    ctx.shadowBlur = totalGlow;
    ctx.fillText(`${formatNumber(totalHealth)}`, totalBlockX, totalValueBaselineY);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "rgba(234, 246, 255, 0.7)";
    ctx.font = `600 16px ${ANNOUNCEMENT_FONT_FAMILY}`;
    ctx.textAlign = "left";
    ctx.restore();

    if (anim && anim.congregationAwarded > (anim.lastGhostAward || 0)) {
      const popCount = anim.congregationAwarded - (anim.lastGhostAward || 0);
      const countTextWidth = ctx.measureText(formatNumber(recapTallyState.totalValue || 0)).width || 0;
      const popX = countNumberX + countTextWidth / 2;
      for (let ghostIndex = 0; ghostIndex < popCount; ghostIndex += 1) {
        spawnRecapGhostEffect(
          "+1",
          popX,
          countNumberY - 12,
          popX,
          countNumberY - 54 - ghostIndex * 10,
        );
      }
      anim.lastGhostAward = anim.congregationAwarded;
    }
    if (anim && anim.congregationPenaltyApplied > (anim.lastGhostPenalty || 0)) {
      const popCount = anim.congregationPenaltyApplied - (anim.lastGhostPenalty || 0);
      const countTextWidth = ctx.measureText(formatNumber(recapTallyState.totalValue || 0)).width || 0;
      const popX = countNumberX + countTextWidth / 2;
      for (let ghostIndex = 0; ghostIndex < popCount; ghostIndex += 1) {
        spawnRecapGhostEffect(
          "-1",
          popX,
          countNumberY - 12,
          popX,
          countNumberY - 54 - ghostIndex * 10,
        );
      }
      anim.lastGhostPenalty = anim.congregationPenaltyApplied;
    }

    return {
      height: rowBottomY - labelY,
      pendingGhostX: totalBlockX,
      pendingGhostY: totalValueBaselineY - 16,
      pendingGhostText: `+1`,
    };
  };

  const drawPerformanceBonusesRow = (line, lineIndex, x, y, maxWidth, countAnchorX, countAnchorY) => {
    const anim = (
      recapTallyState.performanceBonusAnim &&
      recapTallyState.performanceBonusAnim.index === recapTallyState.stepIndex
    )
      ? recapTallyState.performanceBonusAnim
      : null;
    const entries = Array.isArray(line?.performanceBadgeBreakdown)
      ? line.performanceBadgeBreakdown.slice(0, 8)
      : [];
    const finalTotalPerformance = Number.isFinite(line?.totalPerformance)
      ? Math.max(0, Math.round(line.totalPerformance))
      : 0;
    const finalAwardedCongregation = Number.isFinite(line?.delta)
      ? Math.max(0, Math.round(line.delta))
      : 0;
    const totalPerformance = anim
      ? Math.max(0, Math.round(anim.totalPerformance || 0))
      : (
          recapTallyState.lastAppliedIndex >= lineIndex || recapTallyState.done
            ? finalTotalPerformance
            : 0
        );
    const awardedCongregation = anim
      ? Math.max(0, Math.round(anim.congregationAwarded || 0))
      : finalAwardedCongregation;
    const activeBadgeIndex = anim
      ? Math.min(entries.length - 1, Math.max(0, anim.activeBadgeIndex || 0))
      : Math.max(0, entries.length - 1);
    const visibleBadgeCount = anim
      ? Math.max(1, Math.min(entries.length, activeBadgeIndex + 1))
      : (
          recapTallyState.lastAppliedIndex >= lineIndex || recapTallyState.done
            ? entries.length
            : 0
        );
    const bumpPulse = anim ? Math.max(0, anim.bumpTimer || 0) : 0;
    const thresholdPulse = anim && anim.thresholdHoldTimer > 0 ? anim.thresholdHoldTimer : 0;

    const labelY = y;
    const blockTopY = labelY + 20;
    const badgeSlotSize = 64;
    const badgeGap = 16;
    const visibleBadgeWidth = visibleBadgeCount
      ? visibleBadgeCount * badgeSlotSize + Math.max(0, visibleBadgeCount - 1) * badgeGap
      : badgeSlotSize;
    const badgeAreaWidth = Math.min(
      recapLeftColumnWidth,
      Math.max(210, visibleBadgeWidth),
    );
    const badgeAreaX = recapLeftColumnX;
    const totalBlockX = recapTotalColumnX;
    const rowTopY = blockTopY + 18;
    const rowBottomY = rowTopY + 126;
    const badgeRowWidth = visibleBadgeCount
      ? visibleBadgeCount * badgeSlotSize + Math.max(0, visibleBadgeCount - 1) * badgeGap
      : badgeSlotSize;
    const badgeStartX = badgeAreaX;
    const badgeCenterY = rowTopY + 48;

    ctx.save();
    ctx.fillStyle = baseLabelColor;
    ctx.font = `${TEXT_STYLES.h3.weight} ${bodySize}px ${ANNOUNCEMENT_FONT_FAMILY}`;
    ctx.textAlign = "left";
    drawHighlightedLabel(line.label || "Performance Bonuses:", x, labelY);
    ctx.restore();

    entries.slice(0, visibleBadgeCount).forEach((entry, index) => {
      const badgeCenterX = badgeStartX + badgeSlotSize / 2 + index * (badgeSlotSize + badgeGap);
      const isActive = index === activeBadgeIndex;
      const displayedBadgeValue = (() => {
        if (!anim) {
          return Math.max(0, Math.round(entry?.value || 0));
        }
        if (isActive) {
          return Math.max(0, Math.round(anim.activeValue || 0));
        }
        if (index < activeBadgeIndex) {
          return anim.finished ? Math.max(0, Math.round(entry?.value || 0)) : null;
        }
        return null;
      })();

      if (displayedBadgeValue !== null) {
        ctx.save();
        ctx.fillStyle = isActive && thresholdPulse > 0 ? highlightValueFlash : highlightValueColor;
        ctx.font = `700 24px ${ANNOUNCEMENT_FONT_FAMILY}`;
        ctx.textAlign = "center";
        ctx.fillText(`${formatNumber(displayedBadgeValue)}`, badgeCenterX, rowTopY + 6);
        ctx.restore();
      }

      drawChurchPowerupIcon(ctx, {
        x: badgeCenterX,
        y: badgeCenterY,
        size: badgeSlotSize,
        iconImage: getChurchPowerupIcon(entry?.iconSrc),
        style: {
          shape: "square",
          color: "#314B77",
          accent: "#4769A1",
        },
      });

      const nameLines = String(entry?.label || "")
        .split(/\s+/)
        .filter(Boolean);
      ctx.save();
      ctx.fillStyle = "rgba(234, 246, 255, 0.9)";
      ctx.font = `600 13px ${ANNOUNCEMENT_FONT_FAMILY}`;
      ctx.textAlign = "center";
      const nameStartY = rowTopY + 100;
      nameLines.forEach((textLine, lineIndex) => {
        ctx.fillText(textLine, badgeCenterX, nameStartY + lineIndex * 16);
      });
      ctx.restore();
    });

    const totalGlow = bumpPulse > 0
      ? 18 + bumpPulse * 14
      : (thresholdPulse > 0 ? 20 + thresholdPulse * 18 : 0);
    const totalValueBaselineY = rowTopY + 64;
    ctx.save();
    ctx.fillStyle = thresholdPulse > 0 ? highlightValueFlash : highlightValueColor;
    ctx.font = `700 42px ${ANNOUNCEMENT_FONT_FAMILY}`;
    ctx.textAlign = "left";
    ctx.shadowColor = "rgba(255, 217, 120, 0.7)";
    ctx.shadowBlur = totalGlow;
    ctx.fillText(`${formatNumber(totalPerformance)}`, totalBlockX, totalValueBaselineY);
    ctx.restore();

    if (anim && anim.congregationAwarded > (anim.lastGhostAward || 0)) {
      const popCount = anim.congregationAwarded - (anim.lastGhostAward || 0);
      for (let ghostIndex = 0; ghostIndex < popCount; ghostIndex += 1) {
        spawnRecapGhostEffect(
          "+1",
          totalBlockX + 20,
          totalValueBaselineY - 16,
          countAnchorX,
          countAnchorY,
        );
      }
      anim.lastGhostAward = anim.congregationAwarded;
    }

    return {
      height: rowBottomY - labelY,
    };
  };

  const drawHighlightedLabel = (textLine, x, y, highlightText) => {
    if (!highlightText) {
      const fallbackMatch = String(textLine).match(/\b(?:with|through)\s+([^:.]+)\b/i);
      if (!fallbackMatch) {
        ctx.fillStyle = baseLabelColor;
        ctx.fillText(textLine, x, y);
        return;
      }
      highlightText = fallbackMatch[1];
    }
    const lowerLine = String(textLine).toLowerCase();
    const lowerHighlight = String(highlightText).toLowerCase();
    const start = lowerLine.indexOf(lowerHighlight);
    if (start === -1) {
      const fallbackMatch = String(textLine).match(/\b(?:with|through)\s+([^:.]+)\b/i);
      if (!fallbackMatch) {
        ctx.fillStyle = baseLabelColor;
        ctx.fillText(textLine, x, y);
        return;
      }
      highlightText = fallbackMatch[1];
      const lowerFallback = highlightText.toLowerCase();
      const fallbackStart = lowerLine.indexOf(lowerFallback);
      if (fallbackStart === -1) {
        ctx.fillStyle = baseLabelColor;
        ctx.fillText(textLine, x, y);
        return;
      }
      const before = textLine.slice(0, fallbackStart);
      const match = textLine.slice(fallbackStart, fallbackStart + highlightText.length);
      const after = textLine.slice(fallbackStart + highlightText.length);
      ctx.fillStyle = baseLabelColor;
      ctx.fillText(before, x, y);
      const beforeWidth = ctx.measureText(before).width;
      ctx.fillStyle = highlightValueColor;
      ctx.fillText(match, x + beforeWidth, y);
      const matchWidth = ctx.measureText(match).width;
      ctx.fillStyle = baseLabelColor;
      ctx.fillText(after, x + beforeWidth + matchWidth, y);
      return;
    }
    const before = textLine.slice(0, start);
    const match = textLine.slice(start, start + highlightText.length);
    const after = textLine.slice(start + highlightText.length);
    ctx.fillStyle = baseLabelColor;
    ctx.fillText(before, x, y);
    const beforeWidth = ctx.measureText(before).width;
    ctx.fillStyle = highlightValueColor;
    ctx.fillText(match, x + beforeWidth, y);
    const matchWidth = ctx.measureText(match).width;
    ctx.fillStyle = baseLabelColor;
    ctx.fillText(after, x + beforeWidth + matchWidth, y);
  };

  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.shadowColor = "rgba(6, 10, 18, 0.85)";
  ctx.shadowBlur = 18;
  ctx.save();
  ctx.fillStyle = "rgba(6, 10, 18, 0.68)";
  ctx.strokeStyle = "rgba(255, 217, 120, 0.32)";
  ctx.lineWidth = 2;
  roundRect(ctx, panelX, panelTop, panelWidth, panelHeight, 26, true, true);
  ctx.restore();

  const countSize = 58;
  const headingTitleLineHeight = Math.round(titleSize * 1.02);
  const getFontMetrics = (sampleText, fontSize) => {
    const metrics = ctx.measureText(sampleText);
    const ascent = Number.isFinite(metrics.actualBoundingBoxAscent)
      ? metrics.actualBoundingBoxAscent
      : Math.round(fontSize * 0.78);
    const descent = Number.isFinite(metrics.actualBoundingBoxDescent)
      ? metrics.actualBoundingBoxDescent
      : Math.round(fontSize * 0.18);
    return { ascent, descent };
  };
  ctx.fillStyle = highlightValueColor;
  ctx.font = `${TEXT_STYLES.h1.weight} ${titleSize}px ${ANNOUNCEMENT_FONT_FAMILY}`;
  const wrappedHeadingTitle = wrapText(ctx, headingCombined, contentWidth);
  const titleMetrics = getFontMetrics("Battle Report", titleSize);
  wrappedHeadingTitle.forEach((textLine) => {
    ctx.fillText(textLine, contentX, cursorY);
    cursorY += headingTitleLineHeight;
  });
  const lastTitleBaselineY = cursorY - headingTitleLineHeight;
  const headerBottomY = lastTitleBaselineY + titleMetrics.descent;
  ctx.font = `${TEXT_STYLES.h1.weight} ${countSize}px ${ANNOUNCEMENT_FONT_FAMILY}`;
  const countMetrics = getFontMetrics("Congregation Count", countSize);
  const countBaselineY = headerBottomY + 2 * 28 + countMetrics.ascent;
  const countTopY = countBaselineY - countMetrics.ascent;
  const dividerY = Math.round((headerBottomY + countTopY) / 2);
  ctx.save();
  ctx.strokeStyle = dividerColor;
  ctx.lineWidth = 2;
  const dividerInset = Math.round(Math.min(28, contentWidth * 0.035));
  ctx.beginPath();
  ctx.moveTo(contentX + dividerInset, dividerY);
  ctx.lineTo(contentX + contentWidth - dividerInset, dividerY);
  ctx.stroke();
  ctx.restore();
  cursorY = countBaselineY;

  let countNumberX = contentX;
  let countNumberY = cursorY;

  if (!recapTallyState.showCount) {
    ctx.restore();
    if (typeof window !== "undefined") {
      window.__missionBriefActive = false;
      window.__missionBriefButtonBounds = null;
      window.__announcementButtons = { key: buttonKey, buttons: [] };
    }
    ctx.restore();
    return;
  }

  ctx.font = `${TEXT_STYLES.h1.weight} ${countSize}px ${ANNOUNCEMENT_FONT_FAMILY}`;
  const totalValue = recapTallyState.totalValue;
  const countLabel = "Congregation Count:";
  ctx.fillStyle = baseLabelColor;
  ctx.textAlign = "left";
  ctx.fillText(countLabel, contentX, cursorY);
  countNumberX = recapTotalColumnX;
  ctx.fillStyle = recapTallyState.flashTimer > 0 ? highlightValueFlash : highlightValueColor;
  ctx.fillText(formatNumber(totalValue || 0), countNumberX, cursorY);
  countNumberY = cursorY;
  cursorY += Math.round(countSize * 0.84);

  if (!recapTallyState.allowLines) {
    ctx.restore();
    if (typeof window !== "undefined") {
      window.__missionBriefActive = false;
      window.__missionBriefButtonBounds = null;
      window.__announcementButtons = { key: buttonKey, buttons: [] };
    }
    ctx.restore();
    return;
  }

  const activeIndex = recapTallyState.stepIndex;
  const maxVisible = recapTallyState.done ? lines.length : Math.min(lines.length, activeIndex + 1);
  ctx.fillStyle = baseLabelColor;
  ctx.font = `${TEXT_STYLES.h3.weight} ${bodySize}px ${ANNOUNCEMENT_FONT_FAMILY}`;
  for (let i = 0; i < maxVisible; i += 1) {
    const line = lines[i];
    const isLastLine = i === maxVisible - 1;
    if (line.kind === "npcHealthBonus") {
      const highlightValue =
        recapTallyState.flashTimer > 0 &&
        recapTallyState.lastAppliedIndex === i;
      const bonusBlock = drawNpcHealthBonusRow(
        line,
        i,
        contentX,
        cursorY,
        contentWidth,
        highlightValue,
      );
      if (
        recapTallyState.pendingGhost &&
        recapTallyState.pendingGhost.index === i &&
        recapTallyState.pendingGhost.value === line.delta &&
        bonusBlock
      ) {
        spawnRecapGhostEffect(
          bonusBlock.pendingGhostText,
          bonusBlock.pendingGhostX,
          bonusBlock.pendingGhostY,
          countNumberX,
          countNumberY,
        );
        recapTallyState.pendingGhost = null;
      }
      cursorY += bonusBlock.height;
      if (!isLastLine) cursorY += sectionGap;
      continue;
    }
    if (line.kind === "performanceBonuses") {
      const bonusBlock = drawPerformanceBonusesRow(
        line,
        i,
        contentX,
        cursorY,
        contentWidth,
        countNumberX,
        countNumberY,
      );
      cursorY += bonusBlock.height;
      if (!isLastLine) cursorY += sectionGap;
      continue;
    }
    if (line.kind === "grace") {
      const prefix = line.prefix || "Bonus Grace: ";
      const displayValue = Math.max(0, Math.round(line.delta || 0));
      const showValue =
        recapTallyState.done ||
        i < activeIndex ||
        recapTallyState.phase === "value" ||
        recapTallyState.phase === "post";
      const lineText = showValue ? `${prefix}${displayValue}` : prefix;
      const graceChunks = String(lineText).split("\n");
      const wrapped = graceChunks.flatMap((chunk) => wrapText(ctx, chunk, contentWidth));
      wrapped.forEach((textLine) => {
        ctx.fillStyle = "#EAF6FF";
        ctx.fillText(textLine, contentX, cursorY);
        cursorY += lineSpacing;
      });
      if (!isLastLine) cursorY += sectionGap;
      continue;
    }

    const showValue =
      !line.skipValue &&
      (recapTallyState.done ||
        i < activeIndex ||
        recapTallyState.phase === "value" ||
        recapTallyState.phase === "post");
    const labelText = line.label || "";
    const labelChunks = String(labelText).split("\n");
    const labelLines = labelChunks.flatMap((chunk) => wrapText(ctx, chunk, contentWidth));
    let valueText = "";
    let valueX = 0;
    let valueY = 0;
    let valueInline = false;
    if (showValue) {
      const valuePrefix = line.valuePrefix || "";
      const valueSuffix = line.valueSuffix || "";
      const numericValue = Number.isFinite(line.delta) ? Math.round(line.delta) : 0;
      const formattedValue = line.forceSignless ? formatNumber(numericValue) : formatSigned(line.delta);
      valueText = `${valuePrefix}${formattedValue}${valueSuffix}`;
      const lastLine = labelLines[labelLines.length - 1] || "";
      const lastWidth = ctx.measureText(lastLine).width;
      const valueWidth = ctx.measureText(valueText).width;
      if (lastWidth + 10 + valueWidth <= contentWidth) {
        valueInline = true;
        valueX = contentX + lastWidth + 10;
        valueY = cursorY + lineSpacing * Math.max(0, labelLines.length - 1);
      }
    }
    if (showValue && line.forceInlineValue) {
      const lastLine = labelLines[labelLines.length - 1] || "";
      const lastWidth = ctx.measureText(lastLine).width;
      valueInline = true;
      valueX = contentX + lastWidth + 10;
      valueY = cursorY + lineSpacing * Math.max(0, labelLines.length - 1);
    }
    if (line.forceValueLine) {
      valueInline = false;
    }

    labelLines.forEach((textLine, idx) => {
      drawHighlightedLabel(textLine, contentX, cursorY, line.highlightText);
      if (showValue && valueInline && idx === labelLines.length - 1) {
        const highlightValue =
          recapTallyState.flashTimer > 0 &&
          recapTallyState.lastAppliedIndex === i;
        ctx.fillStyle = highlightValue ? highlightValueFlash : highlightValueColor;
        ctx.fillText(valueText, valueX, valueY);
        if (line.kind === "congregation" && Number.isFinite(line.delta) && line.delta > 0) {
          const memberOffset = lines
            .slice(0, i)
            .reduce(
              (sum, priorLine) =>
                priorLine?.kind === "congregation" && Number.isFinite(priorLine?.delta) && priorLine.delta > 0
                  ? sum + Math.round(priorLine.delta)
                  : sum,
              0,
            );
          const spriteBlock = drawInlineCongregationSprites(
            valueX + ctx.measureText(valueText).width + 14,
            valueY,
            line.delta,
            memberOffset,
          );
          if (spriteBlock && spriteBlock.height > lineSpacing) {
            cursorY += spriteBlock.height - lineSpacing;
          }
        }
        if (
          recapTallyState.pendingGhost &&
          recapTallyState.pendingGhost.index === i &&
          recapTallyState.pendingGhost.value === line.delta
        ) {
          spawnRecapGhostEffect(valueText, valueX, valueY, countNumberX, countNumberY);
          recapTallyState.pendingGhost = null;
        }
      }
      cursorY += lineSpacing;
    });

    if (showValue && !valueInline) {
      const highlightValue =
        recapTallyState.flashTimer > 0 &&
        recapTallyState.lastAppliedIndex === i;
      valueX = contentX;
      valueY = cursorY;
      ctx.fillStyle = highlightValue ? highlightValueFlash : highlightValueColor;
      ctx.fillText(valueText, valueX, valueY);
      if (line.kind === "congregation" && Number.isFinite(line.delta) && line.delta > 0) {
        const memberOffset = lines
          .slice(0, i)
          .reduce(
            (sum, priorLine) =>
              priorLine?.kind === "congregation" && Number.isFinite(priorLine?.delta) && priorLine.delta > 0
                ? sum + Math.round(priorLine.delta)
                : sum,
            0,
          );
        const spriteBlock = drawInlineCongregationSprites(
          valueX + ctx.measureText(valueText).width + 14,
          valueY,
          line.delta,
          memberOffset,
        );
        if (spriteBlock && spriteBlock.height > lineSpacing) {
          cursorY += spriteBlock.height - lineSpacing;
        }
      }
      if (
        recapTallyState.pendingGhost &&
        recapTallyState.pendingGhost.index === i &&
        recapTallyState.pendingGhost.value === line.delta
      ) {
        spawnRecapGhostEffect(valueText, valueX, valueY, countNumberX, countNumberY);
        recapTallyState.pendingGhost = null;
      }
      cursorY += lineSpacing;
    }
    if (!isLastLine) cursorY += sectionGap;
  }

  if (recapTallyState.ghostEffects.length) {
    ctx.save();
    ctx.font = `800 44px ${ANNOUNCEMENT_FONT_FAMILY}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    recapTallyState.ghostEffects.forEach((effect) => {
      ctx.globalAlpha = effect.alpha;
      ctx.fillStyle = effect.text.startsWith("-") ? "#FF8A8A" : "#FFD978";
      ctx.shadowColor = effect.text.startsWith("-")
        ? "rgba(255, 120, 120, 0.75)"
        : "rgba(255, 217, 120, 0.85)";
      ctx.shadowBlur = 18;
      ctx.fillText(effect.text, effect.x, effect.y);
    });
    ctx.restore();
  }

  if (recapTallyState.graceEffects.length) {
    const frame = requireBindings().assets?.items?.gracePickup?.frames?.[0];
    const size = frame ? Math.max(16, frame.width || 18) : 18;
    recapTallyState.graceEffects.forEach((effect) => {
      ctx.save();
      ctx.globalAlpha = effect.alpha;
      if (frame) {
        ctx.drawImage(frame, effect.x - size / 2, effect.y - size / 2, size, size);
      } else {
        ctx.fillStyle = "#FFD978";
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }
  ctx.restore();

  if (!canShowContinue) {
    if (typeof window !== "undefined") {
      window.__missionBriefActive = false;
      window.__missionBriefButtonBounds = null;
      window.__announcementButtons = { key: buttonKey, buttons: [] };
    }
    ctx.restore();
    return;
  }

  const buttonWidth = Math.min(420, Math.round(layout.virtualCanvas.width * 0.6));
  const buttonHeight = 72;
  const buttonX = Math.round((layout.virtualCanvas.width - buttonWidth) / 2);
  const buttonY = Math.round(Math.max(layout.buttonY || 0, cursorY + 16));

  ctx.save();
  ctx.fillStyle = "#9BD9FF";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
  ctx.lineWidth = 2;
  roundRect(ctx, buttonX, buttonY, buttonWidth, buttonHeight, 18, true, true);
  if (isAnnouncementButtonFocused(buttonKey, 0)) {
    drawFocusRing(ctx, buttonX - 3, buttonY - 3, buttonWidth + 6, buttonHeight + 6, 20);
    drawButtonReflection(ctx, buttonX, buttonY, buttonWidth, buttonHeight, 18, 0.45);
  }
  ctx.fillStyle = "#0b111a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 24px ${uiFontFamily}`;
  const continueLabel = (typeof GameText !== 'undefined' && GameText.buttons?.continue) || "Continue (Space)";
  ctx.fillText(continueLabel, buttonX + buttonWidth / 2, buttonY + buttonHeight / 2);
  ctx.restore();

  if (typeof window !== "undefined") {
    window.__missionBriefActive = false;
    window.__missionBriefButtonBounds = null;
    window.__announcementButtons = {
      key: buttonKey,
      buttons: [
        {
          key: "continue",
          x: layout.offsetX + buttonX * layout.scale,
          y: layout.offsetY + buttonY * layout.scale,
          width: buttonWidth * layout.scale,
          height: buttonHeight * layout.scale,
        },
      ],
    };
  }

  ctx.restore();
}

const UPGRADE_ICON_SOURCES = {
  category: "assets/sprites/pixel-art-pack/Items/I25_Book.png",
};
let upgradeCategoryIcon = null;
const churchPowerupIcons = new Map();
const CHURCH_POWERUP_ICON_DEFAULT = {
  shape: "square",
  color: "#2B4C73",
  accent: "#3C5F8C",
};
const CHURCH_POWERUP_ICON_HIGHLIGHT = "rgba(255, 215, 64, 0.95)";

function getUpgradeIcon(kind) {
  if (typeof Image === "undefined") return null;
  if (kind === "category") {
    if (!upgradeCategoryIcon) {
      upgradeCategoryIcon = new Image();
      upgradeCategoryIcon.src = UPGRADE_ICON_SOURCES.category;
    }
    return upgradeCategoryIcon;
  }
  return null;
}

function getChurchPowerupIcon(src) {
  if (!src || typeof Image === "undefined") return null;
  if (!churchPowerupIcons.has(src)) {
    const img = new Image();
    img.src = src;
    churchPowerupIcons.set(src, img);
  }
  return churchPowerupIcons.get(src);
}

function drawChurchPowerupIcon(ctx, { x, y, size, iconImage, style }) {
  if (!ctx || !size) return;
  const half = size / 2;
  const drawBadgeShape = (mode = "fill") => {
    drawChurchBadgeShape(ctx, size, style, mode);
  };
  ctx.save();
  ctx.translate(x, y);
  drawChurchBadgeSurface(ctx, size, style);

  const t = (typeof performance !== "undefined" ? performance.now() : Date.now()) * 0.001;
  const pulse = (Math.sin(t * 1.6) + 1) * 0.5;
  const shimmerAlpha = Math.max(0.12, pulse * 0.65);
  if (shimmerAlpha > 0.12) {
    ctx.save();
    ctx.globalAlpha *= shimmerAlpha;
    drawBadgeShape("clip");
    ctx.clip();
    const shimmerWidth = size * 0.6;
    const offset = ((t * 0.9) % 1) * (size + shimmerWidth) - (size + shimmerWidth) / 2;
    ctx.rotate(-0.45);
    const grad = ctx.createLinearGradient(offset - shimmerWidth, 0, offset + shimmerWidth, 0);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(0.5, "rgba(255,255,255,0.85)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(-size * 1.5, -size * 1.5, size * 3, size * 3);
    ctx.restore();
  }

  if (iconImage && iconImage.complete) {
    const iconSize = size * 0.6;
    const iconX = -iconSize / 2;
    const iconY = -iconSize / 2;
    ctx.drawImage(iconImage, iconX, iconY, iconSize, iconSize);
  }
  ctx.restore();
}

function drawChurchBadgeShape(ctx, size, style, mode = "fill") {
  const half = size / 2;
  const shape = style?.shape || CHURCH_POWERUP_ICON_DEFAULT.shape;
  if (shape === "circle") {
    ctx.beginPath();
    ctx.arc(0, 0, half, 0, Math.PI * 2);
    if (mode === "fill") ctx.fill();
    else if (mode === "stroke") ctx.stroke();
    return;
  }
  if (shape === "shield") {
    const topY = -half;
    const shoulderY = -half * 0.18;
    const bottomY = half;
    ctx.beginPath();
    ctx.moveTo(0, topY);
    ctx.lineTo(half * 0.88, shoulderY);
    ctx.quadraticCurveTo(half * 0.78, half * 0.46, 0, bottomY);
    ctx.quadraticCurveTo(-half * 0.78, half * 0.46, -half * 0.88, shoulderY);
    ctx.closePath();
    if (mode === "fill") ctx.fill();
    else if (mode === "stroke") ctx.stroke();
    return;
  }
  const radius = Math.max(6, Math.round(size * 0.16));
  roundRect(ctx, -half, -half, size, size, radius, mode === "fill", mode === "stroke");
}

function drawChurchBadgeSurface(ctx, size, style) {
  const half = size / 2;
  const color = style?.color || CHURCH_POWERUP_ICON_DEFAULT.color;
  const accent = style?.accent || CHURCH_POWERUP_ICON_DEFAULT.accent;
  const gradient = ctx.createLinearGradient(0, -half, 0, half);
  gradient.addColorStop(0, accent);
  gradient.addColorStop(1, color);
  ctx.fillStyle = gradient;
  drawChurchBadgeShape(ctx, size, style, "fill");
  ctx.lineWidth = Math.max(2, size * 0.08);
  ctx.strokeStyle = CHURCH_POWERUP_ICON_HIGHLIGHT;
  drawChurchBadgeShape(ctx, size, style, "stroke");
}

function drawChurchUpgradeScreen(ctx, canvas, options = {}) {
  const {
    graceCount = 0,
    stats = [],
    uiFontFamily = "sans-serif",
    backgroundMode = "image",
    dimAlpha = 0,
    undoAvailable = false,
  } = options;

  // Draw background
  if (backgroundMode !== "transparent") {
    const { assets } = requireBindings();
    const backgroundImage = assets?.backgrounds?.gameOver || null;
    ctx.save();
    if (backgroundImage) {
      drawCoverImage(ctx, canvas, backgroundImage, 1, 0.5, 0.5);
      ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.restore();
  } else if (dimAlpha > 0) {
    ctx.save();
    ctx.fillStyle = `rgba(0, 0, 0, ${Math.max(0, Math.min(1, dimAlpha))})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  const title = "How will you guide your church forward?";
  const staticSubtitle = "";
  const buttonHeight = 200;
  const buttonCount = stats.length;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const fitTextSize = (text, size, maxWidth) => {
    if (!text) return size;
    ctx.font = `${size}px ${uiFontFamily}`;
    const width = ctx.measureText(text).width || 0;
    if (!width || width <= maxWidth) return size;
    const scale = maxWidth / width;
    return Math.max(9, Math.floor(size * scale));
  };

  ctx.save();
  const layout = getAnnouncementScreenLayout(ctx, canvas, {
    title,
    subtitle: staticSubtitle,
    titleSize: TEXT_STYLES.h1.size,
    subtitleSize: TEXT_STYLES.h2.size,
    lineGap: Math.round(TEXT_STYLES.h1.size * TEXT_STYLES.h1.lineHeight),
    weight: TEXT_STYLES.h1.weight,
    maxWidthScale: 0.96,
    position: "top",
    topMargin: 90,
    bottomMargin: 70,
    rowGap: 40,
    buttonHeight,
    buttonCount: buttonCount + 2,
  });
  ctx.translate(layout.offsetX, layout.offsetY);
  ctx.scale(layout.scale, layout.scale);

  // Draw static title and subtitle with typewriter
  drawAnnouncementText(ctx, layout.virtualCanvas, {
    title,
    subtitle: staticSubtitle,
    yBase: layout.titleY,
    titleSize: TEXT_STYLES.h1.size,
    subtitleSize: TEXT_STYLES.h2.size,
    weight: TEXT_STYLES.h1.weight,
    subtitleWeight: TEXT_STYLES.h2.weight,
    lineGap: Math.round(TEXT_STYLES.h1.size * TEXT_STYLES.h1.lineHeight),
    alpha: 1,
    typewriter: true,
    maxWidthScale: 0.96,
    blockAlign: "center",
  });

  const revealComplete = isAnnouncementRevealComplete(title, staticSubtitle);
  if (!revealComplete) {
    window.__churchUpgradeScreenButtons = { buttons: [] };
    ctx.restore();
    return;
  }
  const { powerupIconStyles } = requireBindings();

  const buttonGap = 18;
  const sidePadding = 60;
  const totalAvailable = layout.virtualCanvas.width - sidePadding * 2;
  const buttonWidth = Math.floor((totalAvailable - buttonGap * (buttonCount - 1)) / buttonCount);
  const buttonRowWidth = buttonWidth * buttonCount + buttonGap * (buttonCount - 1);
  const buttonStartX = Math.round((layout.virtualCanvas.width - buttonRowWidth) / 2);

  // Grace row height
  const graceRowHeight = 50;
  const baseButtonY = Math.round(layout.buttonY || 0);

  // Draw dynamic grace count as its own row
  const graceText = `Grace Available: ${graceCount}`;
  const graceY = baseButtonY + 10;
  ctx.save();
  ctx.fillStyle = "#FFC86A";
  ctx.font = `${TEXT_STYLES.h2.weight} ${TEXT_STYLES.h2.size}px ${ANNOUNCEMENT_FONT_FAMILY}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.shadowColor = "rgba(6, 10, 18, 0.85)";
  ctx.shadowBlur = 20;
  ctx.fillText(graceText, layout.virtualCanvas.width / 2, graceY);
  ctx.restore();

  // Buttons start after grace row
  const buttonY = baseButtonY + graceRowHeight;

  const bounds = [];
  stats.forEach((stat, index) => {
    const x = buttonStartX + index * (buttonWidth + buttonGap);
    const level = Number.isFinite(stat.level) ? stat.level : (stat.owned ? 1 : 0);
    const maxLevel = Number.isFinite(stat.maxLevel) ? stat.maxLevel : 1;
    const maxed = level >= maxLevel;
    const canAfford = !stat.disabled && !maxed && graceCount >= stat.cost;
    const cardPaddingX = 16;
    const cardPaddingY = 14;
    const innerX = x + cardPaddingX;
    const innerW = buttonWidth - cardPaddingX * 2;
    const headerTop = buttonY + cardPaddingY + 10;

    ctx.save();
    const cardRadius = 16;
    const cardX = x;
    const cardY = buttonY;
    const cardW = buttonWidth;
    const cardH = buttonHeight;
    const headerHeight = 52;
    const bodyTop = cardY + headerHeight + 18;
    const baseGradient = ctx.createLinearGradient(0, cardY, 0, cardY + cardH);
    if (canAfford) {
      baseGradient.addColorStop(0, "#2A2118");
      baseGradient.addColorStop(0.55, "#3A2E21");
      baseGradient.addColorStop(1, "#1E1812");
    } else {
      baseGradient.addColorStop(0, "rgba(55, 45, 35, 0.7)");
      baseGradient.addColorStop(1, "rgba(40, 34, 28, 0.65)");
    }
    ctx.shadowColor = "rgba(8, 6, 4, 0.55)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = baseGradient;
    roundRect(ctx, cardX, cardY, cardW, cardH, cardRadius, true, false);
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.lineWidth = 2;
    ctx.strokeStyle = canAfford ? "rgba(200, 160, 90, 0.85)" : "rgba(120, 100, 70, 0.35)";
    roundRect(ctx, cardX, cardY, cardW, cardH, cardRadius, false, true);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    roundRect(
      ctx,
      cardX + 3,
      cardY + 3,
      cardW - 6,
      cardH - 6,
      Math.max(8, cardRadius - 4),
      false,
      true,
    );
    ctx.save();
    roundRect(ctx, cardX, cardY, cardW, cardH, cardRadius, false, false);
    ctx.clip();
    const headerGradient = ctx.createLinearGradient(0, cardY, 0, cardY + headerHeight);
    if (canAfford) {
      headerGradient.addColorStop(0, "#5B4328");
      headerGradient.addColorStop(1, "#3E2E1D");
    } else {
      headerGradient.addColorStop(0, "rgba(90, 70, 50, 0.7)");
      headerGradient.addColorStop(1, "rgba(70, 55, 40, 0.6)");
    }
    ctx.fillStyle = headerGradient;
    ctx.fillRect(cardX, cardY, cardW, headerHeight);
    ctx.fillStyle = "rgba(230, 195, 130, 0.3)";
    ctx.fillRect(cardX, cardY + headerHeight - 2, cardW, 2);
    ctx.globalAlpha = canAfford ? 0.12 : 0.05;
    ctx.rotate(-0.08);
    ctx.fillStyle = "rgba(255, 235, 200, 0.85)";
    ctx.fillRect(cardX - cardW, cardY + headerHeight * 0.4, cardW * 3, 6);
    ctx.restore();
    if (!canAfford) {
      ctx.fillStyle = "rgba(12, 10, 8, 0.35)";
      roundRect(ctx, cardX, cardY, cardW, cardH, cardRadius, true, false);
    }

    if (isAnnouncementButtonFocused("churchUpgradeScreen", index)) {
      drawFocusRing(ctx, x - 3, buttonY - 3, buttonWidth + 6, buttonHeight + 6, 20);
    }

    const powerupIcon = getChurchPowerupIcon(stat.iconSrc);
    const iconSize = 34;
    const iconCenterX = cardX + 28;
    const iconCenterY = cardY + headerHeight / 2;
    const iconStyle = powerupIconStyles?.player || CHURCH_POWERUP_ICON_DEFAULT;
    drawChurchPowerupIcon(ctx, {
      x: iconCenterX,
      y: iconCenterY,
      size: iconSize,
      iconImage: powerupIcon || getUpgradeIcon("category"),
      style: iconStyle,
    });

    const textLeft = cardX + 24 + iconSize;
    const textRight = cardX + cardW - 22;
    const levelLabel = maxLevel > 1 ? `${level}/${maxLevel}` : "";
    const pillPadX = 14;
    const pillReservedWidth = levelLabel
      ? (() => { ctx.font = `700 12px ${uiFontFamily}`; return ctx.measureText(levelLabel).width + pillPadX * 2 + 8; })()
      : 0;
    const textWidth = Math.max(10, textRight - textLeft - pillReservedWidth);
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const titleSize = fitTextSize(stat.label, 18, textWidth);
    ctx.font = `800 ${titleSize}px ${uiFontFamily}`;
    ctx.fillStyle = "#F3E2C4";
    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 1;
    const titleY = cardY + headerHeight / 2 + 1;
    ctx.fillText(stat.label, textLeft, titleY);
    if (levelLabel) {
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.font = `700 12px ${uiFontFamily}`;
      const pillPadX = 14;
      const pillWidth = ctx.measureText(levelLabel).width + pillPadX * 2;
      const pillHeight = 24;
      const pillX = textRight - pillWidth;
      const pillY = titleY - pillHeight / 2;
      ctx.fillStyle = canAfford ? "rgba(120, 34, 34, 0.95)" : "rgba(70, 55, 45, 0.55)";
      ctx.strokeStyle = canAfford ? "rgba(255, 220, 170, 0.8)" : "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = 1.5;
      roundRect(ctx, pillX, pillY, pillWidth, pillHeight, 10, true, true);
      ctx.fillStyle = canAfford ? "#F6E6C6" : "rgba(220, 210, 190, 0.7)";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(levelLabel, pillX + pillWidth / 2, titleY);
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
    }

    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 1;
    ctx.font = `600 13px ${uiFontFamily}`;
    ctx.fillStyle = canAfford ? "rgba(235, 220, 195, 0.9)" : "rgba(200, 190, 170, 0.65)";
    const descriptionY = bodyTop + 8;
    const descriptionLines = wrapAnnouncementText(ctx, stat.description || "", textWidth);
    const maxDescriptionLines = 3;
    const descriptionLineHeight = 16;
    descriptionLines.slice(0, maxDescriptionLines).forEach((line, lineIndex) => {
      const lineY = descriptionY + lineIndex * descriptionLineHeight;
      ctx.fillText(line, textLeft, lineY);
    });
    const dividerY =
      descriptionY +
      Math.min(descriptionLines.length, maxDescriptionLines) * descriptionLineHeight +
      6;
    ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = "rgba(230, 200, 150, 0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(textLeft, dividerY);
    ctx.lineTo(textRight, dividerY);
    ctx.stroke();

    const detailParts = [];
    if (stat.detail) detailParts.push(stat.detail);
    const detailText = detailParts.join(" · ");
    const valueY = dividerY + 18;
    if (detailText) {
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      const badgePadX = 12;
      const badgePadY = 6;
      ctx.font = `700 13px ${uiFontFamily}`;
      const badgeWidth = ctx.measureText(detailText).width + badgePadX * 2;
      const badgeHeight = 22;
      const badgeX = textLeft;
      const badgeY = valueY - badgeHeight / 2;
      ctx.fillStyle = "rgba(12, 10, 8, 0.35)";
      ctx.strokeStyle = "rgba(230, 200, 150, 0.35)";
      ctx.lineWidth = 1.5;
      roundRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 10, true, true);
      ctx.fillStyle = canAfford ? "#F3E2C4" : "rgba(200, 190, 170, 0.65)";
      ctx.textBaseline = "middle";
      ctx.fillText(detailText, textLeft + badgePadX, valueY);
    }

    const costText = stat.disabled
      ? "Coming soon"
      : maxed
        ? "Maxed"
        : level > 0
          ? `Upgrade to Level ${level + 1}: ${stat.cost}`
          : `Cost: ${stat.cost}`;
    const costY = cardY + cardH - 26;
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.font = `700 13px ${uiFontFamily}`;
    const costPadX = 14;
    const costPadY = 7;
    const costWidth = ctx.measureText(costText).width + costPadX * 2;
    const costHeight = 24;
    const costX = cardX + cardW - 22 - costWidth;
    const costYPos = costY - costHeight / 2;
    ctx.fillStyle = canAfford ? "rgba(120, 34, 34, 0.95)" : "rgba(70, 55, 45, 0.55)";
    ctx.strokeStyle = canAfford ? "rgba(255, 220, 170, 0.8)" : "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 1.5;
    roundRect(ctx, costX, costYPos, costWidth, costHeight, 12, true, true);
    ctx.fillStyle = canAfford ? "#F6E6C6" : "rgba(220, 210, 190, 0.7)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(costText, costX + costWidth / 2, costY);
    ctx.textAlign = "left";

    ctx.restore();

    bounds.push({
      key: stat.key,
      x: layout.offsetX + x * layout.scale,
      y: layout.offsetY + buttonY * layout.scale,
      width: buttonWidth * layout.scale,
      height: buttonHeight * layout.scale,
      canAfford,
    });
  });

  const continueY = buttonY + buttonHeight + 30;
  const continueHeight = 56;

  const actionGap = 22;
  const actionButtonWidth = Math.min(320, (totalAvailable - actionGap) / 2);
  const actionRowWidth = actionButtonWidth * 2 + actionGap;
  const actionStartX = Math.round((layout.virtualCanvas.width - actionRowWidth) / 2);
  const undoX = actionStartX;
  const continueX2 = actionStartX + actionButtonWidth + actionGap;

  ctx.save();
  ctx.fillStyle = undoAvailable ? "#9BD9FF" : "rgba(120, 120, 130, 0.5)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
  ctx.lineWidth = 2;
  roundRect(ctx, undoX, continueY, actionButtonWidth, continueHeight, 18, true, true);
  if (isAnnouncementButtonFocused("churchUpgradeScreen", buttonCount)) {
    drawFocusRing(ctx, undoX - 3, continueY - 3, actionButtonWidth + 6, continueHeight + 6, 20);
  }
  ctx.fillStyle = "#0b111a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 22px ${uiFontFamily}`;
  const undoLabel = (typeof GameText !== 'undefined' && GameText.buttons?.undo) || "Undo";
  ctx.fillText(undoLabel, undoX + actionButtonWidth / 2, continueY + continueHeight / 2);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "#9BD9FF";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
  ctx.lineWidth = 2;
  roundRect(ctx, continueX2, continueY, actionButtonWidth, continueHeight, 18, true, true);
  if (isAnnouncementButtonFocused("churchUpgradeScreen", buttonCount + 1)) {
    drawFocusRing(ctx, continueX2 - 3, continueY - 3, actionButtonWidth + 6, continueHeight + 6, 20);
  }
  ctx.fillStyle = "#0b111a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 22px ${uiFontFamily}`;
  const continueLabel2 = (typeof GameText !== 'undefined' && GameText.buttons?.continue) || "Continue (Space)";
  ctx.fillText(continueLabel2, continueX2 + actionButtonWidth / 2, continueY + continueHeight / 2);
  ctx.restore();

  bounds.push({
    key: "undo",
    x: layout.offsetX + undoX * layout.scale,
    y: layout.offsetY + continueY * layout.scale,
    width: actionButtonWidth * layout.scale,
    height: continueHeight * layout.scale,
    canAfford: undoAvailable,
  });
  bounds.push({
    key: "continue",
    x: layout.offsetX + continueX2 * layout.scale,
    y: layout.offsetY + continueY * layout.scale,
    width: actionButtonWidth * layout.scale,
    height: continueHeight * layout.scale,
  });

  if (typeof window !== "undefined") {
    window.__churchUpgradeScreenButtons = { buttons: bounds };
  }

  ctx.restore();
}

  function drawLevelAnnouncements() {
    const {
      ctx,
      canvas,
      levelAnnouncements,
      HUD_HEIGHT,
      UI_FONT_FAMILY,
    } = requireBindings();
    if (typeof window !== "undefined") {
      window.__missionBriefActive = false;
      window.__missionBriefButtonBounds = null;
    }
    if (!levelAnnouncements.length) {
      return;
    }
  const { title, subtitle, timer, duration, requiresConfirm } = levelAnnouncements[0];
  const now = performance.now();
  const levelStatus = (typeof requireBindings === 'function') ? requireBindings().levelManager?.getStatus?.() : null;
  const lm = requireBindings().levelManager;
  const currentLevelStatus = lm?.getStatus ? lm.getStatus() : null;
    const ANNOUNCEMENT_FADE_DURATION = 1.5;
    const fadeDuration = Math.min(duration, ANNOUNCEMENT_FADE_DURATION);
    const fadeStart = Math.max(0, duration - fadeDuration);
    const alpha = timer > fadeStart
      ? 1
      : Math.max(0, Math.min(1, timer / Math.max(0.001, fadeDuration)));
    const yBase = getAnnouncementYBase(HUD_HEIGHT);
    ctx.save();
    ctx.textAlign = "center";
  // Make the announcement panel large enough for portraits and text;
  // size relative to canvas so it scales on smaller screens.
  const boxWidth = Math.min(canvas.width * 0.9, canvas.width - 80, 1100);
    const hasSubtitle = Boolean(subtitle);
  // Base height then we'll expand for portrait rows if needed
  let boxHeight = hasSubtitle ? 280 : 220;
  // Define maxPanelH before usage
  const maxPanelH = Math.min(canvas.height * 0.75, 720);
  boxHeight = Math.min(boxHeight, maxPanelH);
    const boxX = canvas.width / 2 - boxWidth / 2;
    const boxY = yBase - boxHeight / 2;
    const radius = 24;

    const drawRoundedPanel = () => {};

  // If this is a Battle-cleared announcement (post-battle), render a special animated tally
    // Only treat announcements whose title indicates a cleared battle (e.g., 'Battle 1 Cleared')
  const PORTRAIT_CAP = 24; // local cap used by renderer
  const titleStr = String(title || '').toLowerCase();
  // detect battle summary announcements (e.g., 'Battle 1 Cleared' or 'Level 1 — January Cleared')
  const isBattleSummary = (
    requiresConfirm
    && (titleStr.includes('cleared') || (titleStr.includes('horde') && titleStr.includes('cleared')))
  );
  // =============================
  // MISSION BRIEF POPUP SCREEN
  // =============================
  // This section draws the Mission Brief popup, which appears BEFORE the first battle of each month.
  // It shows the NPC names (congregation) and a scenario, e.g.:
  // "Jordan, Julia, Felix, Sue and Bobby need your help [scenario]."
  // This is NOT the tally/battle summary popup.
  // =============================
  const skipMissionBrief = Boolean(levelAnnouncements[0].skipMissionBrief);
  const hasAnnouncement = Boolean(levelAnnouncements && levelAnnouncements.length);
  const isBossMonthIntro = currentLevelStatus?.stage === "bossIntro" && hasAnnouncement;
  const isBossMissionBrief = Boolean(levelAnnouncements[0]?.bossMissionBrief);
  const congregationOverlayActive = Boolean(requireBindings().congregationOverlay?.active);
  if (!skipMissionBrief && !isBattleSummary && hasAnnouncement && (isBossMonthIntro || isBossMissionBrief)) {
    if (congregationOverlayActive) {
      ctx.restore();
      return;
    }
    const dialogVisible = Boolean(window.DialogOverlay?.isVisible?.());
    const missionActive = Boolean(missionBriefOverlayState.active);
    if (dialogVisible && !missionActive) {
      ctx.restore();
      return;
    }
    drawMissionBriefScreen(ctx, canvas, {
      title: "Boss Battle",
      subtitle: "Boss intro text goes here",
      showFormation: false,
      showButtons: true,
      uiFontFamily: UI_FONT_FAMILY,
    });
    ctx.restore();
    return;
  }
  if (!skipMissionBrief && !isBattleSummary && Array.isArray(window.npcs) && window.npcs.length) {
    if (congregationOverlayActive) {
      ctx.restore();
      return;
    }
    const npcNames = window.npcs.map(npc => npc.name).filter(Boolean);
    const dialogVisible = Boolean(window.DialogOverlay?.isVisible?.());
    const missionActive = Boolean(missionBriefOverlayState.active);
    if (dialogVisible && !missionActive) {
      ctx.restore();
      return;
    }
    if (npcNames.length) {
      if (!levelAnnouncements[0].missionBriefScenario) {
        levelAnnouncements[0].missionBriefScenario = missionBriefScenarios[Math.floor(Math.random() * missionBriefScenarios.length)];
      }
      const scenario = levelAnnouncements[0].missionBriefScenario;
      const scenarioTitle = formatScenarioForTitle(getScenarioTitle(scenario)) || "A Crisis";
      if (typeof window !== "undefined") {
        window.__lastMissionBriefScenario = scenario;
      }
      const monthName = currentLevelStatus?.month || (requireBindings().getMonthName ? requireBindings().getMonthName(currentLevelStatus?.level || 1) : null);
      let nameSentence = '';
      if (npcNames.length === 1) {
        nameSentence = npcNames[0];
      } else if (npcNames.length === 2) {
        nameSentence = npcNames.join(' and ');
      } else if (npcNames.length > 2) {
        nameSentence = npcNames.slice(0, -1).join(', ') + ' and ' + npcNames[npcNames.length - 1];
      }
      const announcement = levelAnnouncements[0] || null;
      const missionNumber = Number.isFinite(announcement?.missionNumber)
        ? announcement.missionNumber
        : null;
      const missionLabel =
        missionNumber
          ? `Battle ${missionNumber}`
          : (announcement && announcement.title) || monthName || "";
      const missionTitle = scenarioTitle
        ? `${missionLabel}: ${scenarioTitle}`
        : missionLabel;
      const needsVerb = npcNames.length === 1 ? "needs" : "need";
      const missionBrief = `${nameSentence} ${needsVerb} your guidance.`;
      if (window.UpgradeScreen?.isVisible?.()) {
        ctx.restore();
        return;
      }
      drawMissionBriefScreen(ctx, canvas, {
        title: missionTitle,
        subtitle: missionBrief,
        showFormation: true,
        uiFontFamily: UI_FONT_FAMILY,
      });
      ctx.restore();
      return;
    }
  }
  // Battle summary popups are handled by the dialog overlay (not canvas).
  const levelNumber = currentLevelStatus?.level || 1;
  let displayTitle = title;
  try {
    if (isBattleSummary) {
      const summaryRomanNumerals = { 1: 'I', 2: 'II', 3: 'III' };
      const clearedSuffix = /cleared/i.test(title) ? ' Cleared' : '';
      displayTitle = `Act ${summaryRomanNumerals[levelNumber] || levelNumber}${clearedSuffix}`;
    }
  } catch (e) {}
  const pastorDelayRemaining = levelAnnouncements[0]?.pastorPostRecapDelayRemaining || 0;
  const canRenderAnnouncement = !(levelAnnouncements[0]?.pastorPostRecap && pastorDelayRemaining > 0);
  const revealComplete = canRenderAnnouncement
    ? isAnnouncementRevealComplete(displayTitle || title || "", subtitle || "")
    : false;
  if (levelAnnouncements[0]) {
    levelAnnouncements[0]._revealComplete = revealComplete;
  }
  if (!canRenderAnnouncement) {
    ctx.restore();
    return;
  }
  if (isBattleSummary) {
    const recapData = levelAnnouncements?.[0]?.recapData || null;
    let summaryTitle = recapData?.title || levelAnnouncements?.[0]?.recapTitle || "";
    if (!summaryTitle) {
      const titleText = displayTitle || title || "";
      const match = titleText.match(/—\s*([^]+?)\s*Cleared/i);
      const monthLabel = match && match[1] ? match[1].trim() : "";
      summaryTitle = monthLabel ? `${monthLabel} Recap` : "Recap";
    }
    if (recapData) {
      drawRecapBonusScreen(ctx, canvas, {
        title: summaryTitle,
        recapData,
        uiFontFamily: UI_FONT_FAMILY,
        buttonKey: "recap",
      });
    } else {
      const summaryBody = levelAnnouncements?.[0]?.recapBody || "";
      drawMissionBriefScreen(ctx, canvas, {
        title: summaryTitle,
        subtitle: summaryBody,
        showFormation: false,
        uiFontFamily: UI_FONT_FAMILY,
        buttonKey: "recap",
        setMissionBriefActive: false,
      });
    }
    ctx.restore();
    return;
  }
  if (recapTallyState.id) {
    recapTallyState.id = null;
  }
    const isTownIntro = Boolean(levelAnnouncements[0]?.townIntro);
    const isExteriorShot = Boolean(levelAnnouncements[0]?.exteriorShot);
    const isPastorFinal = Boolean(levelAnnouncements[0]?.pastorFinal);
    const isPastorPostRecap = Boolean(levelAnnouncements[0]?.pastorPostRecap);
    const isPastorSpeech = isPastorFinal || isPastorPostRecap;
    if (isTownIntro || isExteriorShot || isPastorSpeech) {
      if (isExteriorShot) {
        const fireOverlay = requireBindings().fireOverlay;
        if (fireOverlay && typeof fireOverlay.draw === "function") {
          if (typeof fireOverlay.setBounds === "function") {
            fireOverlay.setBounds(0, 0, canvas.width, canvas.height);
          }
          fireOverlay.draw(ctx);
        }
      }
      const titleSize = isPastorSpeech
        ? Math.max(20, TEXT_STYLES.h2.size * 0.95)
        : Math.max(28, TEXT_STYLES.h1.size * 1.35);
      const buttonCount = isPastorSpeech ? 1 : 0;
      const layout = getAnnouncementScreenLayout(ctx, canvas, {
        title: displayTitle || "",
        subtitle: "",
        titleSize,
        subtitleSize: TEXT_STYLES.h2.size,
        lineGap: Math.round(TEXT_STYLES.h1.size * TEXT_STYLES.h1.lineHeight),
        weight: TEXT_STYLES.h1.weight,
        maxWidthScale: 0.92,
        position: "bottom",
        topMargin: 90,
        bottomMargin: 80,
        rowGap: 32,
        buttonHeight: isPastorSpeech ? 50 : 0,
        buttonCount,
        HUD_HEIGHT,
      });
      ctx.save();
      ctx.translate(layout.offsetX, layout.offsetY);
      ctx.scale(layout.scale, layout.scale);
      drawAnnouncementText(ctx, layout.virtualCanvas, {
        title: displayTitle || "",
        yBase: layout.titleY,
        alpha,
        typewriter: true,
        titleSize,
        weight: TEXT_STYLES.h1.weight,
        maxWidthScale: 0.92,
      });
      if (isPastorSpeech) {
        const buttonText = "Continue (Space)";
        const buttonWidth = Math.min(240, layout.virtualCanvas.width * 0.5);
        const buttonHeight = 50;
        const buttonX = layout.virtualCanvas.width / 2 - buttonWidth / 2;
        const buttonY = Math.round(layout.buttonY || 0);
        const buttonKey = isPastorFinal ? "pastorFinal" : "pastorPostRecap";
        if (typeof window !== "undefined") {
          window.__announcementButtons = {
            key: buttonKey,
            buttons: [
              {
                key: "continue",
                x: layout.offsetX + buttonX * layout.scale,
                y: layout.offsetY + buttonY * layout.scale,
                width: buttonWidth * layout.scale,
                height: buttonHeight * layout.scale,
              },
            ],
          };
        }
        ctx.fillStyle = "#9BD9FF";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
        ctx.lineWidth = 2;
        roundRect(ctx, buttonX, buttonY, buttonWidth, buttonHeight, 16, true, true);
        if (isAnnouncementButtonFocused(buttonKey, 0)) {
          drawFocusRing(ctx, buttonX - 3, buttonY - 3, buttonWidth + 6, buttonHeight + 6, 18);
        }
        ctx.fillStyle = "#0b111a";
        ctx.textAlign = "center";
        ctx.font = `18px ${UI_FONT_FAMILY}`;
        ctx.textBaseline = "alphabetic";
        ctx.fillText(buttonText, buttonX + buttonWidth / 2, buttonY + buttonHeight / 2 + 6);
      }
      ctx.restore();
    } else {
      const titleY = getAnnouncementTitleY(HUD_HEIGHT, boxHeight);
      drawAnnouncementText(ctx, canvas, {
        title: displayTitle || "",
        yBase: titleY,
        alpha,
        typewriter: true,
        titleSize: TEXT_STYLES.h2.size,
        weight: TEXT_STYLES.h2.weight,
      });
    }
    // Dev label hidden for announcements per request.
    // Subtitle display removed as requested.
    ctx.restore();
  }

  function drawBossHazards(context) {
    const { bossHazards } = requireBindings();
    bossHazards.forEach((hazard) => hazard.draw(context));
  }

  function drawSpawnPointDebug(ctx) {
    const { SHOW_ENEMY_SPAWN_DEBUG, getEnemySpawnPoints } = requireBindings();
    if (!SHOW_ENEMY_SPAWN_DEBUG) return;
    const points = getEnemySpawnPoints?.();
    if (!points || !points.length) return;
    // intentionally disabled – dev spawn markers removed per request
  }

  function getEnemyWeaponHitboxRect(enemy) {
    const weapon = enemy?.config?.weaponHitbox || null;
    if (!weapon) return null;
    const width = Number(weapon.width);
    const height = Number(weapon.height);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
    const hitbox = enemy?.config?.hitbox || null;
    const baseX = enemy.x + (hitbox && Number.isFinite(hitbox.offsetX) ? hitbox.offsetX : 0);
    const baseY = enemy.y + (hitbox && Number.isFinite(hitbox.offsetY) ? hitbox.offsetY : 0);
    const facingSign = enemy?.facing === "left" ? -1 : 1;
    const offsetX = Number.isFinite(weapon.offsetX) ? weapon.offsetX * facingSign : 0;
    const offsetY = Number.isFinite(weapon.offsetY) ? weapon.offsetY : 0;
    return {
      x: baseX + offsetX - width / 2,
      y: baseY + offsetY - height / 2,
      width,
      height,
    };
  }

  function drawEnemyWeaponHitboxDebugs(ctx, enemies, activeBoss) {
    const show =
      typeof window !== "undefined"
        ? window.BattlechurchShowAttackHitboxes === true ||
          window.BattlechurchHitboxDebug?.enemies === true
        : false;
    if (!show) return;
    ctx.save();
    ctx.strokeStyle = "rgba(255, 80, 80, 0.9)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    const drawForEnemy = (enemy) => {
      if (!enemy || enemy.dead || enemy.state !== "attack") return;
      const rect = getEnemyWeaponHitboxRect(enemy);
      if (!rect) return;
      ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    };
    if (Array.isArray(enemies)) {
      enemies.forEach(drawForEnemy);
    }
    if (activeBoss) drawForEnemy(activeBoss);
    ctx.restore();
  }

  function drawCombatHitboxDebugs(ctx, player, npcs, enemies, activeBoss, projectiles) {
    const hitboxDebug =
      typeof window !== "undefined" ? window.BattlechurchHitboxDebug || null : null;
    if (!hitboxDebug) return;
    const showPlayerMelee = hitboxDebug.playerMelee === true;
    const showNpcs = hitboxDebug.npcs === true;
    const showEnemies = hitboxDebug.enemies === true;
    const showProjectiles = hitboxDebug.projectiles === true;
    if (!showPlayerMelee && !showNpcs && !showEnemies && !showProjectiles) return;

    const bindings = requireBindings();
    const getEnemyHitboxRect = bindings.getEnemyHitboxRect;

    ctx.save();
    ctx.lineWidth = 2;

    if (showPlayerMelee && player) {
      ctx.save();
      ctx.strokeStyle = "rgba(80, 220, 255, 0.95)";
      ctx.setLineDash([]);
      const hitbox = player?.config?.hitbox || null;
      if (hitbox && Number.isFinite(hitbox.width) && Number.isFinite(hitbox.height)) {
        const facingSign = player?.facing === "left" ? -1 : 1;
        const offsetX = Number.isFinite(hitbox.offsetX) ? hitbox.offsetX * facingSign : 0;
        const offsetY = Number.isFinite(hitbox.offsetY) ? hitbox.offsetY : 0;
        ctx.strokeRect(
          player.x + offsetX - hitbox.width / 2,
          player.y + offsetY - hitbox.height / 2,
          hitbox.width,
          hitbox.height,
        );
      } else {
        ctx.beginPath();
        ctx.arc(player.x, player.y, Math.max(0, player.radius || 0), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (showNpcs && Array.isArray(npcs)) {
      ctx.save();
      ctx.strokeStyle = "rgba(95, 227, 192, 0.95)";
      ctx.setLineDash([5, 4]);
      npcs.forEach((npc) => {
        if (!npc || npc.departed) return;
        ctx.beginPath();
        ctx.arc(npc.x, npc.y, Math.max(0, npc.radius || 0), 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.restore();
    }

    if (showEnemies) {
      const drawEnemyBody = (enemy) => {
        if (!enemy || enemy.dead || enemy.state === "death") return;
        const rect = typeof getEnemyHitboxRect === "function" ? getEnemyHitboxRect(enemy) : null;
        if (rect) {
          ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
          return;
        }
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, Math.max(0, enemy.radius || enemy.config?.hitRadius || 0), 0, Math.PI * 2);
        ctx.stroke();
      };
      ctx.save();
      ctx.strokeStyle = "rgba(255, 110, 110, 0.95)";
      ctx.setLineDash([]);
      if (Array.isArray(enemies)) enemies.forEach(drawEnemyBody);
      if (activeBoss) drawEnemyBody(activeBoss);
      ctx.restore();
    }

    if (showProjectiles && Array.isArray(projectiles)) {
      projectiles.forEach((projectile) => {
        if (!projectile || projectile.dead) return;
        const radius = Math.max(2, Number(projectile.radius) || 0);
        if (!radius) return;
        let stroke = "rgba(255, 110, 110, 0.95)";
        if (projectile.friendly && projectile.source?.isCozyNpc) {
          stroke = "rgba(255, 200, 106, 0.95)";
        } else if (projectile.friendly) {
          stroke = "rgba(80, 220, 255, 0.95)";
        }
        ctx.save();
        ctx.strokeStyle = stroke;
        ctx.setLineDash(projectile.visualOnly ? [3, 3] : []);
        ctx.beginPath();
        ctx.arc(projectile.x, projectile.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });
    }

    ctx.restore();
  }

  // Homebase bounds debug: draws the NPC home area border so it can be tweaked.
  function drawNpcHomeBounds(ctx) {
    if (!requireBindings().devTools?.showNpcZones) return;
    if (typeof getNpcHomeBounds !== "function") return;
    const bounds = getNpcHomeBounds();
    if (!bounds) return;
    const bindings = requireBindings();
    const battleNpcs = Array.isArray(bindings?.npcs) ? bindings.npcs.filter(Boolean) : [];
    const zoneNpcs = battleNpcs
      .filter((npc) => npc?.formationAnchor)
      .sort(
        (a, b) =>
          (a?.formationAnchor?.zoneIndex ?? Number.MAX_SAFE_INTEGER) -
          (b?.formationAnchor?.zoneIndex ?? Number.MAX_SAFE_INTEGER),
      );
    const lowerArcStart = (210 * Math.PI) / 180;
    const lowerArcEnd = (-30 * Math.PI) / 180;
    const totalZones = Math.max(1, zoneNpcs.length || 5);
    const zoneStep = totalZones > 1 ? (lowerArcEnd - lowerArcStart) / (totalZones - 1) : 0;
    const outerRadius = bounds.radius;
    const innerRadius = Math.max(36, outerRadius * 0.42);
    const zoneColors = [
      "rgba(255, 120, 120, 0.11)",
      "rgba(255, 190, 110, 0.11)",
      "rgba(255, 235, 120, 0.11)",
      "rgba(120, 220, 160, 0.11)",
      "rgba(120, 190, 255, 0.11)",
      "rgba(190, 140, 255, 0.11)",
    ];
    ctx.save();
    ctx.lineJoin = "round";
    for (let i = 0; i < totalZones; i += 1) {
      const anchor = zoneNpcs[i]?.formationAnchor || null;
      const zoneIndex = Number.isFinite(anchor?.zoneIndex) ? anchor.zoneIndex : i;
      const centerAngle =
        Number.isFinite(anchor?.angle) ? anchor.angle : lowerArcStart + zoneStep * zoneIndex;
      const halfSpan =
        Number.isFinite(anchor?.zoneHalfSpan) ? anchor.zoneHalfSpan : Math.abs(zoneStep) * 0.5;
      const zoneStart = centerAngle - halfSpan;
      const zoneEnd = centerAngle + halfSpan;
      ctx.beginPath();
      ctx.moveTo(bounds.x + Math.cos(zoneStart) * innerRadius, bounds.y + Math.sin(zoneStart) * innerRadius);
      ctx.arc(bounds.x, bounds.y, outerRadius, zoneStart, zoneEnd);
      ctx.lineTo(bounds.x + Math.cos(zoneEnd) * innerRadius, bounds.y + Math.sin(zoneEnd) * innerRadius);
      ctx.arc(bounds.x, bounds.y, innerRadius, zoneEnd, zoneStart, true);
      ctx.closePath();
      ctx.fillStyle = zoneColors[i % zoneColors.length];
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(bounds.x + Math.cos(zoneStart) * innerRadius, bounds.y + Math.sin(zoneStart) * innerRadius);
      ctx.lineTo(bounds.x + Math.cos(zoneStart) * outerRadius, bounds.y + Math.sin(zoneStart) * outerRadius);
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (i === totalZones - 1) {
        ctx.beginPath();
        ctx.moveTo(bounds.x + Math.cos(zoneEnd) * innerRadius, bounds.y + Math.sin(zoneEnd) * innerRadius);
        ctx.lineTo(bounds.x + Math.cos(zoneEnd) * outerRadius, bounds.y + Math.sin(zoneEnd) * outerRadius);
        ctx.stroke();
      }

      const labelRadius = outerRadius - 26;
      const labelX = bounds.x + Math.cos(centerAngle) * labelRadius;
      const labelY = bounds.y + Math.sin(centerAngle) * labelRadius;
      ctx.fillStyle = "rgba(255,255,255,0.78)";
      ctx.font = `700 14px ${bindings?.UI_FONT_FAMILY || "sans-serif"}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(i + 1), labelX, labelY);
    }

    ctx.setLineDash([10, 8]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(120, 220, 255, 0.85)";
    ctx.beginPath();
    ctx.arc(bounds.x, bounds.y, outerRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = "rgba(255, 217, 120, 0.6)";
    ctx.beginPath();
    ctx.arc(bounds.x, bounds.y, innerRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawCoverImage(ctx, canvas, img, scale = 1, focusX = 0.5, focusY = 0.5) {
    if (!img) return;
    const baseScale = Math.max(canvas.width / img.width, canvas.height / img.height);
    const drawW = img.width * baseScale * scale;
    const drawH = img.height * baseScale * scale;
    const offsetX = canvas.width * focusX - drawW * focusX;
    const offsetY = canvas.height * focusY - drawH * focusY;
    ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
  }

  function drawBackground(effectiveCameraX, effectiveCameraY = 0) {
    const {
      ctx,
      canvas,
      assets,
      levelAnnouncements,
    } = requireBindings();
    if (Array.isArray(levelAnnouncements) && levelAnnouncements.length) {
      const current = levelAnnouncements[0];
      if (current && (current.townIntro || current.exteriorShot)) {
        // Determine which background to use based on current Order
        // Order 1 uses townIntro, Order 2 uses act2, Order 3 uses act3
        const orderNumber = current.upcomingOrderNumber || 1;
        let img = assets?.backgrounds?.townIntro;
        if (orderNumber === 2 && assets?.backgrounds?.act2) {
          img = assets.backgrounds.act2;
        } else if (orderNumber >= 3 && assets?.backgrounds?.act3) {
          img = assets.backgrounds.act3;
        }
        if (img) {
          ctx.save();
          drawCoverImage(ctx, canvas, img, 1, 0.5, 0.5);
          ctx.fillStyle = "rgba(8, 12, 20, 0.35)";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.restore();
          return;
        }
      }
    }
    const cameraX = resolveCameraX(effectiveCameraX);
    ctx.fillStyle = "#0b111a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Only draw mid and floor layers for congregation screen (no far-bg)
    const mid = assets?.backgroundLayers?.mid || null;
    if (mid) {
      ctx.save();
      ctx.translate(0, effectiveCameraY);
      const rawPan = Math.floor(cameraX * 0.45);
      const pan = ((rawPan % mid.width) + mid.width) % mid.width;
      const drawY = 0;
      ctx.drawImage(mid, -pan, drawY, mid.width, mid.height);
      ctx.drawImage(mid, -pan + mid.width, drawY, mid.width, mid.height);
      ctx.restore();
    }
    // Draw floor layer (matches battle screen)
    const floor = assets?.backgroundLayers?.floor || null;
    if (floor) {
      ctx.save();
      ctx.translate(0, effectiveCameraY);
      const rawFloorPan = Math.floor(cameraX * 0.7);
      const floorPan = ((rawFloorPan % floor.width) + floor.width) % floor.width;
      const drawY = canvas.height - floor.height;
      ctx.drawImage(floor, -floorPan, drawY, floor.width, floor.height);
      ctx.drawImage(floor, -floorPan + floor.width, drawY, floor.width, floor.height);
      ctx.restore();
    }
  }

  // Cached offscreen canvas for god rays
  const godRayCache = {
    canvas: null,
    screenWidth: 0,
    height: 0,
    floorHeight: 0,
    padding: 400, // Extra width for parallax movement
  };

  function buildGodRayCache(screenWidth, height, floorHeight) {
    const padding = godRayCache.padding;
    const cacheWidth = screenWidth + padding * 2;

    if (!godRayCache.canvas) {
      godRayCache.canvas = document.createElement("canvas");
    }
    godRayCache.canvas.width = cacheWidth;
    godRayCache.canvas.height = height;
    godRayCache.screenWidth = screenWidth;
    godRayCache.height = height;
    godRayCache.floorHeight = floorHeight;

    const offCtx = godRayCache.canvas.getContext("2d");
    offCtx.clearRect(0, 0, cacheWidth, height);

    const topY = -40;
    const baseBottomY = height - Math.max(60, floorHeight * 0.2);
    const rayWidth = 50;
    const baseSlant = 220;
    const rayGap = 60;
    const depthOffset = 104;
    const rayCount = 4;
    // Position rays relative to the padded canvas (right side + padding offset)
    const baseX = screenWidth + padding - 40;

    offCtx.globalCompositeOperation = "lighter";

    for (let i = 0; i < rayCount; i += 1) {
      // Bake slight per-ray variation into the cached texture
      const baseAlpha = 0.18 + i * 0.02;
      const topX = baseX + i * rayGap;
      const bottomX = topX - baseSlant;
      const bottomY = baseBottomY - (rayCount - 1 - i) * depthOffset;

      // Soft layers for feathered edges
      const layers = [
        { widthMult: 2.0, alphaMult: 0.15 },
        { widthMult: 1.5, alphaMult: 0.25 },
        { widthMult: 1.0, alphaMult: 0.6 },
      ];

      for (const layer of layers) {
        const layerWidth = rayWidth * layer.widthMult;
        const layerAlpha = baseAlpha * layer.alphaMult;
        const offsetX = (layerWidth - rayWidth) / 2;

        const gradient = offCtx.createLinearGradient(topX, topY, bottomX, bottomY);
        gradient.addColorStop(0, `rgba(255, 240, 200, ${layerAlpha.toFixed(3)})`);
        gradient.addColorStop(0.3, `rgba(255, 235, 180, ${(layerAlpha * 0.6).toFixed(3)})`);
        gradient.addColorStop(0.6, `rgba(255, 230, 160, ${(layerAlpha * 0.25).toFixed(3)})`);
        gradient.addColorStop(1, "rgba(255, 230, 160, 0)");
        offCtx.fillStyle = gradient;
        offCtx.beginPath();
        offCtx.moveTo(topX - offsetX, topY);
        offCtx.lineTo(topX - offsetX + layerWidth, topY);
        offCtx.lineTo(bottomX - offsetX + layerWidth, bottomY);
        offCtx.lineTo(bottomX - offsetX, bottomY);
        offCtx.closePath();
        offCtx.fill();
      }
    }
  }

  function drawArenaGodRays(ctx, canvas, floorHeight, cameraX = 0) {
    if (!ctx || !canvas) return;

    // Rebuild cache if canvas size or floor height changed
    if (
      godRayCache.screenWidth !== canvas.width ||
      godRayCache.height !== canvas.height ||
      godRayCache.floorHeight !== floorHeight
    ) {
      buildGodRayCache(canvas.width, canvas.height, floorHeight);
    }

    // Animate with organic breathing - layered waves create irregular pulses
    const time = typeof performance !== "undefined" ? performance.now() : Date.now();
    const wave1 = Math.sin(time * 0.0004);           // Base slow wave
    const wave2 = Math.sin(time * 0.00067) * 0.5;    // Medium wave, irrational ratio
    const wave3 = Math.sin(time * 0.00023) * 0.7;    // Very slow drift
    const wave4 = Math.sin(time * 0.0011) * 0.25;    // Faster flutter
    const combined = (wave1 + wave2 + wave3 + wave4) / 2.45;
    const breath = 0.55 + 0.4 * combined; // Range roughly 0.35 to 0.95
    const intensity = Math.min(1, breath * 1.35);

    // Floor band is in translated context (1:1 with camera), so match that
    const parallaxOffset = Math.floor(cameraX);
    const drawX = -godRayCache.padding - parallaxOffset;
    const mirroredDrawX = -godRayCache.padding + parallaxOffset;

    ctx.save();
    // Reset transform to screen space, then apply parallax offset
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = intensity;
    ctx.drawImage(godRayCache.canvas, drawX, 0);
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(godRayCache.canvas, mirroredDrawX, 0);
    ctx.restore();
  }

  function drawHudComboUnderlay(ctx, canvas, uiFontFamily, hudHeight) {
    if (typeof window === "undefined") return;
    const display = window.__hudComboDisplay;
    if (!display || typeof display !== "object") return;
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (display.expiresAt && now > display.expiresAt) {
      window.__hudComboDisplay = null;
      return;
    }
    const x = Number.isFinite(window.__comboTextFixedX)
      ? window.__comboTextFixedX
      : canvas.width * 0.5;
    const y = Number.isFinite(window.__comboTextFixedY)
      ? window.__comboTextFixedY
      : (hudHeight || 0) + 36;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = display.color || "#FFF2B8";
    ctx.font = `800 ${Math.round(display.fontSize || 32)}px ${uiFontFamily}`;
    ctx.fillText(display.labelText || "", x, y);
    ctx.restore();
  }

  function getCameraShakeOffset() {
    const {
      cameraShakeTimer,
      CAMERA_SHAKE_DURATION,
      cameraShakeMagnitude,
    } = requireBindings();
    if (cameraShakeTimer <= 0) return { x: 0, y: 0 };
    const progress = cameraShakeTimer / CAMERA_SHAKE_DURATION;
    const magnitude = cameraShakeMagnitude * progress;
    const angle = Math.random() * Math.PI * 2;
    return {
      x: Math.cos(angle) * magnitude,
      y: Math.sin(angle) * magnitude,
    };
  }

  function drawCongregationScene(levelStatus, options = {}) {
    const {
      ctx,
      canvas,
      UI_FONT_FAMILY,
      HUD_HEIGHT = 54,
      getMonthName,
      getCongregationSize,
      congregationMembers,
    } = requireBindings();
    const memberCount = Array.isArray(congregationMembers) ? congregationMembers.length : 0;
    const fullTitleText = "Welcome Pastor. We're pleased to meet you!";
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const stage = levelStatus?.stage || "";
    const introKey = `levelIntro-${levelStatus?.level || 1}-${levelStatus?.battle || 0}`;
    if (stage === "levelIntro" && congregationIntroState.lastStage !== "levelIntro") {
      congregationIntroState.active = true;
      congregationIntroState.key = introKey;
      congregationIntroState.startTime = now;
      congregationIntroState.resetCountReveal = true;
    }
    if (!congregationIntroState.active || congregationIntroState.key !== introKey) {
      congregationIntroState.active = true;
      congregationIntroState.key = introKey;
      congregationIntroState.startTime = now;
      congregationIntroState.resetCountReveal = true;
    }
    congregationIntroState.lastStage = stage;
    const introElapsed = Math.max(0, (now - (congregationIntroState.startTime || now)) / 1000);
    const typewriterDelay = 2.0;
    const typewriterReady = introElapsed >= typewriterDelay;
    const titleText = typewriterReady ? fullTitleText : "";
    const titleSize = TEXT_STYLES.h1.size;
    const lineGap = Math.round(TEXT_STYLES.h1.size * TEXT_STYLES.h1.lineHeight);
    const layout = getAnnouncementScreenLayout(ctx, canvas, {
      title: titleText,
      subtitle: "",
      titleSize,
      subtitleSize: TEXT_STYLES.h2.size,
      lineGap,
      weight: TEXT_STYLES.h1.weight,
      maxWidthScale: 1,
      position: "top",
      topMargin: 70,
      bottomMargin: 90,
      rowGap: 36,
      buttonHeight: 52,
      buttonCount: 1,
      HUD_HEIGHT,
    });
    const drawInstructionButtons = () => {
      const leftItems = [
        {
          key: "WASD",
          action: "MOVE",
          isActive: (pressed) => ["w", "a", "s", "d"].some((k) => pressed?.has?.(k)),
        },
      ];
      const rightItems = [
        { key: "LEFT ARROW", action: "SWORD", isActive: (pressed) => pressed?.has?.("ArrowLeft") },
        { key: "DOWN ARROW", action: "DASH", isActive: (pressed) => pressed?.has?.("ArrowDown") },
        { key: "RIGHT ARROW", action: "PRAYER BOMB", isActive: (pressed) => pressed?.has?.("ArrowRight") },
      ];
      const buttonGap = 12;
      const buttonHeight = 34;
      const keyHeight = 22;
      const startY = 28;
      const sidePadding = 80;
      const pressedKeys = typeof window !== "undefined" ? window.Input?.keysPressed : null;

      const measureButton = (item) => {
        ctx.font = `700 11px ${UI_FONT_FAMILY}`;
        const keyWidth = Math.max(70, Math.ceil(ctx.measureText(item.key).width) + 16);
        ctx.font = `600 12px ${UI_FONT_FAMILY}`;
        const actionWidth = Math.ceil(ctx.measureText(item.action).width);
        const buttonWidth = keyWidth + actionWidth + 30;
        return { keyWidth, actionWidth, buttonWidth };
      };

      const drawGroup = (items, startX) => {
        let cursorX = startX;
        for (const item of items) {
          const { keyWidth, buttonWidth } = measureButton(item);
          const active = typeof item.isActive === "function" ? item.isActive(pressedKeys) : false;

          ctx.globalAlpha = 0.95;
          ctx.fillStyle = active ? "rgba(155, 217, 255, 0.28)" : "rgba(10, 15, 31, 0.65)";
          ctx.strokeStyle = active ? "rgba(255, 200, 106, 0.9)" : "rgba(155, 217, 255, 0.45)";
          ctx.lineWidth = 1.5;
          ctx.shadowColor = active ? "rgba(255, 200, 106, 0.35)" : "rgba(0, 0, 0, 0)";
          ctx.shadowBlur = active ? 8 : 0;
          roundRect(ctx, cursorX, startY, buttonWidth, buttonHeight, 12, true, true);

          const keyX = cursorX + 10;
          const keyY = startY + (buttonHeight - keyHeight) / 2;
          ctx.shadowBlur = 0;
          ctx.fillStyle = active ? "rgba(255, 255, 255, 0.22)" : "rgba(255, 255, 255, 0.12)";
          ctx.strokeStyle = active ? "rgba(255, 255, 255, 0.35)" : "rgba(255, 255, 255, 0.2)";
          ctx.lineWidth = 1;
          roundRect(ctx, keyX, keyY, keyWidth, keyHeight, 8, true, true);

          ctx.fillStyle = active ? "#FFFFFF" : "#EAF6FF";
          ctx.font = `700 11px ${UI_FONT_FAMILY}`;
          ctx.fillText(item.key, keyX + 8, startY + buttonHeight / 2 + 0.5);

          ctx.fillStyle = active ? "#FFE2A3" : "#FFC86A";
          ctx.font = `600 12px ${UI_FONT_FAMILY}`;
          ctx.fillText(item.action, keyX + keyWidth + 10, startY + buttonHeight / 2 + 0.5);

          cursorX += buttonWidth + buttonGap;
        }
      };

      ctx.save();
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      const leftStartX = sidePadding;
      const rightGroupWidth = rightItems.reduce((sum, item, index) => {
        const { buttonWidth } = measureButton(item);
        return sum + buttonWidth + (index ? buttonGap : 0);
      }, 0);
      const rightStartX = Math.max(sidePadding, layout.virtualCanvas.width - sidePadding - rightGroupWidth);
      drawGroup(leftItems, leftStartX);
      drawGroup(rightItems, rightStartX);
      ctx.restore();
    };
    ctx.save();
    ctx.translate(layout.offsetX, layout.offsetY);
    ctx.scale(layout.scale, layout.scale);
    drawAnnouncementText(ctx, layout.virtualCanvas, {
      title: titleText,
      yBase: layout.titleY,
      titleSize,
      weight: TEXT_STYLES.h1.weight,
      lineGap,
      alpha: 1,
      typewriter: typewriterReady,
      maxWidthScale: 1,
    });
    const countValue = typeof getCongregationSize === "function" ? getCongregationSize() : 0;
    const wordSize = Math.min(canvas.width * 0.14, canvas.height * 0.16, 140);
    const numberSize = Math.min(canvas.width * 0.28, canvas.height * 0.32, 220);
    const countCenterX = layout.virtualCanvas.width / 2;
    const countCenterY = layout.titleY + Math.round(wordSize * 1.6);
    const countKey = `congregation-count-${Math.round(countValue || 0)}`;
    if (congregationIntroState.resetCountReveal) {
      announcementReveal.delete(countKey);
      congregationIntroState.resetCountReveal = false;
    }
    let entry = announcementReveal.get(countKey);
    if (!entry) {
      entry = {
        phase: 0,
        timer: 0,
        lastTime: now,
        sfxPhase: -1,
      };
      announcementReveal.set(countKey, entry);
    }
    const dt = Math.max(0, (now - (entry.lastTime || now)) / 1000);
    entry.lastTime = now;
    if (!typewriterReady) {
      entry.timer = 0;
      entry.phase = 0;
    } else {
      entry.timer += dt;
    }
    if (entry.phase === 0) {
      if (typewriterReady && isAnnouncementRevealComplete(fullTitleText, "", "")) {
        entry.phase = 1;
        entry.timer = 0;
      }
    } else if (entry.phase === 1 && entry.timer >= 1.0) {
      entry.phase = 2;
      entry.timer = 0;
    } else if (entry.phase === 2 && entry.timer >= 0.4) {
      entry.phase = 3;
      entry.timer = 0;
    } else if (entry.phase === 3 && entry.timer >= 0.4) {
      entry.phase = 4;
    }
    if (entry.phase > 0 && entry.phase !== entry.sfxPhase) {
      entry.sfxPhase = entry.phase;
      if (typeof window !== "undefined" && typeof window.playCongregationCountPopSfx === "function") {
        window.playCongregationCountPopSfx(0.6);
      }
    }
    const countVisibleSeconds = typewriterReady ? Math.max(0, introElapsed - typewriterDelay) : 0;
    const countFadeDelay = 5;
    const countFadeDuration = 1.2;
    const countFadeAlpha = countVisibleSeconds <= countFadeDelay
      ? 1
      : Math.max(0, 1 - (countVisibleSeconds - countFadeDelay) / countFadeDuration);
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#FFFFFF";
    ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;
    const congregationText = (typeof GameText !== 'undefined' && GameText.congregation) || {};
    ctx.globalAlpha *= countFadeAlpha;
    if (entry.phase >= 2) {
      ctx.font = `900 ${Math.round(wordSize)}px ${UI_FONT_FAMILY}`;
      ctx.fillText(congregationText.title || "CONGREGATION", countCenterX, countCenterY);
    }
    if (entry.phase >= 3) {
      ctx.font = `900 ${Math.round(wordSize)}px ${UI_FONT_FAMILY}`;
      if (entry.phase >= 4) {
        const countLabel = congregationText.count || "COUNT";
        const countTextStr = `${countLabel}: ${Math.max(0, Math.round(countValue || 0))}`;
        ctx.fillText(countTextStr, countCenterX, countCenterY + wordSize * 1.05);
      } else {
        ctx.fillText(congregationText.countLabel || "COUNT:", countCenterX, countCenterY + wordSize * 1.05);
      }
    }
    ctx.restore();
    // Instruction buttons hidden for now; reserved for practice/tutorial screen.
    if (SHOW_TEXT_SOURCE_LABELS) {
      drawDevLabel(ctx, "DEV: CongregationScreen", canvas.width / 2, layout.titleY - 32, 1, UI_FONT_FAMILY);
    }
    void memberCount;

    const buttonText = "Play (Space)";
    const buttonWidth = Math.min(260, layout.virtualCanvas.width * 0.6);
    const buttonHeight = 52;
    const buttonX = layout.virtualCanvas.width / 2 - buttonWidth / 2;
    const buttonTopY = getAnnouncementScreenTopY({
      canvasHeight: layout.virtualCanvas.height,
      HUD_HEIGHT,
      blockHeight: buttonHeight,
      position: "bottom",
      topMargin: 90,
      bottomMargin: 90,
    });
    const buttonY = Math.round(buttonTopY);
    if (typeof window !== "undefined") {
      window.__congregationPlayButtonBounds = {
        x: layout.offsetX + buttonX * layout.scale,
        y: layout.offsetY + buttonY * layout.scale,
        width: buttonWidth * layout.scale,
        height: buttonHeight * layout.scale,
      };
      window.__announcementButtons = {
        key: "congregation",
        buttons: [
          {
            key: "play",
            x: layout.offsetX + buttonX * layout.scale,
            y: layout.offsetY + buttonY * layout.scale,
            width: buttonWidth * layout.scale,
            height: buttonHeight * layout.scale,
          },
        ],
      };
    }
    ctx.fillStyle = "#9BD9FF";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 2;
    roundRect(ctx, buttonX, buttonY, buttonWidth, buttonHeight, 16, true, true);
    if (isAnnouncementButtonFocused("congregation", 0)) {
      drawFocusRing(ctx, buttonX - 3, buttonY - 3, buttonWidth + 6, buttonHeight + 6, 18);
      drawButtonReflection(ctx, buttonX, buttonY, buttonWidth, buttonHeight, 16, 0.45);
    }
    ctx.fillStyle = "#0b111a";
    ctx.textAlign = "center";
    ctx.font = `18px ${UI_FONT_FAMILY}`;
    ctx.textBaseline = "alphabetic";
    const mainTextY = buttonY + buttonHeight / 2 + 6;
    ctx.fillText(buttonText, layout.virtualCanvas.width / 2, mainTextY);
    ctx.font = `10px ${UI_FONT_FAMILY}`;
    ctx.fillStyle = "rgba(11, 17, 26, 0.7)";
    ctx.textBaseline = "alphabetic";
    ctx.restore();

    ctx.restore();
  }

  function drawVisitorActors(visitorState) {
    const {
      ctx,
    } = requireBindings();
    if (!visitorState) return;
    const guests = Array.isArray(visitorState.visitors) ? visitorState.visitors : [];
    const blockers = Array.isArray(visitorState.blockers) ? visitorState.blockers : [];
    blockers.forEach((actor) => {
      if (!actor?.animator) return;
      actor.animator.draw(ctx, actor.x, actor.y);
    });
    guests.forEach((actor) => {
      if (!actor?.animator) return;
      drawVisitorGlow(actor);
      const flash = actor.highlightTimer ? Math.max(0, Math.min(1, actor.highlightTimer / 0.4)) : 0;
      actor.animator.draw(ctx, actor.x, actor.y, { flashWhite: flash });
      if (!actor.saved) {
        drawVisitorFaithBar(actor);
      }
    });
  }

  function drawVisitorGlow(actor) {
    const {
      ctx,
    } = requireBindings();
    if (!actor) return;
    if (actor.saved) return;
    const baseRadius = (actor.radius || 28) * 1.6;
    const pulse = (Math.sin(performance.now() * 0.024 + actor.x * 0.015) + 1) / 2;
    const alpha = 0.5 + 0.35 * pulse;
    const gradient = ctx.createRadialGradient(actor.x, actor.y, 8, actor.x, actor.y, baseRadius);
    gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    gradient.addColorStop(0.35, "rgba(255, 250, 220, 0.95)");
    gradient.addColorStop(0.7, "rgba(255, 240, 180, 0.35)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(actor.x, actor.y, baseRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawVisitorFaithBar(actor) {
    const {
      ctx,
    } = requireBindings();
    if (!actor || typeof actor.maxFaith !== "number") return;
    const ratio = actor.maxFaith > 0 ? Math.max(0, Math.min(1, actor.faith / actor.maxFaith)) : 0;
    const width = 82;
    const height = 10;
    const barX = actor.x - width / 2;
    const barY = actor.y - (actor.radius || 28) - 18;
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    ctx.fillRect(barX, barY, width, height);
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    ctx.strokeRect(barX + 0.5, barY + 0.5, width - 1, height - 1);
    ctx.fillStyle = actor.saved ? "#FFC86A" : "#5FE3C0";
    ctx.fillRect(barX + 2, barY + 2, (width - 4) * ratio, height - 4);
    ctx.restore();
  }

  function drawVisitorOverlay(visitorState) {
    if (!visitorState) return;
    const {
      ctx,
      canvas,
      UI_FONT_FAMILY,
      getCongregationSize,
    } = requireBindings();
    const centerX = canvas.width / 2;
    const panelWidth = Math.min(canvas.width * 0.4, 460);
    const panelHeight = 64;
    const panelX = centerX - panelWidth / 2;
    const panelY = 12;
    ctx.save();
    ctx.fillStyle = "rgba(8, 12, 22, 0.75)";
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
    ctx.strokeStyle = "rgba(255, 222, 142, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
    ctx.textAlign = "center";
    ctx.fillStyle = "#FFC86A";
    ctx.font = `22px ${UI_FONT_FAMILY}`;
    const visitationTitle = (typeof GameText !== 'undefined' && GameText.visitation?.title) || "Visitation Hour";
    ctx.fillText(visitationTitle, centerX, panelY + 24);
    const remaining = Math.max(0, visitorState.timer || 0);
    const minutes = Math.floor(remaining / 60);
    const seconds = Math.floor(remaining % 60);
    const timerText = `${minutes}:${seconds.toString().padStart(2, "0")}`;
    const congregationTotal = typeof getCongregationSize === "function" ? getCongregationSize() : null;
    const savedText = `Visitors: ${visitorState.savedVisitors || 0}/${visitorState.targetVisitors || 0}`;
    const calmText = `Members Calmed: ${visitorState.quietedBlockers || 0}`;
    ctx.font = `14px ${UI_FONT_FAMILY}`;
    ctx.fillStyle = "#EAF6FF";
    const statusLine = [
      `Timer ${timerText}`,
      savedText,
      calmText,
      typeof congregationTotal === "number" ? `Congregation ${congregationTotal}` : null,
    ]
      .filter(Boolean)
      .join("   •   ");
    ctx.fillText(statusLine, centerX, panelY + panelHeight - 12);
    ctx.restore();

    if (!visitorState.summaryActive) {
      const remainingSeconds = Math.ceil(visitorState.timer || 0);
      if (remainingSeconds > 0) {
        ctx.save();
        ctx.globalAlpha = 0.32;
        ctx.fillStyle = "#EAF6FF";
        const fontSize = Math.min(canvas.width, canvas.height) * 0.45;
        ctx.font = `${fontSize}px ${UI_FONT_FAMILY}`;
        ctx.textAlign = "center";
        ctx.fillText(String(remainingSeconds), canvas.width / 2, canvas.height / 2 + fontSize * 0.35);
        ctx.restore();
      }
    } else {
      const overlayPadding = 40;
      ctx.save();
      ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
      ctx.fillRect(overlayPadding, overlayPadding, canvas.width - overlayPadding * 2, canvas.height - overlayPadding * 2);
      ctx.strokeStyle = "rgba(255, 222, 142, 0.4)";
      ctx.lineWidth = 2;
      ctx.strokeRect(overlayPadding, overlayPadding, canvas.width - overlayPadding * 2, canvas.height - overlayPadding * 2);
      ctx.textAlign = "center";
      ctx.fillStyle = "#FFC86A";
      ctx.font = `46px ${UI_FONT_FAMILY}`;
      const timesUpText = (typeof GameText !== 'undefined' && GameText.visitation?.timesUp) || "Time's Up! Welcome new members!";
      ctx.fillText(timesUpText, centerX, HUD_HEIGHT + 140);
      const portraits = Array.isArray(visitorState.newMemberPortraits) ? visitorState.newMemberPortraits : [];
      const portraitNames = Array.isArray(visitorState.newMemberNames) ? visitorState.newMemberNames : [];
      const portraitSize = 96;
      const portraitSpacing = 20;
      const maxPerRow = Math.max(1, Math.floor((canvas.width - overlayPadding * 2 - 80) / (portraitSize + portraitSpacing)));
      if (portraits.length) {
        const rows = Math.ceil(portraits.length / maxPerRow);
        const startY = HUD_HEIGHT + 200;
        for (let row = 0; row < rows; row += 1) {
          const cols = Math.min(maxPerRow, portraits.length - row * maxPerRow);
          const rowWidth = cols * portraitSize + (cols - 1) * portraitSpacing;
          let startX = canvas.width / 2 - rowWidth / 2;
          for (let col = 0; col < cols; col += 1) {
            const index = row * maxPerRow + col;
            const portrait = portraits[index];
            const name = portraitNames[index] || "";
            if (!portrait) continue;
            ctx.save();
            ctx.beginPath();
            ctx.rect(startX, startY + row * (portraitSize + portraitSpacing), portraitSize, portraitSize);
            ctx.clip();
            ctx.drawImage(portrait, startX, startY + row * (portraitSize + portraitSpacing), portraitSize, portraitSize);
            ctx.restore();
            ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
            ctx.strokeRect(startX, startY + row * (portraitSize + portraitSpacing), portraitSize, portraitSize);
            // Draw name tag above portrait
            if (name) {
              ctx.save();
              ctx.font = `14px ${UI_FONT_FAMILY}`;
              ctx.textAlign = "center";
              ctx.globalAlpha = 0.6;
              ctx.fillStyle = "#fff";
              ctx.fillText(name, startX + portraitSize / 2, startY + row * (portraitSize + portraitSpacing) - 10);
              ctx.restore();
            }
            startX += portraitSize + portraitSpacing;
          }
        }
      } else {
        ctx.font = `24px ${UI_FONT_FAMILY}`;
        ctx.fillStyle = "#EAF6FF";
        const noMembersText = (typeof GameText !== 'undefined' && GameText.visitation?.noNewMembers) || "No new members this round.";
        ctx.fillText(noMembersText, centerX, HUD_HEIGHT + 220);
      }
      ctx.restore();
    }
  }

  function drawGraceRushOverlay(levelStatus, rushState) {
    return;
  }

  function getCombatMeterPalette() {
    const colors =
      (typeof UIStyles !== "undefined" && UIStyles.colors) || {};
    return {
      bg: colors.deepNavy || "#0A0F1F",
      frame: colors.slate || "#233152",
      sword: colors.gold || "#FFC86A",
      swordGlow: colors.softWhite || "#EAF6FF",
      dash: colors.ice || "#9BD9FF",
      dashGlow: colors.teal || "#5FE3C0",
      prayer: colors.softWhite || "#EAF6FF",
      prayerGlow: colors.gold || "#FFC86A",
    };
  }

  function drawCompactWorldMeter(x, y, width, height, ratio, fillColor, glowColor) {
    const { ctx } = requireBindings();
    const palette = getCombatMeterPalette();
    const clamped = Math.max(0, Math.min(1, ratio));
    const fillWidth = Math.max(0, (width - 4) * clamped);
    const radius = Math.max(3, Math.floor(height / 2));

    ctx.save();
    ctx.fillStyle = "rgba(10, 15, 31, 0.82)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
    ctx.lineWidth = 1.5;
    roundRect(ctx, x, y, width, height, radius, true, true);

    ctx.save();
    ctx.beginPath();
    roundRect(ctx, x + 2, y + 2, Math.max(0, width - 4), Math.max(0, height - 4), Math.max(2, radius - 2), false, false);
    ctx.clip();

    if (fillWidth > 0) {
      const gradient = ctx.createLinearGradient(x, y, x + width, y);
      gradient.addColorStop(0, fillColor);
      gradient.addColorStop(1, glowColor);
      ctx.fillStyle = gradient;
      ctx.fillRect(x + 2, y + 2, fillWidth, Math.max(1, height - 4));

      ctx.globalAlpha = 0.4;
      ctx.fillStyle = glowColor;
      ctx.fillRect(x + 2, y + 2, fillWidth, Math.max(1, (height - 4) * 0.4));
    }
    ctx.restore();

    ctx.strokeStyle = palette.frame;
    ctx.lineWidth = 1;
    roundRect(ctx, x, y, width, height, radius, false, true);
    ctx.restore();
  }

  function drawCompactReadyDot(centerX, centerY, size, tintColor, glowColor) {
    const { ctx } = requireBindings();
    const pulse = 0.88 + Math.sin(Date.now() / 140) * 0.12;
    const drawSize = size * pulse;

    ctx.save();
    ctx.globalAlpha = 0.28 + (pulse - 0.88) * 0.9;
    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.arc(centerX, centerY, drawSize * 0.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.95;
    ctx.fillStyle = "rgba(10, 15, 31, 0.9)";
    ctx.beginPath();
    ctx.arc(centerX, centerY, drawSize * 0.52, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = tintColor;
    ctx.lineWidth = Math.max(1.5, size * 0.08);
    ctx.beginPath();
    ctx.arc(centerX, centerY, drawSize * 0.52, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 0.98;
    ctx.fillStyle = tintColor;
    ctx.beginPath();
    ctx.arc(centerX, centerY, drawSize * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function getPlayerSpriteExtents(player) {
    const clip = player?.animator?.currentClip || null;
    const animatorScale =
      typeof player?.animator?.scale === "number" && player.animator.scale > 0
        ? player.animator.scale
        : 1;
    const clipScale =
      Number.isFinite(clip?.renderScale) && clip.renderScale > 0
        ? clip.renderScale
        : 1;
    const spriteScale = animatorScale * clipScale;
    const spriteWidth = Math.max(player?.radius * 2 || 0, (clip?.frameWidth || 0) * spriteScale);
    const spriteHeight = Math.max(player?.radius * 2 || 0, (clip?.frameHeight || 0) * spriteScale);
    return {
      width: spriteWidth,
      height: spriteHeight,
      top: player.y - spriteHeight * 0.5,
      bottom: player.y + spriteHeight * 0.5,
    };
  }

  function getPlayerCombatMeterAnchorX(player) {
    if (!player) return 0;
    const hitbox = player?.config?.hitbox || null;
    if (!hitbox || !Number.isFinite(hitbox.width)) {
      return player.x;
    }
    const facingSign = player?.facing === "left" ? -1 : 1;
    const offsetX = Number.isFinite(hitbox.offsetX) ? hitbox.offsetX * facingSign : 0;
    return player.x + offsetX;
  }

  function drawPlayerWeaponMeter(player) {
    const { ctx, WORLD_SCALE = 1, meleeAttackState } = requireBindings();
    if (!ctx || !player || !meleeAttackState || player.state === "death") return;
    if (!meleeAttackState.isCharging || !meleeAttackState.buttonDown) return;
    const holdTime = Math.max(0.001, meleeAttackState.holdTime || 0);
    const chargeRatio = Math.max(0, Math.min(1, (meleeAttackState.chargeTimer || 0) / holdTime));
    const shakeX = sharedShakeOffset?.x || 0;
    const sprite = getPlayerSpriteExtents(player);
    const meterCenterX = getPlayerCombatMeterAnchorX(player) + shakeX;
    const width = Math.round(34 * WORLD_SCALE);
    const height = Math.max(11, Math.round(14 * WORLD_SCALE));
    const meterX = meterCenterX - width / 2;
    const meterY = sprite.top - height - Math.round(8 * WORLD_SCALE);
    const palette = getCombatMeterPalette();
    if (chargeRatio >= 1) {
      const dotSize = Math.max(height + 4 * WORLD_SCALE, 14 * WORLD_SCALE);
      drawCompactReadyDot(
        meterCenterX,
        meterY + height * 0.5,
        dotSize,
        palette.sword,
        palette.swordGlow,
      );
      return;
    }
    drawCompactWorldMeter(meterX, meterY, width, height, chargeRatio, palette.sword, palette.swordGlow);
  }

  function drawCongregationCommandMeter(player, battleNpcs = []) {
    const { ctx, WORLD_SCALE = 1 } = requireBindings();
    if (!ctx || !player || player.state === "death") return;
    const getRatio =
      typeof player.getCongregationCommandChargeRatio === "function"
        ? player.getCongregationCommandChargeRatio.bind(player)
        : null;
    if (!getRatio) return;
    const activeNpcs = battleNpcs.filter((npc) => npc && !npc.departed && npc.active);
    if (!activeNpcs.length) return;
    const chargeRatio = Math.max(0, Math.min(1, getRatio()));
    const shakeX = sharedShakeOffset?.x || 0;
    const width = Math.round(28 * WORLD_SCALE);
    const height = Math.max(9, Math.round(12 * WORLD_SCALE));
    const palette = getCombatMeterPalette();
    if (chargeRatio < 1) return;
    activeNpcs.forEach((npc) => {
      if (!npc || npc.departed || !npc.active) return;
      const radius = Math.max(18, npc.radius || 0);
      const meterCenterX = (npc.x || 0) + shakeX;
      const meterY = (npc.y || 0) - radius - height - Math.round(26 * WORLD_SCALE);
      const dotSize = Math.max(height + 4 * WORLD_SCALE, 12 * WORLD_SCALE);
      drawCompactReadyDot(
        meterCenterX,
        meterY + height * 0.5,
        dotSize,
        palette.prayer,
        palette.prayerGlow,
      );
    });
  }

  function drawPlayerRingFireChargeMeter(player) {
    const { ctx, WORLD_SCALE = 1, meleeAttackState } = requireBindings();
    if (!ctx || !player || !meleeAttackState || player.state === "death") return;
    if (!meleeAttackState.spinCharging || !meleeAttackState.spinButtonDown) return;
    const holdTime = Math.max(0.001, meleeAttackState.spinHoldTime || 0);
    const chargeRatio = Math.max(0, Math.min(1, (meleeAttackState.spinChargeTimer || 0) / holdTime));
    const shakeX = sharedShakeOffset?.x || 0;
    const sprite = getPlayerSpriteExtents(player);
    const meterCenterX = getPlayerCombatMeterAnchorX(player) + shakeX;
    const width = Math.round(34 * WORLD_SCALE);
    const height = Math.max(11, Math.round(14 * WORLD_SCALE));
    const meterX = meterCenterX - width / 2;
    const stackOffset = Math.round((height + 6) * WORLD_SCALE);
    const meterY = sprite.top - height - Math.round(8 * WORLD_SCALE) - stackOffset;
    const palette = getCombatMeterPalette();
    if (chargeRatio >= 1) {
      const dotSize = Math.max(height + 4 * WORLD_SCALE, 14 * WORLD_SCALE);
      drawCompactReadyDot(
        meterCenterX,
        meterY + height * 0.5,
        dotSize,
        palette.dash,
        palette.dashGlow,
      );
      return;
    }
    drawCompactWorldMeter(meterX, meterY, width, height, chargeRatio, palette.dash, palette.dashGlow);
  }

  function drawPlayerExtendMeter(player) {
    const { ctx, WORLD_SCALE = 1, playerDashState, DASH_COOLDOWN = 0 } = requireBindings();
    if (!ctx || !player || !playerDashState || player.state === "death") return;
    const dashCooldown = Math.max(0, playerDashState.dashCooldown || 0);
    const shakeX = sharedShakeOffset?.x || 0;
    const sprite = getPlayerSpriteExtents(player);
    const meterCenterX = getPlayerCombatMeterAnchorX(player) + shakeX;
    const width = Math.round(32 * WORLD_SCALE);
    const height = Math.max(10, Math.round(13 * WORLD_SCALE));
    const meterX = meterCenterX - width / 2;
    const meterY = sprite.bottom + Math.round(8 * WORLD_SCALE);
    const palette = getCombatMeterPalette();
    if (dashCooldown <= 0 || DASH_COOLDOWN <= 0) {
      const dotSize = Math.max(height + 4 * WORLD_SCALE, 14 * WORLD_SCALE);
      drawCompactReadyDot(
        meterCenterX,
        meterY + height * 0.5,
        dotSize,
        palette.dash,
        palette.dashGlow,
      );
      return;
    }
    const rechargeRatio = Math.max(0, Math.min(1, 1 - dashCooldown / DASH_COOLDOWN));
    drawCompactWorldMeter(meterX, meterY, width, height, rechargeRatio, palette.dash, palette.dashGlow);
  }

  function drawRingOfFireArc(ctx, centerX, centerY, radius, progress = 1, baseAlpha = 1, startAngle = -Math.PI * 0.5, direction = 1) {
    const { assets } = requireBindings();
    const fireFrames = assets?.projectiles?.fire?.frames || null;
    if (!fireFrames || !fireFrames.length || progress <= 0) return;
    const clamped = Math.max(0, Math.min(1, progress));
    const circumference = Math.PI * 2 * radius * clamped;
    const segmentCount = Math.max(8, Math.round(circumference / 22));
    const frameNow = typeof performance !== "undefined" ? performance.now() : Date.now();
    const frameIndex = Math.floor(frameNow / 70) % fireFrames.length;
    const frame = fireFrames[frameIndex];
    const size = Math.max(18, radius * 0.16);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < segmentCount; i += 1) {
      const t = segmentCount <= 1 ? 1 : i / (segmentCount - 1);
      const angle = startAngle + direction * t * Math.PI * 2 * clamped;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + Math.PI * 0.5);
      ctx.globalAlpha = baseAlpha * (0.65 + 0.25 * Math.sin(frameNow * 0.008 + i * 0.7));
      ctx.drawImage(frame, -size * 0.5, -size * 0.5, size, size);
      ctx.restore();
    }
    ctx.restore();
  }

  function drawRingOfFireDebugCircle(ctx, centerX, centerY, radius, band = 20, progress = 1, alpha = 1, startAngle = -Math.PI * 0.5, direction = 1) {
    if (!ctx || radius <= 0 || progress <= 0) return;
    const clamped = Math.max(0, Math.min(1, progress));
    const endAngle = startAngle + direction * Math.PI * 2 * clamped;
    const anticlockwise = direction < 0;
    ctx.save();
    ctx.globalAlpha = 0.18 * alpha;
    ctx.strokeStyle = "#FFB347";
    ctx.lineWidth = Math.max(2, band);
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle, anticlockwise);
    ctx.stroke();
    ctx.globalAlpha = 0.75 * alpha;
    ctx.strokeStyle = "#FFE7A1";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle, anticlockwise);
    ctx.stroke();
    ctx.restore();
  }

  function drawRingOfFireEffects(player) {
    const { ctx, meleeAttackState, ringOfFireHazards = [] } = requireBindings();
    if (!ctx) return;
    if (meleeAttackState?.ringFireActive) {
      const activeProgress =
        meleeAttackState.ringFirePhase === "trace"
          ? Math.max(0.08, meleeAttackState.ringFireTraceProgress || 0)
          : 1;
      const traceDirection = meleeAttackState.ringFireDirection || 1;
      drawRingOfFireDebugCircle(
        ctx,
        meleeAttackState.ringFireCenterX,
        meleeAttackState.ringFireCenterY,
        meleeAttackState.ringFireRadius,
        18,
        activeProgress,
        1,
        meleeAttackState.ringFireStartAngle ?? -Math.PI * 0.5,
        traceDirection,
      );
      drawRingOfFireArc(
        ctx,
        meleeAttackState.ringFireCenterX,
        meleeAttackState.ringFireCenterY,
        meleeAttackState.ringFireRadius,
        activeProgress,
        0.9,
        meleeAttackState.ringFireStartAngle ?? -Math.PI * 0.5,
        traceDirection,
      );
    }
    ringOfFireHazards.forEach((hazard) => {
      if (!hazard || !hazard.life || hazard.life <= 0) return;
      const fade = Math.max(0, Math.min(1, hazard.life / Math.max(0.001, hazard.duration || hazard.life)));
      const blinkAlpha = Math.max(0.08, Math.min(1, hazard.blinkAlpha ?? 1));
      drawRingOfFireDebugCircle(
        ctx,
        hazard.x,
        hazard.y,
        hazard.radius,
        hazard.band || 20,
        1,
        (0.45 + fade * 0.55) * blinkAlpha,
      );
      drawRingOfFireArc(ctx, hazard.x, hazard.y, hazard.radius, 1, (0.35 + fade * 0.45) * blinkAlpha);
    });
  }

  function drawVisitorIntroOverlay() {
    return;
  }

  function drawBriefingScene(levelStatus) {
    if (window.DialogOverlay?.isVisible?.()) return;
    const { ctx, canvas, UI_FONT_FAMILY, HUD_HEIGHT } = requireBindings();
    ctx.save();
    drawBackground();
  // Removed dark translucent overlay for Mission Brief popup

    ctx.textAlign = 'center';
    ctx.fillStyle = '#EAF6FF';
    ctx.font = `44px ${UI_FONT_FAMILY}`;
    const howToPlayTitle = (typeof GameText !== 'undefined' && GameText.screens?.howToPlay?.title) || 'How to Play';
    ctx.fillText(howToPlayTitle, canvas.width / 2, HUD_HEIGHT + 60);

    ctx.font = `18px ${UI_FONT_FAMILY}`;
    ctx.fillStyle = '#EAF6FF';
    const lines = [
      'Move with WASD, aim with arrow keys or mouse.',
      'Use Prayer Bombs to clear enemies, collect coins to heal NPCs.',
      'Protect the congregation and survive the waves.',
    ];
    let y = HUD_HEIGHT + 110;
    lines.forEach((l) => {
      ctx.fillText(l, canvas.width / 2, y);
      y += 28;
    });

    ctx.restore();
  }

  function drawHowToPlayScene() {
    if (window.DialogOverlay?.isVisible?.()) return;
    const { ctx, canvas, UI_FONT_FAMILY, HUD_HEIGHT } = requireBindings();
    ctx.save();
    drawBackground();
    // Slightly darker overlay than briefing to indicate a separate screen
    ctx.fillStyle = 'rgba(4,8,14,0.82)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#EAF6FF';
    ctx.font = `48px ${UI_FONT_FAMILY}`;
    const howToPlayTitle2 = (typeof GameText !== 'undefined' && GameText.screens?.howToPlay?.title) || 'How to play';
    ctx.fillText(howToPlayTitle2, canvas.width / 2, HUD_HEIGHT + 66);

    ctx.font = `18px ${UI_FONT_FAMILY}`;
    ctx.fillStyle = '#EAF6FF';
    const lines = [
      'Move with WASD or the virtual stick.',
      'Aim with mouse or right stick; press Space to start.',
      'Use Prayer Bombs to clear enemies and protect NPCs.',
    ];
    let y = HUD_HEIGHT + 120;
    lines.forEach((l) => {
      ctx.fillText(l, canvas.width / 2, y);
      y += 30;
    });

    ctx.restore();
  }

  function drawReticle() {
    const { ctx, pointerState } = requireBindings();
    ctx.save();
    ctx.translate(pointerState.x, pointerState.y);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-18, 0);
    ctx.lineTo(-6, 0);
    ctx.moveTo(6, 0);
    ctx.lineTo(18, 0);
    ctx.moveTo(0, -18);
    ctx.lineTo(0, -6);
    ctx.moveTo(0, 6);
    ctx.lineTo(0, 18);
    ctx.stroke();
    ctx.restore();
  }

  function drawCountdownOverlay() {
    const {
      ctx,
      canvas,
      UI_FONT_FAMILY,
      getStartCountdownLabel,
    } = requireBindings();
    const label = getStartCountdownLabel?.();
    if (!label) return;
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = "center";
    ctx.fillStyle = label === "FIGHT!" ? "#FFC86A" : "#EAF6FF";
    const fontSize = label === "FIGHT!" ? 64 : 72;
    ctx.font = `${fontSize}px ${UI_FONT_FAMILY}`;
    ctx.fillText(label, canvas.width / 2, canvas.height / 2);
    ctx.restore();
  }

  function drawPauseOverlay() {
    const {
      ctx,
      canvas,
      UI_FONT_FAMILY,
      HUD_HEIGHT = 54,
      pauseRestartConfirmActive,
      pointerState,
    } = requireBindings();
    if (window.DialogOverlay?.isVisible()) return;
    ctx.save();
    ctx.fillStyle = "rgba(4, 7, 14, 0.78)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const titleText = "Paused";
    const subtitleText = "Take a breather. Resume when you're ready.";
    const titleSize = TEXT_STYLES.h1.size;
    const isDenseBody = titleText === "Controls" || titleText === "Story";
    const subtitleSize = isDenseBody
      ? TEXT_STYLES.body.size
      : Math.round(TEXT_STYLES.h2.size * 0.85);
    const subtitleWeight = isDenseBody ? TEXT_STYLES.body.weight : TEXT_STYLES.h2.weight;
    const lineGap = Math.round(TEXT_STYLES.h1.size * TEXT_STYLES.h1.lineHeight);
    const layout = getAnnouncementScreenLayout(ctx, canvas, {
      title: titleText,
      subtitle: subtitleText,
      titleSize,
      subtitleSize,
      lineGap,
      weight: TEXT_STYLES.h1.weight,
      maxWidthScale: 0.9,
      position: "center",
      topMargin: 90,
      bottomMargin: 90,
      rowGap: 32,
      buttonHeight: 64,
      buttonCount: 4,
      HUD_HEIGHT,
    });
    ctx.save();
    ctx.translate(layout.offsetX, layout.offsetY);
    ctx.scale(layout.scale, layout.scale);
    drawAnnouncementText(ctx, layout.virtualCanvas, {
      title: titleText,
      subtitle: subtitleText,
      yBase: layout.titleY,
      alpha: 1,
      titleSize,
      subtitleSize,
      weight: TEXT_STYLES.h1.weight,
      subtitleWeight: TEXT_STYLES.h2.weight,
      lineGap,
      typewriter: false,
      maxWidthScale: 0.9,
    });

    const buttonConfigs = [
      { key: "resume", label: "Resume" },
      { key: "map", label: "Return to Map" },
      { key: "settings", label: "Settings" },
      { key: "developer", label: "Developer" },
    ];
    const buttonWidth = 240;
    const buttonHeight = 64;
    const buttonGap = 28;
    const rowWidth = buttonWidth * buttonConfigs.length + buttonGap * (buttonConfigs.length - 1);
    const startX = Math.round(layout.virtualCanvas.width / 2 - rowWidth / 2);
    const buttonY = Math.round(layout.buttonY || 0);
    const bounds = [];
    buttonConfigs.forEach((config, index) => {
      const x = startX + index * (buttonWidth + buttonGap);
      ctx.save();
      ctx.fillStyle = "#9BD9FF";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 2;
      roundRect(ctx, x, buttonY, buttonWidth, buttonHeight, 16, true, true);
      if (isAnnouncementButtonFocused("pause", index)) {
        drawFocusRing(ctx, x - 3, buttonY - 3, buttonWidth + 6, buttonHeight + 6, 18);
        drawButtonReflection(ctx, x, buttonY, buttonWidth, buttonHeight, 16, 0.45);
      }
      ctx.fillStyle = "#0b111a";
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.font = `600 22px ${UI_FONT_FAMILY}`;
      ctx.fillText(config.label, x + buttonWidth / 2, buttonY + 42);
      ctx.restore();
      bounds.push({
        key: config.key,
        x: layout.offsetX + x * layout.scale,
        y: layout.offsetY + buttonY * layout.scale,
        width: buttonWidth * layout.scale,
        height: buttonHeight * layout.scale,
      });
    });
    if (typeof window !== "undefined") {
      window.__announcementButtons = { key: "pause", buttons: bounds };
      if (pointerState && typeof pointerState.x === "number" && typeof pointerState.y === "number") {
        const hoverIndex = bounds.findIndex(
          (btn) =>
            pointerState.x >= btn.x &&
            pointerState.x <= btn.x + btn.width &&
            pointerState.y >= btn.y &&
            pointerState.y <= btn.y + btn.height,
        );
        if (hoverIndex >= 0) {
          window.__announcementFocus = { key: "pause", index: hoverIndex };
        }
      }
    }

    ctx.restore();
    ctx.restore();
  }

  function drawAimAssistOverlay() {
    const { ctx, aimState, aimAssist } = requireBindings();
    if (aimState.usingPointer) return;

    if (aimAssist.vertices) {
      const { origin, left, right } = aimAssist.vertices;
      ctx.save();
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.lineWidth = 2;

      const fadeStroke = (endPoint) => {
        const gradient = ctx.createLinearGradient(origin.x, origin.y, endPoint.x, endPoint.y);
        gradient.addColorStop(0, "rgba(255, 225, 150, 0.22)");
        gradient.addColorStop(1, "rgba(255, 225, 150, 0)");
        ctx.strokeStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(origin.x, origin.y);
        ctx.lineTo(endPoint.x, endPoint.y);
        ctx.stroke();
      };

      fadeStroke(left);
      fadeStroke(right);
      ctx.restore();
    }

    if (!aimAssist.target) return;
    ctx.save();
    ctx.strokeStyle = "rgba(255, 200, 40, 0.8)";
    ctx.lineWidth = 3;
    const target = aimAssist.target;
    const baseRadius =
      aimAssist.targetKind === "npc"
        ? target.radius || 20
        : target.config?.hitRadius || target.radius || 24;
    const circleRadius = Math.max(14, baseRadius * 0.65);
    const verticalOffset = baseRadius * 0.85;
    ctx.beginPath();
    ctx.arc(target.x, target.y + verticalOffset, circleRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function wrapText(context, text, maxWidth) {
    if (!context || !text) return [];
    const words = String(text)
      .split(/\s+/)
      .filter(Boolean);
    const lines = [];
    let line = "";
    words.forEach((word) => {
      const testLine = line ? `${line} ${word}` : word;
      const { width } = context.measureText(testLine);
      if (width > maxWidth) {
        if (line) lines.push(line);
        line = word;
      } else {
        line = testLine;
      }
    });
    if (line) lines.push(line);
    return lines;
  }

  function roundRect(ctx, x, y, width, height, radius, fill = true, stroke = true) {
    let r = radius;
    if (typeof r === "number") {
      r = { tl: r, tr: r, br: r, bl: r };
    }
    const maxRadius = Math.max(0, Math.min(Math.abs(width) / 2, Math.abs(height) / 2));
    r = {
      tl: Math.max(0, Math.min(maxRadius, r?.tl ?? 0)),
      tr: Math.max(0, Math.min(maxRadius, r?.tr ?? 0)),
      br: Math.max(0, Math.min(maxRadius, r?.br ?? 0)),
      bl: Math.max(0, Math.min(maxRadius, r?.bl ?? 0)),
    };
    ctx.beginPath();
    ctx.moveTo(x + r.tl, y);
    ctx.lineTo(x + width - r.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r.tr);
    ctx.lineTo(x + width, y + height - r.br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r.br, y + height);
    ctx.lineTo(x + r.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r.bl);
    ctx.lineTo(x, y + r.tl);
    ctx.quadraticCurveTo(x, y, x + r.tl, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  function drawButtonReflection(ctx, x, y, width, height, radius, alpha = 0.95) {
    ctx.save();
    let r = radius;
    if (typeof r === "number") r = { tl: r, tr: r, br: r, bl: r };
    ctx.beginPath();
    ctx.moveTo(x + r.tl, y);
    ctx.lineTo(x + width - r.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r.tr);
    ctx.lineTo(x + width, y + height - r.br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r.br, y + height);
    ctx.lineTo(x + r.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r.bl);
    ctx.lineTo(x, y + r.tl);
    ctx.quadraticCurveTo(x, y, x + r.tl, y);
    ctx.closePath();
    ctx.clip();
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const t = ((now * 0.001 * 0.45) % 1);
    const sweepWidth = Math.max(50, width * 0.7);
    const sweepX = x - sweepWidth + (width + sweepWidth * 2) * t;
    const sweepGradient = ctx.createLinearGradient(sweepX, y, sweepX + sweepWidth, y + height);
    sweepGradient.addColorStop(0, "rgba(255, 255, 255, 0)");
    sweepGradient.addColorStop(0.4, `rgba(255, 255, 255, ${1 * alpha})`);
    sweepGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = sweepGradient;
    ctx.fillRect(x, y, width, height);

    const t2 = ((now * 0.001 * 0.9 + 0.35) % 1);
    const sweepWidth2 = Math.max(34, width * 0.35);
    const sweepX2 = x - sweepWidth2 + (width + sweepWidth2 * 2) * t2;
    const sweepGradient2 = ctx.createLinearGradient(sweepX2, y, sweepX2 + sweepWidth2, y + height);
    sweepGradient2.addColorStop(0, "rgba(255, 255, 255, 0)");
    sweepGradient2.addColorStop(0.5, `rgba(255, 255, 255, ${0.75 * alpha})`);
    sweepGradient2.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = sweepGradient2;
    ctx.fillRect(x, y, width, height);
    ctx.restore();
  }

  function drawFocusRing(ctx, x, y, width, height, radius, color = "#FFC86A") {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const pulse = (Math.sin(now * 0.01) + 1) / 2;
    const glowAlpha = 0.65 + 0.35 * pulse;
    const glowBlur = 26 + 18 * pulse;
    ctx.save();
    ctx.fillStyle = `rgba(255, 200, 106, ${0.18 + 0.18 * pulse})`;
    roundRect(ctx, x - 4, y - 4, width + 8, height + 8, radius + 4, true, false);
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.shadowColor = `rgba(255, 200, 106, ${glowAlpha})`;
    ctx.shadowBlur = glowBlur;
    roundRect(ctx, x, y, width, height, radius, false, true);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = `rgba(255, 200, 106, ${0.85 + 0.15 * pulse})`;
    ctx.lineWidth = 3;
    const inset = 3;
    roundRect(
      ctx,
      x + inset,
      y + inset,
      width - inset * 2,
      height - inset * 2,
      Math.max(0, radius - inset),
      false,
      true
    );
    ctx.restore();
  }

  const enemyHpLabels = [];
  const npcFaithOverlays = [];
  let showEnemyDevLabels = false;
  let showCannonSplashRadius = true;
  if (typeof window !== "undefined") {
    window.__battlechurchEnemyHpLabels = enemyHpLabels;
    window.__battlechurchNpcFaithOverlays = npcFaithOverlays;
    window.__battlechurchShowEnemyDevLabels = showEnemyDevLabels;
    window.setEnemyDevLabelsVisible = (value) => {
      showEnemyDevLabels = Boolean(value);
      window.__battlechurchShowEnemyDevLabels = showEnemyDevLabels;
    };
    window.setCannonSplashRadiusVisible = (value) => {
      showCannonSplashRadius = Boolean(value);
    };
  }
  let sharedShakeOffset = { x: 0, y: 0 };
  const congregationFadeState = {
    active: false,
    memberCount: 0,
    token: 0,
  };
  const congregationIntroState = {
    active: false,
    key: null,
    startTime: 0,
    lastStage: null,
    resetCountReveal: false,
  };

  function drawHUD() {
    // Hide HUD when congregation intro screen is showing ("Welcome Pastor")
    const bindings = requireBindings();
    const levelStatus = bindings.levelManager?.getStatus?.();
    if (levelStatus?.stage === "levelIntro") return;
    window.BattlechurchHUD?.draw?.(bindings, sharedShakeOffset, roundRect);
    // Mission label moved to HUD column 1.
  }

  function drawMissionBriefInArena() {
    const {
      ctx,
      canvas,
      UI_FONT_FAMILY,
      levelManager,
    } = requireBindings();
    const levelStatus = levelManager?.getStatus ? levelManager.getStatus() : null;
    const nowMs = typeof performance !== "undefined" ? performance.now() : Date.now();
    updateWaveClearWipe(levelStatus, nowMs, levelAnnouncements);
    if (!levelStatus) return;
    const stage = levelStatus.stage || "";
    const waveNumber = Math.max(1, levelStatus.wave || 1);
    const waveNum = levelStatus.waveNum;
    const hordeNum = levelStatus.hordeNum;
    const missionNumber = levelStatus.missionNum || 1;
    const crumbRomanNumerals = { 1: 'I', 2: 'II', 3: 'III' };
    const actLabel = `Act ${crumbRomanNumerals[levelStatus.actNum || 1] || (levelStatus.actNum || 1)}`;
    // Get town name from activeTownId
    const activeTownId = typeof window !== "undefined" ? window.activeTownId : null;
    const mapData = typeof window !== "undefined" ? window.BattlechurchMapData : null;
    const townData = activeTownId && mapData?.towns
      ? mapData.towns.find((t) => t.id === activeTownId)
      : null;
    const townName = townData?.name || "Unknown Town";
    const crumbParts = [townName, actLabel];
    if (stage === "bossIntro") {
      crumbParts.push("Boss Intro");
    } else if (stage === "bossActive") {
      crumbParts.push("Boss Battle");
    } else if (stage === "graceRush") {
      crumbParts.push("Grace Abounds");
    } else if (stage === "levelIntro") {
      crumbParts.push("Battle Intro");
    } else if (stage === "briefing") {
      crumbParts.push("Briefing");
    } else if (stage === "npcArrival") {
      crumbParts.push("Congregation");
    } else if (waveNum != null && hordeNum != null) {
      crumbParts.push(`Battle ${missionNumber}`, `Wave ${waveNum}`, `Horde ${hordeNum}`);
    } else {
      crumbParts.push(`Battle ${missionNumber}`, `Horde ${waveNumber}`);
    }
    const breadcrumb = crumbParts.join(" / ");
    const detailText = "";

    ctx.save();
    ctx.font = `12px ${UI_FONT_FAMILY}`;
    ctx.fillStyle = "rgba(230, 238, 255, 0.92)";
    ctx.textAlign = "left";
    const marginX = 16;
    const marginY = canvas.height - 24;
    ctx.fillText(breadcrumb, marginX, marginY);
    if (SHOW_TEXT_SOURCE_LABELS) {
      ctx.font = `11px ${UI_FONT_FAMILY}`;
      ctx.fillStyle = "rgba(170, 198, 224, 0.92)";
      ctx.fillText("DEV: ArenaBreadcrumb", marginX, marginY - 12);
    }
    if (detailText) {
      ctx.font = `11px ${UI_FONT_FAMILY}`;
      ctx.fillStyle = "rgba(210, 222, 242, 0.9)";
      const lines = detailText.split("\n");
      lines.forEach((line, idx) => {
        ctx.fillText(line, marginX, marginY + 16 + idx * 14);
      });
    }
    ctx.restore();
  }

  function drawPauseHint() {
    // Intentionally left blank to avoid showing developer hints in the HUD.
  }

  function drawStartPrompt() {
    const { ctx, canvas, UI_FONT_FAMILY } = requireBindings();
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  function drawChapterBreakScreen() {
    const {
      ctx,
      canvas,
      chapterBreakImage,
      chapterBreakActNumber,
      actBreakFadeAlpha,
      UI_FONT_FAMILY,
    } = requireBindings();

    console.log("drawChapterBreakScreen called - actNumber:", chapterBreakActNumber, "fadeAlpha:", actBreakFadeAlpha, "hasImage:", !!chapterBreakImage);

    // Draw background image
    if (chapterBreakImage) {
      ctx.save();
      ctx.drawImage(chapterBreakImage, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    } else {
      // Fallback: dark background
      ctx.save();
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    // Define text based on act number - use centralized text if available
    const actTitles = (typeof GameText !== 'undefined' && GameText.battleActs) || {
      1: "Act I: Establish a Foothold",
      2: "Act II: Repel the Counter Attack",
      3: "Act III: Liberate the Town",
    };
    const actVillainText = (typeof GameText !== 'undefined' && GameText.actVillainText) || {
      1: "Win 3 battles to get established",
      2: "Win 3 counter-attack battles",
      3: "Win 3 battles deep in the heart of the town",
    };
    const romanNumerals = { 1: 'I', 2: 'II', 3: 'III' };
    const activeTownId = typeof window !== "undefined" ? window.activeTownId : null;
    const mapData = typeof window !== "undefined" ? window.BattlechurchMapData : null;
    const townData = activeTownId && mapData?.towns
      ? mapData.towns.find((t) => t.id === activeTownId)
      : null;
    const townName = townData?.name || "this town";
    const battleTitle =
      actTitles[chapterBreakActNumber] || `Act ${romanNumerals[chapterBreakActNumber] || chapterBreakActNumber}`;
    let villainText = actVillainText[chapterBreakActNumber] || "";
    if (chapterBreakActNumber === 1) {
      villainText = `Win 3 battles to secure a foothold in ${townName}.`;
    }

    const centerX = canvas.width / 2;

    const titleSize = Math.max(20, TEXT_STYLES.h1.size * 0.85);
    const layout = getAnnouncementScreenLayout(ctx, canvas, {
      title: villainText,
      subtitle: "",
      titleSize,
      subtitleSize: TEXT_STYLES.h2.size,
      lineGap: Math.round(TEXT_STYLES.h1.size * TEXT_STYLES.h1.lineHeight),
      weight: TEXT_STYLES.h1.weight,
      maxWidthScale: 0.92,
      position: "center",
      topMargin: 90,
      bottomMargin: 80,
      rowGap: 32,
      buttonHeight: 50,
      buttonCount: 1,
      HUD_HEIGHT,
    });
    const chapterTitleSize = 64;
    const chapterTitleLineHeight = Math.round(chapterTitleSize * TEXT_STYLES.h1.lineHeight);
    const titleBodyGap = 28;
    const combinedTextHeight =
      chapterTitleLineHeight + titleBodyGap + layout.textLayout.textBlockHeight;
    const textBlockTopY = Math.max(
      90,
      Math.round((layout.virtualCanvas.height - combinedTextHeight) / 2),
    );
    const titleY = textBlockTopY + Math.round(chapterTitleLineHeight / 2);
    const bodyYBase = textBlockTopY + chapterTitleLineHeight + titleBodyGap + layout.textLayout.titleLineHeight;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold ${chapterTitleSize}px ${UI_FONT_FAMILY}`;
    ctx.fillStyle = "#FFFFFF";
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
    ctx.fillText(battleTitle, centerX, titleY);
    ctx.restore();

    ctx.save();
    ctx.translate(layout.offsetX, layout.offsetY);
    ctx.scale(layout.scale, layout.scale);
    drawAnnouncementText(ctx, layout.virtualCanvas, {
      title: villainText,
      yBase: bodyYBase,
      alpha: 1,
      typewriter: true,
      titleSize,
      weight: TEXT_STYLES.h1.weight,
      maxWidthScale: 0.92,
    });
    ctx.restore();

    ctx.save();
    const buttonText = "Play (Space)";
    const buttonWidth = Math.min(240, layout.virtualCanvas.width * 0.5);
    const buttonHeight = 50;
    const buttonX = layout.virtualCanvas.width / 2 - buttonWidth / 2;
    const buttonY = Math.round(layout.buttonY || 0);
    if (typeof window !== "undefined") {
      window.__announcementButtons = {
        key: "chapterBreak",
        buttons: [
          {
            key: "play",
            x: layout.offsetX + buttonX * layout.scale,
            y: layout.offsetY + buttonY * layout.scale,
            width: buttonWidth * layout.scale,
            height: buttonHeight * layout.scale,
          },
        ],
      };
    }
    ctx.translate(layout.offsetX, layout.offsetY);
    ctx.scale(layout.scale, layout.scale);
    ctx.fillStyle = "#9BD9FF";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 2;
    roundRect(ctx, buttonX, buttonY, buttonWidth, buttonHeight, 16, true, true);
    if (isAnnouncementButtonFocused("chapterBreak", 0)) {
      drawFocusRing(ctx, buttonX - 3, buttonY - 3, buttonWidth + 6, buttonHeight + 6, 18);
    }
    ctx.fillStyle = "#0b111a";
    ctx.textAlign = "center";
    ctx.font = `18px ${UI_FONT_FAMILY}`;
    ctx.textBaseline = "alphabetic";
    ctx.fillText(buttonText, buttonX + buttonWidth / 2, buttonY + buttonHeight / 2 + 6);
    ctx.restore();
  }

  function drawTitleScreen() {
    const {
      ctx,
      canvas,
      UI_FONT_FAMILY,
      devInspectorActive,
      drawDevInspector,
      assets,
      HUD_HEIGHT,
      assetsLoaded,
      mapReady,
    } = requireBindings();
    ctx.save();
    const titleImage = assets?.titleBackground || null;
    if (titleImage) {
      const stripHeight = 14;
      const time = (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000;
      const amp = 0.9;
      const focusX = 0.5;
      const focusY = 0.5;
      const baseScale = Math.max(canvas.width / titleImage.width, canvas.height / titleImage.height);
      const drawW = titleImage.width * baseScale;
      const drawH = titleImage.height * baseScale;
      const offsetX = canvas.width * focusX - drawW * focusX;
      const offsetY = canvas.height * focusY - drawH * focusY;
      const scaleX = drawW / titleImage.width;
      const scaleY = drawH / titleImage.height;
      for (let y = 0; y < titleImage.height; y += stripHeight) {
        const wave = Math.sin(time * 2 + y * 0.15) + Math.sin(time * 1.2 + y * 0.05);
        const offset = wave * amp;
        const srcH = Math.min(stripHeight, titleImage.height - y);
        const destY = offsetY + y * scaleY;
        const destH = srcH * scaleY;
        ctx.drawImage(
          titleImage,
          0,
          y,
          titleImage.width,
          srcH,
          offsetX + offset,
          destY,
          drawW,
          destH,
        );
      }
    } else {
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, "#070a16");
      gradient.addColorStop(1, "#121b33");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    const fireOverlay = requireBindings().fireOverlay;
    if (fireOverlay && typeof fireOverlay.draw === "function") {
      if (typeof fireOverlay.setBounds === "function") {
        fireOverlay.setBounds(0, 0, canvas.width, canvas.height);
      }
      if (typeof fireOverlay.setIntensity === "function") {
        fireOverlay.setIntensity(1.9);
      }
      if (typeof fireOverlay.setSizeScale === "function") {
        fireOverlay.setSizeScale(0.7);
      }
      fireOverlay.draw(ctx);
    }

    if (typeof window !== "undefined") {
      const bestScoreValue = Number.isFinite(window.bestScore) ? window.bestScore : null;
      const bestText = `Best: ${bestScoreValue == null ? "--" : Math.round(bestScoreValue)}`;
      const uidText = window.cloudUid ? `UID: ${window.cloudUid}` : "UID: --";
      const emailText =
        window.cloudAuthProvider === "google" && window.cloudEmail
          ? window.cloudEmail
          : null;
      const debugScale = Math.min(1, canvas.width / 1280);
      ctx.save();
      ctx.textAlign = "right";
      ctx.textBaseline = "top";
      ctx.font = `600 ${Math.round(18 * debugScale)}px ${UI_FONT_FAMILY}`;
      ctx.fillStyle = "#EAF6FF";
      ctx.shadowColor = "rgba(6, 10, 18, 0.9)";
      ctx.shadowBlur = 10;
      let lineY = 14;
      if (emailText) {
        ctx.font = `500 ${Math.round(14 * debugScale)}px ${UI_FONT_FAMILY}`;
        ctx.fillStyle = "rgba(234, 246, 255, 0.85)";
        ctx.fillText(emailText, canvas.width - 28, lineY);
        lineY += Math.round(18 * debugScale);
        ctx.font = `600 ${Math.round(18 * debugScale)}px ${UI_FONT_FAMILY}`;
        ctx.fillStyle = "#EAF6FF";
      }
      ctx.fillText(bestText, canvas.width - 28, lineY + 8);
      ctx.font = `500 ${Math.round(14 * debugScale)}px ${UI_FONT_FAMILY}`;
      ctx.fillStyle = "rgba(234, 246, 255, 0.8)";
      ctx.fillText(uidText, canvas.width - 28, lineY + 30);
      ctx.restore();
    }

    const titleText = "";
    const subtitleText = "";
    const titleSize = TEXT_STYLES.h1.size;
    const subtitleSize = TEXT_STYLES.h2.size;
    const lineGap = Math.round(TEXT_STYLES.h1.size * TEXT_STYLES.h1.lineHeight);
    // Show Loading while loading, Map when map-ready but gameplay loading, Play when fully ready
    const authLabel =
      typeof window !== "undefined" && window.cloudAuthProvider === "google"
        ? "Sign Out"
        : "Sign in with Google";
    let buttonConfigs;
    if (assetsLoaded) {
      // Fully loaded - show Play button
      buttonConfigs = [
        { key: "play", label: "Play" },
        { key: "settings", label: "Settings" },
        { key: "developer", label: "Developer" },
        { key: "auth", label: authLabel },
      ];
    } else if (mapReady) {
      // Map ready but gameplay still loading - allow map browsing
      buttonConfigs = [
        { key: "map", label: "Map" },
        { key: "settings", label: "Settings" },
        { key: "developer", label: "Developer" },
        { key: "auth", label: authLabel },
      ];
    } else {
      // Still loading title/map assets
      buttonConfigs = [
        { key: "play", label: "Loading..." },
        { key: "settings", label: "Settings" },
        { key: "developer", label: "Developer" },
        { key: "auth", label: authLabel },
      ];
    }
    const layout = getAnnouncementScreenLayout(ctx, canvas, {
      title: titleText,
      subtitle: subtitleText,
      titleSize,
      subtitleSize,
      lineGap,
      weight: TEXT_STYLES.h1.weight,
      maxWidthScale: 0.98,
      position: "bottom",
      topMargin: 90,
      bottomMargin: 70,
      rowGap: 40,
      buttonHeight: 64,
      buttonCount: buttonConfigs.length,
      HUD_HEIGHT: HUD_HEIGHT || 54,
    });
    ctx.save();
    ctx.translate(layout.offsetX, layout.offsetY);
    ctx.scale(layout.scale, layout.scale);
    // Title screen shows only background art and buttons.
    const buttonWidth = Math.min(240, Math.floor(layout.virtualCanvas.width / buttonConfigs.length) - 24);
    const buttonHeight = 64;
    const buttonGap = 28;
    const rowWidth = buttonWidth * buttonConfigs.length + buttonGap * (buttonConfigs.length - 1);
    const startX = Math.round(layout.virtualCanvas.width / 2 - rowWidth / 2);
    const buttonY = Math.round(layout.buttonY || 0);
    const bounds = [];
    const { loadingProgress } = requireBindings();
    const progress = Math.max(0, Math.min(100, loadingProgress || 0));
    buttonConfigs.forEach((config, index) => {
      const x = startX + index * (buttonWidth + buttonGap);
      // Show loading progress on play button (fully loading) or map button (gameplay loading)
      const isLoading = (config.key === "play" && !assetsLoaded) ||
                        (config.key === "map" && mapReady && !assetsLoaded);
      ctx.save();
      if (isLoading) {
        // Loading button as progress meter: dark background with fill
        ctx.fillStyle = "rgba(40, 50, 70, 0.9)";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        ctx.lineWidth = 2;
        roundRect(ctx, x, buttonY, buttonWidth, buttonHeight, 16, true, true);
        // Progress fill (clipped to button shape)
        const fillWidth = buttonWidth * (progress / 100);
        if (fillWidth > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(x, buttonY, buttonWidth, buttonHeight, 16);
          ctx.clip();
          ctx.fillStyle = "#9BD9FF";
          ctx.fillRect(x, buttonY, fillWidth, buttonHeight);
          ctx.restore();
        }
      } else {
        // Normal button
        ctx.fillStyle = "#9BD9FF";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 2;
        roundRect(ctx, x, buttonY, buttonWidth, buttonHeight, 16, true, true);
      }
      if (isAnnouncementButtonFocused("title", index)) {
        drawFocusRing(ctx, x - 3, buttonY - 3, buttonWidth + 6, buttonHeight + 6, 18);
        drawButtonReflection(ctx, x, buttonY, buttonWidth, buttonHeight, 16, 0.45);
      }
      ctx.fillStyle = "#0b111a";
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.font = `600 22px ${UI_FONT_FAMILY}`;
      ctx.fillText(config.label, x + buttonWidth / 2, buttonY + 42);
      ctx.restore();
      bounds.push({
        key: config.key,
        x: layout.offsetX + x * layout.scale,
        y: layout.offsetY + buttonY * layout.scale,
        width: buttonWidth * layout.scale,
        height: buttonHeight * layout.scale,
      });
    });
    if (typeof window !== "undefined") {
      window.__titleMenuButtonBounds = bounds;
      window.__announcementButtons = { key: "title", buttons: bounds };
    }
    ctx.restore();
    if (devInspectorActive && typeof drawDevInspector === "function") {
      try { drawDevInspector(); } catch (e) {}
    }
  }

  function drawHowToPlayScreen() {
    const {
      ctx,
      canvas,
      UI_FONT_FAMILY,
      assets,
      howToPlayPages,
      howToPlayPageIndex,
      HUD_HEIGHT,
    } = requireBindings();
    ctx.save();
    const townIntroImage = assets?.backgrounds?.townIntro || null;
    const titleImage = assets?.titleBackground || null;
    if (townIntroImage) {
      drawCoverImage(ctx, canvas, townIntroImage, 1, 0.5, 0.5);
      ctx.fillStyle = "rgba(8, 12, 20, 0.35)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (titleImage) {
      drawCoverImage(ctx, canvas, titleImage, 1, 0.5, 0.5);
      ctx.fillStyle = "rgba(8, 12, 20, 0.35)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, "#070a16");
      gradient.addColorStop(1, "#121b33");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const pages = Array.isArray(howToPlayPages) ? howToPlayPages : [];
    const pageIndex = Math.max(0, Math.min(pages.length - 1, howToPlayPageIndex || 0));
    const page = pages[pageIndex] || { title: "", body: "" };
    const titleText = page.title || "";
    const bodyText = page.body || "";

    const titleSize = TEXT_STYLES.h1.size;
    const subtitleSize = Math.round(TEXT_STYLES.h2.size * 0.85);
    const lineGap = Math.round(TEXT_STYLES.h1.size * TEXT_STYLES.h1.lineHeight);
    const layout = getAnnouncementScreenLayout(ctx, canvas, {
      title: titleText,
      subtitle: bodyText,
      titleSize,
      subtitleSize,
      lineGap,
      weight: TEXT_STYLES.h1.weight,
      maxWidthScale: 0.9,
      position: "center",
      topMargin: 90,
      bottomMargin: 90,
      rowGap: 32,
      buttonHeight: 64,
      buttonCount: 2,
      HUD_HEIGHT: HUD_HEIGHT || 54,
    });
    ctx.save();
    ctx.translate(layout.offsetX, layout.offsetY);
    ctx.scale(layout.scale, layout.scale);
    drawAnnouncementText(ctx, layout.virtualCanvas, {
      title: titleText,
      subtitle: bodyText,
      yBase: layout.titleY,
      alpha: 1,
      titleSize,
      subtitleSize,
      weight: TEXT_STYLES.h1.weight,
      subtitleWeight: TEXT_STYLES.h2.weight,
      lineGap,
      typewriter: false,
      maxWidthScale: 0.9,
    });

    const leftButton = pageIndex === 0 ? { key: "back", label: "Back" } : { key: "prev", label: "Previous" };
    const rightButton = pageIndex < pages.length - 1 ? { key: "next", label: "Next" } : { key: "play", label: "Play" };
    const buttonConfigs = [leftButton, rightButton];
    const buttonWidth = 240;
    const buttonHeight = 64;
    const buttonGap = 28;
    const rowWidth = buttonWidth * buttonConfigs.length + buttonGap * (buttonConfigs.length - 1);
    const startX = Math.round(layout.virtualCanvas.width / 2 - rowWidth / 2);
    const buttonY = Math.round(layout.buttonY || 0);
    const bounds = [];
    buttonConfigs.forEach((config, index) => {
      const x = startX + index * (buttonWidth + buttonGap);
      ctx.save();
      ctx.fillStyle = "#9BD9FF";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 2;
      roundRect(ctx, x, buttonY, buttonWidth, buttonHeight, 16, true, true);
      if (isAnnouncementButtonFocused("howto", index)) {
        drawFocusRing(ctx, x - 3, buttonY - 3, buttonWidth + 6, buttonHeight + 6, 18);
        drawButtonReflection(ctx, x, buttonY, buttonWidth, buttonHeight, 16, 0.45);
      }
      ctx.fillStyle = "#0b111a";
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.font = `600 22px ${UI_FONT_FAMILY}`;
      ctx.fillText(config.label, x + buttonWidth / 2, buttonY + 42);
      ctx.restore();
      bounds.push({
        key: config.key,
        x: layout.offsetX + x * layout.scale,
        y: layout.offsetY + buttonY * layout.scale,
        width: buttonWidth * layout.scale,
        height: buttonHeight * layout.scale,
      });
    });
    if (typeof window !== "undefined") {
      window.__announcementButtons = { key: "howto", buttons: bounds };
    }
    ctx.restore();
    ctx.restore();
  }

  function drawEpilogueScreen() {
    const {
      ctx,
      canvas,
      assets,
      epilogueTitle,
      epilogueText,
      epilogueBackgroundKey,
      epilogueScroll,
      creditsContent,
      HUD_HEIGHT,
      UI_FONT_FAMILY,
    } = requireBindings();

    ctx.save();

    // Draw background
    const epilogueImage = epilogueBackgroundKey
      ? assets?.backgrounds?.[epilogueBackgroundKey] || null
      : assets?.backgrounds?.epilogue || null;
    if (epilogueImage) {
      drawCoverImage(ctx, canvas, epilogueImage, 1, 0.5, 0.5);
    } else {
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, "#070a16");
      gradient.addColorStop(1, "#121b33");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.fillStyle = "rgba(6, 10, 18, 0.55)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Scale factor for responsive text
    const scaleHint = Math.min(1, Math.max(0.6, Math.min(canvas.width / 1280, canvas.height / 720)));

    // Text styling
    const headingSize = Math.round(TEXT_STYLES.h1.size * scaleHint);
    const labelSize = Math.round(TEXT_STYLES.h3.size * scaleHint);
    const bodySize = Math.round(TEXT_STYLES.body.size * 1.1 * scaleHint);
    const nameSize = Math.round(TEXT_STYLES.h2.size * scaleHint);
    const lineHeight = 1.5;
    const maxWidth = canvas.width * 0.85;
    const centerX = canvas.width / 2;

    // Calculate content heights and build render list
    const renderItems = [];
    let totalHeight = 0;
    const startY = canvas.height; // Start at bottom of screen

    // Add epilogue title
    renderItems.push({
      type: "heading",
      text: epilogueTitle || "Epilogue",
      y: totalHeight,
      size: headingSize,
      weight: TEXT_STYLES.h1.weight,
      color: "#ffd978",
    });
    totalHeight += headingSize * lineHeight + 40;

    // Add epilogue text (wrap it)
    ctx.font = `${TEXT_STYLES.body.weight} ${bodySize}px ${ANNOUNCEMENT_FONT_FAMILY}`;
    const epilogueLines = wrapAnnouncementText(ctx, epilogueText || "", maxWidth);
    epilogueLines.forEach((line) => {
      renderItems.push({
        type: "body",
        text: line,
        y: totalHeight,
        size: bodySize,
        weight: TEXT_STYLES.body.weight,
        color: "#EAF6FF",
      });
      totalHeight += bodySize * lineHeight;
    });

    // Add spacing before credits - big visual break
    totalHeight += 250;

    // Mark where credits start
    const creditsStartY = totalHeight;

    // Track "Thank you for playing!" position
    let thankYouItemY = 0;

    // Add credits content
    (creditsContent || []).forEach((item) => {
      if (item.type === "spacer") {
        totalHeight += item.height || 40;
        return;
      }

      let size, weight, color;
      switch (item.type) {
        case "heading":
          size = headingSize;
          weight = TEXT_STYLES.h1.weight;
          color = "#ffd978";
          break;
        case "label":
          size = labelSize;
          weight = TEXT_STYLES.h3.weight;
          color = "rgba(255, 255, 255, 0.6)";
          break;
        case "name":
          size = nameSize;
          weight = TEXT_STYLES.h2.weight;
          color = "#FFFFFF";
          break;
        case "thankyou":
          size = nameSize;
          weight = TEXT_STYLES.h2.weight;
          color = "#ffd978";
          thankYouItemY = totalHeight; // Track this position
          break;
        default: // credit
          size = bodySize;
          weight = TEXT_STYLES.body.weight;
          color = "#EAF6FF";
      }

      renderItems.push({
        type: item.type,
        text: item.text,
        y: totalHeight,
        size,
        weight,
        color,
      });
      totalHeight += size * lineHeight;
    });

    // Store content height for scroll calculations
    epilogueScroll.contentHeight = totalHeight;
    epilogueScroll.canvasHeight = canvas.height;
    epilogueScroll.creditsStartY = creditsStartY;
    epilogueScroll.thankYouY = thankYouItemY;

    // Calculate scroll position - text starts at bottom and scrolls up
    const scrollOffset = epilogueScroll.scrollY;
    const fadeZoneHeight = 80;

    // Calculate "Thank you" screen position and fade-out effect
    const thankYouScreenY = startY + thankYouItemY - scrollOffset;
    const thankYouTargetY = canvas.height * 0.35; // Where "Thank you" should settle
    const fadeOutThreshold = canvas.height * 0.5; // Start fading when thank you reaches here
    const thankYouReached = thankYouScreenY <= fadeOutThreshold;
    const fadeOutProgress = thankYouReached
      ? Math.min(1, (fadeOutThreshold - thankYouScreenY) / (fadeOutThreshold - thankYouTargetY))
      : 0;

    // Render all items with scroll offset
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.shadowColor = "rgba(6, 10, 18, 0.9)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    renderItems.forEach((item) => {
      const itemY = startY + item.y - scrollOffset;

      // Skip if off screen
      if (itemY < -item.size * 2 || itemY > canvas.height + item.size) return;

      // Calculate fade alpha for top edge
      let alpha = 1;
      if (itemY < HUD_HEIGHT + fadeZoneHeight) {
        alpha = Math.max(0, (itemY - HUD_HEIGHT) / fadeZoneHeight);
      }

      // Fade out items above "Thank you" when it reaches center
      if (item.type !== "thankyou" && fadeOutProgress > 0) {
        alpha *= (1 - fadeOutProgress);
      }

      if (alpha <= 0) return;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `${item.weight} ${item.size}px ${ANNOUNCEMENT_FONT_FAMILY}`;
      ctx.fillStyle = item.color;
      ctx.fillText(item.text, centerX, itemY);
      ctx.restore();
    });

    if (typeof window !== "undefined") {
      const lastRunScore = Number.isFinite(window.lastRunScore) ? window.lastRunScore : null;
      const bestScoreValue = Number.isFinite(window.bestScore) ? window.bestScore : null;
      const scoreTextSize = Math.round(bodySize * 0.85);
      const lineGap = Math.round(scoreTextSize * 1.2);
      const latestText = `Latest Run: ${lastRunScore == null ? "--" : Math.round(lastRunScore)}`;
      const bestText = `Personal Best: ${bestScoreValue == null ? "--" : Math.round(bestScoreValue)}`;
      const rightX = canvas.width - 28;
      const topY = 22;
      ctx.save();
      ctx.textAlign = "right";
      ctx.textBaseline = "top";
      ctx.shadowColor = "rgba(6, 10, 18, 0.9)";
      ctx.shadowBlur = 12;
      ctx.font = `600 ${scoreTextSize}px ${ANNOUNCEMENT_FONT_FAMILY}`;
      ctx.fillStyle = "#EAF6FF";
      ctx.fillText(latestText, rightX, topY);
      ctx.fillStyle = "#FFD978";
      ctx.fillText(bestText, rightX, topY + lineGap);
      ctx.restore();
    }

    // Check if "Thank you" has reached its final position
    const thankYouSettled = thankYouScreenY <= thankYouTargetY;

    // Update phase and show button when "Thank you" settles
    if (thankYouSettled && !epilogueScroll.showButton) {
      epilogueScroll.showButton = true;
      epilogueScroll.phase = "done";
    }

    // Draw "Press Space to Restart" button when done
    if (epilogueScroll.showButton) {
      const buttonY = canvas.height - 100;
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `600 ${Math.round(22 * scaleHint)}px ${UI_FONT_FAMILY}`;
      ctx.fillStyle = "#FFFFFF";
      ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
      ctx.shadowBlur = 8;
      const restartLabel = (typeof GameText !== 'undefined' && GameText.buttons?.restart) || "Press Space to Restart";
      ctx.fillText(restartLabel, centerX, buttonY);
      ctx.restore();
    }

    ctx.restore();
  }

  function drawTownVictoryScreen() {
    const {
      ctx,
      canvas,
      assets,
      townVictoryTownName,
      townVictoryScore,
      townVictoryScroll,
      HUD_HEIGHT,
      UI_FONT_FAMILY,
    } = requireBindings();

    ctx.save();

    // Draw epilogue background (restored town image)
    const bgImage = assets?.backgrounds?.epilogue || null;
    if (bgImage) {
      drawCoverImage(ctx, canvas, bgImage, 1, 0.5, 0.5);
    } else {
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, "#1a2a40");
      gradient.addColorStop(1, "#0a1520");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    // Slight overlay for text readability
    ctx.fillStyle = "rgba(6, 10, 18, 0.45)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Scale factor for responsive text
    const scaleHint = Math.min(1, Math.max(0.6, Math.min(canvas.width / 1280, canvas.height / 720)));

    // Text styling
    const headingSize = Math.round(TEXT_STYLES.h1.size * scaleHint);
    const bodySize = Math.round(TEXT_STYLES.body.size * 1.15 * scaleHint);
    const scoreSize = Math.round(TEXT_STYLES.h2.size * 0.9 * scaleHint);
    const lineHeight = 1.6;
    const maxWidth = canvas.width * 0.8;
    const centerX = canvas.width / 2;

    // Build the text content
    const townName = townVictoryTownName || "this town";
    const score = Number.isFinite(townVictoryScore) ? Math.round(townVictoryScore) : 0;

    const lines = [
      { type: "heading", text: `Hope Returns to ${townName}`, size: headingSize, color: "#ffd978" },
      { type: "spacer", height: 50 },
      { type: "body", text: "The darkness has been driven back.", size: bodySize, color: "#EAF6FF" },
      { type: "body", text: "Your congregation stood firm in faith.", size: bodySize, color: "#EAF6FF" },
      { type: "spacer", height: 30 },
      { type: "body", text: "The people of this town can rebuild,", size: bodySize, color: "#EAF6FF" },
      { type: "body", text: "free from the hordes that once threatened them.", size: bodySize, color: "#EAF6FF" },
      { type: "spacer", height: 50 },
      { type: "score", text: `Final Congregation: ${score}`, size: scoreSize, color: "#ffd978" },
      { type: "spacer", height: 40 },
      { type: "body", text: "But other towns still need your help...", size: bodySize, color: "#c8dce8" },
      { type: "spacer", height: 80 },
    ];

    // Calculate total content height
    let totalHeight = 0;
    lines.forEach((item) => {
      if (item.type === "spacer") {
        totalHeight += item.height || 40;
      } else {
        totalHeight += item.size * lineHeight;
      }
    });

    // Store content height for scroll calculations
    townVictoryScroll.contentHeight = totalHeight;

    // Calculate scroll position - text starts vertically centered
    const startY = (canvas.height - totalHeight) / 2 + canvas.height * 0.15;
    const scrollOffset = townVictoryScroll.scrollY;
    const fadeZoneHeight = 80;

    // Calculate when text has scrolled enough (final line at ~35% from top)
    const finalTargetY = canvas.height * 0.30;
    const lastItemScreenY = startY + totalHeight - scrollOffset;
    const scrollComplete = lastItemScreenY <= finalTargetY + totalHeight * 0.3;

    // Update showButton state
    if (scrollComplete && !townVictoryScroll.showButton) {
      townVictoryScroll.showButton = true;
    }

    // Render all items with scroll offset
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.shadowColor = "rgba(6, 10, 18, 0.9)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    let currentY = 0;
    lines.forEach((item) => {
      if (item.type === "spacer") {
        currentY += item.height || 40;
        return;
      }

      const itemY = startY + currentY - scrollOffset;
      currentY += item.size * lineHeight;

      // Skip if off screen
      if (itemY < -item.size * 2 || itemY > canvas.height + item.size) return;

      // Calculate fade alpha for top edge
      let alpha = 1;
      if (itemY < HUD_HEIGHT + fadeZoneHeight) {
        alpha = Math.max(0, (itemY - HUD_HEIGHT) / fadeZoneHeight);
      }

      if (alpha <= 0) return;

      ctx.save();
      ctx.globalAlpha = alpha;
      const weight = item.type === "heading" || item.type === "score" ? TEXT_STYLES.h1.weight : TEXT_STYLES.body.weight;
      ctx.font = `${weight} ${item.size}px ${ANNOUNCEMENT_FONT_FAMILY}`;
      ctx.fillStyle = item.color;
      ctx.fillText(item.text, centerX, itemY);
      ctx.restore();
    });

    // Draw "Continue" button when scroll is complete
    if (townVictoryScroll.showButton) {
      const buttonWidth = Math.min(360, Math.round(canvas.width * 0.4));
      const buttonHeight = Math.round(60 * scaleHint);
      const buttonX = Math.round((canvas.width - buttonWidth) / 2);
      const buttonY = canvas.height - 100;

      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "#9BD9FF";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 2;
      roundRect(ctx, buttonX, buttonY, buttonWidth, buttonHeight, 18, true, true);
      // Add focus ring effect
      ctx.strokeStyle = "#FFD978";
      ctx.lineWidth = 3;
      roundRect(ctx, buttonX - 3, buttonY - 3, buttonWidth + 6, buttonHeight + 6, 20, false, true);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#0b111a";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `600 ${Math.round(22 * scaleHint)}px ${UI_FONT_FAMILY}`;
      const continueLabel3 = (typeof GameText !== 'undefined' && GameText.buttons?.continue) || "Continue (Space)";
      ctx.fillText(continueLabel3, buttonX + buttonWidth / 2, buttonY + buttonHeight / 2);
      ctx.restore();
    }

    ctx.restore();
  }

  function drawGame() {
    const {
      ctx,
      canvas,
      howToPlayActive,
      titleScreenActive,
      mapActive,
      epilogueActive,
      levelManager,
      gameOver,
      assets,
      obstacles,
      congregationMembers,
      npcs,
      utilityPowerUps,
      weaponPickups,
      churchPowerupPickups,
      gracePickups,
      enemies,
      activeBoss,
      projectiles,
      player,
      haloBladeState,
      haloBladeStateSecondary,
      spearState,
      spearStateSecondary,
      sentryState,
      sentryStateSecondary,
      effects,
      floatingTexts,
      cannonSplashRadius,
      UI_FONT_FAMILY,
      pointerState,
      paused,
      gameStarted,
      getCongregationSize,
      initialCongregationSize,
      visitorSession,
      graceRushState,
      isModalActive,
      arenaFadeAlpha,
      actBreakFadeAlpha,
      graceRushFadeAlpha,
      graceRushBlackout,
      damageHitFlash,
      postDeathSequenceActive,
      heroLives,
    } = requireBindings();
    if (typeof window !== "undefined") {
      window.__announcementButtons = null;
    }
    const dynamicNameTags = [];
    const npcFadeAlpha = Math.max(0, 1 - Math.min(1, actBreakFadeAlpha));
    npcFaithOverlays.length = 0;
    if (epilogueActive) {
      drawEpilogueScreen();
      return;
    }
    const townVictoryState = requireBindings();
    if (townVictoryState.townVictoryActive) {
      drawTownVictoryScreen();
      return;
    }
    if (howToPlayActive) {
      drawHowToPlayScreen();
      return;
    }
    if (mapActive) {
      if (window.MapScreen?.draw) {
        window.MapScreen.draw(ctx, canvas);
      }
      const hasMapTagline =
        typeof GameText !== 'undefined' && GameText.screens?.map?.tagline !== undefined;
      const mapTagline = hasMapTagline
        ? GameText.screens.map.tagline
        : "Smite the hordes. Defend the churches. Protect the people.";
      if (mapTagline) {
        drawAnnouncementText(ctx, canvas, {
          title: mapTagline,
          subtitle: "",
          yBase: Math.round(canvas.height * 0.06),
          titleSize: TEXT_STYLES.h2.size,
          subtitleSize: TEXT_STYLES.body.size,
          lineGap: Math.round(TEXT_STYLES.h2.size * TEXT_STYLES.h2.lineHeight),
          weight: TEXT_STYLES.h2.weight,
          subtitleWeight: TEXT_STYLES.body.weight,
          typewriter: true,
          maxWidthScale: 0.9,
          blockAlign: "center",
        });
      }
      return;
    }
    if (titleScreenActive) {
      drawTitleScreen();
      return;
    }
    const chapterBreakState = requireBindings();
    if (chapterBreakState.chapterBreakActive) {
      drawChapterBreakScreen();
      return;
    }
    const missionOverlayActive = Boolean(window.isMissionBriefOverlayActive);
    const pauseOverlayActive = Boolean(window.isPauseOverlayActive);
    const upgradeOverlayActive = Boolean(window.UpgradeScreen?.isVisible?.());
    // Check if recap/summary or pastor-final announcement is active - should show arena behind it
    const recapAnnouncementActive = Boolean(
      levelAnnouncements?.[0]?.requiresConfirm &&
      (levelAnnouncements[0]?.recapData || levelAnnouncements[0]?.recapPrepared)
    );
    const pastorFinalActive = Boolean(levelAnnouncements?.[0]?.pastorFinal);
    const pastorPostRecapActive = Boolean(levelAnnouncements?.[0]?.pastorPostRecap);
    const congregationAnnouncementActive =
      recapAnnouncementActive || pastorFinalActive || pastorPostRecapActive;
    if (
      isModalActive &&
      !missionOverlayActive &&
      !pauseOverlayActive &&
      !congregationAnnouncementActive &&
      !upgradeOverlayActive
    ) {
      ctx.save();
      const modalBlackout = graceRushBlackout ? 1 : (graceRushFadeAlpha > 0 ? Math.min(1, graceRushFadeAlpha) : 0.92);
      ctx.fillStyle = `rgba(0, 0, 0, ${modalBlackout})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
      return;
    }
    const townIntroActive = Boolean(levelAnnouncements?.[0]?.townIntro);
    const exteriorShotActive = Boolean(levelAnnouncements?.[0]?.exteriorShot);
    let townIntroOverlay = null;
    sharedShakeOffset.x = 0;
    sharedShakeOffset.y = 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const levelStatus = levelManager?.getStatus ? levelManager.getStatus() : null;
    const nowMs = typeof performance !== "undefined" ? performance.now() : Date.now();
    updateWaveClearWipe(levelStatus, nowMs);
    const townIntroTransitionActive = Boolean(requireBindings().townIntroTransitionActive);
    if (townIntroTransitionActive) {
      const {
        assets,
        canvas,
        ctx,
        TOWN_INTRO_ZOOM_DURATION,
        TOWN_INTRO_FADE_DURATION,
        townIntroTransitionTimer,
      } = requireBindings();
      const img = assets?.backgrounds?.townIntro || null;
      const zoomDuration = Math.max(0.001, TOWN_INTRO_ZOOM_DURATION || 0.5);
      const fadeDuration = Math.max(0.001, TOWN_INTRO_FADE_DURATION || 0.5);
      const zoomProgress = Math.min(1, Math.max(0, townIntroTransitionTimer / zoomDuration));
      const fadeStart = zoomDuration * 0.4;
      const fadeProgress = Math.min(
        1,
        Math.max(0, (townIntroTransitionTimer - fadeStart) / fadeDuration),
      );
      const easedZoom = zoomProgress * zoomProgress * (3 - 2 * zoomProgress);
      const easedFade = fadeProgress * fadeProgress * (3 - 2 * fadeProgress);
      const focusX = 0.7 + (0.75 - 0.7) * easedZoom;
      const focusY = 0.52 + (0.56 - 0.52) * easedZoom;
      const scale = 1 + 1.25 * easedZoom;
      if (fadeProgress <= 0) {
        ctx.save();
        ctx.fillStyle = "#0b111a";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawCoverImage(ctx, canvas, img, scale, focusX, focusY);
        ctx.fillStyle = "rgba(8, 12, 20, 0.25)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
        return;
      }
      townIntroOverlay = {
        alpha: Math.max(0, Math.min(1, 1 - easedFade)),
        focusX,
        focusY,
        scale,
      };
    }
    if (townIntroActive) {
      const effectiveCameraX = resolveCameraX();
      drawBackground(effectiveCameraX, 0);
      const fireOverlay = requireBindings().fireOverlay;
      if (fireOverlay && typeof fireOverlay.draw === "function") {
        if (typeof fireOverlay.setBounds === "function") {
          fireOverlay.setBounds(0, 0, canvas.width, canvas.height);
        }
        fireOverlay.draw(ctx);
      }
      // Chapter Break (aka Battle Break) screen: Battle I/II/III + exterior shot.
      const announcementTitle = levelAnnouncements?.[0]?.title || "";
      const announcementSubtitle = levelAnnouncements?.[0]?.subtitle || "";
      const battleHeadings = (typeof GameText !== 'undefined' && GameText.battleActs) || {
        1: "Act I: Establish a Foothold",
        2: "Act II: Repel the Counter Attack",
        3: "Act III: Liberate the Town",
      };
      const announcement = levelAnnouncements?.[0] || {};
      const inferredUpcomingNumber = Math.max(
        1,
        (Number.isFinite(levelStatus?.battle) ? levelStatus.battle : 0) + 1,
      );
      const upcomingNumber = Number.isFinite(announcement.upcomingMissionNumber)
        ? announcement.upcomingMissionNumber
        : inferredUpcomingNumber;
      const orderNumber = Number.isFinite(announcement.upcomingOrderNumber)
        ? announcement.upcomingOrderNumber
        : inferredUpcomingNumber;
      const battleHeading = battleHeadings[orderNumber] || `Act ${orderNumber}`;
      const headerTitleSize = 64;
      const headerSubtitleSize = 34;
      const bodyTitleSize = Math.max(20, TEXT_STYLES.h1.size * 0.85);
      const headerLayout = getAnnouncementTextLayout(ctx, canvas, {
        title: battleHeading,
        subtitle: upcomingNumber > 1 ? `Battle ${upcomingNumber}` : "",
        titleSize: headerTitleSize,
        subtitleSize: headerSubtitleSize,
        lineGap: Math.round(headerTitleSize * 1.1),
        weight: "bold",
        maxWidthScale: 0.9,
      });
      const bodyLayout = getAnnouncementTextLayout(ctx, canvas, {
        title: announcementTitle,
        subtitle: announcementSubtitle,
        titleSize: bodyTitleSize,
        subtitleSize: TEXT_STYLES.h2.size,
        lineGap: Math.round(TEXT_STYLES.h1.size * TEXT_STYLES.h1.lineHeight),
        weight: TEXT_STYLES.h1.weight,
        maxWidthScale: 0.92,
      });
      const headerBodyGap = 28;
      const textGroupHeight =
        headerLayout.textBlockHeight + headerBodyGap + bodyLayout.textBlockHeight;
      const textGroupTopY = Math.max(
        90,
        Math.round((canvas.height - textGroupHeight) / 2),
      );
      const headerYBase = textGroupTopY + headerLayout.titleLineHeight;
      const bodyYBase =
        textGroupTopY +
        headerLayout.textBlockHeight +
        headerBodyGap +
        bodyLayout.titleLineHeight;
      {
        drawAnnouncementText(ctx, canvas, {
          title: battleHeading,
          subtitle: upcomingNumber > 1 ? `Battle ${upcomingNumber}` : "",
          yBase: headerYBase,
          titleSize: headerTitleSize,
          subtitleSize: headerSubtitleSize,
          lineGap: Math.round(headerTitleSize * 1.1),
          weight: "bold",
          subtitleWeight: "bold",
          typewriter: false,
          maxWidthScale: 0.9,
          blockAlign: "center",
        });
      }
      {
        const layout = getAnnouncementScreenLayout(ctx, canvas, {
          title: announcementTitle,
          subtitle: announcementSubtitle,
          titleSize: bodyTitleSize,
          subtitleSize: TEXT_STYLES.h2.size,
          lineGap: Math.round(TEXT_STYLES.h1.size * TEXT_STYLES.h1.lineHeight),
          weight: TEXT_STYLES.h1.weight,
          maxWidthScale: 0.92,
          position: "bottom",
          topMargin: 90,
          bottomMargin: 80,
          rowGap: 32,
          buttonHeight: 50,
          buttonCount: 1,
          HUD_HEIGHT,
        });
        ctx.save();
        ctx.translate(layout.offsetX, layout.offsetY);
        ctx.scale(layout.scale, layout.scale);
        drawAnnouncementText(ctx, layout.virtualCanvas, {
          title: announcementTitle,
          subtitle: announcementSubtitle,
          yBase: bodyYBase,
          alpha: 1,
          typewriter: true,
          titleSize: bodyTitleSize,
          weight: TEXT_STYLES.h1.weight,
          maxWidthScale: 0.92,
        });
        ctx.restore();
      }
      ctx.save();
      const buttonText = "Play (Space)";
      const titleSize = Math.max(20, TEXT_STYLES.h1.size * 0.85);
      const layout = getAnnouncementScreenLayout(ctx, canvas, {
        title: announcementTitle,
        subtitle: announcementSubtitle,
        titleSize,
        subtitleSize: TEXT_STYLES.h2.size,
        lineGap: Math.round(TEXT_STYLES.h1.size * TEXT_STYLES.h1.lineHeight),
        weight: TEXT_STYLES.h1.weight,
        maxWidthScale: 0.92,
        position: "bottom",
        topMargin: 90,
        bottomMargin: 80,
        rowGap: 32,
        buttonHeight: 50,
        buttonCount: 1,
        HUD_HEIGHT,
      });
      ctx.translate(layout.offsetX, layout.offsetY);
      ctx.scale(layout.scale, layout.scale);
      const buttonWidth = Math.min(240, layout.virtualCanvas.width * 0.5);
      const buttonHeight = 50;
      const buttonX = layout.virtualCanvas.width / 2 - buttonWidth / 2;
      const buttonY = Math.round(layout.buttonY || 0);
      if (typeof window !== "undefined") {
        window.__townIntroPlayButtonBounds = {
          x: layout.offsetX + buttonX * layout.scale,
          y: layout.offsetY + buttonY * layout.scale,
          width: buttonWidth * layout.scale,
          height: buttonHeight * layout.scale,
        };
        window.__announcementButtons = {
          key: "chapterBreak",
          buttons: [
            {
              key: "play",
              x: layout.offsetX + buttonX * layout.scale,
              y: layout.offsetY + buttonY * layout.scale,
              width: buttonWidth * layout.scale,
              height: buttonHeight * layout.scale,
            },
          ],
        };
      }
      ctx.fillStyle = "#9BD9FF";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
      ctx.lineWidth = 2;
      roundRect(ctx, buttonX, buttonY, buttonWidth, buttonHeight, 16, true, true);
      if (isAnnouncementButtonFocused("chapterBreak", 0)) {
        drawFocusRing(ctx, buttonX - 3, buttonY - 3, buttonWidth + 6, buttonHeight + 6, 18);
      }
      ctx.fillStyle = "#0b111a";
      ctx.textAlign = "center";
      ctx.font = `18px ${UI_FONT_FAMILY}`;
      ctx.textBaseline = "alphabetic";
      ctx.fillText(buttonText, buttonX + buttonWidth / 2, buttonY + buttonHeight / 2 + 6);
      ctx.restore();
      return;
    }
    if (exteriorShotActive) {
      const announcementTitle = levelAnnouncements?.[0]?.title || "";
      const img = assets?.backgrounds?.townIntro || null;
      ctx.save();
      ctx.fillStyle = "#0b111a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (img) {
        drawCoverImage(ctx, canvas, img, 1, 0.5, 0.5);
        ctx.fillStyle = "rgba(8, 12, 20, 0.35)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      const fireOverlay = requireBindings().fireOverlay;
      if (fireOverlay && typeof fireOverlay.draw === "function") {
        if (typeof fireOverlay.setBounds === "function") {
          fireOverlay.setBounds(0, 0, canvas.width, canvas.height);
        }
        fireOverlay.draw(ctx);
      }
      const titleSize = Math.max(20, TEXT_STYLES.h1.size * 0.85);
      const layout = getAnnouncementScreenLayout(ctx, canvas, {
        title: announcementTitle,
        subtitle: "",
        titleSize,
        subtitleSize: TEXT_STYLES.h2.size,
        lineGap: Math.round(TEXT_STYLES.h1.size * TEXT_STYLES.h1.lineHeight),
        weight: TEXT_STYLES.h1.weight,
        maxWidthScale: 0.92,
        position: "center",
        topMargin: 90,
        bottomMargin: 80,
        buttonCount: 0,
        HUD_HEIGHT,
      });
      ctx.save();
      ctx.translate(layout.offsetX, layout.offsetY);
      ctx.scale(layout.scale, layout.scale);
      drawAnnouncementText(ctx, layout.virtualCanvas, {
        title: announcementTitle,
        yBase: layout.titleY,
        alpha: 1,
        typewriter: true,
        titleSize,
        weight: TEXT_STYLES.h1.weight,
        maxWidthScale: 0.92,
      });
      ctx.restore();
      return;
    }
    // If we're in briefing, draw briefing first; otherwise if levelIntro draw congregation
    if (levelStatus?.stage === 'briefing') {
      drawBriefingScene(levelStatus);
      drawLevelAnnouncements();
      drawPauseHint();
      return;
    }
    if (visitorSession?.introActive) {
      drawVisitorIntroOverlay();
      drawPauseHint();
      return;
    }
    if (congregationAnnouncementActive) {
      if (recapAnnouncementActive) {
        const effectiveCameraX = resolveCameraX();
        drawBackground(effectiveCameraX, 0);
        drawLevelAnnouncements();
        return;
      }
      const {
        buildCongregationMembers,
        getCongregationSize,
        updateCongregationMembers,
        updatePlayerDuringCongregation,
        resolveCongregationCollisions,
      } = requireBindings();
      if (
        !recapCongregationPreviewBuilt &&
        Array.isArray(congregationMembers) &&
        congregationMembers.length === 0 &&
        typeof buildCongregationMembers === "function"
      ) {
        const targetBase =
          typeof getCongregationSize === "function" ? getCongregationSize() : null;
        const targetCount = 30;
        buildCongregationMembers(targetCount);
        recapCongregationPreviewBuilt =
          Array.isArray(congregationMembers) && congregationMembers.length > 0;
        recapCongregationLastTime = typeof performance !== "undefined" ? performance.now() : Date.now();
      } else if (recapCongregationPreviewBuilt && typeof updateCongregationMembers === "function") {
        const now = typeof performance !== "undefined" ? performance.now() : Date.now();
        const dt = Math.max(0, Math.min(0.05, (now - recapCongregationLastTime) / 1000));
        recapCongregationLastTime = now;
        updateCongregationMembers(dt);
        if (typeof updatePlayerDuringCongregation === "function") {
          updatePlayerDuringCongregation(dt);
        }
        if (typeof resolveCongregationCollisions === "function") {
          resolveCongregationCollisions();
        }
      }
      const effectiveCameraX = resolveCameraX();
      const effectiveCameraY = 0;
      drawBackground(effectiveCameraX, effectiveCameraY);

      ctx.save();
      ctx.translate(-effectiveCameraX, effectiveCameraY);
      if (Array.isArray(congregationMembers) && congregationMembers.length) {
        congregationMembers.forEach((member) => {
          if (!member) return;
          const drawAlpha = npcFadeAlpha;
          if (drawAlpha > 0) {
            member.animator.draw(ctx, member.x, member.y, { alpha: drawAlpha });
          }
        });

      } else {
        congregationFadeState.active = false;
        congregationFadeState.memberCount = 0;
        congregationFadeState.token = 0;
      }
      const isBossRecap = Boolean(levelAnnouncements?.[0]?.levelSummary);
      const isPastorFinal = Boolean(levelAnnouncements?.[0]?.pastorFinal);
      if (isBossRecap || isPastorFinal) {
        const { player } = requireBindings();
        if (player) {
          player.draw();
        }
      }
      ctx.restore();

      drawHUD();
      drawHUD();
      drawLevelAnnouncements();
      return;
    }
    if (recapCongregationPreviewBuilt && !congregationAnnouncementActive) {
      const { clearCongregationMembers } = requireBindings();
      if (typeof clearCongregationMembers === "function") {
        clearCongregationMembers();
      }
      recapCongregationPreviewBuilt = false;
    }
    const visitorStageActive = Boolean(visitorSession?.active || levelStatus?.stage === "visitorMinigame");
    const isCongregationStage = levelStatus?.stage === "levelIntro" && !gameOver && !visitorStageActive;
    const shakeOffset = getCameraShakeOffset();
    sharedShakeOffset.x = shakeOffset.x;
    sharedShakeOffset.y = shakeOffset.y;
    ctx.save();
    const effectiveCameraX = resolveCameraX();
    const effectiveCameraY = shakeOffset.y || 0;
    drawBackground(effectiveCameraX, effectiveCameraY);

    ctx.save();
    ctx.translate(-effectiveCameraX, effectiveCameraY);

    const bandImg = assets?.backgroundLayers?.floor || null;
    const floorBandHeight = bandImg?.height || 200;
    if (bandImg) {
      ctx.save();
      const imgW = bandImg.width || 1;
      const imgH = bandImg.height || 1;
      // Center horizontally, align to bottom
      const drawX = Math.round((canvas.width - imgW) / 2);
      const drawY = canvas.height - imgH;
      ctx.drawImage(bandImg, 0, 0, imgW, imgH, drawX, drawY, imgW, imgH);
      ctx.restore();
    } else {
      console.debug && console.debug("drawGame: band image missing", { layer: assets?.backgroundLayers?.floor });
    }

    if (!graceRushBlackout && !(graceRushHardBlackoutTimer > 0)) {
      try {
        drawFloorTextsOverlay(ctx);
      } catch (e) {}
    }

    drawHudComboUnderlay(ctx, canvas, UI_FONT_FAMILY, HUD_HEIGHT);

  // ...existing code...
  drawSpawnPointDebug(ctx);
  drawNpcHomeBounds(ctx);

    obstacles.forEach((obstacle) => obstacle.draw(ctx));
    drawBossHazards(ctx);
    let battleNpcs = [];
    if (visitorStageActive) {
      drawVisitorActors(visitorSession);
    } else {
    if (isCongregationStage) {
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      if (!congregationFadeState.active || congregationFadeState.memberCount !== congregationMembers.length) {
        congregationFadeState.active = true;
        congregationFadeState.memberCount = congregationMembers.length;
        congregationFadeState.token += 1;
      }
      ctx.save();
      congregationMembers.forEach((member) => {
        if (!member) return;
        if (member.__congregationFadeToken !== congregationFadeState.token) {
          member.__congregationFadeToken = congregationFadeState.token;
          if (Math.random() < 0.5) {
            member.__congregationFadeStart = now + 1000 + Math.random() * 4000;
            member.__congregationFadeDuration = 1200;
          } else {
            member.__congregationFadeStart = now;
            member.__congregationFadeDuration = 0;
          }
        }
        const entry = {
          start: member.__congregationFadeStart,
          duration: member.__congregationFadeDuration,
        };
        let alpha = 1;
        if (entry && entry.duration > 0) {
          const t = (now - entry.start) / entry.duration;
          if (t <= 0) alpha = 0;
          else if (t >= 1) alpha = 1;
          else alpha = t;
        }
        const drawAlpha = npcFadeAlpha * alpha;
        if (drawAlpha > 0) {
          member.animator.draw(ctx, member.x, member.y, { alpha: drawAlpha });
          const nameY = member.y - (member.radius || 28) - 2;
          dynamicNameTags.push({ name: member?.name || "Friend", x: member.x, y: nameY });
        }
      });
      ctx.restore();
    } else {
      battleNpcs = npcs.filter(Boolean);
    }
    }
    if (dynamicNameTags.length) {
      ctx.save();
      ctx.globalAlpha *= npcFadeAlpha;
      dynamicNameTags.forEach((entry) => {
        drawNameTag(ctx, entry.name, entry.x, entry.y, UI_FONT_FAMILY);
      });
      ctx.restore();
    }
    if (!isCongregationStage) {
      congregationFadeState.active = false;
      congregationFadeState.memberCount = 0;
      congregationFadeState.token = 0;
    }
    const drawNpcFaithOverlayEntry = (entry) => {
      ctx.save();
      const radius = Math.max(6, Math.floor(entry.height / 2));
      ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
      roundRect(ctx, entry.x, entry.y, entry.width, entry.height, radius, true, false);
      ctx.fillStyle = typeof NPC_FAITH_FILL_COLOR !== "undefined" ? NPC_FAITH_FILL_COLOR : "#9BD9FF";
      const fillW = Math.max(0, entry.width - 4) * entry.ratio;
      if (fillW > 0) {
        roundRect(
          ctx,
          entry.x + 2,
          entry.y + 2,
          fillW,
          entry.height - 4,
          Math.max(4, Math.floor((entry.height - 4) / 2)),
          true,
          false,
        );
      }
      if (entry.ratio > 0 && entry.ratio <= 0.33) {
        try {
          const t = typeof performance !== "undefined" ? performance.now() : Date.now();
          const alpha = Math.abs(Math.sin(t * 0.01)) * 0.65;
          ctx.fillStyle = `rgba(255,60,60,${alpha.toFixed(3)})`;
          roundRect(
            ctx,
            entry.x + 2,
            entry.y + 2,
            entry.width - 4,
            entry.height - 4,
            Math.max(4, Math.floor((entry.height - 4) / 2)),
            true,
            false,
          );
        } catch (err) {}
      } else if (entry.ratio <= 0) {
        try {
          const t = typeof performance !== "undefined" ? performance.now() : Date.now();
          const alpha = 0.25 + Math.abs(Math.sin(t * 0.005)) * 0.45;
          ctx.fillStyle = `rgba(255,60,60,${alpha.toFixed(3)})`;
          roundRect(
            ctx,
            entry.x + 2,
            entry.y + 2,
            entry.width - 4,
            entry.height - 4,
            Math.max(4, Math.floor((entry.height - 4) / 2)),
            true,
            false,
          );
        } catch (err) {}
      }
      if (entry.damageFlash > 0) {
        try {
          const t = (performance.now ? performance.now() : Date.now());
          const blinkOn = Math.sin(t * 0.03) > 0;
          if (blinkOn) {
            ctx.globalCompositeOperation = "destination-out";
            ctx.fillStyle = "rgba(0,0,0,0.9)";
            roundRect(
              ctx,
              entry.x + 2,
              entry.y + 2,
              entry.width - 4,
              entry.height - 4,
              Math.max(4, Math.floor((entry.height - 4) / 2)),
              true,
              false,
            );
          }
          ctx.globalCompositeOperation = "source-over";
        } catch (err) {}
      }
      // No special highlight for full faith; keep the same fill color.
      ctx.restore();
    };
    let npcFaithOverlayFn = () => {
      if (!npcFaithOverlays.length) return;
      ctx.save();
      ctx.globalAlpha *= npcFadeAlpha;
      npcFaithOverlays.forEach((entry) => {
        drawNpcFaithOverlayEntry(entry);
      });
      ctx.restore();
    };
  // ...existing code...
    let orderedEnemies = [];
    if (!visitorStageActive) {
      enemyHpLabels.length = 0;
      const isMiniImpType = (enemy) => {
        const type = enemy?.type;
        return type === "miniImp" || type === "miniImpLevel2" || type === "miniImpLevel3";
      };
      const orderIndex = (enemy) => (isMiniImpType(enemy) ? 0 : 1);
      orderedEnemies = [...enemies].sort((a, b) => orderIndex(a) - orderIndex(b));
      orderedEnemies.forEach((enemy) => enemy.draw());
      if (activeBoss) activeBoss.draw(ctx);
      drawEnemyWeaponHitboxDebugs(ctx, orderedEnemies, activeBoss);
    }
    if (!visitorStageActive && battleNpcs.length) {
      drawBattleNpcs(ctx, battleNpcs, npcFadeAlpha);
    }
    const shouldDepthSortNpcUi = !visitorStageActive && battleNpcs.length && !isCongregationStage;
    if (shouldDepthSortNpcUi) {
      const overlayByOwner = new Map();
      npcFaithOverlays.forEach((entry) => {
        if (entry?.owner) overlayByOwner.set(entry.owner, entry);
      });
      const sortedNpcs = [...battleNpcs].sort((a, b) => (a?.y || 0) - (b?.y || 0));
      ctx.save();
      ctx.globalAlpha *= npcFadeAlpha;
      sortedNpcs.forEach((npc) => {
        if (npc?.name) {
          const nameY = npc.y - (npc.radius || 28) - 10;
          drawNameTag(ctx, npc.name, npc.x, nameY, UI_FONT_FAMILY);
        }
        const overlay = overlayByOwner.get(npc);
        if (overlay) drawNpcFaithOverlayEntry(overlay);
      });
      ctx.restore();
    } else {
      npcFaithOverlayFn();
    }
    projectiles.forEach((projectile) => {
      projectile.draw();
      if (
        showCannonSplashRadius &&
        projectile.type === "faith_cannon" &&
        typeof cannonSplashRadius === "number" &&
        cannonSplashRadius > 0
      ) {
        drawCannonSplashDebug(ctx, projectile.x, projectile.y, cannonSplashRadius);
      }
    });
    drawCombatHitboxDebugs(ctx, player, battleNpcs, orderedEnemies, activeBoss, projectiles);
    if (!graceRushBlackout && !(graceRushHardBlackoutTimer > 0)) {
      effects.forEach((effect) => effect.draw());
    }
    // Draw pickups above projectiles/effects so they're easy to see.
    utilityPowerUps.forEach((powerUp) => powerUp.draw(ctx));
    weaponPickups.forEach((pickup) => pickup.draw());
    churchPowerupPickups.forEach((pickup) => pickup.draw());
    gracePickups.forEach((pickup) => {
      if (pickup && typeof pickup.draw === "function") pickup.draw(ctx);
    });
    drawRingOfFireEffects(player);
    drawCongregationCommandMeter(player, battleNpcs);
    if (player) {
      player.draw();
      drawPlayerRingFireChargeMeter(player);
      drawPlayerWeaponMeter(player);
      drawPlayerExtendMeter(player);
    }

    // Draw god rays above characters so light appears between viewer and characters
    drawArenaGodRays(ctx, canvas, floorBandHeight, effectiveCameraX);

    // Draw spears above other sprites/effects so they remain visible in chaos.
    drawSentryTurret(ctx, sentryState);
    drawSentryTurret(ctx, sentryStateSecondary);
    drawHaloBlade(ctx, haloBladeState);
    drawHaloBlade(ctx, haloBladeStateSecondary);
    drawSpearDart(ctx, spearState);
    drawSpearDart(ctx, spearStateSecondary);

      // --- Enemy-player collision and damage logic ---
      if (!visitorStageActive && player && Array.isArray(enemies)) {
        const now = performance.now();
        const bindings = requireBindings();
        const dashState = bindings.playerDashState || null;
        const meleeState = bindings.meleeAttackState || window._meleeAttackState || null;
        const dashSwooshProtected =
          Boolean(dashState?.isDashing) ||
          Boolean(meleeState?.swooshTimer > 0) ||
          Boolean(meleeState?.swooshShieldDebugTimer > 0);
        enemies.forEach((enemy) => {
          if (!enemy || enemy.dead || typeof enemy.x !== 'number' || typeof enemy.y !== 'number') return;
          // Use radius for collision
          const ex = enemy.x, ey = enemy.y, er = enemy.radius || enemy.config?.hitRadius || 24;
          const px = player.x, py = player.y, pr = player.radius || 24;
          const dx = ex - px, dy = ey - py;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < er + pr) {
            // Only damage if cooldown expired
            const isDeadLike =
              enemy.state === "death" ||
              enemy.dead ||
              enemy.ignoreEntityCollisions ||
              (typeof enemy.health === "number" && enemy.health <= 0);
          if (!isDeadLike && (!enemy._playerTouchCooldown || now - enemy._playerTouchCooldown > 1200)) {
            enemy._playerTouchCooldown = now;
            if (dashSwooshProtected) {
              return;
            }
            if (player.invulnerableTimer > 0) {
              return;
            }
            if (typeof player.takeDamage === 'function') {
              const rawDamage =
                typeof getEnemyContactDamageValue === "function"
                  ? getEnemyContactDamageValue(enemy)
                  : Number.isFinite(enemy.config?.contactDamage)
                    ? enemy.config.contactDamage
                    : Number.isFinite(enemy.config?.damage)
                      ? enemy.config.damage
                      : Number.isFinite(enemy.damage)
                        ? enemy.damage
                        : 1;
              if (rawDamage > 0) {
                player.takeDamage(rawDamage);
              }
            } else if (typeof player.health === 'number') {
              const rawDamage =
                typeof getEnemyContactDamageValue === "function"
                  ? getEnemyContactDamageValue(enemy)
                  : Number.isFinite(enemy.config?.contactDamage)
                    ? enemy.config.contactDamage
                    : Number.isFinite(enemy.config?.damage)
                      ? enemy.config.damage
                      : Number.isFinite(enemy.damage)
                        ? enemy.damage
                        : 1;
              if (rawDamage > 0) {
                player.health = Math.max(0, player.health - rawDamage);
              }
            }
            // Optional: flash effect or feedback
            if (typeof player.flashDamage === 'function') player.flashDamage();
          }
          } else {
            // Reset cooldown if not touching
            enemy._playerTouchCooldown = null;
          }
        });
      }

    // Color grade disabled per request.

  // ...existing code...
  drawSpawnPointDebug(ctx);
  drawNpcHomeBounds(ctx);
  // drawAimAssistOverlay(); // Aim assist cone hidden for now
    // Reticle hidden while auto-aim is active.

    const fogWidth = 180;
    const fogHeight = 90;
    const arenaWidth = canvas.width - fogWidth * 2;
    const arenaHeight = canvas.height - fogHeight;
    const ashOverlay = requireBindings().ashOverlay;
    if (ashOverlay && typeof ashOverlay.draw === "function") {
      if (typeof ashOverlay.setBounds === "function") {
        ashOverlay.setBounds(fogWidth, 0, arenaWidth, arenaHeight);
      }
      ctx.save();
      ctx.beginPath();
      ctx.rect(fogWidth, 0, arenaWidth, arenaHeight);
      ctx.clip();
      ashOverlay.draw(ctx);
      ctx.restore();
    }

    ctx.restore();

    // Screen-space fog should not move with the camera.

    ctx.save();
    ctx.globalAlpha = 1.0;
    const fogGradientLeft = ctx.createLinearGradient(-fogWidth, 0, fogWidth, 0);
    fogGradientLeft.addColorStop(0, 'rgba(40,0,0,0.98)');
    fogGradientLeft.addColorStop(0.35, 'rgba(40,0,0,0.85)');
    fogGradientLeft.addColorStop(1, 'rgba(40,0,0,0.0)');
    ctx.fillStyle = fogGradientLeft;
    ctx.fillRect(-fogWidth, 0, fogWidth * 2, canvas.height);
    const fogGradientRight = ctx.createLinearGradient(canvas.width - fogWidth, 0, canvas.width + fogWidth, 0);
    fogGradientRight.addColorStop(0, 'rgba(40,0,0,0.0)');
    fogGradientRight.addColorStop(0.65, 'rgba(40,0,0,0.85)');
    fogGradientRight.addColorStop(1, 'rgba(40,0,0,0.98)');
    ctx.fillStyle = fogGradientRight;
    ctx.fillRect(canvas.width - fogWidth, 0, fogWidth * 2, canvas.height);
    const fogGradientBottom = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - fogHeight);
    fogGradientBottom.addColorStop(0, 'rgba(40,0,0,0.98)');
    fogGradientBottom.addColorStop(0.35, 'rgba(40,0,0,0.85)');
    fogGradientBottom.addColorStop(1, 'rgba(0,0,0,0.0)');
    ctx.fillStyle = fogGradientBottom;
    ctx.fillRect(0, canvas.height - fogHeight, canvas.width, fogHeight);
    ctx.restore();

    if (!visitorStageActive) {
      try {
        drawMissionBriefInArena();
      } catch (e) {}
    }

    if (!graceRushBlackout && !(graceRushHardBlackoutTimer > 0)) {
      // Floating damage numbers, power-up labels, etc.
      try {
        drawFloatingTextsOverlay(ctx);
      } catch (e) {}
      try {
        drawEnemyHpLabelsOverlay(ctx);
      } catch (e) {}
    }

    if (
      damageHitFlash > 0 &&
      player &&
      player.state !== "death" &&
      !gameOver &&
      !postDeathSequenceActive &&
      heroLives > 0
    ) {
      ctx.save();
      ctx.fillStyle = `rgba(255, 45, 75, ${Math.min(0.55, damageHitFlash * 2)})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    if (actBreakFadeAlpha > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(0.5, actBreakFadeAlpha * 0.5)})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
    if (!congregationAnnouncementActive && graceRushFadeAlpha > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(1, graceRushFadeAlpha)})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
    if (!congregationAnnouncementActive && graceRushBlackout) {
      ctx.save();
      ctx.fillStyle = "rgba(0, 0, 0, 1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    const playerDeathFadeAlpha = requireBindings().playerDeathFadeAlpha || 0;
    if (playerDeathFadeAlpha > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(0.5, playerDeathFadeAlpha)})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    const prayerBombFadeTimer = requireBindings().prayerBombScreenFadeTimer || 0;
    if (prayerBombFadeTimer > 0) {
      const prayerBombFadeDuration = Math.max(0.001, requireBindings().prayerBombScreenFadeDuration || 0.8);
      const maxAlpha = Math.min(0.8, Math.max(0, requireBindings().prayerBombScreenDarkenAlpha || 0.35));
      const t = Math.min(1, Math.max(0, prayerBombFadeTimer / prayerBombFadeDuration));
      const alpha = maxAlpha * t;
      if (alpha > 0) {
        ctx.save();
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }
    }

    drawWaveClearWipe(ctx, canvas, nowMs);
    drawHUD();
    const graceHudFlyEffects = requireBindings().graceHudFlyEffects;
    if (graceHudFlyEffects && graceHudFlyEffects.length) {
      ctx.save();
      graceHudFlyEffects.forEach((effect) => {
        if (!effect || !effect.frame) return;
        const size = effect.size || 16;
        ctx.globalAlpha = typeof effect.alpha === "number" ? effect.alpha : 1;
        ctx.drawImage(
          effect.frame,
          effect.x - size / 2,
          effect.y - size / 2,
          size,
          size,
        );
      });
      ctx.restore();
    }
    const powerupHudFlyEffects = requireBindings().powerupHudFlyEffects;
    if (powerupHudFlyEffects && powerupHudFlyEffects.length) {
      ctx.save();
      powerupHudFlyEffects.forEach((effect) => {
        if (!effect || !effect.image) return;
        const size = effect.size || 16;
        ctx.globalAlpha = typeof effect.alpha === "number" ? effect.alpha : 1;
        ctx.drawImage(
          effect.image,
          effect.x - size / 2,
          effect.y - size / 2,
          size,
          size,
        );
      });
      ctx.restore();
    }
    if (levelStatus?.stage === "graceRush" || graceRushState?.active) {
      drawGraceRushOverlay(levelStatus, graceRushState);
    }
    if (visitorStageActive) {
      drawVisitorOverlay(visitorSession);
    }
    drawLevelAnnouncements();
    if (isCongregationStage) {
      drawCongregationScene(levelStatus);
    }
    drawMeleeSwingOverlay(ctx, player);
    drawSpeedrunTimer();
    drawCongregationOverlay();
    // Effects are drawn earlier in the world pass so the player stays on top.
    if (paused && !gameOver) {
      drawPauseOverlay();
      return;
    }
    if (townIntroOverlay && townIntroOverlay.alpha > 0.001) {
      ctx.save();
      ctx.globalAlpha = townIntroOverlay.alpha;
      ctx.fillStyle = "#0b111a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const img = assets?.backgrounds?.townIntro || null;
      drawCoverImage(ctx, canvas, img, townIntroOverlay.scale, townIntroOverlay.focusX, townIntroOverlay.focusY);
      ctx.fillStyle = "rgba(8, 12, 20, 0.25)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    // Debug overlay (DEV-ONLY)
    const bindings = requireBindings();
    if (bindings && typeof bindings.renderDebugOverlay === "function") {
      bindings.renderDebugOverlay(ctx);
    }

  }

  function drawMeleeSwingOverlay(ctx, player) {
    if (!ctx || !player) return;
    const state = window._meleeAttackState;
    if (!state || (state.swooshTimer <= 0 && !state.isRushing && !state.rushDamageEnabled && state.spinTimer <= 0)) return;
    const bindings = requireBindings();
    const worldScale = bindings?.WORLD_SCALE ?? 1;
    const closeRange = bindings?.MELEE_CLOSE_RANGE ?? 0;
    const meleeRange = bindings?.MELEE_SWING_RANGE ?? 0;
    const assets = bindings?.assets;
    const cameraOffsetX = bindings?.cameraOffsetX || 0;
    const cameraOffsetY = bindings?.cameraOffsetY || 0;
    const shakeX = (typeof sharedShakeOffset !== "undefined" ? sharedShakeOffset.x : 0) || 0;
    const shakeY = (typeof sharedShakeOffset !== "undefined" ? sharedShakeOffset.y : 0) || 0;
    const swooshImg = assets?.effects?.meleeSwoosh;
    const showMeleeHitboxDebug =
      typeof window !== "undefined"
        ? window.BattlechurchHitboxDebug?.playerMelee === true
        : false;
    const slashHitbox = player?.config?.weaponHitbox || null;
    const dashSlashHitbox = player?.config?.dashSlashHitbox || slashHitbox || null;
    const rushHitbox = player?.config?.rushHitbox || null;
    const activeDebugHitbox =
      state.isRushing || state.rushDamageEnabled
        ? rushHitbox
        : state.currentAttackHitboxType === "dashSlash"
          ? dashSlashHitbox
          : slashHitbox;
    if (showMeleeHitboxDebug && meleeRange > 0) {
      const dirVec =
        (state.isRushing && state.rushDir) ||
        state.swooshDir ||
        window.Input.lastMovementDirection ||
        { x: 1, y: 0 };
      const len = Math.hypot(dirVec.x, dirVec.y) || 1;
      const normalized = { x: dirVec.x / len, y: dirVec.y / len };
      const angle = Math.atan2(normalized.y, normalized.x);
      const swooshSpread = Math.PI * 0.35 * (bindings?.MELEE_SWOOSH_ARC_SCALE ?? 1.5);
      const originX = player.x - cameraOffsetX + shakeX;
      const originY = player.y - cameraOffsetY + shakeY;
      if (
        activeDebugHitbox &&
        Number.isFinite(activeDebugHitbox.width) &&
        Number.isFinite(activeDebugHitbox.height)
      ) {
        const offsetX = Number.isFinite(activeDebugHitbox.offsetX) ? activeDebugHitbox.offsetX : 0;
        const offsetY = Number.isFinite(activeDebugHitbox.offsetY) ? activeDebugHitbox.offsetY : 0;
        ctx.save();
        ctx.translate(originX, originY);
        ctx.rotate(angle);
        ctx.fillStyle = "rgba(110, 210, 255, 0.14)";
        ctx.strokeStyle = "rgba(110, 210, 255, 0.8)";
        ctx.lineWidth = 2;
        ctx.fillRect(
          offsetX - activeDebugHitbox.width * 0.5,
          offsetY - activeDebugHitbox.height * 0.5,
          activeDebugHitbox.width,
          activeDebugHitbox.height,
        );
        ctx.strokeRect(
          offsetX - activeDebugHitbox.width * 0.5,
          offsetY - activeDebugHitbox.height * 0.5,
          activeDebugHitbox.width,
          activeDebugHitbox.height,
        );
        ctx.restore();
      }

      if (
        !activeDebugHitbox ||
        !Number.isFinite(activeDebugHitbox.width) ||
        !Number.isFinite(activeDebugHitbox.height)
      ) {
        ctx.save();
        ctx.strokeStyle = "rgba(110, 210, 255, 0.75)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(originX, originY, meleeRange, angle - Math.PI / 2, angle + Math.PI / 2);
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.fillStyle = "rgba(255, 200, 106, 0.18)";
        ctx.strokeStyle = "rgba(255, 200, 106, 0.85)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.arc(originX, originY, meleeRange, angle - swooshSpread, angle + swooshSpread);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }
    if (player.wordOfGodTimer > 0) {
      return;
    }
    if (state.spinTimer > 0) {
      if (!swooshImg) return;
      const duration = Math.max(0.001, state.spinDuration || 0.45);
      const progress = 1 - Math.min(1, state.spinTimer / duration);
      const spinDirection =
        state.spinVisualDirection ||
        ((player.facing === "left" || player.flipHorizontal === true) ? -1 : 1);
      const startAngle = -Math.PI * 0.5;
      const angle = startAngle + progress * Math.PI * 2 * spinDirection;
      const targetLength = (state.swingLength ?? MELEE_SWING_LENGTH) * worldScale;
      const arcScale = bindings?.MELEE_SWOOSH_ARC_SCALE ?? 1.5;
      const swingScale = state.swingScale ?? targetLength / Math.max(1, swooshImg.width);
      const drawWidth = swooshImg.width * swingScale;
      const drawHeight = swooshImg.height * swingScale * arcScale;
      const originX = player.x - cameraOffsetX + shakeX;
      const originY = player.y - cameraOffsetY + shakeY;
      ctx.save();
      ctx.translate(originX, originY);
      ctx.rotate(angle);
      ctx.globalAlpha = 0.75;
      ctx.drawImage(
        swooshImg,
        0,
        -drawHeight * 0.5,
        drawWidth,
        drawHeight,
      );
      ctx.restore();
      return;
    }
    if (!swooshImg) return;
    const dirVec =
      (state.isRushing && state.rushDir) ||
      state.swooshDir ||
      window.Input.lastMovementDirection ||
      { x: 1, y: 0 };
    const len = Math.hypot(dirVec.x, dirVec.y) || 1;
    const normalized = { x: dirVec.x / len, y: dirVec.y / len };
    const angle = Math.atan2(normalized.y, normalized.x);
    const activeHitbox =
      state.isRushing || state.rushDamageEnabled
        ? rushHitbox
        : state.currentAttackHitboxType === "dashSlash"
          ? dashSlashHitbox
        : slashHitbox;
    const hitboxWidth =
      activeHitbox && Number.isFinite(activeHitbox.width) && activeHitbox.width > 0
        ? activeHitbox.width
        : null;
    const hitboxHeight =
      activeHitbox && Number.isFinite(activeHitbox.height) && activeHitbox.height > 0
        ? activeHitbox.height
        : null;
    const targetLength = (state.swingLength ?? MELEE_SWING_LENGTH) * worldScale;
    const arcScale = bindings?.MELEE_SWOOSH_ARC_SCALE ?? 1.5;
    const swingScale = state.swingScale ?? targetLength / Math.max(1, swooshImg.width);
    const fallbackWidth = swooshImg.width * swingScale;
    const fallbackHeight = swooshImg.height * swingScale * arcScale;
    const drawWidth = hitboxWidth || fallbackWidth;
    const drawHeight = hitboxHeight || fallbackHeight;
    const originX = player.x - cameraOffsetX + shakeX;
    const originY = player.y - cameraOffsetY + shakeY;
    const duration = Math.max(0.001, MELEE_SWING_DURATION);
    const intensity = state.swooshTimer > 0
      ? Math.min(1, state.swooshTimer / duration)
      : 0.85;
    const rectX =
      activeHitbox && Number.isFinite(activeHitbox.offsetX)
        ? activeHitbox.offsetX - drawWidth * 0.5
        : 0;
    const rectY =
      activeHitbox && Number.isFinite(activeHitbox.offsetY)
        ? activeHitbox.offsetY - drawHeight * 0.5
        : -drawHeight * 0.5;
    ctx.save();
    ctx.translate(originX, originY);
    ctx.rotate(angle);
    ctx.globalAlpha = Math.min(0.9, 0.65 + intensity * 0.35);
    ctx.drawImage(
      swooshImg,
      rectX,
      rectY,
      drawWidth,
      drawHeight,
    );
    if (state.isRushing || state.rushDamageEnabled) {
      const frontWidth = drawWidth;
      const frontHeight = drawHeight;
      ctx.globalAlpha = Math.min(0.85, 0.45 + intensity * 0.35);
      ctx.drawImage(
        swooshImg,
        rectX + drawWidth * 0.06,
        rectY,
        frontWidth,
        frontHeight,
      );
      if (
        showMeleeHitboxDebug &&
        rushHitbox &&
        Number.isFinite(rushHitbox.width) &&
        Number.isFinite(rushHitbox.height)
      ) {
        const rectX = (Number.isFinite(rushHitbox.offsetX) ? rushHitbox.offsetX : 0) - rushHitbox.width * 0.5;
        const rectY = (Number.isFinite(rushHitbox.offsetY) ? rushHitbox.offsetY : 0) - rushHitbox.height * 0.5;
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.fillStyle = "rgba(255, 80, 120, 0.16)";
        ctx.strokeStyle = "rgba(255, 80, 120, 0.95)";
        ctx.lineWidth = 2;
        ctx.fillRect(rectX, rectY, rushHitbox.width, rushHitbox.height);
        ctx.strokeRect(rectX, rectY, rushHitbox.width, rushHitbox.height);
        ctx.restore();
      }
    }
    ctx.restore();
  }

  function drawSpeedrunTimer() {
    const { ctx, canvas, speedrunTimer } = requireBindings();
    if (!ctx || !canvas || !speedrunTimer || !speedrunTimer.visible) return;
    const formatTime = (ms) => {
      const total = Math.max(0, Math.floor(ms / 1000));
      const minutes = Math.floor(total / 60);
      const seconds = total % 60;
      return `${minutes}:${String(seconds).padStart(2, "0")}`;
    };
    const lines = [];
    lines.push(`Total: ${formatTime(speedrunTimer.totalElapsed || 0)}`);
    const sectionName = speedrunTimer.currentSection || "Section";
    lines.push(`${sectionName}: ${formatTime(speedrunTimer.sectionElapsed || 0)}`);
    const recent = Array.isArray(speedrunTimer.splits) ? speedrunTimer.splits.slice(-3) : [];
    recent.forEach((split) => {
      if (!split || !split.name) return;
      lines.push(`${split.name} ${formatTime(split.duration || 0)}`);
    });
    ctx.save();
    ctx.font = "10px 'Orbitron', sans-serif";
    ctx.fillStyle = "rgba(234, 246, 255, 0.8)";
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    const lineHeight = 12;
    const padding = 10;
    let y = canvas.height - padding;
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      ctx.fillText(line, canvas.width - padding, y);
      y -= lineHeight;
    }
    ctx.restore();
  }

  function drawCongregationOverlay() {
    const { ctx, canvas, UI_FONT_FAMILY, congregationOverlay } = requireBindings();
    if (!ctx || !canvas || !congregationOverlay?.active) return;
    const phase = congregationOverlay.phase || 0;
    const isNumberPhase = phase === 2;
    const showCountWord = phase >= 1;
    const maxWordSize = Math.min(canvas.width * 0.18, canvas.height * 0.2, 160);
    const maxNumberSize = Math.min(canvas.width * 0.35, canvas.height * 0.4, 260);
    const wordFontSize = maxWordSize;
    const numberFontSize = maxNumberSize;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#FFFFFF";
    ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const lineGap = Math.round(wordFontSize * 1.1);
    ctx.font = `900 ${Math.round(wordFontSize)}px ${UI_FONT_FAMILY}`;
    ctx.fillText("CONGREGATION", centerX, centerY - lineGap);
    if (showCountWord) {
      ctx.fillText("COUNT", centerX, centerY);
    }
    if (isNumberPhase) {
      ctx.font = `900 ${Math.round(numberFontSize)}px ${UI_FONT_FAMILY}`;
      ctx.fillText(String(congregationOverlay.countValue ?? 0), centerX, centerY + lineGap + 35);
    }
    ctx.restore();
  }

  function drawBattleNpcs(ctx, npcsToDraw, alpha = 1) {
    if (!ctx || !Array.isArray(npcsToDraw) || !npcsToDraw.length) return;
    const { visitorSession } = requireBindings();
    if (visitorSession?.active) return;
    ctx.save();
    ctx.globalAlpha *= Math.max(0, Math.min(1, alpha));
    npcsToDraw.forEach((npc) => {
      if (!npc) return;
      if (typeof npc.draw === "function") {
        npc.draw();
      }
      if (npc.state === "lostFaith") {
        drawLostFaithHighlight(ctx, npc);
      }
    });
    ctx.restore();
  }

  function drawLostFaithHighlight(ctx, npc) {
    if (!ctx || !npc) return;
    const radius = (npc.radius || 28) + 10;
    const time = typeof performance !== "undefined" ? performance.now() : Date.now();
    const pulse = (Math.sin(time * 0.006) + 1) / 2;
    ctx.save();
    ctx.strokeStyle = `rgba(255, 196, 80, ${0.35 + pulse * 0.45})`;
    ctx.lineWidth = 3 + pulse * 2;
    ctx.setLineDash([14, 8]);
    ctx.beginPath();
    ctx.arc(npc.x, npc.y, radius + pulse * 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawFloatingTextEntries(context, filterFn = null, baseAlpha = 1, options = {}) {
    const ctx = context;
    const { cameraOffsetX = 0, cameraOffsetY = 0, formatNumberWithCommas } = requireBindings();
    const formatNumber =
      typeof formatNumberWithCommas === "function"
        ? formatNumberWithCommas
        : (value) => {
            const numeric = Number.isFinite(value) ? Math.round(value) : 0;
            const sign = numeric < 0 ? "-" : "";
            const digits = String(Math.abs(numeric));
            return `${sign}${digits.replace(/\\B(?=(\\d{3})+(?!\\d))/g, ",")}`;
          };
    const useWorldTransform = Boolean(options.useWorldTransform);
    ctx.save();
    if (!useWorldTransform) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    const orderedTexts = floatingTexts
      .slice()
      .sort((a, b) => (a.priority || 0) - (b.priority || 0));
    orderedTexts.forEach((ft) => {
      if (filterFn && !filterFn(ft)) return;
      let drawX = useWorldTransform
        ? ft.x
        : ft.x - cameraOffsetX + (sharedShakeOffset?.x || 0);
      const drawY = useWorldTransform
        ? ft.y
        : ft.y - cameraOffsetY + (sharedShakeOffset?.y || 0);
      ctx.save();
      const fadeLength = ft.fadeLength || ft.initialLife || 1.5;
      const remaining = typeof ft.fadeDelayRemaining === "number" ? ft.fadeDelayRemaining : 0;
      let alpha = 1;
      if (remaining <= 0) {
        alpha = Math.max(0, Math.min(1, ft.life / fadeLength));
      }
      const flashActive = Boolean(ft.floorFlash);
      let effectiveBaseAlpha = baseAlpha;
      if (flashActive) {
        effectiveBaseAlpha = 1;
        if (remaining > 0) {
          alpha = 1;
        } else {
          const time = typeof performance !== "undefined" ? performance.now() : Date.now();
          const pulse = 0.75 + 0.25 * Math.sin(time * 0.012);
          const fadeFactor = Math.max(0, Math.min(1, ft.life / fadeLength));
          alpha = pulse * fadeFactor;
        }
      }
      ctx.globalAlpha = alpha * effectiveBaseAlpha;
      const style = ft.style || (ft.speechBubble ? "speech" : "plain");
      const fontSize = style === "speech" ? 12 : ft.fontSize || 14;
      const fontWeight = ft.fontWeight || (style === "speech" ? "400" : "600");
      const fontFamily = ft.fontFamily || UI_FONT_FAMILY;
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      ctx.textAlign = "center";
      const rawText = String(ft.text ?? "");
      const textLines = rawText.split("\n");
      const lineHeight = Math.round(fontSize * 1.1);
      if (ft.clampToScreen && !useWorldTransform) {
        const maxWidth = textLines.reduce((max, line) => {
          const width = ctx.measureText(line).width;
          return Math.max(max, width);
        }, 0);
        const halfWidth = maxWidth * 0.5;
        const margin = 8;
        drawX = Math.max(margin + halfWidth, Math.min(canvas.width - margin - halfWidth, drawX));
      }
      if (style === "speech") {
        ctx.textBaseline = "middle";
        const metrics = ctx.measureText(rawText);
        const bubbleWidth = metrics.width + 10 * 2;
        const bubbleHeight = 28;
        const bubbleX = drawX - bubbleWidth / 2;
        const bubbleY = drawY - bubbleHeight - 10;
        const cornerRadius = 10;
        const theme = ft.bubbleTheme || "default";
        let fillColor = "rgba(14, 18, 28, 0.75)";
        let strokeColor = "rgba(180, 210, 255, 0.5)";
        switch (theme) {
          case "hero":
            fillColor = "rgba(14, 18, 28, 0.85)";
            strokeColor = "rgba(255, 220, 110, 0.75)";
            break;
          case "npc":
            fillColor = "rgba(24, 38, 64, 0.82)";
            strokeColor = "rgba(150, 215, 255, 0.6)";
            break;
          case "evil":
            fillColor = "rgba(40, 0, 0, 0.85)";
            strokeColor = "rgba(255, 70, 95, 0.85)";
            break;
          default:
            break;
        }
        ctx.save();
        ctx.globalAlpha = alpha * 0.9;
        ctx.fillStyle = fillColor;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bubbleX + cornerRadius, bubbleY);
        ctx.lineTo(bubbleX + bubbleWidth - cornerRadius, bubbleY);
        ctx.quadraticCurveTo(
          bubbleX + bubbleWidth,
          bubbleY,
          bubbleX + bubbleWidth,
          bubbleY + cornerRadius,
        );
        ctx.lineTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight - cornerRadius);
        ctx.quadraticCurveTo(
          bubbleX + bubbleWidth,
          bubbleY + bubbleHeight,
          bubbleX + bubbleWidth - cornerRadius,
          bubbleY + bubbleHeight,
        );
        const tailWidth = 14;
        const tailHeight = 10;
        ctx.lineTo(drawX + tailWidth / 2, bubbleY + bubbleHeight);
        ctx.lineTo(drawX, bubbleY + bubbleHeight + tailHeight);
        ctx.lineTo(drawX - tailWidth / 2, bubbleY + bubbleHeight);
        ctx.lineTo(bubbleX + cornerRadius, bubbleY + bubbleHeight);
        ctx.quadraticCurveTo(
          bubbleX,
          bubbleY + bubbleHeight,
          bubbleX,
          bubbleY + bubbleHeight - cornerRadius,
        );
        ctx.lineTo(bubbleX, bubbleY + cornerRadius);
        ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX + cornerRadius, bubbleY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = ft.color;
        ctx.fillText(rawText, drawX, bubbleY + bubbleHeight / 2);
      } else if (style === "status") {
        ctx.textBaseline = "middle";
        const paddingX = 14;
        const metrics = ctx.measureText(rawText);
        const width = metrics.width + paddingX * 2;
        const height = 24;
        const rectX = drawX - width / 2;
        const rectY = drawY - height / 2;
        const radius = 12;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = ft.bgColor || "rgba(38, 52, 70, 0.9)";
        ctx.strokeStyle = "rgba(120, 180, 255, 0.55)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(rectX + radius, rectY);
        ctx.lineTo(rectX + width - radius, rectY);
        ctx.quadraticCurveTo(rectX + width, rectY, rectX + width, rectY + radius);
        ctx.lineTo(rectX + width, rectY + height - radius);
        ctx.quadraticCurveTo(
          rectX + width,
          rectY + height,
          rectX + width - radius,
          rectY + height,
        );
        ctx.lineTo(rectX + radius, rectY + height);
        ctx.quadraticCurveTo(rectX, rectY + height, rectX, rectY + height - radius);
        ctx.lineTo(rectX, rectY + radius);
        ctx.quadraticCurveTo(rectX, rectY, rectX + radius, rectY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = ft.color;
        ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
        ctx.lineWidth = 2;
        ctx.strokeText(rawText, drawX, drawY);
        ctx.fillText(rawText, drawX, drawY);
      } else {
        let perspectiveStrength = Number.isFinite(ft.floorPerspective)
          ? Math.max(0, Math.min(0.6, ft.floorPerspective))
          : 0;
        if (perspectiveStrength > 0 && ft.floorPerspectiveAuto) {
          const base = Number.isFinite(ft.floorPerspectiveBase) ? ft.floorPerspectiveBase : 64;
          const scale = base > 0 ? fontSize / base : 1;
          const scaled = Math.max(0.8, Math.min(1.6, scale));
          perspectiveStrength = Math.max(0, Math.min(0.6, perspectiveStrength * scaled));
        }
        const applyPerspective = ft.floorLayer && perspectiveStrength > 0;
        const rotateAngle = ft.floorLayer && Number.isFinite(ft.floorRotate)
          ? ft.floorRotate
          : 0;
        const applyRotate = Boolean(rotateAngle);
        const pitchStrength = ft.floorLayer && Number.isFinite(ft.floorPitch)
          ? Math.max(0, Math.min(0.6, ft.floorPitch))
          : 0;
        const pitchShear = ft.floorLayer && Number.isFinite(ft.floorShear)
          ? ft.floorShear
          : 0;
        const applyPitch = pitchStrength > 0;
        ctx.textBaseline = textLines.length > 1 ? "middle" : "alphabetic";
        ctx.fillStyle = ft.color;
        const drawOutline = ft.noStroke !== true;
        if (drawOutline) {
          ctx.strokeStyle = "rgba(0, 0, 0, 0.9)";
          ctx.lineWidth = 2;
        }
        if (textLines.length > 1) {
          const scaledLineHeight = lineHeight;
          const totalHeight = scaledLineHeight * textLines.length;
          const startY = drawY - totalHeight / 2 + scaledLineHeight / 2;
          if (applyPitch) {
            const pitchScaleY = 1 - pitchStrength;
            ctx.save();
            ctx.translate(drawX, drawY);
            ctx.transform(1, pitchShear, 0, pitchScaleY, 0, 0);
            textLines.forEach((line, index) => {
              const lineY = (startY + index * scaledLineHeight) - drawY;
              if (drawOutline) ctx.strokeText(line, 0, lineY);
              ctx.fillText(line, 0, lineY);
            });
            ctx.restore();
          } else if (applyRotate) {
            ctx.save();
            ctx.translate(drawX, drawY);
            ctx.rotate(rotateAngle);
            textLines.forEach((line, index) => {
              const lineY = (startY + index * scaledLineHeight) - drawY;
              if (applyPerspective) {
                const t = textLines.length > 1 ? index / (textLines.length - 1) : 1;
                const lineScaleX = 1 - (1 - t) * perspectiveStrength;
                const lineScaleY = 1 - (1 - t) * perspectiveStrength;
                ctx.save();
                ctx.translate(0, lineY);
                ctx.scale(lineScaleX, lineScaleY);
                if (drawOutline) ctx.strokeText(line, 0, 0);
                ctx.fillText(line, 0, 0);
                ctx.restore();
              } else {
                if (drawOutline) ctx.strokeText(line, 0, lineY);
                ctx.fillText(line, 0, lineY);
              }
            });
            ctx.restore();
          } else {
            textLines.forEach((line, index) => {
              const lineY = startY + index * scaledLineHeight;
              if (applyPerspective) {
                const t = textLines.length > 1 ? index / (textLines.length - 1) : 1;
                const lineScaleX = 1 - (1 - t) * perspectiveStrength;
                const lineScaleY = 1 - (1 - t) * perspectiveStrength;
                ctx.save();
                ctx.translate(drawX, lineY);
                ctx.scale(lineScaleX, lineScaleY);
                if (drawOutline) ctx.strokeText(line, 0, 0);
                ctx.fillText(line, 0, 0);
                ctx.restore();
              } else {
                if (drawOutline) ctx.strokeText(line, drawX, lineY);
                ctx.fillText(line, drawX, lineY);
              }
            });
          }
        } else {
          if (applyPitch) {
            const pitchScaleY = 1 - pitchStrength;
            ctx.save();
            ctx.translate(drawX, drawY);
            ctx.transform(1, pitchShear, 0, pitchScaleY, 0, 0);
            if (drawOutline) ctx.strokeText(rawText, 0, 0);
            ctx.fillText(rawText, 0, 0);
            ctx.restore();
          } else if (applyPerspective) {
            const lineScaleX = 1 - perspectiveStrength * 0.6;
            const lineScaleY = 1 - perspectiveStrength;
            ctx.save();
            ctx.translate(drawX, drawY);
            if (applyRotate) ctx.rotate(rotateAngle);
            ctx.scale(lineScaleX, lineScaleY);
            if (drawOutline) ctx.strokeText(rawText, 0, 0);
            ctx.fillText(rawText, 0, 0);
            ctx.restore();
          } else {
            if (applyRotate) {
              ctx.save();
              ctx.translate(drawX, drawY);
              ctx.rotate(rotateAngle);
              if (drawOutline) ctx.strokeText(rawText, 0, 0);
              ctx.fillText(rawText, 0, 0);
              ctx.restore();
            } else {
              if (drawOutline) ctx.strokeText(rawText, drawX, drawY);
              ctx.fillText(rawText, drawX, drawY);
            }
          }
        }
      }
      ctx.restore();
    });
    ctx.restore();
  }

  function drawFloatingTextsOverlay(context) {
    drawFloatingTextEntries(context, (ft) => !ft?.floorLayer, 1);
  }

  function drawFloorTextsOverlay(context) {
    context.save();
    context.globalCompositeOperation = "screen";
    drawFloatingTextEntries(context, (ft) => Boolean(ft?.floorLayer), 0.85, { useWorldTransform: true });
    context.restore();
  }

  function drawEnemyHpLabelsOverlay(context) {
    const ctx = context;
    if (!showEnemyDevLabels) return;
    if (!ctx || !enemyHpLabels.length) return;
    const { cameraOffsetX = 0, cameraOffsetY = 0 } = requireBindings();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.font = "600 16px 'Orbitron', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
    ctx.lineWidth = 2;
    enemyHpLabels.forEach((entry) => {
      const drawX = entry.x - cameraOffsetX + (sharedShakeOffset?.x || 0);
      const drawY = entry.y - cameraOffsetY + (sharedShakeOffset?.y || 0);
      const label = formatNumber(entry.hp || 0);
      ctx.strokeText(label, drawX, drawY);
      ctx.fillStyle = "#ff6b6b";
      ctx.fillText(label, drawX, drawY);
    });
    ctx.restore();
  }
  function drawCannonSplashDebug(ctx, x, y, radius) {
    if (!ctx || !showCannonSplashRadius) return;
    if (!(radius > 0) || !Number.isFinite(radius)) return;
    ctx.save();
    ctx.strokeStyle = "rgba(255, 230, 80, 0.7)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 5]);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  function drawCannonSplashDebug(ctx, player, radius) {
    if (!ctx || !player || !showCannonSplashRadius) return;
    if (!(radius > 0)) return;
    ctx.save();
    ctx.strokeStyle = "rgba(255, 230, 80, 0.8)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.arc(player.x, player.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  function drawFrame() {
    drawGame();
  }

  window.Renderer = {
    initialize,
    drawFrame,
    drawCountdownOverlay,
    drawChurchUpgradeScreen,
  };
})(typeof window !== "undefined" ? window : null);
