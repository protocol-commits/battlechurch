/* Level progression manager for Battlechurch */
(function setupLevelsModule(window) {
  if (!window) return;

  const levelData =
    (typeof window !== 'undefined' && window.BattlechurchLevelData) || {};
  const congregationDialogue =
    (typeof window !== "undefined" && window.BattlechurchCongregationDialogue) || {};
  const HORDE_ENEMY_POOLS = levelData.hordeEnemyPools || [];
  const levelBuilder = (typeof window !== "undefined" && window.BattlechurchLevelBuilder) || null;
  const HERO_ENCOURAGEMENT_LINES = levelData.heroEncouragementLines || [];
  const NPC_AGREEMENT_LINES = levelData.npcAgreementLines || [];
  const CONGREGATION_WAVE_INTRO = congregationDialogue.waveIntro || {};
  const BATTLE_SCENARIOS = levelData.battleScenarios || [];
  function getAvailableBattleScenarios() {
    if (Array.isArray(BATTLE_SCENARIOS) && BATTLE_SCENARIOS.length) {
      return BATTLE_SCENARIOS;
    }
    const runtimeTitles =
      ((typeof window !== "undefined" && window.BattlechurchMissionBrief?.scenarios) || [])
        .map((entry) => (typeof entry?.title === "string" ? entry.title.trim() : ""))
        .filter(Boolean);
    return runtimeTitles;
  }
  let _battleScenarioPool = [];
  function pickNextBattleScenario() {
    const all = getAvailableBattleScenarios();
    if (!all.length) return null;
    if (!_battleScenarioPool.length) {
      // Refill and Fisher-Yates shuffle
      _battleScenarioPool = all.slice();
      for (let i = _battleScenarioPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [_battleScenarioPool[i], _battleScenarioPool[j]] = [_battleScenarioPool[j], _battleScenarioPool[i]];
      }
    }
    return _battleScenarioPool.pop();
  }
  const BATTLE_SCENARIO_WAVE_ARCS = Object.freeze({
    "death of a close family member": [
      "Shock and Numbness",
      "Waves of Grief",
      "Holding On in Grief with Steady Trust",
    ],
    "death of a spouse": [
      "Grief and Emptiness",
      "Role Loss and Loneliness",
      "Holding On in Faith While Relearning Life",
    ],
    "divorce": [
      "Acute Grief",
      "Rejection Wounds and Future Fear",
      "Fighting Forward in Trust Toward Healing and Peace",
    ],
    "ongoing marital conflict": [
      "Escalating Tension",
      "Emotional Exhaustion",
      "Standing Firm in Faith for Repair and Forgiveness",
    ],
    "loss of a job": [
      "Panic and Loss of Security",
      "Vocational Shame and Self-Doubt",
      "Fighting Forward in Faith for New Direction",
    ],
    "long-term unemployment": [
      "Discouragement Loop",
      "Identity Erosion and Hopelessness",
      "Fighting in Faith with Renewed Hope",
    ],
    "severe financial hardship": [
      "Financial Anxiety and Decision Fatigue",
      "Fear of Not Having Enough",
      "Fighting in Trust for Daily Provision",
    ],
    "foreclosure or loss of a home": [
      "Shock and Disorientation",
      "Displacement Grief and Rootlessness",
      "Fighting in Faith for Shelter and Steady Ground",
    ],
    "chronic illness": [
      "Weariness and Uncertainty",
      "Fatigue and Frustration",
      "Holding On in Trust for Strength Today",
    ],
    "caring for a terminally ill loved one": [
      "Anticipatory Grief",
      "Caregiver Burnout",
      "Holding On in Faith with Meaningful Presence",
    ],
    "mental health struggles": [
      "Racing Thoughts and Emotional Numbness",
      "Isolation Spiral",
      "Holding On in Trust for Light and Help",
    ],
    "addiction": [
      "Cravings and Triggers",
      "Guilt, Shame, and Self-Condemnation",
      "Fighting in Faith for Recovery and Integrity",
    ],
    "relapse after recovery": [
      "Setback Shock and Relapse Despair",
      "Shame and Self-Condemnation",
      "Fighting Back in Trust Toward Restoration",
    ],
    "caring for an aging parent": [
      "Role Reversal Grief and Overwhelm",
      "Compassion Fatigue",
      "Fighting in Trust for Grace in Daily Care",
    ],
    "parenting a child with special needs": [
      "Constant Vigilance and Emotional Exhaustion",
      "Decision Fatigue and Advocacy Burnout",
      "Fighting in Faith for Sustainable Support",
    ],
    "parenting a troubled child": [
      "Inner Turmoil and Relational Conflict",
      "Helplessness and Heartbreak",
      "Fighting in Trust with Patient Hope",
    ],
    "betrayal by a close friend": [
      "Shock and Anger",
      "Mistrust and Bitterness",
      "Holding On in Faith with Forgiveness and Boundaries",
    ],
    "deep loneliness": [
      "Silent Isolation",
      "Rejection Fear and Self-Worth Doubt",
      "Holding On in Trust for Belonging",
    ],
    "workplace hostility": [
      "Moral Injury and Chronic Stress",
      "Fear and Hypervigilance",
      "Standing Firm in Faith with Courage and Clarity",
    ],
  });
  const BOSS_BATTLE_THEMES = levelData.bossBattleThemes || [];
  const BOSS_PASTOR_PROBLEMS =
    levelData.bossPastorProblems || [
      "Burnout and spiritual exhaustion",
      "Carrying grief while still leading others",
      "Leading through conflict without losing compassion",
      "Feeling isolated under the weight of responsibility",
      "Resisting pride and despair at the same time",
      "Holding faith steady through relentless opposition",
    ];
  const HORDE_CLEAR_LINES = levelData.hordeClearLines || [];


  // Hierarchy: TOWNS -> BATTLES -> MISSIONS -> WAVES -> HORDES
  const DISTRICTS_PER_GAME =
    levelData?.structure?.towns ?? levelData?.structure?.levels ?? 4;
  // Final campaign level — matches total towns so epilogue fires after completing the capital
  const FINAL_CAMPAIGN_LEVEL = DISTRICTS_PER_GAME;
  const BATTLES_PER_DISTRICT =
    levelData?.structure?.battlesPerTown ?? levelData?.structure?.monthsPerLevel ?? 3;
  const MISSIONS_PER_BATTLE =
    levelData?.structure?.missionsPerBattle ?? levelData?.structure?.battlesPerMonth ?? 1;
  const WAVES_PER_MISSION = levelData?.structure?.defaultWavesPerMission ?? 3;
  const HORDES_PER_WAVE = levelData?.structure?.defaultHordesPerWave ?? 7;
  // Legacy aliases kept for external consumers (game.js, etc.)
  const LEVELS_PER_GAME = DISTRICTS_PER_GAME;
  const MONTHS_PER_LEVEL = BATTLES_PER_DISTRICT;
  const BATTLE_MONTHS_PER_LEVEL = Math.max(1, BATTLES_PER_DISTRICT);
  const HORDES_PER_BATTLE = HORDES_PER_WAVE * WAVES_PER_MISSION;
  const STAGE_LABEL = "Mission";
  const BETWEEN_BATTLE_PAUSE = 3;
  const BETWEEN_WAVE_PAUSE = 2.3;
  const LEVEL_INTRO_DURATION = 2.6;
  const BATTLE_INTRO_DURATION = 3.0;
  const WAVE_INTRO_DURATION = 3.8;
  const FIRST_WAVE_INTRO_DURATION = 5.0;
  const WAVE_CLEAR_DURATION = 2.2;
  const ANNOUNCEMENT_FADE_DURATION = 1.5;
  const GRACE_RUSH_DURATION = 8;
  const BOSS_GRACE_RUSH_DURATION = 10;
  const BOSS_VICTORY_CELEBRATE_DURATION = 12.0;
  const BOSS_BONUS_TRANSITION_DURATION = 1.0;
  const LEVEL_SUMMARY_DURATION = 5;
  const PORTRAIT_CAP = 24; // how many portraits to keep in cumulative stats (was 12)
  const CONGREGATION_SCREEN_DURATION = 4.0;
  const BRIEF_TEASER_DURATION = 5.0;
  const CONGREGATION_TO_TEASER_DURATION = 1.6;
  const UPGRADE_TO_TEASER_DURATION = 1.6;
  const MISSION_INTRO_DELAY = 2.0;
  const MISSION_INTRO_FADE_IN = 0.45;
  const MISSION_INTRO_FADE_OUT = 0.45;
  const MISSION_INTRO_HOLD_SECONDS = 0.8;
  const MISSION_INTRO_FADE_TOTAL = MISSION_INTRO_FADE_IN + MISSION_INTRO_FADE_OUT + MISSION_INTRO_HOLD_SECONDS;
  const MISSION_INTRO_PRE_FADE_DELAY = 1.0;
  const MISSION_INTRO_MESSAGE_LEAD = 0.5;
  const MISSION_INTRO_MESSAGE = "Wave Cleared";
  const MISSION_INTRO_ANNOUNCEMENT_EXTRA = 1.0;
  const WAVE_INTENSITY_TRANSITION_SECONDS = 0.5;
  const WAVE_INTRO_LINGER_BONUS = 4.2;
  const WAVE_INTRO_FADE_OUT_DURATION = 0.6;
  const VICTORY_CELEBRATE_DURATION = 5.0;
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
  if (typeof window !== "undefined") {
    window.MONTHS_PER_LEVEL = MONTHS_PER_LEVEL;       // legacy alias
    window.LEVELS_PER_GAME = LEVELS_PER_GAME;         // legacy alias
    window.BATTLES_PER_DISTRICT = BATTLES_PER_DISTRICT;
    window.MISSIONS_PER_BATTLE = MISSIONS_PER_BATTLE;
    window.DISTRICTS_PER_GAME = DISTRICTS_PER_GAME;
    window.STAGE_LABEL = STAGE_LABEL;
  }

  function getDevConfig() {
    // Prefer the builder's in-memory config (includes unsaved edits) when available.
    if (typeof levelBuilder?.getConfig === "function") {
      try {
        const builderCfg = levelBuilder.getConfig();
        if (builderCfg && typeof builderCfg === "object" && Object.keys(builderCfg).length) {
          return builderCfg;
        }
      } catch (e) {}
    }
    // Fall back to the static exported file.
    if (levelData && typeof levelData === "object" && Object.keys(levelData).length) {
      return levelData;
    }
    // Last resort: direct localStorage.
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

  // getScopeConfig(districtIdx, battleIdx, missionIdx, waveIdx, hordeIdx)
  // Supports v2 keys (towns/battles/missions/waves) with v1 fallback (levels/months/battles/hordes).
  // waveIdx is 0-based and targets the specific wave; pass null to search all waves (v1 compat).
  function getScopeConfig(districtIdx, battleIdx, missionIdx, waveIdx = null, hordeIdx = null) {
    const cfg = getDevConfig();
    if (!cfg) return {};
    const districtList = Array.isArray(cfg.districts) ? cfg.districts
      : (Array.isArray(cfg.towns) ? cfg.towns
      : (Array.isArray(cfg.levels) ? cfg.levels : []));
    const districtCfg = districtList.find((t) => t?.index === districtIdx);
    if (!districtCfg) return {};
    const battleList = Array.isArray(districtCfg.battles) ? districtCfg.battles
      : (Array.isArray(districtCfg.months) ? districtCfg.months : []);
    const battle = battleList.find((b) => b?.index === battleIdx)
      || (battleList.length ? battleList[0] : null);
    const missionList = Array.isArray(battle?.missions) ? battle.missions
      : (Array.isArray(battle?.battles) ? battle.battles : []);
    const mission = missionList.find((m) => m?.index === missionIdx)
      || (missionList.length ? missionList[0] : null);
    let horde = null;
    if (hordeIdx != null) {
      if (Array.isArray(mission?.waves)) {
        if (waveIdx != null) {
          // v2: target the specific wave by index to avoid index collisions across waves
          const targetWave = mission.waves[waveIdx];
          horde = targetWave?.hordes?.find((h) => h?.index === hordeIdx) || null;
        } else {
          // fallback: scan all waves (used when wave index is unavailable)
          for (const wave of mission.waves) {
            const found = wave.hordes?.find((h) => h?.index === hordeIdx);
            if (found) { horde = found; break; }
          }
        }
      } else if (Array.isArray(mission?.hordes)) {
        // v1 fallback: hordes directly on mission/battle
        horde = mission.hordes.find((h) => h?.index === hordeIdx) || null;
      } else if (Array.isArray(battle?.hordes)) {
        horde = battle.hordes.find((h) => h?.index === hordeIdx) || null;
      }
    }
    // Keep legacy aliases (level, month) so callers using the old names still work.
    return { cfg, district: districtCfg, level: districtCfg, battle, month: battle, mission, horde };
  }

  function resolveValue(scope, key) {
    const { horde, mission, battle, district, cfg } = scope;
    if (horde    && horde[key]    !== undefined) return horde[key];
    if (mission  && mission[key]  !== undefined) return mission[key];
    if (battle   && battle[key]   !== undefined) return battle[key];
    if (district && district[key] !== undefined) return district[key];
    if (cfg && cfg.globals && cfg.globals[key] !== undefined) return cfg.globals[key];
    return undefined;
  }

  function resolveHordeCount(districtIdx, battleIdx, missionIdx, fallback) {
    const scope = getScopeConfig(districtIdx, battleIdx, missionIdx, null);
    const val = resolveValue(scope, "hordesPerBattle");
    if (Number.isFinite(val) && val > 0) return val;
    const defaultHpw = scope.cfg?.structure?.defaultHordesPerWave;
    if (Number.isFinite(defaultHpw) && defaultHpw > 0) return defaultHpw * WAVES_PER_MISSION;
    return fallback;
  }

  function getBattleHordeCount(mission) {
    if (Array.isArray(mission?.waves)) {
      return mission.waves.reduce((sum, w) => sum + (w.hordes?.length || 0), 0);
    }
    return Array.isArray(mission?.hordes) && mission.hordes.length
      ? mission.hordes.length
      : HORDES_PER_BATTLE;
  }

  function getBattleWaveCount(mission) {
    if (Array.isArray(mission?.waves) && mission.waves.length) {
      return mission.waves.length;
    }
    if (Array.isArray(mission?.hordes) && mission.hordes.length) {
      let maxWave = 0;
      mission.hordes.forEach((horde) => {
        if (Number.isFinite(horde?.waveNumber)) {
          maxWave = Math.max(maxWave, horde.waveNumber);
        }
      });
      if (maxWave > 0) return maxWave;
      return Math.max(
        1,
        Math.ceil(mission.hordes.length / Math.max(1, HORDES_PER_WAVE)),
      );
    }
    return Math.max(1, Number(WAVES_PER_MISSION) || 1);
  }

  function normalizeScenarioKey(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[.!?]+$/g, "");
  }

  function getWaveArcForScenario(scenarioTitle, waveCount = 3) {
    const defaultArc = [
      "Facing the Weight",
      "Holding Through the Strain",
      "Choosing the Next Step",
    ];
    const key = normalizeScenarioKey(scenarioTitle);
    const base = Array.isArray(BATTLE_SCENARIO_WAVE_ARCS[key])
      ? [...BATTLE_SCENARIO_WAVE_ARCS[key]]
      : [...defaultArc];
    const safeCount = Math.max(1, Number(waveCount) || 1);
    while (base.length < safeCount) {
      base.push("Staying the Course");
    }
    return base.slice(0, safeCount);
  }

  function applyWaveArcToBattleHordes(hordes, scenarioTitle) {
    if (!Array.isArray(hordes) || !hordes.length) return;
    const firstHordeByWave = new Map();
    for (let i = 0; i < hordes.length; i += 1) {
      const horde = hordes[i];
      const waveNum = Number.isFinite(horde?.waveNumber)
        ? Math.max(1, Math.floor(horde.waveNumber))
        : Math.floor(i / Math.max(1, HORDES_PER_WAVE)) + 1;
      if (!firstHordeByWave.has(waveNum)) {
        firstHordeByWave.set(waveNum, horde);
      }
    }
    const waveNumbers = Array.from(firstHordeByWave.keys()).sort((a, b) => a - b);
    const waveLabels = getWaveArcForScenario(scenarioTitle, waveNumbers.length);
    waveNumbers.forEach((waveNum, idx) => {
      const firstHorde = firstHordeByWave.get(waveNum);
      if (!firstHorde) return;
      firstHorde.waveIntroText = `Wave ${waveNum}: ${waveLabels[idx]}`;
    });
  }

  const deps = {
    enemies: [],
    npcs: [],
    randomChoice: fallbackRandomChoice,
    randomInRange: fallbackRandomInRange,
    queueLevelAnnouncement: noop,
    setDevStatus: noop,
    getMonthName: () => "Battle 1",
    spawnEnemyOfType: noop,
    spawnMiniImpGroup: noop,
    spawnEnemyGroup: noop,
    schedulePortalSpawn: noop,
    randomSpawnPosition: null,
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
    getConversationResponders: () => [],
    startMissionIntroFade: noop,
    startGraceRushEndFade: noop,
    getAvailableMiniFolkKeys: () => [],
    hasEnemyAsset: () => true,
    miniImpBaseGroupSize: 48,
    miniImpMaxGroupSize: 120,
    miniImpMinGroupsPerHorde: 1,
    getScore: () => 0,
    startVisitorMinigame: () => false,
    triggerCongregationOverlay: noop,
    getCongregationSize: () => 0,
    showWaveHealthSnapshot: noop,
    showBattleVictoryNpcDialogue: noop,
    playBattleVictoryMusic: noop,
    playWaveTransitionSfx: noop,
    startBossBonusTransition: noop,
  };

  function initialize(options = {}) {
    Object.assign(deps, options || {});
    if (!Array.isArray(deps.enemies)) deps.enemies = [];
    if (!Array.isArray(deps.npcs)) deps.npcs = [];
    if (typeof deps.randomChoice !== "function") deps.randomChoice = fallbackRandomChoice;
    if (typeof deps.randomInRange !== "function") deps.randomInRange = fallbackRandomInRange;
    if (typeof deps.getScore !== "function") deps.getScore = () => 0;
  }

  function getMissionCountForTown(definition) {
    const count = Number(definition?.battles?.length);
    if (Number.isFinite(count) && count > 0) return count;
    return Math.max(1, Number(BATTLES_PER_DISTRICT) || 1);
  }

  function getMissionOrdinalForMonthIndex(monthIndex) {
    if (!Number.isFinite(monthIndex) || monthIndex < 0) return 1;
    return monthIndex + 1;
  }

  function clearStagePowerUps({ keepGrace = false } = {}) {
    if (typeof deps.clearPowerUps === "function") {
      try {
        deps.clearPowerUps();
      } catch (err) {
        console.warn && console.warn("clearPowerUps hook failed", err);
      }
    }
    if (!keepGrace && typeof deps.clearGrace === "function") {
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

  // Applies campaign difficulty scaling to enemy entries.
  // Normal enemies: count × multiplier. Armored/tank: health multiplied via healthMultiplier tag.
  function applyEnemyScaling(entries, multiplier) {
    if (!multiplier || multiplier === 1.0 || !Array.isArray(entries)) return entries;
    const catalog = (typeof window !== "undefined" && window.BattlechurchEnemyCatalog?.catalog) || {};
    return entries.map((entry) => {
      const def = catalog[entry.type];
      const damageClass = def?.damageClass || "normal";
      const isArmored = damageClass === "armored" || damageClass === "tank";
      if (isArmored) {
        return { ...entry, healthMultiplier: multiplier };
      }
      return { ...entry, count: Math.max(1, Math.round(entry.count * multiplier)) };
    });
  }

  // createHordeDefinition(level, battle, mission, wave, horde, helpers) — all indices are 0-based
  // waveIndex is 0-based; pass null for v1/procedural paths where waves don't exist.
  function createHordeDefinition(levelNumber, battleIndex, missionIndex, waveIndex, hordeIndex, helpers) {
    const {
      randomChoice,
      randomInRange,
      miniImpBaseGroupSize,
      miniImpMaxGroupSize,
      miniImpMinGroupsPerHorde,
      selectEnemyType,
    } = helpers;

    const difficultyRating = levelNumber + battleIndex * 0.75 + missionIndex * 0.45;
    const baseCount = 40 + Math.round(difficultyRating * 8);
    const maxCount = 180 + Math.round(levelNumber * 12);

    let miniImpGroupCount =
      miniImpMinGroupsPerHorde +
      Math.max(0, Math.floor((levelNumber - 1) / 2)) +
      Math.max(0, Math.floor(battleIndex / 2)) +
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
    const scope = getScopeConfig(levelNumber, battleIndex + 1, missionIndex + 1, waveIndex, hordeIndex + 1);
    const hidden = getHiddenSet();
    const defaultDuration =
      resolveValue(scope, "duration") ??
      (scope.cfg?.structure && scope.cfg.structure.defaultHordeDuration);
    const durationSeconds = Number.isFinite(defaultDuration)
      ? defaultDuration
      : Math.max(10, 14 + Math.round(difficultyRating * 2));
    const resolvedAllKill = scope.horde?.allKill === true;

    // Collect builder overrides (weighted + explicit can both apply)
    const explicitEntries = Array.isArray(scope.horde?.entries)
      ? scope.horde.entries
          // Explicitly placed entries should always spawn, even if the enemy
          // is globally hidden from procedural pools.
          .filter((e) => e && e.enemy)
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
        enemies: applyEnemyScaling(mergedExplicitWeighted, helpers.campaignMultiplier),
        powerUps: 1 + Math.floor(difficultyRating / 2),
        duration: durationSeconds,
        allKill: resolvedAllKill,
      };
    }

    // When a level config horde exists but has no entries, fall through
    // to procedural generation so new/empty hordes still spawn enemies.

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
        enemies: applyEnemyScaling(combinedEntries, helpers.campaignMultiplier),
        powerUps: 1 + Math.floor(difficultyRating / 2),
        duration: durationSeconds,
        allKill: resolvedAllKill,
      };
    }

  function buildLevelDefinition(levelNumber, helpers) {
    const cfg = getDevConfig();
    // v2: towns[]; v1 fallback: levels[]
    const districtData = cfg?.districts?.find((t) => t.index === levelNumber)
      || cfg?.towns?.find((t) => t.index === levelNumber)
      || cfg?.levels?.find((l) => l.index === levelNumber);
    // The level manager iterates battles[] sequentially using state.monthIndex.
    // Each mission in the data becomes one battle entry here so the level manager
    // doesn't need to know about the town→battle→mission→wave nesting.
    const battles = [];
    const rawBattleCount = districtData?.battles?.length
      || districtData?.months?.length
      || BATTLE_MONTHS_PER_LEVEL;
    const numBattles = Math.max(
      1,
      Math.min(
        Math.max(1, Number(BATTLES_PER_DISTRICT) || 1),
        Math.max(1, Number(rawBattleCount) || 1),
      ),
    );
    for (let bIdx = 0; bIdx < numBattles; bIdx += 1) {
      const battleData = districtData?.battles?.[bIdx] || districtData?.months?.[bIdx];
      const missionList = Array.isArray(battleData?.missions) ? battleData.missions
        : (Array.isArray(battleData?.battles) ? battleData.battles : []);
      const configuredMissionsPerBattle = Math.max(1, Math.floor(Number(MISSIONS_PER_BATTLE) || 1));
      const numMissions = Math.max(
        1,
        Math.min(
          configuredMissionsPerBattle,
          missionList.length || configuredMissionsPerBattle,
        ),
      );
      for (let mIdx = 0; mIdx < numMissions; mIdx += 1) {
        const missionData = missionList[mIdx];
        const hordes = [];
        if (Array.isArray(missionData?.waves) && missionData.waves.length) {
          // v2: flatten waves → hordes for the game engine
          for (let wIdx = 0; wIdx < missionData.waves.length; wIdx += 1) {
            const wave = missionData.waves[wIdx];
            const waveHordes = wave.hordes || [];
            for (let wHIdx = 0; wHIdx < waveHordes.length; wHIdx += 1) {
              const h = waveHordes[wHIdx];
              // h.index is 1-based; createHordeDefinition expects 0-based
              // Pass wIdx so getScopeConfig looks only within the correct wave
              const def = createHordeDefinition(levelNumber, bIdx, mIdx, wIdx, h.index - 1, helpers);
              def.missionNumber = bIdx + 1;
              def.battleNumber = mIdx + 1;
              def.waveNumber = wIdx + 1;
              def.hordeInWave = wHIdx + 1;
              // Tag the first horde of each wave with the wave's intro text
              if (wHIdx === 0 && wave.introText) {
                def.waveIntroText = wave.introText;
              }
              // Last horde of each wave is always an all-kill
              const isLastHordeInWave = wHIdx === waveHordes.length - 1;
              if (isLastHordeInWave) {
                def.allKill = true;
              }
              // Tag allKill hordes with the wave's breaker duration
              if (def.allKill && wave.breakerDuration != null) {
                def.waveBreakDuration = Number(wave.breakerDuration) || 3;
              }
              hordes.push(def);
            }
          }
        } else if (Array.isArray(missionData?.hordes) && missionData.hordes.length) {
          // v1 fallback: hordes directly on mission/battle (h.index is 1-based, no wave index)
          for (const h of missionData.hordes) {
            hordes.push(createHordeDefinition(levelNumber, bIdx, mIdx, null, h.index - 1, helpers));
          }
        } else {
          // procedural fallback: no explicit config (hIdx is 0-based)
          const count = resolveHordeCount(levelNumber, bIdx + 1, mIdx + 1, HORDES_PER_BATTLE);
          for (let hIdx = 0; hIdx < count; hIdx += 1) {
            hordes.push(createHordeDefinition(levelNumber, bIdx, mIdx, null, hIdx, helpers));
          }
        }
        battles.push({ hordes }); // each mission = one sequential battle for the level manager
      }
    }
    if (typeof console !== "undefined" && console.log) {
      console.log(`[LevelDef] Town ${levelNumber}: ${battles.length} sequential game battles`);
      battles.forEach((b, i) => {
        const h0 = b.hordes?.[0];
        console.log(`  Game Battle ${i + 1} → editor Mission ${h0?.missionNumber ?? '?'}, Battle ${h0?.battleNumber ?? '?'} (${b.hordes?.length ?? 0} hordes)`);
      });
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
      spawnEnemyGroup,
      randomSpawnPosition,
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
      getConversationResponders,
      startMissionIntroFade,
      startGraceRushEndFade,
      playWaveTransitionSfx,
      getAvailableMiniFolkKeys,
      hasEnemyAsset,
    miniImpBaseGroupSize,
    miniImpMaxGroupSize,
    miniImpMinGroupsPerHorde,
    schedulePortalSpawn,
    enemySpawnStaggerMs = 80,
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
      campaignMultiplier: (typeof window !== "undefined" && Number.isFinite(window.activeCampaignMultiplier))
        ? window.activeCampaignMultiplier
        : 1.0,
    };
    helperConfig.selectEnemyType = (levelNumber, tier) =>
      selectHordeEnemyType(levelNumber, tier, helperConfig);
    const state = {
      active: false,
      level: 0,
      monthIndex: -1, // was battleIndex
      waveIndex: -1, // tracks current wave within a mission (was battleIndex/hordeIndex)
      stage: "idle",
      timer: 0,
      stageDuration: 0,
      definition: null,
      activeWave: null,
      boss: null,
      stats: {
        enemiesDefeated: 0,
        damageDealt: 0,
        npcsRescued: 0,
        npcsLost: 0,
        lostPortraits: [],
        savedPortraits: [],
      },
      battleEnemiesStart: 0,
      battleMaxCombo: 0,
      battlePrayerBombContributions: [],
      battlePrayerBombComboContributions: [],
      lastBattleSummary: null,
      graceRushFadeTimer: 0,
      conversationQueue: [],
      currentBattleScenario: "",
      currentBattleScenarioVictoryPhrase: null,
      currentBossTheme: "",
      currentBossProblem: "",
      battleNpcStartCount: 0,
      battleStartCongregation: 0,
      battleNpcRoster: [],
      battleLostRecords: [],
      waitingForCongregation: false,
      awaitingNpcProcession: false,
      visitorMinigamePlayed: false,
      pendingVisitorMinigame: false,
      visitorResumeAction: null,
      finalWaveDelay: 0,
      pendingPortalSpawnBaseline: 0,
      pendingWaveEntrySpawns: 0,
      graceRushContext: null,
      pendingBossRestore: false,
      pendingBossAfterFinalWave: false,
      pendingGraceRushAfterFinalWave: false,
      npcRushActive: false,
      npcRushTimer: 0,
      powerUpsEnabled: false,
      lastClearedWasBoss: false,
      skipPostBattleAdvance: false,
      breakPreviewWaveNum: null,
      lastWaveTransitionCueNum: 0,
      waveSpawnEpoch: 0,
      pendingUpgradeToTeaser: false,
      queuedWaveIntroIndices: new Set(),
    };

    function resetStage(stage, duration = 0) {
      state.stage = stage;
      state.timer = duration;
      state.stageDuration = duration;
      state.conversationQueue.length = 0;
      state.breakPreviewWaveNum = null;
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

    function currentWave() {
      const battle = currentBattle();
      if (!battle) return null;
      return battle.hordes[state.waveIndex] || null;
    }

    function getActualWaveNumber(horde, waveIndex = state.waveIndex) {
      if (Number.isFinite(horde?.waveNumber)) return horde.waveNumber;
      if (!Number.isFinite(waveIndex) || waveIndex < 0) return 0;
      return Math.floor(waveIndex / Math.max(1, HORDES_PER_WAVE)) + 1;
    }

    function playWaveTransitionCue(waveNum) {
      if (!Number.isFinite(waveNum) || waveNum <= 1) return;
      if (state.lastWaveTransitionCueNum === waveNum) return;
      state.lastWaveTransitionCueNum = waveNum;
      if (typeof playWaveTransitionSfx === "function") {
        playWaveTransitionSfx();
      }
    }

    function scheduleWaveTransitionCue(waveNum, delaySeconds = 0) {
      const delayMs = Math.max(0, (Number(delaySeconds) || 0) * 1000);
      if (delayMs > 0 && typeof setTimeoutFn === "function") {
        setTimeoutFn(() => {
          // Don't play if battle context has moved on.
          if (
            state.stage !== "waveIntro" &&
            state.stage !== "allKillBreak" &&
            state.stage !== "waveActive"
          ) {
            return;
          }
          playWaveTransitionCue(waveNum);
        }, delayMs);
        return;
      }
      playWaveTransitionCue(waveNum);
    }

    function getWaveIntroAnnouncementOptions(holdDuration, { transitionDelayConsumed = false } = {}) {
      const baseDuration = Math.max(1, Number(holdDuration) || 0);
      const adjustedDuration = transitionDelayConsumed
        ? baseDuration - WAVE_INTENSITY_TRANSITION_SECONDS
        : baseDuration;
      return {
        duration: Math.max(3.4, adjustedDuration + WAVE_INTRO_LINGER_BONUS),
        fadeOutDuration: WAVE_INTRO_FADE_OUT_DURATION,
        skipMissionBrief: true,
      };
    }

    function queueWaveIntroAnnouncementForWave(waveDef, waveIndex, holdDuration, options = {}) {
      const introText = waveDef?.waveIntroText || "";
      if (!introText) return false;
      const normalizedWaveIndex = Number.isFinite(waveIndex) ? Math.max(0, Math.floor(waveIndex)) : -1;
      if (normalizedWaveIndex >= 0 && state.queuedWaveIntroIndices.has(normalizedWaveIndex)) {
        return false;
      }
      queueLevelAnnouncement(
        introText,
        "",
        {
          ...getWaveIntroAnnouncementOptions(holdDuration, {
            transitionDelayConsumed: Boolean(options.transitionDelayConsumed),
          }),
          ...(typeof options.eyebrowText === "string" && options.eyebrowText.trim().length
            ? { eyebrowText: options.eyebrowText.trim() }
            : {}),
        },
      );
      if (normalizedWaveIndex >= 0) {
        state.queuedWaveIntroIndices.add(normalizedWaveIndex);
      }
      return true;
    }

    function hasActiveOpponents(includeBoss = true) {
      const activeEnemies = enemies.some((enemy) => !enemy.dead && enemy.state !== "death");
      const bossAlive =
        includeBoss && state.boss && !state.boss.dead && !state.boss.removed && !state.boss.defeated;
      return activeEnemies || bossAlive;
    }

    function beginLevel(levelNumber, options = {}) {
      const totalEnemiesDefeated = state.stats?.enemiesDefeated || 0;
      state.level = levelNumber;
      state.monthIndex = -1;
      state.waveIndex = -1;
      state.definition = buildLevelDefinition(levelNumber, helperConfig);
      state.active = true;
      state.boss = null;
      state.stats = {
        enemiesDefeated: totalEnemiesDefeated,
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
      state.pendingBossAfterFinalWave = false;
      state.pendingGraceRushAfterFinalWave = false;
      state.lastWaveTransitionCueNum = 0;
      state.queuedWaveIntroIndices.clear();
      state.lastClearedWasBoss = false;
      state.pendingUpgradeToTeaser = false;
  const skipIntroAnnouncement =
    Boolean(options && options.skipIntroAnnouncement) ||
    Boolean(typeof window !== "undefined" && window.__skipInitialMonthAnnouncement);
  if (skipIntroAnnouncement && typeof window !== "undefined") {
    window.__skipInitialMonthAnnouncement = false;
  }
  if (!skipIntroAnnouncement) {
    const actRomanNumerals = { 1: 'I', 2: 'II', 3: 'III' };
    const actLabel = `Mission ${actRomanNumerals[levelNumber] || levelNumber}`;
    console.info && console.info('queueAnnouncement', { title: actLabel, level: levelNumber });
    queueLevelAnnouncement(actLabel, "A new battle begins", {
          duration: CONGREGATION_SCREEN_DURATION,
          requiresConfirm: true,
        });
    resetStage("levelIntro", CONGREGATION_SCREEN_DURATION);
    setDevStatus(`Preparing ${actLabel}`, CONGREGATION_SCREEN_DURATION);
  } else {
    resetStage("levelIntro", 0);
    setDevStatus(`Preparing Mission ${levelNumber}`, 2.0);
  }
      state.currentBattleScenario = "";
      state.currentBossTheme = "";
      state.currentBossProblem = "";
      buildCongregationMembers();
    }

    function beginBattle() {
      const comingFromBriefTeaser = state.stage === "briefingTeaser";
      clearStagePowerUps();
      finishNpcRush();
      state.waitingForCongregation = false;
      clearCongregationMembers();
      // Hard-reset per-battle transition flags so grace rush flow never
      // inherits stale post-boss/post-final-wave state.
      state.graceRushContext = null;
      state.pendingBossAfterFinalWave = false;
      state.pendingGraceRushAfterFinalWave = false;
      state.graceRushFadeTimer = 0;
      state.monthIndex += 1;
      state.waveIndex = -1;
      state.lastWaveTransitionCueNum = 0;
      state.queuedWaveIntroIndices.clear();
      state.battleEnemiesStart = state.stats?.enemiesDefeated || 0;
      state.battleMaxCombo = 0;
      state.battlePrayerBombContributions = [];
      state.battlePrayerBombComboContributions = [];
  const battleNumber = state.monthIndex + 1;
  const localMonthNumber = state.monthIndex >= 0 ? state.monthIndex + 1 : 1;
  const globalMonthNumber = (state.level - 1) * MONTHS_PER_LEVEL + localMonthNumber;
  const monthName = getMonthName(globalMonthNumber);
  state.battleStartCongregation =
    typeof deps.getCongregationSize === "function" ? deps.getCongregationSize() : 0;
  if (!comingFromBriefTeaser) {
    resetCozyNpcs(5);
  }
  state.battleLostRecords = [];
  state.battleNpcRoster = Array.isArray(npcs)
    ? npcs.slice(0, 5).map((npc, index) => {
        if (npc) npc.__battleRosterIndex = index;
        let portrait = null;
        try {
          portrait = typeof captureNpcPortrait === "function" ? captureNpcPortrait(npc) : null;
        } catch (e) {}
        return {
          index,
          name: npc?.name || "",
          portrait,
        };
      })
    : [];
  // Sometimes resetCozyNpcs may not synchronously populate `npcs` before
  // this line runs (depending on integration points). Use a sensible
  // fallback of 5 so summaries reflect the expected battle baseline.
  const detected = npcs.filter((npc) => !npc.departed && npc.active).length;
  state.battleNpcStartCount = detected > 0 ? detected : 5;
      const pickedScenario = pickNextBattleScenario();
      state.currentBattleScenario =
        typeof pickedScenario === "string"
          ? pickedScenario
          : (typeof pickedScenario?.title === "string" ? pickedScenario.title : "Mental health struggles");
      state.currentBattleScenarioVictoryPhrase =
        typeof pickedScenario === "object" && typeof pickedScenario?.victoryPhrase === "string"
          ? pickedScenario.victoryPhrase
          : null;
      const battleHordes = currentBattle()?.hordes;
      applyWaveArcToBattleHordes(battleHordes, state.currentBattleScenario);
  // Show Level + Month name instead of literal 'Battle N'
  const startedProcession =
    !comingFromBriefTeaser &&
    typeof deps.prepareNpcProcession === "function" &&
    deps.prepareNpcProcession();
  if (startedProcession) {
        state.awaitingNpcProcession = true;
        resetStage("npcArrival", 0);
        setDevStatus("Congregation arriving", 3.0);
      } else {
        state.awaitingNpcProcession = false;
        beginBattleIntroStage();
      }
      if (!comingFromBriefTeaser && typeof window.applyFormationAnchors === "function") {
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
      const missionOrdinal = getMissionOrdinalForMonthIndex(state.monthIndex);
      console.info && console.info('queueAnnouncement', { title: `Town ${state.level} Mission ${missionOrdinal}`, level: state.level, missionOrdinal, monthIndex: state.monthIndex });
      const _atCamp = typeof window !== "undefined" ? (window.activeCampaign || "p1") : "p1";
      const _atLabels = (typeof window !== "undefined" && window.BattlechurchCampaignLabels) || {};
      const actTitles = _atLabels.missionIntroTitles?.[_atCamp] || _atLabels.missionIntroTitles?.p1 || {};
      const _camp = typeof window !== "undefined" ? (window.activeCampaign || "p1") : "p1";
      const _missionsByPhase = window?.BattlechurchCampaignLabels?.missions || {};
      const actMissionLabels = _missionsByPhase[_camp] || _missionsByPhase.p1 || {};
      const missionNumber = missionOrdinal;
      const missionLabelText = actMissionLabels[missionOrdinal] || `Mission ${missionOrdinal}`;
      const missionBriefTitle = `Mission ${missionOrdinal}: ${missionLabelText}`;
      const missionBriefHeading = `Mission ${missionNumber}`;
      if (typeof window !== "undefined") {
        window.__lastMissionBriefScenario = state.currentBattleScenario;
      }
      const missionSubtitle = state.currentBattleScenario;
      queueLevelAnnouncement(missionBriefHeading, missionSubtitle, {
        duration: BATTLE_INTRO_DURATION,
        requiresConfirm: true,
        missionBriefTitle,
        missionBriefScenario: state.currentBattleScenario,
        missionNumber,
      });
      resetStage("battleIntro", BATTLE_INTRO_DURATION);
      setDevStatus(`Mission ${missionNumber} forming`, BATTLE_INTRO_DURATION + 0.5);
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
  const npcHealthBreakdown = (state.battleNpcRoster || []).map((entry, index) => ({
    name: entry?.name || "",
    portrait: entry?.portrait || null,
    faith: 0,
    active: false,
    rosterIndex: index,
  }));

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
          const npcFaith = Number.isFinite(npc.faith) ? Math.max(0, Math.round(npc.faith)) : 0;
          const npcActive = !npc.departed && npc.active;
          const rosterIndex = Number.isFinite(npc.__battleRosterIndex) ? npc.__battleRosterIndex : -1;
          const targetIndex =
            rosterIndex >= 0 && rosterIndex < npcHealthBreakdown.length
              ? rosterIndex
              : npcHealthBreakdown.findIndex((entry) => (entry?.name || "") === (npc.name || ""));
          if (targetIndex >= 0) {
            npcHealthBreakdown[targetIndex] = {
              ...npcHealthBreakdown[targetIndex],
              name: npc.name || npcHealthBreakdown[targetIndex].name || "",
              portrait: p || npcHealthBreakdown[targetIndex].portrait || null,
              faith: npcActive ? npcFaith : 0,
              active: npcActive,
            };
          }
          if (p) {
            if (npcActive) {
              saved.push(p);
              savedNames.push(npc.name || "");
              totalNpcFaith += npcFaith;
            } else {
              lost.push(p);
            }
          } else if (npcActive) {
            savedNames.push(npc.name || "");
            totalNpcFaith += npcFaith;
          }
        } catch (e) {}
      }
      (state.battleLostRecords || []).forEach((record) => {
        const rosterIndex = Number.isFinite(record?.rosterIndex) ? record.rosterIndex : -1;
        if (rosterIndex < 0 || rosterIndex >= npcHealthBreakdown.length) return;
        npcHealthBreakdown[rosterIndex] = {
          ...npcHealthBreakdown[rosterIndex],
          name: record?.name || npcHealthBreakdown[rosterIndex].name || "",
          portrait: record?.portrait || npcHealthBreakdown[rosterIndex].portrait || null,
          faith: 0,
          active: false,
        };
      });
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
            battleIndex: state.waveIndex,
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
        battleStartCongregation: Number.isFinite(state.battleStartCongregation)
          ? state.battleStartCongregation
          : 0,
        npcHealthBreakdown: npcHealthBreakdown,
        battleScenario: state.currentBattleScenario,
          battleScenarioVictoryPhrase: state.currentBattleScenarioVictoryPhrase || null,
        battleEnemiesDefeated: Math.max(0, state.stats.enemiesDefeated - (state.battleEnemiesStart || 0)),
        battleMaxCombo: Math.max(0, state.battleMaxCombo || 0),
        prayerBombContributions: Array.isArray(state.battlePrayerBombContributions)
          ? state.battlePrayerBombContributions.slice()
          : [],
        prayerBombComboContributions: Array.isArray(state.battlePrayerBombComboContributions)
          ? state.battlePrayerBombComboContributions.slice()
          : [],
      };
      npcs.splice(0, npcs.length);
      state.battleNpcStartCount = 0;
    }

    function advanceFromCongregation() {
      if (state.stage !== "levelIntro") return;
      if (!state.waitingForCongregation) return;
      state.waitingForCongregation = false;
      resetStage("congregationToTeaser", CONGREGATION_TO_TEASER_DURATION);
      setDevStatus("Transitioning to skirmish...", CONGREGATION_TO_TEASER_DURATION);
    }

    function advanceFromBriefTeaser() {
      if (state.stage !== "briefingTeaser") return;
      // Clear any non-confirm announcements (e.g. "On the frontline..." teaser text)
      // so the upcoming battle brief lands at index 0 and blocks the game loop.
      if (typeof window !== "undefined" && Array.isArray(window.levelAnnouncements)) {
        for (let i = window.levelAnnouncements.length - 1; i >= 0; i--) {
          if (!window.levelAnnouncements[i]?.requiresConfirm) {
            window.levelAnnouncements.splice(i, 1);
          }
        }
      }
      if (typeof window !== "undefined") {
        if (typeof window.applyPrayerBombDamageAt === "function") {
          window.applyPrayerBombDamageAt(0, 0, 99999, 999999);
        }
      }
      // Continue with the normal battle start path so we get the themed,
      // mission-specific brief (not the legacy how-to-play screen).
      beginBattle();
    }

    function setWaitingForCongregation(value) {
      state.waitingForCongregation = Boolean(value);
      if (!state.waitingForCongregation) {
        state.npcRushActive = false;
        state.npcRushTimer = 0;
      }
    }

    function skipGraceRush() {
      if (state.stage !== "graceRush") return false;
      state.timer = 0;
      state.graceRushFadeTimer = 0;
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
      return true;
    }

    function skipBossVictory() {
      if (state.stage !== "bossVictoryCelebrate" && state.stage !== "bossBonusTransition") return false;
      state.timer = 0;
      state.graceRushContext = null;
      if (state.pendingBossRestore) {
        restoreNpcsAfterBoss();
        state.pendingBossRestore = false;
      }
      handleLevelCleared();
      return true;
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
      const totalEnemiesDefeated = state.stats?.enemiesDefeated || 0;
      // Prepare level data but DO NOT queue the month announcement yet. The
      // announcement should appear after the instructions (briefing) screen
      // when the player advances. This avoids showing the 'January...' text
      // at the same time as the instructions.
      state.level = levelNumber;
      state.monthIndex = -1;
      state.waveIndex = -1;
      state.definition = buildLevelDefinition(levelNumber, helperConfig);
      state.active = true;
      state.boss = null;
      state.stats = {
        enemiesDefeated: totalEnemiesDefeated,
        npcsRescued: 0,
        npcsLost: 0,
        lostPortraits: [],
        savedPortraits: [],
      };
      state.battleNpcStartCount = 0;
      state.waitingForCongregation = true;
      state.npcRushActive = false;
      state.npcRushTimer = 0;
      state.queuedWaveIntroIndices.clear();
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
      const missionNum = state.monthIndex >= 0 ? state.monthIndex + 1 : 1;
      queueLevelAnnouncement(`Battle ${missionNum}`, "A new battle begins", {
        duration: CONGREGATION_SCREEN_DURATION,
        requiresConfirm: true,
      });
      resetStage("levelIntro", CONGREGATION_SCREEN_DURATION);
      setDevStatus(`Preparing Mission ${missionNum}`, CONGREGATION_SCREEN_DURATION);
    }

    function beginWave() {
      state.waveIndex += 1;
      state.activeWave = currentWave();
      if (!state.activeWave) return;
      const actualWaveNumber = getActualWaveNumber(state.activeWave, state.waveIndex);
      if (actualWaveNumber > 1) {
        scheduleWaveTransitionCue(actualWaveNumber, WAVE_INTENSITY_TRANSITION_SECONDS);
      }
      if (typeof window !== "undefined" && typeof window.setCozyNpcsToFrontlineFormation === "function") {
        try {
          window.setCozyNpcsToFrontlineFormation();
        } catch (e) {}
      }
      const waveNumber = state.waveIndex + 1;
      const introDuration = waveNumber === 1 ? FIRST_WAVE_INTRO_DURATION : WAVE_INTRO_DURATION;
      resetStage("waveIntro", introDuration);
      if (waveNumber === 1) {
        queueWaveIntroAnnouncementForWave(state.activeWave, state.waveIndex, introDuration, {
          transitionDelayConsumed: false,
          eyebrowText: state.currentBattleScenario || "",
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
        queueWaveIntroAnnouncementForWave(state.activeWave, state.waveIndex, introDuration, {
          transitionDelayConsumed: false,
        });
        state.powerUpsEnabled = true;
      }
      const waveLabel = `${state.monthIndex + 1}-${state.waveIndex + 1}`;
      setDevStatus(`Wave ${waveLabel}`, introDuration + 0.6);
      if (waveNumber !== 1) {
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
    }

    function spawnActiveWave() {
      const horde = state.activeWave;
      if (!horde) return;
      const spawnEpoch = ++state.waveSpawnEpoch;
      const waveActiveDuration = Number.isFinite(horde?.duration) ? horde.duration : 12;
      const currentBattle = state.definition?.battles?.[state.monthIndex] || null;
      const totalHordes = getBattleHordeCount(currentBattle);
      const finalWave = state.waveIndex + 1 >= totalHordes;
      if (finalWave && typeof getPendingPortalSpawnCount === "function") {
        state.pendingPortalSpawnBaseline = getPendingPortalSpawnCount();
      } else {
        state.pendingPortalSpawnBaseline = 0;
      }
      state.pendingWaveEntrySpawns = 0;
      resetStage("waveActive", waveActiveDuration);
      const enemyEntries = Array.isArray(horde?.enemies) ? horde.enemies : [];
      enemyEntries.forEach(({ type, count, delay, healthMultiplier }) => {
        const isMiniImpTypeEntry = type === "miniImp" || type === "miniImpLevel2";
        const delayMs = Math.max(0, (Number(delay) || 0) * 1000);
        const spawnOpts = Number.isFinite(healthMultiplier) && healthMultiplier !== 1.0
          ? { healthMultiplier }
          : {};
        const spawnTask = () => {
          if (spawnEpoch !== state.waveSpawnEpoch) return;
          if (typeof spawnEnemyGroup === "function") {
            spawnEnemyGroup(count, null, { ...spawnOpts }, type);
          } else if (isMiniImpTypeEntry) {
            spawnMiniImpGroup(count, null, { ...spawnOpts }, type);
          } else if (typeof schedulePortalSpawn === "function") {
            for (let i = 0; i < count; i += 1) {
              const spawnPos =
                typeof randomSpawnPosition === "function" ? randomSpawnPosition() : null;
              schedulePortalSpawn(
                type,
                spawnPos,
                i * Math.max(0, enemySpawnStaggerMs || 0),
                spawnOpts,
              );
            }
          } else {
            state.pendingWaveEntrySpawns = Math.max(0, (state.pendingWaveEntrySpawns || 0) - 1);
            for (let i = 0; i < count; i += 1) {
              spawnEnemyOfType(type, null, spawnOpts);
            }
          }
        };
        if (delayMs > 0 && typeof setTimeoutFn === "function") {
          setTimeoutFn(spawnTask, delayMs);
        } else {
          spawnTask();
        }
      });

    }

    function handleWaveCleared() {
      const battleNumber = state.monthIndex + 1;
      const waveNumber = state.waveIndex + 1;
      const finalWave = waveNumber >= getBattleHordeCount(currentBattle());
      const currentHorde = state.activeWave || currentWave();
      const nextHorde = state.definition?.battles?.[state.monthIndex]?.hordes?.[state.waveIndex + 1] || null;
      const currentActualWaveNumber = getActualWaveNumber(currentHorde, state.waveIndex);
      const nextActualWaveNumber = getActualWaveNumber(nextHorde, state.waveIndex + 1);
      const endedActualWave = finalWave || !nextHorde || nextActualWaveNumber !== currentActualWaveNumber;
      state.lastWaveClearedFinal = finalWave;
      state.pendingPortalSpawnBaseline = 0;
      state.pendingWaveEntrySpawns = 0;
      spawnPowerUpDrops(state.activeWave?.powerUps || 1);
      const localMonthNumber = state.monthIndex >= 0 ? state.monthIndex + 1 : 1;
      const totalMissionsInTown = getMissionCountForTown(state.definition);
      const finalMissionBeforeBoss = localMonthNumber >= totalMissionsInTown;

      if (!finalWave) {
        if (endedActualWave && typeof deps.showWaveHealthSnapshot === "function") {
          deps.showWaveHealthSnapshot();
        }
        state.finalWaveDelay = 0;
        if (state.activeWave?.allKill === true) {
          const preFadeDelay = MISSION_INTRO_PRE_FADE_DELAY + MISSION_INTRO_MESSAGE_LEAD;
          if (typeof deps.rotateNpcPositionsForActBreak === "function") {
            deps.rotateNpcPositionsForActBreak();
          }
          const announcementHold = MISSION_INTRO_DELAY + MISSION_INTRO_ANNOUNCEMENT_EXTRA;
          const breakerDuration = Number.isFinite(state.activeWave?.waveBreakDuration)
            ? state.activeWave.waveBreakDuration
            : announcementHold + preFadeDelay;
          // Peek at the next horde to get its wave intro text
          const nextWaveIntroText = nextHorde?.waveIntroText || "";
          if (nextWaveIntroText) {
            const delayMs = preFadeDelay * 1000;
            const holdDuration = Math.max(1, breakerDuration - preFadeDelay);
            const postTransitionDelayMs = Math.round(WAVE_INTENSITY_TRANSITION_SECONDS * 1000);
            if (typeof setTimeoutFn === "function") {
              setTimeoutFn(() => {
                if (state.stage !== "allKillBreak") return;
                state.breakPreviewWaveNum = Number.isFinite(nextActualWaveNumber)
                  ? nextActualWaveNumber
                  : null;
                setTimeoutFn(() => {
                  if (state.stage !== "allKillBreak") return;
                  playWaveTransitionCue(nextActualWaveNumber);
                  queueWaveIntroAnnouncementForWave(
                    nextHorde,
                    state.waveIndex + 1,
                    holdDuration,
                    { transitionDelayConsumed: true },
                  );
                }, postTransitionDelayMs);
              }, delayMs);
            } else {
              state.breakPreviewWaveNum = Number.isFinite(nextActualWaveNumber)
                ? nextActualWaveNumber
                : null;
              playWaveTransitionCue(nextActualWaveNumber);
              queueWaveIntroAnnouncementForWave(
                nextHorde,
                state.waveIndex + 1,
                holdDuration,
                { transitionDelayConsumed: false },
              );
            }
          }
      resetStage("allKillBreak", breakerDuration);
      setDevStatus(`Mission break after Wave ${battleNumber}-${waveNumber}`, breakerDuration);
      return;
    }
        setDevStatus(`Wave ${battleNumber}-${waveNumber} advancing`, 1.2);
        beginWave();
        spawnActiveWave();
        return;
      }

      if (finalMissionBeforeBoss) {
        state.finalWaveDelay = 0;
        beginBattleVictoryCelebrate(getMonthName((state.level - 1) * MONTHS_PER_LEVEL + localMonthNumber));
        return;
      }

      state.finalWaveDelay = 0;
      beginBattleVictoryCelebrate(getMonthName((state.level - 1) * MONTHS_PER_LEVEL + localMonthNumber));
      return;
    }

    function beginGraceRushPhase(monthName) {
      resetStage("graceRush", GRACE_RUSH_DURATION);
      state.finalWaveDelay = 0;
      state.graceRushContext = "battle";
      setDevStatus(`Grace Abounds – ${monthName}`, GRACE_RUSH_DURATION);
      if (typeof deps.showBattleVictoryNpcDialogue === "function") {
        deps.showBattleVictoryNpcDialogue();
      }
      if (typeof deps.startBattleGraceRush === "function") {
        deps.startBattleGraceRush(GRACE_RUSH_DURATION, {
          reason: "battle",
          burstAmount: 16,
          spawnInterval: 1.1,
        });
      }
    }

    function buildVictoryNamesText() {
      const roster = Array.isArray(npcs) ? npcs : [];
      const survivors = roster
        .filter((npc) => npc && !npc.departed && npc.active)
        .map((npc) => (typeof npc.name === "string" ? npc.name.trim() : ""))
        .filter(Boolean);
      const unique = [];
      const seen = new Set();
      survivors.forEach((name) => {
        if (seen.has(name)) return;
        seen.add(name);
        unique.push(name);
      });
      if (!unique.length) return "your congregation";
      if (unique.length === 1) return unique[0];
      if (unique.length === 2) return `${unique[0]} and ${unique[1]}`;
      if (unique.length === 3) return `${unique[0]}, ${unique[1]}, and ${unique[2]}`;
      return `${unique[0]}, ${unique[1]}, ${unique[2]}, and ${unique.length - 3} others`;
    }

    function buildVictoryProblemPhrase() {
      const raw = typeof state.currentBattleScenario === "string"
        ? state.currentBattleScenario.trim()
        : "";
      const cleaned = raw.replace(/[.!?]+$/g, "").replace(/\s+/g, " ").trim();
      return cleaned || "their current struggles";
    }

    function beginBattleVictoryCelebrate(monthName) {
      clearStagePowerUps({ keepGrace: true });
      resetStage("victoryCelebrate", VICTORY_CELEBRATE_DURATION);
      state.finalWaveDelay = 0;
      state.graceRushContext = null;
      setDevStatus(`Victory! – ${monthName}`, VICTORY_CELEBRATE_DURATION);
      if (typeof deps.playBattleVictoryMusic === "function") {
        deps.playBattleVictoryMusic();
      }
      const namesText = buildVictoryNamesText();
      const problemPhrase = buildVictoryProblemPhrase();
      queueLevelAnnouncement(
        "Victory!",
        "",
        {
        duration: 2.6,
        skipMissionBrief: true,
      });
    }

    function handleBattleComplete() {
      state.graceRushContext = null;
      clearStagePowerUps();
      state.finalWaveDelay = 0;
  finalizeBattleNpcResults();
  // Also call after normal battle completion, not just hotkey skip
      const flavor = HORDE_CLEAR_LINES[state.monthIndex % HORDE_CLEAR_LINES.length];
      const missionOrdinal = getMissionOrdinalForMonthIndex(state.monthIndex);
      const clearedRomanNumerals = { 1: 'I', 2: 'II', 3: 'III' };
      const clearedActLabel = `Mission ${clearedRomanNumerals[missionOrdinal] || missionOrdinal}`;
      console.info && console.info('queueAnnouncement', { title: `${clearedActLabel} Cleared`, level: state.level, missionOrdinal, monthIndex: state.monthIndex });
      queueLevelAnnouncement(
        `${clearedActLabel} Cleared`,
        flavor,
        {
          duration: BETWEEN_BATTLE_PAUSE,
          requiresConfirm: true,
          completedActNum: missionOrdinal,
        },
      );
      resetStage("battleIntermission", BETWEEN_BATTLE_PAUSE);
      setDevStatus(`${clearedActLabel} secured`, BETWEEN_BATTLE_PAUSE);
    }

    function finalizeBossBattleSummary() {
      state.lastBattleSummary = {
        savedCount: 0,
        lostCount: 0,
        savedPortraits: [],
        lostPortraits: [],
        savedNames: [],
        lostNames: [],
        totalNpcFaith: 0,
        battleStartCongregation: Number.isFinite(state.battleStartCongregation)
          ? state.battleStartCongregation
          : 0,
        npcHealthBreakdown: [],
        battleScenario: state.currentBattleScenario,
          battleScenarioVictoryPhrase: state.currentBattleScenarioVictoryPhrase || null,
        battleEnemiesDefeated: Math.max(0, state.stats.enemiesDefeated - (state.battleEnemiesStart || 0)),
        battleMaxCombo: Math.max(0, state.battleMaxCombo || 0),
        prayerBombContributions: Array.isArray(state.battlePrayerBombContributions)
          ? state.battlePrayerBombContributions.slice()
          : [],
        prayerBombComboContributions: Array.isArray(state.battlePrayerBombComboContributions)
          ? state.battlePrayerBombComboContributions.slice()
          : [],
      };
    }

    function beginBossIntro() {
      state.battleEnemiesStart = state.stats?.enemiesDefeated || 0;
      state.battleMaxCombo = 0;
      state.battlePrayerBombContributions = [];
      state.battlePrayerBombComboContributions = [];
      state.battleStartCongregation =
        typeof deps.getCongregationSize === "function" ? deps.getCongregationSize() : 0;
      state.currentBossTheme = randomChoice(BOSS_BATTLE_THEMES);
      state.currentBossProblem = randomChoice(BOSS_PASTOR_PROBLEMS) || "";
      const bossMonthNumber = (state.level - 1) * MONTHS_PER_LEVEL + MONTHS_PER_LEVEL;
      const bossMonthName = getMonthName(bossMonthNumber);
      const _bCamp = typeof window !== "undefined" ? (window.activeCampaign || "p1") : "p1";
      const _bMissionsByPhase = window?.BattlechurchCampaignLabels?.missions || {};
      const actMissionLabels = _bMissionsByPhase[_bCamp] || _bMissionsByPhase.p1 || {};
      const currentActNum = Math.min(
        Math.max(1, Number(BATTLES_PER_DISTRICT) || 1),
        getMissionOrdinalForMonthIndex(state.monthIndex),
      );
      const missionBriefTitle = `Mission ${currentActNum}: ${actMissionLabels[currentActNum] || `Mission ${currentActNum}`}`;
      queueLevelAnnouncement("Boss Battle", state.currentBossProblem, {
        duration: LEVEL_INTRO_DURATION,
        requiresConfirm: true,
        bossMissionBrief: true,
        missionBriefTitle,
        missionNumber: 1,
      });
      resetStage("bossIntro", LEVEL_INTRO_DURATION);
      setDevStatus("Boss Battle", LEVEL_INTRO_DURATION + 1);
      evacuateNpcsForBoss();
    }

    function beginBossGraceRush() {
      const lastPos = typeof deps.getLastEnemyDeathPosition === "function"
        ? deps.getLastEnemyDeathPosition()
        : null;
      resetStage("graceRush", BOSS_GRACE_RUSH_DURATION);
      state.graceRushContext = "boss";
      setDevStatus("Grace Overflow!", BOSS_GRACE_RUSH_DURATION);
      queueLevelAnnouncement("Grace Overflow!", "Celebrate the victory—collect every grace!", {
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

    function beginBossVictoryCelebrate() {
      resetStage("bossVictoryCelebrate", BOSS_VICTORY_CELEBRATE_DURATION);
      state.graceRushContext = null;
      state.pendingBossRestore = true;
      setDevStatus("Boss defeated", BOSS_VICTORY_CELEBRATE_DURATION);
    }

    function onBossDefeated() {
      clearStagePowerUps();
      finalizeBossBattleSummary();
      state.boss = null;
      state.lastClearedWasBoss = true;
      beginBossVictoryCelebrate();
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
        // If resume didn't advance levels.js state (e.g. showChapterBreak only sets a
        // game.js flag and doesn't call resetStage), restore level progression so that
        // beginLevel(state.level + 1) fires on the next levelManager.update tick.
        if (state.stage === "visitorMinigame") {
          resetStage("levelSummary", 0);
        }
      } else {
        handleLevelCleared();
      }
    }

    function handleLevelCleared() {
      state.graceRushContext = null;
      clearStagePowerUps();
      const summarySubtitle = `Enemies ${state.stats.enemiesDefeated} • NPCs saved ${state.stats.npcsRescued}`;
  const summaryRomanNumerals = { 1: 'I', 2: 'II', 3: 'III' };
  const completedActNum = getMissionOrdinalForMonthIndex(state.monthIndex);
  const summaryActLabel = `Mission ${summaryRomanNumerals[completedActNum] || completedActNum} Cleared`;
  console.info && console.info('queueAnnouncement', { title: summaryActLabel, level: state.level, actNum: completedActNum, monthIndex: state.monthIndex });
  const totalBattlesInDistrict = state.definition?.battles?.length || Math.max(1, Number(BATTLES_PER_DISTRICT) || 1);
      queueLevelAnnouncement(
        summaryActLabel,
        summarySubtitle,
        {
          duration: LEVEL_SUMMARY_DURATION,
          requiresConfirm: true,
          finalYear: state.level >= FINAL_CAMPAIGN_LEVEL && (state.monthIndex + 1 >= totalBattlesInDistrict),
          levelSummary: true,
          completedActNum,
        },
      );
      resetStage("levelSummary", LEVEL_SUMMARY_DURATION);
      setDevStatus(`Battle ${state.level} cleared`, LEVEL_SUMMARY_DURATION);
      state.currentBossTheme = "";
      state.lastClearedWasBoss = false;
      if (state.pendingBossRestore) {
        restoreNpcsAfterBoss();
        state.pendingBossRestore = false;
      }
    }

    return {
      begin() {
      beginLevel(1);
      },
      beginFromDistrictIntro(levelNumber = 1) {
        beginLevel(levelNumber, { skipIntroAnnouncement: true });
      },
      beginBattleFromDistrictIntro(levelNumber = 1, localBattleNumber = 1) {
        beginLevel(levelNumber, { skipIntroAnnouncement: true });
        const totalBattles = Math.max(
          1,
          Number.isFinite(state.definition?.battles?.length)
            ? state.definition.battles.length
            : BATTLES_PER_DISTRICT,
        );
        const targetBattle = Math.max(
          1,
          Math.min(totalBattles, Math.floor(Number(localBattleNumber) || 1)),
        );
        state.waitingForCongregation = false;
        finishNpcRush();
        state.npcRushActive = false;
        state.npcRushTimer = 0;
        state.monthIndex = targetBattle - 2;
        state.waveIndex = -1;
        if (targetBattle > 1) {
          resetStage("briefingTeaser", BRIEF_TEASER_DURATION);
          setDevStatus("Congregation skirmish...", BRIEF_TEASER_DURATION);
          return;
        }
        beginBattle();
      },
      reset() {
        state.active = false;
state.monthIndex = -1;
state.waveIndex = -1;
        state.stage = "idle";
        state.timer = 0;
        state.definition = null;
        state.activeWave = null;
        state.boss = null;
        state.pendingVisitorMinigame = false;
        state.visitorMinigamePlayed = false;
        state.visitorResumeAction = null;
        state.graceRushContext = null;
        state.pendingBossRestore = false;
        state.npcRushActive = false;
        state.npcRushTimer = 0;
        state.queuedWaveIntroIndices.clear();
        state.lastClearedWasBoss = false;
        state.battleEnemiesStart = 0;
        state.battleMaxCombo = 0;
      },
      update(dt) {
        if (!state.active) return;
        processConversation(dt);
        switch (state.stage) {
          case "levelIntro":
            if (state.waitingForCongregation && state.npcRushActive) {
              const done = updateNpcRush(dt);
              if (done) {
                resetStage("briefingTeaser", BRIEF_TEASER_DURATION);
                setDevStatus("Congregation skirmish...", BRIEF_TEASER_DURATION);
              }
              break;
            }
            if (!state.waitingForCongregation) {
              state.timer -= dt;
              if (state.timer <= 0) beginBattle();
            }
            break;
          case "briefingTeaser":
            state.timer -= dt;
            if (state.timer <= 0) {
              advanceFromBriefTeaser();
            }
            break;
          case "congregationToTeaser":
            state.timer -= dt;
            if (state.timer <= 0) {
              resetStage("briefingTeaser", BRIEF_TEASER_DURATION);
              setDevStatus("Congregation skirmish...", BRIEF_TEASER_DURATION);
            }
            break;
          case "upgradeToTeaser":
            state.timer -= dt;
            if (state.timer <= 0) {
              resetStage("briefingTeaser", BRIEF_TEASER_DURATION);
              setDevStatus("Congregation skirmish...", BRIEF_TEASER_DURATION);
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
        if (state.timer <= 0) beginWave();
        break;
      case "waveIntro":
        state.timer -= dt;
        processConversation(dt);
        if (state.timer <= 0) spawnActiveWave();
        break;
      case "victoryCelebrate":
        state.timer = Math.max(0, state.timer - dt);
        if (state.timer <= 0) {
          const localMonthNumber = state.monthIndex >= 0 ? state.monthIndex + 1 : 1;
          beginGraceRushPhase(getMonthName((state.level - 1) * MONTHS_PER_LEVEL + localMonthNumber));
        }
        break;
      case "waveActive": {
        state.timer = Math.max(0, state.timer - dt);
        const battle = currentBattle();
        const totalHordes = getBattleHordeCount(battle);
        const finalWave = state.waveIndex + 1 >= totalHordes;
        const enemiesRemain = hasActiveOpponents(false);
        const timerElapsed = state.timer <= 0;
        const pendingPortalSpawns = typeof getPendingPortalSpawnCount === "function"
          ? Math.max(0, getPendingPortalSpawnCount() - (state.pendingPortalSpawnBaseline || 0))
          : 0;
        const pendingWaveEntrySpawns = Math.max(0, state.pendingWaveEntrySpawns || 0);
        const horde = currentWave();
        const allKill = finalWave
          ? true
          : (horde?.allKill === true);
        if (!finalWave) {
          if (allKill) {
            if (!enemiesRemain && pendingPortalSpawns <= 0 && pendingWaveEntrySpawns <= 0) {
              handleWaveCleared();
            }
          } else if (timerElapsed || !enemiesRemain) {
            handleWaveCleared();
          }
        } else {
          if (!enemiesRemain && pendingPortalSpawns <= 0 && pendingWaveEntrySpawns <= 0) {
            handleWaveCleared();
          }
        }
        break;
      }
    case "allKillBreak":
    case "waveCleared": {
      state.timer -= dt;
      const battle = currentBattle();
      const totalHordes = getBattleHordeCount(battle);
      const finalWave = state.waveIndex + 1 >= totalHordes;
      if (finalWave && state.timer <= 0 && state.finalWaveDelay > 0) {
        state.finalWaveDelay = Math.max(0, state.finalWaveDelay - dt);
        if (state.finalWaveDelay > 0) break;
      }
      if (state.timer <= 0) {
            if (finalWave && hasActiveOpponents(true)) break;
            if (finalWave) {
              if (state.pendingBossAfterFinalWave) {
                state.pendingBossAfterFinalWave = false;
                if (typeof deps.showBattleVictoryNpcDialogue === "function") {
                  deps.showBattleVictoryNpcDialogue();
                }
                handleBattleComplete();
              } else if (state.pendingGraceRushAfterFinalWave) {
                state.pendingGraceRushAfterFinalWave = false;
                const localMN = state.monthIndex >= 0 ? state.monthIndex + 1 : 1;
                beginGraceRushPhase(getMonthName((state.level - 1) * MONTHS_PER_LEVEL + localMN));
              } else {
                handleBattleComplete();
              }
            } else {
              beginWave();
              spawnActiveWave();
            }
          }
        break;
      }
        case "battleIntermission":
          if (
            state.skipPostBattleAdvance &&
            typeof deps.isPostBattleFlowBlocked === "function" &&
            deps.isPostBattleFlowBlocked()
          ) {
            break;
          }
          if (state.skipPostBattleAdvance) {
            state.skipPostBattleAdvance = false;
          }
          state.timer -= dt;
          if (state.timer <= 0) {
            // Boss check must come first — pendingUpgradeToTeaser can be left over
            // from the previous battle's upgrade screen closing and must not
            // hijack the transition when the boss is due.
            const completedMissionOrdinal = getMissionOrdinalForMonthIndex(state.monthIndex);
            const totalMissionsInTown = getMissionCountForTown(state.definition);
            if (completedMissionOrdinal >= totalMissionsInTown) {
              state.pendingUpgradeToTeaser = false;
              beginBossIntro();
            } else if (state.pendingUpgradeToTeaser) {
              state.pendingUpgradeToTeaser = false;
              resetStage("upgradeToTeaser", UPGRADE_TO_TEASER_DURATION);
              setDevStatus("Transitioning to skirmish...", UPGRADE_TO_TEASER_DURATION);
            } else if (state.pendingVisitorMinigame) {
              const resumed = beginVisitorMinigame(() => {
                state.pendingVisitorMinigame = false;
                beginBattle();
              });
              state.pendingVisitorMinigame = false;
              if (resumed) {
                return;
              }
              beginBattle();
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
        case "bossVictoryCelebrate":
          state.timer = Math.max(0, state.timer - dt);
          if (state.timer <= 0) {
            if (typeof deps.startBossBonusTransition === "function") {
              deps.startBossBonusTransition(BOSS_BONUS_TRANSITION_DURATION);
            }
            resetStage("bossBonusTransition", BOSS_BONUS_TRANSITION_DURATION);
          }
          break;
        case "bossBonusTransition":
          state.timer = Math.max(0, state.timer - dt);
          if (state.timer <= 0) {
            handleLevelCleared();
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
              const _totalBattles = state.definition?.battles?.length || Math.max(1, Number(BATTLES_PER_DISTRICT) || 1);
              if (state.monthIndex + 1 >= _totalBattles) {
                // All acts complete — town is done
                resetStage("idle", 0);
                state.active = false;
              } else {
                // Hold here until the upgrade screen, chapter break, and visitor
                // minigame flows in game.js have finished. acknowledgeAnnouncement()
                // zeros this timer the moment the summary is confirmed, so without
                // this guard beginBattle() would fire before any of those scenes run.
                if (typeof deps.isPostBattleFlowBlocked === "function" && deps.isPostBattleFlowBlocked()) {
                  break;
                }
                // More acts remain in this town — continue to next act
                beginBattle();
              }
            }
            break;
          default:
            break;
        }
      },
      notifyEnemyDefeated() {
        state.stats.enemiesDefeated += 1;
      },
      notifyEnemyDamaged(amount) {
        state.stats.damageDealt = (state.stats.damageDealt || 0) + Math.round(amount);
      },
      notifyNpcLost(portrait) {
        state.stats.npcsLost += 1;
        state.stats.lostPortraits = state.stats.lostPortraits || [];
        state.stats.lostNames = state.stats.lostNames || [];
        state.battleLostRecords = state.battleLostRecords || [];
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
          state.battleLostRecords.push({
            name: npcName,
            portrait,
            rosterIndex: Number.isFinite(portrait.__battleRosterIndex) ? portrait.__battleRosterIndex : -1,
          });
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
      getBoss() {
        return state.boss || null;
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
        const isBossStage =
          state.stage === "bossIntro" ||
          state.stage === "bossActive" ||
          state.graceRushContext === "boss";
        const battleDef = currentBattle();
        const currentHordeDef = currentWave();
        const battleNumber = isBossStage
          ? MONTHS_PER_LEVEL
          : (state.monthIndex >= 0 ? state.monthIndex + 1 : 0);
        const waveNumber = state.waveIndex >= 0 ? state.waveIndex + 1 : 0;
        const localMonthNumber = isBossStage
          ? MONTHS_PER_LEVEL
          : (state.monthIndex >= 0 ? state.monthIndex + 1 : 1);
        const globalMonthNumber = (state.level - 1) * MONTHS_PER_LEVEL + localMonthNumber;
        const derivedActNum = getMissionOrdinalForMonthIndex(state.monthIndex);
        const derivedMissionNum = 1;
        const derivedWaveNum = state.waveIndex >= 0
          ? Math.floor(state.waveIndex / Math.max(1, HORDES_PER_WAVE)) + 1
          : 0;
        const previewWaveNum = (state.stage === "allKillBreak" && Number.isFinite(state.breakPreviewWaveNum))
          ? state.breakPreviewWaveNum
          : null;
        const actualWaveNum = Number.isFinite(currentHordeDef?.waveNumber)
          ? currentHordeDef.waveNumber
          : derivedWaveNum;
        const statusWaveNum = previewWaveNum || actualWaveNum;
        const actualWaveTotal = getBattleWaveCount(battleDef);
        return {
          level: state.level || 1,
          month: getMonthName(globalMonthNumber),
          battle: battleNumber,
          globalBattle: globalMonthNumber,
          wave: waveNumber,
          missionNum: currentHordeDef?.missionNumber ?? derivedActNum,
          battleNum: currentHordeDef?.battleNumber ?? derivedMissionNum,
          waveNum: statusWaveNum || null,
          waveTotal: actualWaveTotal,
          hordeNum: currentHordeDef?.hordeInWave ?? null,
          stage: state.stage,
          stageTimer: state.timer,
          stageDuration: state.stageDuration,
          finalWaveCleared: Boolean(state.lastWaveClearedFinal),
          pendingVisitorMinigame: Boolean(state.pendingVisitorMinigame),
          bossPhase: state.boss?.phase || 0,
          battleScenario: state.currentBattleScenario,
          battleScenarioVictoryPhrase: state.currentBattleScenarioVictoryPhrase || null,
          bossTheme: state.currentBossTheme,
        };
      },
      getCurrentWave() {
        return currentWave();
      },
      requestUpgradeToTeaserTransition() {
        state.pendingUpgradeToTeaser = true;
      },
      getWaveTimer() {
        return state.stage === "waveActive" ? state.timer : null;
      },
      getLevelNumber() {
        return state.level || 1;
      },
      getActNumber() {
        return getMissionOrdinalForMonthIndex(state.monthIndex);
      },
      getStats() {
        return state.stats;
      },
      setBattleMaxCombo(value) {
        if (!Number.isFinite(value)) return;
        const next = Math.max(0, Math.round(value));
        state.battleMaxCombo = Math.max(state.battleMaxCombo || 0, next);
      },
      recordPrayerBombComboContribution(value) {
        if (!Number.isFinite(value)) return;
        const next = Math.max(0, Math.round(value));
        if (!next) return;
        if (!Array.isArray(state.battlePrayerBombComboContributions)) {
          state.battlePrayerBombComboContributions = [];
        }
        state.battlePrayerBombComboContributions.push(next);
      },
      recordPrayerBombContribution(value) {
        if (!Number.isFinite(value)) return;
        const next = Math.max(0, Math.round(value));
        if (!next) return;
        if (!Array.isArray(state.battlePrayerBombContributions)) {
          state.battlePrayerBombContributions = [];
        }
        state.battlePrayerBombContributions.push(next);
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
      devSkipWave() {
        if (!state.active) return false;
        const finalizeSkipState = () => {
          devClearOpponents({ includeBoss: true });
          state.activeWave = null;
          state.pendingPortalSpawnBaseline = 0;
          state.finalWaveDelay = 0;
          state.awaitingNpcProcession = false;
          state.waitingForCongregation = false;
          state.npcRushActive = false;
          if (state.monthIndex < 0) {
            state.monthIndex = 0;
          }
          const battle = currentBattle();
          const totalHordes = getBattleHordeCount(battle);
          if (Number.isFinite(totalHordes) && totalHordes > 0) {
            state.waveIndex = totalHordes - 1;
          } else {
            state.waveIndex = Math.max(0, state.waveIndex);
          }
          if (!Number.isFinite(state.battleNpcStartCount) || state.battleNpcStartCount <= 0) {
            const survivors = npcs.filter((npc) => !npc.departed && npc.active).length;
            state.battleNpcStartCount = survivors > 0 ? survivors : 5;
          }
        };
        const bossContext =
          state.stage === "bossActive" ||
          state.stage === "bossIntro" ||
          (state.stage === "graceRush" && state.graceRushContext === "boss");
        finalizeSkipState();
        if (bossContext) {
          state.boss = null;
          state.lastClearedWasBoss = true;
          state.pendingBossRestore = true;
          handleLevelCleared();
        } else {
          handleBattleComplete();
          state.skipPostBattleAdvance = true;
        }
        state.timer = 0;
        return true;
      },
      devAdvanceToNextWaveWithBreak() {
        if (!state.active) return { success: false, reason: "inactive" };
        const bossContext =
          state.stage === "bossActive" ||
          state.stage === "bossIntro" ||
          (state.stage === "graceRush" && state.graceRushContext === "boss");
        if (bossContext) return { success: false, reason: "boss" };
        const battle = currentBattle();
        const totalHordes = getBattleHordeCount(battle);
        if (!Number.isFinite(totalHordes) || totalHordes <= 0) {
          return { success: false, reason: "no_hordes" };
        }
        const hordes = Array.isArray(battle?.hordes) ? battle.hordes : [];
        const currentIdx = Number.isFinite(state.waveIndex) ? state.waveIndex : -1;
        let targetIndex = -1;
        if (currentIdx < 0) {
          targetIndex = 0;
        } else {
          const currentWaveNum = getActualWaveNumber(hordes[currentIdx], currentIdx);
          for (let i = currentIdx + 1; i < hordes.length; i += 1) {
            if (getActualWaveNumber(hordes[i], i) > currentWaveNum) {
              targetIndex = i;
              break;
            }
          }
        }
        if (targetIndex < 0 || targetIndex >= totalHordes) {
          return { success: false, reason: "last_wave" };
        }
        // Invalidate any delayed spawns from the current horde/wave.
        state.waveSpawnEpoch += 1;
        devClearOpponents({ includeBoss: true });
        state.pendingPortalSpawnBaseline = 0;
        state.pendingWaveEntrySpawns = 0;
        state.finalWaveDelay = 0;
        state.waveIndex = targetIndex - 1;
        beginWave();
        if (!state.activeWave) {
          return { success: false, reason: "next_wave_missing" };
        }
        // Ensure wave intro copy appears when skipping directly.
        const nextWaveIntroText = state.activeWave?.waveIntroText || "";
        if (nextWaveIntroText) {
          const waveNumber = state.waveIndex + 1;
          const introDuration = waveNumber === 1 ? FIRST_WAVE_INTRO_DURATION : WAVE_INTRO_DURATION;
          queueWaveIntroAnnouncementForWave(state.activeWave, state.waveIndex, introDuration, {
            transitionDelayConsumed: false,
          });
        }
        state.timer = Math.max(0, Number(state.timer) || 0);
        return {
          success: true,
          mode: targetIndex === 0 ? "started_first_wave" : "advanced_with_break",
        };
      },
      devSkipBattle() {
        if (!state.active) return false;
        if (state.stage === "bossActive") {
          onBossDefeated();
          return true;
        }
        if (state.stage === "bossIntro") {
          onBossDefeated();
          return true;
        }
        if (state.stage === "graceRush") {
          state.timer = 0;
          if (state.graceRushContext === "boss") {
            handleLevelCleared();
          } else {
            handleBattleComplete();
          }
          return true;
        }
        if (state.stage === "npcArrival") {
          state.awaitingNpcProcession = false;
          beginBattleIntroStage();
          return true;
        }
        if (state.stage === "levelIntro" && state.waitingForCongregation) {
          state.waitingForCongregation = false;
          state.waveIndex = BATTLE_MONTHS_PER_LEVEL - 1;
          beginBossIntro();
          state.timer = 0;
          return true;
        }
        if (
          state.stage === "battleIntermission" ||
          state.stage === "waveCleared" ||
          state.stage === "allKillBreak"
        ) {
          devClearOpponents();
          state.waveIndex = BATTLE_MONTHS_PER_LEVEL - 1;
          state.waveIndex = getBattleHordeCount(currentBattle()) - 1; // set last horde index
          state.activeWave = null;
          beginBossIntro();
          state.timer = 0;
          return true;
        }
        devClearOpponents();
        state.waveIndex = BATTLE_MONTHS_PER_LEVEL - 1;
        state.waveIndex = getBattleHordeCount(currentBattle()) - 1; // fallback assignment
        state.activeWave = null;
        handleBattleComplete();
        state.timer = 0;
        beginBossIntro();
        state.timer = 0;
        return true;
      },
      devSkipLevel() {
        if (!state.active) return false;
        devClearOpponents({ includeBoss: true });
        state.activeWave = null;
        state.pendingPortalSpawnBaseline = 0;
        state.finalWaveDelay = 0;
        const nextLevel = Math.max(1, (state.level || 1) + 1);
        beginLevel(nextLevel);
        return true;
      },
      devSkipToBoss({ showExterior = true } = {}) {
        if (!state.active) return false;
        if (state.stage === "bossActive") {
          devClearOpponents({ includeBoss: true });
          return { success: true, needsExteriorShot: false };
        }
        devClearOpponents({ includeBoss: true });
        const totalBattles = Math.max(
          1,
          Number.isFinite(state.definition?.battles?.length)
            ? state.definition.battles.length
            : Math.max(1, Number(BATTLES_PER_DISTRICT) || 1),
        );
        state.monthIndex = totalBattles - 1;
        state.waveIndex = getBattleHordeCount(currentBattle()) - 1;
        if (showExterior) {
          // Set stage to battleIntermission with long timer - exterior shot will trigger boss
          resetStage("battleIntermission", 99999);
          return { success: true, needsExteriorShot: true };
        }
        beginBossIntro();
        state.timer = 0;
        return { success: true, needsExteriorShot: false };
      },
      devSkipToDistrictFinalBoss({ showExterior = false } = {}) {
        if (!state.active) return false;
        devClearOpponents({ includeBoss: true });
        const totalBattles = Math.max(
          1,
          Number.isFinite(state.definition?.battles?.length)
            ? state.definition.battles.length
            : Math.max(1, Number(BATTLES_PER_DISTRICT) || 1),
        );
        // Jump to the last battle entry in this town — do NOT change state.level
        state.monthIndex = totalBattles - 1;
        state.waveIndex = getBattleHordeCount(currentBattle()) - 1;
        state.activeWave = null;
        state.pendingPortalSpawnBaseline = 0;
        state.finalWaveDelay = 0;
        if (showExterior) {
          resetStage("battleIntermission", 99999);
          return { success: true, needsExteriorShot: true };
        }
        beginBossIntro();
        state.timer = 0;
        return { success: true, needsExteriorShot: false };
      },
      triggerBossIntro() {
        if (!state.active) return false;
        beginBossIntro();
        return true;
      },
      triggerVisitorMinigame(onResume) {
        if (!state.active) return false;
        return beginVisitorMinigame(onResume);
      },
      devSkipToGraceRush() {
        if (!state.active) {
          beginLevel(1);
        }
        devClearOpponents({ includeBoss: true });
        state.activeWave = null;
        state.pendingPortalSpawnBaseline = 0;
        state.finalWaveDelay = 0;
        if (state.monthIndex < 0) state.monthIndex = 0;
        if (state.waveIndex < 0) {
          state.waveIndex = getBattleHordeCount(currentBattle()) - 1;
        }
        const localMonthNumber = state.monthIndex >= 0 ? state.monthIndex + 1 : 1;
        const monthName = getMonthName((state.level - 1) * MONTHS_PER_LEVEL + localMonthNumber);
        beginGraceRushPhase(monthName);
        return true;
      },
      setWaitingForCongregation,
      advanceFromCongregation,
      advanceFromBriefTeaser,
      skipGraceRush,
      skipBossVictory,
    };
  }

  window.Levels = Object.assign(window.Levels || {}, {
    initialize,
    createLevelManager,
  });
})(typeof window !== "undefined" ? window : null);
