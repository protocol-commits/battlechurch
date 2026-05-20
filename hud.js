(function(global) {
  const prayerSpark = {
    timer: 0,
    lastRatio: 0,
    lastTime: 0,
  };
  const districtProgressSpark = {
    timer: 0,
    lastRatio: 0,
    lastTime: 0,
  };
  const districtProgressAnim = {
    animators: {},
    lastTime: 0,
    clipKeys: {},
  };
  const inputHoldPulseState = {
    holdStartedAtMs: { A: 0, B: 0, C: 0 },
  };
  const scoreboardIconSources = {
    congregation: "assets/sprites/items/icons/I28_Idol.png",
    grace: "assets/sprites/items/icons/I62_Gem_L.png",
    enemies: "assets/sprites/items/Weapons/W01_Blade.png",
    damageDealt: "assets/sprites/items/icons/A33_Mirror_Shield.png",
  };
  const scoreboardIcons = {};
  Object.entries(scoreboardIconSources).forEach(([key, src]) => {
    const img = new Image();
    img.src = src;
    scoreboardIcons[key] = img;
  });
  const defaultWeaponIcon = new Image();
  defaultWeaponIcon.src = "assets/sprites/items/Weapons/W43_Recurve_Bow.png";

  const pickupAnnouncementIconCache = new Map();
  let pickupOverlayCanvas = null;

  function ensurePickupOverlayCanvas(mainCanvas) {
    if (!mainCanvas || typeof document === "undefined") return null;
    if (!pickupOverlayCanvas || !document.body.contains(pickupOverlayCanvas)) {
      pickupOverlayCanvas = document.createElement("canvas");
      pickupOverlayCanvas.style.cssText = "position:fixed;top:0;left:0;pointer-events:none;z-index:1500;";
      document.body.appendChild(pickupOverlayCanvas);
    }
    const rect = mainCanvas.getBoundingClientRect();
    pickupOverlayCanvas.style.left = rect.left + "px";
    pickupOverlayCanvas.style.top = rect.top + "px";
    pickupOverlayCanvas.style.width = rect.width + "px";
    pickupOverlayCanvas.style.height = rect.height + "px";
    if (pickupOverlayCanvas.width !== mainCanvas.width) pickupOverlayCanvas.width = mainCanvas.width;
    if (pickupOverlayCanvas.height !== mainCanvas.height) pickupOverlayCanvas.height = mainCanvas.height;
    return pickupOverlayCanvas;
  }

  function getPickupAnnouncementIcon(src) {
    if (!src) return null;
    if (pickupAnnouncementIconCache.has(src)) return pickupAnnouncementIconCache.get(src);
    const img = new Image();
    img.src = src;
    pickupAnnouncementIconCache.set(src, img);
    return img;
  }

  function drawOutlinedText(ctx, text, x, y, font, align, fillColor, options = {}) {
    ctx.font = font;
    ctx.textAlign = align;
    ctx.textBaseline = options.baseline || ctx.textBaseline || "alphabetic";
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;
    ctx.strokeStyle = options.strokeColor || "rgba(0,0,0,0.92)";
    ctx.lineWidth = Number.isFinite(options.strokeWidth) ? options.strokeWidth : 3;
    const fallbackSoftWhite =
      (typeof UIStyles !== "undefined" && UIStyles.colors?.softWhite) || "#DFDFC4";
    ctx.fillStyle = fillColor || fallbackSoftWhite;
    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
  }

  function drawHUD(bindings, sharedShakeOffset, roundRect) {
    if (!bindings || !roundRect) return;
    const {
      ctx,
      canvas,
      UI_FONT_FAMILY,
      levelManager,
      player,
      activeBoss,
      heroLives,
      hpFlashTimer,
      visitorSession,
      assets,
      getGraceCount,
      getCongregationSize,
      initialCongregationSize,
      weaponPickupAnnouncement,
      npcWeaponState,
      npcHarmonyBuffTimer,
      npcHarmonyBuffDuration,
      powerupIconStyles,
      maxChainThisTown,
      touchControlsVisible,
      touchControlsAvailable,
      DASH_COOLDOWN,
      playerDashState,
    } = bindings;
    if (!ctx || !canvas) return;
    const prevSkipPixelFontScale = ctx.__battlechurchSkipPixelFontScale === true;
    ctx.__battlechurchSkipPixelFontScale = true;

    // Use centralized styles if available, fallback to inline
    const PALETTE = (typeof UIStyles !== 'undefined' && UIStyles.colors) ? UIStyles.colors : {
      deepNavy: "#101024",
      slate: "#324179",
      ice: "#94C0D8",
      softWhite: "#DFDFC4",
      gold: "#DDA677",
      crimson: "#D44E52",
      teal: "#8BD0BA",
      muted: "#7D6C57",
      hpBarBg: "rgba(10,15,31,0.6)",
      healthFill: "#B22E2E",
    };
    const HUD_FONTS = {
      topLabel: 18,            // Problem / Player / Congregation / Town
      pillText: 16,            // text inside pill bars
      meterLabel: 15,          // Health/Prayer row labels and scoreboard row
      chip: 14,                // tiny level chips / small helper labels
      devTitle: 18,            // dev panel section titles
      devBody: 15,             // dev panel main body rows
      devMeta: 11,             // dev panel compact labels
      comboBig: 15,            // dev combo headline values
      comboTag: 10,            // dev combo tiny headers
      gameplayComboSub: 12,    // gameplay combo subtext
      bannerTitle: 36,         // move banner title
      bannerBody: 16,          // move banner tokens (A/B arrows, etc.)
      bannerSub: 14,           // move banner denom/charge
      devHint: 11,             // bottom dev hint line
      districtMeterLabel: 12,  // text inside district progress bar segments
    };
    const hudFont = (px, weight = "") => `${weight ? `${weight} ` : ""}${px}px ${UI_FONT_FAMILY}`;

    if (typeof window !== 'undefined') {
      window.__hudTouchToggleBounds = null;
    }

    const getIconStyleColor = (key, fallback) => {
      if (!powerupIconStyles || !key) return fallback;
      const style = powerupIconStyles[key];
      return style && style.color ? style.color : fallback;
    };

    const shakeX = sharedShakeOffset?.x || 0;
    const shakeY = sharedShakeOffset?.y || 0;
    ctx.save();
    ctx.translate(shakeX, shakeY);

    const hudHeight = 84;
    const levelStatus = levelManager?.getStatus ? levelManager.getStatus() : null;
    const stats = levelManager?.getStats ? levelManager.getStats() : null;
    const bossStage = levelManager?.isBossStage?.() || false;

    const columnPadding = 16;
    const columnGap = 12;
    const totalGap = columnGap * 3;
    const availableWidth = Math.max(0, canvas.width - columnPadding * 2 - totalGap);
    const columnWidth = Math.max(20, Math.floor(availableWidth / 4));
    const startX = Math.max(columnPadding, Math.floor((canvas.width - (columnWidth * 4 + totalGap)) / 2));
    const columnXs = [
      startX,
      startX + columnWidth + columnGap,
      startX + (columnWidth + columnGap) * 2,
      startX + (columnWidth + columnGap) * 3,
    ];
    const panelHeight = hudHeight - 18;
    const panelY = 8;
    const panelPaddingX = 16;

    const fitFontSize = (text, baseSize, maxWidth, fontWeight = '') => {
      if (!text) return baseSize;
      ctx.font = `${fontWeight}${baseSize}px ${UI_FONT_FAMILY}`;
      const width = ctx.measureText(text).width || 0;
      if (!width || width <= maxWidth) return baseSize;
      const scale = maxWidth / width;
      return Math.max(10, Math.floor(baseSize * scale));
    };

    const getWeaponBaseLabel = (mode) => {
      // Use centralized text if available
      const weaponModes = (typeof GameText !== 'undefined' && GameText.weapons?.modes) || {};
      if (weaponModes[mode] !== undefined) return weaponModes[mode];
      // Fallback
      switch (mode) {
        case 'wisdom_missle':
          return 'Apply Wisdom';
        case 'faith_cannon':
          return 'Act in Faith';
        case 'fire':
          return 'Quote Scripture';
        case 'heart':
          return 'Heart Charm';
        case 'arrow':
        default:
          return '';
      }
    };

    const buildMultiplierTag = (multipliers) => {
      if (!multipliers) return '';
      const tags = [];
      if (Number.isFinite(multipliers.damage) && Math.abs(multipliers.damage - 1) > 0.01) {
        tags.push(`DMG x${multipliers.damage.toFixed(2)}`);
      }
      if (Number.isFinite(multipliers.cooldown) && Math.abs(multipliers.cooldown - 1) > 0.01) {
        tags.push(`CD x${multipliers.cooldown.toFixed(2)}`);
      }
      if (Number.isFinite(multipliers.speed) && Math.abs(multipliers.speed - 1) > 0.01) {
        tags.push(`SPD x${multipliers.speed.toFixed(2)}`);
      }
      if (!tags.length) return '';
      return ` (${tags.join(', ')})`;
    };

    const getWeaponLabel = (mode) => {
      const base = getWeaponBaseLabel(mode);
      return base;
    };
    const getNpcWeaponBaseLabel = (mode) => {
      // Use centralized text if available (same labels as player weapons)
      const weaponModes = (typeof GameText !== 'undefined' && GameText.weapons?.modes) || {};
      if (weaponModes[mode] !== undefined) return weaponModes[mode];
      // Fallback
      switch (mode) {
        case 'wisdom_missle':
          return 'Apply Wisdom';
        case 'faith_cannon':
          return 'Act in Faith';
        case 'fire':
          return 'Quote Scripture';
        case 'heart':
          return 'Heart Charm';
        case 'arrow':
        default:
          return '';
      }
    };
    const getNpcWeaponLabel = (mode) => {
      const base = getNpcWeaponBaseLabel(mode);
      return base;
    };

    const applyMeterGloss = (x, y, width, height, leftAlpha = 0.22, rightAlpha = 0.18) => {
      if (width <= 0 || height <= 0) return;
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      const gradient = ctx.createLinearGradient(x, 0, x + width, 0);
      gradient.addColorStop(0, `rgba(0, 0, 0, ${rightAlpha})`);
      gradient.addColorStop(1, `rgba(255, 255, 255, ${leftAlpha})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, width, height);
      ctx.restore();
    };

    const drawPillMeterRow = (x, y, width, label, ratio, color, iconImage, iconKey, capRatio) => {
      // FONT MAP (pill rows):
      // 15px = text inside each pill meter row (player/npc powerup bars).
      const barHeight = 18;
      const barWidth = Math.max(60, width - 8);
      const barX = x;
      const barY = y + 2;
      const clampedRatio = Math.max(0, Math.min(1, ratio || 0));
      const iconSize = 16;
      const iconGap = 8;
      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = PALETTE.hpBarBg || 'rgba(10,15,31,0.6)';
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = PALETTE.ice;
      const inFlight = iconKey && typeof window !== 'undefined'
        ? window.__hudPowerupIconInFlight?.[iconKey]
        : false;
      if (iconImage && iconImage.complete) {
        const iconX = barX - iconSize - iconGap;
        const iconY = barY + barHeight / 2 - iconSize / 2;
        if (iconKey && typeof window !== 'undefined') {
          window.__hudPowerupIconPos = window.__hudPowerupIconPos || {};
          window.__hudPowerupIconPos[iconKey] = {
            x: iconX + iconSize / 2,
            y: iconY + iconSize / 2,
          };
        }
        if (!inFlight) {
          ctx.drawImage(iconImage, iconX, iconY, iconSize, iconSize);
        }
      }
      roundRect(ctx, barX, barY, barWidth, barHeight, 6, true, true);

      // Ghost fill for capped church powerups — shows cap position as faded background
      const clampedCap = (capRatio != null) ? Math.max(0, Math.min(1, capRatio)) : null;
      if (clampedCap != null && clampedCap < 0.99) {
        const capWidth = Math.max(0, Math.floor((barWidth - 2) * clampedCap));
        if (capWidth > 0) {
          const ghostGrad = ctx.createLinearGradient(barX + 1, 0, barX + 1 + capWidth, 0);
          ghostGrad.addColorStop(0, 'rgba(255,255,255,0.0)');
          ghostGrad.addColorStop(0.5, 'rgba(255,255,255,0.08)');
          ghostGrad.addColorStop(1, 'rgba(255,255,255,0.32)');
          ctx.fillStyle = ghostGrad;
          roundRect(ctx, barX + 1, barY + 1, capWidth, barHeight - 2, 6, true, false);
        }
      }

      const fillWidth = Math.max(0, Math.floor((barWidth - 2) * clampedRatio));
      if (fillWidth > 0) {
        ctx.fillStyle = color || PALETTE.softWhite;
        roundRect(
          ctx,
          barX + 1,
          barY + 1,
          fillWidth,
          barHeight - 2,
          6,
          true,
          false,
        );
        applyMeterGloss(barX + 1, barY + 1, fillWidth, barHeight - 2);
      }
      ctx.font = hudFont(HUD_FONTS.pillText);
      ctx.fillStyle = PALETTE.softWhite;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = 'rgba(0,0,0,0.82)';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.strokeText(label, barX + barWidth / 2, barY + barHeight / 2 + 1);
      ctx.fillText(label, barX + barWidth / 2, barY + barHeight / 2 + 1);
      ctx.restore();
    };

    const drawTopHPAndLives = () => {
      // FONT MAP (left/top HUD - "Problem" section):
      // 15px = scenario/problem title above HP bar.
      // 15px = "Health" text centered inside HP bar.
      const hpBarX = columnXs[0] + 6;
      const hpBarY = panelY + 24;
      const hpBarWidth = Math.min(210, Math.max(120, columnWidth - 12));
      const hpBarHeight = 18;
      ctx.save();
      ctx.textAlign = 'left';
      ctx.fillStyle = PALETTE.softWhite;
      ctx.font = hudFont(HUD_FONTS.meterLabel);
      let scenarioTitle = '';
      if (typeof window !== 'undefined') {
        const scenario = window.__lastMissionBriefScenario;
        if (typeof scenario === 'string') scenarioTitle = scenario;
        else if (scenario && typeof scenario.title === 'string') scenarioTitle = scenario.title;
      }
      const bossStage =
        levelStatus?.stage === 'bossIntro' ||
        levelStatus?.stage === 'bossActive' ||
        levelStatus?.stage === 'graceRush' ||
        (activeBoss && !activeBoss.dead && !activeBoss.removed);
      if (bossStage) {
        scenarioTitle = (typeof GameText !== 'undefined' && GameText.hud?.bossStageTitle) || 'Personal Struggles';
      } else if (!scenarioTitle) {
        scenarioTitle = (typeof GameText !== 'undefined' && GameText.hud?.defaultMissionTitle) || 'the crisis';
      }
      const maxScenarioWidth = hpBarWidth;
      const toUpper = (value) => String(value || "").toUpperCase();
      const truncateToWidth = (value, maxWidth) => {
        const raw = String(value || "");
        if (!raw) return "";
        if ((ctx.measureText(raw).width || 0) <= maxWidth) return raw;
        const ellipsis = "…";
        let out = raw;
        while (out.length > 1 && (ctx.measureText(`${out}${ellipsis}`).width || 0) > maxWidth) {
          out = out.slice(0, -1);
        }
        return `${out}${ellipsis}`;
      };
      const baseLabel = toUpper(scenarioTitle);
      const displayLabel = truncateToWidth(baseLabel, maxScenarioWidth);
      drawOutlinedText(
        ctx,
        displayLabel,
        hpBarX,
        panelY + 14,
        hudFont(HUD_FONTS.topLabel),
        "left",
        PALETTE.softWhite,
      );
      ctx.restore();
      ctx.fillStyle = PALETTE.hpBarBg || 'rgba(10,15,31,0.6)';
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = PALETTE.ice;
      roundRect(ctx, hpBarX, hpBarY, hpBarWidth, hpBarHeight, 6, true, true);
      const hpRatio = Math.max(0, (player?.health ?? 0) / (player?.maxHealth || 1));
      const hpFillColor = hpFlashTimer > 0 ? (() => {
        const pulse = (Math.sin(performance.now() * 0.05) + 1) / 2;
        const g = Math.round(140 + 90 * pulse);
        const b = Math.round(80 + 20 * (1 - pulse));
        return `rgb(255, ${g}, ${b})`;
      })() : (PALETTE.healthFill || '#B23A3A');
      ctx.fillStyle = hpFillColor;
      roundRect(
        ctx,
        hpBarX + 1,
        hpBarY + 1,
        Math.max(6, Math.floor((hpBarWidth - 2) * hpRatio)),
        hpBarHeight - 2,
        6,
        true,
        false,
      );
      applyMeterGloss(
        hpBarX + 1,
        hpBarY + 1,
        Math.max(6, Math.floor((hpBarWidth - 2) * hpRatio)),
        hpBarHeight - 2,
      );
      const hpFlash = player?.hpDamageFlash;
      if (hpFlash?.timer > 0 && hpFlash.duration > 0) {
        const startRatio = Math.max(0, Math.min(1, hpFlash.startRatio || 0));
        const endRatio = Math.max(0, Math.min(1, hpFlash.endRatio || 0));
        const delta = Math.max(0, startRatio - endRatio);
        if (delta > 0) {
          const progress = 1 - hpFlash.timer / hpFlash.duration;
          const pulse = Math.abs(Math.sin(progress * Math.PI * (hpFlash.flashes || 3)));
          const alpha = 0.2 + 0.8 * pulse;
          const segmentX = hpBarX + 2 + Math.floor((hpBarWidth - 4) * endRatio);
          const segmentW = Math.max(1, Math.floor((hpBarWidth - 4) * delta));
          ctx.fillStyle = `rgba(255, 246, 170, ${alpha.toFixed(3)})`;
          ctx.fillRect(segmentX, hpBarY + 2, segmentW, hpBarHeight - 4);
        }
      }
      if (hpRatio > 0 && hpRatio <= 0.25) {
        try {
          const alpha = Math.abs(Math.sin(performance.now() * 0.01)) * 0.65;
          ctx.fillStyle = `rgba(255,60,60,${alpha.toFixed(3)})`;
          roundRect(
            ctx,
            hpBarX + 1,
            hpBarY + 1,
            hpBarWidth - 2,
            hpBarHeight - 2,
            6,
            true,
            false,
          );
        } catch (err) {}
      }

      const hpBaseText = (typeof GameText !== 'undefined' && GameText.hud?.health) || 'Health';
      const currentHp = Number.isFinite(player?.health) ? Math.max(0, Math.round(player.health)) : 0;
      const maxHp = Number.isFinite(player?.maxHealth) ? Math.max(1, Math.round(player.maxHealth)) : 1;
      const overheal = Math.max(0, currentHp - maxHp);
      const hpValueText = overheal > 0 ? `${hpBaseText}+${overheal}` : hpBaseText;
      ctx.save();
      ctx.font = hudFont(HUD_FONTS.meterLabel);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.strokeText(hpValueText, hpBarX + hpBarWidth / 2, hpBarY + hpBarHeight / 2 + 1);
      ctx.fillStyle = PALETTE.softWhite;
      ctx.fillText(hpValueText, hpBarX + hpBarWidth / 2, hpBarY + hpBarHeight / 2 + 1);
      ctx.restore();

      try {
        const baseX = hpBarX + hpBarWidth + 6;
        const centerY = hpBarY + hpBarHeight / 2;
        const livesToShow = Math.max(0, Math.min(6, heroLives - 1));
        let offsetX = baseX;
        const maxX = columnXs[0] + columnWidth - 6;
        for (let i = 0; i < livesToShow; i += 1) {
          if (offsetX + 18 > maxX) break;
          if (player && player.animator && player.animator.currentClip && player.animator.currentClip.image) {
            const clip = player.animator.currentClip;
            const img = clip.image;
            const cols = Math.max(1, Math.floor(img.width / clip.frameWidth));
            let effIdx = player.animator.frameIndex;
            if (Array.isArray(clip.frameMap) && clip.frameMap.length) {
              const mapLen = clip.frameMap.length;
              const mapPos = mapLen > 0 ? (player.animator.frameIndex % mapLen) : 0;
              effIdx = Number.isFinite(clip.frameMap[mapPos]) ? clip.frameMap[mapPos] : 0;
            }
            const frameX = (effIdx % cols) * clip.frameWidth;
            const frameY = Math.floor(effIdx / cols) * clip.frameHeight;
            const drawW = 20;
            const drawH = 20;
            ctx.save();
            ctx.beginPath();
            ctx.arc(offsetX + drawW / 2, centerY, drawW / 2, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(
              img,
              frameX,
              frameY,
              clip.frameWidth,
              clip.frameHeight,
              offsetX,
              centerY - drawH / 2,
              drawW,
              drawH,
            );
            ctx.restore();
            offsetX += drawW + 3;
          }
        }
      } catch (e) {}
    };

    if (typeof window !== 'undefined') {
      window.__hudPowerupIconPos = {};
    }

    drawTopHPAndLives();

    const drawPrayerBombMeter = () => {
      // FONT MAP (left/bottom HUD - prayer + scoreboard row):
      // 15px = "Prayer" / "Smite Ready" text inside prayer meter.
      // 15px = grace/enemies/damage/max-chain numbers under the meter.
      if (!player) return;
      const meterX = columnXs[0] + 6;
      const meterY = panelY + 46;
      const meterWidth = Math.min(210, Math.max(120, columnWidth - 12));
      const meterHeight = 18;
      const meterRadius = 6;
      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = PALETTE.hpBarBg || 'rgba(10,15,31,0.6)';
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(0,0,0,0)';
      roundRect(ctx, meterX, meterY, meterWidth, meterHeight, meterRadius, true, true);
      const innerY = meterY + 1;
      const innerH = meterHeight - 2;
      const NUM_SEGS = 6;
      const ratio = typeof player.getPrayerChargeRatio === 'function' ? player.getPrayerChargeRatio() : 0;
      const clampedRatio = Math.max(0, Math.min(1, ratio));
      const ready = typeof player.isPrayerBombReady === 'function' ? player.isPrayerBombReady() : clampedRatio >= 1;
      const fullPrayerReady = clampedRatio >= 0.999;
      const now = performance.now() * 0.001;
      const dt = prayerSpark.lastTime ? Math.min(0.1, Math.max(0, now - prayerSpark.lastTime)) : 0;
      prayerSpark.lastTime = now;
      if (ratio > prayerSpark.lastRatio + 0.002) {
        prayerSpark.timer = 0.45;
      }
      prayerSpark.lastRatio = ratio;
      const totalWidth = Math.max(0, Math.floor(meterWidth * clampedRatio));
      const outerGap = 2;
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.008);
      const fullPulse = clampedRatio >= 1;
      const fullPulseAlpha = 0.2 + pulse * 0.45;
      const fullPulseBrightAlpha = 0.35 + pulse * 0.6;
      const segRad = Math.max(2, meterRadius - 2);

      // Pre-compute fill bounds matching border segment positions (gap-aware)
      const segBounds = [];
      for (let i = 0; i < NUM_SEGS; i++) {
        const base = Math.floor(meterWidth * i / NUM_SEGS);
        const end = i < NUM_SEGS - 1 ? Math.floor(meterWidth * (i + 1) / NUM_SEGS) : meterWidth;
        const span = end - base;
        let bx, bw;
        if (i === 0) {
          bx = meterX;
          bw = Math.max(0, span - outerGap);
        } else if (i === NUM_SEGS - 1) {
          bx = meterX + base + outerGap;
          bw = Math.max(0, span - outerGap);
        } else {
          bx = meterX + base + outerGap;
          bw = Math.max(0, span - outerGap * 2);
        }
        segBounds.push({ x: bx, w: bw, startPx: bx - meterX });
      }

      // Draw fills and highlights
      for (let i = 0; i < NUM_SEGS; i++) {
        const { x: sx, w: sw, startPx } = segBounds[i];
        const fill = Math.max(0, Math.min(sw, totalWidth - startPx));
        const isFirst = i === 0;
        const drawX = isFirst ? sx - 1 : sx;
        const drawFill = fill + (isFirst ? 1 : 0);
        const drawFull = sw + (isFirst ? 1 : 0);

        // Segment fill: gold for complete segments, teal for the partial segment
        if (fill > 0) {
          const isFullSeg = fill >= sw;
          ctx.fillStyle = isFullSeg ? PALETTE.gold : PALETTE.teal;
          if (isFirst) {
            roundRect(ctx, drawX, innerY, drawFill, innerH, segRad, true, false);
          } else {
            ctx.fillRect(sx, innerY, fill, innerH);
          }
          applyMeterGloss(drawX, innerY, drawFill, innerH);

          // Pulse overlay on individually full segments
          if (isFullSeg && !fullPulse) {
            ctx.save();
            ctx.globalAlpha = 0.1 + pulse * 0.18;
            ctx.fillStyle = PALETTE.softWhite;
            if (isFirst) {
              roundRect(ctx, drawX, innerY, drawFull, innerH, segRad, true, false);
            } else {
              ctx.fillRect(sx, innerY, sw, innerH);
            }
            ctx.restore();
          }
        }

        // Bright white-gold pulse when fully charged
        if (fullPulse && sw > 0) {
          ctx.save();
          ctx.globalAlpha = i >= 4 ? fullPulseBrightAlpha : fullPulseAlpha;
          ctx.fillStyle = PALETTE.softWhite;
          if (isFirst) {
            roundRect(ctx, drawX, innerY, drawFull, innerH, segRad, true, false);
          } else {
            ctx.fillRect(sx, innerY, sw, innerH);
          }
          ctx.restore();
        }
      }

      // Draw 6 outer segment borders
      ctx.save();
      const strokeSegment = (x, w, { leftRound = false, rightRound = false } = {}) => {
        const r = meterRadius;
        ctx.beginPath();
        ctx.moveTo(x + (leftRound ? r : 0), meterY);
        ctx.lineTo(x + w - (rightRound ? r : 0), meterY);
        if (rightRound) {
          ctx.quadraticCurveTo(x + w, meterY, x + w, meterY + r);
        } else {
          ctx.lineTo(x + w, meterY);
          ctx.lineTo(x + w, meterY + r);
        }
        ctx.lineTo(x + w, meterY + meterHeight - (rightRound ? r : 0));
        if (rightRound) {
          ctx.quadraticCurveTo(x + w, meterY + meterHeight, x + w - r, meterY + meterHeight);
        } else {
          ctx.lineTo(x + w, meterY + meterHeight);
          ctx.lineTo(x + w - r, meterY + meterHeight);
        }
        ctx.lineTo(x + (leftRound ? r : 0), meterY + meterHeight);
        if (leftRound) {
          ctx.quadraticCurveTo(x, meterY + meterHeight, x, meterY + meterHeight - r);
        } else {
          ctx.lineTo(x, meterY + meterHeight);
          ctx.lineTo(x, meterY + meterHeight - r);
        }
        ctx.lineTo(x, meterY + r);
        if (leftRound) {
          ctx.quadraticCurveTo(x, meterY, x + r, meterY);
        } else {
          ctx.lineTo(x, meterY);
          ctx.lineTo(x + r, meterY);
        }
        ctx.stroke();
      };
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = PALETTE.ice;
      for (let i = 0; i < NUM_SEGS; i++) {
        const base = Math.floor(meterWidth * i / NUM_SEGS);
        const end = i < NUM_SEGS - 1 ? Math.floor(meterWidth * (i + 1) / NUM_SEGS) : meterWidth;
        const span = end - base;
        let bx, bw;
        if (i === 0) {
          bx = meterX;
          bw = Math.max(0, span - outerGap);
        } else if (i === NUM_SEGS - 1) {
          bx = meterX + base + outerGap;
          bw = Math.max(0, span - outerGap);
        } else {
          bx = meterX + base + outerGap;
          bw = Math.max(0, span - outerGap * 2);
        }
        strokeSegment(bx, bw, { leftRound: i === 0, rightRound: i === NUM_SEGS - 1 });
      }
      ctx.restore();
      if (prayerSpark.timer > 0 && totalWidth > 0) {
        prayerSpark.timer = Math.max(0, prayerSpark.timer - dt);
        const sparkAlpha = Math.min(1, prayerSpark.timer / 0.45);
        const sparkX = meterX + 2 + totalWidth;
        const sparkY = meterY + 2;
        const sparkW = 10;
        const sparkH = meterHeight - 4;
        const gradient = ctx.createLinearGradient(sparkX - sparkW, 0, sparkX, 0);
        gradient.addColorStop(0, "rgba(255, 220, 140, 0)");
        gradient.addColorStop(1, `rgba(255, 225, 180, ${1.25 * sparkAlpha})`);
        ctx.save();
        ctx.globalAlpha = sparkAlpha;
        ctx.fillStyle = gradient;
        ctx.fillRect(sparkX - sparkW, sparkY, sparkW, sparkH);
        ctx.restore();
      }
      {
        const textX = meterX + meterWidth / 2;
        const textY = meterY + meterHeight / 2 + 0.5;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        if (fullPrayerReady) {
          const readyText = "Smite Ready";
          const flashPulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.012);
          ctx.save();
          ctx.font = hudFont(HUD_FONTS.meterLabel);
          ctx.globalAlpha = 0.55 + flashPulse * 0.45;
          ctx.fillStyle = PALETTE.softWhite;
          ctx.shadowColor = "rgba(255, 212, 124, 0.9)";
          ctx.shadowBlur = 6 + flashPulse * 6;
          ctx.shadowOffsetY = 0;
          ctx.strokeStyle = 'rgba(0,0,0,0.7)';
          ctx.lineWidth = 3;
          ctx.lineJoin = 'round';
          ctx.strokeText(readyText, textX, textY);
          ctx.fillText(readyText, textX, textY);
          ctx.restore();
        } else {
          ctx.save();
          ctx.font = hudFont(HUD_FONTS.meterLabel);
          ctx.strokeStyle = 'rgba(0,0,0,0.7)';
          ctx.lineWidth = 3;
          ctx.lineJoin = 'round';
          ctx.strokeText("Prayer", textX, textY);
          ctx.fillStyle = PALETTE.softWhite;
          ctx.fillText("Prayer", textX, textY);
          ctx.restore();
        }
      }
      ctx.font = hudFont(HUD_FONTS.meterLabel);
      ctx.fillStyle = ready
        ? (Math.sin(performance.now() * 0.01) > 0 ? PALETTE.gold : PALETTE.ice)
        : PALETTE.softWhite;
      ctx.textAlign = 'center';
      ctx.restore();

      const graceCount = typeof getGraceCount === 'function' ? getGraceCount() : 0;
      const enemyKills = stats?.enemiesDefeated ?? 0;
      const damageDealt = stats?.damageDealt ?? 0;
      const formatNumber =
        typeof bindings?.formatNumberWithCommas === 'function'
          ? bindings.formatNumberWithCommas
          : (value) => `${Math.round(Number.isFinite(value) ? value : 0)}`;
      const iconSize = 16;
      const gap = 6;
      const rowY = meterY + meterHeight + 14;
      ctx.save();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = PALETTE.softWhite;
      ctx.font = hudFont(HUD_FONTS.meterLabel);
      ctx.strokeStyle = 'rgba(0,0,0,0.82)';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      let x = meterX + 4;
      if (scoreboardIcons.grace && scoreboardIcons.grace.complete) {
        ctx.drawImage(scoreboardIcons.grace, x, rowY - iconSize / 2, iconSize, iconSize);
        if (typeof window !== 'undefined') {
          window.__hudGraceIconPos = {
            x: x + iconSize / 2,
            y: rowY,
          };
        }
        x += iconSize + gap;
      }
      const graceText = formatNumber(graceCount);
      ctx.strokeText(graceText, x, rowY);
      ctx.fillText(graceText, x, rowY);
      x += ctx.measureText(graceText).width + 14;
      if (scoreboardIcons.enemies && scoreboardIcons.enemies.complete) {
        ctx.drawImage(scoreboardIcons.enemies, x, rowY - iconSize / 2, iconSize, iconSize);
        x += iconSize + gap;
      }
      const enemyText = formatNumber(enemyKills);
      ctx.strokeText(enemyText, x, rowY);
      ctx.fillText(enemyText, x, rowY);
      x += ctx.measureText(enemyText).width + 14;
      if (scoreboardIcons.damageDealt && scoreboardIcons.damageDealt.complete) {
        ctx.drawImage(scoreboardIcons.damageDealt, x, rowY - iconSize / 2, iconSize, iconSize);
        x += iconSize + gap;
      }
      const damageDealtText = formatNumber(damageDealt);
      ctx.strokeText(damageDealtText, x, rowY);
      ctx.fillText(damageDealtText, x, rowY);
      x += ctx.measureText(damageDealtText).width + 14;
      const comboLabel = (typeof GameText !== 'undefined' && GameText.hud?.maxChain) || "Max Chain:";
      const comboValue = Number.isFinite(maxChainThisTown) ? Math.max(0, Math.round(maxChainThisTown)) : 0;
      const comboText = formatNumber(comboValue);
      ctx.fillStyle = PALETTE.muted;
      ctx.strokeText(comboLabel, x, rowY);
      ctx.fillText(comboLabel, x, rowY);
      x += ctx.measureText(comboLabel).width + 6;
      ctx.fillStyle = PALETTE.softWhite;
      ctx.strokeText(comboText, x, rowY);
      ctx.fillText(comboText, x, rowY);
      if (typeof window !== 'undefined') {
        const comboWidth = ctx.measureText(comboText).width || 0;
        window.__hudMaxComboPos = {
          x: x + comboWidth / 2,
          y: rowY,
        };
        window.__comboTextFixedX = meterX + 4;
        window.__comboTextFixedY = rowY + 20;
      }
      x += ctx.measureText(comboText).width;
      ctx.restore();
    };

    drawPrayerBombMeter();

    const drawPlayerInfo = () => {
      // FONT MAP (2nd column - Player):
      // 15px = player header line ("Pastor ...").
      // Pill row text uses drawPillMeterRow() 15px mapping above.
      if (!player) return;
      const x = columnXs[1] + 6;
      const width = columnWidth - 12;
      ctx.save();
      ctx.textAlign = 'left';
      ctx.fillStyle = PALETTE.softWhite;
      ctx.font = hudFont(HUD_FONTS.meterLabel);
      const playerRowY = panelY + 14;
      const playerName = window.MapScreen?.getPlayerName?.() || '';
      const playerLabel = `Pastor ${playerName}`.trim();
      drawOutlinedText(
        ctx,
        playerLabel,
        x,
        playerRowY,
        hudFont(HUD_FONTS.topLabel),
        "left",
        PALETTE.softWhite,
      );

      // Pastor powerup icons inline after player label (same style as church upgrade icons)
      const pastorLevels = (window.pastorPowerupLevels instanceof Map ? window.pastorPowerupLevels : new Map());
      const pastorAssets = assets?.pastorPowerups || {};
      const pastorOrder = ['prayer', 'hp', 'dash'];
      const dashBuffTimer = Math.max(0, typeof window.pastorDashBuffTimer === 'number' ? window.pastorDashBuffTimer : 0);
      const _dashByLevel = window.GameBalance?.pastorPowerups?.dashDurationByLevel || [20, 22, 24, 27, 30];
      const _dashLevel = Math.max(1, (window.pastorPowerupLevels instanceof Map ? window.pastorPowerupLevels.get('dash') : 0) || 1);
      const DASH_BUFF_DURATION = _dashByLevel[Math.min(_dashByLevel.length - 1, _dashLevel - 1)] || 20.0;
      const pastorEntries = pastorOrder
        .map((key) => ({
          key,
          level: pastorLevels.get(key) || 0,
          icon: pastorAssets[key]?.iconImage || null,
        }))
        .filter((e) => e.level > 0);
      if (pastorEntries.length) {
        ctx.font = hudFont(HUD_FONTS.topLabel);
        const labelWidth = ctx.measureText(playerLabel).width || 0;
        const iconSize = 14;
        const gap = 4;
        const itemGap = 10;
        const textPadding = 2;
        let chipX = x + labelWidth + 8;
        const chipMaxX = x + width;
        ctx.fillStyle = PALETTE.softWhite;
        pastorEntries.forEach((entry) => {
          const levelText = `${entry.level}`;
          const levelTextWidth = ctx.measureText(levelText).width || 0;
          const itemWidth = (entry.icon && entry.icon.complete ? iconSize + gap : 0) + levelTextWidth + textPadding;
          if (chipX + itemWidth > chipMaxX) return;
          if (entry.icon && entry.icon.complete) {
            ctx.drawImage(entry.icon, chipX, playerRowY - iconSize / 2 - 5, iconSize, iconSize);
            chipX += iconSize + gap;
          }
          ctx.fillText(levelText, chipX, playerRowY);
          chipX += levelTextWidth + itemGap;
        });
      }

      ctx.restore();

      const rows = [];
      const weaponMode = player.overrideWeaponMode || player.weaponMode || 'arrow';
      const weaponDuration = Math.max(0.001, player.weaponPowerDuration || 0);
      const weaponTimer = Math.max(0, player.weaponPowerTimer || 0);
      const weaponRatio = weaponDuration > 0 ? weaponTimer / weaponDuration : 0;
      const weaponIcon = (() => {
        if (!assets || !assets.weaponPickups) return defaultWeaponIcon;
        if (weaponMode === 'wisdom_missle') return assets.weaponPickups.wisdom?.iconImage || defaultWeaponIcon;
        if (weaponMode === 'faith_cannon') return assets.weaponPickups.faith?.iconImage || defaultWeaponIcon;
        if (weaponMode === 'fire') return assets.weaponPickups.scripture?.iconImage || defaultWeaponIcon;
        return null;
      })();
      let playerMultipliers = null;
      if (weaponMode === 'wisdom_missle') {
        playerMultipliers = {
          cooldown: player.magicCooldownMultiplier,
          speed: player.magicSpeedMultiplier,
        };
      } else if (weaponMode === 'faith_cannon') {
        playerMultipliers = {
          damage: player.faithCannonDamageMultiplier,
          cooldown: player.faithCannonCooldownMultiplier,
          speed: player.faithCannonSpeedMultiplier,
        };
      } else if (weaponMode === 'fire') {
        playerMultipliers = {
          damage: player.fireDamageMultiplier,
          cooldown: player.fireCooldownMultiplier,
          speed: player.fireSpeedMultiplier,
        };
      }
      const weaponStatKeyMap = {
        wisdom_missle: { dmg: 'wisdomDamageMultiplier',    rof: 'wisdomRofMultiplier' },
        faith_cannon:  { dmg: 'faithDamageMultiplier',     rof: 'faithRofMultiplier' },
        fire:          { dmg: 'scriptureDamageMultiplier', rof: 'scriptureRofMultiplier' },
      };
      const weaponStatKeys = weaponStatKeyMap[weaponMode];
      const activeClass = window.BattlechurchClasses?.getActive?.();
      const weaponDmgMult = weaponStatKeys ? (activeClass?.tuning?.powerups?.[weaponStatKeys.dmg] ?? 1) : 1;
      const weaponRofMult = weaponStatKeys ? (activeClass?.tuning?.powerups?.[weaponStatKeys.rof] ?? 1) : 1;
      const weaponDmgPct  = Math.round((weaponDmgMult - 1) * 100);
      const weaponRofPct  = Math.round((weaponRofMult - 1) * 100);
      const weaponStatParts = [];
      if (weaponDmgPct !== 0) weaponStatParts.push(`D${weaponDmgPct > 0 ? '+' : ''}${weaponDmgPct}%`);
      if (weaponRofPct !== 0) weaponStatParts.push(`ROF${weaponRofPct > 0 ? '+' : ''}${weaponRofPct}%`);
      const weaponStatSuffix = weaponStatParts.length ? ` [${weaponStatParts.join(', ')}]` : '';
      rows.push({
        label: getWeaponLabel(weaponMode) + weaponStatSuffix,
        ratio: weaponMode === 'arrow' ? 0 : weaponRatio,
        color: weaponMode === 'arrow' ? PALETTE.ice : getIconStyleColor('player', PALETTE.ice),
        iconImage: weaponIcon,
        iconKey: 'playerWeapon',
      });

      const upgradeRows = [];
      // Use centralized skill names if available
      const skillNames = (typeof GameText !== 'undefined' && GameText.skills) || {};
      if (player.spreadGunTimer > 0) {
        const maxDuration = Math.max(0.001, player.spreadGunMaxDuration || player.spreadGunDuration || 0);
        upgradeRows.push({
          label: skillNames.spreadGun || 'Spread Gun',
          ratio: player.spreadGunTimer / maxDuration,
          capRatio: (player.spreadGunDuration || 0) / maxDuration,
          color: getIconStyleColor('player', PALETTE.ice),
          iconImage: assets?.churchPowerups?.spreadGun?.iconImage || null,
          iconKey: 'upgradeSpreadGun',
        });
      }
      if (player.haloTimer > 0) {
        const maxDuration = Math.max(0.001, player.haloMaxDuration || player.haloDuration || 0);
        upgradeRows.push({
          label: skillNames.halo || 'Halo',
          ratio: player.haloTimer / maxDuration,
          capRatio: (player.haloDuration || 0) / maxDuration,
          color: getIconStyleColor('player', PALETTE.ice),
          iconImage: assets?.churchPowerups?.halo?.iconImage || null,
          iconKey: 'upgradeHalo',
        });
      }
      if (player.spearTimer > 0) {
        const maxDuration = Math.max(0.001, player.spearMaxDuration || player.spearDuration || 0);
        upgradeRows.push({
          label: skillNames.spear || 'Spear',
          ratio: player.spearTimer / maxDuration,
          capRatio: (player.spearDuration || 0) / maxDuration,
          color: getIconStyleColor('player', PALETTE.ice),
          iconImage: assets?.churchPowerups?.spear?.iconImage || null,
          iconKey: 'upgradeSpear',
        });
      }
      if (player.sentryTimer > 0) {
        const maxDuration = Math.max(0.001, player.sentryMaxDuration || player.sentryDuration || 0);
        upgradeRows.push({
          label: skillNames.sentry || 'Sentry',
          ratio: player.sentryTimer / maxDuration,
          capRatio: (player.sentryDuration || 0) / maxDuration,
          color: getIconStyleColor('player', PALETTE.ice),
          iconImage: assets?.churchPowerups?.sentry?.iconImage || null,
          iconKey: 'upgradeSentry',
        });
      }

      if (dashBuffTimer > 0) {
        upgradeRows.push({
          label: 'Stamina Boost',
          ratio: dashBuffTimer / DASH_BUFF_DURATION,
          color: getIconStyleColor('player', PALETTE.ice),
          iconImage: pastorAssets['dash']?.iconImage || null,
          iconKey: 'pastorDash',
        });
      }

      const utilityRows = [];
      if (player.shieldTimer > 0) {
        const duration = Math.max(0.001, player.shieldDuration || 0);
        utilityRows.push({
          label: skillNames.shieldOfFaith || 'Shield of Faith',
          ratio: duration > 0 ? player.shieldTimer / duration : 0,
          color: getIconStyleColor('utility', PALETTE.ice),
          iconImage: assets?.utility?.shield?.iconImage || null,
          iconKey: 'utilityShield',
        });
      }
      if (player.speedBoostTimer > 0) {
        const duration = Math.max(0.001, player.speedBoostDuration || 0);
        utilityRows.push({
          label: skillNames.haste || 'Quicken',
          ratio: duration > 0 ? player.speedBoostTimer / duration : 0,
          color: getIconStyleColor('utility', PALETTE.teal),
          iconImage: assets?.utility?.haste?.iconImage || null,
          iconKey: 'utilityHaste',
        });
      }
      if (player.powerExtendTimer > 0) {
        const duration = Math.max(0.001, player.powerExtendDuration || 0);
        utilityRows.push({
          label: skillNames.swordOfTheSpirit || 'Perseverance (extends weapons)',
          ratio: duration > 0 ? player.powerExtendTimer / duration : 0,
          color: getIconStyleColor('utility', PALETTE.gold),
          iconImage: assets?.utility?.extender?.iconImage || null,
          iconKey: 'utilityExtend',
        });
      }
      rows.push(...upgradeRows);
      rows.push(...utilityRows);

      const maxRows = 6;
      const rowStart = panelY + 24;
      const rowGap = 22;
      const visibleRows = Math.min(rows.length, maxRows);
      const rowYs = Array.from({ length: visibleRows }, (_, idx) => rowStart + rowGap * idx);
      rows.slice(0, visibleRows).forEach((row, idx) => {
        drawPillMeterRow(x, rowYs[idx], width, row.label, row.ratio, row.color, row.iconImage, row.iconKey, row.capRatio);
      });
    };

    const drawNpcInfo = () => {
      // FONT MAP (3rd column - Congregation):
      // 15px = congregation header line ("CONGREGATION: N").
      // Pill row text uses drawPillMeterRow() 15px mapping above.
      const x = columnXs[2] + 6;
      const width = columnWidth - 12;
      const congregationProvider = typeof getCongregationSize === 'function' ? getCongregationSize : null;
      const baselineCongregation = typeof initialCongregationSize === 'number' ? initialCongregationSize : 0;
      const congregationTotal = congregationProvider
        ? congregationProvider()
        : Math.max(0, baselineCongregation || 0);
      ctx.save();
      ctx.textAlign = 'left';
      ctx.fillStyle = PALETTE.softWhite;
      ctx.font = hudFont(HUD_FONTS.meterLabel);
      const congregationLabel = (typeof GameText !== 'undefined' && GameText.hud?.congregation) || 'CONGREGATION';
      drawOutlinedText(
        ctx,
        `${congregationLabel}: ${congregationTotal}`,
        x,
        panelY + 14,
        hudFont(HUD_FONTS.topLabel),
        "left",
        PALETTE.softWhite,
      );
      ctx.restore();

      const rows = [];
      const npcMode = npcWeaponState?.mode || 'arrow';
      const npcTimer = Math.max(0, npcWeaponState?.timer || 0);
      const npcDuration = Math.max(0.001, npcWeaponState?.duration || npcTimer || 0);
      const npcWeaponIcon = (() => {
        if (!assets || !assets.weaponPickups) return defaultWeaponIcon;
        if (npcMode === 'wisdom_missle') return assets.weaponPickups.npcWisdom?.iconImage || defaultWeaponIcon;
        if (npcMode === 'faith_cannon') return assets.weaponPickups.npcFaith?.iconImage || defaultWeaponIcon;
        if (npcMode === 'fire') return assets.weaponPickups.npcScripture?.iconImage || defaultWeaponIcon;
        return null;
      })();
      const npcMultipliers = npcMode === 'arrow'
        ? null
        : {
            damage: npcWeaponState?.damageMultiplier,
            cooldown: npcWeaponState?.cooldownMultiplier,
            speed: npcWeaponState?.speedMultiplier,
          };
      const npcStatKeyMap = {
        wisdom_missle: { dmg: 'npcWisdomDamageMultiplier',    rof: 'npcWisdomRofMultiplier' },
        faith_cannon:  { dmg: 'npcFaithDamageMultiplier',     rof: 'npcFaithRofMultiplier' },
        fire:          { dmg: 'npcScriptureDamageMultiplier', rof: 'npcScriptureRofMultiplier' },
      };
      const npcStatKeys = npcStatKeyMap[npcMode];
      const npcActiveClass = window.BattlechurchClasses?.getActive?.();
      const npcDmgMult = npcStatKeys ? (npcActiveClass?.tuning?.npc?.[npcStatKeys.dmg] ?? 1) : 1;
      const npcRofMult = npcStatKeys ? (npcActiveClass?.tuning?.npc?.[npcStatKeys.rof] ?? 1) : 1;
      const npcDmgPct  = Math.round((npcDmgMult - 1) * 100);
      const npcRofPct  = Math.round((npcRofMult - 1) * 100);
      const npcStatParts = [];
      if (npcDmgPct !== 0) npcStatParts.push(`D${npcDmgPct > 0 ? '+' : ''}${npcDmgPct}%`);
      if (npcRofPct !== 0) npcStatParts.push(`ROF${npcRofPct > 0 ? '+' : ''}${npcRofPct}%`);
      const npcStatSuffix = npcStatParts.length ? ` [${npcStatParts.join(', ')}]` : '';
      rows.push({
        label: getNpcWeaponLabel(npcMode) + npcStatSuffix,
        ratio: npcMode === 'arrow' ? 0 : (npcTimer / npcDuration),
        color: npcMode === 'arrow' ? PALETTE.gold : getIconStyleColor('npc', PALETTE.gold),
        iconImage: npcWeaponIcon,
        iconKey: 'npcWeapon',
      });
      if (npcHarmonyBuffTimer > 0) {
        const npcSkillNames = (typeof GameText !== 'undefined' && GameText.skills) || {};
        const duration = Math.max(0.001, npcHarmonyBuffDuration || npcHarmonyBuffTimer || 0);
        rows.push({
          label: npcSkillNames.encourageOneAnother || 'Encourage One Another',
          ratio: duration > 0 ? npcHarmonyBuffTimer / duration : 0,
          color: getIconStyleColor('utility', PALETTE.teal),
          iconImage: assets?.utility?.harmony?.iconImage || null,
          iconKey: 'npcHarmony',
        });
      }

      const rowYs = [panelY + 24, panelY + 46, panelY + 68];
      rows.slice(0, rowYs.length).forEach((row, idx) => {
        drawPillMeterRow(x, rowYs[idx], width, row.label, row.ratio, row.color, row.iconImage, row.iconKey, row.capRatio);
      });
    };

    const drawDistrictProgress = () => {
      // FONT MAP (4th column - Town/District progress):
      // 15px = top district label ("Town [battlefield.wave.horde]").
      // 11-12px (weighted below) = small church powerup level chips.
      const levelStatus = levelManager?.getStatus ? levelManager.getStatus() : null;
      if (!levelStatus) return;
      const x = columnXs[3] + 6;
      const width = columnWidth - 12;
      const levelData =
        (typeof window !== 'undefined' && window.BattlechurchLevelData) || null;
      const structure = levelData?.structure || {};
      const battlesPerTown = Number.isFinite(structure.battlesPerTown) ? structure.battlesPerTown : 3;
      const defaultHordesPerWave = Number.isFinite(structure.defaultHordesPerWave) ? structure.defaultHordesPerWave : 7;
      const defaultWavesPerBattle = Number.isFinite(structure.defaultWavesPerMission) ? structure.defaultWavesPerMission : 3;

      const townIndex = Math.max(0, (levelStatus.level || 1) - 1);
      const getBattleHordeCount = (battleIndex) => {
        const town = levelData?.towns?.[townIndex] || null;
        const battle = town?.battles?.[battleIndex - 1] || null;
        if (!battle) return Math.max(1, defaultWavesPerBattle * defaultHordesPerWave);
        let total = 0;
        (battle.waves || []).forEach((w) => { total += (w.hordes || []).length; });
        return Math.max(1, total);
      };

      const battleTotals = [];
      let totalUnits = 0;
      for (let battleIndex = 1; battleIndex <= battlesPerTown; battleIndex += 1) {
        const battleTotal = getBattleHordeCount(battleIndex);
        battleTotals.push(battleTotal);
        totalUnits += battleTotal;
      }

      const currentBattlefield = Math.max(
        1,
        Math.min(
          battlesPerTown,
          Number.isFinite(levelStatus.battlefieldNum) ? levelStatus.battlefieldNum : 1,
        ),
      );
      // Use current horde position directly for stable per-battle progress.
      // This avoids transition-frame bleed where `finalWaveCleared` from the
      // previous battlefield can temporarily overfill the next one.
      const currentHordeNumForProgress = Math.max(
        1,
        Math.floor(
          Number.isFinite(levelStatus.wave)
            ? levelStatus.wave
            : (Number.isFinite(levelStatus.hordeNum) ? levelStatus.hordeNum : 1),
        ),
      );
      const hordesCompletedInBattle = Math.max(0, currentHordeNumForProgress - 1);

      let progressUnits = 0;
      for (let i = 1; i < currentBattlefield; i += 1) {
        progressUnits += battleTotals[i - 1] || 0;
      }
      progressUnits += Math.min(getBattleHordeCount(currentBattlefield), hordesCompletedInBattle);



      if (totalUnits <= 0) totalUnits = 1;
      const progressRatio = Math.max(0, Math.min(1, progressUnits / totalUnits));

      const districtId = typeof window !== 'undefined' ? window.activeDistrictId : null;
      const mapData = typeof window !== 'undefined' ? window.BattlechurchMapData : null;
      const districts = mapData?.districts || [];
      const districtIndex = districts.findIndex((t) => t.id === districtId);
      const districtName = districts[districtIndex]?.name || "District";

      ctx.save();
      ctx.textAlign = 'left';
      ctx.fillStyle = PALETTE.softWhite;
      ctx.font = hudFont(HUD_FONTS.meterLabel);
      const districtRowY = panelY + 14;
      const battlefieldNum = Math.max(
        1,
        Math.floor(
          Number.isFinite(levelStatus.battlefieldNum) ? levelStatus.battlefieldNum : 1,
        ),
      );
      const waveNum = Math.max(
        1,
        Math.floor(
          Number.isFinite(levelStatus.waveNum)
            ? levelStatus.waveNum
            : (Number.isFinite(levelStatus.wave) ? levelStatus.wave : 1),
        ),
      );
      const hordeNum = Math.max(
        1,
        Math.floor(Number.isFinite(levelStatus.hordeNum) ? levelStatus.hordeNum : 1),
      );
      const inBossPhaseLabelMode =
        levelStatus.stage === "bossIntro" ||
        levelStatus.stage === "bossActive" ||
        (levelStatus.stage === "graceRush" && Number.isFinite(levelStatus.bossPhase) && levelStatus.bossPhase > 0);
      let districtProgressText = `${battlefieldNum}.${waveNum}.${hordeNum}`;
      if (inBossPhaseLabelMode) {
        const bossPhase = Math.max(1, Math.min(3, Math.floor(Number(levelStatus.bossPhase) || 1)));
        const bossBattlefieldNum = Math.max(1, battlefieldNum + 1);
        districtProgressText = `${bossBattlefieldNum}.${bossPhase}`;
      }
      const districtLabelText = `${districtName} [${districtProgressText}]`;
      drawOutlinedText(
        ctx,
        districtLabelText,
        x,
        districtRowY,
        hudFont(HUD_FONTS.topLabel),
        "left",
        PALETTE.softWhite,
      );
      if (typeof window !== "undefined") {
        window.__comboFeedFixedX = x + width;
        // Keep combo callout directly under the district progress meter.
        window.__comboFeedFixedY = panelY + 26 + 18 + 17;
      }
      const districtLabelWidth = ctx.measureText(districtLabelText).width || 0;
      const churchPowerupOptions =
        typeof window !== 'undefined' && window.ChurchPowerups?.getOptions
          ? window.ChurchPowerups.getOptions()
          : [];
      const churchPowerupOrder = ['spreadGun', 'halo', 'spear', 'sentry'];
      const churchPowerupLevelsByKey = new Map();
      if (Array.isArray(churchPowerupOptions)) {
        churchPowerupOptions.forEach((option) => {
          if (!option || !option.key) return;
          churchPowerupLevelsByKey.set(option.key, Math.max(0, Math.floor(Number(option.level) || 0)));
        });
      }
      const churchUpgradeEntries = churchPowerupOrder
        .map((key) => ({
          key,
          level: churchPowerupLevelsByKey.get(key) || 0,
          icon:
            assets?.churchPowerups?.[key]?.iconImage ||
            scoreboardIcons.congregation ||
            null,
        }))
        .filter((entry) => entry.level > 0);
      if (churchUpgradeEntries.length) {
        const iconSize = 14;
        const gap = 4;
        const itemGap = 10;
        const textPadding = 2;
        ctx.font = hudFont(HUD_FONTS.chip, "600");
        let chipX = x + districtLabelWidth + 12;
        const chipMaxX = x + width;
        churchUpgradeEntries.forEach((entry) => {
          const levelText = `${entry.level}`;
          const levelTextWidth = ctx.measureText(levelText).width || 0;
          const itemWidth =
            (entry.icon && entry.icon.complete ? iconSize + gap : 0) + levelTextWidth + textPadding;
          if (chipX + itemWidth > chipMaxX) return;
          if (entry.icon && entry.icon.complete) {
            ctx.drawImage(entry.icon, chipX, districtRowY - iconSize / 2 - 5, iconSize, iconSize);
            chipX += iconSize + gap;
          }
          ctx.fillText(levelText, chipX, districtRowY);
          chipX += levelTextWidth + itemGap;
        });
      }
      ctx.restore();

      const meterX = x;
      const meterY = panelY + 26;
      const meterWidth = Math.max(60, columnWidth - 12);
      const meterHeight = 18;
      const meterRadius = 6;
      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = PALETTE.hpBarBg || 'rgba(10,15,31,0.6)';
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(0,0,0,0)';
      roundRect(ctx, meterX, meterY, meterWidth, meterHeight, meterRadius, true, true);
      const innerX = meterX + 2;
      const innerY = meterY + 1;
      const innerW = meterWidth - 4;
      const innerH = meterHeight - 2;
      const now = performance.now() * 0.001;
      const dt = districtProgressSpark.lastTime ? Math.min(0.1, Math.max(0, now - districtProgressSpark.lastTime)) : 0;
      districtProgressSpark.lastTime = now;
      if (progressRatio > districtProgressSpark.lastRatio + 0.002) {
        districtProgressSpark.timer = 0.45;
      }
      districtProgressSpark.lastRatio = progressRatio;
      const fillW = Math.floor(innerW * progressRatio);
      const battleColors = [PALETTE.ice, PALETTE.gold, PALETTE.teal];
      const span1 = Math.floor(innerW * (battleTotals[0] / totalUnits));
      const span2 = Math.floor(innerW * (battleTotals[1] / totalUnits));
      const span3 = Math.max(0, innerW - span1 - span2);
      const seg1Start = innerX;
      const seg1Width = span1;
      const seg2Start = innerX + span1;
      const seg2Width = span2;
      const seg3Start = innerX + span1 + span2;
      const seg3Width = span3;

      const segWidths = [seg1Width, seg2Width, seg3Width];
      const segStarts = [seg1Start, seg2Start, seg3Start];
      let remaining = fillW;
      for (let i = 0; i < segStarts.length; i += 1) {
        const battlefieldDone = (i + 1) < currentBattlefield;
        const drawW = battlefieldDone ? segWidths[i] : Math.min(segWidths[i], remaining);
        if (drawW > 0) {
          ctx.fillStyle = battleColors[i] || battleColors[battleColors.length - 1];
          if (i === 0) {
            roundRect(ctx, segStarts[i], innerY, drawW, innerH, Math.max(2, meterRadius - 2), true, false);
          } else if (i === segStarts.length - 1 && drawW === segWidths[i]) {
            roundRect(ctx, segStarts[i], innerY, drawW, innerH, Math.max(2, meterRadius - 2), true, false);
          } else {
            ctx.fillRect(segStarts[i], innerY, drawW, innerH);
          }
          applyMeterGloss(segStarts[i], innerY, drawW, innerH);
        }
        remaining -= drawW;
      }

      ctx.save();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = PALETTE.ice;
      const strokeSegment = (sx, w, { leftRound = false, rightRound = false } = {}) => {
        const r = meterRadius;
        ctx.beginPath();
        ctx.moveTo(sx + (leftRound ? r : 0), meterY);
        ctx.lineTo(sx + w - (rightRound ? r : 0), meterY);
        if (rightRound) {
          ctx.quadraticCurveTo(sx + w, meterY, sx + w, meterY + r);
        } else {
          ctx.lineTo(sx + w, meterY);
          ctx.lineTo(sx + w, meterY + r);
        }
        ctx.lineTo(sx + w, meterY + meterHeight - (rightRound ? r : 0));
        if (rightRound) {
          ctx.quadraticCurveTo(sx + w, meterY + meterHeight, sx + w - r, meterY + meterHeight);
        } else {
          ctx.lineTo(sx + w, meterY + meterHeight);
          ctx.lineTo(sx + w - r, meterY + meterHeight);
        }
        ctx.lineTo(sx + (leftRound ? r : 0), meterY + meterHeight);
        if (leftRound) {
          ctx.quadraticCurveTo(sx, meterY + meterHeight, sx, meterY + meterHeight - r);
        } else {
          ctx.lineTo(sx, meterY + meterHeight);
          ctx.lineTo(sx, meterY + meterHeight - r);
        }
        ctx.lineTo(sx, meterY + r);
        if (leftRound) {
          ctx.quadraticCurveTo(sx, meterY, sx + r, meterY);
        } else {
          ctx.lineTo(sx, meterY);
          ctx.lineTo(sx + r, meterY);
        }
        ctx.stroke();
      };
      strokeSegment(seg1Start, seg1Width, { leftRound: true, rightRound: false });
      strokeSegment(seg2Start, seg2Width, { leftRound: false, rightRound: false });
      strokeSegment(seg3Start, seg3Width, { leftRound: false, rightRound: true });
      ctx.restore();

      ctx.save();
      ctx.fillStyle = PALETTE.softWhite;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const activeWaveNum = levelStatus.waveNum || levelStatus.wave || 1;
      for (let i = 0; i < battleTotals.length; i += 1) {
        const segStart = segStarts[i];
        const segEnd = segStart + segWidths[i];
        const centerX = (segStart + segEnd) / 2;
        const isActiveBattle = (i + 1) === currentBattlefield;
        const label = isActiveBattle ? `Wave ${activeWaveNum}` : `Battlefield ${i + 1}`;
        const maxLabelWidth = Math.max(26, segWidths[i] - 8);
        const fontSize = fitFontSize(label, HUD_FONTS.districtMeterLabel, maxLabelWidth, "");
        ctx.font = `${fontSize}px ${UI_FONT_FAMILY}`;
        ctx.fillText(label, centerX, innerY + innerH / 2 + 0.5);
      }
      ctx.restore();

      if (districtProgressSpark.timer > 0 && fillW > 0) {
        districtProgressSpark.timer = Math.max(0, districtProgressSpark.timer - dt);
        const sparkAlpha = Math.min(1, districtProgressSpark.timer / 0.45);
        const sparkX = innerX + fillW;
        const sparkY = meterY + 2;
        const sparkW = 10;
        const sparkH = meterHeight - 4;
        const gradient = ctx.createLinearGradient(sparkX - sparkW, 0, sparkX, 0);
        gradient.addColorStop(0, "rgba(255, 220, 140, 0)");
        gradient.addColorStop(1, `rgba(255, 225, 180, ${1.25 * sparkAlpha})`);
        ctx.save();
        ctx.globalAlpha = sparkAlpha;
        ctx.fillStyle = gradient;
        ctx.fillRect(sparkX - sparkW, sparkY, sparkW, sparkH);
        ctx.restore();
      }

      const Animator = typeof window !== 'undefined' ? window.Entities?.Animator : null;
      const miniImpClips = assets?.enemies?.miniImp || null;
      const demonLordClips = assets?.enemies?.miniDemonLord || null;
      if (Animator && miniImpClips) {
        const ensureDistrictMeterAnimator = (key, clips) => {
          if (!clips) return null;
          if (
            !districtProgressAnim.animators[key]
            || districtProgressAnim.clipKeys[key] !== clips
          ) {
            const animator = new Animator(clips, 1.8);
            animator.play("walk", { restart: true, loop: true });
            districtProgressAnim.animators[key] = animator;
            districtProgressAnim.clipKeys[key] = clips;
            districtProgressAnim.lastTime = 0;
          }
          return districtProgressAnim.animators[key] || null;
        };
        const bossAnimator = ensureDistrictMeterAnimator("segment3", demonLordClips || miniImpClips);
        const now = performance.now();
        const dt = districtProgressAnim.lastTime ? Math.min(0.05, Math.max(0, (now - districtProgressAnim.lastTime) / 1000)) : 0;
        districtProgressAnim.lastTime = now;
        if (bossAnimator) {
          bossAnimator.update(dt);
          const bossCenterX = seg3Start + seg3Width - 10;
          const iconY = innerY + innerH / 2 - 15;
          bossAnimator.draw(ctx, bossCenterX, iconY, { alpha: 0.95, flipX: true });
        }

        const drawPastorPaperdoll = typeof window !== "undefined" ? window.Entities?.drawPastorPaperdoll : null;
        if (drawPastorPaperdoll && player) {
          // Reserve a tiny right-edge zone for the boss icon so the player icon
          // ends beside it at full town completion instead of overlapping it.
          const BOSS_ICON_RESERVED_ZONE_PX = 20;
          const pastorMaxX = innerX + innerW - BOSS_ICON_RESERVED_ZONE_PX;
          const pastorMinX = innerX + 2;
          const pastorX = Math.max(pastorMinX, Math.min(innerX + fillW, pastorMaxX));
          const pastorY = innerY + innerH / 2;
          const savedFacing = player.facing;
          const savedAttackFacing = player._paperdollAttackFacing;
          const savedLastMoveFacing = player._paperdollLastMoveFacing;
          player.facing = "right";
          player._paperdollAttackFacing = null;
          player._paperdollLastMoveFacing = "right";
          ctx.save();
          ctx.translate(pastorX, pastorY);
          ctx.scale(0.35, 0.35);
          ctx.globalAlpha = 0.95;
          drawPastorPaperdoll(player, ctx, 0, 0);
          ctx.restore();
          player.facing = savedFacing;
          player._paperdollAttackFacing = savedAttackFacing;
          player._paperdollLastMoveFacing = savedLastMoveFacing;
        }
      }

      ctx.restore();
    };

    const drawDevArenaMoveReference = () => {
      // FONT MAP (DEV arena panel):
      // 15px / 11px / 12px = row labels and values.
      // 700 15px = section title emphasis.
      // 700 11px = back button label.
      if (typeof window === "undefined" || window.__battlechurchDevMeleeArenaMode !== true) return;
      const ref = window.__devArenaDamageReference || {};
      const mod = ref.modifiers || {};
      const panelWidth = 240;
      const panelX = 14;
      const panelY = hudHeight + 14;
      const rowHeight = 18;
      const sectionGap = 10;

      // { label, input, value } — null value shows '--', undefined hides the value column entirely
      // { section: "Title" } — section header with divider
      const rows = [
        { section: "Basic" },
        { label: "Autoaim Projectiles", input: null,       value: undefined },
        { label: "Slash",            input: "A",        value: ref.melee },
        { label: "Dash",             input: "B",        value: null },
        { label: "Pray",              input: "C",        value: undefined },

        { section: "Slash Specials" },
        { label: "Blast",               input: "A Charge", value: ref.divineShot },
        { label: "Cleave",              input: "A/B",      value: ref.cleave },
        { label: "Reap",                input: "C/A",      value: ref.spinAttack },
        { label: "Thrash",              input: "Charge B+A", value: ref.blitz },
        { label: "Hedge",               input: "Charge A+C", value: null },

        { section: "Dash" },
        { label: "Crash",               input: "B Charge", value: 100 },
        { label: "Smash",               input: "B/A",      value: ref.rushAttack },
        { label: "Clash",               input: "C/B",      value: 250 },
        { label: "Trash",               input: "Charge B+C", value: null },

        { section: "Prayer" },
        { label: "Unity Strike",        input: "C",        value: null },
        { label: "Pastor Protect",      input: "CC",       value: null },
        { label: "Smite Bomb",          input: "C Charge", value: null },

        { section: "Combos" },
        { label: "Normals and specials chain", input: null, value: undefined },

        { section: "Modifiers" },
        { label: "Counter Attack (CA)", input: null, value: Number.isFinite(mod.counterHit) ? `×${mod.counterHit.toFixed(2)}` : null, isText: true },
        { label: "Punish Counter (PC)", input: null, value: Number.isFinite(mod.punishCounter) ? `×${mod.punishCounter.toFixed(2)}` : null, isText: true },

        
      ];

      // Calculate height
      let totalHeight = 32; // title block
      rows.forEach((row) => {
        if (row.section) totalHeight += sectionGap + 18;
        else totalHeight += rowHeight;
      });
      totalHeight += 10;

      ctx.save();
      ctx.globalAlpha = 0.94;
      ctx.fillStyle = 'rgba(10,15,31,0.82)';
      ctx.strokeStyle = 'rgba(155,217,255,0.7)';
      ctx.lineWidth = 2;
      roundRect(ctx, panelX, panelY, panelWidth, totalHeight, 10, true, true);
      ctx.globalAlpha = 1;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      // Title
      ctx.fillStyle = PALETTE.softWhite;
      ctx.font = hudFont(HUD_FONTS.devTitle, "700");
      ctx.fillText('Moves List', panelX + 14, panelY + 12);

      let rowY = panelY + 32;

      rows.forEach((row) => {
        if (row.section) {
          rowY += sectionGap;
          // Section divider line
          ctx.strokeStyle = 'rgba(155,217,255,0.18)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(panelX + 14, rowY);
          ctx.lineTo(panelX + panelWidth - 14, rowY);
          ctx.stroke();
          rowY += 4;
          // Section label
          ctx.fillStyle = 'rgba(155,217,255,0.9)';
          ctx.font = hudFont(HUD_FONTS.devMeta, "700");
          ctx.fillText(row.section.toUpperCase(), panelX + 14, rowY);
          rowY += 14;
          return;
        }

        // Three columns: label (left) | input (center-right) | damage (far right)
        const colDamageX = panelX + panelWidth - 16;  // damage right edge
        const colInputX  = colDamageX - 48;            // input right edge, leaving room for damage

        ctx.fillStyle = 'rgba(234,246,255,0.85)';
        ctx.font = hudFont(HUD_FONTS.devBody);
        ctx.fillText(row.label, panelX + 14, rowY);

        if (row.input) {
          ctx.fillStyle = 'rgba(155,217,255,0.7)';
          ctx.font = hudFont(HUD_FONTS.devMeta);
          ctx.textAlign = 'right';
          ctx.fillText(row.input, colInputX, rowY + 1);
          ctx.textAlign = 'left';
        }

        if (row.value !== undefined) {
          const display = row.isText
            ? (row.value || '--')
            : (Number.isFinite(row.value) ? String(row.value) : '--');
          ctx.textAlign = 'right';
          ctx.fillStyle = 'rgba(255,220,120,0.95)';
          ctx.font = hudFont(HUD_FONTS.gameplayComboSub, "700");
          ctx.fillText(display, colDamageX, rowY);
          ctx.textAlign = 'left';
        }

        rowY += rowHeight;
      });

      // Back to Title button
      const btnH = 22;
      const btnY = panelY + totalHeight + 6;
      const btnW = panelWidth;
      ctx.fillStyle = 'rgba(180,60,20,0.85)';
      roundRect(ctx, panelX, btnY, btnW, btnH, 7, true, false);
      ctx.fillStyle = PALETTE.gold;
      ctx.font = hudFont(HUD_FONTS.devMeta, "700");
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('← Back to Title', panelX + btnW / 2, btnY + btnH / 2);
      if (typeof window !== 'undefined') {
        window.__devArenaBackBtnRect = { x: panelX, y: btnY, w: btnW, h: btnH };
      }

      ctx.restore();
    };

    const drawDevArenaMoveFeed = () => {
      // FONT MAP (DEV arena live combo feed):
      // 700 10px = "LAST MOVE" / small tags.
      // 700 15px = emphasized move/combo lines.
      // 15px = per-hit detail lines.
      if (typeof window === "undefined" || window.__battlechurchDevMeleeArenaMode !== true) return;

      const COMBO_LIFETIME_MS = 15000;
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();

      const allCombos = Array.isArray(window.__devArenaConfirmedCombos)
        ? window.__devArenaConfirmedCombos
        : [];
      // Latest 2 combos that are still within their 15s lifetime
      const liveCombos = allCombos
        .filter((c) => Number.isFinite(c.recordedAt) && (now - c.recordedAt) < COMBO_LIFETIME_MS)
        .slice(-2)
        .reverse();

      const textX = canvas.width - 12;
      const lineHeight = 18;
      let rowY = hudHeight + 14;

      ctx.save();
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';

      // Last Move (persistent)
      const latestHit = window.__devArenaLastMeleeHit || null;
      if (latestHit) {
        const latestMove = String(latestHit?.move || "Move");
        const latestBase = Math.max(0, Math.round(Number(latestHit?.baseDamage) || 0));
        const latestBonus = Math.max(0, Math.round(Number(latestHit?.bonusDamage) || 0));
        const latestTag = latestHit?.isPunishCounter ? "PC" : latestHit?.isCounterHit ? "CA" : "";
        const tagSuffix = latestTag && latestBonus > 0 ? ` (+${latestBonus}${latestTag})` : "";

        ctx.fillStyle = 'rgba(155,217,255,0.7)';
        ctx.font = hudFont(HUD_FONTS.comboTag, "700");
        ctx.fillText('LAST MOVE', textX, rowY);
        rowY += 14;
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.font = hudFont(HUD_FONTS.comboBig, "700");
        ctx.fillText(`${latestMove}: ${latestBase}${tagSuffix}`, textX, rowY);
        rowY += lineHeight + 8;
      }

      // Latest 2 combos with 15s lifetime fade
      liveCombos.forEach((combo) => {
        const age = now - (combo.recordedAt || now);
        const fadeStart = COMBO_LIFETIME_MS * 0.7;
        const alpha = age > fadeStart
          ? Math.max(0, 1 - (age - fadeStart) / (COMBO_LIFETIME_MS - fadeStart))
          : 1;

        const rawDetails = Array.isArray(combo?.details) ? combo.details : [];
        const hits = Math.max(2, Math.floor(Number(combo?.hits) || 2), rawDetails.length);
        const details = rawDetails.slice(0, hits).reverse();
        const totalDamage = Math.max(0, Math.round(Number(combo?.totalDamage) || 0));
        const tagParts = [];
        if (combo?.hasPunishCounter) tagParts.push("PC");
        else if (combo?.hasCounterHit) tagParts.push("CA");
        const tagSuffix = tagParts.length ? ` [${tagParts.join("+")}]` : "";

        ctx.globalAlpha = alpha;
        const enemyLabel = combo.enemyName ? ` · ${combo.enemyName}` : "";
        ctx.fillStyle = 'rgba(255,200,106,0.92)';
        ctx.font = hudFont(HUD_FONTS.devMeta, "700");
        ctx.fillText(`COMBO ${hits}  —  ${totalDamage}${tagSuffix}${enemyLabel}`, textX, rowY);
        rowY += lineHeight;

        details.forEach((entry) => {
          const moveName = String(entry?.move || "Move");
          const entryBase = Math.max(0, Math.round(Number(entry?.baseDamage) || 0));
          const entryBonus = Math.max(0, Math.round(Number(entry?.bonusDamage) || 0));
          const entryTag = entry?.isPunishCounter ? "PC" : entry?.isCounterHit ? "CA" : "";
          const entryTagSuffix = entryTag && entryBonus > 0 ? ` (+${entryBonus}${entryTag})` : "";
          ctx.fillStyle = 'rgba(234,246,255,0.88)';
          ctx.font = hudFont(HUD_FONTS.devBody);
          ctx.fillText(`  ${moveName}: ${entryBase}${entryTagSuffix}`, textX, rowY);
          rowY += lineHeight;
        });

        ctx.globalAlpha = 1;
        rowY += 6;
      });

      ctx.restore();
    };

    const drawDevArenaBestCombo = () => {
      // FONT MAP (DEV arena best combo panel):
      // 700 10px = "BEST COMBO" label.
      // 700 15px = combo headline.
      // 15px = per-hit detail lines.
      if (typeof window === "undefined" || window.__battlechurchDevMeleeArenaMode !== true) return;
      const best = window.__devArenaBestCombo || null;
      if (!best || !best.hits || best.hits < 2) return;

      const rawDetails = Array.isArray(best.details) ? best.details : [];
      const hits = Math.max(2, Math.floor(Number(best.hits) || 2), rawDetails.length);
      const details = rawDetails.slice(0, hits).reverse();
      const totalDamage = Math.max(0, Math.round(Number(best.totalDamage) || 0));
      const tagParts = [];
      if (best.hasPunishCounter) tagParts.push("PC");
      else if (best.hasCounterHit) tagParts.push("CA");
      const tagSuffix = tagParts.length ? ` [${tagParts.join("+")}]` : "";

      const lineHeight = 18;
      const textX = canvas.width - 12;
      const labelH = 14 + lineHeight + details.length * lineHeight + 6;
      let rowY = canvas.height - labelH - 12;

      ctx.save();
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';

      ctx.fillStyle = 'rgba(255,220,80,0.6)';
      ctx.font = hudFont(HUD_FONTS.comboTag, "700");
      ctx.fillText('BEST COMBO', textX, rowY);
      rowY += 14;

      ctx.fillStyle = 'rgba(255,200,106,0.95)';
      ctx.font = hudFont(HUD_FONTS.comboBig, "700");
      ctx.fillText(`COMBO ${hits}  —  ${totalDamage}${tagSuffix}`, textX, rowY);
      rowY += lineHeight;

      details.forEach((entry) => {
        const moveName = String(entry?.move || "Move");
        const entryBase = Math.max(0, Math.round(Number(entry?.baseDamage) || 0));
        const entryBonus = Math.max(0, Math.round(Number(entry?.bonusDamage) || 0));
        const entryTag = entry?.isPunishCounter ? "PC" : entry?.isCounterHit ? "CA" : "";
        const entryTagSuffix = entryTag && entryBonus > 0 ? ` (+${entryBonus}${entryTag})` : "";
        ctx.fillStyle = 'rgba(234,246,255,0.88)';
        ctx.font = hudFont(HUD_FONTS.devBody);
        ctx.fillText(`  ${moveName}: ${entryBase}${entryTagSuffix}`, textX, rowY);
        rowY += lineHeight;
      });

      ctx.restore();
    };

    const drawGameplayComboFeed = () => {
      // FONT MAP (live gameplay combo callout):
      // 800 24px (chainSize) = main "Hit Combo [damage]" line.
      // 700 12px = optional subtext ("Counter Attack"/"Punish Counter").
      if (typeof window === "undefined" || window.__battlechurchDevMeleeArenaMode === true) return;
      const combos = Array.isArray(window.__hudConfirmedCombos)
        ? window.__hudConfirmedCombos
        : [];
      if (!combos.length) return;
      const COMBO_LIFETIME_MS = 3800;
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      const textX = Number.isFinite(window.__comboFeedFixedX) ? window.__comboFeedFixedX : (canvas.width - 12);
      const textY = Number.isFinite(window.__comboFeedFixedY) ? window.__comboFeedFixedY : (hudHeight + 34);
      const chainSize = 24;
      const chainColor = window.__hudComboDisplay?.color || PALETTE.softWhite;
      const rowHeight = chainSize + 18;
      const fadeStart = COMBO_LIFETIME_MS * 0.55;
      const liveCombos = combos
        .filter((entry) => Number.isFinite(entry?.recordedAt) && (now - entry.recordedAt) < COMBO_LIFETIME_MS)
        .sort((a, b) => {
          const hitDiff = (Number(b?.hits) || 0) - (Number(a?.hits) || 0);
          if (hitDiff !== 0) return hitDiff;
          return (Number(b?.recordedAt) || 0) - (Number(a?.recordedAt) || 0);
        })
        .slice(0, 3);
      if (!liveCombos.length) return;
      window.__hudConfirmedCombos = liveCombos;

      ctx.save();
      ctx.textAlign = "right";
      ctx.textBaseline = "top";
      liveCombos.forEach((combo, idx) => {
        const age = now - combo.recordedAt;
        const alpha = age > fadeStart
          ? Math.max(0, 1 - (age - fadeStart) / (COMBO_LIFETIME_MS - fadeStart))
          : 1;
        const hits = Math.max(2, Math.floor(Number(combo.hits) || 2));
        const totalDamage = Math.max(0, Math.round(Number(combo.totalDamage) || 0));
        const lineY = textY + idx * rowHeight;
        const text = `${hits} Hit Combo [${totalDamage}]`;
        const subtext = combo.hasPunishCounter
          ? "Punish Counter"
          : (combo.hasCounterHit ? "Counter Attack" : "");

        ctx.globalAlpha = alpha;
        ctx.fillStyle = chainColor;
        ctx.font = `800 ${chainSize}px ${UI_FONT_FAMILY}`;
        ctx.fillText(text, textX, lineY);
        if (subtext) {
          ctx.fillStyle = "rgba(234,246,255,0.78)";
          ctx.font = hudFont(HUD_FONTS.gameplayComboSub, "700");
          ctx.fillText(subtext, textX, lineY + chainSize + 2);
        }
      });
      ctx.restore();
    };

    const drawPickupAnnouncement = () => {
      if (typeof window === "undefined") return;
      if (window.__battlechurchDevMeleeArenaMode === true) return;

      // Draw on a separate overlay canvas so it appears above DOM elements (e.g. Back to Editor panel).
      const overlayCanvas = ensurePickupOverlayCanvas(canvas);
      const octx = overlayCanvas ? overlayCanvas.getContext("2d") : null;
      if (!octx) return;
      octx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

      const ann = weaponPickupAnnouncement;
      if (!ann || !ann.timer || ann.timer <= 0) return;

      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      const duration = (ann.duration || 4) * 1000;
      const elapsed = duration - ann.timer * 1000;
      const remaining = ann.timer * 1000;
      const fadeInMs = 120;
      const fadeOutMs = 300;

      let alpha;
      if (elapsed < fadeInMs) {
        alpha = Math.min(1, elapsed / fadeInMs);
      } else if (remaining < fadeOutMs) {
        alpha = Math.max(0, remaining / fadeOutMs);
      } else {
        alpha = 1;
      }
      if (alpha <= 0) return;

      const popInMs = 110;
      const settleMs = 170;
      const popTotalMs = popInMs + settleMs;
      let popScale = 1;
      if (elapsed < popTotalMs) {
        if (elapsed <= popInMs) {
          const t = Math.max(0, Math.min(1, elapsed / popInMs));
          popScale = 0.9 + (1.12 - 0.9) * t;
        } else {
          const t = Math.max(0, Math.min(1, (elapsed - popInMs) / settleMs));
          popScale = 1.12 + (1 - 1.12) * t;
        }
      }

      // Resolve typography from canvasSemanticUsage
      const semUsage = (typeof UIStyles !== "undefined" && UIStyles.typography?.canvasSemanticUsage?.pickupAnnouncement) || {};
      const semTokens = (typeof UIStyles !== "undefined" && UIStyles.typography?.canvasSemantic) || {};
      const titleToken = semTokens[semUsage.title] || semTokens.eyebrow || { size: 20, weight: 600 };
      const descToken = semTokens[semUsage.description] || semTokens.caption || { size: 20, weight: 500 };

      const PAD = 12;
      const ICON_SIZE = 36;
      const ICON_RIGHT_GAP = 10;

      octx.save();
      octx.font = hudFont(titleToken.size, String(titleToken.weight || "600"));
      const titleW = octx.measureText(ann.title || "").width;
      octx.font = hudFont(descToken.size, String(descToken.weight || "500"));
      const descW = octx.measureText(ann.description || "").width;
      const contentW = Math.max(titleW, descW, 120);
      const finalPanelW = PAD + ICON_SIZE + ICON_RIGHT_GAP + contentW + PAD;

      const titleLineH = titleToken.size * (titleToken.lineHeight || 1.15);
      const descLineH = descToken.size * (descToken.lineHeight || 1.25);
      const textH = titleLineH + 4 + descLineH;
      const panelH = Math.max(ICON_SIZE + PAD * 2, PAD * 2 + textH);

      const panelRight = overlayCanvas.width - 16;
      const panelBottom = overlayCanvas.height - 16;
      const panelX = panelRight - finalPanelW;
      const panelY = panelBottom - panelH;
      const panelCx = panelX + finalPanelW / 2;
      const panelCy = panelY + panelH / 2;

      octx.save();
      octx.translate(panelCx, panelCy);
      octx.scale(popScale, popScale);
      octx.translate(-panelCx, -panelCy);

      // Background
      octx.globalAlpha = alpha * 0.95;
      octx.fillStyle = "rgba(28, 10, 5, 0.88)";
      octx.shadowColor = "rgba(255, 160, 40, 0.35)";
      octx.shadowBlur = 10;
      roundRect(octx, panelX, panelY, finalPanelW, panelH, 8, true, false);

      // Border
      const pulseSpeed = 0.005;
      const stylePulse = 0.55 + 0.45 * Math.sin(now * pulseSpeed);
      octx.strokeStyle = ann.color
        ? ann.color
        : `rgba(255, ${Math.round(175 + 25 * stylePulse)}, ${Math.round(60 + 20 * stylePulse)}, ${0.7 + 0.25 * stylePulse})`;
      octx.lineWidth = 1.5;
      octx.shadowColor = "rgba(255, 160, 40, 0.3)";
      octx.shadowBlur = 6;
      roundRect(octx, panelX, panelY, finalPanelW, panelH, 8, false, true);
      octx.shadowBlur = 0;

      // Icon
      const iconX = panelX + PAD;
      const iconY = panelY + (panelH - ICON_SIZE) / 2;
      const iconImg = getPickupAnnouncementIcon(ann.iconSrc);
      octx.globalAlpha = alpha;
      if (iconImg && iconImg.complete && iconImg.naturalWidth > 0) {
        octx.drawImage(iconImg, iconX, iconY, ICON_SIZE, ICON_SIZE);
      } else {
        octx.fillStyle = "rgba(255,255,255,0.15)";
        roundRect(octx, iconX, iconY, ICON_SIZE, ICON_SIZE, 4, true, false);
      }

      // Text
      const textX = iconX + ICON_SIZE + ICON_RIGHT_GAP;
      const textTop = panelY + (panelH - textH) / 2;

      octx.textAlign = "left";
      octx.textBaseline = "top";

      octx.font = hudFont(titleToken.size, String(titleToken.weight || "600"));
      octx.shadowColor = "rgba(20, 6, 4, 0.92)";
      octx.shadowBlur = 4;
      octx.fillStyle = PALETTE.gold || "#DDA677";
      octx.fillText(ann.title || "", textX, textTop);

      octx.font = hudFont(descToken.size, String(descToken.weight || "500"));
      octx.shadowBlur = 3;
      octx.fillStyle = (typeof UIStyles !== "undefined" && UIStyles.colors?.softWhite) || "#DFDFC4";
      octx.fillText(ann.description || "", textX, textTop + titleLineH + 4);

      octx.shadowBlur = 0;
      octx.restore();
      octx.restore();
    };

    const drawMoveAnnouncementBanner = () => {
      // FONT MAP (move announcement banner):
      // 800 36px = move name title.
      // 800/700 16px = button token glyphs and separators.
      // 600 14px / italic 14px = denominator line and "Charge" token.
      if (typeof window === "undefined") return;
      if (window.__battlechurchDevMeleeArenaMode === true) return;
      const banner = window.__moveAnnouncementBanner;
      if (!banner || !banner.moveName || !Array.isArray(banner.tokens)) return;
      const isCMove = banner.tokens.some((tok) => tok?.type === "btn" && String(tok.label || "").toUpperCase() === "C");
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      const elapsed = now - (banner.shownAt || now);
      const duration = banner.duration || 2000;
      const fadeOutMs = 300;
      if (elapsed >= duration + fadeOutMs) {
        window.__moveAnnouncementBanner = null;
        return;
      }

      const alpha = elapsed < duration
        ? Math.min(1, elapsed / 120)
        : Math.max(0, 1 - (elapsed - duration) / fadeOutMs);
      if (alpha <= 0) return;

      // Stream readability: quick pop-in (overscale) then snap back.
      const popInMs = isCMove ? 140 : 110;
      const settleMs = isCMove ? 220 : 170;
      const popTotalMs = popInMs + settleMs;
      let popScale = 1;
      if (elapsed < popTotalMs) {
        if (elapsed <= popInMs) {
          const t = Math.max(0, Math.min(1, elapsed / popInMs));
          popScale = isCMove
            ? 0.9 + (1.33 - 0.9) * t
            : 0.9 + (1.24 - 0.9) * t; // punchy grow
        } else {
          const t = Math.max(0, Math.min(1, (elapsed - popInMs) / settleMs));
          popScale = isCMove
            ? 1.33 + (1 - 1.33) * t
            : 1.24 + (1 - 1.24) * t; // snap/settle
        }
      }
      const burst = Math.max(0, 1 - elapsed / (isCMove ? 320 : 220));

      // Shared anchor: persistent A/B/C row sits above this panel.
      const comboFeedX = Number.isFinite(window.__comboFeedFixedX) ? window.__comboFeedFixedX : (canvas.width - 12);
      const comboFeedY = Number.isFinite(window.__comboFeedFixedY) ? window.__comboFeedFixedY : (hudHeight + 34);
      const liveCombos = Array.isArray(window.__hudConfirmedCombos) ? window.__hudConfirmedCombos : [];
      const COMBO_LIFETIME_MS = 3800;
      const liveComboCount = liveCombos.filter(
        (c) => Number.isFinite(c?.recordedAt) && (now - c.recordedAt) < COMBO_LIFETIME_MS,
      ).length;
      const comboFeedHeight = liveComboCount > 0 ? liveComboCount * (24 + 18) : 0;
      const anchorTopY = liveComboCount > 0
        ? (comboFeedY + comboFeedHeight + 8)
        : (hudHeight + 4);
      const inputRowButtonSize = 22;
      const inputRowGapBelow = 12;
      const panelTopY = anchorTopY + inputRowButtonSize + inputRowGapBelow;

      // Measure tokens to compute panel width
      const PILL_W = 30;
      const PILL_H = 30;
      const SEP_W = 20;
      const PREFIX_W = 62;
      const PAD_X = 14;
      const PAD_Y = 12;
      const LINE_GAP = 8;

      ctx.save();
      ctx.font = hudFont(isCMove ? Math.round(HUD_FONTS.bannerTitle * 1.16) : HUD_FONTS.bannerTitle, "800");
      const nameW = ctx.measureText(banner.moveName.toUpperCase()).width;

      let tokenRowW = 0;
      banner.tokens.forEach((tok) => {
        if (tok.type === "btn") tokenRowW += PILL_W;
        else if (tok.type === "seq" || tok.type === "sim") tokenRowW += SEP_W;
        else if (tok.type === "chg") tokenRowW += PREFIX_W;
      });

      const activeClass = window.BattlechurchClasses?.getActive?.();
      const moveMult = activeClass?.tuning?.player?.moves?.[banner.moveName];
      const hasMoveMult = typeof moveMult === "number" && moveMult !== 1.0;
      const denomLabel = activeClass?.classTitle || "";
      const multPct = hasMoveMult ? Math.round((moveMult - 1) * 100) : 0;
      const multSign = multPct >= 0 ? "+" : "";
      const denomLine = hasMoveMult ? `${denomLabel}: ${multSign}${multPct}%` : "";

      ctx.font = hudFont(HUD_FONTS.bannerSub, "600");
      const denomLineW = denomLine ? ctx.measureText(denomLine).width : 0;

      const innerW = Math.max(nameW, tokenRowW, denomLineW);
      const panelW = innerW + PAD_X * 2;
      const nameLineH = 38;
      const tokenLineH = PILL_H;
      const denomLineH = denomLine ? 18 : 0;
      const denomLineGap = denomLine ? 7 : 0;
      const panelH = PAD_Y + nameLineH + LINE_GAP + tokenLineH + denomLineGap + denomLineH + PAD_Y;

      const panelRight = comboFeedX;
      const panelX = panelRight - panelW;
      const panelY = panelTopY;
      const panelCx = panelX + panelW / 2;
      const panelCy = panelY + panelH / 2;

      // Background + border
      ctx.save();
      ctx.translate(panelCx, panelCy);
      ctx.scale(popScale, popScale);
      ctx.translate(-panelCx, -panelCy);

      ctx.globalAlpha = alpha * 0.95;
      ctx.fillStyle = "rgba(28, 10, 5, 0.88)";
      ctx.shadowColor = isCMove ? "rgba(255, 210, 95, 0.72)" : "rgba(255, 160, 40, 0.45)";
      ctx.shadowBlur = isCMove ? 16 : 10;
      roundRect(ctx, panelX, panelY, panelW, panelH, 8, true, false);

      if (burst > 0) {
        ctx.globalAlpha = alpha * burst * (isCMove ? 0.78 : 0.52);
        ctx.strokeStyle = isCMove ? "rgba(255, 245, 190, 0.98)" : "rgba(255, 220, 140, 0.95)";
        ctx.lineWidth = (isCMove ? 3 : 2) + burst * (isCMove ? 3 : 2);
        roundRect(
          ctx,
          panelX - (8 * burst),
          panelY - (6 * burst),
          panelW + (16 * burst),
          panelH + (12 * burst),
          10,
          false,
          true,
        );
      }

      const pulseSpeed = 0.005;
      const stylePulse = 0.55 + 0.45 * Math.sin(now * pulseSpeed);
      ctx.strokeStyle = isCMove
        ? `rgba(255, ${Math.round(220 + 18 * stylePulse)}, ${Math.round(120 + 32 * stylePulse)}, ${0.9 + 0.1 * stylePulse})`
        : `rgba(255, ${Math.round(175 + 25 * stylePulse)}, ${Math.round(60 + 20 * stylePulse)}, ${0.7 + 0.25 * stylePulse})`;
      ctx.lineWidth = isCMove ? 2.4 : 1.5;
      ctx.shadowColor = isCMove ? "rgba(255, 210, 95, 0.55)" : "rgba(255, 160, 40, 0.3)";
      ctx.shadowBlur = isCMove ? 12 : 6;
      roundRect(ctx, panelX, panelY, panelW, panelH, 8, false, true);
      ctx.shadowBlur = 0;

      // Move name
      ctx.globalAlpha = alpha;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillStyle = isCMove ? "#FFE8A6" : PALETTE.gold;
      ctx.font = hudFont(isCMove ? Math.round(HUD_FONTS.bannerTitle * 1.16) : HUD_FONTS.bannerTitle, "800");
      ctx.shadowColor = "rgba(20, 6, 4, 0.92)";
      ctx.shadowBlur = isCMove ? 10 : 4;
      ctx.fillText(banner.moveName.toUpperCase(), panelX + PAD_X, panelY + PAD_Y);
      ctx.shadowBlur = 0;

      // Token row
      const tokenY = panelY + PAD_Y + nameLineH + LINE_GAP;
      const tokenCenterY = tokenY + PILL_H / 2;
      let tx = panelX + PAD_X;

      const buttonChargeStyles = {
        A: {
          fill: "rgba(88, 154, 186, 0.95)",
          stroke: "rgba(198, 232, 255, 0.95)",
          text: "#F2FCFF",
        },
        B: {
          fill: "rgba(85, 168, 144, 0.95)",
          stroke: "rgba(197, 248, 230, 0.95)",
          text: "#F2FFF9",
        },
        C: {
          fill: "rgba(206, 140, 79, 0.97)",
          stroke: "rgba(255, 236, 178, 0.98)",
          text: "#FFF8DF",
        },
      };

      banner.tokens.forEach((tok) => {
        if (tok.type === "btn") {
          const label = String(tok.label || "").toUpperCase();
          const style = buttonChargeStyles[label] || {
            fill: "rgba(160, 50, 15, 0.9)",
            stroke: "rgba(255, 190, 70, 0.85)",
            text: PALETTE.softWhite,
          };
          const cx = tx + PILL_W / 2;
          const cy = tokenCenterY;
          const radius = Math.min(PILL_W, PILL_H) * 0.5 - 1;
          // Circular token background (matches button identity, not move color).
          ctx.fillStyle = style.fill;
          ctx.strokeStyle = style.stroke;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          // Letter
          ctx.fillStyle = style.text;
          ctx.font = hudFont(HUD_FONTS.bannerBody, "800");
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(label, cx, tokenCenterY);
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          tx += PILL_W;
        } else if (tok.type === "seq") {
          ctx.fillStyle = "rgba(230, 210, 160, 0.75)";
          ctx.font = hudFont(HUD_FONTS.bannerBody, "700");
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("→", tx + SEP_W / 2, tokenCenterY + 1.2);
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          tx += SEP_W;
        } else if (tok.type === "sim") {
          ctx.fillStyle = "rgba(230, 210, 160, 0.75)";
          ctx.font = hudFont(HUD_FONTS.bannerBody, "700");
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("+", tx + SEP_W / 2, tokenCenterY);
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          tx += SEP_W;
        } else if (tok.type === "chg") {
          ctx.fillStyle = "rgba(220, 200, 140, 0.6)";
          ctx.font = hudFont(HUD_FONTS.bannerSub, "italic");
          ctx.textBaseline = "middle";
          ctx.fillText("Charge", tx, tokenCenterY);
          tx += ctx.measureText("Charge").width + 8;
          ctx.textBaseline = "top";
        }
      });

      if (denomLine) {
        const denomY = tokenY + tokenLineH + denomLineGap;
        ctx.globalAlpha = alpha * 0.72;
        ctx.font = hudFont(HUD_FONTS.bannerSub, "600");
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillStyle = multPct > 0 ? "#e8c87a" : "#b0c8e8";
        ctx.fillText(denomLine, panelX + PAD_X, denomY);
      }

      ctx.restore();
      ctx.restore();
    };

    const drawPersistentInputButtons = () => {
      if (typeof window === "undefined") return;
      if (window.__battlechurchDevMeleeArenaMode === true) return;
      const input = window.Input;
      if (!input) return;
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      const comboFeedX = Number.isFinite(window.__comboFeedFixedX) ? window.__comboFeedFixedX : (canvas.width - 12);
      const comboFeedY = Number.isFinite(window.__comboFeedFixedY) ? window.__comboFeedFixedY : (hudHeight + 34);
      const liveCombos = Array.isArray(window.__hudConfirmedCombos) ? window.__hudConfirmedCombos : [];
      const COMBO_LIFETIME_MS = 3800;
      const liveComboCount = liveCombos.filter(
        (c) => Number.isFinite(c?.recordedAt) && (now - c.recordedAt) < COMBO_LIFETIME_MS,
      ).length;
      const comboFeedHeight = liveComboCount > 0 ? liveComboCount * (24 + 18) : 0;
      const helperTopY = liveComboCount > 0
        ? (comboFeedY + comboFeedHeight + 8)
        : (hudHeight + 4);

      const labels = ["A", "B", "C"];
      const keyByLabel = { A: "ArrowLeft", B: "ArrowDown", C: "ArrowRight" };
      const pressedSet = input.keysPressed instanceof Set ? input.keysPressed : new Set();
      const buttonChargeStyles = {
        A: { fill: "rgba(88, 154, 186, 0.95)", stroke: "rgba(198, 232, 255, 0.95)", text: "#F2FCFF" },
        B: { fill: "rgba(85, 168, 144, 0.95)", stroke: "rgba(197, 248, 230, 0.95)", text: "#F2FFF9" },
        C: { fill: "rgba(206, 140, 79, 0.97)", stroke: "rgba(255, 236, 178, 0.98)", text: "#FFF8DF" },
      };
      const idleStyle = {
        fill: "rgba(36, 28, 22, 0.9)",
        stroke: "rgba(170, 145, 110, 0.7)",
        text: "rgba(231, 214, 184, 0.92)",
      };

      const buttonSize = 22;
      const gap = 8;
      const rowWidth = labels.length * buttonSize + (labels.length - 1) * gap;
      const rowRight = comboFeedX;
      const rowX = rowRight - rowWidth;
      const rowY = Math.max(hudHeight + 4, helperTopY);

      ctx.save();
      labels.forEach((label, idx) => {
        const isPressed = pressedSet.has(keyByLabel[label]);
        const style = isPressed ? buttonChargeStyles[label] : idleStyle;
        const x = rowX + idx * (buttonSize + gap);
        const cx = x + buttonSize / 2;
        const cy = rowY + buttonSize / 2;
        const baseRadius = buttonSize * 0.5 - 1;
        let radius = baseRadius;
        if (isPressed) {
          if (!inputHoldPulseState.holdStartedAtMs[label]) {
            inputHoldPulseState.holdStartedAtMs[label] = now;
          }
          const heldForMs = now - inputHoldPulseState.holdStartedAtMs[label];
          if (heldForMs >= 110) {
            const pulse = 0.5 + 0.5 * Math.sin(now * 0.017);
            const scale = 1 + pulse * 0.34;
            radius = baseRadius * scale;
          }
        } else {
          inputHoldPulseState.holdStartedAtMs[label] = 0;
        }

        ctx.fillStyle = style.fill;
        ctx.strokeStyle = style.stroke;
        ctx.lineWidth = isPressed ? 1.9 : 1.2;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = style.text;
        ctx.font = hudFont(13, "800");
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, cx, cy + 0.2);
      });
      ctx.restore();
    };

    drawPlayerInfo();
    drawNpcInfo();
    drawDistrictProgress();
    drawGameplayComboFeed();
    drawPersistentInputButtons();
    drawMoveAnnouncementBanner();
    drawPickupAnnouncement();
    drawDevArenaMoveReference();
    drawDevArenaMoveFeed();
    drawDevArenaBestCombo();

    if (window.__battlechurchDevMeleeArenaMode === true) {
      const slots = window.__devArenaPickupSlots;
      if (Array.isArray(slots) && slots.length) {
        const kindLabels = { playerWeapon: "Pastor", npcWeapon: "Congregants", utility: "Other" };
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.font = hudFont(HUD_FONTS.chip, "600");
        slots.forEach((slot) => {
          if (!slot.pickup) return;
          const label = kindLabels[slot.kind];
          if (!label) return;
          const lx = slot.x;
          const ly = slot.pickup.y - 32;
          ctx.strokeStyle = 'rgba(0,0,0,0.65)';
          ctx.lineWidth = 2.5;
          ctx.lineJoin = 'round';
          ctx.fillStyle = 'rgba(231, 200, 140, 0.85)';
          ctx.strokeText(label, lx, ly);
          ctx.fillText(label, lx, ly);
        });
        ctx.restore();
      }
    }

    if (window.__battlechurchDevMeleeArenaMode === true) {
      const hintText = window.Renderer?.getControlsHintText?.() ||
        'Keyboard: Navigation/Movement: WASD | Action Buttons: Left (A), Down (B), Right (C) | Select: Space | Back: Esc';
      ctx.save();
      ctx.font = hudFont(HUD_FONTS.devHint, "500");
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = 'rgba(231, 176, 102, 0.68)';
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 2;
      ctx.fillText(hintText, canvas.width / 2, 8 + 84 + 16);
      ctx.fillStyle = 'rgba(231, 176, 102, 0.45)';
      ctx.fillText('Xbox Controller Supported', canvas.width / 2, 8 + 84 + 30);
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    const savedCount = stats?.npcsRescued ?? 0;
    const lostCount = stats?.npcsLost ?? 0;
    ctx.__battlechurchSkipPixelFontScale = prevSkipPixelFontScale;
  }

  const ns = global.BattlechurchHUD || (global.BattlechurchHUD = {});
  ns.draw = drawHUD;
  ns.drawOutlinedText = drawOutlinedText;
})(typeof window !== 'undefined' ? window : globalThis);
