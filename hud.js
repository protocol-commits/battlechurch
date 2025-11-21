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
    } = bindings;
    if (!ctx || !canvas) return;

    ctx.save();
    ctx.translate(sharedShakeOffset.x, sharedShakeOffset.y);

    const hudHeight = 84;
    const levelStatus = levelManager?.getStatus ? levelManager.getStatus() : null;
    const stats = levelManager?.getStats ? levelManager.getStats() : null;
    const bossStage = levelManager?.isBossStage?.() || false;

    const columnPadding = 24;
    const columnGap = 28;
    const minColumnWidth = 200;
    let columnWidth = Math.min(Math.max(minColumnWidth, canvas.width - columnPadding * 2), 420);
    if (columnWidth < minColumnWidth) columnWidth = minColumnWidth;
    let totalWidth = columnWidth;
    if (totalWidth > canvas.width - columnPadding * 2) {
      columnWidth = Math.max(160, canvas.width - columnPadding * 2);
      totalWidth = columnWidth;
    }
    let startX = Math.max(columnPadding, (canvas.width - totalWidth) / 2);
    const panelHeight = hudHeight - 18;
    const panelY = 8;
    const panelPaddingX = 16;

    const drawTopHPAndLives = () => {
      const hpBarX = 12;
      const hpBarY = 20;
      const hpBarWidth = Math.min(210, Math.floor(canvas.width * 0.22));
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
        for (let i = 0; i < livesToShow; i += 1) {
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
            const drawW = 26;
            const drawH = 26;
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
            offsetX += drawW + 4;
          }
        }
      } catch (e) {}
    };

    drawTopHPAndLives();

    const drawPrayerBombMeter = () => {
      if (!player) return;
      const meterX = 12;
      const meterY = 44;
      const meterWidth = Math.min(210, Math.floor(canvas.width * 0.22));
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

    const boardWidth = 120;
    const boardX = canvas.width - boardWidth - 12;
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
