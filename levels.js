/* Level progression manager for Battlechurch */
(function setupLevelsModule(window) {
  if (!window) return;

  const levelData =
    (typeof window !== 'undefined' && window.BattlechurchLevelData) || {};
  const HORDE_ENEMY_POOLS = levelData.hordeEnemyPools || [];
  const levelBuilder = (typeof window !== "undefined" && window.BattlechurchLevelBuilder) || null;
  const HERO_ENCOURAGEMENT_LINES = levelData.heroEncouragementLines || [];
  const NPC_AGREEMENT_LINES = levelData.npcAgreementLines || [];
  const BATTLE_SCENARIOS = levelData.battleScenarios || [];
  const BOSS_BATTLE_THEMES = levelData.bossBattleThemes || [];
  const HORDE_CLEAR_LINES = levelData.hordeClearLines || [];


  // New hierarchy: LEVELS -> MONTHS -> BATTLES -> HORDES
  const LEVELS_PER_GAME = 4;
  const MONTHS_PER_LEVEL = 3;
  const BATTLES_PER_MONTH = 3;
  const HORDES_PER_BATTLE =
    levelData?.structure?.defaultHordesPerBattle || 24;
  const BETWEEN_BATTLE_PAUSE = 3;
  const BETWEEN_HORDE_PAUSE = 2.3;
  const LEVEL_INTRO_DURATION = 2.6;
  const BATTLE_INTRO_DURATION = 3.0;
  const HORDE_INTRO_DURATION = 2.8;
  const HORDE_CLEAR_DURATION = 2.2;
  const ANNOUNCEMENT_FADE_DURATION = 1.5;
  const GRACE_RUSH_DURATION = 5;
  const BOSS_GRACE_RUSH_DURATION = 10;
  const LEVEL_SUMMARY_DURATION = 5;
  const PORTRAIT_CAP = 24; // how many portraits to keep in cumulative stats (was 12)
  const MONTH_INTRO_DURATION = 4.0;
  const ACT_BREAK_DELAY = 2.0;
  const ACT_BREAK_FADE_IN = 0.45;
  const ACT_BREAK_FADE_OUT = 0.45;
  const ACT_BREAK_HOLD_SECONDS = 0.8;
  const ACT_BREAK_FADE_TOTAL = ACT_BREAK_FADE_IN + ACT_BREAK_FADE_OUT + ACT_BREAK_HOLD_SECONDS;
  const ACT_BREAK_PRE_FADE_DELAY = 1.0;
  const ACT_BREAK_MESSAGE_LEAD = 0.5;
  const ACT_BREAK_MESSAGE = "\"Session Break.\"";
  const ACT_BREAK_ANNOUNCEMENT_EXTRA = 1.0;
  const GRACE_RUSH_FADE_DURATION = 1.0;
  const LEVEL2_MINI_IMP_CHANCE = 0.38;
  const LEVEL2_MINI_IMP_MAX_GROUPS = 2;
  const LEVEL2_MINI_IMP_GROUP_FACTOR = 0.55;
  const LEVEL2_MINI_IMP_MIN_COUNT = 5;
  const FORCE_LEVEL2_MINI_IMPS = false;
  const MINI_SKELETON_GROUP_MIN = 10;
  const MINI_SKELETON_GROUP_MAX = 15;

  const noop = () => {};
  const fallbackRandomChoice = (list) =>
    Array.isArray(list) && list.length
      ? list[Math.floor(Math.random() * list.length)]
      : null;
  const fallbackRandomInRange = (min, max) => min + Math.random() * (max - min);
  const setTimeoutFn =
    typeof window.setTimeout === "function" ? window.setTimeout.bind(window) : null;

  function getDevConfig() {
    if (levelData && typeof levelData === "object" && Object.keys(levelData).length) {
      return levelData;
    }
    if (typeof levelBuilder?.getConfig === "function") {
      try {
        return levelBuilder.getConfig() || null;
      } catch (e) {
        return null;
      }
    }
    try {
      const raw = typeof localStorage !== "undefined" ? localStorage.getItem("battlechurch.devLevelConfig") : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") return parsed;
      }
    } catch (e) {}
    return null;
  }

  function getHiddenSet() {
    const cfg = getDevConfig();
    const list = cfg?.globals?.hiddenEnemies;
    return new Set(Array.isArray(list) ? list : []);
  }

  function getGlobalList(key) {
    const cfg = getDevConfig();
    const list = cfg?.globals?.[key];
    return Array.isArray(list) ? list : [];
  }

  function getGlobalMap(key) {
    const cfg = getDevConfig();
    const map = cfg?.globals?.[key];
    return map && typeof map === "object" ? map : {};
  }

  function isGlobalAllKillHorde(hordeNumber) {
    const list = getGlobalList("allKillHordes");
    return list.includes(hordeNumber);
  }

  function getFloorTextForHorde(hordeNumber) {
    const map = getGlobalMap("floorTextByHorde");
    if (map[hordeNumber] !== undefined) return map[hordeNumber];
    const stringKey = String(hordeNumber);
    if (map[stringKey] !== undefined) return map[stringKey];
    return null;
  }

  function formatNameList(names) {
    const clean = (Array.isArray(names) ? names : []).filter(Boolean);
    if (!clean.length) return "";
    if (clean.length === 1) return clean[0];
    if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
    return `${clean.slice(0, -1).join(", ")} and ${clean[clean.length - 1]}`;
  }

  function getScopeConfig(levelIdx, monthIdx, battleIdx, hordeIdx = null) {
    const cfg = getDevConfig();
    if (!cfg || !Array.isArray(cfg.levels)) return {};
    const level = cfg.levels.find((l) => l?.index === levelIdx);
    if (!level) return {};
    const month = level.months?.find((m) => m?.index === monthIdx);
    const battle =
      month?.battles?.find((b) => b?.index === battleIdx) ||
      (Array.isArray(month?.battles) ? month.battles[0] : null);
    const horde =
      hordeIdx != null
        ? (battle?.hordes?.find((h) => h?.index === hordeIdx) ||
            (Array.isArray(battle?.hordes) ? battle.hordes[0] : null))
        : null;
    return { cfg, level, month, battle, horde };
  }

  function resolveValue(scope, key) {
    const { horde, battle, month, level, cfg } = scope;
    if (horde && horde[key] !== undefined) return horde[key];
    if (battle && battle[key] !== undefined) return battle[key];
    if (month && month[key] !== undefined) return month[key];
    if (level && level[key] !== undefined) return level[key];
    if (cfg && cfg.globals && cfg.globals[key] !== undefined) return cfg.globals[key];
    return undefined;
  }

  function resolveHordeCount(levelIdx, monthIdx, battleIdx, fallback) {
    const scope = getScopeConfig(levelIdx, monthIdx, battleIdx, null);
    const val = resolveValue(scope, "hordesPerBattle");
    if (Number.isFinite(val) && val > 0) return val;
    const defaultHpb = scope.cfg?.structure?.defaultHordesPerBattle;
    if (Number.isFinite(defaultHpb) && defaultHpb > 0) return defaultHpb;
    return fallback;
  }

  function getBattleHordeCount(battle) {
    return Array.isArray(battle?.hordes) && battle.hordes.length
      ? battle.hordes.length
      : HORDES_PER_BATTLE;
  }

  const deps = {
    enemies: [],
    npcs: [],
    randomChoice: fallbackRandomChoice,
    randomInRange: fallbackRandomInRange,
    queueLevelAnnouncement: noop,
    setDevStatus: noop,
    getMonthName: () => "January",
    spawnEnemyOfType: noop,
    spawnMiniImpGroup: noop,
    spawnPowerUpDrops: noop,
    spawnBossForLevel: () => null,
    devClearOpponents: noop,
    resetCozyNpcs: noop,
    buildCongregationMembers: noop,
    clearCongregationMembers: noop,
    clearPowerUps: noop,
    clearGrace: noop,
    spawnVictoryGraceBurst: noop,
    startBattleGraceRush: noop,
    getLastEnemyDeathPosition: () => null,
    spawnWeaponPickups: noop,
    evacuateNpcsForBoss: noop,
    restoreNpcsAfterBoss: noop,
    heroSay: noop,
    npcCheer: noop,
    onNpcLost: noop,
    prepareNpcProcession: noop,
    isNpcProcessionComplete: () => true,
    startActBreakFade: noop,
    startGraceRushEndFade: noop,
    getAvailableMiniFolkKeys: () => [],
    hasEnemyAsset: () => true,
    miniImpBaseGroupSize: 48,
    miniImpMaxGroupSize: 120,
    miniImpMinGroupsPerHorde: 1,
    getScore: () => 0,
    startVisitorMinigame: () => false,
  };

  function initialize(options = {}) {
    Object.assign(deps, options || {});
    if (!Array.isArray(deps.enemies)) deps.enemies = [];
    if (!Array.isArray(deps.npcs)) deps.npcs = [];
    if (typeof deps.randomChoice !== "function") deps.randomChoice = fallbackRandomChoice;
    if (typeof deps.randomInRange !== "function") deps.randomInRange = fallbackRandomInRange;
    if (typeof deps.getScore !== "function") deps.getScore = () => 0;
  }

  function clearStagePowerUps() {
    if (typeof deps.clearPowerUps === "function") {
      try {
        deps.clearPowerUps();
      } catch (err) {
        console.warn && console.warn("clearPowerUps hook failed", err);
      }
    }
    if (typeof deps.clearGrace === "function") {
      try {
        deps.clearGrace();
      } catch (err) {
        console.warn && console.warn("clearGrace hook failed", err);
      }
    }
  }

  function mergeEnemyCounts(list, delayMap = {}) {
    const counts = {};
    list.forEach(({ type, count }) => {
      if (!type || !count) return;
      counts[type] = (counts[type] || 0) + count;
    });
    return Object.entries(counts).map(([type, count]) => ({
      type,
      count,
      delay: Number.isFinite(delayMap[type]) ? delayMap[type] : 0,
    }));
  }

  function selectHordeEnemyType(levelNumber, difficultyTier, helpers) {
    const { randomChoice, getAvailableMiniFolkKeys, hasEnemyAsset } = helpers;
    const hidden = getHiddenSet();
    const fallbackType = "miniImp";
    if (levelNumber === 1) {
      const miniKeys =
        (typeof getAvailableMiniFolkKeys === "function" && getAvailableMiniFolkKeys()) || [];
      const available = miniKeys.filter((key) =>
        typeof hasEnemyAsset === "function" ? hasEnemyAsset(key) : true,
      );
      if (available.length) return randomChoice(available);
    }
    const tierIndex = Math.max(0, Math.min(HORDE_ENEMY_POOLS.length - 1, difficultyTier));
    const tierPool = Array.isArray(HORDE_ENEMY_POOLS[tierIndex]) ? HORDE_ENEMY_POOLS[tierIndex] : [];
    const defaultPool = Array.isArray(HORDE_ENEMY_POOLS[0]) ? HORDE_ENEMY_POOLS[0] : [];
    const pool = (tierPool.length ? tierPool : defaultPool).filter((name) => !hidden.has(name));
    const picked = randomChoice(pool.length ? pool : defaultPool);
    return picked || fallbackType;
  }

  // createHordeDefinition(level, month, horde, helpers)
  function createHordeDefinition(levelNumber, monthIndex, hordeIndex, helpers) {
    const {
      randomChoice,
      randomInRange,
      miniImpBaseGroupSize,
      miniImpMaxGroupSize,
      miniImpMinGroupsPerHorde,
      selectEnemyType,
    } = helpers;

    const battleIndex = monthIndex; // reuse until separate battle tier is surfaced in builder
    const difficultyRating = levelNumber + monthIndex * 0.75 + battleIndex * 0.45;
    const baseCount = 40 + Math.round(difficultyRating * 8);
    const maxCount = 180 + Math.round(levelNumber * 12);

    let miniImpGroupCount =
      miniImpMinGroupsPerHorde +
      Math.max(0, Math.floor((levelNumber - 1) / 2)) +
      Math.max(0, Math.floor(monthIndex / 2)) +
      (battleIndex > 0 ? 1 : 0);
    miniImpGroupCount = Math.min(6, miniImpGroupCount);

    let miniImpGroupSize = miniImpBaseGroupSize + Math.floor(difficultyRating * 2.2);
    miniImpGroupSize = Math.max(
      miniImpBaseGroupSize,
      Math.min(miniImpMaxGroupSize, miniImpGroupSize),
    );

    const maxPerGroup = Math.max(
      miniImpBaseGroupSize,
      Math.floor(maxCount / Math.max(1, miniImpGroupCount)),
    );
    miniImpGroupSize = Math.min(miniImpGroupSize, maxPerGroup);

    const miniImpTotal = miniImpGroupCount * miniImpGroupSize;
    const desiredTotal = Math.max(miniImpTotal + 6, baseCount + Math.floor(difficultyRating * 2.5));
    const totalEnemies = Math.max(miniImpTotal, Math.min(maxCount, desiredTotal));
    const hordeNumber = hordeIndex + 1;
    const scope = getScopeConfig(levelNumber, monthIndex + 1, battleIndex + 1, hordeIndex + 1);
    const hidden = getHiddenSet();
    const mode = resolveValue(scope, "mode") || "weighted";
    const defaultDuration =
      resolveValue(scope, "duration") ??
      (scope.cfg?.structure && scope.cfg.structure.defaultHordeDuration);
    const durationSeconds = Number.isFinite(defaultDuration)
      ? defaultDuration
      : Math.max(10, 14 + Math.round(difficultyRating * 2));
    const scopedAllKill = scope.horde?.allKill === true;
    const globalAllKill = isGlobalAllKillHorde(hordeNumber);
    const resolvedAllKill = scopedAllKill || globalAllKill;

    // Collect builder overrides (weighted + explicit can both apply)
    const explicitEntries = Array.isArray(scope.horde?.entries)
      ? scope.horde.entries
          .filter((e) => e && e.enemy && !hidden.has(e.enemy))
          .map((e) => ({
            type: e.enemy,
            count: Math.max(1, Math.floor(e.count || 1)),
            delay: 0,
          }))
      : [];

    const weightedEntries = [];

    const mergedExplicitWeighted = [...weightedEntries, ...explicitEntries];
    if (mergedExplicitWeighted.length) {
      return {
        enemies: mergedExplicitWeighted,
        powerUps: 1 + Math.floor(difficultyRating / 2),
        duration: durationSeconds,
        allKill: resolvedAllKill,
      };
    }

    // When a level config is present, always rely on builder data.
    if (scope.cfg && scope.horde) {
      return {
        enemies: [],
        powerUps: 1 + Math.floor(difficultyRating / 2),
        duration: durationSeconds,
        allKill: resolvedAllKill,
      };
    }

    const miniImpEntries = [];
    const entries = [];
    let spawned = 0;
    for (let i = 0; i < miniImpGroupCount && spawned < totalEnemies; i += 1) {
      const remaining = totalEnemies - spawned;
      const groupsLeft = miniImpGroupCount - i - 1;
      const reservedForOthers = Math.max(0, groupsLeft * miniImpBaseGroupSize);
      const maxForGroup = Math.max(miniImpBaseGroupSize, remaining - reservedForOthers);
      const groupSize = Math.min(maxForGroup, miniImpGroupSize);
      const actualCount = groupSize;
      miniImpEntries.push({
        type: "miniImp",
        count: actualCount,
      });
      spawned += actualCount;
    }

    const ensureMiniDemonCount = Math.max(2, Math.floor(difficultyRating));
    let miniDemonSpawned = 0;
    const isMiniImpTypeChoice = (candidate) =>
      candidate === "miniImp" || candidate === "miniImpLevel2" || candidate === "miniImpLevel3";

    while (spawned < totalEnemies) {
      const progressRatio = spawned / Math.max(1, totalEnemies - 1);
      let tier = 0;
      if (difficultyRating > 4.5 || progressRatio > 0.65) tier = 2;
      else if (difficultyRating > 2.5 || progressRatio > 0.35) tier = 1;
      let type = selectEnemyType(levelNumber, tier, helpers);
      if (miniDemonSpawned < ensureMiniDemonCount) {
        if (progressRatio >= 0.2 && progressRatio <= 0.8 && Math.random() < 0.35) {
          type = "miniDemonFireThrower";
        }
      }
      if (isMiniImpTypeChoice(type)) {
        let attempts = 0;
        while (isMiniImpTypeChoice(type) && attempts < 3) {
          type = selectEnemyType(levelNumber, tier, helpers);
          attempts += 1;
        }
        if (isMiniImpTypeChoice(type)) type = "skeleton";
      }
      if (type === "miniDemonFireThrower") {
        miniDemonSpawned += 1;
      }
      const remaining = totalEnemies - spawned;
      const chunk = Math.min(remaining, 1 + Math.floor(randomInRange(0, Math.min(4, remaining))));
      if (!hidden.has(type)) entries.push({ type, count: chunk });
      spawned += chunk;
    }

    const initialCombined = [...miniImpEntries, ...mergeEnemyCounts(entries)];
    const combinedEntries = mergeEnemyCounts(initialCombined);
    const rangedTypes = new Set([
      "archer",
      "skeletonArcher",
      "wizard",
      "miniDemonFireThrower",
      "miniFireImp",
      "priest",
    ]);
    const hasRangedSupport = combinedEntries.some((entry) => rangedTypes.has(entry.type));
    if (!hasRangedSupport) {
      combinedEntries.push({ type: "miniDemonFireThrower", count: 1 });
    }

      return {
        enemies: combinedEntries,
        powerUps: 1 + Math.floor(difficultyRating / 2),
        duration: durationSeconds,
        allKill: resolvedAllKill,
      };
    }

  function buildLevelDefinition(levelNumber, helpers) {
    const battles = [];
    for (let battleIndex = 0; battleIndex < MONTHS_PER_LEVEL; battleIndex += 1) {
      const hordes = [];
      const hordeCount = resolveHordeCount(
        levelNumber,
        battleIndex + 1,
        battleIndex + 1,
        HORDES_PER_BATTLE,
      );
      for (let hordeIndex = 0; hordeIndex < hordeCount; hordeIndex += 1) {
        hordes.push(createHordeDefinition(levelNumber, battleIndex, hordeIndex, helpers));
      }
      battles.push({ hordes });
    }
    return { levelNumber, battles };
  }

  function createLevelManager() {
    const {
      enemies,
      npcs,
      randomChoice,
      randomInRange,
      queueLevelAnnouncement,
      setDevStatus,
      getMonthName,
      spawnEnemyOfType,
      spawnMiniImpGroup,
      spawnPowerUpDrops,
      spawnBossForLevel,
      devClearOpponents,
      resetCozyNpcs,
      buildCongregationMembers,
      clearCongregationMembers,
      spawnWeaponPickups,
      evacuateNpcsForBoss,
      restoreNpcsAfterBoss,
      heroSay,
      npcCheer,
      startActBreakFade,
      startGraceRushEndFade,
      getAvailableMiniFolkKeys,
      hasEnemyAsset,
      miniImpBaseGroupSize,
      miniImpMaxGroupSize,
      miniImpMinGroupsPerHorde,
      getPendingPortalSpawnCount,
      getScore,
    } = deps;

    const helperConfig = {
      randomChoice,
      randomInRange,
      getAvailableMiniFolkKeys,
      hasEnemyAsset,
      miniImpBaseGroupSize,
      miniImpMaxGroupSize,
      miniImpMinGroupsPerHorde,
    };
    helperConfig.selectEnemyType = (levelNumber, tier) =>
      selectHordeEnemyType(levelNumber, tier, helperConfig);
    const state = {
      active: false,
      level: 0,
      monthIndex: -1, // was battleIndex
      battleIndex: -1, // was hordeIndex
      stage: "idle",
      timer: 0,
      definition: null,
      activeHorde: null,
      boss: null,
      stats: {
        enemiesDefeated: 0,
        npcsRescued: 0,
        npcsLost: 0,
        lostPortraits: [],
        savedPortraits: [],
      },
  lastBattleSummary: null,
      graceRushFadeTimer: 0,
      conversationQueue: [],
      currentBattleScenario: "",
      currentBossTheme: "",
      battleNpcStartCount: 0,
      waitingForCongregation: false,
      awaitingNpcProcession: false,
      visitorMinigamePlayed: false,
      pendingVisitorMinigame: false,
      visitorResumeAction: null,
      finalHordeDelay: 0,
      pendingPortalSpawnBaseline: 0,
      graceRushContext: null,
      pendingBossRestore: false,
      npcRushActive: false,
      npcRushTimer: 0,
      powerUpsEnabled: false,
    };

    function resetStage(stage, duration = 0) {
      state.stage = stage;
      state.timer = duration;
      state.conversationQueue.length = 0;
    }

    function scheduleConversation(delay, action) {
      if (typeof action !== "function") return;
      state.conversationQueue.push({ time: Math.max(0, delay), action });
    }

    function processConversation(dt) {
      for (let i = state.conversationQueue.length - 1; i >= 0; i -= 1) {
        const event = state.conversationQueue[i];
        event.time -= dt;
        if (event.time <= 0) {
          try {
            event.action();
          } catch (error) {
            console.error("Conversation event failed", error);
          }
          state.conversationQueue.splice(i, 1);
        }
      }
    }

    function currentBattle() {
      if (!state.definition) return null;
      return state.definition.battles[state.monthIndex] || null;
    }

    function currentHorde() {
      const battle = currentBattle();
      if (!battle) return null;
      return battle.hordes[state.battleIndex] || null;
    }

    function hasActiveOpponents(includeBoss = true) {
      const activeEnemies = enemies.some((enemy) => !enemy.dead && enemy.state !== "death");
      const bossAlive =
        includeBoss && state.boss && !state.boss.dead && !state.boss.removed && !state.boss.defeated;
      return activeEnemies || bossAlive;
    }

    function beginLevel(levelNumber) {
      state.level = levelNumber;
      state.monthIndex = -1;
      state.battleIndex = -1;
      state.definition = buildLevelDefinition(levelNumber, helperConfig);
      state.active = true;
      state.boss = null;
      state.stats = {
        enemiesDefeated: 0,
        npcsRescued: 0,
        npcsLost: 0,
        lostPortraits: [],
        savedPortraits: [],
      };
      state.battleNpcStartCount = 0;
      state.waitingForCongregation = true;
      state.npcRushActive = false;
      state.npcRushTimer = 0;
      state.visitorMinigamePlayed = false;
      state.pendingVisitorMinigame = false;
      state.visitorResumeAction = null;
      state.graceRushContext = null;
      state.pendingBossRestore = false;
  // Compute global month number so Level 2 shows Apr/May/Jun etc.
  const globalMonthNumberForLevelStart = (levelNumber - 1) * MONTHS_PER_LEVEL + 1;
  const monthName = getMonthName(globalMonthNumberForLevelStart);
  // For levels beyond the first, skip the level-intro overlay and start the next battle immediately.
  if (levelNumber > 1) {
    state.waitingForCongregation = false;
    state.npcRushActive = false;
    state.npcRushTimer = 0;
    state.timer = 0;
    resetStage("levelIntro", 0);
    buildCongregationMembers();
    beginBattle();
    return;
  }
  console.info && console.info('queueAnnouncement', { title: `Level ${levelNumber}: ${monthName}`, level: levelNumber, monthIndex: 0, monthName });
  queueLevelAnnouncement(`Level ${levelNumber}: ${monthName}`, "A new month of ministry begins", {
        duration: MONTH_INTRO_DURATION,
        requiresConfirm: true,
      });
      resetStage("levelIntro", MONTH_INTRO_DURATION);
      setDevStatus(`Preparing ${monthName}`, MONTH_INTRO_DURATION);
      state.currentBattleScenario = "";
      state.currentBossTheme = "";
      buildCongregationMembers();
    }

  function beginBattle() {
    clearStagePowerUps();
    finishNpcRush();
    state.waitingForCongregation = false;
    clearCongregationMembers();
    state.monthIndex += 1;
    state.battleIndex = -1;
  const battleNumber = state.monthIndex + 1;
  const localMonthNumber = state.monthIndex >= 0 ? state.monthIndex + 1 : 1;
  const globalMonthNumber = (state.level - 1) * MONTHS_PER_LEVEL + localMonthNumber;
  const monthName = getMonthName(globalMonthNumber);
  resetCozyNpcs(5);
  // Sometimes resetCozyNpcs may not synchronously populate `npcs` before
  // this line runs (depending on integration points). Use a sensible
  // fallback of 5 so summaries reflect the expected battle baseline.
  const detected = npcs.filter((npc) => !npc.departed && npc.active).length;
  state.battleNpcStartCount = detected > 0 ? detected : 5;
  state.currentBattleScenario = randomChoice(BATTLE_SCENARIOS);
  // Show Level + Month name instead of literal 'Battle N'
  const startedProcession = typeof deps.prepareNpcProcession === "function" && deps.prepareNpcProcession();
  if (startedProcession) {
        state.awaitingNpcProcession = true;
        resetStage("npcArrival", 0);
        setDevStatus("Congregation arriving", 3.0);
      } else {
        state.awaitingNpcProcession = false;
        beginBattleIntroStage();
      }
      if (typeof window.applyFormationAnchors === "function") {
        try {
          window.applyFormationAnchors();
        } catch (e) {}
      }
    }

    function beginBattleIntroStage() {
      state.awaitingNpcProcession = false;
      state.powerUpsEnabled = false;
      const localMonthNumber = state.monthIndex >= 0 ? state.monthIndex + 1 : 1;
      const globalMonthNumber = (state.level - 1) * MONTHS_PER_LEVEL + localMonthNumber;
      const monthName = getMonthName(globalMonthNumber);
      console.info && console.info('queueAnnouncement', { title: `Level ${state.level} — ${monthName}`, level: state.level, monthIndex: state.monthIndex, monthName });
      const missionBriefTitle = monthName;
      queueLevelAnnouncement(`Level ${state.level} — ${monthName}`, state.currentBattleScenario, {
        duration: BATTLE_INTRO_DURATION,
        requiresConfirm: true,
        missionBriefTitle,
      });
      resetStage("battleIntro", BATTLE_INTRO_DURATION);
      setDevStatus(`Level ${state.level} — ${monthName} forming`, BATTLE_INTRO_DURATION + 0.5);
    }

    function finalizeBattleNpcResults() {
  const survivors = npcs.filter((npc) => !npc.departed && npc.active).length;
  const startCount = Number.isFinite(state.battleNpcStartCount) ? state.battleNpcStartCount : 0;
  const lostCount = Math.max(0, startCount - survivors);
  // Assemble per-battle summary. Counts are based on the battle start and
  // surviving NPCs so they're available even if we couldn't capture portraits
  // (for example, when `npcs` is already empty).
  let battleSaved = survivors;
  let battleLost = lostCount;
  const battleSavedPortraits = [];
  const battleLostPortraits = [];
  let savedNames = [];
  let lostNames = [];
  let totalNpcFaith = 0;

  // Capture portraits for survivors and lost NPCs when NPC objects exist.
  if (npcs.length) {
    try {
      const saved = [];
      savedNames = [];
      const lost = [];
      lostNames = [];
      for (const npc of npcs) {
        if (typeof npc.clearStatusBubble === "function") npc.clearStatusBubble();
        try {
          const p = typeof captureNpcPortrait === 'function' ? captureNpcPortrait(npc) : null;
          if (p) {
            if (!npc.departed && npc.active) {
              saved.push(p);
              savedNames.push(npc.name || "");
              if (Number.isFinite(npc.faith)) {
                totalNpcFaith += Math.max(0, npc.faith);
              }
            } else {
              lost.push(p);
            }
          }
        } catch (e) {}
      }
  // append to state stats arrays, cap at PORTRAIT_CAP
  state.stats.savedPortraits = (state.stats.savedPortraits || []).concat(saved).slice(-PORTRAIT_CAP);
  state.stats.lostPortraits = (state.stats.lostPortraits || []).concat(lost).slice(-PORTRAIT_CAP);

      // If portrait counts exist, prefer them as a sanity check but keep
      // the battleSaved/battleLost derived from startCount/survivors.
      if (!Number.isFinite(battleSaved) || battleSaved === 0) battleSaved = saved.length || battleSaved;
      if (!Number.isFinite(battleLost) || battleLost === 0) battleLost = lost.length || battleLost;
  battleSavedPortraits.push(...saved.slice(-PORTRAIT_CAP));
  battleLostPortraits.push(...lost.slice(-PORTRAIT_CAP));
    } catch (e) {}
  }
      // update cumulative stats and store last battle summary for renderer use
      // DEBUG: log counts so we can diagnose zero/zero summaries
      try {
        // Build id arrays for clearer tracing of missing portraits
        const ids = (arr) => (Array.isArray(arr) ? arr.map((p) => (p && p.__portraitId) || null) : []);
        try {
      console.info && console.info('finalizeBattleNpcResults', JSON.stringify({
        battleIndex: state.monthIndex,
            startCount: startCount,
            survivors: survivors,
            derivedLost: lostCount,
            battleSaved,
            battleLost,
            savedPortraits: (battleSavedPortraits || []).length,
            lostPortraits: (battleLostPortraits || []).length,
            savedPortraitIds: ids(battleSavedPortraits),
            lostPortraitIds: ids(battleLostPortraits),
            cumulativeSavedIds: (state.stats && Array.isArray(state.stats.savedPortraits)) ? state.stats.savedPortraits.map((p) => (p && p.__portraitId) || null) : [],
            cumulativeLostIds: (state.stats && Array.isArray(state.stats.lostPortraits)) ? state.stats.lostPortraits.map((p) => (p && p.__portraitId) || null) : [],
          }));
        } catch (e) {
          try { console.info && console.info('finalizeBattleNpcResults', {
            battleIndex: state.battleIndex,
            startCount: startCount,
            survivors: survivors,
            battleSaved,
            savedPortraits: (battleSavedPortraits || []).length,
          }); } catch (ee) {}
        }
      } catch (e) {}

      if (battleSaved > 0) state.stats.npcsRescued += battleSaved;
      state.lastBattleSummary = {
        savedCount: battleSaved,
        lostCount: battleLost,
        savedPortraits: battleSavedPortraits,
        lostPortraits: battleLostPortraits,
        savedNames: savedNames,
        lostNames: lostNames,
        totalNpcFaith: Math.round(totalNpcFaith),
      };
      npcs.splice(0, npcs.length);
      state.battleNpcStartCount = 0;
    }

    function advanceFromCongregation() {
      if (state.stage !== "levelIntro") return;
      if (!state.waitingForCongregation) return;
      state.waitingForCongregation = false;
      beginBattle();
    }

    function startNpcRush() {
      const home = typeof getNpcHomeBounds === "function" ? getNpcHomeBounds() : null;
      const members = typeof congregationMembers !== "undefined" ? congregationMembers : null;
      if (!home || !Array.isArray(members) || members.length === 0) {
        state.npcRushActive = false;
        state.npcRushTimer = 0;
        return false;
      }
      state.npcRushActive = true;
      state.npcRushTimer = 1.8;
      members.forEach((member) => {
        if (!member) return;
        if (!Number.isFinite(member.__rushBaseSpeed)) member.__rushBaseSpeed = member.speed || 28;
        member.speed = (member.__rushBaseSpeed || 28) * 6;
        member.targetX = home.x;
        member.targetY = home.y;
      });
      return true;
    }

    function finishNpcRush() {
      state.npcRushActive = false;
      state.npcRushTimer = 0;
      const members = typeof congregationMembers !== "undefined" ? congregationMembers : null;
      if (Array.isArray(members)) {
        members.forEach((member) => {
          if (!member) return;
          if (Number.isFinite(member.__rushBaseSpeed)) {
            member.speed = member.__rushBaseSpeed;
          }
          delete member.__rushBaseSpeed;
        });
      }
    }

    function updateNpcRush(dt) {
      if (!state.npcRushActive) return false;
      const home = typeof getNpcHomeBounds === "function" ? getNpcHomeBounds() : null;
      const members = typeof congregationMembers !== "undefined" ? congregationMembers : null;
      if (!home || !Array.isArray(members) || members.length === 0) {
        finishNpcRush();
        return true;
      }
      state.npcRushTimer = Math.max(0, state.npcRushTimer - dt);
      let allInside = true;
      members.forEach((member) => {
        if (!member) return;
        if (!Number.isFinite(member.__rushBaseSpeed)) member.__rushBaseSpeed = member.speed || 28;
        member.speed = (member.__rushBaseSpeed || 28) * 6;
        member.targetX = home.x;
        member.targetY = home.y;
        const dx = (member.baseX ?? member.x ?? home.x) - home.x;
        const dy = (member.baseY ?? member.y ?? home.y) - home.y;
        const dist = Math.hypot(dx, dy);
        if (dist > home.radius * 0.82) {
          allInside = false;
        }
      });
      if (state.npcRushTimer <= 0 || allInside) {
        finishNpcRush();
        return true;
      }
      return false;
    }

    function startBriefing(levelNumber = 1) {
      // Prepare level data but DO NOT queue the month announcement yet. The
      // announcement should appear after the instructions (briefing) screen
      // when the player advances. This avoids showing the 'January...' text
      // at the same time as the instructions.
      state.level = levelNumber;
  state.monthIndex = -1;
  state.battleIndex = -1;
      state.definition = buildLevelDefinition(levelNumber, helperConfig);
      state.active = true;
      state.boss = null;
      state.stats = {
        enemiesDefeated: 0,
        npcsRescued: 0,
        npcsLost: 0,
        lostPortraits: [],
        savedPortraits: [],
      };
      state.battleNpcStartCount = 0;
      state.waitingForCongregation = true;
      state.npcRushActive = false;
      state.npcRushTimer = 0;
      state.currentBattleScenario = "";
      state.currentBossTheme = "";
      buildCongregationMembers();
      resetStage("levelIntro", 0);
      const rushing = startNpcRush();
      if (!rushing) {
        resetStage("briefing", 0);
        setDevStatus('Briefing: press Space to continue', 4.0);
      } else {
        setDevStatus("NPCs gathering...", 2.0);
      }
    }

    function advanceFromBriefing() {
      if (state.stage !== "briefing") return;
      finishNpcRush();
      // Queue the month intro announcement now that the player has finished
      // reading the instructions, then enter the normal levelIntro flow.
      // When advancing from briefing the upcoming month is the first month
      // of the level; use month index fallback to 1.
      const monthName = getMonthName((state.monthIndex >= 0 ? state.monthIndex + 1 : 1));
      queueLevelAnnouncement(monthName, "A new month of ministry begins", {
        duration: MONTH_INTRO_DURATION,
        requiresConfirm: true,
      });
      resetStage("levelIntro", MONTH_INTRO_DURATION);
      setDevStatus(`Preparing ${monthName}`, MONTH_INTRO_DURATION);
    }

    function beginHorde() {
      state.battleIndex += 1;
      state.activeHorde = currentHorde();
      if (!state.activeHorde) return;
      const hordeNumber = state.battleIndex + 1;
      const introDuration = hordeNumber === 1 ? 4.0 : HORDE_INTRO_DURATION;
      resetStage("hordeIntro", introDuration);
      if (hordeNumber === 1) {
        const names = formatNameList(npcs.map((npc) => npc?.name || ""));
        const title = "\"I'll stand with you,\nfacing lies, temptation, and sin together.\"";
        queueLevelAnnouncement(title, "", {
          duration: introDuration,
          skipMissionBrief: true,
        });
        const spawnDelay = Math.max(0, introDuration - ANNOUNCEMENT_FADE_DURATION);
        if (typeof setTimeoutFn === "function") {
          setTimeoutFn(() => {
            state.powerUpsEnabled = true;
            if (typeof spawnPowerUpDrops === "function") {
              spawnPowerUpDrops();
            }
          }, spawnDelay * 1000);
        } else if (typeof spawnPowerUpDrops === "function") {
          state.powerUpsEnabled = true;
          spawnPowerUpDrops();
        }
      } else {
        state.powerUpsEnabled = true;
      }
      const hordeLabel = `${state.monthIndex + 1}-${state.battleIndex + 1}`;
      setDevStatus(`Horde ${hordeLabel}`, introDuration + 0.6);
      scheduleConversation(0.4, () => {
        heroSay(randomChoice(HERO_ENCOURAGEMENT_LINES));
      });
      scheduleConversation(1.2, () => {
        const available = npcs.filter(
          (npc) => !npc.departed && npc.state !== "lostFaith" && npc.state !== "drained",
        );
        if (!available.length) return;
        const npc = randomChoice(available);
        npcCheer(npc, randomChoice(NPC_AGREEMENT_LINES));
      });
      scheduleConversation(1.8, () => {
        const available = npcs.filter(
          (npc) => !npc.departed && npc.state !== "lostFaith" && npc.state !== "drained",
        );
        if (!available.length) return;
        const npc = randomChoice(available);
        npcCheer(npc, randomChoice(NPC_AGREEMENT_LINES));
      });
    }

    function spawnActiveHorde() {
      const horde = state.activeHorde;
      if (!horde) return;
      const hordeNumber = state.battleIndex + 1;
      const hordeActiveDuration = Number.isFinite(horde?.duration) ? horde.duration : 12;
      const currentBattle = state.definition?.battles?.[state.monthIndex] || null;
      const totalHordes = getBattleHordeCount(currentBattle);
      const finalHorde = state.battleIndex + 1 >= totalHordes;
      if (finalHorde && typeof getPendingPortalSpawnCount === "function") {
        state.pendingPortalSpawnBaseline = getPendingPortalSpawnCount();
      } else {
        state.pendingPortalSpawnBaseline = 0;
      }
      resetStage("hordeActive", hordeActiveDuration);
      const enemyEntries = Array.isArray(horde?.enemies) ? horde.enemies : [];
      enemyEntries.forEach(({ type, count, delay }) => {
        const isMiniImpTypeEntry = type === "miniImp" || type === "miniImpLevel2";
        const delayMs = Math.max(0, (Number(delay) || 0) * 1000);
        const spawnTask = () => {
          if (isMiniImpTypeEntry) {
            spawnMiniImpGroup(count, null, { ignoreCap: true }, type);
          } else {
            for (let i = 0; i < count; i += 1) {
              spawnEnemyOfType(type);
            }
          }
        };
        if (delayMs > 0 && typeof setTimeoutFn === "function") {
          setTimeoutFn(spawnTask, delayMs);
        } else {
          spawnTask();
        }
      });

      if ([3, 10, 16].includes(hordeNumber)) {
        const floorText = getFloorTextForHorde(hordeNumber);
        if (floorText) {
          queueLevelAnnouncement(floorText, "", {
            duration: 2.2,
            skipMissionBrief: true,
          });
        }
      }
    }

    function handleHordeCleared() {
      const battleNumber = state.monthIndex + 1;
      const hordeNumber = state.battleIndex + 1;
      const finalHorde = hordeNumber >= getBattleHordeCount(currentBattle());
      state.pendingPortalSpawnBaseline = 0;
      spawnPowerUpDrops(state.activeHorde?.powerUps || 1);
      const localMonthNumber = state.monthIndex >= 0 ? state.monthIndex + 1 : 1;
      const monthName = getMonthName((state.level - 1) * MONTHS_PER_LEVEL + localMonthNumber);

      if (!finalHorde) {
        state.finalHordeDelay = 0;
        if (isGlobalAllKillHorde(hordeNumber)) {
          const preFadeDelay = ACT_BREAK_PRE_FADE_DELAY + ACT_BREAK_MESSAGE_LEAD;
          if (typeof deps.rotateNpcPositionsForActBreak === "function") {
            deps.rotateNpcPositionsForActBreak();
          }
          queueLevelAnnouncement(ACT_BREAK_MESSAGE, "", {
            duration: preFadeDelay,
            skipMissionBrief: true,
          });
          if (typeof startActBreakFade === "function") {
            if (typeof setTimeoutFn === "function") {
              setTimeoutFn(() => startActBreakFade(ACT_BREAK_HOLD_SECONDS), preFadeDelay * 1000);
            } else {
              startActBreakFade(ACT_BREAK_HOLD_SECONDS);
            }
          }
          const nextHordeNumber = hordeNumber + 1;
          const floorText = getFloorTextForHorde(nextHordeNumber);
          const announcementHold = ACT_BREAK_DELAY + ACT_BREAK_ANNOUNCEMENT_EXTRA;
          const actBreakTotal = announcementHold + ACT_BREAK_FADE_TOTAL + preFadeDelay;
          if (floorText) {
            const delayMs = (preFadeDelay + ACT_BREAK_FADE_TOTAL) * 1000;
            if (typeof setTimeoutFn === "function") {
              setTimeoutFn(() => {
                queueLevelAnnouncement(floorText, "", {
                  duration: announcementHold,
                  skipMissionBrief: true,
                });
              }, delayMs);
            } else {
              queueLevelAnnouncement(floorText, "", {
                duration: announcementHold,
                skipMissionBrief: true,
              });
            }
          }
          resetStage("hordeCleared", actBreakTotal);
          setDevStatus(`Act break after Horde ${battleNumber}-${hordeNumber}`, actBreakTotal);
          return;
        }
        setDevStatus(`Horde ${battleNumber}-${hordeNumber} advancing`, 1.2);
        beginHorde();
        spawnActiveHorde();
        return;
      }

      beginGraceRushPhase(monthName);
    }

    function beginGraceRushPhase(monthName) {
      resetStage("graceRush", GRACE_RUSH_DURATION);
      state.finalHordeDelay = 0;
      state.graceRushContext = "battle";
      setDevStatus(`Grace Abounds – ${monthName}`, GRACE_RUSH_DURATION);
      queueLevelAnnouncement("Grace Abounds", "Gather as much grace as you can!", {
        duration: 2.6,
        skipMissionBrief: true,
      });
      const lastPos = typeof deps.getLastEnemyDeathPosition === "function"
        ? deps.getLastEnemyDeathPosition()
        : null;
      if (typeof deps.spawnVictoryGraceBurst === "function") {
        deps.spawnVictoryGraceBurst({
          reason: "battle",
          amount: 36,
          centerX: lastPos?.x,
          centerY: lastPos?.y,
        });
      }
      if (typeof deps.startBattleGraceRush === "function") {
        deps.startBattleGraceRush(GRACE_RUSH_DURATION, {
          reason: "battle",
          burstAmount: 16,
          spawnInterval: 1.1,
          centerX: lastPos?.x,
          centerY: lastPos?.y,
        });
      }
    }

    function handleBattleComplete() {
      state.graceRushContext = null;
      clearStagePowerUps();
      state.finalHordeDelay = 0;
  finalizeBattleNpcResults();
  // Also call after normal battle completion, not just hotkey skip
      const flavor = HORDE_CLEAR_LINES[state.monthIndex % HORDE_CLEAR_LINES.length];
      const localMonthNumber = state.monthIndex >= 0 ? state.monthIndex + 1 : 1;
      const monthName = getMonthName((state.level - 1) * MONTHS_PER_LEVEL + localMonthNumber);
      console.info && console.info('queueAnnouncement', { title: `Level ${state.level} — ${monthName} Cleared`, level: state.level, monthIndex: state.monthIndex, monthName });
      queueLevelAnnouncement(
        `Level ${state.level} — ${monthName} Cleared`,
        flavor,
        {
          duration: BETWEEN_BATTLE_PAUSE,
          requiresConfirm: true,
        },
      );
      resetStage("battleIntermission", BETWEEN_BATTLE_PAUSE);
      setDevStatus(`Level ${state.level} — ${monthName} secured`, BETWEEN_BATTLE_PAUSE);
      if (!state.visitorMinigamePlayed && state.monthIndex === 1) {
        state.pendingVisitorMinigame = true;
        state.visitorMinigamePlayed = true;
      }
    }

    function beginBossIntro() {
      state.currentBossTheme = randomChoice(BOSS_BATTLE_THEMES);
      queueLevelAnnouncement(state.currentBossTheme, "A personal battle begins", {
        duration: LEVEL_INTRO_DURATION,
        requiresConfirm: true,
      });
      resetStage("bossIntro", LEVEL_INTRO_DURATION);
      setDevStatus(state.currentBossTheme, LEVEL_INTRO_DURATION + 1);
      evacuateNpcsForBoss();
    }

    function beginBossGraceRush() {
      const lastPos = typeof deps.getLastEnemyDeathPosition === "function"
        ? deps.getLastEnemyDeathPosition()
        : null;
      resetStage("graceRush", BOSS_GRACE_RUSH_DURATION);
      state.graceRushContext = "boss";
      setDevStatus("Treasure Overflow!", BOSS_GRACE_RUSH_DURATION);
      queueLevelAnnouncement("Treasure Overflow!", "Celebrate the victory—collect every grace!", {
        duration: 2.6,
        skipMissionBrief: true,
      });
      if (typeof deps.spawnVictoryGraceBurst === "function") {
        deps.spawnVictoryGraceBurst({
          reason: "boss",
          amount: 90,
          centerX: lastPos?.x,
          centerY: lastPos?.y,
        });
      }
      if (typeof deps.startBattleGraceRush === "function") {
        deps.startBattleGraceRush(BOSS_GRACE_RUSH_DURATION, {
          reason: "boss",
          burstAmount: 28,
          spawnInterval: 0.65,
        });
      }
      state.pendingBossRestore = true;
    }

    function onBossDefeated() {
      clearStagePowerUps();
      state.boss = null;
      setDevStatus("Boss defeated", 3.5);
      beginBossGraceRush();
    }

    function beginVisitorMinigame(onResume) {
      if (typeof deps.startVisitorMinigame !== "function") return false;
      state.visitorResumeAction = typeof onResume === "function" ? onResume : null;
      let completed = false;
      const resume = () => {
        if (completed) return;
        completed = true;
        finishVisitorMinigame();
      };
      const started = deps.startVisitorMinigame({
        level: state.level,
        onComplete: resume,
      });
      if (!started) return false;
      resetStage("visitorMinigame", 0);
      return true;
    }

    function finishVisitorMinigame() {
      if (state.stage !== "visitorMinigame") return;
      clearStagePowerUps();
      const resume = state.visitorResumeAction;
      state.visitorResumeAction = null;
      if (typeof resume === "function") {
        resume();
      } else {
        handleLevelCleared();
      }
    }

    function handleLevelCleared() {
      state.graceRushContext = null;
      clearStagePowerUps();
      const scoreValue =
        typeof getScore === "function" ? Number(getScore()) || 0 : state.stats.enemiesDefeated;
      const summarySubtitle = `Score ${scoreValue.toFixed(0)} • Enemies ${state.stats.enemiesDefeated} • NPCs saved ${state.stats.npcsRescued}`;
  const localMonthNumberForStatus = state.monthIndex >= 0 ? state.monthIndex + 1 : 1;
  const summaryMonthName = getMonthName((state.level - 1) * MONTHS_PER_LEVEL + localMonthNumberForStatus);
  console.info && console.info('queueAnnouncement', { title: `Level ${state.level} — ${summaryMonthName} Cleared`, level: state.level, monthIndex: state.monthIndex, monthName: summaryMonthName });
      queueLevelAnnouncement(
        `Level ${state.level} — ${summaryMonthName} Cleared`,
        summarySubtitle,
        {
          duration: LEVEL_SUMMARY_DURATION,
          requiresConfirm: true,
        },
      );
      resetStage("levelSummary", LEVEL_SUMMARY_DURATION);
      setDevStatus(`Level ${state.level} cleared`, LEVEL_SUMMARY_DURATION);
      state.currentBossTheme = "";
      if (state.pendingBossRestore) {
        restoreNpcsAfterBoss();
        state.pendingBossRestore = false;
      }
    }

    return {
      begin() {
        beginLevel(1);
      },
      reset() {
        state.active = false;
state.monthIndex = -1;
state.battleIndex = -1;
        state.stage = "idle";
        state.timer = 0;
        state.definition = null;
        state.activeHorde = null;
        state.boss = null;
        state.pendingVisitorMinigame = false;
        state.visitorMinigamePlayed = false;
        state.visitorResumeAction = null;
        state.graceRushContext = null;
        state.pendingBossRestore = false;
        state.npcRushActive = false;
        state.npcRushTimer = 0;
      },
      update(dt) {
        if (!state.active) return;
        processConversation(dt);
        switch (state.stage) {
          case "levelIntro":
            if (state.waitingForCongregation && state.npcRushActive) {
              const done = updateNpcRush(dt);
              if (done) {
                resetStage("briefing", 0);
                setDevStatus('Briefing: press Space to continue', 4.0);
              }
              break;
            }
            if (!state.waitingForCongregation) {
              state.timer -= dt;
              if (state.timer <= 0) beginBattle();
            }
            break;
          case "npcArrival":
            if (!state.awaitingNpcProcession) {
              beginBattleIntroStage();
              break;
            }
            if (typeof deps.isNpcProcessionComplete === "function" && deps.isNpcProcessionComplete()) {
              beginBattleIntroStage();
            }
            break;
      case "battleIntro":
        state.timer -= dt;
        if (state.timer <= 0) beginHorde();
        break;
      case "hordeIntro":
        state.timer -= dt;
        if (state.timer <= 0) spawnActiveHorde();
        break;
      case "hordeActive": {
        state.timer = Math.max(0, state.timer - dt);
        const battle = currentBattle();
        const totalHordes = getBattleHordeCount(battle);
        const finalHorde = state.battleIndex + 1 >= totalHordes;
        const enemiesRemain = hasActiveOpponents(false);
        const timerElapsed = state.timer <= 0;
        const pendingPortalSpawns = typeof getPendingPortalSpawnCount === "function"
          ? Math.max(0, getPendingPortalSpawnCount() - (state.pendingPortalSpawnBaseline || 0))
          : 0;
        const horde = currentHorde();
        const allKill = finalHorde
          ? true
          : (horde?.allKill === true || isGlobalAllKillHorde(state.battleIndex + 1));
        if (!finalHorde) {
          if (allKill) {
            if (!enemiesRemain && pendingPortalSpawns <= 0) handleHordeCleared();
          } else if (timerElapsed || !enemiesRemain) {
            handleHordeCleared();
          }
        } else {
          if (!enemiesRemain && pendingPortalSpawns <= 0) handleHordeCleared();
        }
        break;
      }
    case "hordeCleared": {
      state.timer -= dt;
      const battle = currentBattle();
      const totalHordes = getBattleHordeCount(battle);
      const finalHorde = state.battleIndex + 1 >= totalHordes;
      if (finalHorde && state.timer <= 0 && state.finalHordeDelay > 0) {
        state.finalHordeDelay = Math.max(0, state.finalHordeDelay - dt);
        if (state.finalHordeDelay > 0) break;
      }
      if (state.timer <= 0) {
            if (finalHorde && hasActiveOpponents(true)) break;
            if (finalHorde) {
              handleBattleComplete();
            } else {
              beginHorde();
              spawnActiveHorde();
            }
          }
        break;
      }
        case "battleIntermission":
          state.timer -= dt;
          if (state.timer <= 0) {
            if (state.pendingVisitorMinigame) {
              const resumed = beginVisitorMinigame(() => {
                state.pendingVisitorMinigame = false;
                beginBattle();
              });
              state.pendingVisitorMinigame = false;
              if (resumed) {
                return;
              }
            }
            if (state.monthIndex + 1 >= MONTHS_PER_LEVEL) {
              beginBossIntro();
            } else {
              beginBattle();
            }
          }
          break;
          case "bossIntro":
            state.timer -= dt;
            if (state.timer <= 0) {
              const boss = spawnBossForLevel(state.level);
              if (boss) {
                state.boss = boss;
                resetStage("bossActive");
                setDevStatus("Boss phase 1 engaged", 3.5);
                state.powerUpsEnabled = true;
                if (typeof spawnPowerUpDrops === "function") {
                  spawnPowerUpDrops(1);
                }
              } else {
                onBossDefeated();
              }
            }
            break;
        case "graceRush":
          state.timer -= dt;
          if (state.timer <= 0) {
            state.timer = 0;
            if (state.graceRushFadeTimer <= 0) {
              state.graceRushFadeTimer = GRACE_RUSH_FADE_DURATION;
      if (typeof startGraceRushEndFade === "function") {
        startGraceRushEndFade(GRACE_RUSH_FADE_DURATION);
      }
            }
          }
          if (state.graceRushFadeTimer > 0) {
            state.graceRushFadeTimer = Math.max(0, state.graceRushFadeTimer - dt);
            if (state.graceRushFadeTimer > 0) break;
          }
          if (state.timer <= 0) {
            if (state.graceRushContext === "boss") {
              state.graceRushContext = null;
              if (state.pendingBossRestore) {
                restoreNpcsAfterBoss();
                state.pendingBossRestore = false;
              }
              handleLevelCleared();
            } else {
              state.graceRushContext = null;
              handleBattleComplete();
            }
          }
          break;
          case "bossActive":
            if (state.boss?.defeated) onBossDefeated();
            break;
          case "visitorMinigame":
            // Wait for the mini-game to signal completion via the provided callback.
            break;
          case "levelSummary":
            state.timer -= dt;
            if (state.timer <= 0) {
              beginLevel(state.level + 1);
            }
            break;
          default:
            break;
        }
      },
      notifyEnemyDefeated() {
        state.stats.enemiesDefeated += 1;
      },
      notifyNpcLost(portrait) {
        state.stats.npcsLost += 1;
        state.stats.lostPortraits = state.stats.lostPortraits || [];
        state.stats.lostNames = state.stats.lostNames || [];
        if (portrait) {
          state.stats.lostPortraits.push(portrait);
          // Try to get the NPC name from the portrait object
          let npcName = "";
          if (portrait.npcName) {
            npcName = portrait.npcName;
          } else if (portrait.__npcName) {
            npcName = portrait.__npcName;
          }
          state.stats.lostNames.push(npcName);
          if (state.stats.lostPortraits.length > PORTRAIT_CAP) {
            state.stats.lostPortraits.splice(0, state.stats.lostPortraits.length - PORTRAIT_CAP);
            state.stats.lostNames.splice(0, state.stats.lostNames.length - PORTRAIT_CAP);
          }
        }
        try {
          deps.onNpcLost?.(portrait);
        } catch (e) {}
      },
      notifyNpcSaved(portrait) {
        if (!portrait) return;
        state.stats.savedPortraits = state.stats.savedPortraits || [];
        state.stats.savedNames = state.stats.savedNames || [];
        // avoid duplicate references
        if (!state.stats.savedPortraits.includes(portrait)) {
          state.stats.savedPortraits.push(portrait);
          // Try to get the NPC name from the portrait object
          let npcName = "";
          if (portrait.npcName) {
            npcName = portrait.npcName;
          } else if (portrait.__npcName) {
            npcName = portrait.__npcName;
          }
          state.stats.savedNames.push(npcName);
          if (state.stats.savedPortraits.length > PORTRAIT_CAP) {
            state.stats.savedPortraits.splice(0, state.stats.savedPortraits.length - PORTRAIT_CAP);
            state.stats.savedNames.splice(0, state.stats.savedNames.length - PORTRAIT_CAP);
          }
        }
      },
      attachBoss(boss) {
        state.boss = boss;
      },
      markBossDefeated() {
        if (state.stage === "bossActive") onBossDefeated();
      },
      isActive() {
        return state.active;
      },
      isBossStage() {
        return state.stage === "bossIntro" || state.stage === "bossActive";
      },
      getStatus() {
      const battleNumber = state.monthIndex >= 0 ? state.monthIndex + 1 : 0;
      const hordeNumber = state.battleIndex >= 0 ? state.battleIndex + 1 : 0;
      const localMonthNumber = state.monthIndex >= 0 ? state.monthIndex + 1 : 1;
      const globalMonthNumber = (state.level - 1) * MONTHS_PER_LEVEL + localMonthNumber;
      return {
        level: state.level || 1,
        month: getMonthName(globalMonthNumber),
        battle: battleNumber,
        horde: hordeNumber,
        stage: state.stage,
        bossPhase: state.boss?.phase || 0,
        battleScenario: state.currentBattleScenario,
        bossTheme: state.currentBossTheme,
      };
      },
      getCurrentHorde() {
        return currentHorde();
      },
      getHordeTimer() {
        return state.stage === "hordeActive" ? state.timer : null;
      },
      getLevelNumber() {
        return state.level || 1;
      },
      getStats() {
        return state.stats;
      },
      getLastBattleSummary() {
        return state.lastBattleSummary || null;
      },
      arePowerUpsEnabled() {
        return Boolean(state.powerUpsEnabled);
      },
      acknowledgeAnnouncement() {
        if (typeof state.timer === "number" && state.timer > 0) {
          state.timer = Math.min(state.timer, 0.001);
        }
      },
      devSkipHorde() {
        if (!state.active) return false;
        if (state.stage === "bossActive") {
          devClearOpponents({ includeBoss: true });
          return true;
        }
        if (state.stage === "bossIntro") {
          state.timer = 0;
          return true;
        }
        if (state.stage === "graceRush") {
          state.timer = 0;
          handleBattleComplete();
          return true;
        }
        if (state.stage === "npcArrival") {
          state.awaitingNpcProcession = false;
          beginBattleIntroStage();
          return true;
        }
        if (state.stage === "battleIntermission" || state.stage === "hordeCleared") {
          state.timer = 0;
          return true;
        }
        if (state.stage === "levelIntro" && state.waitingForCongregation) {
          beginBattle();
          return true;
        }
        if (state.battleIndex < 0) {
          beginBattle();
          return true;
        }
  devClearOpponents();
  state.battleIndex = getBattleHordeCount(currentBattle()) - 1;
        state.activeHorde = null;
        handleBattleComplete();
        state.timer = 0;
        return true;
      },
      devSkipBattle() {
        if (!state.active) return false;
        if (state.stage === "bossActive") {
          devClearOpponents({ includeBoss: true });
          return true;
        }
        if (state.stage === "bossIntro") {
          onBossDefeated();
          return true;
        }
        if (state.stage === "graceRush") {
          state.timer = 0;
          handleBattleComplete();
          return true;
        }
        if (state.stage === "npcArrival") {
          state.awaitingNpcProcession = false;
          beginBattleIntroStage();
          return true;
        }
        if (state.stage === "levelIntro" && state.waitingForCongregation) {
          state.waitingForCongregation = false;
          state.battleIndex = MONTHS_PER_LEVEL - 1;
          beginBossIntro();
          state.timer = 0;
          return true;
        }
        if (state.stage === "battleIntermission" || state.stage === "hordeCleared") {
          devClearOpponents();
          state.battleIndex = MONTHS_PER_LEVEL - 1;
          state.battleIndex = getBattleHordeCount(currentBattle()) - 1; // set last horde index
          state.activeHorde = null;
          beginBossIntro();
          state.timer = 0;
          return true;
        }
        devClearOpponents();
        state.battleIndex = MONTHS_PER_LEVEL - 1;
        state.battleIndex = getBattleHordeCount(currentBattle()) - 1; // fallback assignment
        state.activeHorde = null;
        handleBattleComplete();
        state.timer = 0;
        beginBossIntro();
        state.timer = 0;
        return true;
      },
      devSkipToBoss() {
        if (!state.active) return false;
        if (state.stage === "bossActive") {
          devClearOpponents({ includeBoss: true });
          return true;
        }
        devClearOpponents({ includeBoss: true });
        state.monthIndex = MONTHS_PER_LEVEL - 1;
        state.battleIndex = getBattleHordeCount(currentBattle()) - 1;
        beginBossIntro();
        state.timer = 0;
        return true;
      },
      devSkipToGraceRush() {
        if (!state.active) {
          beginLevel(1);
        }
        devClearOpponents({ includeBoss: true });
        state.activeHorde = null;
        state.pendingPortalSpawnBaseline = 0;
        state.finalHordeDelay = 0;
        if (state.monthIndex < 0) state.monthIndex = 0;
        if (state.battleIndex < 0) {
          state.battleIndex = getBattleHordeCount(currentBattle()) - 1;
        }
        const localMonthNumber = state.monthIndex >= 0 ? state.monthIndex + 1 : 1;
        const monthName = getMonthName((state.level - 1) * MONTHS_PER_LEVEL + localMonthNumber);
        beginGraceRushPhase(monthName);
        return true;
      },
      advanceFromCongregation,
    };
  }

  window.Levels = Object.assign(window.Levels || {}, {
    initialize,
    createLevelManager,
  });
})(typeof window !== "undefined" ? window : null);
