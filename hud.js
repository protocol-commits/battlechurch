(function(global) {
  const scoreboardIconSources = {
    congregation: "assets/sprites/conrad/powerups/dove.png",
    lost: "assets/sprites/conrad/powerups/cup.png",
    keys: "assets/sprites/conrad/powerups/harp.png",
    enemies: "assets/sprites/conrad/powerups/sword.png",
  };
  const scoreboardIcons = {};
  Object.entries(scoreboardIconSources).forEach(([key, src]) => {
    const img = new Image();
    img.src = src;
    scoreboardIcons[key] = img;
  });

  function drawOutlinedText(ctx, text, x, y, font, align, fillColor) {
    ctx.font = font;
    ctx.textAlign = align;
    ctx.lineWidth = Math.max(1, Math.round(Math.max(1, parseInt(String(font), 10)) / 8));
    ctx.strokeStyle = 'rgba(0,0,0,0.95)';
    ctx.fillStyle = fillColor || '#ffffff';
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
      getKeyCount,
      getCongregationSize,
      initialCongregationSize,
      weaponPickupAnnouncement,
      npcWeaponState,
      npcHarmonyBuffTimer,
      npcHarmonyBuffDuration,
    } = bindings;
    if (!ctx || !canvas) return;

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
          return 'Wisdom Missile';
        case 'faith_cannon':
          return 'Faith Cannon';
        case 'fire':
          return 'Scripture Fire';
        case 'heart':
          return 'Heart Charm';
        case 'arrow':
        default:
          return 'Default';
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

    const getWeaponLabel = (mode, multipliers) => {
      const base = getWeaponBaseLabel(mode);
      const tag = buildMultiplierTag(multipliers);
      return `${base}${tag}`;
    };

    const drawMeterRow = (x, y, width, label, ratio, color) => {
      const barHeight = 6;
      const labelY = y + 2;
      const barY = y + 14;
      const barWidth = Math.max(60, width - 8);
      ctx.save();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#ffffff';
      ctx.font = `11px ${UI_FONT_FAMILY}`;
      ctx.fillText(label, x, labelY);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(x, barY, barWidth, barHeight);
      ctx.fillStyle = color || '#ffffff';
      ctx.fillRect(x, barY, Math.max(0, Math.floor(barWidth * Math.max(0, Math.min(1, ratio || 0)))), barHeight);
      ctx.restore();
    };

    const drawTopHPAndLives = () => {
      const hpBarX = columnXs[0] + 6;
      const hpBarY = 20;
      const hpBarWidth = Math.min(210, Math.max(120, columnWidth - 12));
      const hpBarHeight = 18;
      ctx.fillStyle = 'rgba(30,40,60,0.55)';
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#e6e6e6';
      roundRect(ctx, hpBarX, hpBarY, hpBarWidth, hpBarHeight, 6, true, true);
      const hpRatio = Math.max(0, (player?.health ?? 0) / (player?.maxHealth || 1));
      const hpFillColor = hpFlashTimer > 0 ? (() => {
        const pulse = (Math.sin(performance.now() * 0.05) + 1) / 2;
        const g = Math.round(140 + 90 * pulse);
        const b = Math.round(80 + 20 * (1 - pulse));
        return `rgb(255, ${g}, ${b})`;
      })() : '#ff5a5a';
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
        '#ffffff',
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
      ctx.fillStyle = 'rgba(30,40,60,0.55)';
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#e6e6e6';
      roundRect(ctx, meterX, meterY, meterWidth, meterHeight, meterRadius, true, true);
      const ratio = typeof player.getPrayerChargeRatio === 'function' ? player.getPrayerChargeRatio() : 0;
      const ready = typeof player.isPrayerBombReady === 'function' ? player.isPrayerBombReady() : ratio >= 1;
      const fillWidth = Math.max(0, Math.floor((meterWidth - 4) * ratio));
      const baseColor = '#7fc7ff';
      if (ready) {
        const pulse = (Math.sin(performance.now() * 0.01) + 1) / 2;
        ctx.fillStyle = pulse > 0.5 ? '#ffdb73' : baseColor;
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
        ? (Math.sin(performance.now() * 0.01) > 0 ? '#fff7c2' : '#ffe08b')
        : 'rgba(230, 240, 255, 0.92)';
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
      ctx.fillStyle = '#ffffff';
      ctx.font = `12px ${UI_FONT_FAMILY}`;
      ctx.fillText('PLAYER', x, panelY + 14);
      ctx.restore();

      const rows = [];
      const weaponMode = player.overrideWeaponMode || player.weaponMode || 'arrow';
      const weaponDuration = Math.max(0.001, player.weaponPowerDuration || 0);
      const weaponTimer = Math.max(0, player.weaponPowerTimer || 0);
      const weaponRatio = weaponDuration > 0 ? weaponTimer / weaponDuration : 0;
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
        label: `Weapon: ${getWeaponLabel(weaponMode, playerMultipliers)}`,
        ratio: weaponMode === 'arrow' ? 0 : weaponRatio,
        color: '#7fd4ff',
      });

      const utilityRows = [];
      if (player.shieldTimer > 0) {
        const duration = Math.max(0.001, player.shieldDuration || 0);
        utilityRows.push({
          label: 'Shield (Blocks damage)',
          ratio: duration > 0 ? player.shieldTimer / duration : 0,
          color: '#aef5ff',
        });
      }
      if (player.speedBoostTimer > 0) {
        const duration = Math.max(0.001, player.speedBoostDuration || 0);
        utilityRows.push({
          label: 'Haste (Move speed)',
          ratio: duration > 0 ? player.speedBoostTimer / duration : 0,
          color: '#9bff86',
        });
      }
      if (player.powerExtendTimer > 0) {
        const duration = Math.max(0.001, player.powerExtendDuration || 0);
        utilityRows.push({
          label: 'Extend (Weapon timer)',
          ratio: duration > 0 ? player.powerExtendTimer / duration : 0,
          color: '#ffd480',
        });
      }
      rows.push(...utilityRows.slice(0, 2));

      const rowYs = [panelY + 24, panelY + 46, panelY + 68];
      rows.slice(0, rowYs.length).forEach((row, idx) => {
        drawMeterRow(x, rowYs[idx], width, row.label, row.ratio, row.color);
      });
    };

    const drawNpcInfo = () => {
      const x = columnXs[2] + 6;
      const width = columnWidth - 12;
      ctx.save();
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.font = `12px ${UI_FONT_FAMILY}`;
      ctx.fillText('CONGREGANTS', x, panelY + 14);
      ctx.restore();

      const rows = [];
      const npcMode = npcWeaponState?.mode || 'arrow';
      const npcTimer = Math.max(0, npcWeaponState?.timer || 0);
      const npcDuration = Math.max(0.001, npcWeaponState?.duration || npcTimer || 0);
      const npcMultipliers = npcMode === 'arrow'
        ? null
        : {
            damage: npcWeaponState?.damageMultiplier,
            cooldown: npcWeaponState?.cooldownMultiplier,
            speed: npcWeaponState?.speedMultiplier,
          };
      rows.push({
        label: `Weapon: ${getWeaponLabel(npcMode, npcMultipliers)}`,
        ratio: npcMode === 'arrow' ? 0 : (npcTimer / npcDuration),
        color: '#ffd08a',
      });
      if (npcHarmonyBuffTimer > 0) {
        const duration = Math.max(0.001, npcHarmonyBuffDuration || npcHarmonyBuffTimer || 0);
        rows.push({
          label: 'Harmony (NPC boost)',
          ratio: duration > 0 ? npcHarmonyBuffTimer / duration : 0,
          color: '#d6b7ff',
        });
      }

      const rowYs = [panelY + 24, panelY + 46, panelY + 68];
      rows.slice(0, rowYs.length).forEach((row, idx) => {
        drawMeterRow(x, rowYs[idx], width, row.label, row.ratio, row.color);
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
    const keyCount = typeof getKeyCount === 'function' ? getKeyCount() : 0;
    ctx.save();
    ctx.translate(boardX, boardY);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f7fbff';
    ctx.font = `12px ${UI_FONT_FAMILY}`;
    const iconSize = 18;
    const iconPadding = 6;
    const rowHeight = 20;
    const enemyKills = stats?.enemiesDefeated ?? 0;
    const iconX = Math.max(rowHeight, boardWidth - iconSize - 4);
    const textX = iconX - iconPadding;
    const entries = [
      { value: congregationTotal, icon: scoreboardIcons.congregation },
      { value: lostCount, icon: scoreboardIcons.lost },
      { value: keyCount, icon: scoreboardIcons.keys },
      { value: enemyKills, icon: scoreboardIcons.enemies },
    ];
    entries.forEach((entry, idx) => {
      const y = 22 + idx * rowHeight;
      const text = `${entry.value}`;
      ctx.fillText(text, textX, y);
      if (entry.icon && entry.icon.complete) {
        ctx.drawImage(entry.icon, iconX, y - iconSize / 2, iconSize, iconSize);
      }
    });
    ctx.restore();
  }

  const ns = global.BattlechurchHUD || (global.BattlechurchHUD = {});
  ns.draw = drawHUD;
  ns.drawOutlinedText = drawOutlinedText;
})(typeof window !== 'undefined' ? window : globalThis);
