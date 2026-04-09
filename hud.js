(function(global) {
  const prayerSpark = {
    timer: 0,
    lastRatio: 0,
    lastTime: 0,
  };
  const townProgressSpark = {
    timer: 0,
    lastRatio: 0,
    lastTime: 0,
  };
  const townProgressAnim = {
    animators: {},
    lastTime: 0,
    clipKeys: {},
  };
  const scoreboardIconSources = {
    congregation: "assets/sprites/pixel-art-pack/Items/I28_Idol.png",
    grace: "assets/sprites/pixel-art-pack/Items/I62_Gem_L.png",
    enemies: "assets/sprites/pixel-art-pack/Weapons/W01_Blade.png",
  };
  const scoreboardIcons = {};
  Object.entries(scoreboardIconSources).forEach(([key, src]) => {
    const img = new Image();
    img.src = src;
    scoreboardIcons[key] = img;
  });
  const defaultWeaponIcon = new Image();
  defaultWeaponIcon.src = "assets/sprites/pixel-art-pack/Weapons/W43_Recurve_Bow.png";
  const BOSS_PROGRESS_WEIGHT = 5;

  function drawOutlinedText(ctx, text, x, y, font, align, fillColor) {
    ctx.font = font;
    ctx.textAlign = align;
    ctx.fillStyle = fillColor || '#EAF6FF';
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
      maxComboThisTown,
      touchControlsVisible,
      touchControlsAvailable,
      DASH_COOLDOWN,
      playerDashState,
    } = bindings;
    if (!ctx || !canvas) return;

    // Use centralized styles if available, fallback to inline
    const PALETTE = (typeof UIStyles !== 'undefined' && UIStyles.colors) ? UIStyles.colors : {
      deepNavy: "#0A0F1F",
      slate: "#233152",
      ice: "#9BD9FF",
      softWhite: "#EAF6FF",
      gold: "#FFC86A",
      crimson: "#FF6B6B",
      teal: "#5FE3C0",
      muted: "#8FA3BF",
    };

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
      const barHeight = 18;
      const barWidth = Math.max(60, width - 8);
      const barX = x;
      const barY = y + 2;
      const clampedRatio = Math.max(0, Math.min(1, ratio || 0));
      const iconSize = 16;
      const iconGap = 8;
      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = 'rgba(10,15,31,0.6)';
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
      ctx.font = `12px ${UI_FONT_FAMILY}`;
      ctx.fillStyle = PALETTE.softWhite;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, barX + barWidth / 2, barY + barHeight / 2 + 1);
      ctx.restore();
    };

    const drawTopHPAndLives = () => {
      const hpBarX = columnXs[0] + 6;
      const hpBarY = panelY + 24;
      const hpBarWidth = Math.min(210, Math.max(120, columnWidth - 12));
      const hpBarHeight = 18;
      ctx.save();
      ctx.textAlign = 'left';
      ctx.fillStyle = PALETTE.softWhite;
      ctx.font = `12px ${UI_FONT_FAMILY}`;
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
      const missionLabel = (typeof GameText !== 'undefined' && GameText.hud?.mission) || 'Battle';
      ctx.fillText(`${missionLabel}: ${scenarioTitle}`.toUpperCase(), hpBarX, panelY + 14);
      ctx.restore();
      ctx.fillStyle = 'rgba(10,15,31,0.6)';
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = PALETTE.ice;
      roundRect(ctx, hpBarX, hpBarY, hpBarWidth, hpBarHeight, 6, true, true);
      const hpRatio = Math.max(0, (player?.health ?? 0) / (player?.maxHealth || 1));
      const hpFillColor = hpFlashTimer > 0 ? (() => {
        const pulse = (Math.sin(performance.now() * 0.05) + 1) / 2;
        const g = Math.round(140 + 90 * pulse);
        const b = Math.round(80 + 20 * (1 - pulse));
        return `rgb(255, ${g}, ${b})`;
      })() : '#B23A3A';
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

      const hpValueText = (typeof GameText !== 'undefined' && GameText.hud?.health) || 'Health';
      ctx.save();
      ctx.font = `12px ${UI_FONT_FAMILY}`;
      ctx.fillStyle = PALETTE.softWhite;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
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
      if (!player) return;
      const meterX = columnXs[0] + 6;
      const meterY = panelY + 46;
      const meterWidth = Math.min(210, Math.max(120, columnWidth - 12));
      const meterHeight = 18;
      const meterRadius = 6;
      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = 'rgba(10,15,31,0.6)';
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(0,0,0,0)';
      roundRect(ctx, meterX, meterY, meterWidth, meterHeight, meterRadius, true, true);
      const innerX = meterX + 2;
      const innerY = meterY + 1;
      const innerW = meterWidth - 4;
      const innerH = meterHeight - 2;
      const segmentStops = [0.5, 0.8];
      const ratio = typeof player.getPrayerChargeRatio === 'function' ? player.getPrayerChargeRatio() : 0;
      const clampedRatio = Math.max(0, Math.min(1, ratio));
      const ready = typeof player.isPrayerBombReady === 'function' ? player.isPrayerBombReady() : clampedRatio >= 1;
      const prayerSegmentColors = ["#14345A", "#1F4F79", "#2C6A99"];
      const now = performance.now() * 0.001;
      const dt = prayerSpark.lastTime ? Math.min(0.1, Math.max(0, now - prayerSpark.lastTime)) : 0;
      prayerSpark.lastTime = now;
      if (ratio > prayerSpark.lastRatio + 0.002) {
        prayerSpark.timer = 0.45;
      }
      prayerSpark.lastRatio = ratio;
      const totalWidth = Math.max(0, Math.floor(innerW * clampedRatio));
      const segGap = 2;
      const seg1Max = Math.floor(innerW * 0.5);
      const seg2Max = Math.floor(innerW * 0.8);
      const seg1Fill = Math.min(totalWidth, seg1Max);
      const seg2Fill = Math.min(Math.max(0, totalWidth - seg1Max), seg2Max - seg1Max);
      const seg3Fill = Math.max(0, totalWidth - seg2Max);
      const seg1Start = innerX - 1;
      const seg1Width = Math.max(0, seg1Max - segGap + 1);
      const seg2Start = innerX + seg1Max + segGap - 1;
      const seg2Width = Math.max(0, seg2Max - seg1Max - segGap + 2);
      const seg3Start = innerX + seg2Max + segGap + 1;
      const seg3Width = Math.max(0, innerW - seg2Max - segGap);
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.008);
      const fullPulse = clampedRatio >= 1;
      const fullPulseAlpha = 0.2 + pulse * 0.45;
      const fullPulseBrightAlpha = 0.35 + pulse * 0.6;

      if (seg1Fill > 0) {
        ctx.fillStyle = prayerSegmentColors[0];
        roundRect(
          ctx,
          seg1Start,
          innerY,
          Math.min(seg1Width, seg1Fill),
          innerH,
          Math.max(2, meterRadius - 2),
          true,
          false,
        );
        applyMeterGloss(seg1Start, innerY, Math.min(seg1Width, seg1Fill), innerH);
      }
      if (clampedRatio >= 0.5 && seg1Width > 0) {
        ctx.save();
        ctx.globalAlpha = 0.28 + pulse * 0.35;
        ctx.fillStyle = PALETTE.gold;
        roundRect(
          ctx,
          seg1Start,
          innerY,
          seg1Width,
          innerH,
          Math.max(2, meterRadius - 2),
          true,
          false,
        );
        ctx.restore();
      }
      if (fullPulse && seg1Width > 0) {
        ctx.save();
        ctx.globalAlpha = fullPulseAlpha;
        ctx.fillStyle = PALETTE.gold;
        roundRect(
          ctx,
          seg1Start,
          innerY,
          seg1Width,
          innerH,
          Math.max(2, meterRadius - 2),
          true,
          false,
        );
        ctx.restore();
      }
      if (seg2Fill > 0) {
        ctx.fillStyle = prayerSegmentColors[1];
        ctx.fillRect(
          seg2Start,
          innerY,
          Math.min(seg2Width, seg2Fill),
          innerH,
        );
        applyMeterGloss(seg2Start, innerY, Math.min(seg2Width, seg2Fill), innerH);
      }
      if (clampedRatio >= 0.8 && seg2Width > 0) {
        ctx.save();
        ctx.globalAlpha = 0.28 + pulse * 0.35;
        ctx.fillStyle = PALETTE.gold;
        ctx.fillRect(
          seg2Start,
          innerY,
          seg2Width,
          innerH,
        );
        ctx.restore();
      }
      if (fullPulse && seg2Width > 0) {
        ctx.save();
        ctx.globalAlpha = fullPulseAlpha;
        ctx.fillStyle = PALETTE.gold;
        ctx.fillRect(
          seg2Start,
          innerY,
          seg2Width,
          innerH,
        );
        ctx.restore();
      }
      if (seg3Fill > 0) {
        ctx.fillStyle = prayerSegmentColors[2];
        ctx.fillRect(
          seg3Start,
          innerY,
          Math.min(seg3Width, seg3Fill),
          innerH,
        );
        applyMeterGloss(seg3Start, innerY, Math.min(seg3Width, seg3Fill), innerH);
      }
      if (fullPulse && seg3Width > 0) {
        ctx.save();
        ctx.globalAlpha = fullPulseBrightAlpha;
        ctx.fillStyle = PALETTE.gold;
        ctx.fillRect(
          seg3Start,
          innerY,
          seg3Width,
          innerH,
        );
        ctx.restore();
      }
      ctx.save();
      const outerGap = 2;
      const seg1Span = Math.floor(meterWidth * 0.5);
      const seg2Span = Math.floor(meterWidth * 0.3);
      const seg3Span = meterWidth - seg1Span - seg2Span;
      const seg1X = meterX;
      const seg1W = Math.max(0, seg1Span - outerGap);
      const seg2X = meterX + seg1Span + outerGap;
      const seg2W = Math.max(0, seg2Span - outerGap * 2);
      const seg3X = meterX + seg1Span + seg2Span + outerGap;
      const seg3W = Math.max(0, seg3Span - outerGap);
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
      strokeSegment(seg1X, seg1W, { leftRound: true, rightRound: false });
      strokeSegment(seg2X, seg2W, { leftRound: false, rightRound: false });
      strokeSegment(seg3X, seg3W, { leftRound: false, rightRound: true });
      ctx.restore();

      ctx.save();
      ctx.font = `12px ${UI_FONT_FAMILY}`;
      ctx.fillStyle = PALETTE.softWhite;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const seg1Center = seg1Start + seg1Width * 0.5;
      const seg2Center = seg2Start + seg2Width * 0.5;
      const seg3Center = seg3Start + seg3Width * 0.5;
      const textY = innerY + innerH / 2 + 0.5;
      const prayerLabels = (typeof GameText !== 'undefined' && GameText.hud?.prayerMeterLabels) || ['Prayer', '2', '3'];
      ctx.fillText(prayerLabels[0] || 'Prayer', seg1Center, textY);
      ctx.fillText(prayerLabels[1] || '2', seg2Center, textY);
      ctx.fillText(prayerLabels[2] || '3', seg3Center, textY);
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
      ctx.font = `12px ${UI_FONT_FAMILY}`;
      ctx.fillStyle = ready
        ? (Math.sin(performance.now() * 0.01) > 0 ? PALETTE.gold : PALETTE.ice)
        : PALETTE.softWhite;
      ctx.textAlign = 'center';
      ctx.restore();

      const graceCount = typeof getGraceCount === 'function' ? getGraceCount() : 0;
      const enemyKills = stats?.enemiesDefeated ?? 0;
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
      ctx.font = `12px ${UI_FONT_FAMILY}`;
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
      ctx.fillText(graceText, x, rowY);
      x += ctx.measureText(graceText).width + 14;
      if (scoreboardIcons.enemies && scoreboardIcons.enemies.complete) {
        ctx.drawImage(scoreboardIcons.enemies, x, rowY - iconSize / 2, iconSize, iconSize);
        x += iconSize + gap;
      }
      const enemyText = formatNumber(enemyKills);
      ctx.fillText(enemyText, x, rowY);
      x += ctx.measureText(enemyText).width + 14;
      const comboLabel = (typeof GameText !== 'undefined' && GameText.hud?.maxCombo) || "Max Combo:";
      const comboValue = Number.isFinite(maxComboThisTown) ? Math.max(0, Math.round(maxComboThisTown)) : 0;
      const comboText = formatNumber(comboValue);
      ctx.fillStyle = PALETTE.muted;
      ctx.fillText(comboLabel, x, rowY);
      x += ctx.measureText(comboLabel).width + 6;
      ctx.fillStyle = PALETTE.softWhite;
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
      if (!player) return;
      const x = columnXs[1] + 6;
      const width = columnWidth - 12;
      ctx.save();
      ctx.textAlign = 'left';
      ctx.fillStyle = PALETTE.softWhite;
      ctx.font = `12px ${UI_FONT_FAMILY}`;
      const playerRowY = panelY + 14;
      ctx.fillText((typeof GameText !== 'undefined' && GameText.hud?.player) || 'PLAYER', x, playerRowY);
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
      rows.push({
        label: getWeaponLabel(weaponMode),
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
          label: skillNames.haste || 'Haste',
          ratio: duration > 0 ? player.speedBoostTimer / duration : 0,
          color: getIconStyleColor('utility', PALETTE.teal),
          iconImage: assets?.utility?.haste?.iconImage || null,
          iconKey: 'utilityHaste',
        });
      }
      if (player.powerExtendTimer > 0) {
        const duration = Math.max(0.001, player.powerExtendDuration || 0);
        utilityRows.push({
          label: skillNames.swordOfTheSpirit || 'Sword of the Spirit (extends weapons)',
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
      const x = columnXs[2] + 6;
      const width = columnWidth - 12;
      const congregationProvider = typeof getCongregationSize === 'function' ? getCongregationSize : null;
      const baselineCongregation = typeof initialCongregationSize === 'number' ? initialCongregationSize : 0;
      const congregationTotal = congregationProvider
        ? congregationProvider()
        : Math.max(0, (baselineCongregation || 0) - (stats?.npcsLost ?? 0));
      ctx.save();
      ctx.textAlign = 'left';
      ctx.fillStyle = PALETTE.softWhite;
      ctx.font = `12px ${UI_FONT_FAMILY}`;
      const congregationLabel = (typeof GameText !== 'undefined' && GameText.hud?.congregation) || 'CONGREGATION';
      ctx.fillText(`${congregationLabel}: ${congregationTotal}`, x, panelY + 14);
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
      rows.push({
        label: getNpcWeaponLabel(npcMode),
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

    const drawTownProgress = () => {
      const levelStatus = levelManager?.getStatus ? levelManager.getStatus() : null;
      if (!levelStatus) return;
      const x = columnXs[3] + 6;
      const width = columnWidth - 12;
      const levelData =
        (typeof window !== 'undefined' && window.BattlechurchLevelData) || null;
      const structure = levelData?.structure || {};
      const battlesPerTown = Number.isFinite(structure.battlesPerTown) ? structure.battlesPerTown : 3;
      const missionsPerBattle = Number.isFinite(structure.missionsPerBattle) ? structure.missionsPerBattle : 3;
      const defaultHordes = Number.isFinite(structure.defaultHordesPerBattle) ? structure.defaultHordesPerBattle : 18;

      const getMissionHordeCount = (battleIndex, missionIndex) => {
        const level = levelData?.levels?.[battleIndex - 1] || null;
        const month = level?.months?.[missionIndex - 1] || null;
        const battle = month?.battles?.[missionIndex - 1] || month?.battles?.[0] || null;
        const explicitCount = Array.isArray(battle?.hordes) ? battle.hordes.length : null;
        const configured = Number.isFinite(battle?.hordesPerBattle) ? battle.hordesPerBattle : null;
        const count = Number.isFinite(explicitCount) && explicitCount > 0
          ? explicitCount
          : (Number.isFinite(configured) && configured > 0 ? configured : defaultHordes);
        return Math.max(1, count);
      };

      const battleTotals = [];
      let totalUnits = 0;
      for (let battleIndex = 1; battleIndex <= battlesPerTown; battleIndex += 1) {
        let battleTotal = 0;
        for (let missionIndex = 1; missionIndex <= missionsPerBattle; missionIndex += 1) {
          battleTotal += getMissionHordeCount(battleIndex, missionIndex);
        }
        if (battleIndex === battlesPerTown) {
          battleTotal += BOSS_PROGRESS_WEIGHT;
        }
        battleTotals.push(battleTotal);
        totalUnits += battleTotal;
      }

      const townBattleIndex = Math.max(
        1,
        Number.isFinite(levelStatus.globalBattle)
          ? levelStatus.globalBattle
          : (
            ((Math.max(1, Number.isFinite(levelStatus.level) ? levelStatus.level : 1) - 1)
              * Math.max(1, missionsPerBattle))
            + Math.max(1, Number.isFinite(levelStatus.battle) ? levelStatus.battle : 1)
          ),
      );
      const derivedAct = Math.ceil(townBattleIndex / Math.max(1, missionsPerBattle));
      const derivedMission = ((townBattleIndex - 1) % Math.max(1, missionsPerBattle)) + 1;
      const currentAct = Math.max(
        1,
        Math.min(
          battlesPerTown,
          Number.isFinite(levelStatus.level)
            ? levelStatus.level
            : (Number.isFinite(levelStatus.actNum) ? levelStatus.actNum : derivedAct),
        ),
      );
      const currentMission = Math.max(
        1,
        Math.min(
          missionsPerBattle,
          Number.isFinite(levelStatus.battle)
            ? levelStatus.battle
            : (Number.isFinite(levelStatus.missionNum) ? levelStatus.missionNum : derivedMission),
        ),
      );
      const currentWave = Math.max(0, levelStatus.wave || 0);

      let progressUnits = 0;
      for (let actIndex = 1; actIndex < currentAct; actIndex += 1) {
        progressUnits += battleTotals[actIndex - 1] || 0;
      }
      for (let missionIndex = 1; missionIndex < currentMission; missionIndex += 1) {
        progressUnits += getMissionHordeCount(currentAct, missionIndex);
      }
      const currentMissionTotal = getMissionHordeCount(currentAct, currentMission);
      progressUnits += Math.min(currentMissionTotal, currentWave);

      const bossStage =
        levelStatus.stage === "bossIntro" ||
        levelStatus.stage === "bossActive" ||
        (levelStatus.stage === "graceRush" &&
          currentAct === battlesPerTown &&
          currentMission === missionsPerBattle);
      if (bossStage && currentAct === battlesPerTown) {
        let bossProgress = 0;
        if (activeBoss && Number.isFinite(activeBoss.health) && Number.isFinite(activeBoss.maxHealth) && activeBoss.maxHealth > 0) {
          const ratio = Math.max(0, Math.min(1, activeBoss.health / activeBoss.maxHealth));
          bossProgress = BOSS_PROGRESS_WEIGHT * (1 - ratio);
        } else if (levelStatus.stage === "graceRush") {
          bossProgress = BOSS_PROGRESS_WEIGHT;
        }
        progressUnits += bossProgress;
      }

      if (totalUnits <= 0) totalUnits = 1;
      const progressRatio = Math.max(0, Math.min(1, progressUnits / totalUnits));

      const townId = typeof window !== 'undefined' ? window.activeTownId : null;
      const mapData = typeof window !== 'undefined' ? window.BattlechurchMapData : null;
      const townName = mapData?.towns?.find((t) => t.id === townId)?.name || "Town";

      ctx.save();
      ctx.textAlign = 'left';
      ctx.fillStyle = PALETTE.softWhite;
      ctx.font = `12px ${UI_FONT_FAMILY}`;
      ctx.fillText(townName.toUpperCase(), x, panelY + 14);
      ctx.restore();

      const meterX = x;
      const meterY = panelY + 26;
      const meterWidth = Math.max(60, columnWidth - 12);
      const meterHeight = 18;
      const meterRadius = 6;
      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = 'rgba(10,15,31,0.6)';
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(0,0,0,0)';
      roundRect(ctx, meterX, meterY, meterWidth, meterHeight, meterRadius, true, true);
      const innerX = meterX + 2;
      const innerY = meterY + 1;
      const innerW = meterWidth - 4;
      const innerH = meterHeight - 2;
      const now = performance.now() * 0.001;
      const dt = townProgressSpark.lastTime ? Math.min(0.1, Math.max(0, now - townProgressSpark.lastTime)) : 0;
      townProgressSpark.lastTime = now;
      if (progressRatio > townProgressSpark.lastRatio + 0.002) {
        townProgressSpark.timer = 0.45;
      }
      townProgressSpark.lastRatio = progressRatio;
      const fillW = Math.floor(innerW * progressRatio);
      const battleColors = [PALETTE.ice, PALETTE.gold, PALETTE.teal];
      const outerGap = 2;
      const span1 = Math.floor(innerW * (battleTotals[0] / totalUnits));
      const span2 = Math.floor(innerW * (battleTotals[1] / totalUnits));
      const span3 = Math.max(0, innerW - span1 - span2);
      const seg1Start = innerX;
      const seg1Width = Math.max(0, span1 - outerGap);
      const seg2Start = innerX + span1 + outerGap;
      const seg2Width = Math.max(0, span2 - outerGap * 2);
      const seg3Start = innerX + span1 + span2 + outerGap;
      const seg3Width = Math.max(0, span3 - outerGap);

      const segWidths = [seg1Width, seg2Width, seg3Width];
      const segStarts = [seg1Start, seg2Start, seg3Start];
      let remaining = fillW;
      for (let i = 0; i < segStarts.length; i += 1) {
        const drawW = Math.min(segWidths[i], remaining);
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
      const segmentLabels = ["Foothold", "Repel Counter", "Breakthrough"];
      for (let i = 0; i < battleTotals.length; i += 1) {
        const segStart = segStarts[i];
        const segEnd = segStart + segWidths[i];
        const centerX = (segStart + segEnd) / 2;
        const label = `${i + 1}: ${segmentLabels[i] || (i + 1)}`;
        const maxLabelWidth = Math.max(26, segWidths[i] - 8);
        const fontSize = fitFontSize(label, 8, maxLabelWidth, "");
        ctx.font = `${fontSize}px ${UI_FONT_FAMILY}`;
        ctx.fillText(label, centerX, innerY + innerH / 2 + 0.5);
      }
      ctx.restore();

      if (townProgressSpark.timer > 0 && fillW > 0) {
        townProgressSpark.timer = Math.max(0, townProgressSpark.timer - dt);
        const sparkAlpha = Math.min(1, townProgressSpark.timer / 0.45);
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
        const ensureTownMeterAnimator = (key, clips) => {
          if (!clips) return null;
          if (
            !townProgressAnim.animators[key]
            || townProgressAnim.clipKeys[key] !== clips
          ) {
            const animator = new Animator(clips, 1.8);
            animator.play("walk", { restart: true, loop: true });
            townProgressAnim.animators[key] = animator;
            townProgressAnim.clipKeys[key] = clips;
            townProgressAnim.lastTime = 0;
          }
          return townProgressAnim.animators[key] || null;
        };
        const segmentAnimators = [
          ensureTownMeterAnimator("segment1", miniImpClips),
          ensureTownMeterAnimator("segment2", miniImpClips),
          ensureTownMeterAnimator("segment3", demonLordClips || miniImpClips),
        ];
        const now = performance.now();
        const dt = townProgressAnim.lastTime ? Math.min(0.05, Math.max(0, (now - townProgressAnim.lastTime) / 1000)) : 0;
        townProgressAnim.lastTime = now;
        if (segmentAnimators.some(Boolean)) {
          segmentAnimators.forEach((animator) => animator?.update(dt));
          const bossCenters = [
            seg1Start + seg1Width - 10,
            seg2Start + seg2Width - 10,
            seg3Start + seg3Width - 10,
          ];
          const iconY = innerY + innerH / 2 - 15;
          bossCenters.forEach((centerX, idx) => {
            const animator = segmentAnimators[idx];
            animator?.draw(ctx, centerX, iconY, { alpha: 0.95, flipX: true });
          });
        }
      }

      ctx.restore();
    };

    drawPlayerInfo();
    drawNpcInfo();
    drawTownProgress();

    const savedCount = stats?.npcsRescued ?? 0;
    const lostCount = stats?.npcsLost ?? 0;
  }

  const ns = global.BattlechurchHUD || (global.BattlechurchHUD = {});
  ns.draw = drawHUD;
  ns.drawOutlinedText = drawOutlinedText;
})(typeof window !== 'undefined' ? window : globalThis);
