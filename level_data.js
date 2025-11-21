(function(global) {
  const HORDE_ENEMY_POOLS = [
    ["slime", "skeleton", "archer", "archer"],
    [
      "skeleton",
      "archer",
      "skeletonArcher",
      "skeletonArcher",
      "swordsman",
      "orc",
      "priest",
      "lancer",
    ],
    [
      "wizard",
      "skeletonArcher",
      "knight",
      "knightTemplar",
      "armoredSkeleton",
      "greatswordSkeleton",
      "eliteOrc",
      "orcRider",
      "werewolf",
      "werebear",
    ],
  ];

  const HERO_ENCOURAGEMENT_LINES = [
    "Stay sharp, friends!",
    "Hold the line!",
    "We’re stronger together!",
    "Keep the faith steady!",
  ];

  const NPC_AGREEMENT_LINES = [
    "We stand with you!",
    "The flock fights on!",
    "You’ve got our backs!",
    "We trust you in the storm!",
  ];

  const BATTLE_SCENARIOS = [
    "Feral spirits gather inside the old chapel.",
    "The horde prowls through the flooded basements.",
    "Unholy sirens scream at the altar doors.",
    "Shadows ripple beneath the stained glass windows.",
  ];

  const BOSS_BATTLE_THEMES = [
    "Hear the chorus of the fallen as you confront the priest of decay.",
    "The floor trembles like a drumroll before the final sermon.",
    "A choir of banshees drowns the bells, leaving only your heartbeat as the tempo.",
  ];

  const HORDE_CLEAR_LINES = [
    "Kingdoms rise when this horde falls.",
    "No church bells ring for those summoned by darkness.",
    "Breathe easy—God’s porch is safe for now.",
    "This sacrifice keeps the flock from the abyss.",
  ];

  const ns = global.BattlechurchLevelData || (global.BattlechurchLevelData = {});
  ns.hordeEnemyPools = HORDE_ENEMY_POOLS;
  ns.heroEncouragementLines = HERO_ENCOURAGEMENT_LINES;
  ns.npcAgreementLines = NPC_AGREEMENT_LINES;
  ns.battleScenarios = BATTLE_SCENARIOS;
  ns.bossBattleThemes = BOSS_BATTLE_THEMES;
  ns.hordeClearLines = HORDE_CLEAR_LINES;
})(typeof window !== "undefined" ? window : globalThis);
