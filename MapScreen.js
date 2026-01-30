(function setupMapScreen(window) {
  if (!window) return;

  const MAP_IMAGE_PRIMARY = "file:///Users/conradtolosa/Apps/battlechurch/battlechurch-game/assets/backgrounds/map.jpg";
  const MAP_IMAGE_FALLBACK = "./assets/backgrounds/map.jpg";
  const HIT_RADIUS_BASE = 10;
  const UI_FONT_FAMILY = "'Orbitron', sans-serif";
  const IS_LOCAL_HOST =
    typeof window !== "undefined" &&
    (window.location?.hostname === "localhost" || window.location?.hostname === "127.0.0.1");

  let mapImage = null;
  let mapImageLoaded = false;
  let mapImageFailed = false;
  let mapAssets = null;
  const townAnimators = new Map();

  const state = {
    active: false,
    mapRect: { x: 0, y: 0, w: 0, h: 0 },
    selectedTownId: null,
    panelOpen: false,
    panelFocus: 0,
    playerDoc: null,
    mapProgress: null,
    loading: false,
    lastMapLoad: 0,
    lastPulseTime: 0,
  };

  function roundRect(ctx, x, y, width, height, radius, fill = true, stroke = true) {
    if (!ctx) return;
    ctx.beginPath();
    const r = Math.min(radius, width / 2, height / 2);
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  function loadMapImage() {
    if (mapImage || mapImageLoaded || mapImageFailed) return;
    mapImage = new Image();
    mapImage.onload = () => {
      mapImageLoaded = true;
    };
    mapImage.onerror = () => {
      if (mapImage && mapImage.src === MAP_IMAGE_PRIMARY) {
        mapImage.src = MAP_IMAGE_FALLBACK;
        return;
      }
      mapImageFailed = true;
    };
    mapImage.src = MAP_IMAGE_PRIMARY;
  }

  function setAssets(assets) {
    mapAssets = assets || null;
    townAnimators.clear();
  }

  function getMiniImpClips() {
    return mapAssets?.enemies?.miniImp || null;
  }

  function getMiniDemonLordClips() {
    return mapAssets?.enemies?.miniDemonLord || null;
  }

  function updateAnimatorCycle(animator, dt, state, minHold, maxHold) {
    if (!animator || !state) return;
    state.timer += dt;
    if (animator.currentName === "walk") {
      if (state.timer >= state.hold) {
        state.timer = 0;
        animator.play("attack", { restart: true, loop: false });
      }
    } else if (animator.currentName === "attack") {
      if (animator.isFinished?.()) {
        animator.play("walk", { restart: true, loop: true });
        state.hold = minHold + Math.random() * Math.max(0.1, maxHold - minHold);
      }
    } else {
      animator.play("walk", { restart: true, loop: true });
      state.timer = 0;
    }
  }

  function getTownAnimatorState(town, bestCount) {
    if (!town) return null;
    const key = town.id;
    const isCapital = town.type === "capital";
    const shouldShow = isCapital || bestCount == null;
    if (!shouldShow) {
      if (townAnimators.has(key)) townAnimators.delete(key);
      return null;
    }
    if (townAnimators.has(key)) return townAnimators.get(key);
    const Animator = window.Entities?.Animator || null;
    const clips = isCapital ? getMiniDemonLordClips() : getMiniImpClips();
    if (!Animator || !clips) return null;
    const animator = new Animator(clips, 1);
    animator.play("walk", { restart: true, loop: true });
    if (!animator) return null;
    const minHold = isCapital ? 1.4 : 1.0;
    const maxHold = isCapital ? 2.6 : 2.0;
    const state = {
      animator,
      timer: Math.random() * 1.2,
      hold: minHold + Math.random() * (maxHold - minHold),
      minHold,
      maxHold,
    };
    townAnimators.set(key, state);
    return state;
  }

  function ensureProgress() {
    const mapData = window.BattlechurchMapData;
    if (!mapData) return null;
    if (IS_LOCAL_HOST) {
      return buildLocalProgress(mapData);
    }
    if (!state.mapProgress) {
      state.mapProgress = {
        towns: {},
        unlockedTownIds: [],
      };
    }
    if (!Array.isArray(state.mapProgress.unlockedTownIds)) {
      state.mapProgress.unlockedTownIds = [];
    }
    if (!state.mapProgress.towns || typeof state.mapProgress.towns !== "object") {
      state.mapProgress.towns = {};
    }
    if (!state.mapProgress.unlockedTownIds.length) {
      const firstTownId = mapData.getFirstTownId();
      if (firstTownId) state.mapProgress.unlockedTownIds.push(firstTownId);
    }
    ensureNextTownUnlocked(state.mapProgress, mapData);
    return state.mapProgress;
  }

  function buildLocalProgress(mapData) {
    const towns = mapData.towns || [];
    const completedCount = 11;
    const completedIds = towns.slice(0, completedCount).map((town) => town.id);
    const unlockedTownIds = completedIds.slice();
    const townEntries = {};
    completedIds.forEach((townId) => {
      townEntries[townId] = {
        stars: mapData.calculateStars(100),
        bestCount: 100,
      };
    });
    const progress = {
      towns: townEntries,
      unlockedTownIds,
    };
    ensureNextTownUnlocked(progress, mapData);
    return progress;
  }

  async function loadPlayerProgress() {
    if (state.loading) return;
    state.loading = true;
    try {
      if (IS_LOCAL_HOST) {
        state.mapProgress = ensureProgress();
        state.selectedTownId = state.selectedTownId || pickInitialTown();
        return;
      }
      if (window.Cloud?.initCloud) {
        await window.Cloud.initCloud();
      }
      if (window.Cloud?.loadPlayerDoc) {
        state.playerDoc = await window.Cloud.loadPlayerDoc();
      }
      state.mapProgress = state.playerDoc?.mapProgress || null;
      const progress = ensureProgress();
      if (!state.playerDoc?.mapProgress && window.Cloud?.savePlayerDoc) {
        await window.Cloud.savePlayerDoc({ mapProgress: progress });
      }
      if (!state.selectedTownId) {
        state.selectedTownId = pickInitialTown();
      }
    } catch (e) {
      // swallow errors for offline/local runs
    } finally {
      state.loading = false;
      state.lastMapLoad = Date.now();
    }
  }

  function isTownUnlocked(townId) {
    const progress = ensureProgress();
    if (!progress) return false;
    return progress.unlockedTownIds.includes(townId);
  }

  function getTownStars(townId) {
    const progress = ensureProgress();
    const townEntry = progress?.towns?.[townId];
    return Number.isFinite(townEntry?.stars) ? townEntry.stars : 0;
  }

  function getTownBestCount(townId) {
    const progress = ensureProgress();
    const townEntry = progress?.towns?.[townId];
    return Number.isFinite(townEntry?.bestCount) ? townEntry.bestCount : null;
  }

  function getTownById(townId) {
    const mapData = window.BattlechurchMapData;
    if (!mapData) return null;
    return mapData.towns.find((town) => town.id === townId) || null;
  }

  function getDistrictById(districtId) {
    const mapData = window.BattlechurchMapData;
    if (!mapData) return null;
    return mapData.districts.find((district) => district.id === districtId) || null;
  }

  function getTownPosition(town, rect) {
    return {
      x: rect.x + town.x * rect.w,
      y: rect.y + town.y * rect.h,
    };
  }

  function computeMapRect(canvas) {
    if (!mapImageLoaded || !mapImage) {
      state.mapRect = { x: 0, y: 0, w: canvas.width, h: canvas.height };
      return state.mapRect;
    }
    const scale = Math.min(canvas.width / mapImage.width, canvas.height / mapImage.height);
    const w = mapImage.width * scale;
    const h = mapImage.height * scale;
    const x = (canvas.width - w) / 2;
    const y = (canvas.height - h) / 2;
    state.mapRect = { x, y, w, h };
    return state.mapRect;
  }

  function drawMapBackground(ctx, canvas) {
    const rect = computeMapRect(canvas);
    if (mapImageLoaded && mapImage) {
      ctx.drawImage(mapImage, rect.x, rect.y, rect.w, rect.h);
    } else {
      ctx.fillStyle = "#0b111a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    return rect;
  }

  function drawTownNode(ctx, town, rect, pulse) {
    const position = getTownPosition(town, rect);
    const dpr = window.devicePixelRatio || 1;
    const radius = HIT_RADIUS_BASE * dpr;
    const unlocked = isTownUnlocked(town.id);
    const selected = state.selectedTownId === town.id;
    const starCount = getTownStars(town.id);
    const bestCount = getTownBestCount(town.id);

    ctx.save();
    ctx.beginPath();
    ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);
    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = 10;
    if (bestCount == null) {
      const glow = ctx.createRadialGradient(position.x, position.y, 2, position.x, position.y, radius + 6);
      glow.addColorStop(0, "#FFD27A");
      glow.addColorStop(0.6, "#F09A2B");
      glow.addColorStop(1, "#C76616");
      ctx.fillStyle = glow;
    } else {
      ctx.fillStyle = unlocked ? "#FFD978" : "rgba(255,255,255,0.2)";
    }
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
    ctx.stroke();
    if (selected && unlocked) {
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.stroke();
      if (pulse) {
        ctx.beginPath();
        ctx.arc(position.x, position.y, radius + 6 + pulse, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,217,120,0.55)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    ctx.restore();

    const animState = getTownAnimatorState(town, bestCount);
    const animator = animState?.animator || null;
    const clip = animator?.currentClip || null;
    if (animator && clip && (town.type === "capital" || bestCount == null)) {
      const baseTarget = town.type === "capital" ? radius * 4.2 : radius * 3.75;
      const baseSize = Math.max(clip.frameWidth || 1, clip.frameHeight || 1);
      animator.scale = baseSize > 0 ? baseTarget / baseSize : 1;
      animator.draw(ctx, position.x, position.y - 15, {
        alpha: 1,
        flipX: true,
      });
    }
    if (bestCount != null) {
      ctx.save();
      const nameSize = Math.round(14 * (rect.w / 1280));
      const countSize = Math.round(12 * (rect.w / 1280));
      const stars = "★".repeat(Math.max(1, Math.min(3, starCount)));
      ctx.font = `600 ${nameSize}px ${UI_FONT_FAMILY}`;
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.shadowColor = "rgba(6, 10, 18, 0.85)";
      ctx.shadowBlur = 10;
      ctx.fillText(`${town.name} (${Math.round(bestCount)}) ${stars}`, position.x, position.y - radius - 10);
      ctx.restore();
    } else if (selected) {
      ctx.save();
      ctx.font = `600 ${Math.round(16 * (rect.w / 1280))}px ${UI_FONT_FAMILY}`;
      ctx.fillStyle = unlocked ? "#FFFFFF" : "rgba(255,255,255,0.6)";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.shadowColor = "rgba(6, 10, 18, 0.85)";
      ctx.shadowBlur = 10;
      ctx.fillText(town.name, position.x, position.y - radius - 10);
      ctx.restore();
    }
  }

  function isDistrictUnlocked(districtId) {
    const mapData = window.BattlechurchMapData;
    if (!mapData) return false;
    const towns = mapData.getTownsByDistrict(districtId);
    return towns.some((town) => isTownUnlocked(town.id));
  }

  function drawMapLabels(ctx, canvas, rect) {
    const mapData = window.BattlechurchMapData;
    if (!mapData) return;
    const scale = rect.w / 1280;
    const headerSize = Math.round(32 * scale);
    const districtSize = Math.round(20 * scale);
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.shadowColor = "rgba(6, 10, 18, 0.9)";
    ctx.shadowBlur = 12;
    ctx.fillStyle = "#FFD978";
    ctx.font = `700 ${headerSize}px ${UI_FONT_FAMILY}`;
    ctx.fillText("Greyhaven", rect.x + rect.w / 2, rect.y + Math.max(12, rect.h * 0.04));

    const districts = mapData.getDistricts();
    void districts;
    ctx.restore();
  }

  function findTownAtPosition(point, rect) {
    const mapData = window.BattlechurchMapData;
    if (!mapData) return null;
    const dpr = window.devicePixelRatio || 1;
    const radius = HIT_RADIUS_BASE * dpr;
    for (const town of mapData.towns) {
      const pos = getTownPosition(town, rect);
      const dx = point.x - pos.x;
      const dy = point.y - pos.y;
      if (Math.hypot(dx, dy) <= radius) return town;
    }
    return null;
  }

  function getUnlockedTowns() {
    const mapData = window.BattlechurchMapData;
    if (!mapData) return [];
    return mapData.towns.filter((town) => isTownUnlocked(town.id));
  }

  function pickInitialTown() {
    const unlocked = getUnlockedTowns();
    if (!unlocked.length) return null;
    return unlocked[0].id;
  }

  function getOrderedUnlockedTowns() {
    const mapData = window.BattlechurchMapData;
    if (!mapData) return [];
    const districts = mapData.getDistricts(); // Already sorted by order: NW, NE, SW, SE
    const ordered = [];
    // Add towns district by district
    districts.forEach((district) => {
      const townsInDistrict = mapData.getTownsByDistrict(district.id);
      townsInDistrict.forEach((town) => {
        if (isTownUnlocked(town.id)) {
          ordered.push(town);
        }
      });
    });
    // Add capital last
    const capital = mapData.towns.find((t) => t.type === "capital");
    if (capital && isTownUnlocked(capital.id)) {
      ordered.push(capital);
    }
    return ordered;
  }

  function pickNextTown(direction) {
    const mapData = window.BattlechurchMapData;
    if (!mapData || !state.selectedTownId) return state.selectedTownId;
    const ordered = getOrderedUnlockedTowns();
    if (!ordered.length) return state.selectedTownId;
    const currentIndex = ordered.findIndex((t) => t.id === state.selectedTownId);
    if (currentIndex < 0) return ordered[0].id;
    // Right/Down = next in sequence, Left/Up = previous in sequence
    const forward = direction === "right" || direction === "down";
    let nextIndex;
    if (forward) {
      nextIndex = (currentIndex + 1) % ordered.length;
    } else {
      nextIndex = (currentIndex - 1 + ordered.length) % ordered.length;
    }
    return ordered[nextIndex].id;
  }

  function openTownPanel(townId) {
    if (!isTownUnlocked(townId)) return;
    state.selectedTownId = townId;
    state.panelOpen = true;
    state.panelFocus = 0;
  }

  function closeTownPanel() {
    state.panelOpen = false;
  }

  function drawTownPanel(ctx, canvas) {
    if (!state.panelOpen || !state.selectedTownId) return;
    const town = getTownById(state.selectedTownId);
    if (!town) return;
    const district = getDistrictById(town.districtId);
    const stars = getTownStars(town.id);
    const panelW = Math.min(520, canvas.width * 0.7);
    const panelH = 220;
    const panelX = canvas.width / 2 - panelW / 2;
    const panelY = canvas.height - panelH - 40;

    ctx.save();
    ctx.fillStyle = "rgba(8, 12, 20, 0.85)";
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 2;
    roundRect(ctx, panelX, panelY, panelW, panelH, 16, true, true);

    ctx.fillStyle = "#FFD978";
    ctx.font = `600 22px ${UI_FONT_FAMILY}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(town.name, canvas.width / 2, panelY + 16);

    ctx.fillStyle = "#EAF6FF";
    ctx.font = `500 16px ${UI_FONT_FAMILY}`;
    ctx.fillText(district ? district.name : "", canvas.width / 2, panelY + 46);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = `500 16px ${UI_FONT_FAMILY}`;
    ctx.fillText(`Stars: ${stars}`, canvas.width / 2, panelY + 76);

    const buttonW = 140;
    const buttonH = 44;
    const gap = 20;
    const buttonY = panelY + panelH - 70;
    const totalW = buttonW * 2 + gap;
    const startX = canvas.width / 2 - totalW / 2;
    // Check if gameplay assets are still loading
    const isLoading = typeof window !== "undefined" && !window.gameAssetsLoaded;
    const loadProgress = (typeof window !== "undefined" && window.gameLoadingProgress) || 0;
    const buttons = [
      { label: isLoading ? "Loading..." : "Play", x: startX, key: "play", isLoading },
      { label: "Back", x: startX + buttonW + gap, key: "back", isLoading: false },
    ];

    buttons.forEach((btn, index) => {
      ctx.save();
      if (btn.isLoading) {
        // Loading button with progress bar
        ctx.fillStyle = "rgba(40, 50, 70, 0.9)";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        ctx.lineWidth = 2;
        roundRect(ctx, btn.x, buttonY, buttonW, buttonH, 16, true, true);
        // Progress fill
        const fillWidth = buttonW * (loadProgress / 100);
        if (fillWidth > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(btn.x, buttonY, buttonW, buttonH, 16);
          ctx.clip();
          ctx.fillStyle = "#9BD9FF";
          ctx.fillRect(btn.x, buttonY, fillWidth, buttonH);
          ctx.restore();
        }
      } else {
        ctx.fillStyle = "#9BD9FF";
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.lineWidth = 2;
        roundRect(ctx, btn.x, buttonY, buttonW, buttonH, 16, true, true);
      }
      if (index === state.panelFocus) {
        ctx.strokeStyle = "#FFD978";
        ctx.lineWidth = 3;
        roundRect(ctx, btn.x - 2, buttonY - 2, buttonW + 4, buttonH + 4, 18, false, true);
      }
      ctx.fillStyle = "#0b111a";
      ctx.font = `600 16px ${UI_FONT_FAMILY}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(btn.label, btn.x + buttonW / 2, buttonY + buttonH / 2);
      ctx.restore();
    });

    state.panelButtons = buttons.map((btn, index) => ({
      key: btn.key,
      x: btn.x,
      y: buttonY,
      width: buttonW,
      height: buttonH,
      index,
    }));

    ctx.restore();
  }

  function handlePanelInput(keysJustPressed) {
    if (!state.panelOpen) return false;
    if (keysJustPressed.has("a") || keysJustPressed.has("d") || keysJustPressed.has("w") || keysJustPressed.has("s")) {
      state.panelFocus = state.panelFocus === 0 ? 1 : 0;
    }
    if (keysJustPressed.has(" ")) {
      const selection = state.panelButtons?.[state.panelFocus];
      if (selection?.key === "play") {
        startRunForTown(state.selectedTownId);
      } else {
        closeTownPanel();
      }
    }
    return true;
  }

  function startRunForTown(townId) {
    if (typeof window.startRunForTown === "function") {
      window.startRunForTown(townId);
      return;
    }
    if (typeof window.startGameFromTitle === "function") {
      window.startGameFromTitle();
    }
  }

  function handleMapInput() {
    const input = window.Input;
    if (!input) return;
    const keysJustPressed = input.keysJustPressed;
    if (!keysJustPressed?.size) return;

    if (state.panelOpen) {
      if (handlePanelInput(keysJustPressed)) {
        keysJustPressed.clear();
        return;
      }
    }

    if (keysJustPressed.has("w")) state.selectedTownId = pickNextTown("up");
    if (keysJustPressed.has("s")) state.selectedTownId = pickNextTown("down");
    if (keysJustPressed.has("a")) state.selectedTownId = pickNextTown("left");
    if (keysJustPressed.has("d")) state.selectedTownId = pickNextTown("right");

    if (keysJustPressed.has(" ")) {
      if (state.selectedTownId) {
        openTownPanel(state.selectedTownId);
      }
    }

    keysJustPressed.clear();
  }

  function handleMapClicks(rect) {
    const input = window.Input;
    if (!input?.consumeCanvasClick) return;
    const click = input.consumeCanvasClick();
    if (!click) return;
    if (state.panelOpen && state.panelButtons) {
      const hit = state.panelButtons.find(
        (btn) => click.x >= btn.x && click.x <= btn.x + btn.width && click.y >= btn.y && click.y <= btn.y + btn.height,
      );
    if (hit) {
      if (hit.key === "play") {
        startRunForTown(state.selectedTownId);
      } else {
        closeTownPanel();
      }
      return;
    }
    }
    const town = findTownAtPosition(click, rect);
    if (town && isTownUnlocked(town.id)) {
      openTownPanel(town.id);
    }
  }

  function updateSelectionFromHover(rect) {
    const input = window.Input;
    if (!input?.pointerState) return;
    const town = findTownAtPosition(input.pointerState, rect);
    if (town && isTownUnlocked(town.id)) {
      state.selectedTownId = town.id;
    }
  }

  function ensureNextTownUnlocked(progress, mapData) {
    if (!progress || !mapData) return;
    const firstTownId = mapData.getFirstTownId();
    if (!firstTownId) return;
    const completedSet = new Set(Object.keys(progress.towns || {}));
    let current = firstTownId;
    while (current && completedSet.has(current)) {
      current = getNextTownInOrder(current);
    }
    if (!current) return;
    const unlockIds = new Set(progress.unlockedTownIds || []);
    unlockIds.add(current);
    progress.unlockedTownIds = Array.from(unlockIds);
  }

  function getNextTownInOrder(townId) {
    const mapData = window.BattlechurchMapData;
    if (!mapData || !townId) return null;
    const town = getTownById(townId);
    if (!town) return null;

    // Capital (Highgate) is the final town - no next town
    if (town.type === "capital") return null;

    const districts = mapData.getDistricts();
    const districtIndex = districts.findIndex((d) => d.id === town.districtId);
    if (districtIndex < 0) return null;

    const townsInDistrict = mapData.getTownsByDistrict(districts[districtIndex].id);
    const townIndex = townsInDistrict.findIndex((t) => t.id === townId);

    // Next town in same district
    if (townIndex >= 0 && townIndex < townsInDistrict.length - 1) {
      return townsInDistrict[townIndex + 1].id;
    }

    // First town in next district
    if (districtIndex < districts.length - 1) {
      const nextDistrictTowns = mapData.getTownsByDistrict(districts[districtIndex + 1].id);
      if (nextDistrictTowns.length) return nextDistrictTowns[0].id;
    }

    // All districts done - go to capital (Highgate)
    const capital = mapData.towns.find((t) => t.type === "capital");
    return capital ? capital.id : null;
  }

  function selectTown(townId) {
    if (!townId) return;
    state.selectedTownId = townId;
  }

  async function recordTownCompletion(townId, congregationCount) {
    if (!townId) return;
    const mapData = window.BattlechurchMapData;
    if (!mapData) return;
    if (!state.mapProgress) {
      await loadPlayerProgress();
    }
    const progress = ensureProgress();
    const stars = mapData.calculateStars(congregationCount);
    const currentStars = Number.isFinite(progress.towns?.[townId]?.stars)
      ? progress.towns[townId].stars
      : 0;
    const currentBest = Number.isFinite(progress.towns?.[townId]?.bestCount)
      ? progress.towns[townId].bestCount
      : null;
    if (!progress.towns[townId]) progress.towns[townId] = { stars: 0 };
    progress.towns[townId].stars = Math.max(currentStars, stars);
    if (currentBest == null || congregationCount > currentBest) {
      progress.towns[townId].bestCount = congregationCount;
    }

    const town = getTownById(townId);
    const districts = mapData.getDistricts();
    const districtIndex = districts.findIndex((d) => d.id === town?.districtId);
    if (districtIndex >= 0) {
      const townsInDistrict = mapData.getTownsByDistrict(districts[districtIndex].id);
      const townIndex = townsInDistrict.findIndex((t) => t.id === townId);
      const unlockIds = new Set(progress.unlockedTownIds);
      if (townIndex >= 0 && townIndex < townsInDistrict.length - 1) {
        unlockIds.add(townsInDistrict[townIndex + 1].id);
      } else if (districtIndex < districts.length - 1) {
        const nextDistrictTowns = mapData.getTownsByDistrict(districts[districtIndex + 1].id);
        if (nextDistrictTowns.length) unlockIds.add(nextDistrictTowns[0].id);
      }
      progress.unlockedTownIds = Array.from(unlockIds);
    }

    if (window.Cloud?.savePlayerDoc) {
      try {
        await window.Cloud.savePlayerDoc({ mapProgress: progress });
      } catch (e) {}
    }
  }

  function open() {
    state.active = true;
    state.panelOpen = false;
    if (!state.selectedTownId) state.selectedTownId = pickInitialTown();
    loadPlayerProgress();
  }

  function close() {
    state.active = false;
    state.panelOpen = false;
  }

  function update(dt) {
    if (!state.active) return;
    loadMapImage();
    handleMapInput();
    const mapData = window.BattlechurchMapData;
    if (mapData) {
      mapData.towns.forEach((town) => {
        const bestCount = getTownBestCount(town.id);
        const animState = getTownAnimatorState(town, bestCount);
        if (!animState) return;
        animState.animator.update(dt);
        updateAnimatorCycle(
          animState.animator,
          dt,
          animState,
          animState.minHold,
          animState.maxHold,
        );
      });
    }
  }

  function draw(ctx, canvas) {
    if (!state.active) return;
    ctx.save();
    const rect = drawMapBackground(ctx, canvas);
    drawMapLabels(ctx, canvas, rect);
    updateSelectionFromHover(rect);
    const pulse = Math.sin((Date.now() / 1000) * 3) * 2;
    const mapData = window.BattlechurchMapData;
    if (mapData) {
      mapData.towns.forEach((town) => drawTownNode(ctx, town, rect, pulse));
    }
    handleMapClicks(rect);
    drawTownPanel(ctx, canvas);
    ctx.restore();
  }

  window.MapScreen = {
    open,
    close,
    update,
    draw,
    recordTownCompletion,
    getNextTownInOrder,
    selectTown,
    setAssets,
    get mapRect() { return { ...state.mapRect }; },
  };
})(typeof window !== "undefined" ? window : null);
