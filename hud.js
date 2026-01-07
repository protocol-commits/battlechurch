(function(global) {
  const scoreboardIconSources = {
    congregation: "assets/sprites/conrad/powerups/dove.png",
    grace: "assets/sprites/pixel-art-pack/Items/I62_Gem_L.png",
    enemies: "assets/sprites/conrad/powerups/sword.png",
  };
  const scoreboardIcons = {};
  Object.entries(scoreboardIconSources).forEach(([key, src]) => {
    const img = new Image();
    img.src = src;
    scoreboardIcons[key] = img;
  });
  const defaultWeaponIcon = new Image();
  defaultWeaponIcon.src = "assets/sprites/pixel-art-pack/Weapons/W43_Recurve_Bow.png";

  function drawOutlinedText(ctx, text, x, y, font, align, fillColor) {
    ctx.font = font;
    ctx.textAlign = align;
    ctx.lineWidth = Math.max(1, Math.round(Math.max(1, parseInt(String(font), 10)) / 8));
    ctx.strokeStyle = 'rgba(0,0,0,0.95)';
    ctx.fillStyle = fillColor || '#EAF6FF';
    try {
      ctx.strokeText(text, x, y);
    } catch (err) {}
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
    } = bindings;
    if (!ctx || !canvas) return;

    const PALETTE = {
      deepNavy: "#0A0F1F",
      slate: "#233152",
      ice: "#9BD9FF",
      softWhite: "#EAF6FF",
      gold: "#FFC86A",
      crimson: "#FF6B6B",
      teal: "#5FE3C0",
      muted: "#8FA3BF",
    };

    const getIconStyleColor = (key, fallback) => {
      if (!powerupIconStyles || !key) return fallback;
      const style = powerupIconStyles[key];
      return style && style.color ? style.color : fallback;
    };

    ctx.save();
    ctx.translate(sharedShakeOffset.x, sharedShakeOffset.y);

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
          return 'Default Weapon';
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
          return 'Default Weapon';
      }
    };
    const getNpcWeaponLabel = (mode) => {
      const base = getNpcWeaponBaseLabel(mode);
      return base;
    };

    const drawPillMeterRow = (x, y, width, label, ratio, color, iconImage, iconKey) => {
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
      const fillWidth = Math.max(0, Math.floor((barWidth - 4) * clampedRatio));
      if (fillWidth > 0) {
        ctx.fillStyle = color || PALETTE.softWhite;
        roundRect(
          ctx,
          barX + 2,
          barY + 2,
          fillWidth,
          barHeight - 4,
          5,
          true,
          false,
        );
      }
      ctx.font = `11px ${UI_FONT_FAMILY}`;
      ctx.fillStyle = PALETTE.softWhite;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, barX + barWidth / 2, barY + barHeight / 2 + 1);
      ctx.restore();
    };

    const drawTopHPAndLives = () => {
      const hpBarX = columnXs[0] + 6;
      const hpBarY = 20;
      const hpBarWidth = Math.min(210, Math.max(120, columnWidth - 12));
      const hpBarHeight = 18;
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
      })() : PALETTE.crimson;
      ctx.fillStyle = hpFillColor;
      roundRect(
        ctx,
        hpBarX + 2,
        hpBarY + 2,
        Math.max(6, Math.floor((hpBarWidth - 4) * hpRatio)),
        hpBarHeight - 4,
        5,
        true,
        false,
      );

      const hpValueText = player && Number.isFinite(player.health)
        ? `${Math.max(0, Math.round(player.health))}/${Math.round(player.maxHealth || 0)}`
        : '--';
      drawOutlinedText(
        ctx,
        hpValueText,
        hpBarX + hpBarWidth / 2,
        hpBarY + hpBarHeight / 2 + 4,
        `12px ${UI_FONT_FAMILY}`,
        'center',
        PALETTE.softWhite,
      );

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
      const meterY = 44;
      const meterWidth = Math.min(210, Math.max(120, columnWidth - 12));
      const meterHeight = 18;
      const meterRadius = 6;
      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = 'rgba(10,15,31,0.6)';
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = PALETTE.ice;
      roundRect(ctx, meterX, meterY, meterWidth, meterHeight, meterRadius, true, true);
      const ratio = typeof player.getPrayerChargeRatio === 'function' ? player.getPrayerChargeRatio() : 0;
      const ready = typeof player.isPrayerBombReady === 'function' ? player.isPrayerBombReady() : ratio >= 1;
      const fillWidth = Math.max(0, Math.floor((meterWidth - 4) * ratio));
      const baseColor = PALETTE.ice;
      if (ready) {
        const pulse = (Math.sin(performance.now() * 0.01) + 1) / 2;
        ctx.fillStyle = pulse > 0.5 ? PALETTE.gold : baseColor;
      } else {
        ctx.fillStyle = baseColor;
      }
      roundRect(
        ctx,
        meterX + 2,
        meterY + 2,
        fillWidth,
        meterHeight - 4,
        Math.max(2, meterRadius - 2),
        true,
        false,
      );
      ctx.font = `11px ${UI_FONT_FAMILY}`;
      ctx.fillStyle = ready
        ? (Math.sin(performance.now() * 0.01) > 0 ? PALETTE.gold : "#FFDCA0")
        : 'rgba(234, 246, 255, 0.9)';
      ctx.textAlign = 'center';
      ctx.fillText('Prayer', meterX + meterWidth / 2, meterY + meterHeight / 2 + 4);
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
      ctx.fillText('PLAYER', x, panelY + 14);
      ctx.restore();

      const rows = [];
      const weaponMode = player.overrideWeaponMode || player.weaponMode || 'arrow';
      const weaponDuration = Math.max(0.001, player.weaponPowerDuration || 0);
      const weaponTimer = Math.max(0, player.weaponPowerTimer || 0);
      const weaponRatio = weaponDuration > 0 ? weaponTimer / weaponDuration : 0;
      const weaponIcon = (() => {
        if (!assets || !assets.animals) return defaultWeaponIcon;
        if (weaponMode === 'wisdom_missle') return assets.animals.wisdom?.iconImage || defaultWeaponIcon;
        if (weaponMode === 'faith_cannon') return assets.animals.faith?.iconImage || defaultWeaponIcon;
        if (weaponMode === 'fire') return assets.animals.scripture?.iconImage || defaultWeaponIcon;
        return defaultWeaponIcon;
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

      const utilityRows = [];
      if (player.shieldTimer > 0) {
        const duration = Math.max(0.001, player.shieldDuration || 0);
        utilityRows.push({
          label: 'Shield of Faith',
          ratio: duration > 0 ? player.shieldTimer / duration : 0,
          color: getIconStyleColor('utility', PALETTE.ice),
          iconImage: assets?.utility?.shield?.iconImage || null,
          iconKey: 'utilityShield',
        });
      }
      if (player.speedBoostTimer > 0) {
        const duration = Math.max(0.001, player.speedBoostDuration || 0);
        utilityRows.push({
          label: 'Haste',
          ratio: duration > 0 ? player.speedBoostTimer / duration : 0,
          color: getIconStyleColor('utility', PALETTE.teal),
          iconImage: assets?.utility?.haste?.iconImage || null,
          iconKey: 'utilityHaste',
        });
      }
      if (player.powerExtendTimer > 0) {
        const duration = Math.max(0.001, player.powerExtendDuration || 0);
        utilityRows.push({
          label: 'Sword of the Spirit (extends weapons)',
          ratio: duration > 0 ? player.powerExtendTimer / duration : 0,
          color: getIconStyleColor('utility', PALETTE.gold),
          iconImage: assets?.utility?.extender?.iconImage || null,
          iconKey: 'utilityExtend',
        });
      }
      rows.push(...utilityRows.slice(0, 2));

      const rowYs = [panelY + 24, panelY + 46, panelY + 68];
      rows.slice(0, rowYs.length).forEach((row, idx) => {
        drawPillMeterRow(x, rowYs[idx], width, row.label, row.ratio, row.color, row.iconImage, row.iconKey);
      });
    };

    const drawNpcInfo = () => {
      const x = columnXs[2] + 6;
      const width = columnWidth - 12;
      ctx.save();
      ctx.textAlign = 'left';
      ctx.fillStyle = PALETTE.softWhite;
      ctx.font = `12px ${UI_FONT_FAMILY}`;
      ctx.fillText('CONGREGANTS', x, panelY + 14);
      ctx.restore();

      const rows = [];
      const npcMode = npcWeaponState?.mode || 'arrow';
      const npcTimer = Math.max(0, npcWeaponState?.timer || 0);
      const npcDuration = Math.max(0.001, npcWeaponState?.duration || npcTimer || 0);
      const npcWeaponIcon = (() => {
        if (!assets || !assets.animals) return defaultWeaponIcon;
        if (npcMode === 'wisdom_missle') return assets.animals.npcWisdom?.iconImage || defaultWeaponIcon;
        if (npcMode === 'faith_cannon') return assets.animals.npcFaith?.iconImage || defaultWeaponIcon;
        if (npcMode === 'fire') return assets.animals.npcScripture?.iconImage || defaultWeaponIcon;
        return defaultWeaponIcon;
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
        const duration = Math.max(0.001, npcHarmonyBuffDuration || npcHarmonyBuffTimer || 0);
        rows.push({
          label: 'Encourage One Another',
          ratio: duration > 0 ? npcHarmonyBuffTimer / duration : 0,
          color: getIconStyleColor('utility', PALETTE.teal),
          iconImage: assets?.utility?.harmony?.iconImage || null,
          iconKey: 'npcHarmony',
        });
      }

      const rowYs = [panelY + 24, panelY + 46, panelY + 68];
      rows.slice(0, rowYs.length).forEach((row, idx) => {
        drawPillMeterRow(x, rowYs[idx], width, row.label, row.ratio, row.color, row.iconImage, row.iconKey);
      });
    };

    drawPlayerInfo();
    drawNpcInfo();

    const boardWidth = Math.max(40, columnWidth - 12);
    const boardX = columnXs[3] + 6;
    const boardY = panelY + 18;
    const savedCount = stats?.npcsRescued ?? 0;
    const lostCount = stats?.npcsLost ?? 0;
    const congregationProvider = typeof getCongregationSize === 'function' ? getCongregationSize : null;
    const baselineCongregation = typeof initialCongregationSize === 'number' ? initialCongregationSize : 0;
    const congregationTotal = congregationProvider
      ? congregationProvider()
      : Math.max(0, (baselineCongregation || 0) - (stats?.npcsLost ?? 0));
    const graceCount = typeof getGraceCount === 'function' ? getGraceCount() : 0;
    ctx.save();
    ctx.translate(boardX, boardY);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = PALETTE.softWhite;
    ctx.font = `12px ${UI_FONT_FAMILY}`;
    const iconSize = 18;
    const iconPadding = 6;
    const rowHeight = 20;
    const enemyKills = stats?.enemiesDefeated ?? 0;
    const iconX = Math.max(rowHeight, boardWidth - iconSize - 4);
    const textX = iconX - iconPadding;
    const entries = [
      { value: congregationTotal, icon: scoreboardIcons.congregation },
      { value: graceCount, icon: scoreboardIcons.grace },
      { value: enemyKills, icon: scoreboardIcons.enemies },
    ];
    entries.forEach((entry, idx) => {
      const y = 22 + idx * rowHeight;
      const text = `${entry.value}`;
      ctx.fillText(text, textX, y);
      if (entry.icon && entry.icon.complete) {
        ctx.drawImage(entry.icon, iconX, y - iconSize / 2, iconSize, iconSize);
        if (entry.icon === scoreboardIcons.grace && typeof window !== 'undefined') {
          window.__hudGraceIconPos = {
            x: boardX + iconX + iconSize / 2,
            y: boardY + y,
          };
        }
      }
    });
    ctx.restore();
  }

  const ns = global.BattlechurchHUD || (global.BattlechurchHUD = {});
  ns.draw = drawHUD;
  ns.drawOutlinedText = drawOutlinedText;
})(typeof window !== 'undefined' ? window : globalThis);
