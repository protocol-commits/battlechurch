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
  const cloudAvatarState = {
    url: null,
    img: null,
    loaded: false,
    failed: false,
  };

  function requireBindings() {
    if (!bindings) {
      throw new Error("Renderer.initialize must be called before rendering.");
    }
    return bindings;
  }

  const KEYBOARD_CONTROLS_HINT =
    "Keyboard: Navigation/Movement: WASD | Action Buttons: Left, Down, Right | Select: Space | Back: Esc";
  const XBOX_CONTROLS_HINT =
    "Xbox: Navigation/Movement: Left Stick or D-Pad | Action Buttons: A, B, RB | Select: A | Back: B";

  function getControlsHintText() {
    return window?.Input?.gamepadState?.connected ? XBOX_CONTROLS_HINT : KEYBOARD_CONTROLS_HINT;
  }

  function drawFooterControlsHint(ctx, hintX, hintY, fontFamily, alpha = 1) {
    if (!ctx) return;
    const hintAlpha = Math.max(0, Math.min(1, Number(alpha) || 0));
    if (hintAlpha <= 0.001) return;
    const controlsHint = getControlsHintText();
    ctx.save();
    ctx.globalAlpha = hintAlpha;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = `500 11px ${fontFamily}`;
    ctx.fillStyle = "rgba(231, 176, 102, 0.72)";
    ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
    ctx.shadowBlur = 2;
    ctx.shadowOffsetY = 0;
    ctx.fillText(controlsHint, hintX, hintY);
    const nowSec = (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000;
    const shimmerCycleSec = 4.8;
    const shimmerWindowSec = 0.95;
    const cycleTime = nowSec % shimmerCycleSec;
    if (cycleTime <= shimmerWindowSec) {
      const progress = cycleTime / shimmerWindowSec;
      const intensity = Math.sin(progress * Math.PI);
      const hintWidth = ctx.measureText(controlsHint).width;
      const sweepCenterX = hintX - hintWidth * 0.72 + progress * hintWidth * 1.44;
      const sweepGradient = ctx.createLinearGradient(
        sweepCenterX - 90,
        0,
        sweepCenterX + 90,
        0
      );
      sweepGradient.addColorStop(0, "rgba(255, 255, 255, 0)");
      sweepGradient.addColorStop(0.5, `rgba(255, 244, 210, ${0.5 * intensity})`);
      sweepGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.save();
      ctx.fillStyle = sweepGradient;
      ctx.shadowColor = "rgba(255, 214, 148, 0.6)";
      ctx.shadowBlur = 6 * intensity;
      ctx.fillText(controlsHint, hintX, hintY);
      ctx.restore();
    }
    ctx.restore();
  }

  function drawCloudProfileAvatar(ctx, x, y, size, photoUrl) {
    if (!ctx) return;
    const half = size * 0.5;
    const corner = Math.max(6, Math.round(size * 0.2));
    const left = x - half;
    const top = y - half;
    const safeUrl = typeof photoUrl === "string" && photoUrl.trim() ? photoUrl.trim() : null;
    if (safeUrl && cloudAvatarState.url !== safeUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      cloudAvatarState.url = safeUrl;
      cloudAvatarState.img = img;
      cloudAvatarState.loaded = false;
      cloudAvatarState.failed = false;
      img.onload = () => {
        cloudAvatarState.loaded = true;
      };
      img.onerror = () => {
        cloudAvatarState.failed = true;
      };
      img.src = safeUrl;
    } else if (!safeUrl && cloudAvatarState.url) {
      cloudAvatarState.url = null;
      cloudAvatarState.img = null;
      cloudAvatarState.loaded = false;
      cloudAvatarState.failed = false;
    }

    ctx.save();
    ctx.fillStyle = "rgba(17, 15, 20, 0.95)";
    roundRect(ctx, left, top, size, size, corner, true, false);

    const canDrawPhoto = safeUrl && cloudAvatarState.loaded && cloudAvatarState.img;
    if (canDrawPhoto) {
      ctx.save();
      roundRect(ctx, left + 1, top + 1, size - 2, size - 2, Math.max(4, corner - 1), false, false);
      ctx.clip();
      ctx.drawImage(cloudAvatarState.img, left, top, size, size);
      ctx.restore();
    } else {
      ctx.fillStyle = safeUrl ? "rgba(74, 56, 40, 0.96)" : "rgba(52, 48, 58, 0.96)";
      roundRect(ctx, left + 1, top + 1, size - 2, size - 2, Math.max(4, corner - 1), true, false);
      ctx.fillStyle = "rgba(245, 224, 182, 0.95)";
      ctx.font = `700 ${Math.max(10, Math.round(size * 0.42))}px ${UI_FONT_FAMILY}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("G", x, y + 1);
    }

    ctx.strokeStyle = "rgba(242, 200, 125, 0.72)";
    ctx.lineWidth = 1.6;
    roundRect(ctx, left + 0.8, top + 0.8, size - 1.6, size - 1.6, Math.max(4, corner - 1), false, true);
    ctx.restore();
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

  function buildRecapInviteBubble(excludedNames = []) {
    const bindings = requireBindings();
    const picker = typeof bindings.getOffscreenNpcInviteName === "function"
      ? bindings.getOffscreenNpcInviteName
      : null;
    const invitedName = picker ? picker(excludedNames) : null;
    if (!invitedName) return null;
    return {
      invitedName,
      text: `I'm going invite ${invitedName}.`,
    };
  }

  function buildRecapFollowupInviteBubble(invitedNames = [], excludedNames = []) {
    const candidates = (Array.isArray(invitedNames) ? invitedNames : []).filter(Boolean);
    if (!candidates.length) return null;
    const primaryName = candidates[Math.floor(Math.random() * candidates.length)] || null;
    if (!primaryName) return null;
    const bindings = requireBindings();
    const picker = typeof bindings.getOffscreenNpcInviteName === "function"
      ? bindings.getOffscreenNpcInviteName
      : null;
    const plusExcluded = [primaryName, ...excludedNames];
    const extraName = picker ? picker(plusExcluded) : null;
    if (!extraName) return null;
    return {
      primaryName,
      extraName,
      text: `${primaryName} is also bringing ${extraName}.`,
    };
  }

  function pushRecapInviteBubble(text, x, y) {
    if (!text || !Number.isFinite(x) || !Number.isFinite(y)) return;
    recapTallyState.inviteBubbles.push({
      text,
      x,
      y,
      life: 2.8,
      maxLife: 2.8,
    });
  }

  function updateRecapInviteBubbles(dt) {
    if (!recapTallyState.inviteBubbles.length) return;
    for (let i = recapTallyState.inviteBubbles.length - 1; i >= 0; i -= 1) {
      const bubble = recapTallyState.inviteBubbles[i];
      bubble.life = Math.max(0, (bubble.life || 0) - dt);
      bubble.y -= dt * 6;
      if (bubble.life <= 0) {
        recapTallyState.inviteBubbles.splice(i, 1);
      }
    }
  }

  function drawRecapInviteBubbles(ctx) {
    if (!recapTallyState.inviteBubbles.length) return;
    const now_b = typeof performance !== "undefined" ? performance.now() : Date.now();
    const pulseSpeed = 0.004;
    const stylePulse = 0.55 + 0.45 * Math.sin(now_b * pulseSpeed);
    const fillColor = "rgba(10, 28, 58, 0.92)";
    const strokeColor = `rgba(${Math.round(120 + 100 * stylePulse)}, ${Math.round(200 + 55 * stylePulse)}, 255, ${0.7 + 0.3 * stylePulse})`;
    const shadowCol = `rgba(100, 200, 255, ${0.5 + 0.5 * stylePulse})`;
    const cornerRadius = 10;
    const tailWidth = 14;
    const tailHeight = 10;
    const padX = 10;
    recapTallyState.inviteBubbles.forEach((bubble) => {
      const fadeAlpha = Math.max(0, Math.min(1, (bubble.life || 0) / Math.max(0.001, bubble.maxLife || 1)));
      if (fadeAlpha <= 0) return;
      const text = bubble.text || "";
      ctx.save();
      ctx.font = `600 13px ${ANNOUNCEMENT_FONT_FAMILY}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const textWidth = ctx.measureText(text).width;
      const bubbleWidth = textWidth + padX * 2;
      const bubbleHeight = 30;
      const bubbleX = bubble.x - bubbleWidth / 2;
      const bubbleY = bubble.y - bubbleHeight - 10;
      ctx.globalAlpha = fadeAlpha * 0.9;
      ctx.fillStyle = fillColor;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = shadowCol;
      ctx.shadowBlur = 8 + 10 * stylePulse;
      ctx.beginPath();
      ctx.moveTo(bubbleX + cornerRadius, bubbleY);
      ctx.lineTo(bubbleX + bubbleWidth - cornerRadius, bubbleY);
      ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY, bubbleX + bubbleWidth, bubbleY + cornerRadius);
      ctx.lineTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight - cornerRadius);
      ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight, bubbleX + bubbleWidth - cornerRadius, bubbleY + bubbleHeight);
      ctx.lineTo(bubble.x + tailWidth / 2, bubbleY + bubbleHeight);
      ctx.lineTo(bubble.x, bubbleY + bubbleHeight + tailHeight);
      ctx.lineTo(bubble.x - tailWidth / 2, bubbleY + bubbleHeight);
      ctx.lineTo(bubbleX + cornerRadius, bubbleY + bubbleHeight);
      ctx.quadraticCurveTo(bubbleX, bubbleY + bubbleHeight, bubbleX, bubbleY + bubbleHeight - cornerRadius);
      ctx.lineTo(bubbleX, bubbleY + cornerRadius);
      ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX + cornerRadius, bubbleY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.font = `600 13px ${ANNOUNCEMENT_FONT_FAMILY}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.globalAlpha = fadeAlpha;
      ctx.fillStyle = "#EAF6FF";
      ctx.strokeStyle = "rgba(8, 12, 20, 0.8)";
      ctx.lineWidth = 3;
      ctx.lineJoin = "round";
      ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 1;
      const textY = bubbleY + bubbleHeight / 2 + 1;
      ctx.strokeText(text, bubble.x, textY);
      ctx.fillText(text, bubble.x, textY);
      ctx.restore();
    });
  }

  function ensureRecapBonusNpcs() {
    if (Array.isArray(recapTallyState.invitedProfiles) && recapTallyState.invitedProfiles.length) {
      return recapTallyState.invitedProfiles;
    }
    if (Array.isArray(recapTallyState.bonusNpcs) && recapTallyState.bonusNpcs.length) {
      return recapTallyState.bonusNpcs;
    }
    const congregationMembers = Array.isArray(requireBindings().congregationMembers)
      ? requireBindings().congregationMembers.filter(Boolean)
      : [];
    if (!congregationMembers.length) {
      recapTallyState.bonusNpcs = [];
      return recapTallyState.bonusNpcs;
    }
    const shuffled = congregationMembers.slice().sort(() => Math.random() - 0.5);
    recapTallyState.bonusNpcs = shuffled.slice(0, Math.min(3, shuffled.length));
    return recapTallyState.bonusNpcs;
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
    if (player) {
      const anchorX = player.x;
      const anchorY = player.y - (player.radius || 24) * 0.18;
      const dx = haloState.x - anchorX;
      const dy = haloState.y - anchorY;
      const dist = Math.hypot(dx, dy);
      if (dist > 2) {
        const nx = dx / dist;
        const ny = dy / dist;
        const px = -ny;
        const py = nx;
        const clearance = 15;
        const ropeStartX = anchorX + nx * clearance;
        const ropeStartY = anchorY + ny * clearance;
        const ropeDist = Math.max(0, dist - clearance);
        if (ropeDist > 1) {
          const pulse = 0.65 + 0.35 * Math.sin(((typeof performance !== "undefined" ? performance.now() : Date.now()) * 0.001) * 9);
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha *= 0.85 * fadeAlpha;
          ctx.lineCap = "round";
          const outerGradient = ctx.createLinearGradient(ropeStartX, ropeStartY, haloState.x, haloState.y);
          outerGradient.addColorStop(0, "rgba(255, 210, 125, 0.00)");
          outerGradient.addColorStop(0.18, "rgba(255, 210, 125, 0.45)");
          outerGradient.addColorStop(1, "rgba(255, 210, 125, 0.72)");
          const innerAlpha = (0.32 * pulse).toFixed(3);
          const innerGradient = ctx.createLinearGradient(ropeStartX, ropeStartY, haloState.x, haloState.y);
          innerGradient.addColorStop(0, "rgba(255, 245, 180, 0.00)");
          innerGradient.addColorStop(0.18, `rgba(255, 245, 180, ${(0.22 * pulse).toFixed(3)})`);
          innerGradient.addColorStop(1, `rgba(255, 245, 180, ${innerAlpha})`);
          ctx.shadowColor = "#FFDFA8";
          ctx.shadowBlur = 18;
          ctx.strokeStyle = outerGradient;
          ctx.lineWidth = 3.2;
          ctx.beginPath();
          ctx.moveTo(ropeStartX, ropeStartY);
          ctx.lineTo(haloState.x, haloState.y);
          ctx.stroke();
          ctx.shadowBlur = 28;
          ctx.strokeStyle = innerGradient;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(ropeStartX + px * 1.1, ropeStartY + py * 1.1);
          ctx.lineTo(haloState.x + px * 1.1, haloState.y + py * 1.1);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(ropeStartX - px * 1.1, ropeStartY - py * 1.1);
          ctx.lineTo(haloState.x - px * 1.1, haloState.y - py * 1.1);
          ctx.stroke();
          ctx.restore();
        }
      }
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

  function drawShieldTrail(ctx, trailState) {
    if (!trailState || !trailState.active) return;
    const { player } = requireBindings();
    if (!player) return;
    if (!Array.isArray(trailState.trail) || trailState.trail.length < 2) return;
    const shieldDuration = player.shieldDuration || 9;
    const shieldTimer = player.shieldTimer || 0;
    const fadeAlpha = shieldTimer > 0
      ? Math.max(0.15, Math.min(1, (shieldTimer / shieldDuration) * 1.4))
      : 1.0;
    const now = (typeof performance !== "undefined" ? performance.now() : Date.now()) * 0.001;
    // Outer glow pass
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha *= fadeAlpha;
    ctx.shadowColor = "#FFE45C";
    ctx.shadowBlur = 14;
    ctx.lineCap = "round";
    ctx.beginPath();
    trailState.trail.forEach((point, idx) => {
      const jitter = Math.sin(now * 16 + idx * 1.1) * 1.2;
      const wx = player.x + point.offX + jitter;
      const wy = player.y + point.offY - jitter;
      if (idx === 0) ctx.moveTo(wx, wy);
      else ctx.lineTo(wx, wy);
    });
    ctx.strokeStyle = "#FFD94A";
    ctx.lineWidth = 5;
    ctx.stroke();
    // Inner bright core pass
    ctx.beginPath();
    trailState.trail.forEach((point, idx) => {
      const jitter = Math.sin(now * 16 + idx * 1.1) * 0.6;
      const wx = player.x + point.offX + jitter;
      const wy = player.y + point.offY - jitter;
      if (idx === 0) ctx.moveTo(wx, wy);
      else ctx.lineTo(wx, wy);
    });
    ctx.strokeStyle = "#FFF7A8";
    ctx.lineWidth = 2.2;
    ctx.stroke();
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
    inviteBubbles: [],
    invitedNames: [],
    invitedProfiles: [],
    followupInvite: null,
    visitorProfilesAnim: null,
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
    titleLineSizes = null,
    titleLineGap = 0,
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
    const effectiveTitleLineSizes = Array.isArray(titleLineSizes) && titleLineSizes.length
      ? titleLineSizes.map((size) => Math.round(size * scaleHint))
      : null;
    const effectiveTitleLineGap = Math.round(titleLineGap * scaleHint);
    const effectiveSubtitleSize = Math.round(subtitleSize * scaleHint);
    const effectiveLineGap = Math.round(lineGap * scaleHint);
    const maxWidth = canvas.width * maxWidthScale;
    ctx.save();
    ctx.font = `${weight} ${effectiveTitleSize}px ${ANNOUNCEMENT_FONT_FAMILY}`;
    const titleLines = title ? wrapAnnouncementText(ctx, title, maxWidth) : [];
    const subtitleLines = subtitle ? wrapAnnouncementText(ctx, subtitle, maxWidth) : [];
    ctx.restore();
    const titleLineHeights = titleLines.map((_, index) => {
      const lineSize = effectiveTitleLineSizes?.[Math.min(index, effectiveTitleLineSizes.length - 1)]
        || effectiveTitleSize;
      const baseHeight = Math.round(lineSize * TEXT_STYLES.h2.lineHeight);
      const isLast = index >= titleLines.length - 1;
      return baseHeight + (isLast ? 0 : effectiveTitleLineGap);
    });
    const titleLineHeight = titleLineHeights[0] || Math.round(effectiveTitleSize * TEXT_STYLES.h2.lineHeight);
    const lastTitleLineHeight = titleLineHeights[titleLineHeights.length - 1] || titleLineHeight;
    const subtitleLineHeight = Math.round(effectiveSubtitleSize * TEXT_STYLES.body.lineHeight);
    const gapAfterTitle = subtitleLines.length ? Math.max(0, effectiveLineGap - lastTitleLineHeight) : 0;
    const textBlockHeight =
      titleLineHeights.reduce((sum, height) => sum + height, 0) +
      gapAfterTitle +
      subtitleLines.length * subtitleLineHeight;
    return {
      effectiveTitleSize,
      effectiveTitleLineSizes,
      effectiveTitleLineGap,
      effectiveSubtitleSize,
      effectiveLineGap,
      titleLines,
      subtitleLines,
      titleLineHeight,
      titleLineHeights,
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
      titleLineSizes = null,
      titleLineGap = 0,
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
      titleLineSizes,
      titleLineGap,
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
    eyebrowText = "",
    eyebrowSize = Math.max(11, Math.round(TEXT_STYLES.body.size * 0.52)),
    eyebrowWeight = 700,
    eyebrowColor = "rgba(231, 196, 126, 0.92)",
    eyebrowGap = 18,
    yBase,
    alpha = 1,
    titleSize = TEXT_STYLES.h2.size,
    titleLineSizes = null,
    titleLineGap = 0,
    titleLineEmphasis = null,
    titleStrokeColor = null,
    titleStrokeWidth = 0,
    subtitleSize = TEXT_STYLES.body.size,
    lineGap = Math.round(TEXT_STYLES.h2.size * TEXT_STYLES.h2.lineHeight),
    weight = TEXT_STYLES.h2.weight,
    subtitleWeight = TEXT_STYLES.body.weight,
    typewriter = false,
    typewriterRateMs = 18,
    freezeTypewriter = false,
    highlight = null,
    textPalette = null,
    maxWidthScale = 0.96,
    blockAlign = "center",
    subtitleOffsetY = 0,
  }) {
    const scaleHint = Math.min(
      1,
      Math.max(0.6, Math.min(canvas.width / 1280, canvas.height / 720)),
    );
    const effectiveTitleSize = Math.round(titleSize * scaleHint);
    const effectiveEyebrowSize = Math.round(eyebrowSize * scaleHint);
    const effectiveEyebrowGap = Math.round(eyebrowGap * scaleHint);
    const effectiveTitleLineSizes = Array.isArray(titleLineSizes) && titleLineSizes.length
      ? titleLineSizes.map((size) => Math.round(size * scaleHint))
      : null;
    const effectiveTitleLineGap = Math.round(titleLineGap * scaleHint);
    const effectiveSubtitleSize = Math.round(subtitleSize * scaleHint);
    const effectiveLineGap = Math.round(lineGap * scaleHint);
    const effectiveSubtitleOffsetY = Math.round(subtitleOffsetY * scaleHint);
    // "Announcement Text" refers to this renderer's font/size/wrap style.
    // "Announcement Text Engine" means this renderer at full-width on the main canvas.
    const wrapText = (text, maxWidth) => wrapAnnouncementText(ctx, text, maxWidth);
    const titleColor = textPalette?.title || "#EAF6FF";
    const subtitleColor = textPalette?.subtitle || titleColor;
    const shadowColor = textPalette?.shadow || "rgba(6, 10, 18, 0.85)";
    ctx.save();
    ctx.globalAlpha = 0.98 * alpha;
    ctx.fillStyle = titleColor;
    ctx.font = `${weight} ${effectiveTitleSize}px ${ANNOUNCEMENT_FONT_FAMILY}`;
    ctx.shadowColor = shadowColor;
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
    ctx.font = `${weight} ${effectiveTitleSize}px ${ANNOUNCEMENT_FONT_FAMILY}`;
    const titleLines = titleText ? wrapText(titleText, maxWidth) : [];
    ctx.font = `${subtitleWeight} ${effectiveSubtitleSize}px ${ANNOUNCEMENT_FONT_FAMILY}`;
    const subtitleLines = subtitleText ? wrapText(subtitleText, maxWidth) : [];
    const titleLineHeights = titleLines.map((_, index) => {
      const lineSize = effectiveTitleLineSizes?.[Math.min(index, effectiveTitleLineSizes.length - 1)]
        || effectiveTitleSize;
      const baseHeight = Math.round(lineSize * TEXT_STYLES.h2.lineHeight);
      const isLast = index >= titleLines.length - 1;
      return baseHeight + (isLast ? 0 : effectiveTitleLineGap);
    });
    const titleLineHeight = titleLineHeights[0] || Math.round(effectiveTitleSize * TEXT_STYLES.h2.lineHeight);
    const lastTitleLineHeight = titleLineHeights[titleLineHeights.length - 1] || titleLineHeight;
    const subtitleLineHeight = Math.round(effectiveSubtitleSize * TEXT_STYLES.body.lineHeight);
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
      const dt = freezeTypewriter ? 0 : Math.max(0, now - (entry.lastTime || now));
      // Always advance lastTime so hidden/frozen periods don't "catch up" instantly.
      entry.lastTime = now;
      const revealRate = Math.max(1, Number(typewriterRateMs) || 18);
      const titleRate = revealRate;
      const subtitleRate = revealRate;
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
      const fullTitleWidths = titleLines.map((line, index) => {
        const lineSize = effectiveTitleLineSizes?.[Math.min(index, effectiveTitleLineSizes.length - 1)]
          || effectiveTitleSize;
        ctx.font = `${weight} ${lineSize}px ${ANNOUNCEMENT_FONT_FAMILY}`;
        return ctx.measureText(line).width || 0;
      });
      const titleBlockWidth = fullTitleWidths.length ? Math.max(...fullTitleWidths) : 0;
      titleX = canvas.width / 2 - titleBlockWidth / 2;
    }
    let remainingTitle = displayTitle.length;
    let currentY = yBase;
    const eyebrowLabel = String(eyebrowText || "").trim();
    if (eyebrowLabel) {
      const eyebrowLineHeight = Math.round(effectiveEyebrowSize * 1.2);
      const eyebrowY = yBase - eyebrowLineHeight - effectiveEyebrowGap;
      ctx.font = `${eyebrowWeight} ${effectiveEyebrowSize}px ${ANNOUNCEMENT_FONT_FAMILY}`;
      ctx.fillStyle = eyebrowColor;
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = 12;
      const eyebrowLine = eyebrowLabel.toUpperCase();
      const eyebrowX = canvas.width / 2 - (ctx.measureText(eyebrowLine).width || 0) / 2;
      ctx.fillText(eyebrowLine, eyebrowX, eyebrowY);
    }
    let emphasisCarryForward = false;
    titleLines.forEach((line, index) => {
      const lineSize = effectiveTitleLineSizes?.[Math.min(index, effectiveTitleLineSizes.length - 1)]
        || effectiveTitleSize;
      const lineHeight = titleLineHeights[index] || titleLineHeight;
      ctx.font = `${weight} ${lineSize}px ${ANNOUNCEMENT_FONT_FAMILY}`;
      const rawLine = line || "";
      const visible = remainingTitle <= 0 ? "" : rawLine.slice(0, remainingTitle);
      remainingTitle = Math.max(0, remainingTitle - rawLine.length);
      if (visible) {
        const lineX = centerLines
          ? canvas.width / 2 - (ctx.measureText(rawLine).width || 0) / 2
          : titleX;
        const emphasisMatches = (() => {
          if (emphasisCarryForward) return true;
          if (!titleLineEmphasis) return false;
          if (Number.isFinite(titleLineEmphasis.lineIndex) && titleLineEmphasis.lineIndex === index) {
            return true;
          }
          if (typeof titleLineEmphasis.matchPrefix === "string" && visible.trimStart().startsWith(titleLineEmphasis.matchPrefix)) {
            return true;
          }
          if (typeof titleLineEmphasis.matchContains === "string" && visible.includes(titleLineEmphasis.matchContains)) {
            return true;
          }
          return false;
        })();
        if (emphasisMatches && titleLineEmphasis?.continueOnWrappedLines) {
          emphasisCarryForward = true;
        }
        if (emphasisMatches && titleLineEmphasis.mode === "shimmer") {
          const now = (typeof performance !== "undefined" ? performance.now() : Date.now()) * 0.001;
          const sweep = (Math.sin(now * 2.2) + 1) * 0.5;
          const pulse = 0.88 + 0.12 * Math.sin(now * 3.6);
          const lineWidth = ctx.measureText(visible).width || 1;
          const shimmerBase = titleLineEmphasis.baseColor || "#D9ECFF";
          const shimmerPeak = titleLineEmphasis.peakColor || "#FFFFFF";
          const shimmerGlow = titleLineEmphasis.glowColor || "rgba(185, 225, 255, 0.95)";
          const grad = ctx.createLinearGradient(lineX, 0, lineX + lineWidth, 0);
          const left = Math.max(0, sweep - 0.22);
          const right = Math.min(1, sweep + 0.22);
          grad.addColorStop(0, shimmerBase);
          grad.addColorStop(left, shimmerBase);
          grad.addColorStop(sweep, shimmerPeak);
          grad.addColorStop(right, shimmerBase);
          grad.addColorStop(1, shimmerBase);
          ctx.fillStyle = grad;
          ctx.shadowColor = shimmerGlow;
          ctx.shadowBlur = 24 * pulse;
        } else {
          ctx.fillStyle = titleColor;
          ctx.shadowColor = shadowColor;
          ctx.shadowBlur = 20;
        }
        if (titleStrokeColor && titleStrokeWidth > 0) {
          const prevLineJoin = ctx.lineJoin;
          const prevMiterLimit = ctx.miterLimit;
          const prevStrokeStyle = ctx.strokeStyle;
          const prevLineWidth = ctx.lineWidth;
          const prevShadowColor = ctx.shadowColor;
          const prevShadowBlur = ctx.shadowBlur;
          ctx.lineJoin = "round";
          ctx.miterLimit = 2;
          ctx.strokeStyle = titleStrokeColor;
          ctx.lineWidth = titleStrokeWidth;
          ctx.shadowColor = "transparent";
          ctx.shadowBlur = 0;
          ctx.strokeText(visible, lineX, currentY);
          ctx.lineJoin = prevLineJoin;
          ctx.miterLimit = prevMiterLimit;
          ctx.strokeStyle = prevStrokeStyle;
          ctx.lineWidth = prevLineWidth;
          ctx.shadowColor = prevShadowColor;
          ctx.shadowBlur = prevShadowBlur;
        }
        ctx.fillText(visible, lineX, currentY);
      }
      currentY += lineHeight;
    });
    if (subtitleLines.length) {
      currentY += Math.max(0, effectiveLineGap - lastTitleLineHeight);
      currentY += effectiveSubtitleOffsetY;
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
          ? canvas.width / 2 - (ctx.measureText(line).width || 0) / 2
          : subtitleX;
        if (visible) {
          if (highlightStart >= 0 && highlightEnd > globalIndex && highlightStart < globalIndex + visible.length) {
            const localStart = Math.max(0, highlightStart - globalIndex);
            const localEnd = Math.min(visible.length, highlightEnd - globalIndex);
            const before = visible.slice(0, localStart);
            const mid = visible.slice(localStart, localEnd);
            const after = visible.slice(localEnd);
            let cursorX = lineBaseX;
            ctx.fillStyle = subtitleColor;
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
              ctx.fillStyle = subtitleColor;
              ctx.fillText(after, cursorX, currentY);
            }
          } else {
            ctx.fillStyle = subtitleColor;
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
      key: "line",
      label: "Rapid Fire",
      desc: "Rapid fire — keep the darkness scattered and on the run.",
      stat: "+Rate of Fire",
    },
    {
      key: "circle",
      label: "Heavy Ordnance",
      desc: "Armor-piercing bolts that cut through the heaviest resistance.",
      stat: "+Damage",
    },
    {
      key: "crescent",
      label: "Tactical Support",
      desc: "Your inner light refills faster. Hold the line longer.",
      stat: "+Prayer Meter",
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
          <span class="formation-option__desc">${escapeHtml(opt.desc || "")}</span>
          <span class="formation-option__stat"><strong>${opt.stat || ""}</strong></span>
        </button>`,
    )
    .join("");
  const bodyHtml = `
    <div class="mission-brief-prompt">How will you equip them?</div>
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
    buttonText: showFormation ? "" : "Continue",
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
    titleLineSizes = null,
    titleLineGap = 0,
    titleLineEmphasis = null,
    titleWeight = TEXT_STYLES.h1.weight,
    bodySize = TEXT_STYLES.h2.size,
    bodyWeight = TEXT_STYLES.h2.weight,
    topMargin = 90,
    maxWidthScale = 0.96,
    blockAlign = null,
    eyebrowText = "",
    eyebrowSize = 11,
    eyebrowOffset = -8,
    eyebrowColor = "rgba(231, 196, 126, 0.9)",
  } = options;
  const promptText = "How will you equip them?";
  const combinedSubtitle = showFormation
    ? (String(subtitle || "").trim().length ? `${subtitle}\n${promptText}` : promptText)
    : subtitle;
  const promptSize = 0;
  const displayButtons = showButtons !== false;
  const buttonHeight = displayButtons ? (showFormation ? 148 : 72) : 0;
  const layoutButtonCount = displayButtons ? (showFormation ? 3 : 1) : 0;
  const drawTextBackdrop = () => {
    const h = layout.virtualCanvas.height;
    const w = layout.virtualCanvas.width;
    const overlayGradient = ctx.createLinearGradient(0, 0, 0, h);
    overlayGradient.addColorStop(0, "rgba(18, 10, 8, 0.52)");
    overlayGradient.addColorStop(0.5, "rgba(10, 6, 5, 0.48)");
    overlayGradient.addColorStop(1, "rgba(18, 10, 8, 0.52)");
    ctx.save();
    ctx.fillStyle = overlayGradient;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  };
  ctx.save();
  const layout = getAnnouncementScreenLayout(ctx, canvas, {
    title,
    subtitle: combinedSubtitle,
    titleSize,
    titleLineSizes,
    titleLineGap,
    subtitleSize: bodySize,
    lineGap: Math.round(titleSize * TEXT_STYLES.h1.lineHeight),
    weight: titleWeight,
    maxWidthScale,
    position: "top",
    topMargin,
    bottomMargin: showFormation ? 70 : 100,
    rowGap: showFormation ? 52 : 60,
    buttonHeight,
    buttonCount: layoutButtonCount,
    promptSize,
    promptGap: 18,
  });
  ctx.translate(layout.offsetX, layout.offsetY);
  ctx.scale(layout.scale, layout.scale);
  let revealComplete = false;
  if (showFormation) {
    const titleLayout = getAnnouncementTextLayout(ctx, layout.virtualCanvas, {
      title,
      subtitle: "",
      titleSize,
      titleLineSizes,
      titleLineGap,
      subtitleSize: bodySize,
      lineGap: Math.round(titleSize * TEXT_STYLES.h1.lineHeight),
      weight: titleWeight,
      maxWidthScale,
    });
    const lowerLayout = getAnnouncementTextLayout(ctx, layout.virtualCanvas, {
      title: "",
      subtitle: combinedSubtitle,
      titleSize: bodySize,
      subtitleSize: bodySize,
      lineGap: Math.round(bodySize * TEXT_STYLES.h2.lineHeight),
      weight: bodyWeight,
      maxWidthScale,
    });
    const sectionGap = 22;
    const dividerGap = 10;
    const titleYBase = layout.titleY;
    const titleBlockHeight = titleLayout.textBlockHeight;
    // titleYBase is the baseline of the first line (already offset by titleLineHeight),
    // so subtract the first line height to avoid double-counting it.
    const titleBottomY = titleYBase + titleBlockHeight - (titleLayout.titleLineHeights[0] || titleLayout.titleLineHeight);
    const desiredLowerYBase = Math.round(
      titleBottomY + dividerGap + sectionGap + lowerLayout.subtitleLineHeight,
    );
    const lowerBlockBottomLimit = Math.round((layout.buttonY || layout.virtualCanvas.height) - 22);
    const maxLowerYBase = Math.round(
      lowerBlockBottomLimit - Math.max(0, lowerLayout.textBlockHeight - lowerLayout.subtitleLineHeight),
    );
    const lowerYBase = Math.round(Math.min(desiredLowerYBase, maxLowerYBase));
    const lowerSectionTopY = lowerYBase - lowerLayout.subtitleLineHeight;
    const textPanelTop = Math.round(titleYBase - titleLayout.titleLineHeight * 0.7 - 14);
    const textPanelBottom = Math.round(
      lowerYBase + Math.max(0, lowerLayout.textBlockHeight - lowerLayout.subtitleLineHeight) + 18,
    );
    drawTextBackdrop();

    if (eyebrowText) {
      const eyebrowLabel = String(eyebrowText || "").trim();
      if (eyebrowLabel) {
        const scaleHint = Math.min(
          1,
          Math.max(0.6, Math.min(layout.virtualCanvas.width / 1280, layout.virtualCanvas.height / 720)),
        );
        const effectiveEyebrowSize = Math.max(8, Math.round(eyebrowSize * scaleHint));
        const eyebrowLineHeight = Math.round(effectiveEyebrowSize * 1.18);
        const eyebrowY = Math.round(titleYBase - (titleLayout.titleLineHeight || 42) * 0.95);
        ctx.save();
        ctx.font = `700 ${effectiveEyebrowSize}px ${ANNOUNCEMENT_FONT_FAMILY}`;
        const eyebrowLines = wrapAnnouncementText(
          ctx,
          eyebrowLabel,
          titleLayout.maxWidth,
        );
        let lineY = eyebrowY - Math.round(((eyebrowLines.length - 1) * eyebrowLineHeight) / 2);
        ctx.textAlign = "center";
        eyebrowLines.forEach((line) => {
          const lineX = layout.virtualCanvas.width / 2;
          ctx.fillStyle = eyebrowColor;
          ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
          ctx.shadowBlur = 8;
          ctx.lineJoin = "round";
          ctx.miterLimit = 2;
          ctx.strokeStyle = "rgba(20, 8, 6, 0.8)";
          ctx.lineWidth = 1.4;
          ctx.strokeText(line, lineX, lineY);
          ctx.fillText(line, lineX, lineY);
          lineY += eyebrowLineHeight;
        });
        ctx.restore();
      }
    }

    drawAnnouncementText(ctx, layout.virtualCanvas, {
      title,
      subtitle: "",
      yBase: titleYBase,
      titleSize,
      titleLineSizes,
      titleLineGap,
      titleLineEmphasis,
      titleStrokeColor: "rgba(26, 10, 8, 0.92)",
      titleStrokeWidth: 2.2,
      subtitleSize: bodySize,
      weight: titleWeight,
      subtitleWeight: bodyWeight,
      lineGap: Math.round(titleSize * TEXT_STYLES.h1.lineHeight),
      alpha: 1,
      typewriter: true,
      highlight,
      textPalette: HELLFIRE_TEXT_PALETTE,
      maxWidthScale,
      blockAlign: "fullCenter",
    });

    const upperRevealComplete = isAnnouncementRevealComplete(title, "");

    if (upperRevealComplete) {
      drawAnnouncementText(ctx, layout.virtualCanvas, {
        title: "",
        subtitle: combinedSubtitle,
        yBase: lowerYBase,
        titleSize: bodySize,
        subtitleSize: bodySize,
        weight: bodyWeight,
        subtitleWeight: bodyWeight,
        lineGap: Math.round(bodySize * TEXT_STYLES.h2.lineHeight),
        alpha: 1,
        typewriter: true,
        highlight,
        textPalette: HELLFIRE_TEXT_PALETTE,
        maxWidthScale,
        blockAlign: "fullCenter",
      });
    }

    revealComplete =
      upperRevealComplete &&
      isAnnouncementRevealComplete("", combinedSubtitle);
  } else {
    const fullTextLayout = getAnnouncementTextLayout(ctx, layout.virtualCanvas, {
      title,
      subtitle: combinedSubtitle,
      titleSize,
      titleLineSizes,
      titleLineGap,
      subtitleSize: bodySize,
      lineGap: Math.round(titleSize * TEXT_STYLES.h1.lineHeight),
      weight: titleWeight,
      maxWidthScale,
    });
    const panelTop = Math.round(layout.titleY - fullTextLayout.titleLineHeight * 0.7 - 14);
    const panelBottom = Math.round(
      layout.titleY +
      Math.max(0, fullTextLayout.textBlockHeight - fullTextLayout.titleLineHeight) +
      20,
    );
    drawTextBackdrop();
    drawAnnouncementText(ctx, layout.virtualCanvas, {
      title,
      subtitle: combinedSubtitle,
      yBase: layout.titleY,
      titleSize,
      titleLineSizes,
      titleLineGap,
      titleLineEmphasis,
      titleStrokeColor: "rgba(26, 10, 8, 0.92)",
      titleStrokeWidth: 2.2,
      subtitleSize: bodySize,
      weight: titleWeight,
      subtitleWeight: bodyWeight,
      lineGap: Math.round(titleSize * TEXT_STYLES.h1.lineHeight),
      alpha: 1,
      typewriter: true,
      highlight,
      textPalette: HELLFIRE_TEXT_PALETTE,
      maxWidthScale,
      blockAlign: blockAlign || "full",
    });
    if (eyebrowText && fullTextLayout.titleLines.length >= 2) {
      const scaleHint = Math.min(
        1,
        Math.max(0.6, Math.min(layout.virtualCanvas.width / 1280, layout.virtualCanvas.height / 720)),
      );
      const secondLineBaseline = layout.titleY + (fullTextLayout.titleLineHeights[0] || fullTextLayout.titleLineHeight);
      const eyebrowY = Math.round(secondLineBaseline + eyebrowOffset * scaleHint);
      const effectiveEyebrowSize = Math.max(8, Math.round(eyebrowSize * scaleHint));
      const eyebrowLineHeight = Math.round(effectiveEyebrowSize * 1.18);
      ctx.save();
      ctx.font = `700 ${effectiveEyebrowSize}px ${ANNOUNCEMENT_FONT_FAMILY}`;
      const eyebrowLines = wrapAnnouncementText(
        ctx,
        String(eyebrowText || "").trim(),
        fullTextLayout.maxWidth,
      );
      let lineY = eyebrowY - Math.round(((eyebrowLines.length - 1) * eyebrowLineHeight) / 2);
      ctx.textAlign = "center";
      eyebrowLines.forEach((line) => {
        const lineX = layout.virtualCanvas.width / 2;
        ctx.fillStyle = eyebrowColor;
        ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
        ctx.shadowBlur = 8;
        ctx.lineJoin = "round";
        ctx.miterLimit = 2;
        ctx.strokeStyle = "rgba(20, 8, 6, 0.8)";
        ctx.lineWidth = 1.4;
        ctx.strokeText(line, lineX, lineY);
        ctx.fillText(line, lineX, lineY);
        lineY += eyebrowLineHeight;
      });
      ctx.restore();
    }
    revealComplete = isAnnouncementRevealComplete(title, combinedSubtitle);
  }
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
          key: "line",
          label: "Rapid Fire",
          desc: "Meet weekly for group Bible study.",
          stat: "+Rate of Fire",
          iconSrc: "assets/sprites/items/icons/I25_Book.png",
        },
        {
          key: "circle",
          label: "Heavy Ordnance",
          desc: "Lead a guided topical study targeting specfic issues.",
          stat: "+Damage",
          iconSrc: "assets/sprites/items/icons/I23_Scroll.png",
        },
        {
          key: "crescent",
          label: "Tactical Support",
          desc: "Organize them into a care and support group.",
          stat: "+Prayer Meter",
          iconSrc: "assets/sprites/items/icons/I41_Candle.png",
        },
      ]
    : [
        {
          key: "continue",
          label: "Continue",
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
  const { powerupIconStyles } = requireBindings();
  const formationButtonHeight = showFormation ? 148 : buttonHeight;
    buttonConfigs.forEach((config, index) => {
      const x = showFormation ? buttonStartX + index * (buttonWidth + buttonGap) : buttonStartX;
      ctx.save();
      if (showFormation) {
        const cardX = x;
        const cardY = buttonY;
        const cardW = buttonWidth;
        const cardH = formationButtonHeight;
        const cardRadius = 16;
        const headerHeight = 42;
        const baseGradient = ctx.createLinearGradient(0, cardY, 0, cardY + cardH);
        baseGradient.addColorStop(0, "#2A2118");
        baseGradient.addColorStop(0.55, "#3A2E21");
        baseGradient.addColorStop(1, "#1E1812");
        ctx.shadowColor = "rgba(8, 6, 4, 0.55)";
        ctx.shadowBlur = 16;
        ctx.shadowOffsetY = 8;
        ctx.fillStyle = baseGradient;
        roundRect(ctx, cardX, cardY, cardW, cardH, cardRadius, true, false);
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(200, 160, 90, 0.85)";
        roundRect(ctx, cardX, cardY, cardW, cardH, cardRadius, false, true);
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
        roundRect(ctx, cardX + 3, cardY + 3, cardW - 6, cardH - 6, 12, false, true);
        ctx.save();
        roundRect(ctx, cardX, cardY, cardW, cardH, cardRadius, false, false);
        ctx.clip();
        const headerGradient = ctx.createLinearGradient(0, cardY, 0, cardY + headerHeight);
        headerGradient.addColorStop(0, "#5B4328");
        headerGradient.addColorStop(1, "#3E2E1D");
        ctx.fillStyle = headerGradient;
        ctx.fillRect(cardX, cardY, cardW, headerHeight);
        ctx.fillStyle = "rgba(230, 195, 130, 0.3)";
        ctx.fillRect(cardX, cardY + headerHeight - 2, cardW, 2);
        ctx.restore();

        if (isAnnouncementButtonFocused("missionBrief", index)) {
          drawFocusRing(ctx, cardX - 3, cardY - 3, cardW + 6, cardH + 6, 20);
          drawButtonReflection(ctx, cardX, cardY, cardW, cardH, cardRadius, 0.35);
        }

        const iconImage = getChurchPowerupIcon(config.iconSrc);
        const iconSize = 30;
        drawChurchPowerupIcon(ctx, {
          x: cardX + 24,
          y: cardY + headerHeight / 2,
          size: iconSize,
          iconImage: iconImage || getUpgradeIcon("category"),
          style: powerupIconStyles?.player || CHURCH_POWERUP_ICON_DEFAULT,
        });

        const textLeft = cardX + 24 + iconSize;
        const textRight = cardX + cardW - 14;
        const textWidth = Math.max(20, textRight - textLeft);
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.font = `800 15px ${uiFontFamily}`;
        ctx.fillStyle = "#F3E2C4";
        ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
        ctx.shadowBlur = 3;
        ctx.shadowOffsetY = 1;
        ctx.fillText(config.label, textLeft, cardY + headerHeight / 2 + 1);

        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        ctx.font = `600 13px ${uiFontFamily}`;
        const descriptionLines = wrapAnnouncementText(ctx, config.desc || "", textWidth);
        ctx.fillStyle = "rgba(235, 220, 195, 0.9)";
        const descTop = cardY + headerHeight + 24;
        const descLineH = 16;
        descriptionLines.slice(0, 3).forEach((line, lineIndex) => {
          ctx.fillText(line, textLeft, descTop + lineIndex * descLineH);
        });

        const statText = config.stat || "";
        if (statText) {
          const badgePadX = 12;
          const badgeH = 24;
          ctx.font = `700 13px ${uiFontFamily}`;
          const badgeW = ctx.measureText(statText).width + badgePadX * 2;
          const badgeX = textLeft;
          const badgeY = cardY + cardH - 34;
          ctx.fillStyle = "rgba(120, 34, 34, 0.95)";
          ctx.strokeStyle = "rgba(255, 220, 170, 0.8)";
          ctx.lineWidth = 1.5;
          roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 12, true, true);
          ctx.fillStyle = "#F6E6C6";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(statText, badgeX + badgeW / 2, badgeY + badgeH / 2);
        }
      } else {
        ctx.fillStyle = getEmberButtonGradient(ctx, buttonY, buttonHeight);
        ctx.strokeStyle = EMBER_BUTTON_PALETTE.border;
        ctx.lineWidth = 2;
        roundRect(ctx, x, buttonY, buttonWidth, buttonHeight, 18, true, true);
        if (isAnnouncementButtonFocused("missionBrief", index)) {
          drawFocusRing(ctx, x - 3, buttonY - 3, buttonWidth + 6, buttonHeight + 6, 20);
          drawButtonReflection(ctx, x, buttonY, buttonWidth, buttonHeight, 18, 0.45);
        }
        ctx.fillStyle = EMBER_BUTTON_PALETTE.text;
        ctx.shadowColor = EMBER_BUTTON_PALETTE.textShadow;
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 1;
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        ctx.font = `600 24px ${uiFontFamily}`;
        ctx.fillText(config.label, x + buttonWidth / 2, buttonY + 40);
      }
      ctx.restore();

    bounds.push({
      key: config.key,
      x: layout.offsetX + x * layout.scale,
      y: layout.offsetY + buttonY * layout.scale,
      width: buttonWidth * layout.scale,
      height: (showFormation ? formationButtonHeight : buttonHeight) * layout.scale,
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
  recapTallyState.continueSfxPlayed = false;
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
  recapTallyState.inviteBubbles = [];
  recapTallyState.invitedNames = [];
  recapTallyState.invitedProfiles = [];
  recapTallyState.followupInvite = null;
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
    recapTallyState.inviteBubbles = [];
    recapTallyState.invitedNames = [];
    recapTallyState.invitedProfiles = [];
    recapTallyState.followupInvite = null;
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
  updateRecapInviteBubbles(dt);
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
        if (!recapTallyState.continueSfxPlayed && typeof window?.playRecapFinalSfx === "function") {
          window.playRecapFinalSfx(0.7);
          recapTallyState.continueSfxPlayed = true;
        }
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
          penaltyPerNpc: Math.max(
            1,
            Math.round(
              Number(current?.zeroHealthPenaltyValue) || 0,
            ) / Math.max(1, Math.round(Number(current?.zeroHealthPenaltyCount) || 0)),
          ) || 1,
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
          pendingInvite: null,
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
          anim.thresholdHoldTimer = 0.5;
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
            recapTallyState.totalValue -= Math.max(1, Math.round(anim.penaltyPerNpc || 1));
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
        if (anim.holdTimer >= 0.4) {
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
        const excludedNames = anim.entries.map((entry) => entry?.name).filter(Boolean);
        const invite = buildRecapInviteBubble(excludedNames);
        if (invite) {
          recapTallyState.invitedNames.push(invite.invitedName);
          const inviterEntry = anim.entries[Math.min(anim.entries.length - 1, Math.max(0, anim.activeNpcIndex || 0))];
          if (inviterEntry) {
            recapTallyState.invitedProfiles.push({
              name: inviterEntry.name || "",
              portrait: inviterEntry.portrait || null,
              member: null,
            });
          }
          anim.pendingInvite = {
            profileIndex: Math.min(anim.entries.length - 1, Math.max(0, anim.activeNpcIndex || 0)),
            text: invite.text,
          };
        }
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
          pendingInvite: null,
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
          anim.thresholdHoldTimer = 0.5;
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
        if (anim.holdTimer >= 0.35) {
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
        const bonusNpcs = ensureRecapBonusNpcs();
        if (bonusNpcs.length) {
          const chosenIndex = Math.floor(Math.random() * bonusNpcs.length);
          const excludedNames = bonusNpcs.map((npc) => npc?.name).filter(Boolean);
          const invite = buildRecapFollowupInviteBubble(recapTallyState.invitedNames, excludedNames);
          if (invite) {
            const inviter = bonusNpcs[chosenIndex];
            recapTallyState.followupInvite = {
              inviterName: inviter?.name || invite.primaryName,
              text: invite.text,
            };
          }
        }
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
        if (
          recapTallyState.stepIndex >= lines.length - 1 &&
          !recapTallyState.finalSfxPlayed &&
          typeof window?.playRecapFinalSfx === "function"
        ) {
          window.playRecapFinalSfx(0.7);
          recapTallyState.finalSfxPlayed = true;
        }
        recapTallyState.pauseTimer = RECAP_LINE_PAUSE;
        recapTallyState.phase = "post";
      }
      return;
    }
    if (current.kind === "visitorProfiles") {
      const entries = Array.isArray(current?.npcHealthBreakdown)
        ? current.npcHealthBreakdown
        : [];
      let anim = recapTallyState.visitorProfilesAnim;
      if (!anim || anim.index !== recapTallyState.stepIndex) {
        anim = {
          index: recapTallyState.stepIndex,
          activeProfileIndex: -1,
          holdTimer: 0,
          bumpTimer: 0,
          congregationAwarded: 0,
          lastGhostAward: 0,
          finished: false,
        };
        recapTallyState.visitorProfilesAnim = anim;
      }
      if (anim.bumpTimer > 0) anim.bumpTimer = Math.max(0, anim.bumpTimer - dt);
      if (anim.finished || !entries.length) {
        anim.finished = true;
        anim.activeProfileIndex = entries.length - 1;
        anim.congregationAwarded = entries.length;
        recapTallyState.lastAppliedIndex = recapTallyState.stepIndex;
        recapTallyState.finalSfxPlayed = true;
        recapTallyState.pauseTimer = RECAP_LINE_PAUSE;
        recapTallyState.phase = "post";
        return;
      }
      anim.holdTimer = Math.max(0, anim.holdTimer - dt);
      if (anim.holdTimer <= 0) {
        const nextIndex = anim.activeProfileIndex + 1;
        if (nextIndex >= entries.length) {
          anim.finished = true;
        } else {
          anim.activeProfileIndex = nextIndex;
          anim.holdTimer = 0.35;
          anim.bumpTimer = 0.4;
          anim.congregationAwarded = nextIndex + 1;
          if (affectsTotal) {
            recapTallyState.totalValue += 1;
            recapTallyState.flashTimer = RECAP_FLASH_DURATION;
          }
          if (typeof window?.playCongregationCountPopSfx === "function") {
            window.playCongregationCountPopSfx(0.7, "up");
          }
          if (typeof window?.playRecapFinalSfx === "function") {
            window.playRecapFinalSfx(0.65);
          }
        }
      }
      recapTallyState.lastAppliedIndex = recapTallyState.stepIndex;
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

  const titleSize = 32;
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
  const headingTitle = `${title || "Battlefield Report"}:`;
  const headingProblem =
    formatScenarioForTitle(String(recapData?.problemTitle || "").trim());
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

  const drawVisitorProfilesRow = (line, y) => {
    const PORTRAIT_CAP_VISITOR = 20;
    const allEntries = Array.isArray(line?.npcHealthBreakdown)
      ? line.npcHealthBreakdown.slice(0, PORTRAIT_CAP_VISITOR)
      : [];
    const colsPerRow = 7;
    const slotSize = 64;
    const slotGap = 16;
    const rowStride = slotSize + slotGap;
    const rowHeight = slotSize + 28; // portrait + name
    const rowGapBetween = 14;
    const rowCount = Math.max(1, Math.ceil(allEntries.length / colsPerRow));
    const totalHeight = rowCount * rowHeight + Math.max(0, rowCount - 1) * rowGapBetween;
    const labelY = y;
    ctx.fillStyle = baseLabelColor;
    drawHighlightedLabel(line.label || "", contentX, labelY, null);
    const gridTopY = labelY + 26;
    const visAnim = recapTallyState.visitorProfilesAnim;
    const activeIndex = recapTallyState.done
      ? allEntries.length
      : (visAnim?.index === recapTallyState.stepIndex
          ? Math.min(allEntries.length, visAnim.activeProfileIndex + 1)
          : 0);
    if (visAnim && visAnim.congregationAwarded > visAnim.lastGhostAward) {
      const newlyAwarded = visAnim.congregationAwarded - visAnim.lastGhostAward;
      const newestIdx = visAnim.activeProfileIndex;
      const col = newestIdx % colsPerRow;
      const row = Math.floor(newestIdx / colsPerRow);
      const popX = recapLeftColumnX + col * rowStride + slotSize / 2;
      const popY = gridTopY + row * (rowHeight + rowGapBetween);
      for (let gi = 0; gi < newlyAwarded; gi += 1) {
        spawnRecapGhostEffect("+1", popX, popY, countNumberX, countNumberY - 12);
      }
      visAnim.lastGhostAward = visAnim.congregationAwarded;
    }
    for (let i = 0; i < activeIndex; i += 1) {
      const entry = allEntries[i];
      const col = i % colsPerRow;
      const row = Math.floor(i / colsPerRow);
      const slotX = recapLeftColumnX + col * rowStride;
      const slotY = gridTopY + row * (rowHeight + rowGapBetween);
      const slotCenterX = slotX + slotSize / 2;
      const slotCenterY = slotY + slotSize / 2;
      ctx.save();
      ctx.translate(slotCenterX, slotCenterY);
      drawChurchBadgeSurface(ctx, slotSize, { shape: "square", color: "#314B77", accent: "#4769A1" });
      drawChurchBadgeShimmer(ctx, slotSize, { shape: "square", color: "#314B77", accent: "#4769A1" });
      ctx.restore();
      if (entry?.portrait) {
        const inset = 8;
        const pSize = slotSize - inset * 2;
        const pRadius = Math.max(8, Math.round(pSize * 0.16));
        const pYOffset = Math.round(pSize * 0.12);
        ctx.save();
        ctx.beginPath();
        roundRect(ctx, slotX + inset, slotY + inset, pSize, pSize, pRadius, false, false);
        ctx.clip();
        ctx.drawImage(entry.portrait, slotX + inset, slotY + inset - pYOffset, pSize, pSize);
        ctx.restore();
      }
      const nameY = slotY + slotSize + 16;
      ctx.save();
      ctx.fillStyle = "rgba(234,246,255,0.85)";
      ctx.font = `600 12px ${ANNOUNCEMENT_FONT_FAMILY}`;
      ctx.textAlign = "center";
      ctx.fillText(entry?.name || "", slotX + slotSize / 2, nameY);
      ctx.restore();
    }
    return { height: 26 + totalHeight };
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
      : -1;
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
    let inviteAnchor = null;
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
      if (anim?.pendingInvite && anim.pendingInvite.profileIndex === index) {
        inviteAnchor = { x: slotCenterX, y: portraitStripY + 8, text: anim.pendingInvite.text };
      }
      if (
        recapTallyState.followupInvite &&
        recapTallyState.followupInvite.inviterName &&
        recapTallyState.followupInvite.inviterName === (entry?.name || "")
      ) {
        inviteAnchor = {
          x: slotCenterX,
          y: portraitStripY + 8,
          text: recapTallyState.followupInvite.text,
          followup: true,
        };
      }
      ctx.save();
      ctx.translate(slotCenterX, slotCenterY);
      drawChurchBadgeSurface(ctx, stripSlotSize, {
        shape: "square",
        color: "#314B77",
        accent: "#4769A1",
      });
      drawChurchBadgeShimmer(ctx, stripSlotSize, {
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
    if (inviteAnchor) {
      pushRecapInviteBubble(inviteAnchor.text, inviteAnchor.x, inviteAnchor.y);
      if (inviteAnchor.followup) {
        recapTallyState.followupInvite = null;
      } else {
        anim.pendingInvite = null;
      }
    }

    const thresholdPulse = anim && anim.thresholdHoldTimer > 0 ? anim.thresholdHoldTimer : 0;
    const totalScale = thresholdPulse > 0
      ? 1 + 0.32 * (0.35 + thresholdPulse * 0.65)
      : (bumpPulse > 0 ? 1 + bumpPulse * 0.08 : 1);
    const totalFontSize = Math.round(42 * totalScale);
    const totalGlow = thresholdPulse > 0
      ? 34 + thresholdPulse * 42
      : (bumpPulse > 0 ? 18 + bumpPulse * 14 : 0);
    const totalValueBaselineY = npcRowTopY + 64;
    ctx.save();
    ctx.fillStyle = thresholdPulse > 0 ? "#FFF6CF" : highlightValueColor;
    ctx.font = `800 ${totalFontSize}px ${ANNOUNCEMENT_FONT_FAMILY}`;
    ctx.textAlign = "left";
    ctx.shadowColor = thresholdPulse > 0 ? "rgba(255, 245, 180, 0.95)" : "rgba(255, 217, 120, 0.7)";
    ctx.shadowBlur = totalGlow;
    if (thresholdPulse > 0) {
      ctx.lineWidth = Math.max(3, Math.round(totalFontSize * 0.08));
      ctx.strokeStyle = "rgba(255, 184, 32, 0.95)";
      ctx.strokeText(`${formatNumber(totalHealth)}`, totalBlockX, totalValueBaselineY);
      ctx.shadowBlur = totalGlow * 1.35;
      ctx.fillStyle = highlightValueFlash;
    }
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
          `-${Math.max(1, Math.round(anim.penaltyPerNpc || 1))}`,
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
        if (anim.finished) {
          return Math.max(0, Math.round(entry?.value || 0));
        }
        if (isActive) {
          return Math.max(0, Math.round(anim.activeValue || 0));
        }
        if (index < activeBadgeIndex) {
          return null;
        }
        return null;
      })();

      if (displayedBadgeValue !== null) {
        const badgeValueColor =
          anim && !anim.finished
            ? (isActive
                ? (thresholdPulse > 0 ? highlightValueFlash : highlightValueColor)
                : "rgba(234, 246, 255, 0.82)")
            : "rgba(234, 246, 255, 0.82)";
        ctx.save();
        ctx.fillStyle = badgeValueColor;
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

    const totalScale = thresholdPulse > 0
      ? 1 + 0.32 * (0.35 + thresholdPulse * 0.65)
      : (bumpPulse > 0 ? 1 + bumpPulse * 0.08 : 1);
    const totalFontSize = Math.round(42 * totalScale);
    const totalGlow = thresholdPulse > 0
      ? 34 + thresholdPulse * 42
      : (bumpPulse > 0 ? 18 + bumpPulse * 14 : 0);
    const totalValueBaselineY = rowTopY + 64;
    ctx.save();
    ctx.fillStyle = thresholdPulse > 0 ? "#FFF6CF" : highlightValueColor;
    ctx.font = `800 ${totalFontSize}px ${ANNOUNCEMENT_FONT_FAMILY}`;
    ctx.textAlign = "left";
    ctx.shadowColor = thresholdPulse > 0 ? "rgba(255, 245, 180, 0.95)" : "rgba(255, 217, 120, 0.7)";
    ctx.shadowBlur = totalGlow;
    if (thresholdPulse > 0) {
      ctx.lineWidth = Math.max(3, Math.round(totalFontSize * 0.08));
      ctx.strokeStyle = "rgba(255, 184, 32, 0.95)";
      ctx.strokeText(`${formatNumber(totalPerformance)}`, totalBlockX, totalValueBaselineY);
      ctx.shadowBlur = totalGlow * 1.35;
      ctx.fillStyle = highlightValueFlash;
    }
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
  const titleMetrics = getFontMetrics("Battlefield Report", titleSize);
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
    if (line.kind === "visitorProfiles") {
      const profileBlock = drawVisitorProfilesRow(line, cursorY);
      cursorY += profileBlock.height;
      if (!isLastLine) cursorY += sectionGap;
      continue;
    }
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
  drawRecapInviteBubbles(ctx);

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
  ctx.fillStyle = getEmberButtonGradient(ctx, buttonY, buttonHeight);
  ctx.strokeStyle = EMBER_BUTTON_PALETTE.border;
  ctx.lineWidth = 2;
  roundRect(ctx, buttonX, buttonY, buttonWidth, buttonHeight, 18, true, true);
  if (isAnnouncementButtonFocused(buttonKey, 0)) {
    drawFocusRing(ctx, buttonX - 3, buttonY - 3, buttonWidth + 6, buttonHeight + 6, 20);
    drawButtonReflection(ctx, buttonX, buttonY, buttonWidth, buttonHeight, 18, 0.45);
  }
  ctx.fillStyle = EMBER_BUTTON_PALETTE.text;
  ctx.shadowColor = EMBER_BUTTON_PALETTE.textShadow;
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 1;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 24px ${uiFontFamily}`;
  const continueLabel = (typeof GameText !== 'undefined' && GameText.buttons?.continue) || "Continue";
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
  category: "assets/sprites/items/icons/I25_Book.png",
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
  ctx.save();
  ctx.translate(x, y);
  drawChurchBadgeSurface(ctx, size, style);
  drawChurchBadgeShimmer(ctx, size, style);

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

function drawChurchBadgeShimmer(ctx, size, style) {
  const t = (typeof performance !== "undefined" ? performance.now() : Date.now()) * 0.001;
  const pulse = (Math.sin(t * 1.6) + 1) * 0.5;
  const shimmerAlpha = Math.max(0.12, pulse * 0.65);
  if (shimmerAlpha <= 0.12) return;
  ctx.save();
  ctx.globalAlpha *= shimmerAlpha;
  drawChurchBadgeShape(ctx, size, style, "clip");
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

  const title = "How Will You Equip Your Church?";
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
    textPalette: HELLFIRE_TEXT_PALETTE,
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
    const titleY = cardY + headerHeight / 2 + (stat.weaponName ? -6 : 1);
    ctx.fillText(stat.label, textLeft, titleY);
    if (stat.weaponName) {
      ctx.font = `600 11px ${uiFontFamily}`;
      ctx.fillStyle = canAfford ? "rgba(180, 220, 255, 0.75)" : "rgba(150, 175, 200, 0.45)";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.fillText(stat.weaponName, textLeft, titleY + 15);
      ctx.font = `800 ${titleSize}px ${uiFontFamily}`;
      ctx.fillStyle = "#F3E2C4";
      ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
      ctx.shadowBlur = 3;
      ctx.shadowOffsetY = 1;
    }
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

    const spendAnim = typeof window !== "undefined" ? window.__graceSpendAnimState : null;
    const isSpending = spendAnim && spendAnim.key === stat.key;
    const displayCost = isSpending ? Math.ceil(spendAnim.remaining) : stat.cost;
    const costLabel = stat.disabled
      ? "Coming soon"
      : maxed
        ? "Maxed"
        : level > 0
          ? `Upgrade to Level ${level + 1}: ${displayCost}`
          : `Cost: ${displayCost}`;
    const costY = cardY + cardH - 26;
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.font = `700 13px ${uiFontFamily}`;
    const costPadX = 14;
    const costWidth = ctx.measureText(costLabel).width + costPadX * 2;
    const costHeight = 24;
    const costX = cardX + cardW - 22 - costWidth;
    const costYPos = costY - costHeight / 2;
    // Record pill center in screen coords for the spend fly effect target
    if (!maxed && !stat.disabled && typeof window !== "undefined") {
      if (!window.__costPillPositions) window.__costPillPositions = {};
      const pillCenterVX = costX + costWidth / 2;
      const pillCenterVY = costYPos + costHeight / 2;
      window.__costPillPositions[stat.key] = {
        x: pillCenterVX * layout.scale + layout.offsetX,
        y: pillCenterVY * layout.scale + layout.offsetY,
      };
    }
    ctx.fillStyle = isSpending ? "rgba(80, 20, 20, 0.95)" : canAfford ? "rgba(120, 34, 34, 0.95)" : "rgba(70, 55, 45, 0.55)";
    ctx.strokeStyle = isSpending ? "rgba(255, 180, 100, 1)" : canAfford ? "rgba(255, 220, 170, 0.8)" : "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 1.5;
    roundRect(ctx, costX, costYPos, costWidth, costHeight, 12, true, true);
    ctx.fillStyle = isSpending ? "#FFD080" : canAfford ? "#F6E6C6" : "rgba(220, 210, 190, 0.7)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(costLabel, costX + costWidth / 2, costY);
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
  const continueX2 = actionStartX;
  const resetX = actionStartX + actionButtonWidth + actionGap;

  ctx.save();
  ctx.fillStyle = getEmberButtonGradient(ctx, continueY, continueHeight);
  ctx.strokeStyle = EMBER_BUTTON_PALETTE.border;
  ctx.lineWidth = 2;
  roundRect(ctx, continueX2, continueY, actionButtonWidth, continueHeight, 18, true, true);
  if (isAnnouncementButtonFocused("churchUpgradeScreen", buttonCount)) {
    drawFocusRing(ctx, continueX2 - 3, continueY - 3, actionButtonWidth + 6, continueHeight + 6, 20);
  }
  ctx.fillStyle = EMBER_BUTTON_PALETTE.text;
  ctx.shadowColor = EMBER_BUTTON_PALETTE.textShadow;
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 1;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 22px ${uiFontFamily}`;
  const continueLabel2 = (typeof GameText !== 'undefined' && GameText.buttons?.continue) || "Continue";
  ctx.fillText(continueLabel2, continueX2 + actionButtonWidth / 2, continueY + continueHeight / 2);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = undoAvailable
    ? "rgba(42, 34, 26, 0.92)"
    : EMBER_BUTTON_PALETTE.disabledFill;
  ctx.strokeStyle = undoAvailable
    ? "rgba(210, 170, 105, 0.7)"
    : EMBER_BUTTON_PALETTE.disabledBorder;
  ctx.lineWidth = 2;
  roundRect(ctx, resetX, continueY, actionButtonWidth, continueHeight, 18, true, true);
  if (isAnnouncementButtonFocused("churchUpgradeScreen", buttonCount + 1)) {
    drawFocusRing(ctx, resetX - 3, continueY - 3, actionButtonWidth + 6, continueHeight + 6, 20);
  }
  ctx.fillStyle = undoAvailable ? EMBER_BUTTON_PALETTE.text : EMBER_BUTTON_PALETTE.textDisabled;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 22px ${uiFontFamily}`;
  ctx.fillText("Reset", resetX + actionButtonWidth / 2, continueY + continueHeight / 2);
  ctx.restore();

  bounds.push({
    key: "continue",
    x: layout.offsetX + continueX2 * layout.scale,
    y: layout.offsetY + continueY * layout.scale,
    width: actionButtonWidth * layout.scale,
    height: continueHeight * layout.scale,
  });
  bounds.push({
    key: "reset",
    x: layout.offsetX + resetX * layout.scale,
    y: layout.offsetY + continueY * layout.scale,
    width: actionButtonWidth * layout.scale,
    height: continueHeight * layout.scale,
    enabled: undoAvailable,
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
    const customFadeDuration = Number.isFinite(levelAnnouncements[0]?.fadeOutDuration)
      ? Math.max(0.05, levelAnnouncements[0].fadeOutDuration)
      : ANNOUNCEMENT_FADE_DURATION;
    const fadeDuration = Math.min(duration, customFadeDuration);
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
  const isVisitorSummary = Boolean(levelAnnouncements[0]?.isVisitorSummary);
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
    const bossAnnouncement = levelAnnouncements[0] || {};
    const _bosscamp = window.activeCampaign || "p1";
    const _bossMissions = window.BattlechurchCampaignLabels?.missions || {};
    const actMissionLabels = _bossMissions[_bosscamp] || _bossMissions.p1 || {};
    const bossActNum = Number.isFinite(currentLevelStatus?.actNum)
      ? currentLevelStatus.actNum
      : 1;
    const bossFallbackMissionLabel = `Mission ${bossActNum}: ${actMissionLabels[bossActNum] || `Mission ${bossActNum}`}`;
    const missionLabel =
      String(bossAnnouncement.missionBriefTitle || "").trim() || bossFallbackMissionLabel;
    const bossBattleLabel = String(bossAnnouncement.title || "").trim() || "Boss Battle";
    const pastorProblem = formatScenarioForTitle(String(bossAnnouncement.subtitle || "").trim());
    const bossProblemLine = pastorProblem
      ? `${bossBattleLabel}: ${pastorProblem}`
      : bossBattleLabel;
    drawMissionBriefScreen(ctx, canvas, {
      title: `${missionLabel}\n${bossProblemLine}`,
      subtitle: "",
      showFormation: false,
      showButtons: true,
      blockAlign: "fullCenter",
      uiFontFamily: UI_FONT_FAMILY,
      maxWidthScale: 0.86,
      topMargin: 52,
      eyebrowText: "A Pastor's Personal Struggles",
      eyebrowSize: 14,
      eyebrowOffset: -8,
      titleLineGap: 10,
      titleLineEmphasis: {
        mode: "shimmer",
        matchPrefix: "Boss Battle ",
        continueOnWrappedLines: true,
        baseColor: "#E7C47E",
        peakColor: "#FFF2CF",
        glowColor: "rgba(235, 189, 102, 0.95)",
      },
      titleLineSizes: [
        Math.max(16, Math.round(TEXT_STYLES.h2.size * 0.76)),
        Math.round(TEXT_STYLES.h1.size * 1.14),
      ],
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
      const announcement = levelAnnouncements[0] || null;
      const subtitleScenario =
        typeof announcement?.subtitle === "string" ? announcement.subtitle.trim() : "";
      if (subtitleScenario) {
        announcement.missionBriefScenario = subtitleScenario;
      } else if (!announcement?.missionBriefScenario) {
        announcement.missionBriefScenario =
          missionBriefScenarios[Math.floor(Math.random() * missionBriefScenarios.length)];
      }
      const scenario = announcement?.missionBriefScenario || subtitleScenario || "";
      const scenarioTitle = formatScenarioForTitle(getScenarioTitle(scenario)) || "A Crisis";
      if (typeof window !== "undefined") {
        window.__lastMissionBriefScenario = scenario;
      }
      let nameSentence = '';
      if (npcNames.length === 1) {
        nameSentence = npcNames[0];
      } else if (npcNames.length === 2) {
        nameSentence = npcNames.join(' and ');
      } else if (npcNames.length > 2) {
        nameSentence = npcNames.slice(0, -1).join(', ') + ' and ' + npcNames[npcNames.length - 1];
      }
      const missionNumber = Number.isFinite(announcement?.missionNumber)
        ? announcement.missionNumber
        : null;
      const battlefieldNumber = missionNumber || 1;
      const battleProblemLine = scenarioTitle
        ? `Battlefield ${battlefieldNumber}: ${scenarioTitle}`
        : `Battlefield ${battlefieldNumber}`;
      const needsVerb = npcNames.length === 1 ? "needs" : "need";
      const missionHeading = battleProblemLine;
      const callForHelpLine = `${nameSentence} ${needsVerb} help on`;
      if (window.UpgradeScreen?.isVisible?.()) {
        ctx.restore();
        return;
      }
      drawMissionBriefScreen(ctx, canvas, {
        title: missionHeading,
        subtitle: "",
        showFormation: true,
        eyebrowText: callForHelpLine,
        uiFontFamily: UI_FONT_FAMILY,
        maxWidthScale: 0.86,
        topMargin: Math.max(HUD_HEIGHT + 28, 120),
        titleSize: Math.max(64, Math.round(TEXT_STYLES.h1.size * 1.22)),
        bodySize: Math.max(36, Math.round(TEXT_STYLES.body.size * 1.35)),
        bodyWeight: TEXT_STYLES.body.weight,
        titleLineGap: 10,
        eyebrowSize: 19,
        eyebrowOffset: -4,
        titleLineEmphasis: {
          mode: "shimmer",
          matchPrefix: "Battlefield ",
          continueOnWrappedLines: true,
          baseColor: "#E7C47E",
          peakColor: "#FFF2CF",
          glowColor: "rgba(235, 189, 102, 0.95)",
        },
        titleLineSizes: [
          Math.max(62, Math.round(TEXT_STYLES.h1.size * 1.24)),
        ],
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
      displayTitle = `Mission ${summaryRomanNumerals[levelNumber] || levelNumber}${clearedSuffix}`;
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
  if (isBattleSummary || isVisitorSummary) {
    const recapData = levelAnnouncements?.[0]?.recapData || null;
    // Prevent a one-frame fallback "Continue" card flash while recap data
    // is being prepared between victory fade and bonus screen.
    if (!recapData) {
      drawMissionBriefScreen(ctx, canvas, {
        title: "Preparing Battlefield Report",
        subtitle: "",
        showFormation: false,
        showButtons: false,
        uiFontFamily: UI_FONT_FAMILY,
        setMissionBriefActive: false,
      });
      ctx.restore();
      return;
    }
    let summaryTitle = recapData?.title || levelAnnouncements?.[0]?.recapTitle || "";
    if (!summaryTitle) {
      if (isVisitorSummary) {
        summaryTitle = "Visitor Report";
      } else {
        const titleText = displayTitle || title || "";
        const match = titleText.match(/—\s*([^]+?)\s*Cleared/i);
        const monthLabel = match && match[1] ? match[1].trim() : "";
        summaryTitle = monthLabel ? `${monthLabel} Recap` : "Recap";
      }
    }
    drawRecapBonusScreen(ctx, canvas, {
      title: summaryTitle,
      recapData,
      uiFontFamily: UI_FONT_FAMILY,
      buttonKey: "recap",
    });
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
        textPalette: HELLFIRE_TEXT_PALETTE,
        maxWidthScale: 0.92,
      });
      if (isPastorSpeech) {
        const buttonText = "Continue";
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
        ctx.fillStyle = getEmberButtonGradient(ctx, buttonY, buttonHeight);
        ctx.strokeStyle = EMBER_BUTTON_PALETTE.border;
        ctx.lineWidth = 2;
        roundRect(ctx, buttonX, buttonY, buttonWidth, buttonHeight, 16, true, true);
        if (isAnnouncementButtonFocused(buttonKey, 0)) {
          drawFocusRing(ctx, buttonX - 3, buttonY - 3, buttonWidth + 6, buttonHeight + 6, 18);
        }
        ctx.fillStyle = EMBER_BUTTON_PALETTE.text;
        ctx.shadowColor = EMBER_BUTTON_PALETTE.textShadow;
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 1;
        ctx.textAlign = "center";
        ctx.font = `18px ${UI_FONT_FAMILY}`;
        ctx.textBaseline = "alphabetic";
        ctx.fillText(buttonText, buttonX + buttonWidth / 2, buttonY + buttonHeight / 2 + 6);
      }
      ctx.restore();
    } else {
      const titleY = getAnnouncementTitleY(HUD_HEIGHT, boxHeight);
      const shouldShowSubtitle = Boolean(levelAnnouncements[0]?.showSubtitle);
      const isWaveIntroAnnouncement = /^wave\s+\d+:/i.test(String(displayTitle || ""));
      const eyebrowSource = (() => {
        const direct = String(levelAnnouncements[0]?.eyebrowText || "").trim();
        if (direct) return direct;
        if (isWaveIntroAnnouncement) {
          return String(currentLevelStatus?.battleScenario || "").trim();
        }
        return "";
      })();
      const eyebrowText = formatScenarioForTitle(getScenarioTitle(eyebrowSource));
      // Increase this to add more vertical space between eyebrow and wave title.
      const waveEyebrowGap = 30;
      drawAnnouncementText(ctx, canvas, {
        title: displayTitle || "",
        subtitle: shouldShowSubtitle ? String(subtitle || "") : "",
        eyebrowText,
        eyebrowGap: waveEyebrowGap,
        yBase: titleY,
        alpha,
        typewriter: true,
        titleSize: TEXT_STYLES.h2.size,
        subtitleSize: TEXT_STYLES.body.size,
        lineGap: Math.round(TEXT_STYLES.h2.size * TEXT_STYLES.h2.lineHeight),
        weight: TEXT_STYLES.h2.weight,
        subtitleWeight: TEXT_STYLES.body.weight,
        textPalette: HELLFIRE_TEXT_PALETTE,
      });
    }
    // Dev label hidden for announcements per request.
    ctx.restore();
  }

  function drawBossHazards(context) {
    const { bossHazards } = requireBindings();
    bossHazards.forEach((hazard) => hazard.draw(context));
  }

  function drawSpawnPointDebug(ctx) {
    const {
      SHOW_ENEMY_SPAWN_DEBUG,
      getEnemySpawnPoints,
      canvas,
      HUD_HEIGHT = 0,
      UI_FONT_FAMILY = "sans-serif",
    } = requireBindings();
    if (!SHOW_ENEMY_SPAWN_DEBUG) return;
    if (!canvas) return;
    const width = canvas.width || 0;
    const height = canvas.height || 0;
    // Draw debug guides in world/arena space so they move with camera panning.
    const viewMinX = 0;
    const viewMaxX = width;
    const horizontalMargin = Math.max(320, Math.floor(width * 0.24));
    const bottomCutoff = Math.max(
      HUD_HEIGHT + 16,
      HUD_HEIGHT + (height - HUD_HEIGHT) * (1 / 3) - 150,
    );
    const sideMaxY = height - Math.max(32, Math.floor(height * 0.1));
    const leftSpawnX = viewMinX - horizontalMargin;
    const rightSpawnX = viewMaxX + horizontalMargin;
    const leftGuideX = viewMinX + 2;
    const rightGuideX = viewMaxX - 2;
    const bottomSpawnMinX = viewMinX + horizontalMargin;
    const bottomSpawnMaxX = viewMaxX - horizontalMargin;
    const bottomSpan = Math.max(0, bottomSpawnMaxX - bottomSpawnMinX);
    const bottomCenterGap = Math.min(bottomSpan * 0.62, Math.max(320, Math.floor(width * 0.32)));
    const bottomCenterX = (bottomSpawnMinX + bottomSpawnMaxX) * 0.5;
    const bottomLeftMaxX = Math.max(bottomSpawnMinX, bottomCenterX - bottomCenterGap * 0.5);
    const bottomRightMinX = Math.min(bottomSpawnMaxX, bottomCenterX + bottomCenterGap * 0.5);

    ctx.save();
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 8]);

    // Viewport bounds (what should be visible).
    ctx.strokeStyle = "rgba(80, 220, 255, 0.95)";
    ctx.beginPath();
    ctx.moveTo(viewMinX, 0);
    ctx.lineTo(viewMinX, height);
    ctx.moveTo(viewMaxX, 0);
    ctx.lineTo(viewMaxX, height);
    ctx.moveTo(viewMinX, HUD_HEIGHT);
    ctx.lineTo(viewMaxX, HUD_HEIGHT);
    ctx.moveTo(viewMinX, height);
    ctx.lineTo(viewMaxX, height);
    ctx.stroke();

    // Spawn lane guide (randomSpawnPosition side/bottom region).
    ctx.strokeStyle = "rgba(255, 90, 210, 0.92)";
    ctx.beginPath();
    ctx.moveTo(leftSpawnX, bottomCutoff);
    ctx.lineTo(leftSpawnX, sideMaxY);
    ctx.moveTo(rightSpawnX, bottomCutoff);
    ctx.lineTo(rightSpawnX, sideMaxY);
    ctx.moveTo(viewMinX, bottomCutoff);
    ctx.lineTo(viewMaxX, bottomCutoff);
    ctx.moveTo(viewMinX, sideMaxY);
    ctx.lineTo(viewMaxX, sideMaxY);
    ctx.stroke();

    // Bottom spawn side-lane indicators + center no-spawn zone.
    const bottomBandHeight = Math.max(20, Math.floor(height * 0.035));
    const bottomBandY = height - bottomBandHeight - 4;
    ctx.setLineDash([]);
    if (bottomLeftMaxX > bottomSpawnMinX) {
      ctx.fillStyle = "rgba(90, 230, 140, 0.22)";
      ctx.fillRect(bottomSpawnMinX, bottomBandY, bottomLeftMaxX - bottomSpawnMinX, bottomBandHeight);
    }
    if (bottomSpawnMaxX > bottomRightMinX) {
      ctx.fillStyle = "rgba(90, 230, 140, 0.22)";
      ctx.fillRect(bottomRightMinX, bottomBandY, bottomSpawnMaxX - bottomRightMinX, bottomBandHeight);
    }
    const hasBottomCenterBlockedZone = bottomRightMinX > bottomLeftMaxX;
    if (hasBottomCenterBlockedZone) {
      ctx.fillStyle = "rgba(255, 90, 90, 0.22)";
      ctx.fillRect(bottomLeftMaxX, bottomBandY, bottomRightMinX - bottomLeftMaxX, bottomBandHeight);
    }

    // Keep center deadzone cues local to the bottom lane area (not full-height).
    ctx.strokeStyle = "rgba(255, 90, 90, 0.9)";
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(bottomLeftMaxX, bottomBandY - 10);
    ctx.lineTo(bottomLeftMaxX, height);
    ctx.moveTo(bottomRightMinX, bottomBandY - 10);
    ctx.lineTo(bottomRightMinX, height);
    ctx.stroke();

    // Optional hatch pattern to make the blocked center lane obvious.
    if (hasBottomCenterBlockedZone) {
      const blockW = bottomRightMinX - bottomLeftMaxX;
      const hatchStep = 12;
      ctx.save();
      ctx.beginPath();
      ctx.rect(bottomLeftMaxX, bottomBandY, blockW, bottomBandHeight);
      ctx.clip();
      ctx.strokeStyle = "rgba(255, 120, 120, 0.7)";
      ctx.setLineDash([]);
      ctx.lineWidth = 1.2;
      for (let x = bottomLeftMaxX - bottomBandHeight; x <= bottomRightMinX + bottomBandHeight; x += hatchStep) {
        ctx.beginPath();
        ctx.moveTo(x, bottomBandY + bottomBandHeight);
        ctx.lineTo(x + bottomBandHeight, bottomBandY);
        ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = "rgba(255, 210, 210, 0.95)";
      ctx.font = `700 11px ${UI_FONT_FAMILY}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("NO SPAWN ZONE", (bottomLeftMaxX + bottomRightMinX) * 0.5, bottomBandY + bottomBandHeight * 0.5);
    }

    // Visible in-viewport markers for offscreen vertical spawn guides.
    ctx.strokeStyle = "rgba(255, 170, 70, 0.95)";
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(leftGuideX, bottomCutoff);
    ctx.lineTo(leftGuideX, sideMaxY);
    ctx.moveTo(rightGuideX, bottomCutoff);
    ctx.lineTo(rightGuideX, sideMaxY);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(80, 220, 255, 0.95)";
    ctx.font = `700 12px ${UI_FONT_FAMILY}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("VIEWPORT", viewMinX + 8, Math.max(2, HUD_HEIGHT + 4));
    ctx.fillStyle = "rgba(255, 90, 210, 0.95)";
    ctx.fillText("SPAWN LANE", viewMinX + 8, Math.max(2, bottomCutoff + 4));
    ctx.fillStyle = "rgba(255, 170, 70, 0.95)";
    ctx.fillText(`SIDE SPAWN: ${horizontalMargin}px OFFSCREEN`, viewMinX + 8, Math.max(2, bottomCutoff + 22));
    ctx.fillStyle = "rgba(90, 230, 140, 0.95)";
    ctx.fillText("BOTTOM SPAWN ALLOWED (LEFT/RIGHT)", viewMinX + 8, Math.max(2, bottomCutoff + 40));
    ctx.fillStyle = "rgba(255, 90, 90, 0.95)";
    ctx.fillText("BOTTOM CENTER BLOCKED", viewMinX + 8, Math.max(2, bottomCutoff + 58));

    const points = getEnemySpawnPoints?.();
    if (points && points.length) {
      ctx.fillStyle = "rgba(255, 235, 140, 0.95)";
      ctx.strokeStyle = "rgba(255, 235, 140, 0.95)";
      ctx.lineWidth = 1.5;
      points.forEach((point) => {
        if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
        ctx.beginPath();
        ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
        ctx.stroke();
        const label = String(point.label || "");
        if (label) {
          ctx.fillText(label, point.x + 10, point.y - 6);
        }
      });
    }
    ctx.restore();
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

  function drawSwarmGroupCounters(ctx, enemies) {
    if (typeof window !== "undefined" && window.__suppressDamageNumbers) return;
    if (!ctx || !Array.isArray(enemies) || !enemies.length) return;
    const groups = new Map();
    enemies.forEach((enemy) => {
      if (!enemy || enemy.dead || enemy.state === "death") return;
      const groupId = enemy.swarmGroupId;
      if (!groupId) return;
      let group = groups.get(groupId);
      if (!group) {
        group = {
          count: 0,
          sumX: 0,
          sumY: 0,
          initialCount: Math.max(1, Math.floor(Number(enemy.swarmGroupInitialCount) || 1)),
        };
        groups.set(groupId, group);
      }
      group.count += 1;
      group.sumX += Number(enemy.x) || 0;
      group.sumY += Number(enemy.y) || 0;
      const initial = Math.max(1, Math.floor(Number(enemy.swarmGroupInitialCount) || 1));
      if (initial > group.initialCount) group.initialCount = initial;
    });
    if (!groups.size) return;
    const paletteColors =
      typeof UIStyles !== "undefined" && UIStyles && UIStyles.colors
        ? UIStyles.colors
        : {};
    const counterFill = paletteColors.teal || "#5FE3C0";
    const counterStroke = paletteColors.deepNavy || "#0A0F1F";

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    groups.forEach((group) => {
      if (!group || group.count <= 0) return;
      const x = group.sumX / group.count;
      const y = group.sumY / group.count;
      const fontSize = Math.max(28, Math.min(50, 10 + group.initialCount * 0.22));
      const label = String(group.count);
      ctx.font = `500 ${Math.round(fontSize)}px 'Orbitron', sans-serif`;
      ctx.lineWidth = Math.max(6, Math.round(fontSize * 0.16));
      ctx.strokeStyle = counterStroke;
      ctx.fillStyle = counterFill;
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.strokeText(label, x, y);
      ctx.fillText(label, x, y);
    });
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
    const bindings = requireBindings();
    if (bindings?.prayerBombComboActive) return;
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
      levelAnnouncements,
    } = requireBindings();
    const memberCount = Array.isArray(congregationMembers) ? congregationMembers.length : 0;
    const mapData = typeof window !== "undefined" ? window.BattlechurchMapData : null;
    const activeTownId = typeof window !== "undefined" ? window.activeTownId : null;
    const townData = activeTownId && mapData?.towns
      ? mapData.towns.find((town) => town.id === activeTownId)
      : null;
    const townName = townData?.name || "this town";
    const campaignData =
      activeTownId && typeof window?.MapScreen?.getTownCampaignData === "function"
        ? window.MapScreen.getTownCampaignData(activeTownId)
        : null;
    const campaign = String(campaignData?.campaign || "p1").toLowerCase();
    const isFirstPlaythroughForTown = campaign === "p1";
    const gamepadConnected = Boolean(window?.Input?.gamepadState?.connected);
    if (typeof window !== "undefined") {
      window.__congregationShowTutorialHints = false;
    }
    const isDevArena = Boolean(
      typeof window !== "undefined" && window.__battlechurchDevMeleeArenaMode === true,
    );
    const fullTitleText = isDevArena
      ? "Welcome to Dev Church"
      : isFirstPlaythroughForTown
        ? `Welcome to ${townName} Church`
        : `Welcome back to ${townName} Church`;
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const stage = levelStatus?.stage || "";
    const activeAnnouncement = Array.isArray(levelAnnouncements) ? levelAnnouncements[0] : null;
    const congregationIntroBlockedByAnnouncement = Boolean(activeAnnouncement);
    const lastNow = Number.isFinite(congregationIntroState.lastNow) ? congregationIntroState.lastNow : now;
    const frameDtSec = Math.max(0, (now - lastNow) / 1000);
    congregationIntroState.lastNow = now;
    const introKey = `levelIntro-${levelStatus?.level || 1}-${levelStatus?.battle || 0}`;
    if (stage === "levelIntro" && congregationIntroState.lastStage !== "levelIntro") {
      congregationIntroState.active = true;
      congregationIntroState.key = introKey;
      congregationIntroState.startTime = now;
      congregationIntroState.lastNow = now;
      congregationIntroState.handoffAnimStart = now;
    }
    if (!congregationIntroState.active || congregationIntroState.key !== introKey) {
      congregationIntroState.active = true;
      congregationIntroState.key = introKey;
      congregationIntroState.startTime = now;
      congregationIntroState.lastNow = now;
      congregationIntroState.handoffAnimStart = now;
    }
    const wasBlocked = congregationIntroState.blockedByAnnouncement === true;
    congregationIntroState.blockedByAnnouncement = congregationIntroBlockedByAnnouncement;
    if (congregationIntroBlockedByAnnouncement) {
      congregationIntroState.waitingForAnnouncementClear = true;
    } else if (wasBlocked || congregationIntroState.waitingForAnnouncementClear) {
      // Start congregation intro only after previous announcement card is gone.
      congregationIntroState.startTime = now;
      congregationIntroState.waitingForAnnouncementClear = false;
      congregationIntroState.handoffAnimStart = now;
    }
    if (congregationIntroBlockedByAnnouncement) {
      // Freeze congregation intro timers while exterior/town-intro cards are
      // on top so welcome/count text starts when this screen is visible.
      congregationIntroState.startTime += frameDtSec * 1000;
    }
    congregationIntroState.lastStage = stage;
    const introElapsed = Math.max(0, (now - (congregationIntroState.startTime || now)) / 1000);
    const congregationTextHoldAfterHandoff = 0.45;
    const typewriterReady = !congregationIntroBlockedByAnnouncement;
    const handoffAnimDuration = 0.65;
    const handoffElapsed = congregationIntroBlockedByAnnouncement
      ? 0
      : Math.max(
          0,
          (now - (Number.isFinite(congregationIntroState.handoffAnimStart)
            ? congregationIntroState.handoffAnimStart
            : now)) / 1000,
        );
    const textWindowElapsed = Math.max(0, handoffElapsed - congregationTextHoldAfterHandoff);
    const canShowCongregationText = !congregationIntroBlockedByAnnouncement && textWindowElapsed > 0;
    const handoffAnimProgress = canShowCongregationText
      ? Math.max(0, Math.min(1, textWindowElapsed / handoffAnimDuration))
      : 0;
    const titleText = canShowCongregationText ? fullTitleText : "";
    const titleAlpha = canShowCongregationText ? handoffAnimProgress : 0;
    const titleYOffset = (1 - handoffAnimProgress) * 48;

    const titleSize = TEXT_STYLES.h1.size;
    const lineGap = Math.round(TEXT_STYLES.h1.size * TEXT_STYLES.h1.lineHeight);
    const layout = getAnnouncementScreenLayout(ctx, canvas, {
      title: titleText,
      subtitle: "",
      titleSize,
      subtitleSize: TEXT_STYLES.h2.size,
      lineGap,
      weight: TEXT_STYLES.h1.weight,
      maxWidthScale: 0.86,
      position: "top",
      topMargin: 70,
      bottomMargin: 90,
      rowGap: 36,
      buttonHeight: 52,
      buttonCount: 1,
      HUD_HEIGHT,
    });
    const drawInstructionButtons = () => {
      const leftItems = gamepadConnected
        ? [
            {
              key: "LEFT STICK / D-PAD",
              action: "MOVE",
              isActive: () =>
                Boolean(window?.Input?.isActionActive?.("up")) ||
                Boolean(window?.Input?.isActionActive?.("down")) ||
                Boolean(window?.Input?.isActionActive?.("left")) ||
                Boolean(window?.Input?.isActionActive?.("right")),
            },
          ]
        : [
            {
              key: "WASD",
              action: "MOVE",
              isActive: (pressed) => ["w", "a", "s", "d"].some((k) => pressed?.has?.(k)),
            },
          ];
      const rightItems = gamepadConnected
        ? [
            { key: "A", action: "SWORD", isActive: (pressed) => pressed?.has?.("enter") || pressed?.has?.("Enter") },
            { key: "B", action: "DASH", isActive: (pressed) => pressed?.has?.("escape") || pressed?.has?.("Escape") },
            { key: "RB", action: "PRAYER", isActive: (pressed) => pressed?.has?.("ArrowRight") },
          ]
        : [
            { key: "LEFT ARROW", action: "SWORD", isActive: (pressed) => pressed?.has?.("ArrowLeft") },
            { key: "DOWN ARROW", action: "DASH", isActive: (pressed) => pressed?.has?.("ArrowDown") },
            { key: "RIGHT ARROW", action: "PRAYER", isActive: (pressed) => pressed?.has?.("ArrowRight") },
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

      // Congregation command ready dot next to PRAYER button
      const { player: bindingsPlayer } = requireBindings();
      const cmdReady = typeof bindingsPlayer?.isCongregationCommandReady === "function"
        ? bindingsPlayer.isCongregationCommandReady()
        : false;
      if (cmdReady) {
        const prayerItem = rightItems[rightItems.length - 1];
        const { buttonWidth: prayerBtnWidth } = measureButton(prayerItem);
        const dotX = rightStartX + prayerBtnWidth + 8;
        const dotY = startY + buttonHeight / 2;
        const dotR = 5;
        const pulse = 0.55 + 0.45 * Math.sin(Date.now() * 0.008);
        ctx.save();
        ctx.shadowColor = "rgba(100, 220, 255, 0.9)";
        ctx.shadowBlur = 8 * pulse;
        ctx.globalAlpha = 0.7 + 0.3 * pulse;
        ctx.fillStyle = "#7EDDFF";
        ctx.beginPath();
        ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    };
    ctx.save();
    ctx.translate(layout.offsetX, layout.offsetY);
    ctx.scale(layout.scale, layout.scale);
    drawCongregationThreatApparitions(ctx, layout.virtualCanvas, now, introKey, congregationMembers);
    if (canShowCongregationText) {
      drawAnnouncementText(ctx, layout.virtualCanvas, {
        title: titleText,
        yBase: layout.titleY + titleYOffset,
        titleSize,
        weight: TEXT_STYLES.h1.weight,
        lineGap,
        alpha: titleAlpha,
        typewriter: true,
        textPalette: HELLFIRE_TEXT_PALETTE,
        maxWidthScale: 0.86,
      });
    }
    if (SHOW_TEXT_SOURCE_LABELS) {
      drawDevLabel(ctx, "DEV: CongregationScreen", canvas.width / 2, layout.titleY - 32, 1, UI_FONT_FAMILY);
    }
    void memberCount;

    const isDevArenaMode = Boolean(
      typeof window !== "undefined" && window.__battlechurchDevMeleeArenaMode === true,
    );
    if (isDevArenaMode) {
      if (typeof window !== "undefined") {
        window.__congregationPlayButtonBounds = null;
        window.__announcementButtons = { key: "congregation", buttons: [] };
      }
    } else {
      const buttonText = "FIGHT!";
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
      ctx.fillStyle = getEmberButtonGradient(ctx, buttonY, buttonHeight);
      ctx.strokeStyle = EMBER_BUTTON_PALETTE.border;
      ctx.lineWidth = 2;
      roundRect(ctx, buttonX, buttonY, buttonWidth, buttonHeight, 16, true, true);
      if (isAnnouncementButtonFocused("congregation", 0)) {
        drawFocusRing(ctx, buttonX - 3, buttonY - 3, buttonWidth + 6, buttonHeight + 6, 18);
        drawButtonReflection(ctx, buttonX, buttonY, buttonWidth, buttonHeight, 16, 0.45);
      }
      ctx.fillStyle = "#FFF2CF";
      ctx.shadowColor = "rgba(24, 6, 5, 0.9)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 2;
      ctx.textAlign = "center";
      ctx.font = `900 26px 'Orbitron', ${UI_FONT_FAMILY}`;
      ctx.textBaseline = "middle";
      const mainTextY = buttonY + buttonHeight / 2 + 1;
      ctx.strokeStyle = "rgba(73, 18, 12, 0.95)";
      ctx.lineWidth = 3;
      ctx.strokeText(buttonText, layout.virtualCanvas.width / 2, mainTextY);
      ctx.fillText(buttonText, layout.virtualCanvas.width / 2, mainTextY);
      const fightHintText = gamepadConnected ? "Press Menu button to start" : "Press Space to start";
      ctx.fillStyle = "rgba(231, 176, 102, 0.86)";
      ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      ctx.shadowBlur = 2;
      ctx.shadowOffsetY = 1;
      ctx.font = `700 12px ${UI_FONT_FAMILY}`;
      ctx.fillText(fightHintText, layout.virtualCanvas.width / 2, buttonY + buttonHeight + 16);
    }

    drawFooterControlsHint(
      ctx,
      layout.virtualCanvas.width / 2,
      layout.virtualCanvas.height - 10,
      UI_FONT_FAMILY,
    );
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
    if (!actor || typeof actor.maxFaith !== "number") return;
    const { WORLD_SCALE = 1 } = requireBindings();
    const ratio = actor.maxFaith > 0 ? Math.max(0, Math.min(1, actor.faith / actor.maxFaith)) : 0;
    const width = Math.round(52 * WORLD_SCALE);
    const height = Math.max(9, Math.round(11 * WORLD_SCALE));
    const barX = actor.x - width / 2;
    const barY = actor.y - (actor.radius || 28) - height - Math.round(6 * WORLD_SCALE);
    const palette = getCombatMeterPalette();
    const fillColor = actor.saved ? palette.sword : palette.dash;
    const glowColor = actor.saved ? palette.swordGlow : palette.dashGlow;
    drawCompactWorldMeter(barX, barY, width, height, ratio, fillColor, glowColor);
  }

  function drawVisitorOverlay(visitorState) {
    if (!visitorState) return;
    const {
      ctx,
      canvas,
      UI_FONT_FAMILY,
    } = requireBindings();
    const centerX = canvas.width / 2;

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
    const inGraceRushStage = levelStatus?.stage === "graceRush";
    const inBossVictoryCelebrate = levelStatus?.stage === "bossVictoryCelebrate";
    const rushActive = Boolean(rushState?.active) || inGraceRushStage || inBossVictoryCelebrate;
    if (!rushActive) return;
    const isBossRush = rushState?.reason === "boss" || inBossVictoryCelebrate;
    const { ctx, canvas, npcs, graceRushFadeAlpha, levelAnnouncements } = requireBindings();
    const activeAnnouncementTitle = String(levelAnnouncements?.[0]?.title || "").trim();
    if (activeAnnouncementTitle === "Victory!") return;
    let payoffLine = "";
    if (isBossRush) {
      payoffLine = "You stood firm in your personal battles and are now stronger to lead your flock.";
    } else {
      const scenarioRaw =
        typeof levelStatus.battleScenario === "string" ? levelStatus.battleScenario.trim() : "";
      const victoryPhraseOverride =
        typeof levelStatus.battleScenarioVictoryPhrase === "string"
          ? levelStatus.battleScenarioVictoryPhrase.trim()
          : null;
      const problemPhraseRaw =
        scenarioRaw.replace(/[.!?]+$/g, "").replace(/\s+/g, " ").trim() ||
        "their current struggles";
      const problemPhrase =
        victoryPhraseOverride ||
        formatScenarioForSentence(problemPhraseRaw) ||
        "their current struggles";

      const survivors = Array.isArray(npcs)
        ? npcs
            .filter((npc) => npc && !npc.departed && npc.active)
            .map((npc) => (typeof npc.name === "string" ? npc.name.trim() : ""))
            .filter(Boolean)
        : [];
      const uniqueNames = [];
      const seen = new Set();
      survivors.forEach((name) => {
        if (seen.has(name)) return;
        seen.add(name);
        uniqueNames.push(name);
      });
      let namesText = "your congregation";
      if (uniqueNames.length === 1) {
        namesText = uniqueNames[0];
      } else if (uniqueNames.length === 2) {
        namesText = `${uniqueNames[0]} and ${uniqueNames[1]}`;
      } else if (uniqueNames.length > 2) {
        namesText = `${uniqueNames.slice(0, -1).join(", ")}, and ${uniqueNames[uniqueNames.length - 1]}`;
      }
      payoffLine = `You equipped ${namesText} with weapons to face ${problemPhrase}.`;
    }
    const stageTimer = Number.isFinite(levelStatus?.stageTimer)
      ? Math.max(0, Number(levelStatus.stageTimer))
      : (Number.isFinite(rushState?.timer) ? Math.max(0, Number(rushState.timer)) : 0);
    // Fade the message shortly before the global grace-rush fade-to-black starts.
    const preFadeWindow = 0.75;
    const preFadeAlpha = stageTimer > preFadeWindow
      ? 1
      : Math.max(0, stageTimer / Math.max(0.001, preFadeWindow));
    const overlayFadeAlpha = 1 - Math.max(0, Math.min(1, (graceRushFadeAlpha || 0) * 1.25));
    const textAlpha = Math.max(0, Math.min(1, preFadeAlpha * overlayFadeAlpha));
    if (textAlpha <= 0.001) return;
    drawAnnouncementText(ctx, canvas, {
      title: payoffLine,
      subtitle: "",
      yBase: getAnnouncementYBase(requireBindings().HUD_HEIGHT),
      alpha: textAlpha,
      typewriter: true,
      titleSize: Math.max(22, Math.round(TEXT_STYLES.h1.size * 0.62)),
      lineGap: Math.round(TEXT_STYLES.h1.size * TEXT_STYLES.h1.lineHeight),
      weight: "700",
      textPalette: HELLFIRE_TEXT_PALETTE,
      titleStrokeColor: "rgba(20, 8, 6, 0.95)",
      titleStrokeWidth: 2.8,
      maxWidthScale: 0.9,
      blockAlign: "center",
    });
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
    if (meleeAttackState.dualChargeReadyMove === "Blitz" || meleeAttackState.dualChargeReadyMove === "Refuge") return;
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
    const { ctx, WORLD_SCALE = 1, levelManager } = requireBindings();
    if (!ctx || !player || player.state === "death") return;
    const _stage = levelManager?.getStatus?.()?.stage;
    if (_stage !== "waveActive" && _stage !== "bossActive" && _stage !== "waveIntro") return;
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
    const floatingTexts = requireBindings().floatingTexts;
    activeNpcs.forEach((npc) => {
      if (!npc || npc.departed || !npc.active) return;
      const hasSpeechBubble = Array.isArray(floatingTexts) && floatingTexts.some(
        (ft) => ft && ft.entity === npc && ft.speechBubble && ft.life > 0,
      );
      if (hasSpeechBubble) return;
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
    if (meleeAttackState.dualChargeReadyMove === "Blitz") return;
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

  function drawPlayerPrayerHoldMeter(player) {
    const { ctx, WORLD_SCALE = 1, meleeAttackState } = requireBindings();
    if (!ctx || !player || player.state === "death") return;
    if (meleeAttackState?.dualChargeReadyMove === "Refuge") return;
    if (!(player.prayerHoldTimer > 0)) return;
    const PRAYER_BOMB_HOLD_TIME = 1.0;
    const chargeRatio = Math.max(0, Math.min(1, (player.prayerHoldTimer || 0) / PRAYER_BOMB_HOLD_TIME));
    const shakeX = sharedShakeOffset?.x || 0;
    const sprite = getPlayerSpriteExtents(player);
    const meterCenterX = getPlayerCombatMeterAnchorX(player) + shakeX;
    const width = Math.round(34 * WORLD_SCALE);
    const height = Math.max(11, Math.round(14 * WORLD_SCALE));
    const meterX = meterCenterX - width / 2;
    const stackOffset = Math.round((height + 6) * WORLD_SCALE);
    const meterY = sprite.top - height - Math.round(8 * WORLD_SCALE) - stackOffset * 2;
    const palette = getCombatMeterPalette();
    if (chargeRatio >= 1) {
      const dotSize = Math.max(height + 4 * WORLD_SCALE, 14 * WORLD_SCALE);
      drawCompactReadyDot(
        meterCenterX,
        meterY + height * 0.5,
        dotSize,
        palette.prayer,
        palette.prayerGlow,
      );
      return;
    }
    drawCompactWorldMeter(meterX, meterY, width, height, chargeRatio, palette.prayer, palette.prayerGlow);
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

  function drawPrayerStormGroundFires() {
    const { ctx, assets, prayerStormGroundFires = [] } = requireBindings();
    if (!ctx || !Array.isArray(prayerStormGroundFires) || !prayerStormGroundFires.length) return;
    const fallbackFrames = assets?.projectiles?.fire?.frames || [];
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < prayerStormGroundFires.length; i += 1) {
      const fire = prayerStormGroundFires[i];
      if (!fire || fire.life <= 0) continue;
      const frames =
        Array.isArray(fire.frames) && fire.frames.length ? fire.frames : fallbackFrames;
      if (!frames || !frames.length) continue;
      const fadeDuration = Math.max(0.01, Number(fire.fadeDuration) || 1.2);
      const isFadingOut = fire.life <= fadeDuration;
      const alpha = isFadingOut
        ? Math.max(0, Math.min(1, fire.life / fadeDuration))
        : 1;
      const frame = frames[(Math.floor(fire.frameIndex || 0) + frames.length) % frames.length];
      const drawSize = Math.max(24, (fire.scale || 1) * 32);
      ctx.globalAlpha = alpha;
      ctx.drawImage(
        frame,
        Math.round(fire.x - drawSize * 0.5),
        Math.round(fire.y - drawSize * 0.84),
        drawSize,
        drawSize,
      );
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
    const { ctx, canvas, UI_FONT_FAMILY } = requireBindings();
    drawBackground();
    drawMissionBriefScreen(ctx, canvas, {
      title: "Welcome Visitors",
      subtitle: "Welcome the visitors while politely keeping your members happy.",
      showFormation: false,
      uiFontFamily: UI_FONT_FAMILY,
      buttonKey: "visitorIntro",
      setMissionBriefActive: false,
    });
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
      'Prayer Meter holds 6 Prayers: Purge costs 2, Smite costs 6.',
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
      'Prayer Meter holds 6 Prayers: Purge costs 2, Smite costs 6.',
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
    const subtitleText = "";
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
      buttonHeight: 144,
      buttonCount: 1,
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
      textPalette: HELLFIRE_TEXT_PALETTE,
      maxWidthScale: 0.9,
    });

    const row1Configs = [
      { key: "resume", label: "Resume" },
      { key: "howToPlay", label: "How to Play" },
      { key: "settings", label: "Settings" },
    ];
    const row2Configs = [
      { key: "map", label: "Return to Map" },
      { key: "developer", label: "Developer" },
    ];
    const buttonWidth = 240;
    const buttonHeight = 64;
    const buttonGap = 28;
    const buttonRowGap = 16;
    const row1Width = buttonWidth * row1Configs.length + buttonGap * (row1Configs.length - 1);
    const row2Width = buttonWidth * row2Configs.length + buttonGap * (row2Configs.length - 1);
    const centerX = layout.virtualCanvas.width / 2;
    const buttonY = Math.round(layout.buttonY || 0);
    const buttonY2 = buttonY + buttonHeight + buttonRowGap;
    const bounds = [];
    const drawButtonRow = (configs, rowWidth, rowY) => {
      const startX = Math.round(centerX - rowWidth / 2);
      configs.forEach((config, index) => {
        const globalIndex = bounds.length;
        const x = startX + index * (buttonWidth + buttonGap);
        ctx.save();
        ctx.fillStyle = getEmberButtonGradient(ctx, rowY, buttonHeight);
        ctx.strokeStyle = EMBER_BUTTON_PALETTE.border;
        ctx.lineWidth = 2;
        roundRect(ctx, x, rowY, buttonWidth, buttonHeight, 16, true, true);
        if (isAnnouncementButtonFocused("pause", globalIndex)) {
          drawFocusRing(ctx, x - 3, rowY - 3, buttonWidth + 6, buttonHeight + 6, 18);
          drawButtonReflection(ctx, x, rowY, buttonWidth, buttonHeight, 16, 0.45);
        }
        ctx.fillStyle = EMBER_BUTTON_PALETTE.text;
        ctx.shadowColor = EMBER_BUTTON_PALETTE.textShadow;
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 1;
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        ctx.font = `600 22px ${UI_FONT_FAMILY}`;
        ctx.fillText(config.label, x + buttonWidth / 2, rowY + 42);
        ctx.restore();
        bounds.push({
          key: config.key,
          x: layout.offsetX + x * layout.scale,
          y: layout.offsetY + rowY * layout.scale,
          width: buttonWidth * layout.scale,
          height: buttonHeight * layout.scale,
        });
      });
    };
    drawButtonRow(row1Configs, row1Width, buttonY);
    drawButtonRow(row2Configs, row2Width, buttonY2);
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

  const EMBER_BUTTON_PALETTE = Object.freeze({
    top: "#D76B2D",
    bottom: "#8D2F1E",
    border: "rgba(255, 210, 148, 0.82)",
    loadingBase: "rgba(62, 20, 14, 0.94)",
    loadingFill: "#F1882F",
    text: "#FBEBC9",
    textDisabled: "rgba(196, 186, 170, 0.58)",
    textShadow: "rgba(34, 10, 8, 0.68)",
    focus: "#F6C06E",
    disabledFill: "rgba(80, 56, 52, 0.72)",
    disabledBorder: "rgba(130, 108, 98, 0.42)",
  });

  const HELLFIRE_TEXT_PALETTE = Object.freeze({
    title: "#F2C87D",
    subtitle: "#E7B066",
    shadow: "rgba(20, 6, 4, 0.92)",
  });

  const WAVE_ATMOSPHERE_STAGES = new Set([
    "waveIntro",
    "waveActive",
    "allKillBreak",
    "waveCleared",
    "victoryCelebrate",
    "bossActive",
    "bossVictoryCelebrate",
  ]);
  const WAVE_ATMOSPHERE_TRANSITION_MS = 500;
  const BOSS_PHASE3_HEAT_TRANSITION_MS = 500;
  const WAVE_ATMOSPHERE_CONFIG = Object.freeze({
    assumedWavesPerBattle: 3,
    tintMinAlpha: 0.02,
    tintMaxAlpha: 0.1,
    bossPhase3TintMaxAlpha: 0.16,
    tintColor: "rgba(165, 14, 22, 1)",
    emberMinAlpha: 0.06,
    emberMaxAlpha: 0.24,
    bossPhase3EmberMaxAlpha: 0.34,
    emberColor: "rgba(255, 52, 28, 1)",
    ashBaseMinAlpha: 0.45,
    ashBaseMaxAlpha: 0.9,
    bossPhase3AshMaxAlpha: 1.0,
  });
  const waveAtmosphereTweenState = {
    initialized: false,
    lastMs: 0,
    progress: 0,
  };
  const ashEmberTuneState = {
    particleCount: null,
    emberRatio: null,
    intensity: null,
    sizeScale: null,
  };
  const bossPhase3HeatTweenState = {
    initialized: false,
    lastMs: 0,
    blend: 0,
  };

  function getWaveTargetProgress(levelStatus) {
    const stage = levelStatus?.stage || "";
    if (!levelStatus || !WAVE_ATMOSPHERE_STAGES.has(stage)) return 0;
    if (stage === "bossActive") return 1;
    const totalWaves = Math.max(
      1,
      Number(levelStatus.waveTotal) || WAVE_ATMOSPHERE_CONFIG.assumedWavesPerBattle,
    );
    const waveNumber = Math.max(
      1,
      Number(levelStatus.waveNum) || Number(levelStatus.wave) || 1,
    );
    const clampedWave = Math.min(totalWaves, waveNumber);
    const baseProgress = clampedWave / totalWaves;
    if (stage === "victoryCelebrate" || stage === "bossVictoryCelebrate") {
      const stageDuration = Math.max(0.001, Number(levelStatus.stageDuration) || 3);
      const stageTimer = Math.max(0, Number(levelStatus.stageTimer) || 0);
      const fadeRatio = Math.max(0, Math.min(1, stageTimer / stageDuration));
      const celebrateBaseProgress = stage === "bossVictoryCelebrate" ? 1 : baseProgress;
      return celebrateBaseProgress * fadeRatio;
    }
    return baseProgress;
  }

  function getWaveProgressRatio(levelStatus) {
    const target = Math.max(0, Math.min(1, getWaveTargetProgress(levelStatus)));
    const nowMs = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (!waveAtmosphereTweenState.initialized) {
      waveAtmosphereTweenState.initialized = true;
      waveAtmosphereTweenState.lastMs = nowMs;
      waveAtmosphereTweenState.progress = target;
      return target;
    }
    const elapsedMs = Math.max(0, nowMs - (waveAtmosphereTweenState.lastMs || nowMs));
    waveAtmosphereTweenState.lastMs = nowMs;
    const durationMs = Math.max(1, WAVE_ATMOSPHERE_TRANSITION_MS);
    const step = Math.max(0, Math.min(1, elapsedMs / durationMs));
    waveAtmosphereTweenState.progress += (target - waveAtmosphereTweenState.progress) * step;
    return Math.max(0, Math.min(1, waveAtmosphereTweenState.progress));
  }

  function getBossPhase3HeatBlend(levelStatus) {
    const bossPhase = Math.max(0, Number(levelStatus?.bossPhase) || 0);
    const targetActive =
      levelStatus?.stage === "bossVictoryCelebrate" ||
      ((levelStatus?.stage === "bossActive" || levelStatus?.stage === "bossIntro") && bossPhase >= 3);
    const target = targetActive ? 1 : 0;
    const nowMs = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (!bossPhase3HeatTweenState.initialized) {
      bossPhase3HeatTweenState.initialized = true;
      bossPhase3HeatTweenState.lastMs = nowMs;
      bossPhase3HeatTweenState.blend = target;
      return target;
    }
    const elapsedMs = Math.max(0, nowMs - (bossPhase3HeatTweenState.lastMs || nowMs));
    bossPhase3HeatTweenState.lastMs = nowMs;
    const durationMs = Math.max(1, BOSS_PHASE3_HEAT_TRANSITION_MS);
    const step = Math.max(0, Math.min(1, elapsedMs / durationMs));
    bossPhase3HeatTweenState.blend += (target - bossPhase3HeatTweenState.blend) * step;
    return Math.max(0, Math.min(1, bossPhase3HeatTweenState.blend));
  }

  function drawWaveProgressionAtmosphere(ctx, progress, bounds) {
    if (!ctx || !bounds) return;
    if (!(progress > 0.001)) return;
    const width = Math.max(0, bounds.width || 0);
    const height = Math.max(0, bounds.height || 0);
    if (width <= 0 || height <= 0) return;
    const x = Number.isFinite(bounds.x) ? bounds.x : 0;
    const y = Number.isFinite(bounds.y) ? bounds.y : 0;

    // Subtle heat ramp across waves: deeper red tint + warm ember lift.
    const levelStatus = requireBindings().levelManager?.getStatus?.() || null;
    const bossPhase3Blend = getBossPhase3HeatBlend(levelStatus);
    const tintMaxAlpha =
      WAVE_ATMOSPHERE_CONFIG.tintMaxAlpha +
      (WAVE_ATMOSPHERE_CONFIG.bossPhase3TintMaxAlpha - WAVE_ATMOSPHERE_CONFIG.tintMaxAlpha) * bossPhase3Blend;
    const emberMaxAlpha =
      WAVE_ATMOSPHERE_CONFIG.emberMaxAlpha +
      (WAVE_ATMOSPHERE_CONFIG.bossPhase3EmberMaxAlpha - WAVE_ATMOSPHERE_CONFIG.emberMaxAlpha) * bossPhase3Blend;

    const tintAlpha =
      WAVE_ATMOSPHERE_CONFIG.tintMinAlpha +
      (tintMaxAlpha - WAVE_ATMOSPHERE_CONFIG.tintMinAlpha) * progress;
    const emberAlpha =
      WAVE_ATMOSPHERE_CONFIG.emberMinAlpha +
      (emberMaxAlpha - WAVE_ATMOSPHERE_CONFIG.emberMinAlpha) * progress;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();
    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = Math.max(0, Math.min(1, tintAlpha));
    ctx.fillStyle = WAVE_ATMOSPHERE_CONFIG.tintColor;
    ctx.fillRect(x, y, width, height);
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = Math.max(0, Math.min(1, emberAlpha));
    const emberGradient = ctx.createRadialGradient(
      x + width * 0.5,
      y + height * 0.78,
      Math.max(40, width * 0.12),
      x + width * 0.5,
      y + height * 0.78,
      Math.max(120, width * 0.95),
    );
    emberGradient.addColorStop(0, WAVE_ATMOSPHERE_CONFIG.emberColor);
    emberGradient.addColorStop(1, "rgba(255, 120, 48, 0)");
    ctx.fillStyle = emberGradient;
    ctx.fillRect(x, y, width, height);
    ctx.restore();

  }

  function getEmberButtonGradient(ctx, y, height) {
    const gradient = ctx.createLinearGradient(0, y, 0, y + height);
    gradient.addColorStop(0, EMBER_BUTTON_PALETTE.top);
    gradient.addColorStop(1, EMBER_BUTTON_PALETTE.bottom);
    return gradient;
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
  };
  const CONGREGATION_THREAT_MAX_ACTIVE = 4;
  const CONGREGATION_THREAT_HOLD_SEC = 3.0;
  const CONGREGATION_THREAT_FADE_IN_SEC = 1.25;
  const CONGREGATION_THREAT_FADE_OUT_SEC = 1.6;
  const CONGREGATION_THREAT_RESPAWN_MIN_SEC = 0.2;
  const CONGREGATION_THREAT_RESPAWN_MAX_SEC = 0.9;
  const CONGREGATION_THREAT_MIN_GAP_PX = 130;
  const CONGREGATION_THREAT_SPAWN_ATTEMPTS = 12;
  const CONGREGATION_THREAT_ATTACK_CHANCE = 0.38;
  const CONGREGATION_THREAT_ATTACK_APPROACH_SEC = 0.95;
  const CONGREGATION_THREAT_ATTACK_WINDUP_SEC = 0.35;
  const CONGREGATION_THREAT_ATTACK_SWING_SEC = 0.55;
  const CONGREGATION_THREAT_ATTACK_RECOVER_SEC = 0.25;
  const CONGREGATION_THREAT_TARGET_EDGE_BAND_RATIO = 0.28;
  const CONGREGATION_THREAT_TARGET_NEIGHBOR_RADIUS = 120;
  const CONGREGATION_THREAT_HIT_FLASH_MS = 130;
  const CONGREGATION_THREAT_KNOCKBACK_MS = 180;
  const CONGREGATION_THREAT_KNOCKBACK_PX = 4;
  const congregationThreatState = {
    key: null,
    nextSpawnAt: 0,
    apparitions: [],
  };

  function resetCongregationThreatState() {
    congregationThreatState.key = null;
    congregationThreatState.nextSpawnAt = 0;
    congregationThreatState.apparitions.length = 0;
  }

  function getCongregationThreatClipPool() {
    const assets = requireBindings().assets;
    const enemyClips = assets?.enemies || null;
    if (!enemyClips) return [];
    const enemyCatalog = (typeof window !== "undefined" ? window.BattlechurchEnemyCatalog?.catalog : null) || {};
    const preferredKeys = [
      "miniDemon",
      "miniDemoness",
      "miniClawedDemon",
      "miniHighDemon",
      "miniDemonLord",
      "miniDemonFireThrower",
      "miniDemonTormentor",
      "miniDemonFireKeeper",
    ];
    const pool = [];
    for (const key of preferredKeys) {
      const damageClass = String(enemyCatalog?.[key]?.damageClass || "").toLowerCase();
      if (damageClass === "armored") continue;
      const clipBundle = enemyClips[key];
      const clip = clipBundle?.walk || clipBundle?.idle || clipBundle?.attack || null;
      const catalogScale = Number(enemyCatalog?.[key]?.scale);
      const resolvedScale = Number.isFinite(catalogScale) && catalogScale > 0 ? catalogScale : 1;
      const weaponHitboxOffsetX = Number(enemyCatalog?.[key]?.weaponHitbox?.offsetX);
      const attackHitFrame = Number(enemyCatalog?.[key]?.attackHitFrame);
      if (clip?.image) {
        pool.push({
          key,
          clip,
          clipBundle,
          scale: resolvedScale,
          attackHitboxOffsetX: Number.isFinite(weaponHitboxOffsetX) ? Math.abs(weaponHitboxOffsetX) : 20,
          attackHitFrame: Number.isFinite(attackHitFrame) ? Math.max(0, Math.floor(attackHitFrame)) : 3,
        });
      }
    }
    return pool;
  }

  function spawnCongregationThreatApparition(
    virtualCanvas,
    clipPool,
    existingApparitions = [],
    congregationMembers = [],
    allowAttack = true,
    forceAttack = false,
  ) {
    const width = virtualCanvas?.width || 1920;
    const height = virtualCanvas?.height || 1080;
    const targetCandidates = Array.isArray(congregationMembers)
      ? congregationMembers.filter((m) => m && Number.isFinite(m.x) && Number.isFinite(m.y))
      : [];
    let preferredTargets = targetCandidates;
    if (targetCandidates.length) {
      const edgeBand = Math.max(120, width * CONGREGATION_THREAT_TARGET_EDGE_BAND_RATIO);
      const minInnerX = edgeBand;
      const maxInnerX = width - edgeBand;
      const sideTargets = targetCandidates.filter((m) => m.x <= minInnerX || m.x >= maxInnerX);
      if (sideTargets.length) preferredTargets = sideTargets;
    }
    const crowdRadiusSq = CONGREGATION_THREAT_TARGET_NEIGHBOR_RADIUS * CONGREGATION_THREAT_TARGET_NEIGHBOR_RADIUS;
    const scoredTargets = preferredTargets.map((m) => {
      let neighbors = 0;
      for (const other of targetCandidates) {
        if (!other || other === m) continue;
        const dx = other.x - m.x;
        const dy = other.y - m.y;
        if (dx * dx + dy * dy <= crowdRadiusSq) neighbors += 1;
      }
      return { member: m, neighbors };
    });
    scoredTargets.sort((a, b) => a.neighbors - b.neighbors);
    const lowCrowdTargets = scoredTargets.length
      ? scoredTargets.filter((entry) => entry.neighbors <= scoredTargets[0].neighbors + 1).map((entry) => entry.member)
      : [];
    const canAttack = allowAttack && targetCandidates.length > 0 &&
      (forceAttack || Math.random() < CONGREGATION_THREAT_ATTACK_CHANCE);
    const targetMember = canAttack
      ? lowCrowdTargets[Math.floor(Math.random() * lowCrowdTargets.length)] || null
      : null;
    for (let attempt = 0; attempt < CONGREGATION_THREAT_SPAWN_ATTEMPTS; attempt += 1) {
      const pad = 42;
      let edge = "left";
      let x = width * 0.5;
      let y = height * 0.5;
      if (targetMember) {
        // Attack apparitions come from the nearest boundary to the target NPC.
        const leftDist = targetMember.x - pad;
        const rightDist = (width - pad) - targetMember.x;
        const topDist = targetMember.y - pad;
        const bottomDist = (height - pad) - targetMember.y;
        const minDist = Math.min(leftDist, rightDist, topDist, bottomDist);
        if (minDist === leftDist) {
          edge = "left";
          x = pad;
          y = Math.max(pad, Math.min(height - pad, targetMember.y + randomInRange(-60, 60)));
        } else if (minDist === rightDist) {
          edge = "right";
          x = width - pad;
          y = Math.max(pad, Math.min(height - pad, targetMember.y + randomInRange(-60, 60)));
        } else if (minDist === topDist) {
          edge = "top";
          x = Math.max(pad, Math.min(width - pad, targetMember.x + randomInRange(-80, 80)));
          y = pad;
        } else {
          edge = "bottom";
          x = Math.max(pad, Math.min(width - pad, targetMember.x + randomInRange(-80, 80)));
          y = height - pad;
        }
      } else {
        edge = ["left", "right", "top", "bottom"][Math.floor(Math.random() * 4)];
        if (edge === "left") {
          x = pad;
          y = Math.random() * (height - 2 * pad) + pad;
        } else if (edge === "right") {
          x = width - pad;
          y = Math.random() * (height - 2 * pad) + pad;
        } else if (edge === "top") {
          x = Math.random() * (width - 2 * pad) + pad;
          y = pad;
        } else {
          x = Math.random() * (width - 2 * pad) + pad;
          y = height - pad;
        }
      }
      let overlaps = false;
      for (const app of existingApparitions) {
        if (!app) continue;
        const dx = x - app.x;
        const dy = y - app.y;
        if (dx * dx + dy * dy < CONGREGATION_THREAT_MIN_GAP_PX * CONGREGATION_THREAT_MIN_GAP_PX) {
          overlaps = true;
          break;
        }
      }
      if (overlaps) continue;
      const picked = clipPool[Math.floor(Math.random() * clipPool.length)] || null;
      const attackLifetime =
        CONGREGATION_THREAT_FADE_IN_SEC +
        CONGREGATION_THREAT_ATTACK_APPROACH_SEC +
        CONGREGATION_THREAT_ATTACK_WINDUP_SEC +
        CONGREGATION_THREAT_ATTACK_SWING_SEC +
        CONGREGATION_THREAT_ATTACK_RECOVER_SEC +
        CONGREGATION_THREAT_FADE_OUT_SEC;
      return {
        x,
        y,
        startX: x,
        startY: y,
        edge,
        clip: picked?.clip || null,
        clips: picked?.clipBundle || null,
        clipKey: picked?.key || "",
        drawScale: Number.isFinite(picked?.scale) && picked.scale > 0 ? picked.scale : 1,
        attackHitboxOffsetX: Number.isFinite(picked?.attackHitboxOffsetX) ? picked.attackHitboxOffsetX : 20,
        attackHitFrame: Number.isFinite(picked?.attackHitFrame) ? picked.attackHitFrame : 3,
        bornAt: 0,
        rotation: 0,
        frameSeed: Math.floor(Math.random() * 1000),
        mode: targetMember ? "attack" : "ambient",
        targetMember: targetMember || null,
        lifetimeSec: targetMember ? attackLifetime : null,
      };
    }
    return null;
  }

  function drawCongregationThreatApparitions(ctx, virtualCanvas, nowMs, introKey, congregationMembers = []) {
    const clipPool = getCongregationThreatClipPool();
    if (!clipPool.length) return;
    const nowSec = nowMs / 1000;
    if (congregationThreatState.key !== introKey) {
      congregationThreatState.key = introKey;
      congregationThreatState.nextSpawnAt = nowSec;
      congregationThreatState.apparitions.length = 0;
    }
    const totalLifetimeSec =
      CONGREGATION_THREAT_FADE_IN_SEC + CONGREGATION_THREAT_HOLD_SEC + CONGREGATION_THREAT_FADE_OUT_SEC;
    for (let i = congregationThreatState.apparitions.length - 1; i >= 0; i -= 1) {
      const app = congregationThreatState.apparitions[i];
      const ageSec = nowSec - app.bornAt;
      const lifeSec = Number.isFinite(app?.lifetimeSec) ? app.lifetimeSec : totalLifetimeSec;
      if (ageSec >= lifeSec) congregationThreatState.apparitions.splice(i, 1);
    }
    const hasAttackInFlight = congregationThreatState.apparitions.some((app) => app?.mode === "attack");
    if (!hasAttackInFlight && congregationThreatState.apparitions.length >= CONGREGATION_THREAT_MAX_ACTIVE) {
      const ambientIndex = congregationThreatState.apparitions.findIndex((app) => app?.mode !== "attack");
      if (ambientIndex >= 0) congregationThreatState.apparitions.splice(ambientIndex, 1);
    }
    if (
      congregationThreatState.apparitions.length < CONGREGATION_THREAT_MAX_ACTIVE &&
      (nowSec >= congregationThreatState.nextSpawnAt || !hasAttackInFlight)
    ) {
      const apparition = spawnCongregationThreatApparition(
        virtualCanvas,
        clipPool,
        congregationThreatState.apparitions,
        congregationMembers,
        !hasAttackInFlight,
        !hasAttackInFlight,
      );
      if (apparition) {
        apparition.bornAt = nowSec;
        congregationThreatState.apparitions.push(apparition);
      }
      const respawnDelay =
        CONGREGATION_THREAT_RESPAWN_MIN_SEC +
        Math.random() * (CONGREGATION_THREAT_RESPAWN_MAX_SEC - CONGREGATION_THREAT_RESPAWN_MIN_SEC);
      congregationThreatState.nextSpawnAt = nowSec + respawnDelay;
    }
    congregationThreatState.apparitions.forEach((app) => {
      const isAttack = app?.mode === "attack";
      const ageSec = nowSec - app.bornAt;
      let drawX = app.x;
      let drawY = app.y;
      let clip = app.clip;
      let forceFaceRight = null;
      if (isAttack && app.targetMember && Number.isFinite(app.targetMember.x) && Number.isFinite(app.targetMember.y)) {
        const targetX = app.targetMember.x;
        const clipForSizing = app.clips?.attack || app.clips?.walk || app.clips?.idle || app.clip;
        const sizeImg = clipForSizing?.image || null;
        const sizeFrameWidth = Math.max(1, clipForSizing?.frameWidth || sizeImg?.width || 1);
        const sizeFrameHeight = Math.max(1, clipForSizing?.frameHeight || sizeImg?.height || 1);
        const sizeRenderScale =
          Number.isFinite(clipForSizing?.renderScale) && clipForSizing.renderScale > 0 ? clipForSizing.renderScale : 1;
        const sizeScale = Math.max(0.001, (Number.isFinite(app.drawScale) ? app.drawScale : 1) * sizeRenderScale);
        const attackerHalfW = sizeFrameWidth * sizeScale * 0.5;
        const attackerHalfH = sizeFrameHeight * sizeScale * 0.5;
        const hitOffset = Math.max(8, Number.isFinite(app.attackHitboxOffsetX) ? Math.abs(app.attackHitboxOffsetX) : 20);
        const sideSign = app.startX <= targetX ? -1 : 1;
        // Keep attacker beside the NPC but close enough that the NPC sits inside the strike reach.
        const standOff = Math.max(
          (app.targetMember.radius || 24) + 53,
          hitOffset + (app.targetMember.radius || 24) * 0.28,
        );
        const anchorX = targetX + sideSign * standOff;
        // Align feet to the same floor plane as the target NPC.
        const targetGroundY = app.targetMember.y + (app.targetMember.radius || 24) * 0.96;
        const anchorY = targetGroundY - attackerHalfH;
        const t = Math.max(0, Math.min(1, ageSec / Math.max(0.001, CONGREGATION_THREAT_ATTACK_APPROACH_SEC)));
        const ease = 1 - Math.pow(1 - t, 3);
        drawX = app.startX + (anchorX - app.startX) * ease;
        drawY = app.startY + (anchorY - app.startY) * ease;
        forceFaceRight = sideSign < 0;
        const attackStart = CONGREGATION_THREAT_FADE_IN_SEC + CONGREGATION_THREAT_ATTACK_APPROACH_SEC;
        if (ageSec >= attackStart) {
          const attackClip = app.clips?.attack || app.clips?.walk || app.clips?.idle || app.clip;
          if (attackClip?.image) clip = attackClip;
        }
      }
      if (!clip?.image) return;
      const img = clip.image;
      const frameWidth = Math.max(1, clip.frameWidth || img.width || 1);
      const frameHeight = Math.max(1, clip.frameHeight || img.height || 1);
      const cols = Math.max(1, Math.floor((img.width || frameWidth) / frameWidth));
      const rows = Math.max(1, Math.floor((img.height || frameHeight) / frameHeight));
      const mappedFrames = Array.isArray(clip.frameMap) && clip.frameMap.length
        ? clip.frameMap
        : null;
      let alpha = 0;
      if (!isAttack) {
        if (ageSec < CONGREGATION_THREAT_FADE_IN_SEC) {
          alpha = ageSec / Math.max(0.001, CONGREGATION_THREAT_FADE_IN_SEC);
        } else if (ageSec < CONGREGATION_THREAT_FADE_IN_SEC + CONGREGATION_THREAT_HOLD_SEC) {
          alpha = 1;
        } else {
          const outAge = ageSec - CONGREGATION_THREAT_FADE_IN_SEC - CONGREGATION_THREAT_HOLD_SEC;
          alpha = 1 - outAge / Math.max(0.001, CONGREGATION_THREAT_FADE_OUT_SEC);
        }
      } else {
        const lifeSec = Number.isFinite(app?.lifetimeSec) ? app.lifetimeSec : 0;
        const fadeOutStart = Math.max(0, lifeSec - CONGREGATION_THREAT_FADE_OUT_SEC);
        if (ageSec < CONGREGATION_THREAT_FADE_IN_SEC) {
          alpha = ageSec / Math.max(0.001, CONGREGATION_THREAT_FADE_IN_SEC);
        } else if (ageSec < fadeOutStart) {
          alpha = 1;
        } else {
          const outAge = ageSec - fadeOutStart;
          alpha = 1 - outAge / Math.max(0.001, CONGREGATION_THREAT_FADE_OUT_SEC);
        }
      }
      alpha = Math.max(0, Math.min(1, alpha));
      if (alpha <= 0.001) return;
      const frameRate = Number.isFinite(clip.frameRate) && clip.frameRate > 0 ? clip.frameRate : 8;
      const animatedFrame = Math.floor(ageSec * frameRate + app.frameSeed);
      const logicalFrameCount = mappedFrames ? mappedFrames.length : Math.max(1, cols * rows);
      const logicalFrameIndex = logicalFrameCount > 0 ? (animatedFrame % logicalFrameCount) : 0;
      const frameRef = mappedFrames
        ? mappedFrames[logicalFrameIndex]
        : animatedFrame % Math.max(1, cols * rows);
      const frameId = Number.isFinite(frameRef) ? Math.max(0, Math.floor(frameRef)) : 0;
      const sx = (frameId % cols) * frameWidth;
      const sy = Math.floor(frameId / cols) * frameHeight;
      const clipRenderScale =
        Number.isFinite(clip.renderScale) && clip.renderScale > 0 ? clip.renderScale : 1;
      const drawScale = Math.max(0.001, (Number.isFinite(app.drawScale) ? app.drawScale : 1) * clipRenderScale);
      const drawWidth = frameWidth * drawScale;
      const drawHeight = frameHeight * drawScale;
      ctx.save();
      ctx.translate(drawX, drawY);
      ctx.rotate(app.rotation);
      const centerX = (virtualCanvas?.width || 1920) * 0.5;
      // Sprites are right-facing at baseline; flip when we need to face left.
      const faceRight = forceFaceRight !== null ? forceFaceRight : drawX <= centerX;
      const flipX = !faceRight;
      if (flipX) ctx.scale(-1, 1);
      ctx.globalAlpha = 0.48 * alpha;
      ctx.shadowColor = "rgba(255, 40, 10, 0.65)";
      ctx.shadowBlur = 20;
      ctx.drawImage(
        img,
        sx,
        sy,
        frameWidth,
        frameHeight,
        -drawWidth * 0.5,
        -drawHeight * 0.5,
        drawWidth,
        drawHeight,
      );
      ctx.restore();

      if (isAttack && app.targetMember && Number.isFinite(app.targetMember.x) && Number.isFinite(app.targetMember.y)) {
        const attackStart = CONGREGATION_THREAT_FADE_IN_SEC + CONGREGATION_THREAT_ATTACK_APPROACH_SEC + CONGREGATION_THREAT_ATTACK_WINDUP_SEC;
        const lifeSec = Number.isFinite(app?.lifetimeSec) ? app.lifetimeSec : 0;
        const attackActiveEnd = Math.max(attackStart, lifeSec - CONGREGATION_THREAT_FADE_OUT_SEC);
        if (ageSec >= attackStart && ageSec <= attackActiveEnd) {
          const activeT = (ageSec - attackStart) / Math.max(0.001, attackActiveEnd - attackStart);
          const clampedSwingT = Math.max(0, Math.min(1, activeT));
          const clipRate = Number.isFinite(clip.frameRate) && clip.frameRate > 0 ? clip.frameRate : 8;
          const hitIntervalSec = Math.max(0.12, Math.min(0.26, 1 / Math.max(2, clipRate * 0.6)));
          if (!Number.isFinite(app._nextHitAtAgeSec)) {
            app._nextHitAtAgeSec = attackStart + hitIntervalSec * 0.5;
          }
          while (ageSec >= app._nextHitAtAgeSec && app._nextHitAtAgeSec <= attackActiveEnd + 0.001) {
            app._nextHitAtAgeSec += hitIntervalSec;
            const nowMsExact = nowMs;
            const target = app.targetMember;
            const dx = target.x - drawX;
            const dy = target.y - drawY;
            const len = Math.hypot(dx, dy) || 1;
            target.__threatHitFlashUntil = nowMsExact + CONGREGATION_THREAT_HIT_FLASH_MS;
            target.__threatKnockStart = nowMsExact;
            target.__threatKnockUntil = nowMsExact + CONGREGATION_THREAT_KNOCKBACK_MS;
            target.__threatKnockDirX = dx / len;
            target.__threatKnockDirY = dy / len;
          }
          const pulse = 1 - clampedSwingT;
          const flashAlpha = Math.max(0, 0.45 * pulse);
          const flashRadius = Math.max(18, (app.targetMember.radius || 24) * (1.25 + pulse * 0.4));
          ctx.save();
          ctx.globalAlpha = flashAlpha;
          const grad = ctx.createRadialGradient(
            app.targetMember.x,
            app.targetMember.y,
            Math.max(2, flashRadius * 0.15),
            app.targetMember.x,
            app.targetMember.y,
            flashRadius,
          );
          grad.addColorStop(0, "rgba(255, 88, 60, 0.95)");
          grad.addColorStop(0.55, "rgba(190, 34, 20, 0.45)");
          grad.addColorStop(1, "rgba(120, 12, 8, 0)");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(app.targetMember.x, app.targetMember.y, flashRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    });
  }

  function drawHUD() {
    // Hide HUD when congregation intro screen is showing ("Welcome Pastor")
    const bindings = requireBindings();
    const levelStatus = bindings.levelManager?.getStatus?.();
    const isDevArenaMode = Boolean(
      typeof window !== "undefined" && window.__battlechurchDevMeleeArenaMode === true,
    );
    if (
      !isDevArenaMode &&
      (
        levelStatus?.stage === "levelIntro" ||
        levelStatus?.stage === "congregationToTeaser" ||
        levelStatus?.stage === "briefingTeaser"
      )
    ) return;
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
    const actLabel = `Mission ${crumbRomanNumerals[levelStatus.actNum || 1] || (levelStatus.actNum || 1)}`;
    // Get town name from activeTownId
    const activeTownId = typeof window !== "undefined" ? window.activeTownId : null;
    const mapData = typeof window !== "undefined" ? window.BattlechurchMapData : null;
    const townData = activeTownId && mapData?.towns
      ? mapData.towns.find((t) => t.id === activeTownId)
      : null;
    const townNumber = Number.isFinite(townData?.index)
      ? Math.max(1, Math.floor(townData.index))
      : Math.max(
          1,
          (Array.isArray(mapData?.towns)
            ? mapData.towns.findIndex((t) => t.id === activeTownId) + 1
            : 1),
        );
    const crumbParts = [`Town ${townNumber}`, actLabel];
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

    // Draw background image (Act 1 gets heat shimmer like title/map).
    if (chapterBreakImage) {
      ctx.save();
      if (chapterBreakActNumber === 1) {
        const stripHeight = 14;
        const time = (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000;
        const amp = 0.9;
        const srcW = chapterBreakImage.width || 1;
        const srcHAll = chapterBreakImage.height || 1;
        const scaleY = canvas.height / srcHAll;
        const drawW = canvas.width + amp * 2;
        for (let y = 0; y < srcHAll; y += stripHeight) {
          const wave = Math.sin(time * 2 + y * 0.15) + Math.sin(time * 1.2 + y * 0.05);
          const offset = wave * amp;
          const srcH = Math.min(stripHeight, srcHAll - y);
          const destY = y * scaleY;
          const destH = srcH * scaleY;
          ctx.drawImage(
            chapterBreakImage,
            0,
            y,
            srcW,
            srcH,
            -amp + offset,
            destY,
            drawW,
            destH,
          );
        }
      } else {
        ctx.drawImage(chapterBreakImage, 0, 0, canvas.width, canvas.height);
      }
      ctx.restore();
    } else {
      // Fallback: dark background
      ctx.save();
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    // Define text based on act number — per-phase from campaign_labels.js
    const _cbCamp = window.activeCampaign || "p1";
    const _cbLabels = window.BattlechurchCampaignLabels || {};
    const actTitles = _cbLabels.actTitles?.[_cbCamp] || _cbLabels.actTitles?.p1 || {};
    const actVillainText = _cbLabels.actDescriptions?.[_cbCamp] || _cbLabels.actDescriptions?.p1 || {};
    const romanNumerals = { 1: 'I', 2: 'II', 3: 'III' };
    const battleTitle =
      actTitles[chapterBreakActNumber] || `Mission ${romanNumerals[chapterBreakActNumber] || chapterBreakActNumber}`;
    const villainText = actVillainText[chapterBreakActNumber] || "";

    const phaseName = _cbLabels.phases?.[_cbCamp] || _cbCamp.toUpperCase();
    const townNumber = requireBindings().levelManager?.getStatus?.()?.level || 1;
    const eyebrowText = `Phase ${townNumber}: ${phaseName}`;
    const eyebrowSize = 18;
    const eyebrowGap = 16;

    const centerX = canvas.width / 2;

    const chapterTitleSize = 64;
    const bodyTitleSize = Math.max(20, TEXT_STYLES.h1.size * 0.85);
    const headerLayout = getAnnouncementTextLayout(ctx, canvas, {
      title: battleTitle,
      subtitle: "",
      titleSize: chapterTitleSize,
      subtitleSize: 0,
      lineGap: Math.round(chapterTitleSize * 1.1),
      weight: "bold",
      maxWidthScale: 0.9,
    });
    const bodyLayout = getAnnouncementTextLayout(ctx, canvas, {
      title: villainText,
      subtitle: "",
      titleSize: bodyTitleSize,
      subtitleSize: TEXT_STYLES.h2.size,
      lineGap: Math.round(TEXT_STYLES.h1.size * TEXT_STYLES.h1.lineHeight),
      weight: TEXT_STYLES.h1.weight,
      maxWidthScale: 0.92,
    });
    const headerBodyGap = 28;
    const textGroupHeight =
      eyebrowSize + eyebrowGap + headerLayout.textBlockHeight + headerBodyGap + bodyLayout.textBlockHeight;
    const textGroupTopY = Math.max(
      90,
      Math.round((canvas.height - textGroupHeight) / 2),
    );
    const eyebrowY = textGroupTopY + eyebrowSize;
    const titleY = eyebrowY + eyebrowGap + headerLayout.titleLineHeight;
    const bodyYBase =
      titleY - headerLayout.titleLineHeight +
      headerLayout.textBlockHeight +
      headerBodyGap +
      bodyLayout.titleLineHeight;
    const layout = getAnnouncementScreenLayout(ctx, canvas, {
      title: villainText,
      subtitle: "",
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
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `600 ${eyebrowSize}px ${UI_FONT_FAMILY}`;
    ctx.fillStyle = HELLFIRE_TEXT_PALETTE.subtitle;
    ctx.shadowColor = HELLFIRE_TEXT_PALETTE.shadow;
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillText(eyebrowText, centerX, eyebrowY);
    ctx.restore();

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold ${chapterTitleSize}px ${UI_FONT_FAMILY}`;
    ctx.fillStyle = HELLFIRE_TEXT_PALETTE.title;
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
      titleSize: bodyTitleSize,
      weight: TEXT_STYLES.h1.weight,
      textPalette: HELLFIRE_TEXT_PALETTE,
      maxWidthScale: 0.92,
    });
    ctx.restore();

    ctx.save();
    const buttonText = "Continue";
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
    ctx.fillStyle = getEmberButtonGradient(ctx, buttonY, buttonHeight);
    ctx.strokeStyle = EMBER_BUTTON_PALETTE.border;
    ctx.lineWidth = 2;
    roundRect(ctx, buttonX, buttonY, buttonWidth, buttonHeight, 16, true, true);
    if (isAnnouncementButtonFocused("chapterBreak", 0)) {
      drawFocusRing(ctx, buttonX - 3, buttonY - 3, buttonWidth + 6, buttonHeight + 6, 18);
    }
    ctx.fillStyle = EMBER_BUTTON_PALETTE.text;
    ctx.shadowColor = EMBER_BUTTON_PALETTE.textShadow;
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 1;
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
      assets,
      HUD_HEIGHT,
      assetsLoaded,
      mapReady,
      titleDemoSaveMenuActive,
      titleDemoSaveSlots,
      titleCloudSaveLoading,
      titleCloudSaveRows,
      titleCloudSelectedSaveId,
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
    if (titleDemoSaveMenuActive) {
      ctx.save();
      ctx.fillStyle = "rgba(0, 0, 0, 0.74)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    const titleText = "";
    const subtitleText = "";
    const titleSize = TEXT_STYLES.h1.size;
    const subtitleSize = TEXT_STYLES.h2.size;
    const lineGap = Math.round(TEXT_STYLES.h1.size * TEXT_STYLES.h1.lineHeight);
    // Show either the fake-save picker or the normal title actions.
    let buttonConfigs;
    if (titleDemoSaveMenuActive) {
      const slots = Array.isArray(titleDemoSaveSlots) ? titleDemoSaveSlots : [];
      const cloudRows = Array.isArray(titleCloudSaveRows) ? titleCloudSaveRows : [];
      const cloudButtons = titleCloudSaveLoading
        ? [{ key: "cloudsavePending", label: "Loading Google Save Files...", meta: "Reading account saves" }]
        : cloudRows.map((row) => ({
            key: row.key,
            label: row.label,
            meta: row.meta,
            isActive: row.isActive,
            isSelected: row.id && row.id === titleCloudSelectedSaveId,
          }));
      buttonConfigs = cloudButtons.concat(slots.map((slot, index) => ({
        key: slot?.key || `slot${index + 1}`,
        label: slot?.label || `Slot ${index + 1}`,
        meta: "Demo profile for QA/testing",
        demoDetails: {
          key: slot?.key || `slot${index + 1}`,
          townId: slot?.townId || null,
          completedTowns: Math.max(0, Number(slot?.completedTowns) || 0),
          campaign: String(slot?.campaignData?.campaign || "p1").toUpperCase(),
          startCount: Math.max(0, Number(slot?.campaignData?.startCount) || 0),
          campaignMultiplier: Number.isFinite(slot?.campaignData?.campaignMultiplier)
            ? slot.campaignData.campaignMultiplier
            : 1.0,
          upgradeLevels: Object.values(slot?.campaignData?.restoredChurchPowerupLevels || {}).reduce(
            (sum, level) => sum + Math.max(0, Number(level) || 0),
            0,
          ),
        },
      })));
      const loginLabel =
        typeof window !== "undefined" && window.cloudAuthProvider === "google"
          ? "Sync Google Saves"
          : "Login with Google";
      buttonConfigs.push({ key: "loginGoogle", label: loginLabel });
      buttonConfigs.push({ key: "viewCloudSaveDetails", label: "View Full Details" });
      if (typeof window !== "undefined" && window.cloudAuthProvider === "google") {
        buttonConfigs.push({ key: "logoutGoogle", label: "Logout" });
        buttonConfigs.push({ key: "newCloudSave", label: "New Save" });
        buttonConfigs.push({ key: "duplicateCloudSave", label: "Save File As" });
        buttonConfigs.push({ key: "renameCloudSave", label: "Rename" });
        buttonConfigs.push({ key: "deleteCloudSave", label: "Delete Save" });
        buttonConfigs.push({ key: "resetGoogleSave", label: "Reset Highlighted" });
      }
      buttonConfigs.push({ key: "back", label: "Back" });
    } else if (assetsLoaded) {
      buttonConfigs = [
        { key: "play", label: "Play" },
        { key: "settings", label: "Settings" },
        { key: "developer", label: "Developer" },
        { key: "howtoplay", label: "How to Play" },
      ];
    } else if (mapReady) {
      // Map ready but gameplay still loading - allow map browsing
      buttonConfigs = [
        { key: "map", label: "Loading" },
        { key: "settings", label: "Settings" },
        { key: "developer", label: "Developer" },
        { key: "howtoplay", label: "How to Play" },
      ];
    } else {
      // Still loading title/map assets
      buttonConfigs = [
        { key: "play", label: "Loading..." },
        { key: "settings", label: "Settings" },
        { key: "developer", label: "Developer" },
        { key: "howtoplay", label: "How to Play" },
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
    const bounds = [];
    const { loadingProgress } = requireBindings();
    const progress = Math.max(0, Math.min(100, loadingProgress || 0));
    if (titleDemoSaveMenuActive) {
      const shellStyle = window.UIStyles?.panels?.hellfire?.shell || {};
      const dividerStyle = window.UIStyles?.panels?.hellfire?.divider || {};
      const hintStyle = window.UIStyles?.panels?.hellfire?.withHint || {};
      const panelStyle = window.UIStyles?.panels?.hellfire?.playLoadWithHint || {};
      const panelW = Math.round(
        Math.min(
          panelStyle.panelWidthMax ?? hintStyle.panelWidthMax ?? 1020,
          layout.virtualCanvas.width * (panelStyle.panelWidthRatio ?? hintStyle.panelWidthRatio ?? 0.9),
        ),
      );
      const panelH = Math.round(
        Math.min(
          layout.virtualCanvas.height * (panelStyle.panelHeightRatio ?? 0.7),
          panelStyle.panelHeightMax ?? 520,
        ),
      );
      const panelX = Math.round(layout.virtualCanvas.width / 2 - panelW / 2);
      const panelY = Math.round(layout.virtualCanvas.height / 2 - panelH / 2);
      const titleY = panelY + (panelStyle.titleY ?? hintStyle.titleY ?? 34);
      const hintY = panelY + (panelStyle.hintY ?? hintStyle.hintY ?? 56);
      const dividerY = panelY + (panelStyle.dividerY ?? hintStyle.dividerY ?? 82);
      const actionKeys = new Set([
        "loginGoogle",
        "viewCloudSaveDetails",
        "logoutGoogle",
        "newCloudSave",
        "duplicateCloudSave",
        "renameCloudSave",
        "deleteCloudSave",
        "resetGoogleSave",
        "back",
      ]);
      const indexedConfigs = buttonConfigs.map((config, index) => ({ config, index }));
      const rowEntries = indexedConfigs.filter((entry) => !actionKeys.has(entry.config.key));
      const actionEntries = indexedConfigs.filter((entry) => actionKeys.has(entry.config.key));
      const boundsByIndex = new Array(buttonConfigs.length);
      const leftColumnW = Math.max(390, Math.min(520, Math.floor(panelW * 0.52)));
      const detailsColumnW = panelW - leftColumnW - 66;
      const rowX = panelX + 24;
      const rowW = leftColumnW;
      const detailsX = rowX + rowW + 18;
      const rowH = 60;
      const rowGap = 10;
      const listStartY = panelY + (panelStyle.padTop ?? hintStyle.padTop ?? 110);

      ctx.shadowColor = shellStyle.shadowColor || "rgba(0, 0, 0, 0.45)";
      ctx.shadowBlur = shellStyle.shadowBlur ?? 24;
      ctx.shadowOffsetY = shellStyle.shadowOffsetY ?? 10;
      const panelGradient = ctx.createLinearGradient(0, panelY, 0, panelY + panelH);
      panelGradient.addColorStop(0, shellStyle.gradientTop || "rgba(12, 18, 30, 0.95)");
      panelGradient.addColorStop(1, shellStyle.gradientBottom || "rgba(7, 10, 18, 0.95)");
      ctx.fillStyle = panelGradient;
      ctx.strokeStyle = shellStyle.borderColor || "rgba(255, 218, 162, 0.34)";
      ctx.lineWidth = shellStyle.borderWidth ?? 2;
      roundRect(ctx, panelX, panelY, panelW, panelH, shellStyle.radius ?? 18, true, true);
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      ctx.fillStyle = EMBER_BUTTON_PALETTE.text;
      ctx.shadowColor = EMBER_BUTTON_PALETTE.textShadow;
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 1;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.font = `700 ${panelStyle.titleFontSize ?? hintStyle.titleFontSize ?? 28}px ${UI_FONT_FAMILY}`;
      ctx.fillText(panelStyle.titleText || "CHOOSE SAVE SOURCE", panelX + panelW / 2, titleY);
      ctx.font = `600 ${panelStyle.hintFontSize ?? hintStyle.hintFontSize ?? 12}px ${UI_FONT_FAMILY}`;
      ctx.fillStyle = panelStyle.hintColor || hintStyle.hintColor || "rgba(231,176,102,0.82)";
      ctx.fillText(
        panelStyle.hintText || hintStyle.hintText || "W / S move  ·  A / D switch panels  ·  SPACE select  ·  ESC back",
        panelX + panelW / 2,
        hintY,
      );
      ctx.strokeStyle = dividerStyle.color || "rgba(255, 214, 148, 0.22)";
      ctx.lineWidth = dividerStyle.width ?? 1;
      ctx.beginPath();
      ctx.moveTo(panelX + (dividerStyle.insetX ?? 24), dividerY);
      ctx.lineTo(panelX + panelW - (dividerStyle.insetX ?? 24), dividerY);
      ctx.stroke();
      const accountLine =
        typeof window !== "undefined" && window.cloudAuthProvider === "google" && window.cloudEmail
          ? `Signed in as: ${window.cloudEmail}`
          : "Not signed in";

      const drawPlayLoadActionIcon = (key, cx, cy, size, active = false) => {
        const actionKey = String(key || "");
        const radius = size * 0.5;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.fillStyle = active ? "rgba(242, 200, 125, 0.22)" : "rgba(242, 200, 125, 0.14)";
        ctx.strokeStyle = active ? "rgba(242, 200, 125, 0.75)" : "rgba(242, 200, 125, 0.45)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = active ? "rgba(246, 220, 170, 0.95)" : "rgba(246, 220, 170, 0.82)";
        ctx.fillStyle = ctx.strokeStyle;
        ctx.lineWidth = 1.6;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        if (actionKey === "loginGoogle" || actionKey === "logoutGoogle") {
          ctx.beginPath();
          ctx.arc(0, -1.2, 2.5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-4.5, 4.5);
          ctx.quadraticCurveTo(0, 1.5, 4.5, 4.5);
          ctx.stroke();
        } else if (actionKey === "viewCloudSaveDetails") {
          ctx.strokeRect(-4.8, -5, 9.6, 10);
          ctx.beginPath();
          ctx.moveTo(-2.8, -2.2);
          ctx.lineTo(2.8, -2.2);
          ctx.moveTo(-2.8, 0.2);
          ctx.lineTo(2.8, 0.2);
          ctx.moveTo(-2.8, 2.6);
          ctx.lineTo(1.3, 2.6);
          ctx.stroke();
        } else if (actionKey === "newCloudSave") {
          ctx.beginPath();
          ctx.moveTo(-4.5, -3.8);
          ctx.lineTo(2, -3.8);
          ctx.lineTo(4.5, -1.4);
          ctx.lineTo(4.5, 4.2);
          ctx.lineTo(-4.5, 4.2);
          ctx.closePath();
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0, -1.6);
          ctx.lineTo(0, 2.2);
          ctx.moveTo(-1.9, 0.3);
          ctx.lineTo(1.9, 0.3);
          ctx.stroke();
        } else if (actionKey === "duplicateCloudSave") {
          ctx.strokeRect(-5.2, -3.8, 6.4, 7.6);
          ctx.strokeRect(-1.2, -5.6, 6.4, 7.6);
        } else if (actionKey === "renameCloudSave") {
          ctx.beginPath();
          ctx.moveTo(-4.6, 3.6);
          ctx.lineTo(-2.8, 5.4);
          ctx.lineTo(-1.8, 4.2);
          ctx.lineTo(-3.4, 2.4);
          ctx.closePath();
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-2.6, 3.2);
          ctx.lineTo(4.6, -4.1);
          ctx.stroke();
        } else if (actionKey === "deleteCloudSave" || actionKey === "resetGoogleSave") {
          ctx.strokeRect(-3.6, -2.4, 7.2, 7);
          ctx.beginPath();
          ctx.moveTo(-4.6, -2.4);
          ctx.lineTo(4.6, -2.4);
          ctx.moveTo(-1.8, -4.5);
          ctx.lineTo(1.8, -4.5);
          ctx.stroke();
        } else if (actionKey === "back") {
          ctx.beginPath();
          ctx.moveTo(4.5, -4.5);
          ctx.lineTo(-2.5, 0);
          ctx.lineTo(4.5, 4.5);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(-2.5, 0);
          ctx.lineTo(5.2, 0);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(-4, -4);
          ctx.lineTo(4, 4);
          ctx.moveTo(-4, 4);
          ctx.lineTo(4, -4);
          ctx.stroke();
        }
        ctx.restore();
      };

      const describeRow = (config) => {
        if (typeof config?.meta === "string" && config.meta.trim()) return config.meta;
        if (config?.key === "cloudsavePending") return "Reading account saves...";
        return "";
      };
      const fitText = (text, maxWidth) => {
        if (!text || ctx.measureText(text).width <= maxWidth) return text;
        const ellipsis = "...";
        let end = text.length;
        while (end > 0) {
          const candidate = `${text.slice(0, end)}${ellipsis}`;
          if (ctx.measureText(candidate).width <= maxWidth) return candidate;
          end -= 1;
        }
        return ellipsis;
      };

      rowEntries.forEach(({ config, index }, rowIndex) => {
        const x = Math.round(rowX);
        const y = Math.round(listStartY + rowIndex * (rowH + rowGap));
        const focused = isAnnouncementButtonFocused("title", index);
        const selected = Boolean(config?.isSelected);
        const meta = describeRow(config);
        ctx.save();
        ctx.fillStyle = focused
          ? "rgba(82, 44, 20, 0.88)"
          : selected
          ? "rgba(46, 32, 26, 0.88)"
          : "rgba(14, 12, 16, 0.88)";
        ctx.strokeStyle = focused
          ? "rgba(242, 200, 125, 0.95)"
          : selected
          ? "rgba(242, 200, 125, 0.62)"
          : "rgba(242, 200, 125, 0.35)";
        ctx.lineWidth = focused ? 2.2 : selected ? 1.7 : 1.2;
        roundRect(ctx, x, y, rowW, rowH, 8, true, true);
        if (focused || selected) {
          ctx.fillStyle = "rgba(242, 200, 125, 0.9)";
          ctx.fillRect(x + 6, y + 8, 3, rowH - 16);
        }
        ctx.fillStyle = EMBER_BUTTON_PALETTE.text;
        ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
        ctx.shadowBlur = 3;
        ctx.shadowOffsetY = 0;
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        ctx.font = `600 19px ${UI_FONT_FAMILY}`;
        const focusPrefix = focused ? "> " : "";
        ctx.fillText(`${focusPrefix}${config.label}`, x + 16, y + 26);
        if (meta) {
          ctx.font = `500 13px ${UI_FONT_FAMILY}`;
          ctx.fillStyle = "rgba(231, 176, 102, 0.78)";
          ctx.fillText(fitText(meta, rowW - 32), x + 16, y + 46);
        }
        ctx.restore();
        boundsByIndex[index] = {
          key: config.key,
          navZone: "rows",
          navRow: rowIndex,
          navCol: 0,
          x: layout.offsetX + x * layout.scale,
          y: layout.offsetY + y * layout.scale,
          width: rowW * layout.scale,
          height: rowH * layout.scale,
        };
      });

      const detailsY = listStartY;
      const actionColumns = actionEntries.length > 4 ? 2 : 1;
      const actionButtonH = 34;
      const actionRowGap = 8;
      const actionHeaderH = 18;
      const actionBodyTopPad = 8;
      const actionBodyBottomPad = 12;
      const actionRows = actionEntries.length > 0 ? Math.ceil(actionEntries.length / actionColumns) : 0;
      const actionsBodyH =
        actionEntries.length > 0
          ? actionHeaderH + actionBodyTopPad + actionBodyBottomPad + actionRows * actionButtonH + Math.max(0, actionRows - 1) * actionRowGap
          : 0;
      const accountHeaderH = 56;
      const actionsPanelH = accountHeaderH + 8 + actionsBodyH;
      ctx.save();
      ctx.fillStyle = "rgba(11, 10, 14, 0.78)";
      ctx.strokeStyle = "rgba(242, 200, 125, 0.32)";
      ctx.lineWidth = 1.2;
      roundRect(ctx, detailsX, detailsY, detailsColumnW, actionsPanelH, 10, true, true);

      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.shadowColor = "rgba(0,0,0,0.55)";
      ctx.shadowBlur = 3;
      ctx.shadowOffsetY = 0;
      const accountTextColor =
        typeof window !== "undefined" && window.cloudAuthProvider === "google" && window.cloudEmail
          ? "rgba(231, 176, 102, 0.9)"
          : "rgba(231, 176, 102, 0.58)";
      const avatarInset = 6;
      const avatarSize = Math.max(28, accountHeaderH - avatarInset * 2);
      const avatarX = detailsX + 12 + Math.round(avatarSize / 2);
      const avatarY = detailsY + Math.round(accountHeaderH / 2);
      const textX = detailsX + 12 + avatarSize + 12;
      const maxAccountWidth = detailsColumnW - (textX - detailsX) - 12;
      const accountHeaderLabel = "GOOGLE ACCOUNT";
      const rawAccountText = accountLine;
      ctx.fillStyle = EMBER_BUTTON_PALETTE.text;
      ctx.font = `700 13px ${UI_FONT_FAMILY}`;
      ctx.fillText(fitText(accountHeaderLabel, maxAccountWidth), textX, detailsY + 22);
      ctx.font = `500 12px ${UI_FONT_FAMILY}`;
      ctx.fillStyle = accountTextColor;
      ctx.fillText(fitText(rawAccountText, maxAccountWidth), textX, detailsY + 41);
      drawCloudProfileAvatar(
        ctx,
        avatarX,
        avatarY,
        avatarSize,
        typeof window !== "undefined" ? window.cloudPhotoUrl : null,
      );
      ctx.strokeStyle = "rgba(242, 200, 125, 0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(detailsX + 12, detailsY + accountHeaderH);
      ctx.lineTo(detailsX + detailsColumnW - 12, detailsY + accountHeaderH);
      ctx.stroke();
      ctx.restore();

      if (actionEntries.length > 0) {
        const actionInnerX = detailsX + 12;
        const actionInnerY = detailsY + accountHeaderH + 8 + actionHeaderH + actionBodyTopPad;
        const actionInnerW = detailsColumnW - 24;
        const actionColGap = 10;
        const actionW = Math.max(
          120,
          Math.floor((actionInnerW - actionColGap * Math.max(0, actionColumns - 1)) / Math.max(1, actionColumns)),
        );
        ctx.save();
        ctx.fillStyle = EMBER_BUTTON_PALETTE.text;
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        ctx.font = `700 13px ${UI_FONT_FAMILY}`;
        ctx.fillText("Actions", detailsX + 12, detailsY + accountHeaderH + 22);
        ctx.restore();
        actionEntries.forEach(({ config, index }, actionIndex) => {
          const col = actionIndex % actionColumns;
          const row = Math.floor(actionIndex / actionColumns);
          const x = actionInnerX + col * (actionW + actionColGap);
          const y = actionInnerY + row * (actionButtonH + actionRowGap);
          const focused = isAnnouncementButtonFocused("title", index);
          ctx.save();
          ctx.fillStyle = focused ? "rgba(95, 50, 22, 0.95)" : "rgba(24, 20, 24, 0.9)";
          ctx.strokeStyle = focused ? EMBER_BUTTON_PALETTE.border : "rgba(242, 200, 125, 0.32)";
          ctx.lineWidth = focused ? 2 : 1;
          roundRect(ctx, x, y, actionW, actionButtonH, 8, true, true);
          drawPlayLoadActionIcon(config.key, x + 14, y + actionButtonH / 2, 14, focused);
          ctx.fillStyle = EMBER_BUTTON_PALETTE.text;
          ctx.shadowColor = EMBER_BUTTON_PALETTE.textShadow;
          ctx.shadowBlur = 4;
          ctx.shadowOffsetY = 0;
          ctx.textAlign = "left";
          ctx.textBaseline = "alphabetic";
          ctx.font = `600 14px ${UI_FONT_FAMILY}`;
          ctx.fillText(config.label, x + 26, y + 23);
          ctx.restore();
          boundsByIndex[index] = {
            key: config.key,
            navZone: "actions",
            navRow: row,
            navCol: col,
            x: layout.offsetX + x * layout.scale,
            y: layout.offsetY + y * layout.scale,
            width: actionW * layout.scale,
            height: actionButtonH * layout.scale,
          };
        });
      }
      boundsByIndex.forEach((item) => {
        if (item) bounds.push(item);
      });
    } else {
      // Title screen shows only background art and buttons.
      const buttonWidth = Math.min(240, Math.floor(layout.virtualCanvas.width / buttonConfigs.length) - 24);
      const buttonHeight = 64;
      const buttonGap = 28;
      const rowWidth = buttonWidth * buttonConfigs.length + buttonGap * (buttonConfigs.length - 1);
      const startX = Math.round(layout.virtualCanvas.width / 2 - rowWidth / 2);
      const buttonY = Math.round(layout.buttonY || 0);
      buttonConfigs.forEach((config, index) => {
        const x = startX + index * (buttonWidth + buttonGap);
        // Show loading progress on play button (fully loading) or map button (gameplay loading)
        const isLoading =
          (config.key === "play" && !assetsLoaded) ||
          (config.key === "map" && mapReady && !assetsLoaded);
        ctx.save();
        if (isLoading) {
          // Loading button as progress meter: dark background with fill
          ctx.fillStyle = EMBER_BUTTON_PALETTE.loadingBase;
          ctx.strokeStyle = EMBER_BUTTON_PALETTE.border;
          ctx.lineWidth = 2;
          roundRect(ctx, x, buttonY, buttonWidth, buttonHeight, 16, true, true);
          // Progress fill (clipped to button shape)
          const fillWidth = buttonWidth * (progress / 100);
          if (fillWidth > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(x, buttonY, buttonWidth, buttonHeight, 16);
            ctx.clip();
            ctx.fillStyle = EMBER_BUTTON_PALETTE.loadingFill;
            ctx.fillRect(x, buttonY, fillWidth, buttonHeight);
            ctx.restore();
          }
        } else {
          // Normal button
          ctx.fillStyle = getEmberButtonGradient(ctx, buttonY, buttonHeight);
          ctx.strokeStyle = EMBER_BUTTON_PALETTE.border;
          ctx.lineWidth = 2;
          roundRect(ctx, x, buttonY, buttonWidth, buttonHeight, 16, true, true);
        }
        if (isAnnouncementButtonFocused("title", index)) {
          drawFocusRing(ctx, x - 3, buttonY - 3, buttonWidth + 6, buttonHeight + 6, 18);
          drawButtonReflection(ctx, x, buttonY, buttonWidth, buttonHeight, 16, 0.45);
        }
        ctx.fillStyle = EMBER_BUTTON_PALETTE.text;
        ctx.shadowColor = EMBER_BUTTON_PALETTE.textShadow;
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 1;
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

    }
    // Subtle title-screen controls hint (shown for both main title buttons and Play/Load menu).
    drawFooterControlsHint(
      ctx,
      layout.virtualCanvas.width / 2,
      layout.virtualCanvas.height - 10,
      UI_FONT_FAMILY,
    );
    if (typeof window !== "undefined") {
      window.__titleMenuButtonBounds = bounds;
      window.__announcementButtons = { key: "title", buttons: bounds };
    }
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
      const scoreTextSize = Math.round(bodySize * 0.85);
      const lineGap = Math.round(scoreTextSize * 1.2);
      const latestText = `Latest Run: ${lastRunScore == null ? "--" : Math.round(lastRunScore)}`;
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
      townVictoryCampaign,
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
    const campaignId = String(townVictoryCampaign || "p1").toLowerCase();
    const _phases = window.BattlechurchCampaignLabels?.phases || {};
    const phaseLabel = _phases[campaignId] || campaignId.toUpperCase();

    let lines;
    if (campaignId === "p1") {
      lines = [
        { type: "heading", text: `Foothold Established in ${townName}`, size: headingSize, color: "#ffd978" },
        { type: "spacer", height: 50 },
        { type: "body", text: "The enemy has been driven back.", size: bodySize, color: "#EAF6FF" },
        { type: "body", text: "Ground has been taken in hostile territory.", size: bodySize, color: "#EAF6FF" },
        { type: "spacer", height: 30 },
        { type: "body", text: "You leave behind a garrison to hold the line,", size: bodySize, color: "#EAF6FF" },
        { type: "body", text: "and a commander to keep the advance going.", size: bodySize, color: "#EAF6FF" },
        { type: "spacer", height: 50 },
        { type: "score", text: `Troops at Handoff: ${score}`, size: scoreSize, color: "#ffd978" },
        { type: "spacer", height: 40 },
        { type: "body", text: "Another town awaits liberation...", size: bodySize, color: "#c8dce8" },
        { type: "spacer", height: 80 },
      ];
    } else if (campaignId === "p2") {
      lines = [
        { type: "heading", text: `${phaseLabel} of ${townName} Secured`, size: headingSize, color: "#ffd978" },
        { type: "spacer", height: 50 },
        { type: "body", text: "You returned to reinforce the position you seized.", size: bodySize, color: "#EAF6FF" },
        { type: "body", text: "Under renewed assault, the garrison held firm.", size: bodySize, color: "#EAF6FF" },
        { type: "spacer", height: 30 },
        { type: "body", text: "The district is falling further under your control.", size: bodySize, color: "#EAF6FF" },
        { type: "body", text: "Resistance across the region is weakening.", size: bodySize, color: "#EAF6FF" },
        { type: "spacer", height: 50 },
        { type: "score", text: `Strength After Occupation: ${score}`, size: scoreSize, color: "#ffd978" },
        { type: "spacer", height: 40 },
        { type: "body", text: "Keep pushing. More towns need to fall.", size: bodySize, color: "#c8dce8" },
        { type: "spacer", height: 80 },
      ];
    } else {
      lines = [
        { type: "heading", text: `${townName} Fully Fortified`, size: headingSize, color: "#ffd978" },
        { type: "spacer", height: 50 },
        { type: "body", text: "Your return hardened the garrison into a fighting force.", size: bodySize, color: "#EAF6FF" },
        { type: "body", text: "This position is no longer holding. It is advancing.", size: bodySize, color: "#EAF6FF" },
        { type: "spacer", height: 30 },
        { type: "body", text: "The commander and troops stand ready to support the next push.", size: bodySize, color: "#EAF6FF" },
        { type: "body", text: "Another town can now be strengthened from here.", size: bodySize, color: "#EAF6FF" },
        { type: "spacer", height: 50 },
        { type: "score", text: `Strength After Fortification: ${score}`, size: scoreSize, color: "#ffd978" },
        { type: "spacer", height: 40 },
        { type: "body", text: "Press on. Build the largest force possible.", size: bodySize, color: "#c8dce8" },
        { type: "spacer", height: 80 },
      ];
    }

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
      ctx.fillStyle = getEmberButtonGradient(ctx, buttonY, buttonHeight);
      ctx.strokeStyle = EMBER_BUTTON_PALETTE.border;
      ctx.lineWidth = 2;
      roundRect(ctx, buttonX, buttonY, buttonWidth, buttonHeight, 18, true, true);
      // Add focus ring effect
      ctx.strokeStyle = EMBER_BUTTON_PALETTE.focus;
      ctx.lineWidth = 3;
      roundRect(ctx, buttonX - 3, buttonY - 3, buttonWidth + 6, buttonHeight + 6, 20, false, true);
      ctx.shadowBlur = 0;
      ctx.fillStyle = EMBER_BUTTON_PALETTE.text;
      ctx.shadowColor = EMBER_BUTTON_PALETTE.textShadow;
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 1;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `600 ${Math.round(22 * scaleHint)}px ${UI_FONT_FAMILY}`;
      const continueLabel3 = (typeof GameText !== 'undefined' && GameText.buttons?.continue) || "Continue";
      ctx.fillText(continueLabel3, buttonX + buttonWidth / 2, buttonY + buttonHeight / 2);
      ctx.restore();
    }

    ctx.restore();
  }

  function drawGame() {
    const {
      ctx,
      canvas,
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
      haloBladeStateBonus,
      spearState,
      spearStateSecondary,
      spearStateBonus,
      sentryState,
      sentryStateSecondary,
      sentryStateBonus,
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
      bossBonusTransitionFadeAlpha,
      recapIntroFadeAlpha,
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
    if (mapActive) {
      if (window.MapScreen?.draw) {
        window.MapScreen.draw(ctx, canvas);
      }
      const mapTransitionProgress =
        typeof window?.MapScreen?.getLaunchTransitionProgress === "function"
          ? window.MapScreen.getLaunchTransitionProgress()
          : 0;
      const hintFadeOutEnd = 0.52;
      const hintT = Math.max(0, Math.min(1, mapTransitionProgress / Math.max(0.001, hintFadeOutEnd)));
      const hintEase = hintT * hintT * (3 - 2 * hintT);
      const hintAlpha = 1 - hintEase;
      drawFooterControlsHint(
        ctx,
        canvas.width / 2,
        canvas.height - 10,
        UI_FONT_FAMILY,
        hintAlpha,
      );
      ctx.restore();
      return;
    }
    if (titleScreenActive) {
      drawTitleScreen();
      drawPlayingInstructionsOverlay();
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
    const mapLaunchHandoffActive =
      typeof window !== "undefined" && Boolean(window.__mapTownLaunchFadeIn);
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
      !mapLaunchHandoffActive &&
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
    const getMapLaunchFadeInAlpha = () => {
      if (typeof window === "undefined" || !window.__mapTownLaunchFadeIn) return;
      const fadeState = window.__mapTownLaunchFadeIn;
      if (typeof fadeState.startMs !== "number" || !Number.isFinite(fadeState.startMs)) {
        fadeState.startMs = nowMs;
      }
      const startMs = fadeState.startMs;
      const durationMs = Math.max(50, Number(fadeState.durationMs) || 1050);
      const t = Math.max(0, Math.min(1, (nowMs - startMs) / durationMs));
      const eased = t * t * (3 - 2 * t);
      const maxAlpha = Math.max(0, Math.min(0.92, Number(fadeState.maxAlpha) || 0.62));
      const alpha = Math.max(0, Math.min(maxAlpha, (1 - eased) * maxAlpha));
      if (alpha <= 0.001) {
        delete window.__mapTownLaunchFadeIn;
        return 0;
      }
      return alpha;
    };
    const drawMapLaunchFadeInOverlay = () => {
      const alpha = getMapLaunchFadeInAlpha();
      if (!alpha) return 0;
      ctx.save();
      ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
      return alpha;
    };
    const drawWavyExteriorBackdrop = (image, { amp = 0.9, overlayAlpha = 0.35 } = {}) => {
      if (!image) return false;
      const stripHeight = 14;
      const time = (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000;
      const focusX = 0.5;
      const focusY = 0.5;
      const baseScale = Math.max(canvas.width / image.width, canvas.height / image.height);
      const drawW = image.width * baseScale;
      const drawH = image.height * baseScale;
      const offsetX = canvas.width * focusX - drawW * focusX;
      const offsetY = canvas.height * focusY - drawH * focusY;
      const scaleY = drawH / image.height;
      for (let y = 0; y < image.height; y += stripHeight) {
        const wave = Math.sin(time * 2 + y * 0.15) + Math.sin(time * 1.2 + y * 0.05);
        const offset = wave * amp;
        const srcH = Math.min(stripHeight, image.height - y);
        const destY = offsetY + y * scaleY;
        const destH = srcH * scaleY;
        ctx.drawImage(
          image,
          0,
          y,
          image.width,
          srcH,
          offsetX + offset,
          destY,
          drawW,
          destH,
        );
      }
      ctx.fillStyle = `rgba(8, 12, 20, ${Math.max(0, Math.min(1, overlayAlpha))})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return true;
    };
    // During map -> mission handoff, force-render exterior backdrop immediately so
    // we never flash congregation/pause content between states.
    if (mapLaunchHandoffActive && !townIntroActive && !exteriorShotActive) {
      const handoffAlpha = Number(getMapLaunchFadeInAlpha()) || 0;
      const introImage = assets?.backgrounds?.townIntro || null;
      ctx.save();
      ctx.fillStyle = "#0b111a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawWavyExteriorBackdrop(introImage, { amp: 0.9, overlayAlpha: 0.35 });
      if (handoffAlpha > 0.001) {
        // Darken base image first so embers remain visible above it.
        ctx.fillStyle = `rgba(0, 0, 0, ${handoffAlpha})`;
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
      ctx.restore();
      return;
    }
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
        drawWavyExteriorBackdrop(img, { amp: 0.9, overlayAlpha: 0.25 });
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
        ctx.restore();
        drawMapLaunchFadeInOverlay();
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
      const introAnnouncement = levelAnnouncements?.[0] || {};
      const introOrderNumber = Number.isFinite(introAnnouncement.upcomingOrderNumber)
        ? introAnnouncement.upcomingOrderNumber
        : 1;
      const effectiveCameraX = resolveCameraX();
      if (introOrderNumber === 1 && assets?.backgrounds?.townIntro) {
        const introImage = assets.backgrounds.townIntro;
        const stripHeight = 14;
        const time = (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000;
        const amp = 0.9;
        const focusX = 0.5;
        const focusY = 0.5;
        const baseScale = Math.max(canvas.width / introImage.width, canvas.height / introImage.height);
        const drawW = introImage.width * baseScale;
        const drawH = introImage.height * baseScale;
        const offsetX = canvas.width * focusX - drawW * focusX;
        const offsetY = canvas.height * focusY - drawH * focusY;
        const scaleY = drawH / introImage.height;
        for (let y = 0; y < introImage.height; y += stripHeight) {
          const wave = Math.sin(time * 2 + y * 0.15) + Math.sin(time * 1.2 + y * 0.05);
          const offset = wave * amp;
          const srcH = Math.min(stripHeight, introImage.height - y);
          const destY = offsetY + y * scaleY;
          const destH = srcH * scaleY;
          ctx.drawImage(
            introImage,
            0,
            y,
            introImage.width,
            srcH,
            offsetX + offset,
            destY,
            drawW,
            destH,
          );
        }
      } else {
        drawBackground(effectiveCameraX, 0);
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
      // Chapter Break (aka Battle Break) screen: Battle I/II/III + exterior shot.
      const announcementTitle = levelAnnouncements?.[0]?.title || "";
      const announcementSubtitle = levelAnnouncements?.[0]?.subtitle || "";
      const _bhCamp = window.activeCampaign || "p1";
      const _bhLabels = window.BattlechurchCampaignLabels || {};
      const battleHeadings = _bhLabels.actTitles?.[_bhCamp] || _bhLabels.actTitles?.p1 || {};
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
      const battleHeading = battleHeadings[orderNumber] || `Mission ${orderNumber}`;
      const _bhPhaseName = _bhLabels.phases?.[_bhCamp] || _bhCamp.toUpperCase();
      const _bhTownNumber = levelStatus?.level || 1;
      const eyebrowText = `Phase ${_bhTownNumber}: ${_bhPhaseName}`;
      const headerSubtitleText = upcomingNumber > 1 ? `Battle ${upcomingNumber}` : "";
      const eyebrowDone = isAnnouncementRevealComplete(eyebrowText, "");
      const headerDone = isAnnouncementRevealComplete(battleHeading, headerSubtitleText);
      const eyebrowSize = 18;
      const eyebrowGap = 16;
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
        eyebrowSize + eyebrowGap + headerLayout.textBlockHeight + headerBodyGap + bodyLayout.textBlockHeight;
      const textGroupTopY = Math.max(
        90,
        Math.round((canvas.height - textGroupHeight) / 2),
      );
      const eyebrowY = textGroupTopY + eyebrowSize;
      const headerYBase = eyebrowY + eyebrowGap + headerLayout.titleLineHeight;
      const bodyYBase =
        headerYBase - headerLayout.titleLineHeight +
        headerLayout.textBlockHeight +
        headerBodyGap +
        bodyLayout.titleLineHeight;
      drawAnnouncementText(ctx, canvas, {
        title: eyebrowText,
        subtitle: "",
        yBase: eyebrowY + Math.round(eyebrowSize * 0.55),
        titleSize: eyebrowSize,
        weight: "600",
        typewriter: true,
        typewriterRateMs: 10,
        textPalette: {
          title: HELLFIRE_TEXT_PALETTE.subtitle,
          shadow: HELLFIRE_TEXT_PALETTE.shadow,
        },
        maxWidthScale: 0.9,
        blockAlign: "center",
      });
      {
        drawAnnouncementText(ctx, canvas, {
          title: battleHeading,
          subtitle: headerSubtitleText,
          yBase: headerYBase,
          titleSize: headerTitleSize,
          subtitleSize: headerSubtitleSize,
          lineGap: Math.round(headerTitleSize * 1.1),
          weight: "bold",
          subtitleWeight: "bold",
          typewriter: true,
          typewriterRateMs: 10,
          freezeTypewriter: !eyebrowDone,
          textPalette: HELLFIRE_TEXT_PALETTE,
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
          typewriterRateMs: 10,
          freezeTypewriter: !eyebrowDone || !headerDone,
          titleSize: bodyTitleSize,
          weight: TEXT_STYLES.h1.weight,
          textPalette: HELLFIRE_TEXT_PALETTE,
          maxWidthScale: 0.92,
        });
        ctx.restore();
      }
      const showContinueButton =
        eyebrowDone &&
        headerDone &&
        isAnnouncementRevealComplete(announcementTitle, announcementSubtitle);
      if (!showContinueButton) {
        if (typeof window !== "undefined" && window.__announcementButtons?.key === "chapterBreak") {
          window.__announcementButtons = null;
        }
        if (townIntroOverlay && townIntroOverlay.alpha > 0.001) {
          const _coverImg = assets?.backgrounds?.townIntro || null;
          ctx.save();
          ctx.globalAlpha = townIntroOverlay.alpha;
          ctx.fillStyle = "#0b111a";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          if (_coverImg) {
            drawCoverImage(ctx, canvas, _coverImg, townIntroOverlay.scale, townIntroOverlay.focusX, townIntroOverlay.focusY);
            ctx.fillStyle = "rgba(8, 12, 20, 0.25)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          ctx.restore();
        }
        drawMapLaunchFadeInOverlay();
        return;
      }
      ctx.save();
      const buttonText = "Continue";
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
      ctx.fillStyle = getEmberButtonGradient(ctx, buttonY, buttonHeight);
      ctx.strokeStyle = EMBER_BUTTON_PALETTE.border;
      ctx.lineWidth = 2;
      roundRect(ctx, buttonX, buttonY, buttonWidth, buttonHeight, 16, true, true);
      if (isAnnouncementButtonFocused("chapterBreak", 0)) {
        drawFocusRing(ctx, buttonX - 3, buttonY - 3, buttonWidth + 6, buttonHeight + 6, 18);
      }
      ctx.fillStyle = EMBER_BUTTON_PALETTE.text;
      ctx.shadowColor = EMBER_BUTTON_PALETTE.textShadow;
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 1;
      ctx.textAlign = "center";
      ctx.font = `18px ${UI_FONT_FAMILY}`;
      ctx.textBaseline = "alphabetic";
      ctx.fillText(buttonText, buttonX + buttonWidth / 2, buttonY + buttonHeight / 2 + 6);
      ctx.restore();
      if (townIntroOverlay && townIntroOverlay.alpha > 0.001) {
        const _coverImg = assets?.backgrounds?.townIntro || null;
        ctx.save();
        ctx.globalAlpha = townIntroOverlay.alpha;
        ctx.fillStyle = "#0b111a";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (_coverImg) {
          drawCoverImage(ctx, canvas, _coverImg, townIntroOverlay.scale, townIntroOverlay.focusX, townIntroOverlay.focusY);
          ctx.fillStyle = "rgba(8, 12, 20, 0.25)";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.restore();
      }
      drawMapLaunchFadeInOverlay();
      return;
    }
    if (exteriorShotActive) {
      const announcementTitle = levelAnnouncements?.[0]?.title || "";
      const img = assets?.backgrounds?.townIntro || null;
      const mapLaunchFadeAlpha = Number(getMapLaunchFadeInAlpha()) || 0;
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
        if (typeof fireOverlay.setIntensity === "function") {
          fireOverlay.setIntensity(1.9);
        }
        if (typeof fireOverlay.setSizeScale === "function") {
          fireOverlay.setSizeScale(0.7);
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
        typewriterRateMs: 8,
        freezeTypewriter: mapLaunchFadeAlpha > 0.08,
        titleSize,
        weight: TEXT_STYLES.h1.weight,
        textPalette: HELLFIRE_TEXT_PALETTE,
        maxWidthScale: 0.92,
      });
      ctx.restore();
      drawMapLaunchFadeInOverlay();
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
        if (recapIntroFadeAlpha > 0) {
          ctx.save();
          ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(1, recapIntroFadeAlpha)})`;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.restore();
        }
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
      if (recapIntroFadeAlpha > 0) {
        ctx.save();
        ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(1, recapIntroFadeAlpha)})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }
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
    const isCongregationStage =
      (levelStatus?.stage === "levelIntro" || levelStatus?.stage === "congregationToTeaser") &&
      !gameOver &&
      !visitorStageActive;
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
          const flashRemainingMs = Number.isFinite(member.__threatHitFlashUntil)
            ? Math.max(0, member.__threatHitFlashUntil - now)
            : 0;
          const knockUntil = Number.isFinite(member.__threatKnockUntil) ? member.__threatKnockUntil : 0;
          const knockStart = Number.isFinite(member.__threatKnockStart) ? member.__threatKnockStart : 0;
          let knockX = 0;
          let knockY = 0;
          if (knockUntil > now && knockStart < knockUntil) {
            const tKnock = (now - knockStart) / Math.max(1, knockUntil - knockStart);
            const easeOut = 1 - Math.min(1, Math.max(0, tKnock));
            const dirX = Number.isFinite(member.__threatKnockDirX) ? member.__threatKnockDirX : 0;
            const dirY = Number.isFinite(member.__threatKnockDirY) ? member.__threatKnockDirY : 0;
            knockX = dirX * CONGREGATION_THREAT_KNOCKBACK_PX * easeOut;
            knockY = dirY * CONGREGATION_THREAT_KNOCKBACK_PX * easeOut;
          }
          const flashStrength = flashRemainingMs > 0
            ? Math.max(0.2, Math.min(1, flashRemainingMs / CONGREGATION_THREAT_HIT_FLASH_MS))
            : 0;
          member.animator.draw(ctx, member.x + knockX, member.y - 12 + knockY, {
            alpha: drawAlpha,
            flashWhite: flashStrength,
          });
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
      const baseOrderedEnemies = [...enemies].sort((a, b) => orderIndex(a) - orderIndex(b));
      const tormentorOrbitersByParent = new Map();
      baseOrderedEnemies.forEach((enemy) => {
        const isOrbitingTormentorOrbiter =
          enemy &&
          enemy.type === "tormentorFlame" &&
          enemy._orbiting &&
          enemy.orbitParent;
        if (!isOrbitingTormentorOrbiter) return;
        const parent = enemy.orbitParent;
        if (!tormentorOrbitersByParent.has(parent)) {
          tormentorOrbitersByParent.set(parent, []);
        }
        tormentorOrbitersByParent.get(parent).push(enemy);
      });
      tormentorOrbitersByParent.forEach((list, parent) => {
        list.sort((a, b) => (a?.y || 0) - (b?.y || 0));
      });
      orderedEnemies = [];
      baseOrderedEnemies.forEach((enemy) => {
        const orbiters = tormentorOrbitersByParent.get(enemy) || null;
        if (orbiters && orbiters.length) {
          orbiters.forEach((orbiter) => {
            const isFrontHalf = Math.sin(orbiter.orbitAngle || 0) >= 0;
            if (!isFrontHalf) orderedEnemies.push(orbiter);
          });
        }
        const isEmbeddedOrbiter =
          enemy &&
          enemy.type === "tormentorFlame" &&
          enemy._orbiting &&
          enemy.orbitParent &&
          baseOrderedEnemies.includes(enemy.orbitParent);
        if (!isEmbeddedOrbiter) {
          orderedEnemies.push(enemy);
        }
        if (orbiters && orbiters.length) {
          orbiters.forEach((orbiter) => {
            const isFrontHalf = Math.sin(orbiter.orbitAngle || 0) >= 0;
            if (isFrontHalf) orderedEnemies.push(orbiter);
          });
        }
      });
      orderedEnemies.forEach((enemy) => enemy.draw());
      drawSwarmGroupCounters(ctx, orderedEnemies);
      if (activeBoss) activeBoss.draw(ctx);
      drawEnemyWeaponHitboxDebugs(ctx, orderedEnemies, activeBoss);
    }
    // Draw grace gems before NPCs so NPCs remain readable when gems overlap.
    gracePickups.forEach((pickup) => {
      if (pickup && typeof pickup.draw === "function") pickup.draw(ctx);
    });
    if (!visitorStageActive && !isCongregationStage && battleNpcs.length) {
      drawBattleNpcs(ctx, battleNpcs, npcFadeAlpha);
    }
    if (!visitorStageActive && orderedEnemies.length) {
      orderedEnemies.forEach((enemy) => {
        if (enemy && typeof enemy.drawPostNpcOverlay === "function") {
          enemy.drawPostNpcOverlay();
        }
      });
    }
    const shouldDepthSortNpcUi = !visitorStageActive && battleNpcs.length && !isCongregationStage;
    if (shouldDepthSortNpcUi) {
      const overlayByOwner = new Map();
      npcFaithOverlays.forEach((entry) => {
        if (entry?.owner) overlayByOwner.set(entry.owner, entry);
      });
      const sortedNpcs = [...battleNpcs].sort((a, b) => (a?.y || 0) - (b?.y || 0));
      sortedNpcs.forEach((npc) => {
        const rushAlpha = Number.isFinite(npc?.graceRushNpcFadeAlpha)
          ? Math.max(0, Math.min(1, npc.graceRushNpcFadeAlpha))
          : 1;
        const drawAlpha = npcFadeAlpha * rushAlpha;
        if (drawAlpha <= 0.001) return;
        ctx.save();
        ctx.globalAlpha *= drawAlpha;
        if (npc?.name) {
          const nameY = npc.y - (npc.radius || 28) - 10;
          drawNameTag(ctx, npc.name, npc.x, nameY, UI_FONT_FAMILY);
        }
        const overlay = overlayByOwner.get(npc);
        if (overlay) drawNpcFaithOverlayEntry(overlay);
        ctx.restore();
      });
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
    const bossDeathExplosionActive =
      Boolean(activeBoss) &&
      activeBoss?.state === "death" &&
      (
        (Number.isFinite(activeBoss?.deathExplosionTimer) && activeBoss.deathExplosionTimer > 0) ||
        (Number.isFinite(activeBoss?.deathPostDelay) && activeBoss.deathPostDelay > 0)
      );
    const hidePlayerForBriefTeaser = levelStatus?.stage === "briefingTeaser";
    if (player && bossDeathExplosionActive && !hidePlayerForBriefTeaser) {
      // During boss death explosions, keep the player behind the explosion stack.
      player.draw();
    }
    if (!graceRushBlackout && !(graceRushHardBlackoutTimer > 0)) {
      effects.forEach((effect) => effect.draw());
    }
    utilityPowerUps.forEach((powerUp) => powerUp.draw(ctx));
    weaponPickups.forEach((pickup) => pickup.draw());
    churchPowerupPickups.forEach((pickup) => pickup.draw());
    drawPrayerStormGroundFires();
    drawRingOfFireEffects(player);
    drawCongregationCommandMeter(player, battleNpcs);
    if (player && !hidePlayerForBriefTeaser) {
      const _ghostTarget = window._meleeAttackState?.teleportGhostTarget;
      if (_ghostTarget) {
        const now = (typeof performance !== "undefined" ? performance.now() : Date.now()) * 0.001;
        // Ghost copy only: white-ish pulse, no marker overlay.
        ctx.save();
        ctx.globalAlpha = 0.3 + 0.08 * Math.sin(now * 9.0);
        ctx.filter = "grayscale(1) brightness(2.35) contrast(0.45) blur(0.9px)";
        ctx.shadowColor = "rgba(255, 255, 255, 0.55)";
        ctx.shadowBlur = 10;
        player.animator.draw(ctx, _ghostTarget.x, _ghostTarget.y, { flipX: player.facing === "left" });
        ctx.restore();
      }
      if (!graceRushBlackout && !(graceRushHardBlackoutTimer > 0)) {
        try { drawFloatingTextsOverlay(ctx); } catch (e) {}
        try { drawEnemyHpLabelsOverlay(ctx); } catch (e) {}
      }
      if (!bossDeathExplosionActive) {
        player.draw();
      }
      drawPlayerPrayerHoldMeter(player);
      drawPlayerRingFireChargeMeter(player);
      drawPlayerWeaponMeter(player);
      drawPlayerExtendMeter(player);
    }

    // Draw god rays above characters so light appears between viewer and characters
    drawArenaGodRays(ctx, canvas, floorBandHeight, effectiveCameraX);

    // Draw spears above other sprites/effects so they remain visible in chaos.
    drawSentryTurret(ctx, sentryState);
    drawSentryTurret(ctx, sentryStateSecondary);
    drawSentryTurret(ctx, sentryStateBonus);
    drawHaloBlade(ctx, haloBladeState);
    drawHaloBlade(ctx, haloBladeStateSecondary);
    drawHaloBlade(ctx, haloBladeStateBonus);
    drawSpearDart(ctx, spearState);
    drawSpearDart(ctx, spearStateSecondary);
    drawSpearDart(ctx, spearStateBonus);

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
    const waveProgress = getWaveProgressRatio(levelStatus);
    const stageName = levelStatus?.stage || "";
    const bossPhase3HeatBlend = getBossPhase3HeatBlend(levelStatus);
    const isVictoryCelebrate =
      (levelStatus?.stage || "") === "victoryCelebrate" ||
      (levelStatus?.stage || "") === "bossVictoryCelebrate";
    const preserveEmberComposition = isVictoryCelebrate;
    const victoryStageDuration = Math.max(0.001, Number(levelStatus?.stageDuration) || 5);
    const victoryStageTimer = Math.max(0, Number(levelStatus?.stageTimer) || 0);
    const victoryHeatFadeRatio = isVictoryCelebrate
      ? Math.max(0, Math.min(1, victoryStageTimer / victoryStageDuration))
      : 1;
    const currentWaveNumber = Math.max(
      1,
      Number(levelStatus?.waveNum) || Number(levelStatus?.wave) || 1,
    );
    const bossPhase = Math.max(0, Number(levelStatus?.bossPhase) || 0);
    const bossPhase3TargetActive =
      stageName === "bossVictoryCelebrate" ||
      ((stageName === "bossIntro" || stageName === "bossActive") && bossPhase >= 3);
    const waveThreeEmberBoost = currentWaveNumber >= 3;
    const maxHeatEmberBoost =
      waveThreeEmberBoost ||
      stageName === "bossIntro" ||
      stageName === "bossActive" ||
      stageName === "bossVictoryCelebrate";
    const ashMaxAlpha =
      WAVE_ATMOSPHERE_CONFIG.ashBaseMaxAlpha +
      (WAVE_ATMOSPHERE_CONFIG.bossPhase3AshMaxAlpha - WAVE_ATMOSPHERE_CONFIG.ashBaseMaxAlpha) * bossPhase3HeatBlend;
    const ashAlpha =
      WAVE_ATMOSPHERE_CONFIG.ashBaseMinAlpha +
      (ashMaxAlpha - WAVE_ATMOSPHERE_CONFIG.ashBaseMinAlpha) * waveProgress;
    const ashOverlay = requireBindings().ashOverlay;
    if (ashOverlay && typeof ashOverlay.draw === "function") {
      const baseParticleCount = bossPhase3TargetActive ? 180 : (maxHeatEmberBoost ? 180 : 100);
      const targetParticleCount = preserveEmberComposition
        ? (Number.isFinite(ashEmberTuneState.particleCount) ? ashEmberTuneState.particleCount : baseParticleCount)
        : Math.max(
            40,
            Math.round(baseParticleCount * victoryHeatFadeRatio),
          );
      const phase3EmberRatio = 0.72;
      const nonPhase3EmberRatio = maxHeatEmberBoost ? 0.82 : 0.55;
      const baseEmberRatio =
        nonPhase3EmberRatio + (phase3EmberRatio - nonPhase3EmberRatio) * bossPhase3HeatBlend;
      const targetEmberRatio = preserveEmberComposition
        ? (Number.isFinite(ashEmberTuneState.emberRatio) ? ashEmberTuneState.emberRatio : baseEmberRatio)
        : Math.max(0.12, baseEmberRatio * victoryHeatFadeRatio);
      const phase3Intensity = 1.72;
      const nonPhase3Intensity = maxHeatEmberBoost ? 1.55 : 1.0;
      const baseIntensity =
        nonPhase3Intensity + (phase3Intensity - nonPhase3Intensity) * bossPhase3HeatBlend;
      const targetIntensity = Math.max(0.2, baseIntensity * victoryHeatFadeRatio);
      const targetSizeScale = 1.0;
      if (typeof ashOverlay.setParticleCount === "function" && ashEmberTuneState.particleCount !== targetParticleCount) {
        ashOverlay.setParticleCount(targetParticleCount);
        ashEmberTuneState.particleCount = targetParticleCount;
      }
      if (typeof ashOverlay.setEmberRatio === "function" && ashEmberTuneState.emberRatio !== targetEmberRatio) {
        ashOverlay.setEmberRatio(targetEmberRatio);
        ashEmberTuneState.emberRatio = targetEmberRatio;
      }
      if (typeof ashOverlay.setIntensity === "function" && ashEmberTuneState.intensity !== targetIntensity) {
        ashOverlay.setIntensity(targetIntensity);
        ashEmberTuneState.intensity = targetIntensity;
      }
      if (typeof ashOverlay.setSizeScale === "function" && ashEmberTuneState.sizeScale !== targetSizeScale) {
        ashOverlay.setSizeScale(targetSizeScale);
        ashEmberTuneState.sizeScale = targetSizeScale;
      }
      if (typeof ashOverlay.setBounds === "function") {
        ashOverlay.setBounds(0, 0, canvas.width, canvas.height);
      }
      const victoryAshAlpha = Math.max(0, Math.min(1, ashAlpha * victoryHeatFadeRatio));
      ctx.globalAlpha = victoryAshAlpha;
      ashOverlay.draw(ctx);
    }

    ctx.restore();

    // Screen-space fog should not move with the camera.
    drawWaveProgressionAtmosphere(
      ctx,
      waveProgress,
      { x: 0, y: 0, width: canvas.width, height: canvas.height },
    );

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
      const { shieldTrailStateA, shieldTrailStateB } = requireBindings();
      drawShieldTrail(ctx, shieldTrailStateA);
      drawShieldTrail(ctx, shieldTrailStateB);
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

    const smiteBombFlashTimer = requireBindings().smiteBombFlashTimer || 0;
    if (smiteBombFlashTimer > 0) {
      const smiteBombFlashDuration = Math.max(0.001, requireBindings().smiteBombFlashDuration || 0.16);
      const t = Math.min(1, Math.max(0, smiteBombFlashTimer / smiteBombFlashDuration));
      const progress = 1 - t;
      const alpha = Math.max(0, Math.min(0.92, t * 0.92));
      const rayboltFrames = requireBindings().assets?.effects?.raybolt || [];
      if (alpha > 0.001 && Array.isArray(rayboltFrames) && rayboltFrames.length) {
        const frameIndex = Math.min(
          rayboltFrames.length - 1,
          Math.max(0, Math.floor(progress * rayboltFrames.length)),
        );
        const frame = rayboltFrames[frameIndex] || rayboltFrames[rayboltFrames.length - 1];
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.globalCompositeOperation = "screen";
        ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);
        ctx.restore();
      } else if (alpha > 0.001) {
        ctx.save();
        ctx.fillStyle = `rgba(235, 246, 255, ${alpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }
    }

    const bossLightningFlashAlpha = requireBindings().bossLightningFlashAlpha || 0;
    if (bossLightningFlashAlpha > 0) {
      const flicker = 0.86 + Math.random() * 0.24;
      const alpha = Math.max(0, Math.min(0.45, bossLightningFlashAlpha * flicker));
      if (alpha > 0.001) {
        ctx.save();
        ctx.fillStyle = `rgba(206, 232, 255, ${alpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }
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

    if (bossBonusTransitionFadeAlpha > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(1, bossBonusTransitionFadeAlpha)})`;
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
    const graceSpendFlyEffects = requireBindings().graceSpendFlyEffects;
    if (graceSpendFlyEffects && graceSpendFlyEffects.length) {
      ctx.save();
      graceSpendFlyEffects.forEach((effect) => {
        if (!effect || !effect.frame || effect.timer < effect.delay) return;
        const size = effect.size || 14;
        ctx.globalAlpha = typeof effect.alpha === "number" ? effect.alpha : 1;
        ctx.drawImage(effect.frame, effect.x - size / 2, effect.y - size / 2, size, size);
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
    if (
      levelStatus?.stage === "graceRush" ||
      levelStatus?.stage === "bossVictoryCelebrate" ||
      graceRushState?.active
    ) {
      drawGraceRushOverlay(levelStatus, graceRushState);
    }
    if (visitorStageActive) {
      const visitorSummaryAnnouncementActive = Boolean(levelAnnouncements[0]?.isVisitorSummary);
      const visitorStateForOverlay = visitorSummaryAnnouncementActive && visitorSession?.summaryActive
        ? { ...visitorSession, summaryActive: false }
        : visitorSession;
      drawVisitorOverlay(visitorStateForOverlay);
    }
    drawLevelAnnouncements();
    if (recapIntroFadeAlpha > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(1, recapIntroFadeAlpha)})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
    if (isCongregationStage) {
      drawCongregationScene(levelStatus);
    } else {
      congregationIntroState.lastStage = null;
      resetCongregationThreatState();
    }
    drawMeleeSwingOverlay(ctx, player);
    drawSpeedrunTimer();
    drawCongregationOverlay();
    // Effects are drawn earlier in the world pass so the player stays on top.
    if (paused && !gameOver && !mapLaunchHandoffActive) {
      drawPauseOverlay();
      drawPlayingInstructionsOverlay();
      return;
    }
    drawPlayingInstructionsOverlay();
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

    // Keep this near the end so congregation UI (text/button) also fades.
    drawCongregationToTeaserFade(levelStatus);

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

    // Double strike second swoosh — yellow, offset outward, slightly bigger, longer linger
    if ((state.doubleStrikeSwooshTimer || 0) > 0 && state.doubleStrikeSwooshDir) {
      const ds2Duration = MELEE_SWING_DURATION * 2.5;
      const ds2Intensity = Math.min(1, state.doubleStrikeSwooshTimer / ds2Duration);
      const ds2Scale = 1.28;
      const ds2Width = drawWidth * ds2Scale;
      const ds2Height = drawHeight * ds2Scale;
      const ds2Dir = state.doubleStrikeSwooshDir;
      const ds2Len = Math.hypot(ds2Dir.x, ds2Dir.y) || 1;
      const ds2Angle = Math.atan2(ds2Dir.y, ds2Dir.x);
      const offsetPx = 5;
      const ds2OriginX = originX + (ds2Dir.x / ds2Len) * offsetPx;
      const ds2OriginY = originY + (ds2Dir.y / ds2Len) * offsetPx;
      ctx.save();
      ctx.translate(ds2OriginX, ds2OriginY);
      ctx.rotate(ds2Angle);
      ctx.filter = "sepia(1) saturate(8) hue-rotate(10deg) brightness(1.4)";
      ctx.globalAlpha = ds2Intensity * 0.85;
      ctx.drawImage(swooshImg, rectX, -ds2Height * 0.5, ds2Width, ds2Height);
      ctx.restore();
    }
  }

  function drawCongregationToTeaserFade(levelStatus) {
    const { ctx, canvas } = requireBindings();
    if (!ctx || !canvas || !levelStatus) return;
    const stage = levelStatus.stage;
    const timer = Number(levelStatus.stageTimer) || 0;
    const duration = Math.max(0.001, Number(levelStatus.stageDuration) || 0);

    let alpha = 0;
    if (stage === "congregationToTeaser" || stage === "upgradeToTeaser") {
      const progress = Math.max(0, Math.min(1, 1 - timer / duration));
      alpha = progress;
    } else if (stage === "briefingTeaser") {
      const progress = Math.max(0, Math.min(1, 1 - timer / duration));
      const fadeInWindow = 1.00;
      if (progress <= fadeInWindow) {
        const t = progress / Math.max(0.001, fadeInWindow);
        alpha = 1 - t;
      }
    }

    if (alpha <= 0.001) return;
    ctx.save();
    ctx.fillStyle = `rgba(0, 0, 0, ${Math.max(0, Math.min(1, alpha))})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
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
    ctx.fillStyle = HELLFIRE_TEXT_PALETTE.title;
    ctx.shadowColor = HELLFIRE_TEXT_PALETTE.shadow;
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
    const baseAlpha = Math.max(0, Math.min(1, alpha));
    ctx.save();
    npcsToDraw.forEach((npc) => {
      if (!npc) return;
      const rushAlpha = Number.isFinite(npc.graceRushNpcFadeAlpha)
        ? Math.max(0, Math.min(1, npc.graceRushNpcFadeAlpha))
        : 1;
      const drawAlpha = baseAlpha * rushAlpha;
      if (drawAlpha <= 0.001) return;
      ctx.save();
      ctx.globalAlpha *= drawAlpha;
      if (typeof npc.draw === "function") {
        npc.draw();
      }
      if (npc.state === "lostFaith") {
        drawLostFaithHighlight(ctx, npc);
      }
      ctx.restore();
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
      const entityFadeAlpha = Number.isFinite(ft?.entity?.graceRushNpcFadeAlpha)
        ? Math.max(0, Math.min(1, ft.entity.graceRushNpcFadeAlpha))
        : 1;
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
      const compositeAlpha = alpha * effectiveBaseAlpha * entityFadeAlpha;
      if (compositeAlpha <= 0.001) {
        ctx.restore();
        return;
      }
      ctx.globalAlpha = compositeAlpha;
      const style = ft.style || (ft.speechBubble ? "speech" : "plain");
      const fontSize = ft.fontSize || (style === "speech" ? 12 : 14);
      const fontWeight = ft.fontWeight || (style === "speech" ? "500" : "600");
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
        const wrapWidth = Number.isFinite(ft.bubbleMaxWidth) && ft.bubbleMaxWidth > 0 ? ft.bubbleMaxWidth : 220;
        const speechLines = rawText
          .split("\n")
          .flatMap((line) => {
            const wrapped = wrapText(ctx, line, wrapWidth);
            return wrapped.length ? wrapped : [""];
          });
        const bubbleTextWidth = speechLines.reduce((max, line) => {
          const width = ctx.measureText(line).width;
          return Math.max(max, width);
        }, 0);
        const paddingX = 10;
        const paddingY = 8;
        const bubbleWidth = bubbleTextWidth + paddingX * 2;
        const bubbleHeight = speechLines.length * lineHeight + paddingY * 2;
        const bubbleX = drawX - bubbleWidth / 2;
        const bubbleY = drawY - bubbleHeight - 10;
        const cornerRadius = 10;
        const bubbleTheme = ft.bubbleTheme || "default";
        const isNpcBubble = bubbleTheme === "npc";
        const isHeroBubble = bubbleTheme === "hero";
        const isHeroComboBubble = bubbleTheme === "heroCombo";
        const isStyledBubble = isNpcBubble || isHeroBubble || isHeroComboBubble;
        const now_b = typeof performance !== "undefined" ? performance.now() : Date.now();
        // Pulse frequency: hero slightly faster for a livelier feel
        const pulseSpeed = isHeroBubble || isHeroComboBubble ? 0.005 : 0.004;
        const stylePulse = isStyledBubble ? 0.55 + 0.45 * Math.sin(now_b * pulseSpeed) : 0;
        // Old style (preserved for easy revert): fillColor "rgba(24,38,64,0.82)", strokeColor "rgba(150,215,255,0.6)", lineWidth 2, no shadow
        const fillColor = isHeroComboBubble
          ? "rgba(46, 18, 6, 0.95)"
          : isHeroBubble
          ? "rgba(36, 24, 8, 0.92)"        // warm dark for pastor
          : isNpcBubble
            ? "rgba(10, 28, 58, 0.92)"     // deep blue for NPCs
            : "rgba(24, 38, 64, 0.82)";    // original default
        const strokeColor = isHeroComboBubble
          ? `rgba(255, ${Math.round(220 + 30 * stylePulse)}, ${Math.round(90 + 60 * stylePulse)}, ${0.8 + 0.2 * stylePulse})`
          : isHeroBubble
          ? `rgba(255, ${Math.round(200 + 40 * stylePulse)}, ${Math.round(80 + 60 * stylePulse)}, ${0.7 + 0.3 * stylePulse})`
          : isNpcBubble
            ? `rgba(${Math.round(120 + 100 * stylePulse)}, ${Math.round(200 + 55 * stylePulse)}, 255, ${0.7 + 0.3 * stylePulse})`
            : "rgba(150, 215, 255, 0.6)"; // original default
        const shadowCol = isHeroComboBubble
          ? `rgba(255, 170, 40, ${0.6 + 0.4 * stylePulse})`
          : isHeroBubble
          ? `rgba(255, 180, 60, ${0.5 + 0.5 * stylePulse})`
          : `rgba(100, 200, 255, ${0.5 + 0.5 * stylePulse})`;
        ctx.save();
        ctx.globalAlpha = compositeAlpha * 0.9;
        ctx.fillStyle = fillColor;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = isStyledBubble || isHeroComboBubble ? 2.5 : 2;
        if (isStyledBubble || isHeroComboBubble) {
          ctx.shadowColor = shadowCol;
          ctx.shadowBlur = (isHeroComboBubble ? 12 : 8) + 10 * stylePulse;
        }
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
        ctx.save();
        ctx.fillStyle = ft.color;
        ctx.strokeStyle = "rgba(8, 12, 20, 0.8)";
        ctx.lineWidth = 3;
        ctx.lineJoin = "round";
        ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 1;
        speechLines.forEach((line, index) => {
          const lineY =
            bubbleY +
            paddingY +
            lineHeight * index +
            lineHeight / 2;
          ctx.strokeText(line, drawX, lineY);
          ctx.fillText(line, drawX, lineY);
        });
        ctx.restore();
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
        ctx.globalAlpha = compositeAlpha;
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
  // ---------------------------------------------------------------------------
  // Denominational Upgrade Screen
  // Shown as a map overlay before County 2/3/4 towns. Lets the player pick
  // N church powerups that start at level 5 for free.
  // ---------------------------------------------------------------------------
  function drawDenomUpgradeScreen(ctx, canvas, options = {}) {
    const {
      stats = [],
      selectedKeys = [],
      maxPicks = 1,
      focusedIndex = 0,
      uiFontFamily = "sans-serif",
    } = options;

    // Sync focus context so isAnnouncementButtonFocused works
    if (typeof window !== "undefined") {
      window.__announcementFocus = { key: "denomUpgradeScreen", index: focusedIndex };
    }

    // Dim the map behind the overlay
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    const confirmEnabled = selectedKeys.length >= maxPicks;
    const picksLeft = Math.max(0, maxPicks - selectedKeys.length);
    const title = "How Will You Equip Your Church?";
    const buttonHeight = 200;
    const buttonCount = stats.length;

    ctx.save();
    const layout = getAnnouncementScreenLayout(ctx, canvas, {
      title,
      subtitle: "",
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
      buttonCount: buttonCount + 1,
    });
    ctx.translate(layout.offsetX, layout.offsetY);
    ctx.scale(layout.scale, layout.scale);

    // Title only (instruction is now on the action button)
    const vw = layout.virtualCanvas.width;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.shadowColor = "rgba(6, 10, 18, 0.9)";
    ctx.shadowBlur = 22;
    ctx.fillStyle = "#F3E2C4";
    ctx.font = `${TEXT_STYLES.h1.weight} ${TEXT_STYLES.h1.size}px ${ANNOUNCEMENT_FONT_FAMILY}`;
    ctx.fillText(title, vw / 2, layout.titleY);
    ctx.restore();

    const { powerupIconStyles } = requireBindings();
    const buttonGap = 18;
    const sidePadding = 60;
    const totalAvailable = vw - sidePadding * 2;
    const buttonWidth = Math.floor((totalAvailable - buttonGap * (buttonCount - 1)) / buttonCount);
    const buttonRowWidth = buttonWidth * buttonCount + buttonGap * (buttonCount - 1);
    const buttonStartX = Math.round((vw - buttonRowWidth) / 2);
    const buttonY = Math.round(layout.buttonY || 0);

    const bounds = [];
    stats.forEach((stat, index) => {
      const x = buttonStartX + index * (buttonWidth + buttonGap);
      const isSelected = selectedKeys.includes(stat.key);
      const isDimmed = !isSelected && selectedKeys.length >= maxPicks;

      const cardRadius = 16;
      const cardX = x;
      const cardY = buttonY;
      const cardW = buttonWidth;
      const cardH = buttonHeight;
      const headerHeight = 52;
      const bodyTop = cardY + headerHeight + 18;
      const textLeft = cardX + 24 + 34; // 34 = icon size
      const textRight = cardX + cardW - 22;
      const textWidth = textRight - textLeft;

      ctx.save();
      const baseGradient = ctx.createLinearGradient(0, cardY, 0, cardY + cardH);
      if (isDimmed) {
        baseGradient.addColorStop(0, "rgba(35, 30, 25, 0.6)");
        baseGradient.addColorStop(1, "rgba(25, 22, 18, 0.55)");
      } else {
        baseGradient.addColorStop(0, "#2A2118");
        baseGradient.addColorStop(0.55, "#3A2E21");
        baseGradient.addColorStop(1, "#1E1812");
      }
      ctx.shadowColor = "rgba(8, 6, 4, 0.55)";
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 8;
      ctx.fillStyle = baseGradient;
      roundRect(ctx, cardX, cardY, cardW, cardH, cardRadius, true, false);
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.lineWidth = isSelected ? 2.5 : 2;
      ctx.strokeStyle = isSelected
        ? "rgba(255, 215, 80, 0.95)"
        : isDimmed
          ? "rgba(80, 65, 50, 0.35)"
          : "rgba(200, 160, 90, 0.85)";
      roundRect(ctx, cardX, cardY, cardW, cardH, cardRadius, false, true);
      // Inner ring
      ctx.lineWidth = 1;
      ctx.strokeStyle = isSelected ? "rgba(255, 230, 100, 0.4)" : "rgba(255, 255, 255, 0.12)";
      roundRect(ctx, cardX + 3, cardY + 3, cardW - 6, cardH - 6, Math.max(8, cardRadius - 4), false, true);

      // Header band
      ctx.save();
      roundRect(ctx, cardX, cardY, cardW, cardH, cardRadius, false, false);
      ctx.clip();
      const headerGradient = ctx.createLinearGradient(0, cardY, 0, cardY + headerHeight);
      if (isSelected) {
        headerGradient.addColorStop(0, "#6B5218");
        headerGradient.addColorStop(1, "#4E3A1D");
      } else if (isDimmed) {
        headerGradient.addColorStop(0, "rgba(60, 50, 38, 0.6)");
        headerGradient.addColorStop(1, "rgba(45, 36, 28, 0.5)");
      } else {
        headerGradient.addColorStop(0, "#5B4328");
        headerGradient.addColorStop(1, "#3E2E1D");
      }
      ctx.fillStyle = headerGradient;
      ctx.fillRect(cardX, cardY, cardW, headerHeight);
      ctx.fillStyle = isSelected ? "rgba(255, 220, 80, 0.4)" : "rgba(230, 195, 130, 0.3)";
      ctx.fillRect(cardX, cardY + headerHeight - 2, cardW, 2);
      ctx.restore();

      if (isDimmed) {
        ctx.fillStyle = "rgba(12, 10, 8, 0.4)";
        roundRect(ctx, cardX, cardY, cardW, cardH, cardRadius, true, false);
      }

      if (isAnnouncementButtonFocused("denomUpgradeScreen", index)) {
        drawFocusRing(ctx, x - 3, buttonY - 3, buttonWidth + 6, buttonHeight + 6, 20);
      }

      // Icon
      const powerupIcon = getChurchPowerupIcon(stat.iconSrc);
      const iconStyle = powerupIconStyles?.player || CHURCH_POWERUP_ICON_DEFAULT;
      drawChurchPowerupIcon(ctx, {
        x: cardX + 28,
        y: cardY + headerHeight / 2,
        size: 34,
        iconImage: powerupIcon || getUpgradeIcon("category"),
        style: iconStyle,
      });

      // Label
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.font = `800 18px ${uiFontFamily}`;
      const labelMeasured = ctx.measureText(stat.label || "").width;
      const labelSize = labelMeasured > textWidth ? Math.max(9, Math.floor(18 * (textWidth / labelMeasured))) : 18;
      ctx.font = `800 ${labelSize}px ${uiFontFamily}`;
      ctx.fillStyle = isDimmed ? "rgba(200, 185, 155, 0.6)" : "#F3E2C4";
      ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
      ctx.shadowBlur = 3;
      ctx.shadowOffsetY = 1;
      ctx.fillText(stat.label || "", textLeft, cardY + headerHeight / 2 + 1);

      // Description
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.font = `600 13px ${uiFontFamily}`;
      ctx.fillStyle = isDimmed ? "rgba(175, 165, 145, 0.5)" : "rgba(235, 220, 195, 0.9)";
      const descLines = wrapAnnouncementText(ctx, stat.description || "", textWidth);
      descLines.slice(0, 3).forEach((line, i) => {
        ctx.fillText(line, textLeft, bodyTop + 8 + i * 16);
      });

      // "Selected" badge
      if (isSelected) {
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        ctx.font = `700 13px ${uiFontFamily}`;
        const badgeText = "\u2713 Selected";
        const badgePadX = 14;
        const badgeWidth = ctx.measureText(badgeText).width + badgePadX * 2;
        const badgeHeight = 24;
        const badgeX = cardX + cardW - 22 - badgeWidth;
        const badgeY = cardY + cardH - 26 - badgeHeight / 2;
        ctx.fillStyle = "rgba(80, 55, 10, 0.95)";
        ctx.strokeStyle = "rgba(255, 215, 80, 0.9)";
        ctx.lineWidth = 1.5;
        roundRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 12, true, true);
        ctx.fillStyle = "#FFE040";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(badgeText, badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);
        ctx.textAlign = "left";
      }

      ctx.restore();

      bounds.push({
        key: stat.key,
        x: layout.offsetX + x * layout.scale,
        y: layout.offsetY + buttonY * layout.scale,
        width: buttonWidth * layout.scale,
        height: buttonHeight * layout.scale,
      });
    });

    // Confirm + Reset buttons
    const confirmY = buttonY + buttonHeight + 30;
    const confirmHeight = 56;
    const actionGap = 18;
    const confirmWidth = Math.min(340, totalAvailable * 0.46);
    const resetWidth = Math.min(220, totalAvailable * 0.32);
    const actionsRowWidth = confirmWidth + actionGap + resetWidth;
    const actionsStartX = Math.round((vw - actionsRowWidth) / 2);
    const confirmX = actionsStartX;
    const resetX = confirmX + confirmWidth + actionGap;
    const resetEnabled = selectedKeys.length > 0;
    const confirmLabel = confirmEnabled
      ? "Start Battle"
      : `Select ${picksLeft} ${picksLeft === 1 ? "Upgrade" : "Upgrades"}`;

    ctx.save();
    ctx.fillStyle = confirmEnabled
      ? getEmberButtonGradient(ctx, confirmY, confirmHeight)
      : EMBER_BUTTON_PALETTE.disabledFill;
    ctx.strokeStyle = confirmEnabled ? EMBER_BUTTON_PALETTE.border : EMBER_BUTTON_PALETTE.disabledBorder;
    ctx.lineWidth = 2;
    roundRect(ctx, confirmX, confirmY, confirmWidth, confirmHeight, 18, true, true);
    if (isAnnouncementButtonFocused("denomUpgradeScreen", buttonCount)) {
      drawFocusRing(ctx, confirmX - 3, confirmY - 3, confirmWidth + 6, confirmHeight + 6, 20);
    }
    ctx.fillStyle = confirmEnabled ? EMBER_BUTTON_PALETTE.text : EMBER_BUTTON_PALETTE.textDisabled;
    if (confirmEnabled) {
      ctx.shadowColor = EMBER_BUTTON_PALETTE.textShadow;
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 1;
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `600 22px ${uiFontFamily}`;
    ctx.fillText(confirmLabel, confirmX + confirmWidth / 2, confirmY + confirmHeight / 2);
    ctx.restore();

    bounds.push({
      key: "confirm",
      x: layout.offsetX + confirmX * layout.scale,
      y: layout.offsetY + confirmY * layout.scale,
      width: confirmWidth * layout.scale,
      height: confirmHeight * layout.scale,
      enabled: confirmEnabled,
    });

    ctx.save();
    ctx.fillStyle = resetEnabled
      ? "rgba(42, 34, 26, 0.92)"
      : EMBER_BUTTON_PALETTE.disabledFill;
    ctx.strokeStyle = resetEnabled
      ? "rgba(210, 170, 105, 0.7)"
      : EMBER_BUTTON_PALETTE.disabledBorder;
    ctx.lineWidth = 2;
    roundRect(ctx, resetX, confirmY, resetWidth, confirmHeight, 18, true, true);
    if (isAnnouncementButtonFocused("denomUpgradeScreen", buttonCount + 1)) {
      drawFocusRing(ctx, resetX - 3, confirmY - 3, resetWidth + 6, confirmHeight + 6, 20);
    }
    ctx.fillStyle = resetEnabled ? EMBER_BUTTON_PALETTE.text : EMBER_BUTTON_PALETTE.textDisabled;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `600 20px ${uiFontFamily}`;
    ctx.fillText("Reset Picks", resetX + resetWidth / 2, confirmY + confirmHeight / 2);
    ctx.restore();

    bounds.push({
      key: "reset",
      x: layout.offsetX + resetX * layout.scale,
      y: layout.offsetY + confirmY * layout.scale,
      width: resetWidth * layout.scale,
      height: confirmHeight * layout.scale,
      enabled: resetEnabled,
    });

    if (typeof window !== "undefined") {
      window.__denomUpgradeScreenButtons = { buttons: bounds };
    }

    ctx.restore();
  }

  function drawFrame() {
    drawGame();
  }

  function drawPlayingInstructionsOverlay() {
    const { ctx, canvas, UI_FONT_FAMILY } = requireBindings();
    const pi = typeof window !== "undefined" ? window.PlayingInstructions : null;
    if (!pi || !pi.state.open) return;

    const panelStyle = window.UIStyles?.panels?.hellfire?.withHint || {};
    const shellStyle = window.UIStyles?.panels?.hellfire?.shell || {};
    const dividerStyle = window.UIStyles?.panels?.hellfire?.divider || {};
    const vw = canvas.width;
    const vh = canvas.height;
    const panelW = Math.min(panelStyle.panelWidthMax ?? 780, vw * (panelStyle.panelWidthRatio ?? 0.9));
    const panelH = Math.min(vh * (panelStyle.panelHeightRatio ?? 0.84), panelStyle.panelHeightMax ?? 700);
    const panelX = Math.round((vw - panelW) / 2);
    const panelY = Math.round((vh - panelH) / 2);
    const padX = panelStyle.padX ?? 38;
    const padTop = panelStyle.padTop ?? 106;
    const padBottom = panelStyle.padBottom ?? 44;
    const contentW = panelW - padX * 2;
    const contentH = panelH - padTop - padBottom;
    const contentX = panelX + padX;
    const contentY = panelY + padTop;

    ctx.save();

    // Dim background
    ctx.fillStyle = "rgba(0,0,0,0.74)";
    ctx.fillRect(0, 0, vw, vh);

    // Hellfire panel shell
    ctx.shadowColor = shellStyle.shadowColor || "rgba(0, 0, 0, 0.45)";
    ctx.shadowBlur = shellStyle.shadowBlur ?? 24;
    ctx.shadowOffsetY = shellStyle.shadowOffsetY ?? 10;
    const panelGradient = ctx.createLinearGradient(0, panelY, 0, panelY + panelH);
    panelGradient.addColorStop(0, shellStyle.gradientTop || "rgba(12, 18, 30, 0.95)");
    panelGradient.addColorStop(1, shellStyle.gradientBottom || "rgba(7, 10, 18, 0.95)");
    ctx.fillStyle = panelGradient;
    ctx.strokeStyle = shellStyle.borderColor || "rgba(255, 218, 162, 0.34)";
    ctx.lineWidth = shellStyle.borderWidth ?? 2;
    roundRect(ctx, panelX, panelY, panelW, panelH, shellStyle.radius ?? 18, true, true);
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Header divider
    ctx.strokeStyle = dividerStyle.color || "rgba(255, 214, 148, 0.22)";
    ctx.lineWidth = dividerStyle.width ?? 1;
    ctx.beginPath();
    ctx.moveTo(panelX + (dividerStyle.insetX ?? 24), panelY + (panelStyle.dividerY ?? 82));
    ctx.lineTo(panelX + panelW - (dividerStyle.insetX ?? 24), panelY + (panelStyle.dividerY ?? 82));
    ctx.stroke();

    // Title
    ctx.fillStyle = panelStyle.titleColor || "#FFD978";
    ctx.font = `700 ${panelStyle.titleFontSize ?? 24}px ${UI_FONT_FAMILY}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(panelStyle.titleText || "HOW TO PLAY", panelX + panelW / 2, panelY + (panelStyle.titleY ?? 44));

    // Header hint
    ctx.fillStyle = panelStyle.hintColor || "rgba(231,176,102,0.82)";
    ctx.font = `600 ${panelStyle.hintFontSize ?? 12}px ${UI_FONT_FAMILY}`;
    ctx.textAlign = "center";
    ctx.fillText(panelStyle.hintText || "W / S to scroll  ·  SPACE or ESC to close", panelX + panelW / 2, panelY + (panelStyle.hintY ?? 66));

    // Clip content area
    ctx.save();
    ctx.beginPath();
    ctx.rect(contentX - 2, contentY, contentW + 4, contentH);
    ctx.clip();

    const lines = pi.state.lines;
    const scrollY = pi.state.scrollY || 0;
    let cursorY = contentY - scrollY;

    const SIZES = { h1: 20, h2: 15, body: 13, bullet: 13 };
    const LINE_H = { h1: 32, h2: 26, body: 20, bullet: 20, spacer: 10 };
    const BULLET_GAP = 14;

    const wrapText = (text, maxWidth) => {
      const normalized = String(text || "").trim();
      if (!normalized) return [""];
      const words = normalized.split(/\s+/).filter(Boolean);
      if (!words.length) return [""];

      const wrapped = [];
      let current = "";

      const pushCurrent = () => {
        if (current) wrapped.push(current);
        current = "";
      };

      for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (ctx.measureText(candidate).width <= maxWidth) {
          current = candidate;
          continue;
        }
        if (current) pushCurrent();
        if (ctx.measureText(word).width <= maxWidth) {
          current = word;
          continue;
        }

        // Hard-wrap very long tokens that exceed the line width on their own.
        let tokenLine = "";
        for (const ch of word) {
          const tokenCandidate = tokenLine + ch;
          if (ctx.measureText(tokenCandidate).width <= maxWidth || tokenLine.length === 0) {
            tokenLine = tokenCandidate;
          } else {
            wrapped.push(tokenLine);
            tokenLine = ch;
          }
        }
        current = tokenLine;
      }

      pushCurrent();
      return wrapped;
    };

    if (!lines) {
      ctx.fillStyle = "#E7B066";
      ctx.font = `14px ${UI_FONT_FAMILY}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(pi.state.loading ? "Loading…" : "No content.", contentX, cursorY);
    } else {
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
      const laidOut = lines.map((line) => {
        const type = line.type || "body";
        const lh = LINE_H[type] || 20;
        if (type === "spacer") {
          return { type, lh, wrapped: [] };
        }
        if (type === "h1") {
          ctx.font = `700 ${SIZES.h1}px ${UI_FONT_FAMILY}`;
        } else if (type === "h2") {
          ctx.font = `600 ${SIZES.h2}px ${UI_FONT_FAMILY}`;
        } else if (type === "bullet") {
          ctx.font = `${SIZES.bullet}px ${UI_FONT_FAMILY}`;
        } else {
          ctx.font = `${SIZES.body}px ${UI_FONT_FAMILY}`;
        }
        const maxWidth = type === "bullet" ? contentW - BULLET_GAP : contentW;
        const wrapped = wrapText(line.text, Math.max(1, maxWidth));
        return { type, lh, wrapped };
      });

      let totalH = 0;
      for (const block of laidOut) {
        totalH += block.type === "spacer" ? block.lh : block.wrapped.length * block.lh;
      }

      for (const block of laidOut) {
        const blockH = block.type === "spacer" ? block.lh : block.wrapped.length * block.lh;
        const y = cursorY;
        cursorY += blockH;

        if (y + blockH < contentY) continue;
        if (y > contentY + contentH) break;
        if (block.type === "spacer") continue;

        if (block.type === "h1") {
          ctx.fillStyle = "#FFD978";
          ctx.font = `700 ${SIZES.h1}px ${UI_FONT_FAMILY}`;
        } else if (block.type === "h2") {
          ctx.fillStyle = "#E7B066";
          ctx.font = `600 ${SIZES.h2}px ${UI_FONT_FAMILY}`;
        } else if (block.type === "bullet") {
          ctx.fillStyle = panelStyle.bulletColor || "#F7E8CA";
          ctx.font = `${SIZES.bullet}px ${UI_FONT_FAMILY}`;
        } else {
          ctx.fillStyle = panelStyle.bodyColor || "#E8D2AE";
          ctx.font = `${SIZES.body}px ${UI_FONT_FAMILY}`;
        }

        for (let lineIndex = 0; lineIndex < block.wrapped.length; lineIndex++) {
          const textY = y + 2 + lineIndex * block.lh;
          const text = block.wrapped[lineIndex];
          if (block.type === "bullet") {
            if (lineIndex === 0) {
              ctx.fillStyle = "#E7B066";
              ctx.font = `600 ${SIZES.bullet}px ${UI_FONT_FAMILY}`;
              ctx.fillText("•", contentX, textY);
              ctx.fillStyle = "#FDF1D9";
              ctx.font = `${SIZES.bullet}px ${UI_FONT_FAMILY}`;
            }
            ctx.fillText(text, contentX + BULLET_GAP, textY);
          } else {
            ctx.fillText(text, contentX, textY);
          }
        }
      }

      const maxScroll = Math.max(0, totalH - contentH);
      if (typeof pi.setMaxScrollY === "function") pi.setMaxScrollY(maxScroll);

      // Scroll indicators
      ctx.restore();
      ctx.save();
      if (scrollY > 0) {
        ctx.fillStyle = panelStyle.arrowColor || "rgba(231,176,102,0.72)";
        ctx.font = `600 11px ${UI_FONT_FAMILY}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText("▲", panelX + panelW - 22, contentY + 2);
      }
      if (scrollY < maxScroll) {
        ctx.fillStyle = panelStyle.arrowColor || "rgba(231,176,102,0.72)";
        ctx.font = `600 11px ${UI_FONT_FAMILY}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText("▼", panelX + panelW - 22, contentY + contentH - 2);
      }
    }

    ctx.restore();
    drawFooterControlsHint(ctx, vw / 2, vh - 10, UI_FONT_FAMILY);
    ctx.restore();
  }

  function drawGraceSpendFlyEffectsOverlay() {
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    const effects = requireBindings().graceSpendFlyEffects;
    if (!effects || !effects.length) return;
    ctx.save();
    effects.forEach((effect) => {
      if (!effect || !effect.frame || effect.timer < effect.delay) return;
      const size = effect.size || 14;
      ctx.globalAlpha = typeof effect.alpha === "number" ? effect.alpha : 1;
      ctx.drawImage(effect.frame, effect.x - size / 2, effect.y - size / 2, size, size);
    });
    ctx.restore();
  }

  window.Renderer = {
    initialize,
    drawFrame,
    drawCountdownOverlay,
    drawChurchUpgradeScreen,
    drawDenomUpgradeScreen,
    drawPlayingInstructionsOverlay,
    drawGraceSpendFlyEffectsOverlay,
    getControlsHintText,
  };
})(typeof window !== "undefined" ? window : null);
