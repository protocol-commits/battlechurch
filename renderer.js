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
// Define areas where entities cannot go (player, enemies, powerups, keys, etc.)
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
// (You will need to call isInRestrictedZone(x, y) in movement, spawn, and collision logic for player, enemies, powerups, keys, etc.)
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
const MELEE_SWING_LENGTH = 200;

(function setupRenderer(window) {
  // Draws a name tag at (x, y)
  function drawNameTag(ctx, name, x, y, fontFamily) {
    if (!name) return;
    ctx.save();
    ctx.font = `bold 12px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffe89b';
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
  const SHOW_TEXT_SOURCE_LABELS = true;
  const TEXT_STYLES = {
    h1: { size: 56, weight: 900, lineHeight: 1.05 },
    h2: { size: 40, weight: 800, lineHeight: 1.2 },
    h3: { size: 28, weight: 700, lineHeight: 1.2 },
    body: { size: 20, weight: 600, lineHeight: 1.3 },
  };
  const announcementReveal = new Map();

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
  }) {
    const wrapText = (text, maxWidth) => {
      const words = String(text || "").split(/\s+/).filter(Boolean);
      const lines = [];
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
      return lines;
    };
    const ANNOUNCEMENT_FONT_FAMILY = "'Orbitron', sans-serif";
    ctx.save();
    ctx.globalAlpha = 0.98 * alpha;
    ctx.fillStyle = "#ffffff";
    ctx.font = `${weight} ${titleSize}px ${ANNOUNCEMENT_FONT_FAMILY}`;
    const titleText = String(title || "");
    const subtitleText = String(subtitle || "");
    const maxWidth = canvas.width * 0.84;
    const titleLineHeight = Math.round(titleSize * TEXT_STYLES.h2.lineHeight);
    const subtitleLineHeight = Math.round(subtitleSize * TEXT_STYLES.body.lineHeight);
    const titleLines = titleText ? wrapText(titleText, maxWidth) : [];
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
    ctx.font = `${weight} ${titleSize}px ${ANNOUNCEMENT_FONT_FAMILY}`;
    const fullTitleWidths = titleLines.map((line) => ctx.measureText(line).width || 0);
    const titleBlockWidth = fullTitleWidths.length ? Math.max(...fullTitleWidths) : 0;
    const titleX = canvas.width / 2 - titleBlockWidth / 2;
    let remainingTitle = displayTitle.length;
    let currentY = yBase;
    titleLines.forEach((line) => {
      if (!line) return;
      const visible = remainingTitle <= 0 ? "" : line.slice(0, remainingTitle);
      remainingTitle = Math.max(0, remainingTitle - line.length);
      if (visible) ctx.fillText(visible, titleX, currentY);
      currentY += titleLineHeight;
    });
    if (subtitleLines.length) {
      currentY += Math.max(0, lineGap - titleLineHeight);
      ctx.font = `${subtitleWeight} ${subtitleSize}px ${ANNOUNCEMENT_FONT_FAMILY}`;
      const fullSubtitleWidths = subtitleLines.map((line) => ctx.measureText(line).width || 0);
      const subtitleBlockWidth = fullSubtitleWidths.length ? Math.max(...fullSubtitleWidths) : 0;
      const subtitleX = canvas.width / 2 - subtitleBlockWidth / 2;
      let remainingSubtitle = displaySubtitle.length;
      subtitleLines.forEach((line) => {
        const visible = remainingSubtitle <= 0 ? "" : line.slice(0, remainingSubtitle);
        remainingSubtitle = Math.max(0, remainingSubtitle - line.length);
        if (visible) ctx.fillText(visible, subtitleX, currentY);
        currentY += subtitleLineHeight;
      });
    }
    ctx.restore();
  }

  function getAnnouncementYBase(HUD_HEIGHT) {
    return HUD_HEIGHT + 170;
  }

  function getAnnouncementTitleY(HUD_HEIGHT, boxHeight) {
    const yBase = getAnnouncementYBase(HUD_HEIGHT);
    const boxY = yBase - boxHeight / 2;
    return boxY + 46;
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

function showMissionBriefDialog(title, body, identifier) {
  if (!window.DialogOverlay) return false;
  if (missionBriefOverlayState.id === identifier && missionBriefOverlayState.shown) return false;
  if (missionBriefOverlayState.active) return true;
  missionBriefOverlayState.id = identifier;
  missionBriefOverlayState.shown = false;
  missionBriefOverlayState.active = true;
  window.isMissionBriefOverlayActive = true;
  const devTitle = title;
  if (typeof window.stopIntroMusic === "function") {
    window.stopIntroMusic();
  }
  if (typeof window.clearFormationSelection === "function") {
    window.clearFormationSelection();
  }
  const formationOptions = [
    { key: "circle", label: "Bible Study (Circle)", desc: "Defense +20%" },
    { key: "line", label: "Book Study (Line)", desc: "Rate of fire +20%" },
    { key: "crescent", label: "Support Group (Crescent)", desc: "Damage +20%" },
  ];
  const buttonsHtml = formationOptions
    .map(
      (opt) =>
        `<button class="formation-option" data-formation="${opt.key}" style="display:block;width:100%;padding:18px;border-radius:16px;border:none;background:var(--swatch-accent-2);color:var(--ui-text-color-dark);text-align:center;box-shadow:0 12px 28px rgba(110,244,255,0.25);">
          <div style="font-weight:var(--ui-h3-weight);font-size:var(--ui-h3-size);line-height:var(--ui-h3-line);letter-spacing:0.02em;">${opt.label.split("(")[0]}</div>
          <div style="font-weight:var(--ui-body-weight);font-size:var(--ui-body-size);line-height:var(--ui-body-line);margin-top:6px;">Formation: ${opt.label.includes("(") ? opt.label.split("(")[1].replace(")", "") : ""}</div>
          <div style="font-weight:var(--ui-body-weight);font-size:var(--ui-body-size);line-height:var(--ui-body-line);margin-top:10px;">${opt.desc}</div>
        </button>`,
    )
    .join("");
  const bodyHtml = `
    <div class="mission-brief-text"></div>
    <div class="formation-prompt" style="margin:4px 0 12px;opacity:0.9;display:none;">How would you like to minister to them?</div>
    <div class="formation-picker" style="display:none;">${buttonsHtml}</div>
  `;
  window.DialogOverlay.show({
    title: devTitle,
    bodyHtml,
    buttonText: "",
    variant: "mission",
    devLabel: "DEV: MonthlyBrief",
    onRender: ({ overlay, buttonEl }) => {
      if (buttonEl) buttonEl.style.display = "none";
      const titleEl = overlay.querySelector(".dialog-overlay__title");
      if (titleEl) {
        titleEl.style.marginTop = "12px";
      }
      const textEl = overlay.querySelector(".mission-brief-text");
      const prompt = overlay.querySelector(".formation-prompt");
      const picker = overlay.querySelector(".formation-picker");
      const revealFormationUi = () => {
        if (prompt) prompt.style.display = "block";
        if (!picker) return;
        picker.style.display = "grid";
        picker.style.gridTemplateColumns = "repeat(auto-fit, minmax(220px, 1fr))";
        picker.style.gap = "14px";
      };
      const typeText = (el, text, msPerChar = 18) =>
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
      const promptText = "How would you like to minister to them?";
      if (textEl) {
        const bodyText = String(body || "");
        typeText(textEl, bodyText, 18).then(() => {
          overlay.__missionBriefDelayTimer = setTimeout(() => {
            if (prompt) prompt.style.display = "block";
            typeText(prompt, promptText, 18).then(() => {
              revealFormationUi();
            });
          }, 2000);
        });
      } else {
        overlay.__missionBriefDelayTimer = setTimeout(() => {
          if (prompt) prompt.style.display = "block";
          typeText(prompt, promptText, 18).then(() => {
            revealFormationUi();
          });
        }, 2000);
      }
      if (!picker) return;
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
          picker.querySelectorAll(".formation-option").forEach((b) => {
            b.style.background = b === btn ? "var(--swatch-accent)" : "var(--swatch-accent-2)";
            b.style.boxShadow = b === btn
              ? "0 12px 28px rgba(255,217,120,0.3)"
              : "0 12px 28px rgba(110,244,255,0.25)";
          });
          if (typeof window.applyFormationAnchors === "function") {
            try { window.applyFormationAnchors(); } catch (e) {}
          }
          if (buttonEl) {
            buttonEl.disabled = false;
            // Auto-advance once a formation is picked so Space is not required.
            buttonEl.click();
          }
        });
      });
    },
    onContinue: () => {
      missionBriefOverlayState.active = false;
      missionBriefOverlayState.shown = true;
      dismissCurrentLevelAnnouncement();
      window.isMissionBriefOverlayActive = false;
    },
  });
  return true;
}

function drawLevelAnnouncements() {
    const {
      ctx,
      canvas,
      levelAnnouncements,
      HUD_HEIGHT,
      UI_FONT_FAMILY,
    } = requireBindings();
    if (!levelAnnouncements.length) return;
  const { title, subtitle, timer, duration, requiresConfirm } = levelAnnouncements[0];
  const now = performance.now();
  const levelStatus = (typeof requireBindings === 'function') ? requireBindings().levelManager?.getStatus?.() : null;
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
    && titleStr.includes('cleared')
    && (titleStr.includes('battle') || titleStr.includes('level'))
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
  if (!skipMissionBrief && !isBattleSummary && Array.isArray(window.npcs) && window.npcs.length) {
    const npcNames = window.npcs.map(npc => npc.name).filter(Boolean);
    if (window.DialogOverlay?.isVisible?.()) {
      ctx.restore();
      return;
    }
    if (npcNames.length) {
      if (!levelAnnouncements[0].missionBriefScenario) {
        levelAnnouncements[0].missionBriefScenario = missionBriefScenarios[Math.floor(Math.random() * missionBriefScenarios.length)];
      }
      const scenario = levelAnnouncements[0].missionBriefScenario;
      const lm = requireBindings().levelManager;
      const currentLevelStatus = lm?.getStatus ? lm.getStatus() : null;
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
      const missionTitle =
        (announcement && announcement.missionBriefTitle) ||
        (announcement && announcement.title) ||
        monthName ||
        "";
      const missionBrief = `${nameSentence} have approached you needing your help ${scenario}.`;
      const missionId = `mission_${missionTitle}_${missionBrief}`;
      if (window.UpgradeScreen?.isVisible?.()) {
        ctx.restore();
        return;
      }
      showMissionBriefDialog(
        missionTitle,
        missionBrief,
        missionId,
      );
      ctx.restore();
      return;
    }
  }
  // Battle summary popups are handled by the dialog overlay (not canvas).
  const lm = requireBindings().levelManager;
  const currentLevelStatus = lm?.getStatus ? lm.getStatus() : null;
  const monthName = currentLevelStatus?.month || (requireBindings().getMonthName ? requireBindings().getMonthName(currentLevelStatus?.level || 1) : null);
  const levelNumber = currentLevelStatus?.level || 1;
  let displayTitle = title;
  try {
    if (isBattleSummary && monthName) {
      const clearedSuffix = /cleared/i.test(title) ? ' Cleared' : '';
      displayTitle = `Level ${levelNumber} — ${monthName}${clearedSuffix}`;
    }
  } catch (e) {}
  if (isBattleSummary) {
    ctx.restore();
    return;
  }
    const titleY = getAnnouncementTitleY(HUD_HEIGHT, boxHeight);
    drawAnnouncementText(ctx, canvas, {
      title: displayTitle || "",
      yBase: titleY,
      alpha,
      typewriter: true,
    });
    if (SHOW_TEXT_SOURCE_LABELS) {
      drawDevLabel(ctx, "DEV: BattleAnnouncement", canvas.width / 2, titleY - 32, alpha, UI_FONT_FAMILY);
    }
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

  // Homebase bounds debug: draws the NPC home area border so it can be tweaked.
  function drawNpcHomeBounds(ctx) {
    if (typeof getNpcHomeBounds !== "function") return;
    const bounds = getNpcHomeBounds();
    if (!bounds) return;
    return; // Border hidden per request; keep code for future toggles.
    ctx.save();
    ctx.setLineDash([8, 6]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(120, 220, 255, 0.1)";
    ctx.beginPath();
    const rx = bounds.radius * 0.9; // horizontal radius
    const ry = bounds.radius * 0.6; // vertical radius
    if (typeof ctx.ellipse === "function") {
      ctx.ellipse(bounds.x, bounds.y, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.save();
      ctx.translate(bounds.x, bounds.y);
      ctx.scale(rx / Math.max(1, ry), 1);
      ctx.arc(0, 0, ry, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawBackground(effectiveCameraX, effectiveCameraY = 0) {
    const {
      ctx,
      canvas,
      assets,
    } = requireBindings();
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
      const pan = ((rawFloorPan % floor.width) + floor.width) % floor.width;
      const drawY = canvas.height - floor.height;
      ctx.drawImage(floor, -pan, drawY, floor.width, floor.height);
      ctx.drawImage(floor, -pan + floor.width, drawY, floor.width, floor.height);
      ctx.restore();
    }
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
      congregationMembers,
    } = requireBindings();
    const memberCount = Array.isArray(congregationMembers) ? congregationMembers.length : 0;
    const titleY = getAnnouncementTitleY(HUD_HEIGHT, 220);
    drawAnnouncementText(ctx, canvas, {
      title: "Welcome Pastor. We're pleased to meet you!",
      subtitle: "",
      yBase: titleY,
      subtitleSize: TEXT_STYLES.h3.size,
      subtitleWeight: TEXT_STYLES.h3.weight,
      lineGap: Math.round(TEXT_STYLES.h2.size * TEXT_STYLES.h2.lineHeight),
      alpha: 1,
      typewriter: true,
    });
    if (SHOW_TEXT_SOURCE_LABELS) {
      drawDevLabel(ctx, "DEV: CongregationScreen", canvas.width / 2, titleY - 32, 1, UI_FONT_FAMILY);
    }
    void memberCount;

    const footerPadding = 22;
    const footerWidth = canvas.width - footerPadding * 2;
    const footerHeight = 88;
    const footerX = footerPadding;
    const footerY = canvas.height - footerHeight - 16;
    ctx.font = `${TEXT_STYLES.body.weight} ${TEXT_STYLES.body.size}px ${UI_FONT_FAMILY}`;
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    const lineX = footerX + 18;
    let lineY = footerY + 26;
    ctx.fillText("WASD: Move", lineX, lineY);
    lineY += 20;
    ctx.fillText("Left Arrow: Sword (double tap = Rush, hold = Charge)", lineX, lineY);
    lineY += 20;
    ctx.fillText("Right Arrow: Prayer Bomb", lineX, lineY);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "right";
    ctx.fillText("Press Space when ready to begin.", footerX + footerWidth - 18, footerY + footerHeight - 20);
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
    ctx.fillStyle = actor.saved ? "#ffde85" : "#ff9ed9";
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
    ctx.fillStyle = "#ffe89b";
    ctx.font = `22px ${UI_FONT_FAMILY}`;
    ctx.fillText("Visitation Hour", centerX, panelY + 24);
    const remaining = Math.max(0, visitorState.timer || 0);
    const minutes = Math.floor(remaining / 60);
    const seconds = Math.floor(remaining % 60);
    const timerText = `${minutes}:${seconds.toString().padStart(2, "0")}`;
    const congregationTotal = typeof getCongregationSize === "function" ? getCongregationSize() : null;
    const savedText = `Visitors: ${visitorState.savedVisitors || 0}/${visitorState.targetVisitors || 0}`;
    const calmText = `Members Calmed: ${visitorState.quietedBlockers || 0}`;
    ctx.font = `14px ${UI_FONT_FAMILY}`;
    ctx.fillStyle = "#f7fbff";
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
      if (remainingSeconds > 0 && remainingSeconds <= 10) {
        ctx.save();
        ctx.globalAlpha = 0.32;
        ctx.fillStyle = "#ffffff";
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
      ctx.fillStyle = "#ffe89b";
      ctx.font = `46px ${UI_FONT_FAMILY}`;
      ctx.fillText("Time's Up! Welcome new members!", centerX, HUD_HEIGHT + 140);
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
        ctx.fillStyle = "#f7fbff";
        ctx.fillText("No new members this round.", centerX, HUD_HEIGHT + 220);
      }
      ctx.restore();
    }
  }

  function drawKeyRushOverlay(levelStatus, rushState) {
    const {
      ctx,
      canvas,
      UI_FONT_FAMILY,
      HUD_HEIGHT = 54,
    } = requireBindings();
    const remaining =
      rushState?.active && rushState.timer > 0
        ? rushState.timer
        : Math.max(0, levelStatus?.timer || 0);
    if (remaining <= 0) return;
    const panelY = getAnnouncementTitleY(HUD_HEIGHT, 200);
    const label = rushState?.reason === "boss" ? "Treasure Overflow!" : "Key Rush!";
    const subtitle =
      rushState?.reason === "boss" ? "Celebrate the victory—collect every key!" : "Grab as many keys as you can!";
    drawAnnouncementText(ctx, canvas, {
      title: label,
      subtitle,
      yBase: panelY,
      titleSize: TEXT_STYLES.h3.size,
      weight: TEXT_STYLES.h3.weight,
      subtitleSize: TEXT_STYLES.body.size,
      lineGap: Math.round(TEXT_STYLES.h3.size * TEXT_STYLES.h3.lineHeight),
      alpha: 1,
      typewriter: true,
    });
    if (SHOW_TEXT_SOURCE_LABELS) {
      drawDevLabel(ctx, "DEV: KeyRush", canvas.width / 2, panelY - 32, 1, UI_FONT_FAMILY);
    }
    ctx.restore();

    const remainingSeconds = Math.ceil(remaining);
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = "#ffffff";
    const fontSize = Math.min(canvas.width, canvas.height) * 0.45;
    ctx.font = `${TEXT_STYLES.h1.weight} ${fontSize}px ${UI_FONT_FAMILY}`;
    ctx.textAlign = "center";
    ctx.fillText(String(remainingSeconds), canvas.width / 2, canvas.height / 2 + fontSize * 0.35);
    ctx.restore();
  }

  function drawPlayerWeaponMeter(player) {
    if (!player) return;
    const mode = player.weaponMode;
    if (!mode || mode === "arrow") return;
    const timer = Math.max(0, player.weaponPowerTimer || 0);
    const duration = Math.max(0.001, player.weaponPowerDuration || 0.001);
    if (timer <= 0) return;
    const ratio = Math.max(0, Math.min(1, timer / duration));
    const width = 60;
    const height = 8;
    const barX = player.x - width / 2;
    const barY = player.y - (player.radius || 24) - 46;
    ctx.save();
    ctx.fillStyle = "rgba(18, 20, 30, 0.75)";
    roundRect(ctx, barX, barY, width, height, 5, true, false);
    const colorMap = {
      magic: "#9bf0ff",
      pig: "#ff96f7",
      fire: "#ffb15a",
    };
    const fillWidth = Math.max(0, Math.floor((width - 4) * ratio));
    const baseColor = colorMap[mode] || "#ffd35c";
    ctx.fillStyle = baseColor;
    roundRect(ctx, barX + 2, barY + 2, fillWidth, height - 4, 4, true, false);
    if (player.powerExtendTimer > 0 && fillWidth > 3) {
      const pulse = (Math.sin(performance.now() * 0.02) + 1) / 2;
      ctx.fillStyle = `rgba(255, 255, 255, ${0.08 + pulse * 0.12})`;
      roundRect(
        ctx,
        barX + 2,
        barY + 2,
        fillWidth,
        height - 4,
        4,
        true,
        false,
      );
    }
    ctx.restore();
  }

  function drawPlayerExtendMeter(player) {
    if (!player) return;
    const timer = player.powerExtendTimer || 0;
    const duration = Math.max(0.001, player.powerExtendDuration || timer);
    if (timer <= 0 || duration <= 0) return;
    const mode = player.weaponMode;
    if (mode && mode !== "arrow") return;
    const ratio = Math.max(0, Math.min(1, timer / duration));
    const width = 60;
    const height = 8;
    const barX = player.x - width / 2;
    const barY = player.y - (player.radius || 24) - 46;
    ctx.save();
    ctx.fillStyle = "rgba(10, 16, 32, 0.75)";
    roundRect(ctx, barX, barY, width, height, 5, true, false);
    ctx.fillStyle = "rgba(255, 192, 113, 0.95)";
    roundRect(
      ctx,
      barX + 2,
      barY + 2,
      Math.max(0, Math.floor((width - 4) * ratio)),
      height - 4,
      4,
      true,
      false,
    );
    ctx.restore();
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
    ctx.fillStyle = '#f4f7ff';
    ctx.font = `44px ${UI_FONT_FAMILY}`;
    ctx.fillText('How to Play', canvas.width / 2, HUD_HEIGHT + 60);

    ctx.font = `18px ${UI_FONT_FAMILY}`;
    ctx.fillStyle = '#d8e8ff';
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
  ctx.fillStyle = '#f8fbff';
    ctx.font = `48px ${UI_FONT_FAMILY}`;
    ctx.fillText('How to play', canvas.width / 2, HUD_HEIGHT + 66);

    ctx.font = `18px ${UI_FONT_FAMILY}`;
    ctx.fillStyle = '#dfefff';
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
    ctx.fillStyle = label === "FIGHT!" ? "#ffdd5c" : "#f1f5ff";
    const fontSize = label === "FIGHT!" ? 64 : 72;
    ctx.font = `${fontSize}px ${UI_FONT_FAMILY}`;
    ctx.fillText(label, canvas.width / 2, canvas.height / 2);
    ctx.restore();
  }

  function drawPauseOverlay() {
    const { ctx, canvas, UI_FONT_FAMILY } = requireBindings();
    if (window.DialogOverlay?.isVisible()) return;
    ctx.save();
    ctx.fillStyle = "rgba(4, 7, 14, 0.86)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const sections = [
      { title: "Move", items: ["WASD"] },
      { title: "Aim", items: ["Arrow keys", "Mouse cursor"] },
      { title: "Prayer Bomb", items: ["Hold A + D for 1 sec", "Right-click to cast"] },
      {
        title: "Utility Power Ups",
        items: [
          "heart_1.png ➜ heal",
          "Shield of Faith (Chests)",
          "Gospel of Peach (Flasks)",
          "Sword of the Spirit (Torches)",
        ],
      },
      {
        title: "Weapons",
        items: [
          "book.png ➜ Wisdom",
          "coin_1-4.png ➜ Faith",
          "torch.png ➜ Scripture",
        ],
      },
      {
        title: "Developer Hotkeys",
        items: [
          "F: Toggle frame inspector",
          "1: Toggle God mode",
          "2: Clear all enemies",
          "3: Skip current horde",
          "4: Skip battle sequence",
          "M: Spawn random MiniFolk",
        ],
      },
    ];

    const panelGap = 20;
    const panelPadding = 18;
    const titleHeight = 22;
    const itemLineHeight = 20;
    const maxCardWidth = Math.min(canvas.width - 120, 820);
    const useTwoColumns = maxCardWidth >= 640 && canvas.width >= 720;
    const columns = useTwoColumns ? [sections.slice(0, 3), sections.slice(3)] : [sections];
    const columnCount = columns.length;
    const columnGap = 22;
    const panelWidth = useTwoColumns
      ? Math.min(360, (maxCardWidth - columnGap * (columnCount + 1)) / columnCount)
      : maxCardWidth - columnGap * 2;

    const measurePanel = (section) =>
      panelPadding * 2 + titleHeight + section.items.length * itemLineHeight;

    const columnHeights = columns.map((column) =>
      column.reduce((total, section, index) => {
        const panelHeight = measurePanel(section);
        return total + panelHeight + (index > 0 ? panelGap : 0);
      }, 0),
    );

    const maxColumnHeight = Math.max(...columnHeights, 0);
    const headerHeight = 120;
    const footerHeight = 80;
    const cardHeight = headerHeight + maxColumnHeight + footerHeight;
    ctx.restore();

    const headerCenterX = canvas.width / 2;
    ctx.textAlign = "center";
    ctx.fillStyle = "#f4f7ff";
    ctx.font = `40px ${UI_FONT_FAMILY}`;
    ctx.fillText("Battlefield Church", headerCenterX, cardY + 56);
    ctx.font = `20px ${UI_FONT_FAMILY}`;
    ctx.fillStyle = "#ffe89b";
    ctx.fillText("Save Your Flock", headerCenterX, cardY + 86);
    ctx.font = `22px ${UI_FONT_FAMILY}`;
    ctx.fillStyle = "#c2d7ff";
    ctx.fillText("Paused - Review Your Toolkit", headerCenterX, cardY + 114);

    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    const contentTop = cardY + headerHeight;
    const startX = cardX + columnGap;

    const drawPanel = (x, y, section) => {
      const panelHeight = measurePanel(section);
      const radius = 18;
      const r = Math.min(radius, panelWidth / 2, panelHeight / 2);
      ctx.save();
      drawRoundedRect(x, y, panelWidth, panelHeight, r);
      ctx.fillStyle = "rgba(20, 32, 54, 0.88)";
      ctx.strokeStyle = "rgba(140, 186, 255, 0.35)";
      ctx.lineWidth = 1.6;
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.fillStyle = "#f7f8ff";
      ctx.font = `18px ${UI_FONT_FAMILY}`;
      ctx.fillText(section.title, x + panelPadding, y + panelPadding - 2);
      ctx.font = `14px ${UI_FONT_FAMILY}`;
      ctx.fillStyle = "rgba(210, 220, 255, 0.9)";
      let textY = y + panelPadding + titleHeight;
      section.items.forEach((item) => {
        ctx.fillText(`• ${item}`, x + panelPadding, textY);
        textY += itemLineHeight;
      });
      ctx.restore();

      return panelHeight;
    };

    columns.forEach((column, columnIndex) => {
      let y = contentTop;
      const x = startX + columnIndex * (panelWidth + columnGap);
      column.forEach((section) => {
        const panelHeight = drawPanel(x, y, section);
        y += panelHeight + panelGap;
      });
    });

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

  const enemyHpLabels = [];
  const npcFaithOverlays = [];
  let showEnemyDevLabels = true;
  let showCannonSplashRadius = true;
  if (typeof window !== "undefined") {
    window.__battlechurchEnemyHpLabels = enemyHpLabels;
    window.__battlechurchNpcFaithOverlays = npcFaithOverlays;
    window.setEnemyDevLabelsVisible = (value) => {
      showEnemyDevLabels = Boolean(value);
    };
    window.setCannonSplashRadiusVisible = (value) => {
      showCannonSplashRadius = Boolean(value);
    };
  }
  let sharedShakeOffset = { x: 0, y: 0 };

  function drawHUD() {
    window.BattlechurchHUD?.draw?.(requireBindings(), sharedShakeOffset, roundRect);
  }

  function drawMissionBriefInArena() {
    const {
      ctx,
      canvas,
      UI_FONT_FAMILY,
      levelManager,
    } = requireBindings();
    const levelStatus = levelManager?.getStatus ? levelManager.getStatus() : null;
    if (!levelStatus) return;
    const monthName = levelStatus.month || "January";
    const battleNumber = Math.max(1, levelStatus.battle || 1);
    const hordeNumber = Math.max(1, levelStatus.horde || 1);
  const breadcrumb = [`Level ${levelStatus.level || 1}`, `${monthName}`, `Battle ${battleNumber}`, `Horde ${hordeNumber}`].join(" / ");
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

  function drawTitleScreen() {
    const {
      ctx,
      canvas,
      UI_FONT_FAMILY,
      devInspectorActive,
      drawDevInspector,
      assets,
    } = requireBindings();
    ctx.save();
    const titleImage = assets?.titleBackground || null;
    if (titleImage) {
      ctx.drawImage(titleImage, 0, 0, canvas.width, canvas.height);
    } else {
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, "#070a16");
      gradient.addColorStop(1, "#121b33");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }


    ctx.restore();
    if (devInspectorActive && typeof drawDevInspector === "function") {
      try { drawDevInspector(); } catch (e) {}
    }
  }

  function drawGame() {
    const {
      ctx,
      canvas,
      howToPlayActive,
      titleScreenActive,
      levelManager,
      gameOver,
      assets,
      obstacles,
      congregationMembers,
      npcs,
      utilityPowerUps,
      animals,
      keyPickups,
      enemies,
      activeBoss,
      projectiles,
      player,
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
      keyRushState,
      isModalActive,
      arenaFadeAlpha,
      actBreakFadeAlpha,
      keyRushFadeAlpha,
      keyRushBlackout,
      damageHitFlash,
      postDeathSequenceActive,
      heroLives,
    } = requireBindings();
    const dynamicNameTags = [];
    const npcFadeAlpha = Math.max(0, 1 - Math.min(1, actBreakFadeAlpha));
    npcFaithOverlays.length = 0;
    if (titleScreenActive) {
      drawTitleScreen();
      if (!window.DialogOverlay?.isVisible()) {
        showTitleDialog();
      }
      return;
    }
    const missionOverlayActive = Boolean(window.isMissionBriefOverlayActive);
    const pauseOverlayActive = Boolean(window.isPauseOverlayActive);
    if (isModalActive && !missionOverlayActive && !pauseOverlayActive) {
      ctx.save();
      const modalBlackout = keyRushBlackout ? 1 : (keyRushFadeAlpha > 0 ? Math.min(1, keyRushFadeAlpha) : 0.92);
      ctx.fillStyle = `rgba(0, 0, 0, ${modalBlackout})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
      return;
    }
    sharedShakeOffset.x = 0;
    sharedShakeOffset.y = 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const levelStatus = levelManager?.getStatus ? levelManager.getStatus() : null;
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
        ctx.save();
        ctx.globalAlpha *= npcFadeAlpha;
        congregationMembers.forEach((member) => {
          member.animator.draw(ctx, member.x, member.y);
          const nameY = member.y - (member.radius || 28) * 0.35 - 20;
          dynamicNameTags.push({ name: member?.name || "Friend", x: member.x, y: nameY });
        });
        ctx.restore();
      } else {
        battleNpcs = npcs.filter(Boolean);
        battleNpcs.forEach((npc) => {
          if (npc.name) {
            const nameY = npc.y - (npc.radius || 28) * 0.35 - 20;
            dynamicNameTags.push({ name: npc.name, x: npc.x, y: nameY });
          }
        });
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
    let npcFaithOverlayFn = () => {
      if (!npcFaithOverlays.length) return;
      ctx.save();
      ctx.globalAlpha *= npcFadeAlpha;
      npcFaithOverlays.forEach((entry) => {
        ctx.save();
        ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
        ctx.fillRect(entry.x, entry.y, entry.width, entry.height);
        ctx.strokeStyle = typeof NPC_FAITH_BORDER_COLOR !== "undefined" ? NPC_FAITH_BORDER_COLOR : "#24698f";
        ctx.lineWidth = 1;
        ctx.strokeRect(entry.x + 0.5, entry.y + 0.5, entry.width - 1, entry.height - 1);
        ctx.fillStyle = "#9bf0ff";
        ctx.fillRect(entry.x + 2, entry.y + 2, Math.max(0, entry.width - 4) * entry.ratio, entry.height - 4);
        if (entry.ratio <= 0) {
          try {
            const t = typeof performance !== "undefined" ? performance.now() : Date.now();
            const alpha = 0.25 + Math.abs(Math.sin(t * 0.005)) * 0.45;
            ctx.fillStyle = `rgba(255,60,60,${alpha.toFixed(3)})`;
            ctx.fillRect(entry.x + 2, entry.y + 2, entry.width - 4, entry.height - 4);
          } catch (err) {}
        }
        if (entry.ratio >= 0.999) {
          try {
            const t = typeof performance !== "undefined" ? performance.now() : Date.now();
            const raw = 0.6 + Math.abs(Math.sin(t * 0.008)) * 0.4;
            const alpha = Math.max(0.6, Math.min(1, raw));
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            ctx.fillStyle = `rgba(255,230,80,${alpha.toFixed(3)})`;
            ctx.fillRect(entry.x + 2, entry.y + 2, entry.width - 4, entry.height - 4);
            try {
              ctx.strokeStyle = `rgba(255,230,120,${(Math.min(1, alpha * 0.95)).toFixed(3)})`;
              ctx.lineWidth = 1;
              ctx.strokeRect(entry.x + 2.5, entry.y + 2.5, entry.width - 5, entry.height - 5);
            } catch (err) {}
            ctx.restore();
          } catch (err) {}
        }
        ctx.restore();
      });
      ctx.restore();
    };
  // ...existing code...
    if (!visitorStageActive) {
      enemyHpLabels.length = 0;
      const isMiniImpType = (enemy) => {
        const type = enemy?.type;
        return type === "miniImp" || type === "miniImpLevel2" || type === "miniImpLevel3";
      };
      const orderIndex = (enemy) => (isMiniImpType(enemy) ? 0 : 1);
      const orderedEnemies = [...enemies].sort((a, b) => orderIndex(a) - orderIndex(b));
      orderedEnemies.forEach((enemy) => enemy.draw());
      if (activeBoss) activeBoss.draw(ctx);
    }
    if (!visitorStageActive && battleNpcs.length) {
      drawBattleNpcs(ctx, battleNpcs, npcFadeAlpha);
    }
    // Draw pickups above enemies/NPCs
    utilityPowerUps.forEach((powerUp) => powerUp.draw(ctx));
    animals.forEach((animal) => animal.draw());
    keyPickups.forEach((pickup) => {
      if (pickup && typeof pickup.draw === "function") pickup.draw(ctx);
    });
    npcFaithOverlayFn();
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
    if (player) {
      player.draw();
      drawPlayerWeaponMeter(player);
      drawPlayerExtendMeter(player);
    }

      // --- Enemy-player collision and damage logic ---
      if (!visitorStageActive && player && Array.isArray(enemies)) {
        const now = performance.now();
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
              if (typeof player.takeDamage === 'function') {
                const dmg = enemy.config?.damage || enemy.damage || 1;
                player.takeDamage(dmg);
              } else if (typeof player.health === 'number') {
                const dmg = enemy.config?.damage || enemy.damage || 1;
                player.health = Math.max(0, player.health - dmg);
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

  // Draw static fog effect on left/right edges (AFTER all gameplay entities, BEFORE overlays)
  ctx.save();
  ctx.globalAlpha = 1.0;
  // Left fog (spills outside playable field)
  const fogWidth = 180;
  const fogGradientLeft = ctx.createLinearGradient(-fogWidth, 0, fogWidth, 0);
  fogGradientLeft.addColorStop(0, 'rgba(40,0,0,0.98)');
  fogGradientLeft.addColorStop(0.35, 'rgba(40,0,0,0.85)');
  fogGradientLeft.addColorStop(1, 'rgba(40,0,0,0.0)');
  ctx.fillStyle = fogGradientLeft;
  ctx.fillRect(-fogWidth, 0, fogWidth * 2, canvas.height);
  // Right fog (spills outside playable field)
  const fogGradientRight = ctx.createLinearGradient(canvas.width - fogWidth, 0, canvas.width + fogWidth, 0);
  fogGradientRight.addColorStop(0, 'rgba(40,0,0,0.0)');
  fogGradientRight.addColorStop(0.65, 'rgba(40,0,0,0.85)');
  fogGradientRight.addColorStop(1, 'rgba(40,0,0,0.98)');
  ctx.fillStyle = fogGradientRight;
  ctx.fillRect(canvas.width - fogWidth, 0, fogWidth * 2, canvas.height);

    // Bottom fog (spills up from bottom edge)
    const fogHeight = 90;
    const fogGradientBottom = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - fogHeight);
    fogGradientBottom.addColorStop(0, 'rgba(40,0,0,0.98)');
    fogGradientBottom.addColorStop(0.35, 'rgba(40,0,0,0.85)');
    fogGradientBottom.addColorStop(1, 'rgba(0,0,0,0.0)');
    ctx.fillStyle = fogGradientBottom;
    ctx.fillRect(0, canvas.height - fogHeight, canvas.width, fogHeight);
  ctx.restore();

  // ...existing code...
  drawSpawnPointDebug(ctx);
  drawNpcHomeBounds(ctx);
  // drawAimAssistOverlay(); // Aim assist cone hidden for now
    // Reticle hidden while auto-aim is active.

    ctx.restore();

    if (!visitorStageActive) {
      try {
        drawMissionBriefInArena();
      } catch (e) {}
    }

    if (!keyRushBlackout && !(keyRushHardBlackoutTimer > 0)) {
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
    if (keyRushFadeAlpha > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(1, keyRushFadeAlpha)})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
    if (keyRushBlackout) {
      ctx.save();
      ctx.fillStyle = "rgba(0, 0, 0, 1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    drawHUD();
    if (levelStatus?.stage === "keyRush" || keyRushState?.active) {
      drawKeyRushOverlay(levelStatus, keyRushState);
    }
    if (visitorStageActive) {
      drawVisitorOverlay(visitorSession);
    }
    drawLevelAnnouncements();
    if (isCongregationStage) {
      drawCongregationScene(levelStatus);
    }
    drawMeleeSwingOverlay(ctx, player);
    if (!keyRushBlackout && !(keyRushHardBlackoutTimer > 0)) {
      const { cameraOffsetX = 0, cameraOffsetY = 0 } = requireBindings();
      const shakeX = sharedShakeOffset?.x || 0;
      const shakeY = sharedShakeOffset?.y || 0;
      ctx.save();
      ctx.translate(-cameraOffsetX + shakeX, -cameraOffsetY + shakeY);
      effects.forEach((effect) => effect.draw());
      if (player && player.shieldTimer > 0) {
        player.draw();
      }
      ctx.restore();
    }
  }

  function drawMeleeSwingOverlay(ctx, player) {
    if (!ctx || !player) return;
    const state = window._meleeAttackState;
    if (!state || state.swooshTimer <= 0) return;
    const bindings = requireBindings();
    const worldScale = bindings?.WORLD_SCALE ?? 1;
    const assets = bindings?.assets;
    const cameraOffsetX = bindings?.cameraOffsetX || 0;
    const cameraOffsetY = bindings?.cameraOffsetY || 0;
    const shakeX = (typeof sharedShakeOffset !== "undefined" ? sharedShakeOffset.x : 0) || 0;
    const shakeY = (typeof sharedShakeOffset !== "undefined" ? sharedShakeOffset.y : 0) || 0;
    const swooshImg = assets?.effects?.meleeSwoosh;
    if (!swooshImg) return;
    const dirVec = state.swooshDir || window.Input.lastMovementDirection || { x: 1, y: 0 };
    const len = Math.hypot(dirVec.x, dirVec.y) || 1;
    const normalized = { x: dirVec.x / len, y: dirVec.y / len };
    const angle = Math.atan2(normalized.y, normalized.x);
    const targetLength = (state.swingLength ?? MELEE_SWING_LENGTH) * worldScale;
    const swingScale = state.swingScale ?? targetLength / Math.max(1, swooshImg.width);
    const drawWidth = swooshImg.width * swingScale;
    const drawHeight = swooshImg.height * swingScale;
    const offset = Math.max(player.radius * 0.25, drawHeight * 0.15);
    const originX = player.x - normalized.x * offset - cameraOffsetX + shakeX;
    const originY = player.y - normalized.y * offset - cameraOffsetY + shakeY;
    const duration = Math.max(0.001, MELEE_SWING_DURATION);
    const intensity = Math.min(1, state.swooshTimer / duration);
    ctx.save();
    ctx.translate(originX, originY);
    ctx.rotate(angle);
    ctx.globalAlpha = Math.min(0.9, 0.65 + intensity * 0.35);
    ctx.drawImage(
      swooshImg,
      0,
      -drawHeight * 0.5,
      drawWidth,
      drawHeight,
    );
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

  function drawFloatingTextsOverlay(context) {
    const ctx = context;
    const { cameraOffsetX = 0, cameraOffsetY = 0 } = requireBindings();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const orderedTexts = floatingTexts
      .slice()
      .sort((a, b) => (a.priority || 0) - (b.priority || 0));
    orderedTexts.forEach((ft) => {
      const drawX = ft.x - cameraOffsetX + (sharedShakeOffset?.x || 0);
      const drawY = ft.y - cameraOffsetY + (sharedShakeOffset?.y || 0);
      ctx.save();
      const fadeLength = ft.fadeLength || ft.initialLife || 1.5;
      const remaining = typeof ft.fadeDelayRemaining === "number" ? ft.fadeDelayRemaining : 0;
      let alpha = 1;
      if (remaining <= 0) {
        alpha = Math.max(0, Math.min(1, ft.life / fadeLength));
      }
      ctx.globalAlpha = alpha;
      const style = ft.style || (ft.speechBubble ? "speech" : "plain");
      const fontSize = style === "speech" ? 14 : ft.fontSize || 14;
      const fontWeight = ft.fontWeight || (style === "speech" ? "400" : "600");
      const fontFamily = ft.fontFamily || UI_FONT_FAMILY;
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      ctx.textAlign = "center";
      if (style === "speech") {
        const metrics = ctx.measureText(ft.text);
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
        ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
        ctx.lineWidth = 2;
        ctx.strokeText(ft.text, drawX, bubbleY + bubbleHeight / 2);
        ctx.fillText(ft.text, drawX, bubbleY + bubbleHeight / 2);
      } else if (style === "status") {
        ctx.textBaseline = "middle";
        const paddingX = 14;
        const metrics = ctx.measureText(ft.text);
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
        ctx.strokeText(ft.text, drawX, drawY);
        ctx.fillText(ft.text, drawX, drawY);
      } else {
        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = ft.color;
        ctx.strokeStyle = "rgba(0, 0, 0, 0.9)";
        ctx.lineWidth = 2;
        ctx.strokeText(ft.text, drawX, drawY);
        ctx.fillText(ft.text, drawX, drawY);
      }
      ctx.restore();
    });
    ctx.restore();
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
      const label = `${Math.round(entry.hp || 0)}`;
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
  };
})(typeof window !== "undefined" ? window : null);
